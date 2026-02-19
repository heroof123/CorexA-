// Streaming AI Response Provider
import { invoke } from "@tauri-apps/api/core";

export interface StreamingConfig {
  onToken?: (token: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: string) => void;
}

// Simulated streaming (chunk-based)
// Gerçek streaming için Rust backend'de event emit gerekli
export async function chatWithStreaming(
  modelPath: string, // 🆕 Model path required
  prompt: string,
  maxTokens: number,
  temperature: number,
  config: StreamingConfig
): Promise<string> {
  try {
    const fullResponse = await invoke<string>('chat_with_gguf_model', {
      modelPath,
      prompt,
      maxTokens,
      temperature
    });

    // 🔥 FIX: Her token'da sadece DELTA (yeni kısım) gönder, birikimli değil
    if (config.onToken) {
      const words = fullResponse.split(' ');

      for (let i = 0; i < words.length; i++) {
        // Sadece yeni kelimeyi gönder (delta)
        const delta = (i > 0 ? ' ' : '') + words[i];
        config.onToken(delta);

        await new Promise(resolve => setTimeout(resolve, 30));
      }
    }

    if (config.onComplete) {
      config.onComplete(fullResponse);
    }

    return fullResponse;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (config.onError) {
      config.onError(errorMsg);
    }
    throw error;
  }
}

// Chunk-based streaming (better simulation)
export async function chatWithChunkedStreaming(
  modelPath: string, // 🆕 Model path required
  prompt: string,
  maxTokens: number,
  temperature: number,
  config: StreamingConfig
): Promise<string> {
  try {
    const fullResponse = await invoke<string>('chat_with_gguf_model', {
      modelPath,
      prompt,
      maxTokens,
      temperature
    });

    // 🔥 FIX: Birikimli累 metin yerine sadece DELTA chunk gönder
    if (config.onToken) {
      const chars = fullResponse.split('');
      const chunkSize = 5; // 5 karakter birden

      for (let i = 0; i < chars.length; i += chunkSize) {
        // Sadece bu adımın yeni chunk'ını gönder (delta)
        const delta = chars.slice(i, i + chunkSize).join('');
        config.onToken(delta);

        await new Promise(resolve => setTimeout(resolve, 2));
      }
    }

    if (config.onComplete) {
      config.onComplete(fullResponse);
    }

    return fullResponse;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (config.onError) {
      config.onError(errorMsg);
    }
    throw error;
  }
}
