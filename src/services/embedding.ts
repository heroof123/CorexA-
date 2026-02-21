// services/embedding.ts
import { pipeline, env } from '@xenova/transformers';
import { invoke } from '@tauri-apps/api/core';
import { cacheManager, hashString } from './cache';

env.allowLocalModels = false;
env.useBrowserCache = true;

let embedder: any = null;
let useBGE = true; // BGE kullanımı için flag

// 🆕 Aktif embedding endpoint'ini al
export function getEmbeddingEndpoint(): string | null {
  const activeProviders = localStorage.getItem('corex-ai-providers');
  if (activeProviders) {
    try {
      const providers = JSON.parse(activeProviders);

      // GGUF Direct aktifse veya hiç local provider yoksa null dön
      const isGgufActive = providers.some((p: any) => (p.id === 'gguf-direct' || p.baseUrl === 'internal://gguf') && p.isActive);
      if (isGgufActive) return null;

      const activeLocal = providers.find((p: any) => p.type === 'local' && p.isActive && p.id !== 'gguf-direct');
      if (activeLocal) {
        return `${activeLocal.baseUrl}/embeddings`;
      }
    } catch (e) {
      console.warn("⚠️ Provider endpoint okunamadı:", e);
    }
  }
  return null;
}

export async function initEmbedder() {
  if (!embedder && !useBGE) {
    console.log("🔵 Loading embedding model...");
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log("✅ Model ready!");
  }
  return embedder;
}

export async function createEmbedding(text: string): Promise<number[]> {
  // Cache kontrolü
  const cacheKey = `emb:${hashString(text)}`;
  const cached = cacheManager.getEmbedding(cacheKey);
  if (cached) {
    console.log("💾 Embedding cache'den alındı");
    return cached;
  }
  // Boş metin kontrolü
  if (!text || text.trim().length === 0) {
    console.warn("⚠️ Boş metin için embedding oluşturuluyor");
    return new Array(384).fill(0); // Varsayılan boyut
  }

  // 🆕 Aktif provider kontrolü - GGUF aktifse embedding kullanma
  const activeProviders = localStorage.getItem('corex-ai-providers');
  if (activeProviders) {
    try {
      const providers = JSON.parse(activeProviders);
      const ggufProvider = providers.find((p: any) => p.id === 'gguf-direct' && p.isActive);

      if (ggufProvider) {
        console.log("⏭️ GGUF aktif, embedding atlanıyor (dosya arama devre dışı)");
        return new Array(384).fill(0); // Dummy embedding
      }
    } catch (e) {
      console.warn("⚠️ Provider kontrolü başarısız:", e);
    }
  }

  // Önce BGE'yi dene (timeout ile)
  if (useBGE) {
    try {
      console.log("🧩 BGE Embedding kullanılıyor...");

      // 🆕 Provider'dan endpoint al
      const endpoint = getEmbeddingEndpoint();

      // Eğer local server yoksa BGE'yi kullanma, direkt Xenova'ya geç
      if (!endpoint) {
        console.log("⏭️ Aktif yerel AI sunucusu bulunamadı, Xenova'ya geçiliyor");
        useBGE = false;
        return await createEmbedding(text);
      }

      // 🔧 Timeout 15s → 30s (büyük dosyalar için)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('BGE Embedding zaman aşımı (30 saniye)')), 30000);
      });

      const bgePromise = invoke<number[]>("create_embedding_bge", { text, endpoint });
      const embedding = await Promise.race([bgePromise, timeoutPromise]);

      // Embedding boyut kontrolü
      if (!embedding || embedding.length === 0) {
        throw new Error("BGE boş embedding döndürdü");
      }

      console.log("✅ BGE Embedding başarılı:", embedding.length, "boyut");

      // Cache'e kaydet
      cacheManager.setEmbedding(cacheKey, embedding);

      return embedding;
    } catch (error) {
      console.warn("⚠️ BGE Embedding başarısız, Xenova'ya geçiliyor:", error);
      useBGE = false; // BGE çalışmıyorsa Xenova'ya geç
    }
  }

  // Fallback: Xenova Transformers
  try {
    const model = await initEmbedder();

    // Truncate to prevent model overload
    const truncatedText = text.substring(0, 5000);

    const output = await model(truncatedText, {
      pooling: 'mean',
      normalize: true
    });

    const embedding = Array.from(output.data);

    // Embedding boyut kontrolü
    if (!embedding || embedding.length === 0) {
      console.warn("⚠️ Xenova boş embedding döndürdü, varsayılan embedding kullanılıyor");
      return new Array(384).fill(0);
    }

    console.log("✅ Xenova Embedding başarılı:", embedding.length, "boyut");

    // Cache'e kaydet
    cacheManager.setEmbedding(cacheKey, embedding as number[]);

    return embedding as number[];

  } catch (error) {
    console.error("❌ Embedding oluşturma hatası:", error);
    // Hata durumunda varsayılan embedding döndür
    return new Array(384).fill(0);
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  // Boyut kontrolü ve uyarı
  if (a.length !== b.length) {
    console.warn(`⚠️ Embedding boyut uyumsuzluğu: ${a.length} vs ${b.length}`);

    // Daha kısa olanın boyutuna göre kırp
    const minLength = Math.min(a.length, b.length);
    if (minLength === 0) return 0;

    a = a.slice(0, minLength);
    b = b.slice(0, minLength);

    console.log(`🔧 Boyutlar ${minLength}'e kırpıldı`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);

  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

export function findRelevantFiles(
  queryEmbedding: number[],
  fileIndex: Array<{ path: string; content: string; embedding: number[] }>,
  topK: number = 5
): Array<{ path: string; content: string; score: number }> {

  const scores = fileIndex.map(file => ({
    path: file.path,
    content: file.content,
    score: cosineSimilarity(queryEmbedding, file.embedding)
  }));

  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter(f => f.score > 0.15); // 🔧 0.2 → 0.15 (daha fazla dosya bul)
}

// Smart file filtering - decide which files to index
export function shouldIndexFile(filePath: string): boolean {
  const ignoredDirs = [
    'node_modules',
    'dist',
    'build',
    '.git',
    '.next',
    'target',
    'out',
    '.turbo',
    'coverage',
    '.cache',
    'public/assets',
    '.vscode',
    '.idea',
    '__pycache__',
    'venv',
    'env',
  ];

  const ignoredExtensions = [
    // Images
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
    // Fonts
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    // Media
    '.mp4', '.webm', '.mp3', '.wav', '.ogg',
    // Archives
    '.zip', '.tar', '.gz', '.rar', '.7z',
    // Binary
    '.pdf', '.exe', '.dll', '.so', '.dylib',
    // Lock files
    '.lock',
    // Logs
    '.log',
    // Maps
    '.map',
  ];

  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/');
  const pathParts = normalizedPath.split('/');

  // Check ignored directories
  if (pathParts.some(part => ignoredDirs.includes(part))) {
    return false;
  }

  // Check file extension
  const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  if (ignoredExtensions.includes(ext)) {
    return false;
  }

  // Additional checks
  const fileName = pathParts[pathParts.length - 1];

  // Ignore specific files
  if (fileName === 'package-lock.json' ||
    fileName === 'yarn.lock' ||
    fileName === 'Cargo.lock' ||
    fileName.endsWith('.min.js') ||
    fileName.endsWith('.min.css')) {
    return false;
  }

  return true;
}

// Batch embedding creation for efficiency
export async function createEmbeddingBatch(texts: string[]): Promise<number[][]> {
  const model = await initEmbedder();
  const embeddings: number[][] = [];

  for (const text of texts) {
    const truncatedText = text.substring(0, 5000);
    const output = await model(truncatedText, {
      pooling: 'mean',
      normalize: true
    });
    embeddings.push(Array.from(output.data));
  }

  return embeddings;
}