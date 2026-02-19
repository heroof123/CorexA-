// src-tauri/src/streaming.rs
// Real streaming implementation for Cursor-like experience

use tauri::{AppHandle, Emitter, Manager};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamToken {
    pub token: String,
    pub is_complete: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamingRequest {
    pub model_path: Option<String>, // 🆕 Model path for GGUF
    pub prompt: String,
    pub max_tokens: Option<i32>,
    pub temperature: Option<f32>,
}

/// Stream AI response with real-time token emission
#[tauri::command]
pub async fn chat_with_streaming(
    app: AppHandle,
    request: StreamingRequest,
) -> Result<String, String> {
    log::info!("🌊 Starting streaming chat...");
    
    // Get GGUF model state
    let gguf_state = app.state::<Arc<Mutex<crate::gguf::GgufState>>>();
    
    // Check if model is loaded
    let model_path = match &request.model_path {
        Some(path) => path.clone(),
        None => {
            // Fallback to first loaded model if not specified
            let state = gguf_state.lock().unwrap();
            match state.models.keys().next() {
                Some(path) => path.clone(),
                None => return Err("No GGUF models loaded. Please load a model first.".to_string()),
            }
        }
    };

    {
        let state = gguf_state.lock().unwrap();
        if !state.models.contains_key(&model_path) {
            return Err(format!("Model not found in pool: {}", model_path));
        }
    }
    
    // Emit start event
    app.emit("stream-start", ()).map_err(|e| e.to_string())?;
    
    let mut full_response = String::new();
    
    // TODO: Implement real llama.cpp streaming
    // For now, simulate streaming with the existing model
    let response = crate::gguf::chat_with_gguf_model(
        gguf_state,
        model_path, // 🆕 Pass the resolved model path
        request.prompt.clone(),
        request.max_tokens.unwrap_or(2000) as u32,
        request.temperature.unwrap_or(0.7),
    ).await.map_err(|e| e.to_string())?;
    
    // Simulate streaming by splitting response
    let words: Vec<&str> = response.split_whitespace().collect();
    
    for (_i, word) in words.iter().enumerate() {
        let token = format!("{} ", word);
        full_response.push_str(&token);
        
        // Emit token event
        let stream_token = StreamToken {
            token: token.clone(),
            is_complete: false,
        };
        
        app.emit("stream-token", stream_token).map_err(|e| e.to_string())?;
        
        // Small delay to simulate streaming
        tokio::time::sleep(tokio::time::Duration::from_millis(30)).await;
    }
    
    // Emit completion event
    let final_token = StreamToken {
        token: String::new(),
        is_complete: true,
    };
    app.emit("stream-token", final_token).map_err(|e| e.to_string())?;
    app.emit("stream-complete", full_response.clone()).map_err(|e| e.to_string())?;
    
    log::info!("✅ Streaming complete: {} tokens", words.len());
    
    Ok(full_response)
}

/// Stream with HTTP API (LM Studio, Ollama)
#[tauri::command]
pub async fn chat_with_http_streaming(
    app: AppHandle,
    base_url: String,
    request: StreamingRequest,
) -> Result<String, String> {
    log::info!("🌊 Starting HTTP streaming to: {}", base_url);
    
    use reqwest::Client;
    use futures_util::StreamExt;
    
    let client = Client::new();
    
    // Emit start event
    app.emit("stream-start", ()).map_err(|e| e.to_string())?;
    
    let body = serde_json::json!({
        "model": "default",
        "prompt": request.prompt,
        "max_tokens": request.max_tokens.unwrap_or(2000),
        "temperature": request.temperature.unwrap_or(0.7),
        "stream": true
    });
    
    let response = client
        .post(format!("{}/v1/completions", base_url))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }
    
    let mut stream = response.bytes_stream();
    let mut full_response = String::new();
    
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Stream error: {}", e))?;
        let text = String::from_utf8_lossy(&chunk);
        
        // Parse SSE format
        for line in text.lines() {
            if line.starts_with("data: ") {
                let data = &line[6..];
                if data == "[DONE]" {
                    break;
                }
                
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(token) = json["choices"][0]["text"].as_str() {
                        full_response.push_str(token);
                        
                        let stream_token = StreamToken {
                            token: token.to_string(),
                            is_complete: false,
                        };
                        
                        app.emit("stream-token", stream_token).map_err(|e| e.to_string())?;
                    }
                }
            }
        }
    }
    
    // Emit completion
    let final_token = StreamToken {
        token: String::new(),
        is_complete: true,
    };
    app.emit("stream-token", final_token).map_err(|e| e.to_string())?;
    app.emit("stream-complete", full_response.clone()).map_err(|e| e.to_string())?;
    
    log::info!("✅ HTTP streaming complete");
    
    Ok(full_response)
}

// Note: We don't need chat_with_gguf_model_internal anymore
// We use the existing chat_with_gguf_model directly
