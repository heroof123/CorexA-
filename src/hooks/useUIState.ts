// hooks/useUIState.ts
// Tüm panel, modal ve overlay görünürlük state'lerini yönetir

import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useUIState() {
    // Activity bar
    const [activeView, setActiveView] = useState("explorer");
    const [showActivitySidebar, setShowActivitySidebar] = useState(true);

    // Overlay panels
    const [showTerminal, setShowTerminal] = useState(false);
    const [showBrowserPanel, setShowBrowserPanel] = useState(false);

    // Modal / floating panels
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [showQuickFileOpen, setShowQuickFileOpen] = useState(false);
    const [showFindInFiles, setShowFindInFiles] = useState(false);
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
    const [showLayoutPresets, setShowLayoutPresets] = useState(false);
    const [showSplitView, setSplitView] = useState(false);
    const [showGitPanel, setShowGitPanel] = useState(false);
    const [showSettingsPanel, setShowSettingsPanel] = useState(false);
    const [showAISettings, setShowAISettings] = useState(false);
    const [showCustomizeLayout, setShowCustomizeLayout] = useState(false);
    const [showDeveloperTools, setShowDeveloperTools] = useState(false);
    const [showCodeSnippets, setShowCodeSnippets] = useState(false);
    const [showCodeAnalysis, setShowCodeAnalysis] = useState(false);
    const [showAdvancedTheming, setShowAdvancedTheming] = useState(false);
    const [showRemoteDevelopment, setShowRemoteDevelopment] = useState(false);
    const [showEnhancedAI, setShowEnhancedAI] = useState(false);
    const [showCodeReview, setShowCodeReview] = useState(false);
    const [showSymbolSearch, setShowSymbolSearch] = useState(false);
    const [showModelComparison, setShowModelComparison] = useState(false);
    const [comparisonMode, setComparisonMode] = useState(false);


    // Split view dosyaları
    const [splitFiles, setSplitFiles] = useState<{
        left: { path: string; content: string };
        right: { path: string; content: string };
    } | null>(null);

    // AI Settings event listener (WelcomeScreen'den tetiklenir)
    useEffect(() => {
        const handleOpenAISettings = () => setShowAISettings(true);
        window.addEventListener("open-ai-settings", handleOpenAISettings);
        return () => window.removeEventListener("open-ai-settings", handleOpenAISettings);
    }, []);

    // Window control handlers
    const handleMinimize = useCallback(async () => {
        try { await invoke("minimize_window"); } catch (e) { console.error("Minimize error:", e); }
    }, []);

    const handleMaximize = useCallback(async () => {
        try { await invoke("maximize_window"); } catch (e) { console.error("Maximize error:", e); }
    }, []);

    const handleClose = useCallback(async () => {
        try { await invoke("close_window"); } catch (e) { console.error("Close error:", e); }
    }, []);

    const openSplitView = useCallback((path: string, content: string) => {
        setSplitFiles({ left: { path, content }, right: { path, content } });
        setSplitView(true);
    }, []);

    const closeSplitView = useCallback(() => {
        setSplitView(false);
        setSplitFiles(null);
    }, []);

    return {
        // Activity bar
        activeView,
        setActiveView,
        showActivitySidebar,
        setShowActivitySidebar,

        // Overlay panels
        showTerminal,
        setShowTerminal,
        showBrowserPanel,
        setShowBrowserPanel,

        // Modals / floating panels
        showCommandPalette,
        setShowCommandPalette,
        showQuickFileOpen,
        setShowQuickFileOpen,
        showFindInFiles,
        setShowFindInFiles,
        showAdvancedSearch,
        setShowAdvancedSearch,
        showLayoutPresets,
        setShowLayoutPresets,
        showSplitView,
        setSplitView,
        showGitPanel,
        setShowGitPanel,
        showSettingsPanel,
        setShowSettingsPanel,
        showAISettings,
        setShowAISettings,
        showCustomizeLayout,
        setShowCustomizeLayout,
        showDeveloperTools,
        setShowDeveloperTools,
        showCodeSnippets,
        setShowCodeSnippets,
        showCodeAnalysis,
        setShowCodeAnalysis,
        showAdvancedTheming,
        setShowAdvancedTheming,
        showRemoteDevelopment,
        setShowRemoteDevelopment,
        showEnhancedAI,
        setShowEnhancedAI,
        showCodeReview,
        setShowCodeReview,
        showSymbolSearch,
        setShowSymbolSearch,
        showModelComparison,
        setShowModelComparison,
        comparisonMode,
        setComparisonMode,


        // Split view
        splitFiles,
        setSplitFiles,
        openSplitView,
        closeSplitView,

        // Window controls
        handleMinimize,
        handleMaximize,
        handleClose,
    };
}
