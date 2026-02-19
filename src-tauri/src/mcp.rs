// src-tauri/src/mcp.rs

use serde::{Deserialize, Serialize};
use std::process::{Command, Stdio, Child};
use std::io::{BufRead, BufReader, Write};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use tauri::{AppHandle, Emitter, State, Runtime};
use log::{info, error};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct McpServerConfig {
    pub name: String,
    pub command: String,
    pub args: Vec<String>,
    pub env: Option<HashMap<String, String>>,
}

pub struct McpServerInstance {
    pub config: McpServerConfig,
    pub child: Child,
}

#[derive(Default)]
pub struct McpState {
    pub instances: Mutex<HashMap<String, Arc<Mutex<McpServerInstance>>>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JsonRpcRequest {
    pub jsonrpc: String,
    pub id: serde_json::Value,
    pub method: String,
    pub params: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JsonRpcResponse {
    pub jsonrpc: String,
    pub id: serde_json::Value,
    pub result: Option<serde_json::Value>,
    pub error: Option<serde_json::Value>,
}

#[tauri::command]
pub async fn start_mcp_server<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, McpState>,
    config: McpServerConfig,
) -> Result<String, String> {
    let name = config.name.clone();
    info!("🚀 Starting MCP Server: {}", name);

    let mut cmd = Command::new(&config.command);
    cmd.args(&config.args);
    cmd.stdin(Stdio::piped());
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    if let Some(env) = &config.env {
        cmd.envs(env);
    }

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn MCP server: {}", e))?;
    
    let stdout = child.stdout.take().ok_or("Failed to open stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to open stderr")?;
    
    let instance = Arc::new(Mutex::new(McpServerInstance {
        config: config.clone(),
        child,
    }));

    {
        let mut instances = state.instances.lock().unwrap();
        instances.insert(name.clone(), instance.clone());
    }

    // Read stdout in a separate thread
    let app_clone = app.clone();
    let name_clone = name.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            match line {
                Ok(content) => {
                    info!("[MCP {}] stdout: {}", name_clone, content);
                    let _ = app_clone.emit(&format!("mcp-response-{}", name_clone), content);
                }
                Err(e) => {
                    error!("[MCP {}] stdout error: {}", name_clone, e);
                    break;
                }
            }
        }
    });

    // Read stderr in a separate thread for logging
    let name_err_clone = name.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            match line {
                Ok(content) => {
                    error!("[MCP {}] stderr: {}", name_err_clone, content);
                }
                Err(_) => break,
            }
        }
    });

    Ok(format!("MCP Server {} started", name))
}

#[tauri::command]
pub async fn send_mcp_request(
    state: State<'_, McpState>,
    server_name: String,
    request: String,
) -> Result<(), String> {
    let instances = state.instances.lock().unwrap();
    let instance = instances.get(&server_name).ok_or_else(|| format!("Server {} not found", server_name))?;
    
    let mut instance_lock = instance.lock().unwrap();
    let stdin = instance_lock.child.stdin.as_mut().ok_or("Failed to open stdin")?;
    
    stdin.write_all(request.as_bytes()).map_err(|e| e.to_string())?;
    stdin.write_all(b"\n").map_err(|e| e.to_string())?;
    stdin.flush().map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn stop_mcp_server(
    state: State<'_, McpState>,
    server_name: String,
) -> Result<String, String> {
    let mut instances = state.instances.lock().unwrap();
    if let Some(instance) = instances.remove(&server_name) {
        let mut instance_lock = instance.lock().unwrap();
        instance_lock.child.kill().map_err(|e| e.to_string())?;
        Ok(format!("MCP Server {} stopped", server_name))
    } else {
        Err(format!("Server {} not found", server_name))
    }
}

#[tauri::command]
pub async fn list_mcp_servers(
    state: State<'_, McpState>,
) -> Result<Vec<McpServerConfig>, String> {
    let instances = state.instances.lock().unwrap();
    let configs = instances.values()
        .map(|ins| ins.lock().unwrap().config.clone())
        .collect();
    Ok(configs)
}
