// src-tauri/src/lib.rs

// This is the library entry point for Tauri 2.x
// The main.rs file will call run() from here

pub mod commands;
pub mod gguf;
pub mod oauth;
pub mod oauth_backend;
pub mod streaming;
pub mod vector_db;
pub mod rag_pipeline;
pub mod tree_sitter_parser;

pub mod main_module {
    pub use crate::commands::*;
    pub use crate::oauth::*;
    pub use crate::oauth_backend::*;
}
