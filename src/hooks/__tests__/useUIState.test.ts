// src/hooks/__tests__/useUIState.test.ts
// useUIState hook testleri

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUIState } from '../useUIState';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn().mockResolvedValue(undefined),
}));

describe('useUIState', () => {
    it('should initialize with default values', () => {
        const { result } = renderHook(() => useUIState());

        expect(result.current.activeView).toBe('explorer');
        expect(result.current.showActivitySidebar).toBe(true);
        expect(result.current.showTerminal).toBe(false);
        expect(result.current.showBrowserPanel).toBe(false);
        expect(result.current.showCommandPalette).toBe(false);
        expect(result.current.showQuickFileOpen).toBe(false);
        expect(result.current.showFindInFiles).toBe(false);
        expect(result.current.showAdvancedSearch).toBe(false);
        expect(result.current.showGitPanel).toBe(false);
        expect(result.current.showSettingsPanel).toBe(false);
        expect(result.current.showAISettings).toBe(false);
        expect(result.current.showCodeSnippets).toBe(false);
        expect(result.current.showCodeAnalysis).toBe(false);
        expect(result.current.showEnhancedAI).toBe(false);
        expect(result.current.showCodeReview).toBe(false);
        expect(result.current.showSymbolSearch).toBe(false);
        expect(result.current.showSplitView).toBe(false);
        expect(result.current.splitFiles).toBeNull();
    });

    it('should toggle terminal visibility', () => {
        const { result } = renderHook(() => useUIState());

        act(() => { result.current.setShowTerminal(true); });
        expect(result.current.showTerminal).toBe(true);

        act(() => { result.current.setShowTerminal(false); });
        expect(result.current.showTerminal).toBe(false);
    });

    it('should change active view', () => {
        const { result } = renderHook(() => useUIState());

        act(() => { result.current.setActiveView('search'); });
        expect(result.current.activeView).toBe('search');

        act(() => { result.current.setActiveView('source-control'); });
        expect(result.current.activeView).toBe('source-control');
    });

    it('should toggle all modal panels independently', () => {
        const { result } = renderHook(() => useUIState());

        const panels = [
            ['showCommandPalette', 'setShowCommandPalette'],
            ['showQuickFileOpen', 'setShowQuickFileOpen'],
            ['showFindInFiles', 'setShowFindInFiles'],
            ['showAdvancedSearch', 'setShowAdvancedSearch'],
            ['showGitPanel', 'setShowGitPanel'],
            ['showSettingsPanel', 'setShowSettingsPanel'],
            ['showAISettings', 'setShowAISettings'],
            ['showCodeSnippets', 'setShowCodeSnippets'],
            ['showCodeAnalysis', 'setShowCodeAnalysis'],
            ['showEnhancedAI', 'setShowEnhancedAI'],
            ['showCodeReview', 'setShowCodeReview'],
            ['showSymbolSearch', 'setShowSymbolSearch'],
            ['showDeveloperTools', 'setShowDeveloperTools'],
            ['showAdvancedTheming', 'setShowAdvancedTheming'],
            ['showRemoteDevelopment', 'setShowRemoteDevelopment'],
            ['showCustomizeLayout', 'setShowCustomizeLayout'],
            ['showLayoutPresets', 'setShowLayoutPresets'],
        ] as const;

        for (const [showKey, setKey] of panels) {
            act(() => { (result.current as any)[setKey](true); });
            expect((result.current as any)[showKey]).toBe(true);

            act(() => { (result.current as any)[setKey](false); });
            expect((result.current as any)[showKey]).toBe(false);
        }
    });

    it('should open and close split view', () => {
        const { result } = renderHook(() => useUIState());

        act(() => {
            result.current.openSplitView('/path/to/file.ts', 'const x = 1;');
        });

        expect(result.current.showSplitView).toBe(true);
        expect(result.current.splitFiles).toEqual({
            left: { path: '/path/to/file.ts', content: 'const x = 1;' },
            right: { path: '/path/to/file.ts', content: 'const x = 1;' },
        });

        act(() => { result.current.closeSplitView(); });
        expect(result.current.showSplitView).toBe(false);
        expect(result.current.splitFiles).toBeNull();
    });

    it('should toggle activity sidebar', () => {
        const { result } = renderHook(() => useUIState());
        expect(result.current.showActivitySidebar).toBe(true);

        act(() => { result.current.setShowActivitySidebar(false); });
        expect(result.current.showActivitySidebar).toBe(false);

        act(() => { result.current.setShowActivitySidebar(true); });
        expect(result.current.showActivitySidebar).toBe(true);
    });

    it('should toggle browser panel', () => {
        const { result } = renderHook(() => useUIState());

        act(() => { result.current.setShowBrowserPanel(true); });
        expect(result.current.showBrowserPanel).toBe(true);
    });

    it('should provide window control handlers', () => {
        const { result } = renderHook(() => useUIState());

        expect(typeof result.current.handleMinimize).toBe('function');
        expect(typeof result.current.handleMaximize).toBe('function');
        expect(typeof result.current.handleClose).toBe('function');
    });

    it('should call invoke for window controls', async () => {
        const { invoke } = await import('@tauri-apps/api/core');
        const { result } = renderHook(() => useUIState());

        await act(async () => { await result.current.handleMinimize(); });
        expect(invoke).toHaveBeenCalledWith('minimize_window');

        await act(async () => { await result.current.handleMaximize(); });
        expect(invoke).toHaveBeenCalledWith('maximize_window');

        await act(async () => { await result.current.handleClose(); });
        expect(invoke).toHaveBeenCalledWith('close_window');
    });

    it('should update split files content independently', () => {
        const { result } = renderHook(() => useUIState());

        act(() => {
            result.current.openSplitView('/test.ts', 'original');
        });

        act(() => {
            result.current.setSplitFiles(prev =>
                prev ? { ...prev, left: { ...prev.left, content: 'modified left' } } : null
            );
        });

        expect(result.current.splitFiles?.left.content).toBe('modified left');
        expect(result.current.splitFiles?.right.content).toBe('original');
    });
});
