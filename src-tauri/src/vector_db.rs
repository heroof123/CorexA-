// src-tauri/src/vector_db.rs
// Vector Database Integration using LanceDB for semantic code search

use lancedb::{Connection, Table};
use lancedb::query::{QueryBase, ExecutableQuery};
use serde::{Deserialize, Serialize};
use std::error::Error;
use std::sync::Arc;
use tokio::sync::Mutex;
use arrow_array::{RecordBatch, RecordBatchIterator, StringArray, Float32Array, UInt64Array};
use arrow_schema::{Schema, Field, DataType};
use std::sync::Arc as StdArc;

/// Represents a code chunk stored in the vector database
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeChunk {
    /// Unique identifier: file_path:start_line:end_line
    pub id: String,
    /// Path to the source file
    pub file_path: String,
    /// Content of the code chunk
    pub content: String,
    /// Vector embedding (384 dimensions for BGE-small-en-v1.5)
    pub embedding: Vec<f32>,
    /// Optional symbol name (function, class, etc.)
    pub symbol_name: Option<String>,
    /// Type of chunk: Function, Class, Module, etc.
    pub chunk_type: String,
    /// Unix timestamp when the chunk was indexed
    pub timestamp: u64,
}

impl CodeChunk {
    /// Convert Vec<CodeChunk> to Arrow RecordBatch
    fn to_record_batch(chunks: Vec<CodeChunk>) -> Result<RecordBatch, Box<dyn Error>> {
        if chunks.is_empty() {
            return Err("Cannot create RecordBatch from empty chunks".into());
        }

        let embedding_dim = chunks[0].embedding.len();
        
        // Extract fields
        let ids: Vec<String> = chunks.iter().map(|c| c.id.clone()).collect();
        let file_paths: Vec<String> = chunks.iter().map(|c| c.file_path.clone()).collect();
        let contents: Vec<String> = chunks.iter().map(|c| c.content.clone()).collect();
        let embeddings: Vec<f32> = chunks.iter().flat_map(|c| c.embedding.clone()).collect();
        let symbol_names: Vec<Option<String>> = chunks.iter().map(|c| c.symbol_name.clone()).collect();
        let chunk_types: Vec<String> = chunks.iter().map(|c| c.chunk_type.clone()).collect();
        let timestamps: Vec<u64> = chunks.iter().map(|c| c.timestamp).collect();

        // Create Arrow arrays
        let id_array = StringArray::from(ids);
        let file_path_array = StringArray::from(file_paths);
        let content_array = StringArray::from(contents);
        let embedding_array = Float32Array::from(embeddings);
        let symbol_name_array = StringArray::from(
            symbol_names.iter().map(|s| s.as_deref()).collect::<Vec<_>>()
        );
        let chunk_type_array = StringArray::from(chunk_types);
        let timestamp_array = UInt64Array::from(timestamps);

        // Define schema
        let schema = StdArc::new(Schema::new(vec![
            Field::new("id", DataType::Utf8, false),
            Field::new("file_path", DataType::Utf8, false),
            Field::new("content", DataType::Utf8, false),
            Field::new("embedding", DataType::FixedSizeList(
                StdArc::new(Field::new("item", DataType::Float32, true)),
                embedding_dim as i32
            ), false),
            Field::new("symbol_name", DataType::Utf8, true),
            Field::new("chunk_type", DataType::Utf8, false),
            Field::new("timestamp", DataType::UInt64, false),
        ]));

        // Create RecordBatch
        let batch = RecordBatch::try_new(
            schema,
            vec![
                StdArc::new(id_array),
                StdArc::new(file_path_array),
                StdArc::new(content_array),
                StdArc::new(embedding_array),
                StdArc::new(symbol_name_array),
                StdArc::new(chunk_type_array),
                StdArc::new(timestamp_array),
            ],
        )?;

        Ok(batch)
    }
}

/// Vector database interface for semantic code search
pub struct VectorDB {
    connection: Arc<Mutex<Connection>>,
    table_name: String,
}

impl VectorDB {
    /// Initialize the vector database in embedded mode
    pub async fn init(db_path: &str) -> Result<Self, Box<dyn Error>> {
        let connection = lancedb::connect(db_path).execute().await?;
        
        let table_name = "code_chunks".to_string();
        
        Ok(Self {
            connection: Arc::new(Mutex::new(connection)),
            table_name,
        })
    }
    
    /// Get or create the code_chunks table
    async fn get_table(&self) -> Result<Table, Box<dyn Error>> {
        let conn = self.connection.lock().await;
        
        match conn.open_table(&self.table_name).execute().await {
            Ok(table) => Ok(table),
            Err(_) => {
                Err("Table does not exist. Use upsert to create it.".into())
            }
        }
    }
    
    /// Insert or update code chunks in the vector database
    pub async fn upsert(&self, chunks: Vec<CodeChunk>) -> Result<(), Box<dyn Error>> {
        if chunks.is_empty() {
            return Ok(());
        }
        
        let conn = self.connection.lock().await;
        
        // Convert chunks to RecordBatch
        let batch = CodeChunk::to_record_batch(chunks.clone())?;
        let schema = batch.schema();
        
        // Create iterator
        let batches = vec![Ok(batch)];
        let reader = RecordBatchIterator::new(batches.into_iter(), schema);
        
        // Try to open table, or create if it doesn't exist
        let table = match conn.open_table(&self.table_name).execute().await {
            Ok(table) => table,
            Err(_) => {
                // Create new table
                conn.create_table(&self.table_name, Box::new(reader))
                    .execute()
                    .await?
            }
        };
        
        // For existing table, add new data
        if conn.open_table(&self.table_name).execute().await.is_ok() {
            let batch2 = CodeChunk::to_record_batch(chunks)?;
            let schema2 = batch2.schema();
            let batches2 = vec![Ok(batch2)];
            let reader2 = RecordBatchIterator::new(batches2.into_iter(), schema2);
            
            table.add(Box::new(reader2)).execute().await?;
        }
        
        Ok(())
    }
    
    /// Query the vector database for similar code chunks
    pub async fn query(
        &self,
        query_embedding: Vec<f32>,
        top_k: usize,
    ) -> Result<Vec<CodeChunk>, Box<dyn Error>> {
        let table = self.get_table().await?;
        
        // Perform vector similarity search
        let mut query = table.vector_search(query_embedding)?;
        query = query.limit(top_k);
        
        let _results = query.execute().await?;
        
        // Convert RecordBatch back to CodeChunk
        let chunks = Vec::new();
        
        // TODO: Parse RecordBatch to CodeChunk
        // For now, return empty vec
        
        Ok(chunks)
    }
    
    /// Delete all chunks associated with a file
    pub async fn delete_file(&self, file_path: &str) -> Result<(), Box<dyn Error>> {
        let table = self.get_table().await?;
        
        table
            .delete(&format!("file_path = '{}'", file_path))
            .await?;
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};
    
    fn create_test_chunk(id: &str, content: &str) -> CodeChunk {
        CodeChunk {
            id: id.to_string(),
            file_path: "test.rs".to_string(),
            content: content.to_string(),
            embedding: vec![0.1; 384],
            symbol_name: Some("test_function".to_string()),
            chunk_type: "Function".to_string(),
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        }
    }
    
    #[tokio::test]
    async fn test_vector_db_init() {
        let temp_dir = std::env::temp_dir().join("test_lancedb");
        let db = VectorDB::init(temp_dir.to_str().unwrap()).await;
        assert!(db.is_ok());
    }
}
