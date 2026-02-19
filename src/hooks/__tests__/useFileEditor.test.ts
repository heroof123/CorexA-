// src/hooks/__tests__/useFileEditor.test.ts
// useFileEditor hook testleri
//
// NOT: Tauri invoke setup.ts'teki global mock tarafından yönetiliyor.
// read_file → 'function test() { return 42; }' döndürür.
// Bu dosyada Tauri invoke mock'u tekrar yapılmaz.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileEditor } from '../useFileEditor';

// Sadece hook'un bağımlı olduğu servisleri mockla
vi.mock('../../services/embedding', () => ({
    createEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
}));

vi.mock('../../services/db', () => ({
    saveProjectIndex: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/smartContextBuilder', () => ({
    smartContextBuilder: {
        trackFileOpen: vi.fn(),
        trackFileClose: vi.fn(),
        trackFileEdit: vi.fn(),
    },
}));

const createOptions = () => ({
    projectPath: '/mock/project',
    fileIndex: [
        { path: '/mock/project/test.ts', content: 'const x = 1;', embedding: [0.1], lastModified: 1000 },
    ],
    setFileIndex: vi.fn(),
    onMessage: vi.fn(),
    onNotification: vi.fn(),
});

describe('useFileEditor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('başlangıçta boş state döndürmeli', () => {
        const opts = createOptions();
        const { result } = renderHook(() => useFileEditor(opts));

        expect(result.current.selectedFile).toBe('');
        expect(result.current.fileContent).toBe('');
        expect(result.current.hasUnsavedChanges).toBe(false);
        expect(result.current.openTabs).toEqual([]);
        expect(result.current.cursorPosition).toEqual({ line: 1, column: 1 });
    });

    it('dosya açabilmeli (setup.ts mock ile)', async () => {
        // setup.ts'teki invoke mock: read_file → 'function test() { return 42; }'
        const opts = createOptions();
        const { result } = renderHook(() => useFileEditor(opts));

        await act(async () => {
            await result.current.openFile('/mock/project/test.ts');
        });

        expect(result.current.selectedFile).toBe('/mock/project/test.ts');
        expect(result.current.fileContent).toBe('function test() { return 42; }');
        expect(result.current.hasUnsavedChanges).toBe(false);
        expect(result.current.openTabs).toHaveLength(1);
    });

    it('editör değişikliklerini izlemeli', async () => {
        const opts = createOptions();
        const { result } = renderHook(() => useFileEditor(opts));

        await act(async () => {
            await result.current.openFile('/mock/project/test.ts');
        });

        act(() => {
            result.current.handleEditorChange('const modified = true;');
        });

        expect(result.current.fileContent).toBe('const modified = true;');
        expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('dosya kaydetmeli', async () => {
        const opts = createOptions();
        const { result } = renderHook(() => useFileEditor(opts));

        await act(async () => {
            await result.current.openFile('/mock/project/test.ts');
        });

        act(() => {
            result.current.handleEditorChange('const saved = true;');
        });

        await act(async () => {
            await result.current.saveFile();
        });

        expect(result.current.hasUnsavedChanges).toBe(false);
        expect(opts.onMessage).toHaveBeenCalled();
    });

    it('tab kapatınca komşu taba geçmeli', async () => {
        const opts = createOptions();
        const { result } = renderHook(() => useFileEditor(opts));

        // İki dosya aç (setup mock her iki read_file'a da aynı content döner)
        await act(async () => {
            await result.current.openFile('/mock/project/a.ts');
        });
        expect(result.current.openTabs).toHaveLength(1);

        await act(async () => {
            await result.current.openFile('/mock/project/b.ts');
        });
        expect(result.current.openTabs).toHaveLength(2);

        act(() => {
            result.current.closeTab('/mock/project/b.ts');
        });

        expect(result.current.openTabs).toHaveLength(1);
        expect(result.current.selectedFile).toBe('/mock/project/a.ts');
    });

    it('son tab kapatılınca seçim temizlenmeli', async () => {
        const opts = createOptions();
        const { result } = renderHook(() => useFileEditor(opts));

        await act(async () => {
            await result.current.openFile('/mock/project/only.ts');
        });
        expect(result.current.openTabs).toHaveLength(1);

        act(() => {
            result.current.closeTab('/mock/project/only.ts');
        });

        expect(result.current.openTabs).toHaveLength(0);
        expect(result.current.selectedFile).toBe('');
    });

    it('cursor pozisyonu güncellenebilmeli', () => {
        const opts = createOptions();
        const { result } = renderHook(() => useFileEditor(opts));

        act(() => {
            result.current.setCursorPosition({ line: 10, column: 5 });
        });

        expect(result.current.cursorPosition).toEqual({ line: 10, column: 5 });
    });

    it('dosya seçili değilken kaydetmemeli', async () => {
        const opts = createOptions();
        const { result } = renderHook(() => useFileEditor(opts));

        await act(async () => {
            await result.current.saveFile();
        });

        // selectedFile boş olduğu için saveFile erken dönmeli
        expect(opts.onMessage).not.toHaveBeenCalled();
    });
});
