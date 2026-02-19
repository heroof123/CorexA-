// hooks/useAIBackgroundAnalysis.ts
// Dosya her açıldığında arka planda otomatik AI analizi yapar.
// Kullanıcı hiçbir şey demeden, buton'a basmadan — tam IDE davranışı.

import { useEffect, useRef, useCallback, useState } from 'react';

export interface AIIssue {
    filePath: string;
    fileName: string;
    line: number;
    type: 'error' | 'warning' | 'suggestion';
    message: string;
    severity: 'high' | 'medium' | 'low';
}

export interface FileAnalysisResult {
    filePath: string;
    fileName: string;
    score: number;
    issues: AIIssue[];
    suggestions: string[];
    summary: string;
    analyzedAt: number;
}

interface AnalysisState {
    results: Map<string, FileAnalysisResult>;
    currentlyAnalyzing: string | null;
    analysisQueue: string[];
}

/** Gerçek analiz edilebilir dosya uzantıları */
const ANALYZABLE_EXTS = new Set(['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'java', 'cpp', 'c', 'css', 'html', 'vue', 'svelte']);

function isAnalyzable(filePath: string): boolean {
    const ext = filePath.split('.').pop()?.toLowerCase();
    return !!ext && ANALYZABLE_EXTS.has(ext);
}

export function useAIBackgroundAnalysis(
    selectedFile: string,
    fileContent: string,
    isAIReady: boolean
) {
    const [state, setState] = useState<AnalysisState>({
        results: new Map(),
        currentlyAnalyzing: null,
        analysisQueue: [],
    });
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    // Cache: hangi dosyaları analiz ettik (path → timestamp)
    const analysisCache = useRef<Map<string, { timestamp: number; contentHash: string }>>(new Map());
    const isAnalyzingRef = useRef(false);
    const abortRef = useRef<AbortController | null>(null);

    /** Basit hash — içerik değişti mi kontrolü için */
    const hashContent = (s: string) => {
        let h = 0;
        for (let i = 0; i < Math.min(s.length, 2000); i++) {
            h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
        }
        return String(h);
    };

    /** Bir dosyayı gerçek AI ile analiz et */
    const analyzeFile = useCallback(async (filePath: string, content: string): Promise<FileAnalysisResult | null> => {
        if (!isAnalyzable(filePath) || !content.trim()) return null;

        try {
            const { performCodeReview } = await import('../services/ai');
            const result = await performCodeReview(filePath, content);

            const fileName = filePath.split(/[/\\]/).pop() || filePath;
            const issues: AIIssue[] = result.issues.map((i: any) => ({
                filePath,
                fileName,
                line: i.line || 0,
                type: i.type,
                message: i.message,
                severity: i.severity,
            }));

            return {
                filePath,
                fileName,
                score: result.score,
                issues,
                suggestions: result.suggestions,
                summary: result.summary,
                analyzedAt: Date.now(),
            };
        } catch (err) {
            console.error(`[AI Background] Analiz hatası (${filePath}):`, err);
            return null;
        }
    }, []);

    /** Dosya değiştiğinde veya açıldığında otomatik analiz tetikle */
    useEffect(() => {
        if (!selectedFile || !fileContent || !isAIReady) return;
        if (!isAnalyzable(selectedFile)) return;

        const contentHash = hashContent(fileContent);
        const cached = analysisCache.current.get(selectedFile);

        // Aynı içerik zaten analiz edildi mi? (son 10 dakikada)
        if (cached && cached.contentHash === contentHash && Date.now() - cached.timestamp < 10 * 60 * 1000) {
            console.log(`[AI Background] Cache'den alındı: ${selectedFile}`);
            return;
        }

        // Önceki isteği iptal et
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        // 1.5 saniye debounce — tab değişimlerinde flood'u önle
        const timer = setTimeout(async () => {
            if (isAnalyzingRef.current) {
                // Kuyruğa ekle
                setState(prev => ({
                    ...prev,
                    analysisQueue: [...prev.analysisQueue.filter(p => p !== selectedFile), selectedFile],
                }));
                return;
            }

            isAnalyzingRef.current = true;
            setState(prev => ({ ...prev, currentlyAnalyzing: selectedFile }));

            console.log(`[AI Background] Analiz başlatılıyor: ${selectedFile}`);
            const result = await analyzeFile(selectedFile, fileContent);

            if (result) {
                analysisCache.current.set(selectedFile, { timestamp: Date.now(), contentHash });
                setState(prev => {
                    const newResults = new Map(prev.results);
                    newResults.set(selectedFile, result);
                    return { ...prev, results: newResults, currentlyAnalyzing: null };
                });

                // Yüksek öncelikli sorun varsa panel'i otomatik aç
                if (result.issues.some(i => i.severity === 'high')) {
                    setIsPanelOpen(true);
                }
            } else {
                setState(prev => ({ ...prev, currentlyAnalyzing: null }));
            }

            isAnalyzingRef.current = false;

            // Kuyrukta bekleyen dosya var mı?
            setState(prev => {
                if (prev.analysisQueue.length > 0) {
                    // Sonraki analiz için küçük gecikme
                    const [next, ...rest] = prev.analysisQueue;
                    console.log(`[AI Background] Kuyruktan alınıyor: ${next}`);
                    return { ...prev, analysisQueue: rest };
                }
                return prev;
            });
        }, 1500);

        return () => {
            clearTimeout(timer);
        };
    }, [selectedFile, fileContent, isAIReady, analyzeFile]);

    /** Tüm sonuçları düz dizi olarak al */
    const allIssues = Array.from(state.results.values()).flatMap(r => r.issues);
    const currentFileResult = state.results.get(selectedFile) || null;
    const isAnalyzing = state.currentlyAnalyzing !== null;

    return {
        allIssues,
        currentFileResult,
        allResults: Array.from(state.results.values()),
        isAnalyzing,
        currentlyAnalyzing: state.currentlyAnalyzing,
        isPanelOpen,
        setIsPanelOpen,
        /** Belirli bir dosyayı manuel olarak yeniden analiz et */
        reanalyze: (path: string) => {
            analysisCache.current.delete(path);
        },
    };
}
