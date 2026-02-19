// src-tauri/src/tree_sitter_parser.rs
// Tree-sitter Parser Integration for multi-language AST parsing

use serde::{Deserialize, Serialize};
use std::error::Error;
use lru::LruCache;
use std::num::NonZeroUsize;

/// Symbol extracted from AST
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Symbol {
    pub name: String,
    pub kind: String,  // "function", "class", "interface", etc.
    pub line: usize,
    pub column: usize,
    pub signature: Option<String>,
    pub documentation: Option<String>,
    pub is_exported: bool,
}

/// File analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileAnalysis {
    pub file_path: String,
    pub symbols: Vec<Symbol>,
    pub imports: Vec<String>,
    pub exports: Vec<String>,
    pub complexity: usize,
    pub dependencies: Vec<String>,
    pub dependents: Vec<String>,
}

/// Tree-sitter parser with AST caching
pub struct TreeSitterParser {
    ast_cache: LruCache<String, FileAnalysis>,
}

impl TreeSitterParser {
    pub fn new() -> Self {
        Self {
            ast_cache: LruCache::new(NonZeroUsize::new(500).unwrap()),
        }
    }
    
    /// Parse file and extract symbols
    pub fn parse_file(&mut self, file_path: &str, content: &str) -> Result<FileAnalysis, Box<dyn Error>> {
        // Check cache
        if let Some(cached) = self.ast_cache.get(file_path) {
            return Ok(cached.clone());
        }
        
        // Detect language from file extension
        let language = self.detect_language(file_path)?;
        
        // Parse based on language
        let analysis = match language.as_str() {
            "typescript" | "javascript" => self.parse_typescript(file_path, content)?,
            "python" => self.parse_python(file_path, content)?,
            "rust" => self.parse_rust(file_path, content)?,
            "go" => self.parse_go(file_path, content)?,
            _ => return Err(format!("Unsupported language: {}", language).into()),
        };
        
        // Cache result
        self.ast_cache.put(file_path.to_string(), analysis.clone());
        
        Ok(analysis)
    }
    
    /// Detect language from file extension
    fn detect_language(&self, file_path: &str) -> Result<String, Box<dyn Error>> {
        let extension = file_path.split('.').last()
            .ok_or("No file extension")?;
        
        match extension {
            "ts" | "tsx" | "js" | "jsx" => Ok("typescript".to_string()),
            "py" => Ok("python".to_string()),
            "rs" => Ok("rust".to_string()),
            "go" => Ok("go".to_string()),
            _ => Err(format!("Unsupported extension: {}", extension).into()),
        }
    }
    
    /// Parse TypeScript/JavaScript (regex fallback for now)
    fn parse_typescript(&self, file_path: &str, content: &str) -> Result<FileAnalysis, Box<dyn Error>> {
        let mut symbols = Vec::new();
        let mut imports = Vec::new();
        let exports = Vec::new();
        
        // Extract functions (simplified regex)
        let function_regex = regex::Regex::new(r"(?:export\s+)?(?:async\s+)?function\s+(\w+)")?;
        for cap in function_regex.captures_iter(content) {
            if let Some(name) = cap.get(1) {
                symbols.push(Symbol {
                    name: name.as_str().to_string(),
                    kind: "function".to_string(),
                    line: content[..name.start()].lines().count(),
                    column: 0,
                    signature: None,
                    documentation: None,
                    is_exported: content[..name.start()].contains("export"),
                });
            }
        }
        
        // Extract classes
        let class_regex = regex::Regex::new(r"(?:export\s+)?class\s+(\w+)")?;
        for cap in class_regex.captures_iter(content) {
            if let Some(name) = cap.get(1) {
                symbols.push(Symbol {
                    name: name.as_str().to_string(),
                    kind: "class".to_string(),
                    line: content[..name.start()].lines().count(),
                    column: 0,
                    signature: None,
                    documentation: None,
                    is_exported: content[..name.start()].contains("export"),
                });
            }
        }
        
        // Extract imports
        let import_regex = regex::Regex::new(r#"import\s+.*?from\s+['"](.+?)['"]"#)?;
        for cap in import_regex.captures_iter(content) {
            if let Some(path) = cap.get(1) {
                imports.push(path.as_str().to_string());
            }
        }
        
        Ok(FileAnalysis {
            file_path: file_path.to_string(),
            symbols,
            imports,
            exports,
            complexity: 0,
            dependencies: Vec::new(),
            dependents: Vec::new(),
        })
    }
    
    /// Parse Python (regex fallback)
    fn parse_python(&self, file_path: &str, content: &str) -> Result<FileAnalysis, Box<dyn Error>> {
        let mut symbols = Vec::new();
        let mut imports = Vec::new();
        
        // Extract functions
        let function_regex = regex::Regex::new(r"def\s+(\w+)\s*\(")?;
        for cap in function_regex.captures_iter(content) {
            if let Some(name) = cap.get(1) {
                symbols.push(Symbol {
                    name: name.as_str().to_string(),
                    kind: "function".to_string(),
                    line: content[..name.start()].lines().count(),
                    column: 0,
                    signature: None,
                    documentation: None,
                    is_exported: true,  // Python exports all top-level
                });
            }
        }
        
        // Extract classes
        let class_regex = regex::Regex::new(r"class\s+(\w+)")?;
        for cap in class_regex.captures_iter(content) {
            if let Some(name) = cap.get(1) {
                symbols.push(Symbol {
                    name: name.as_str().to_string(),
                    kind: "class".to_string(),
                    line: content[..name.start()].lines().count(),
                    column: 0,
                    signature: None,
                    documentation: None,
                    is_exported: true,
                });
            }
        }
        
        // Extract imports
        let import_regex = regex::Regex::new(r"(?:from\s+(\S+)\s+)?import\s+(.+)")?;
        for cap in import_regex.captures_iter(content) {
            if let Some(module) = cap.get(1) {
                imports.push(module.as_str().to_string());
            }
        }
        
        Ok(FileAnalysis {
            file_path: file_path.to_string(),
            symbols,
            imports,
            exports: Vec::new(),
            complexity: 0,
            dependencies: Vec::new(),
            dependents: Vec::new(),
        })
    }
    
    /// Parse Rust (regex fallback)
    fn parse_rust(&self, file_path: &str, content: &str) -> Result<FileAnalysis, Box<dyn Error>> {
        let mut symbols = Vec::new();
        let mut imports = Vec::new();
        
        // Extract functions
        let function_regex = regex::Regex::new(r"(?:pub\s+)?fn\s+(\w+)")?;
        for cap in function_regex.captures_iter(content) {
            if let Some(name) = cap.get(1) {
                symbols.push(Symbol {
                    name: name.as_str().to_string(),
                    kind: "function".to_string(),
                    line: content[..name.start()].lines().count(),
                    column: 0,
                    signature: None,
                    documentation: None,
                    is_exported: content[..name.start()].contains("pub"),
                });
            }
        }
        
        // Extract structs
        let struct_regex = regex::Regex::new(r"(?:pub\s+)?struct\s+(\w+)")?;
        for cap in struct_regex.captures_iter(content) {
            if let Some(name) = cap.get(1) {
                symbols.push(Symbol {
                    name: name.as_str().to_string(),
                    kind: "struct".to_string(),
                    line: content[..name.start()].lines().count(),
                    column: 0,
                    signature: None,
                    documentation: None,
                    is_exported: content[..name.start()].contains("pub"),
                });
            }
        }
        
        // Extract use statements
        let use_regex = regex::Regex::new(r"use\s+([^;]+);")?;
        for cap in use_regex.captures_iter(content) {
            if let Some(path) = cap.get(1) {
                imports.push(path.as_str().to_string());
            }
        }
        
        Ok(FileAnalysis {
            file_path: file_path.to_string(),
            symbols,
            imports,
            exports: Vec::new(),
            complexity: 0,
            dependencies: Vec::new(),
            dependents: Vec::new(),
        })
    }
    
    /// Parse Go (regex fallback)
    fn parse_go(&self, file_path: &str, content: &str) -> Result<FileAnalysis, Box<dyn Error>> {
        let mut symbols = Vec::new();
        let mut imports = Vec::new();
        
        // Extract functions
        let function_regex = regex::Regex::new(r"func\s+(\w+)\s*\(")?;
        for cap in function_regex.captures_iter(content) {
            if let Some(name) = cap.get(1) {
                let is_exported = name.as_str().chars().next()
                    .map(|c| c.is_uppercase())
                    .unwrap_or(false);
                
                symbols.push(Symbol {
                    name: name.as_str().to_string(),
                    kind: "function".to_string(),
                    line: content[..name.start()].lines().count(),
                    column: 0,
                    signature: None,
                    documentation: None,
                    is_exported,
                });
            }
        }
        
        // Extract structs
        let struct_regex = regex::Regex::new(r"type\s+(\w+)\s+struct")?;
        for cap in struct_regex.captures_iter(content) {
            if let Some(name) = cap.get(1) {
                let is_exported = name.as_str().chars().next()
                    .map(|c| c.is_uppercase())
                    .unwrap_or(false);
                
                symbols.push(Symbol {
                    name: name.as_str().to_string(),
                    kind: "struct".to_string(),
                    line: content[..name.start()].lines().count(),
                    column: 0,
                    signature: None,
                    documentation: None,
                    is_exported,
                });
            }
        }
        
        // Extract imports
        let import_regex = regex::Regex::new(r#"import\s+(?:\(([^)]+)\)|"([^"]+)")"#)?;
        for cap in import_regex.captures_iter(content) {
            if let Some(multi) = cap.get(1) {
                for line in multi.as_str().lines() {
                    let trimmed = line.trim().trim_matches('"');
                    if !trimmed.is_empty() {
                        imports.push(trimmed.to_string());
                    }
                }
            } else if let Some(single) = cap.get(2) {
                imports.push(single.as_str().to_string());
            }
        }
        
        Ok(FileAnalysis {
            file_path: file_path.to_string(),
            symbols,
            imports,
            exports: Vec::new(),
            complexity: 0,
            dependencies: Vec::new(),
            dependents: Vec::new(),
        })
    }
    
    /// Clear cache
    pub fn clear_cache(&mut self) {
        self.ast_cache.clear();
    }
    
    /// Invalidate cache for specific file
    pub fn invalidate_file(&mut self, file_path: &str) {
        self.ast_cache.pop(file_path);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_typescript_parsing() {
        let mut parser = TreeSitterParser::new();
        let content = r#"
            export function hello() {
                console.log("Hello");
            }
            
            class MyClass {
                constructor() {}
            }
        "#;
        
        let result = parser.parse_file("test.ts", content).unwrap();
        assert_eq!(result.symbols.len(), 2);
        assert_eq!(result.symbols[0].name, "hello");
        assert_eq!(result.symbols[0].kind, "function");
        assert!(result.symbols[0].is_exported);
    }
    
    #[test]
    fn test_python_parsing() {
        let mut parser = TreeSitterParser::new();
        let content = r#"
def my_function():
    pass

class MyClass:
    def method(self):
        pass
        "#;
        
        let result = parser.parse_file("test.py", content).unwrap();
        assert!(result.symbols.len() >= 2);
        assert_eq!(result.symbols[0].name, "my_function");
        assert_eq!(result.symbols[0].kind, "function");
    }
}
