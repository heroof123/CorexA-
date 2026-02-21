// Model Benchmark Service

export interface BenchmarkResult {
  modelName: string;
  contextLength: number;
  firstTokenTime: number; // ms
  averageTokensPerSecond: number;
  totalTime: number; // ms
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  timestamp: number;
}

export async function runBenchmark(
  modelPath: string,
  contextLength: number,
  gpuLayers: number
): Promise<BenchmarkResult> {
  console.log('🎯 Benchmark başlatılıyor...');

  const testPrompt = "Explain what artificial intelligence is in 3 sentences.";

  try {
    // Load model if not loaded
    const { loadGgufModel, chatWithGgufModel } = await import('./ggufProvider');

    // Model yükleme süresi
    const loadStart = performance.now();
    await loadGgufModel({
      modelPath,
      contextLength,
      gpuLayers,
      temperature: 0.7,
      maxTokens: contextLength
    });
    const loadTime = performance.now() - loadStart;
    console.log(`📦 Model yükleme: ${loadTime.toFixed(0)}ms`);

    // İlk token süresi (warm-up)
    const firstTokenStart = performance.now();
    await chatWithGgufModel(modelPath, testPrompt, 1, 0.7);
    const firstTokenTime = performance.now() - firstTokenStart;
    console.log(`⚡ İlk token: ${firstTokenTime.toFixed(0)}ms`);

    // Gerçek benchmark (512 token)
    const benchStart = performance.now();
    const response = await chatWithGgufModel(modelPath, testPrompt, 512, 0.7);
    const benchTime = performance.now() - benchStart;

    // Token sayısını tahmin et (yaklaşık 4 karakter = 1 token)
    const completionTokens = Math.round(response.length / 4);
    const promptTokens = Math.round(testPrompt.length / 4);
    const totalTokens = promptTokens + completionTokens;

    const tokensPerSecond = (completionTokens / benchTime) * 1000;

    const result: BenchmarkResult = {
      modelName: modelPath.split(/[/\\]/).pop() || 'Unknown',
      contextLength,
      firstTokenTime,
      averageTokensPerSecond: tokensPerSecond,
      totalTime: benchTime,
      totalTokens,
      promptTokens,
      completionTokens,
      timestamp: Date.now()
    };

    console.log('✅ Benchmark tamamlandı:', result);

    // Save to localStorage
    saveBenchmarkResult(result);

    return result;
  } catch (error) {
    console.error('❌ Benchmark hatası:', error);
    throw error;
  }
}

function saveBenchmarkResult(result: BenchmarkResult) {
  const saved = localStorage.getItem('benchmark-results');
  const results: BenchmarkResult[] = saved ? JSON.parse(saved) : [];
  results.push(result);

  // Keep only last 50 results
  if (results.length > 50) {
    results.shift();
  }

  localStorage.setItem('benchmark-results', JSON.stringify(results));
}

export function getBenchmarkResults(): BenchmarkResult[] {
  const saved = localStorage.getItem('benchmark-results');
  return saved ? JSON.parse(saved) : [];
}

export function getBenchmarkForModel(modelName: string): BenchmarkResult | null {
  const results = getBenchmarkResults();
  return results.find(r => r.modelName === modelName) || null;
}
