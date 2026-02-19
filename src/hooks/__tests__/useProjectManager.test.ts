// src/hooks/__tests__/useProjectManager.test.ts
// useProjectManager hook testleri

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProjectManager } from '../useProjectManager';

// Mock'lar
vi.mock('@tauri-apps/plugin-dialog', () => ({
    open: vi.fn().mockResolvedValue('/mock/selected/project'),
}));

vi.mock('../../services/embedding', () => ({
    createEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
}));

vi.mock('../../services/ai', () => ({
    sendToAI: vi.fn().mockResolvedValue('Proje analiz edildi! React + TypeScript projesi.'),
    resetConversation: vi.fn(),
    updateProjectContext: vi.fn(),
}));

vi.mock('../../services/db', () => ({
    saveProjectIndex: vi.fn().mockResolvedValue(undefined),
    getProjectIndex: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../services/recentProjects', () => ({
    addRecentProject: vi.fn().mockResolvedValue(undefined),
    getProjectTypeFromFiles: vi.fn().mockReturnValue('React'),
}));

vi.mock('../../services/incrementalIndexer', () => ({
    incrementalIndexer: {
        indexProject: vi.fn().mockResolvedValue({
            indexed: [
                { path: '/mock/project/src/index.ts', content: 'export default 42;', embedding: [0.1], lastModified: 1000 },
                { path: '/mock/project/package.json', content: '{"name":"test","dependencies":{"react":"^18"}}', embedding: [0.2], lastModified: 1000 },
            ],
            stats: { added: 2, modified: 0, removed: 0, unchanged: 0 },
        }),
    },
}));

vi.mock('../../services/dependencyAnalyzer', () => ({
    dependencyAnalyzer: { buildGraph: vi.fn() },
}));

vi.mock('../../services/serviceInitializer', () => ({
    initializeServices: vi.fn().mockResolvedValue(undefined),
}));

const mockOnMessage = vi.fn();
const mockOnNotification = vi.fn();
const mockSetFileIndex = vi.fn();

const defaultOptions = {
    onMessage: mockOnMessage,
    onNotification: mockOnNotification,
    fileIndex: [] as any[],
    setFileIndex: mockSetFileIndex,
};

describe('useProjectManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('başlangıçta boş state ile dönmeli', () => {
        const { result } = renderHook(() => useProjectManager(defaultOptions));

        expect(result.current.projectPath).toBe('');
        expect(result.current.files).toEqual([]);
        expect(result.current.hasProject).toBe(false);
        expect(result.current.isIndexing).toBe(false);
        expect(result.current.indexProgress).toEqual({ current: 0, total: 0 });
    });

    it('handleProjectSelect proje yüklemeli', async () => {
        const { result } = renderHook(() => useProjectManager(defaultOptions));

        await act(async () => {
            await result.current.handleProjectSelect('/mock/project');
        });

        expect(result.current.hasProject).toBe(true);
        expect(mockOnMessage).toHaveBeenCalled();
    });

    it('addFileToIndex embedding ile dosya eklemeli', async () => {
        const { result } = renderHook(() => useProjectManager(defaultOptions));

        await act(async () => {
            await result.current.addFileToIndex('/mock/project/new.ts', 'const y = 2;');
        });

        expect(mockSetFileIndex).toHaveBeenCalledWith(expect.any(Function));
    });

    it('setHasProject çalışmalı', () => {
        const { result } = renderHook(() => useProjectManager(defaultOptions));

        act(() => {
            result.current.setHasProject(true);
        });

        expect(result.current.hasProject).toBe(true);

        act(() => {
            result.current.setHasProject(false);
        });

        expect(result.current.hasProject).toBe(false);
    });

    it('addFileToIndex mevcut dosyayı güncellemeli', async () => {
        const existingIndex = [
            { path: '/mock/project/existing.ts', content: 'old', embedding: [0.0], lastModified: 500 },
        ];

        const { result } = renderHook(() =>
            useProjectManager({ ...defaultOptions, fileIndex: existingIndex })
        );

        await act(async () => {
            await result.current.addFileToIndex('/mock/project/existing.ts', 'new content');
        });

        expect(mockSetFileIndex).toHaveBeenCalledWith(expect.any(Function));

        // SetFileIndex fonksiyonunu test et
        const updaterFn = mockSetFileIndex.mock.calls[0][0];
        const updatedIndex = updaterFn(existingIndex);
        expect(updatedIndex).toHaveLength(1);
        expect(updatedIndex[0].content).toBe('new content'); // substring(0, 10000)
        expect(updatedIndex[0].embedding).toEqual([0.1, 0.2, 0.3]);
    });

    it('addFileToIndex yeni dosya eklemeli', async () => {
        const { result } = renderHook(() => useProjectManager(defaultOptions));

        await act(async () => {
            await result.current.addFileToIndex('/mock/project/brand-new.ts', 'brand new code');
        });

        const updaterFn = mockSetFileIndex.mock.calls[0][0];
        const updatedIndex = updaterFn([]);
        expect(updatedIndex).toHaveLength(1);
        expect(updatedIndex[0].path).toBe('/mock/project/brand-new.ts');
    });

    it('saveIndexToDisk proje yoksa çağrılmamalı', async () => {
        const { saveProjectIndex } = await import('../../services/db');
        const { result } = renderHook(() => useProjectManager(defaultOptions));

        await act(async () => {
            await result.current.saveIndexToDisk([]);
        });

        // projectPath boş olduğu için saveProjectIndex çağrılmamalı
        expect(saveProjectIndex).not.toHaveBeenCalled();
    });

    it('handleOpenProject dialog açmalı', async () => {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const { result } = renderHook(() => useProjectManager(defaultOptions));

        await act(async () => {
            await result.current.handleOpenProject();
        });

        expect(open).toHaveBeenCalledWith({ directory: true, multiple: false });
    });

    it('loadOrIndexProject cache yoksa scanAndIndexProject ├ğa─ş─▒rmal─▒', async () => {
        const { result } = renderHook(() => useProjectManager(defaultOptions));

        await act(async () => {
            await result.current.loadOrIndexProject('/mock/new/project');
        });

        expect(mockOnMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                content: expect.stringContaining("Proje indekslendi")
            })
        );
    });

    it('proje açma hatasını yönetmeli (Tauri unavailable)', async () => {
        const { open } = await import('@tauri-apps/plugin-dialog');
        (open as any).mockRejectedValueOnce(new Error('window.__TAURI__ is not available'));
        const { result } = renderHook(() => useProjectManager(defaultOptions));

        await act(async () => {
            await result.current.handleOpenProject();
        });

        expect(mockOnNotification).toHaveBeenCalled();
        const call = mockOnNotification.mock.calls[0];
        expect(call[0]).toBe('error');
        expect(call[1]).toEqual(expect.stringContaining('Tauri'));
    });

    it('Rust projesini doğru analiz etmeli', async () => {
        const { incrementalIndexer } = await import('../../services/incrementalIndexer');
        (incrementalIndexer.indexProject as any).mockResolvedValueOnce({
            indexed: [{ path: 'Cargo.toml', content: '[package]\nname = "test"', embedding: [0.1], lastModified: 1000 }],
            stats: { added: 1, modified: 0, removed: 0, unchanged: 0 }
        });

        const { result } = renderHook(() => useProjectManager(defaultOptions));

        await act(async () => {
            await result.current.handleProjectSelect('/mock/rust/project');
        });

        const { sendToAI } = await import('../../services/ai');
        expect(sendToAI).toHaveBeenCalledWith(expect.stringContaining('Rust'));
    });

    it('Python projesini doğru analiz etmeli', async () => {
        const { incrementalIndexer } = await import('../../services/incrementalIndexer');
        (incrementalIndexer.indexProject as any).mockResolvedValueOnce({
            indexed: [{ path: 'requirements.txt', content: 'flask==2.0.0', embedding: [0.1], lastModified: 1000 }],
            stats: { added: 1, modified: 0, removed: 0, unchanged: 0 }
        });

        const { result } = renderHook(() => useProjectManager(defaultOptions));

        await act(async () => {
            await result.current.handleProjectSelect('/mock/python/project');
        });

        const { sendToAI } = await import('../../services/ai');
        expect(sendToAI).toHaveBeenCalledWith(expect.stringContaining('Python'));
    });

    it('boş proje uyarısı vermeli', async () => {
        const { incrementalIndexer } = await import('../../services/incrementalIndexer');
        (incrementalIndexer.indexProject as any).mockResolvedValueOnce({
            indexed: [],
            stats: { added: 0, modified: 0, removed: 0, unchanged: 0 }
        });

        const { result } = renderHook(() => useProjectManager(defaultOptions));

        await act(async () => {
            await result.current.handleProjectSelect('/mock/empty');
        });

        expect(mockOnMessage).toHaveBeenCalledWith(expect.objectContaining({
            content: expect.stringContaining('boş veya dosya bulunamadı')
        }));
    });
});
