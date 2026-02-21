use llama_cpp_2::context::params::LlamaContextParams;
use llama_cpp_2::llama_backend::LlamaBackend;
use llama_cpp_2::llama_batch::LlamaBatch;
use llama_cpp_2::model::params::LlamaModelParams;
use llama_cpp_2::model::{AddBos, LlamaModel};
use log::{error, info};
use std::path::Path;
use std::sync::{Arc, Mutex};

// Tauri state için wrapper - PUBLIC!
pub struct GgufState {
    pub backend: Option<LlamaBackend>,
    pub model: Option<LlamaModel>,
    pub model_path: Option<String>,
    pub n_ctx: u32,
    pub n_gpu_layers: u32,
}

impl Default for GgufState {
    fn default() -> Self {
        Self {
            backend: None,
            model: None,
            model_path: None,
            n_ctx: 4096,
            n_gpu_layers: 0,
        }
    }
}

// Manager - PUBLIC!
pub struct GgufModelManager;

impl GgufModelManager {
    pub fn load_model(
        state: &Arc<Mutex<GgufState>>,
        model_path: &str,
        n_ctx: u32,
        n_gpu_layers: u32,
    ) -> Result<String, String> {
        info!("GGUF model loading: {}", model_path);

        if !Path::new(model_path).exists() {
            return Err(format!("Model file not found: {}", model_path));
        }

        let backend = LlamaBackend::init().map_err(|e| format!("Backend init failed: {:?}", e))?;

        let model_params = LlamaModelParams::default().with_n_gpu_layers(n_gpu_layers);

        let model = LlamaModel::load_from_file(&backend, model_path, &model_params)
            .map_err(|e| format!("Model load failed: {:?}", e))?;

        let mut state_guard = state.lock().unwrap();
        state_guard.backend = Some(backend);
        state_guard.model = Some(model);
        state_guard.model_path = Some(model_path.to_string());
        state_guard.n_ctx = n_ctx;
        state_guard.n_gpu_layers = n_gpu_layers;

        Ok(format!("Model loaded: {}", model_path))
    }

    pub fn generate(
        state: &Arc<Mutex<GgufState>>,
        prompt: &str,
        max_tokens: u32,
        _temperature: f32,
    ) -> Result<String, String> {
        let mut state_guard = state.lock().unwrap();

        let backend = state_guard.backend.as_ref().ok_or("Backend not loaded")?;
        let model = state_guard.model.as_ref().ok_or("Model not loaded")?;
        let n_ctx = state_guard.n_ctx;

        let ctx_params = LlamaContextParams::default()
            .with_n_ctx(std::num::NonZero::new(n_ctx))
            .with_n_batch(512);

        let mut context = model
            .new_context(backend, ctx_params)
            .map_err(|e| format!("Context creation failed: {:?}", e))?;

        let tokens = model
            .str_to_token(prompt, AddBos::Always)
            .map_err(|e| format!("Tokenization failed: {:?}", e))?;

        let mut batch = LlamaBatch::new(512, 1);

        for (i, token) in tokens.iter().enumerate() {
            batch
                .add(*token, i as i32, &[0], i == tokens.len() - 1)
                .map_err(|e| format!("Batch add failed: {:?}", e))?;
        }

        context
            .decode(&mut batch)
            .map_err(|e| format!("Decode failed: {:?}", e))?;

        let mut response = String::new();
        let mut n_cur = batch.n_tokens();
        let mut decoder = encoding_rs::UTF_8.new_decoder();

        for _ in 0..max_tokens {
            let candidates = context.candidates();

            let new_token_id = if let Some(first) = candidates.into_iter().next() {
                first.id()
            } else {
                break;
            };

            if model.is_eog_token(new_token_id) {
                break;
            }

            let token_str = model
                .token_to_piece(new_token_id, &mut decoder, false, None)
                .map_err(|e| format!("Token to str failed: {:?}", e))?;

            response.push_str(&token_str);

            batch.clear();
            batch
                .add(new_token_id, n_cur, &[0], true)
                .map_err(|e| format!("Batch add failed: {:?}", e))?;

            context
                .decode(&mut batch)
                .map_err(|e| format!("Decode failed: {:?}", e))?;

            n_cur += 1;
        }

        Ok(response)
    }

    pub fn is_loaded(state: &Arc<Mutex<GgufState>>) -> bool {
        state.lock().unwrap().model.is_some()
    }

    pub fn get_model_path(state: &Arc<Mutex<GgufState>>) -> Option<String> {
        state.lock().unwrap().model_path.clone()
    }

    pub fn unload_model(state: &Arc<Mutex<GgufState>>) {
        let mut state_guard = state.lock().unwrap();
        state_guard.backend = None;
        state_guard.model = None;
        state_guard.model_path = None;
    }
}
