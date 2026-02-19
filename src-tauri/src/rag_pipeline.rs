// src-tauri/src/rag_pipeline.rs
// RAG Pipeline Integration using Rig framework

use serde::{Deserialize, Serialize};
use std::error::Error;

/// Query intent types for context building
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum QueryIntent {
    Refactor { symbol: String },
    Explain { symbol: String },
    Debug { file: String },
    Test { symbol: String },
    General,
}

/// Context source attribution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextSource {
    pub source_type: String,  // "vector_db", "symbol_resolver", "git", "dependency_graph"
    pub file_path: String,
    pub relevance_score: f32,
    pub reason: String,
}

/// RAG Pipeline for multi-source context building
pub struct RAGPipeline {
    max_context_tokens: usize,
}

impl RAGPipeline {
    pub fn new(max_context_tokens: usize) -> Self {
        Self {
            max_context_tokens,
        }
    }
    
    /// Analyze query intent
    pub fn analyze_intent(&self, query: &str) -> QueryIntent {
        let query_lower = query.to_lowercase();
        
        // Simple keyword matching for intent detection
        if query_lower.contains("refactor") {
            let symbol = self.extract_symbol_from_query(query);
            QueryIntent::Refactor { symbol }
        } else if query_lower.contains("explain") || query_lower.contains("what is") || query_lower.contains("what does") {
            let symbol = self.extract_symbol_from_query(query);
            QueryIntent::Explain { symbol }
        } else if query_lower.contains("debug") || query_lower.contains("fix") || query_lower.contains("error") {
            let file = self.extract_file_from_query(query);
            QueryIntent::Debug { file }
        } else if query_lower.contains("test") || query_lower.contains("unit test") {
            let symbol = self.extract_symbol_from_query(query);
            QueryIntent::Test { symbol }
        } else {
            QueryIntent::General
        }
    }
    
    /// Extract symbol name from query (simplified)
    fn extract_symbol_from_query(&self, query: &str) -> String {
        // Look for words that might be symbol names (camelCase, PascalCase, snake_case)
        let words: Vec<&str> = query.split_whitespace().collect();
        
        for word in words {
            // Remove punctuation
            let clean_word = word.trim_matches(|c: char| !c.is_alphanumeric() && c != '_');
            
            // Check if it looks like a symbol name
            if clean_word.len() > 2 && (
                clean_word.contains('_') ||  // snake_case
                clean_word.chars().any(|c| c.is_uppercase())  // camelCase or PascalCase
            ) {
                return clean_word.to_string();
            }
        }
        
        String::new()
    }
    
    /// Extract file path from query (simplified)
    fn extract_file_from_query(&self, query: &str) -> String {
        // Look for file extensions
        let words: Vec<&str> = query.split_whitespace().collect();
        
        for word in words {
            if word.contains('.') && (
                word.ends_with(".ts") ||
                word.ends_with(".tsx") ||
                word.ends_with(".js") ||
                word.ends_with(".jsx") ||
                word.ends_with(".rs") ||
                word.ends_with(".py") ||
                word.ends_with(".go")
            ) {
                return word.to_string();
            }
        }
        
        String::new()
    }
    
    /// Build context from multiple sources
    pub async fn build_context(
        &self,
        intent: QueryIntent,
        query: &str,
    ) -> Result<(String, Vec<ContextSource>), Box<dyn Error>> {
        let mut context = String::new();
        let sources: Vec<ContextSource> = Vec::new();
        
        // Reserve tokens for system prompt and query
        let available_tokens = self.max_context_tokens.saturating_sub(30_000); // Reserve 30k for system + query
        
        // TODO: Implement actual multi-source retrieval
        // For now, return placeholder
        
        context.push_str("=== CONTEXT ===\n\n");
        context.push_str(&format!("Query: {}\n", query));
        context.push_str(&format!("Intent: {:?}\n\n", intent));
        
        // Estimate tokens (rough: 1 token ≈ 4 characters)
        let token_count = context.len() / 4;
        
        if token_count > available_tokens {
            // Truncate if needed
            let max_chars = available_tokens * 4;
            context.truncate(max_chars);
            context.push_str("\n\n[Context truncated due to token limit]");
        }
        
        Ok((context, sources))
    }
    
    /// Estimate token count (rough approximation)
    pub fn estimate_tokens(text: &str) -> usize {
        // Rough estimation: 1 token ≈ 4 characters
        text.len() / 4
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_intent_analysis() {
        let pipeline = RAGPipeline::new(170_000);
        
        // Test refactor intent
        let intent = pipeline.analyze_intent("refactor the calculateTotal function");
        match intent {
            QueryIntent::Refactor { symbol } => {
                assert_eq!(symbol, "calculateTotal");
            }
            _ => panic!("Expected Refactor intent"),
        }
        
        // Test explain intent
        let intent = pipeline.analyze_intent("explain what UserService does");
        match intent {
            QueryIntent::Explain { symbol } => {
                assert_eq!(symbol, "UserService");
            }
            _ => panic!("Expected Explain intent"),
        }
        
        // Test debug intent
        let intent = pipeline.analyze_intent("debug the error in main.ts");
        match intent {
            QueryIntent::Debug { file } => {
                assert_eq!(file, "main.ts");
            }
            _ => panic!("Expected Debug intent"),
        }
        
        // Test general intent
        let intent = pipeline.analyze_intent("hello world");
        match intent {
            QueryIntent::General => {}
            _ => panic!("Expected General intent"),
        }
    }
    
    #[test]
    fn test_token_estimation() {
        let text = "This is a test string with approximately 10 words in it.";
        let tokens = RAGPipeline::estimate_tokens(text);
        
        // Should be around 14-15 tokens (rough estimate)
        assert!(tokens > 10 && tokens < 20);
    }
}
