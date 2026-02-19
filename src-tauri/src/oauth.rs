// OAuth Authentication Handler for Tauri
use tauri::{command, Window};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;

#[derive(Clone)]
pub struct OAuthState {
    _pending_requests: Arc<Mutex<HashMap<String, String>>>,
}

impl OAuthState {
    pub fn new() -> Self {
        Self {
            _pending_requests: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

/// Start OAuth authentication flow
/// Opens the authorization URL in the default browser and waits for callback
#[command]
pub async fn oauth_authenticate(
    auth_url: String,
    callback_url: String,
    state: String,
    _window: Window,
) -> Result<String, String> {
    println!("🔐 Starting OAuth flow...");
    println!("Auth URL: {}", auth_url);
    println!("Callback URL: {}", callback_url);
    
    // Open authorization URL in default browser
    if let Err(e) = open::that(&auth_url) {
        return Err(format!("Failed to open browser: {}", e));
    }
    
    // Start local server to listen for callback
    let (tx, rx) = std::sync::mpsc::channel();
    let callback_url_clone = callback_url.clone();
    let state_clone = state.clone();
    
    std::thread::spawn(move || {
        if let Err(e) = start_callback_server(callback_url_clone, state_clone, tx) {
            eprintln!("Callback server error: {}", e);
        }
    });
    
    // Wait for authorization code (with timeout)
    match rx.recv_timeout(std::time::Duration::from_secs(300)) {
        Ok(code) => {
            println!("✅ Authorization code received");
            Ok(code)
        }
        Err(_) => Err("OAuth timeout - no response received".to_string()),
    }
}

/// Start a local HTTP server to handle OAuth callback
fn start_callback_server(
    callback_url: String,
    expected_state: String,
    tx: std::sync::mpsc::Sender<String>,
) -> Result<(), String> {
    use tiny_http::{Server, Response};
    
    // Parse callback URL to get port
    let url = url::Url::parse(&callback_url).map_err(|e| e.to_string())?;
    let port = url.port().unwrap_or(1420);
    let path = url.path();
    
    let server = Server::http(format!("127.0.0.1:{}", port))
        .map_err(|e| format!("Failed to start server: {}", e))?;
    println!("🌐 Callback server listening on port {}", port);
    
    // Wait for single request
    if let Ok(request) = server.recv() {
        let url = request.url();
        println!("📥 Received callback: {}", url);
        
        // Check if this is our callback path
        if url.starts_with(path) {
            // Parse query parameters
            if let Some(query) = url.split('?').nth(1) {
                let params: HashMap<String, String> = query
                    .split('&')
                    .filter_map(|pair| {
                        let mut parts = pair.split('=');
                        Some((
                            parts.next()?.to_string(),
                            parts.next()?.to_string(),
                        ))
                    })
                    .collect();
                
                // Verify state (CSRF protection)
                if let Some(state) = params.get("state") {
                    if state != &expected_state {
                        let response = Response::from_string("Invalid state parameter")
                            .with_status_code(400);
                        let _ = request.respond(response);
                        return Err("State mismatch".into());
                    }
                }
                
                // Get authorization code
                if let Some(code) = params.get("code") {
                    // Send success response to browser
                    let html = r#"
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>Authentication Successful</title>
                            <style>
                                body {
                                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                    display: flex;
                                    justify-content: center;
                                    align-items: center;
                                    height: 100vh;
                                    margin: 0;
                                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                }
                                .container {
                                    background: white;
                                    padding: 40px;
                                    border-radius: 10px;
                                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                                    text-align: center;
                                }
                                h1 { color: #667eea; margin-bottom: 10px; }
                                p { color: #666; }
                                .success { font-size: 48px; margin-bottom: 20px; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="success">✅</div>
                                <h1>Authentication Successful!</h1>
                                <p>You can close this window and return to Corex IDE.</p>
                            </div>
                            <script>
                                setTimeout(() => window.close(), 3000);
                            </script>
                        </body>
                        </html>
                    "#;
                    
                    let response = Response::from_string(html)
                        .with_header(
                            tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html"[..]).unwrap()
                        );
                    let _ = request.respond(response);
                    
                    // Send code back to main thread
                    let _ = tx.send(code.clone());
                    return Ok(());
                }
                
                // Check for error
                if let Some(error) = params.get("error") {
                    let error_desc = params.get("error_description")
                        .map(|s| s.as_str())
                        .unwrap_or("Unknown error");
                    
                    let html = format!(r#"
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>Authentication Failed</title>
                            <style>
                                body {{
                                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                    display: flex;
                                    justify-content: center;
                                    align-items: center;
                                    height: 100vh;
                                    margin: 0;
                                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                                }}
                                .container {{
                                    background: white;
                                    padding: 40px;
                                    border-radius: 10px;
                                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                                    text-align: center;
                                }}
                                h1 {{ color: #f5576c; margin-bottom: 10px; }}
                                p {{ color: #666; }}
                                .error {{ font-size: 48px; margin-bottom: 20px; }}
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="error">❌</div>
                                <h1>Authentication Failed</h1>
                                <p>{}: {}</p>
                                <p>You can close this window.</p>
                            </div>
                        </body>
                        </html>
                    "#, error, error_desc);
                    
                    let response = Response::from_string(html)
                        .with_header(
                            tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html"[..]).unwrap()
                        );
                    let _ = request.respond(response);
                    
                    return Err(format!("OAuth error: {}", error).into());
                }
            }
        }
        
        // Invalid request
        let response = Response::from_string("Invalid callback")
            .with_status_code(400);
        let _ = request.respond(response);
    }
    
    Err("No valid callback received".into())
}
