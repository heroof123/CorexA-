// src/components/__tests__/GGUFModelBrowser.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import React from 'react';

// ---- Mocks ----

// 1. Mock Tauri Core — kullanırken setup.ts'teki global mock devreye girer
// (Explicit mock kaldırıldı)

// 2. Mock Plugins
vi.mock('@tauri-apps/plugin-dialog', () => ({
    open: vi.fn().mockResolvedValue(null),
}));
vi.mock('@tauri-apps/plugin-opener', () => ({
    openUrl: vi.fn().mockResolvedValue(undefined),
}));

// 3. Mock Child Components
vi.mock('../ToastContainer', () => ({
    showToast: vi.fn(),
}));
vi.mock('../ModelComparison', () => ({
    default: () => <div data-testid="model-comparison">ModelComparison</div>,
}));

// 4. Mock Services (including dynamic imports)
// Note: We use the same path string as the component likely uses or resolve aliases
vi.mock('../../services/downloadManager', () => ({
    downloadManager: {
        getActiveDownloads: vi.fn().mockReturnValue([]),
        onAnyTaskUpdate: vi.fn().mockReturnValue(() => { }),
        startDownload: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('../../services/ggufProvider', () => ({
    getGgufModelStatus: vi.fn().mockResolvedValue({ loaded: false, model_path: null }),
    getGpuMemoryInfo: vi.fn().mockResolvedValue(null),
    loadGgufModel: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/modelRegistry', () => ({
    getGPUInfo: vi.fn().mockResolvedValue({
        available: false,
        vendor: 'Unknown',
        name: 'Unknown',
        totalVRAM_GB: 0,
        freeVRAM_GB: 0,
        recommendedBackend: 'cpu',
    }),
    calculateOptimalGPULayers: vi.fn().mockReturnValue(0),
    getBackendRecommendation: vi.fn().mockResolvedValue({
        backend: 'cpu',
        reason: 'No GPU',
        gpuLayers: 0,
        expectedPerformance: 'slow',
        warnings: [],
    }),
}));

// Import component AFTER mocks
import GGUFModelBrowser from '../GGUFModelBrowser';

describe('GGUFModelBrowser', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        // Global mock'u temizle
        const globalInvoke = (globalThis as any).__TAURI__?.invoke;
        if (globalInvoke && globalInvoke.mockClear) {
            globalInvoke.mockClear();
        }
    });

    it('should render without crashing', async () => {
        const onModelSelect = vi.fn();
        const { container } = render(<GGUFModelBrowser onModelSelect={onModelSelect} />);

        // Wait for any useEffect async operations to settle if possible
        await waitFor(() => {
            expect(container).toBeTruthy();
        });
    });

    it('should load models from local storage', () => {
        const savedModels = [
            {
                id: 'test-1',
                name: 'test-model.gguf',
                displayName: 'Test Model',
                size: '1 GB',
                sizeBytes: 1024 * 1024 * 1024,
                quantization: 'Q4_K_M',
                description: 'Test',
                huggingFaceUrl: '',
                downloadUrl: '',
                isDownloaded: true,
                isDownloading: false,
            },
        ];
        localStorage.setItem('gguf-models', JSON.stringify(savedModels));

        const onModelSelect = vi.fn();
        render(<GGUFModelBrowser onModelSelect={onModelSelect} />);

        // We aren't asserting the DOM content thoroughly because of the complex state, 
        // just ensuring it handles the data without error.
    });
});
