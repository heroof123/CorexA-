// GGUF Provider - Direkt GGUF dosyalarını çalıştır
import { invoke } from "@tauri-apps/api/core";

export interface GgufModelConfig {
  modelPath: string;
  contextLength: number;
  gpuLayers: number;
  temperature: number;
  maxTokens: number;
  topP?: number;
  topK?: number;
  repeatPenalty?: number;
  minP?: number;
}

export interface GgufModelStatus {
  loaded: boolean;
  model_path: string | null;
}

// GGUF model yükle
export async function loadGgufModel(config: GgufModelConfig): Promise<string> {
  console.log('🔵 GGUF model yükleniyor:', config);

  try {
    const result = await invoke<string>('load_gguf_model', {
      modelPath: config.modelPath,
      nCtx: config.contextLength,
      nGpuLayers: config.gpuLayers
    });

    console.log('✅ GGUF model yüklendi:', result);
    return result;
  } catch (error) {
    console.error('❌ GGUF model yükleme hatası:', error);
    throw error;
  }
}

// GGUF model ile chat
export async function chatWithGgufModel(
  modelPath: string, // 🆕 Model path required
  prompt: string,
  maxTokens: number = 512,
  temperature: number = 0.7
): Promise<string> {
  console.log('🔵 GGUF chat başlıyor...');
  console.log('📦 Model:', modelPath);
  console.log('📝 Prompt:', prompt.substring(0, 100));
  console.log('⚙️ Parametreler:', { maxTokens, temperature });

  try {
    // Normal text-only chat - artık model_path iletiliyor
    const response = await invoke<string>('chat_with_gguf_model', {
      modelPath, // 🆕 backend'e ilet
      prompt,
      maxTokens,
      temperature
    });

    console.log('✅ Yanıt alındı:', response.length, 'karakter');
    return response;
  } catch (error) {
    console.error('❌ GGUF chat hatası:', error);
    throw error;
  }
}

// GGUF model unload
export async function unloadGgufModel(): Promise<string> {
  console.log('🔵 GGUF model unload ediliyor');

  try {
    const result = await invoke<string>('unload_gguf_model');
    console.log('✅ GGUF model unloaded:', result);
    return result;
  } catch (error) {
    console.error('❌ GGUF unload hatası:', error);
    throw error;
  }
}

// GGUF model status
export async function getGgufModelStatus(): Promise<{ loaded: boolean, loaded_models: string[] }> {
  try {
    const status = await invoke<{ loaded: boolean, loaded_models: string[] }>('get_gguf_model_status');
    return status;
  } catch (error) {
    console.error('❌ GGUF status hatası:', error);
    return { loaded: false, loaded_models: [] };
  }
}

// GGUF dosyası seç (dialog)
export async function selectGgufFile(): Promise<string | null> {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');

    const selected = await open({
      multiple: false,
      filters: [{
        name: 'GGUF Models',
        extensions: ['gguf']
      }]
    });

    if (selected && typeof selected === 'string') {
      return selected;
    }

    return null;
  } catch (error) {
    console.error('❌ Dosya seçme hatası:', error);
    return null;
  }
}

// 🆕 GPU Memory bilgisi al
export interface GpuMemoryInfo {
  available: boolean;
  total_vram_gb: number;
  used_vram_gb: number;
  free_vram_gb: number;
  usage_percent: number;
  model_size_gb: number;
  kv_cache_size_gb: number;
}

export async function getGpuMemoryInfo(): Promise<GpuMemoryInfo> {
  try {
    const info = await invoke<GpuMemoryInfo>('get_gpu_memory_info');
    return info;
  } catch (error) {
    console.error('❌ GPU memory info hatası:', error);
    return {
      available: false,
      total_vram_gb: 0,
      used_vram_gb: 0,
      free_vram_gb: 0,
      usage_percent: 0,
      model_size_gb: 0,
      kv_cache_size_gb: 0
    };
  }
}
