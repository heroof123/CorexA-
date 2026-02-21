import { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLayout } from "../contexts/LayoutContext";
import LanguageSelector from "./LanguageSelector";
import { useLanguage } from "../contexts/LanguageContext";

interface Settings {
  editor: {
    fontSize: number;
    fontFamily: string;
    tabSize: number;
    insertSpaces: boolean;
    wordWrap: boolean;
    lineNumbers: boolean;
    minimap: boolean;
    autoSave: boolean;
    autoSaveDelay: number;
  };
  ui: {
    theme: string;
    language: string;
    showWelcomeScreen: boolean;
    compactMode: boolean;
    animations: boolean;
  };
  git: {
    autoFetch: boolean;
    showInlineBlame: boolean;
    confirmSync: boolean;
  };
  ai: {
    defaultModel: string;
    autoSuggestions: boolean;
    contextLines: number;
    maxTokens: number;
  };
  shortcuts: Record<string, string>;
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onShowLayoutPresets?: () => void;
}

export default function SettingsPanel({
  isOpen,
  onClose,
  onShowLayoutPresets,
}: SettingsPanelProps) {
  const { theme, setTheme, availableThemes } = useTheme();
  const { resetLayout } = useLayout();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"editor" | "ui" | "git" | "ai" | "shortcuts">(
    "editor"
  );
  const [settings, setSettings] = useState<Settings>({
    editor: {
      fontSize: 14,
      fontFamily: "Consolas, Monaco, monospace",
      tabSize: 2,
      insertSpaces: true,
      wordWrap: false,
      lineNumbers: true,
      minimap: true,
      autoSave: true,
      autoSaveDelay: 1000,
    },
    ui: {
      theme: "dark",
      language: "tr",
      showWelcomeScreen: true,
      compactMode: false,
      animations: true,
    },
    git: {
      autoFetch: true,
      showInlineBlame: false,
      confirmSync: true,
    },
    ai: {
      defaultModel: "main",
      autoSuggestions: true,
      contextLines: 50,
      maxTokens: 2000,
    },
    shortcuts: {
      save: "Ctrl+S",
      open: "Ctrl+O",
      find: "Ctrl+F",
      replace: "Ctrl+H",
      commandPalette: "Ctrl+Shift+P",
      quickOpen: "Ctrl+P",
      toggleSidebar: "Ctrl+B",
      toggleTerminal: "Ctrl+`",
      newFile: "Ctrl+N",
      closeFile: "Ctrl+W",
    },
  });

  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const [tempShortcut, setTempShortcut] = useState("");

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("corex-settings");
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved);
        setSettings(prev => ({ ...prev, ...parsedSettings }));
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    }
  }, []);

  // ESC tuşu ile kapatma
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Save settings to localStorage
  const saveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    localStorage.setItem("corex-settings", JSON.stringify(newSettings));
  };

  const updateSetting = (category: keyof Settings, key: string, value: any) => {
    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value,
      },
    };
    saveSettings(newSettings);
  };

  const resetToDefaults = () => {
    if (confirm("Tüm ayarları varsayılan değerlere sıfırlamak istediğinizden emin misiniz?")) {
      localStorage.removeItem("corex-settings");
      localStorage.removeItem("corex-theme");
      localStorage.removeItem("corex-layout");

      // Reset to default settings
      const defaultSettings: Settings = {
        editor: {
          fontSize: 14,
          fontFamily: "Consolas, Monaco, monospace",
          tabSize: 2,
          insertSpaces: true,
          wordWrap: false,
          lineNumbers: true,
          minimap: true,
          autoSave: true,
          autoSaveDelay: 1000,
        },
        ui: {
          theme: "dark",
          language: "tr",
          showWelcomeScreen: true,
          compactMode: false,
          animations: true,
        },
        git: {
          autoFetch: true,
          showInlineBlame: false,
          confirmSync: true,
        },
        ai: {
          defaultModel: "main",
          autoSuggestions: true,
          contextLines: 50,
          maxTokens: 2000,
        },
        shortcuts: {
          save: "Ctrl+S",
          open: "Ctrl+O",
          find: "Ctrl+F",
          replace: "Ctrl+H",
          commandPalette: "Ctrl+Shift+P",
          quickOpen: "Ctrl+P",
          toggleSidebar: "Ctrl+B",
          toggleTerminal: "Ctrl+`",
          newFile: "Ctrl+N",
          closeFile: "Ctrl+W",
        },
      };

      setSettings(defaultSettings);
      setTheme("dark");
      resetLayout();

      alert("Ayarlar sıfırlandı!");
    }
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "corex-settings.json";
    link.click();

    URL.revokeObjectURL(url);
  };

  const importSettings = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = e => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          saveSettings(imported);
          alert("Ayarlar içe aktarıldı!");
        } catch (error) {
          alert("Geçersiz ayar dosyası!");
        }
      };
      reader.readAsText(file);
    };

    input.click();
  };

  const handleShortcutEdit = (action: string) => {
    setEditingShortcut(action);
    setTempShortcut(settings.shortcuts[action] || "");
  };

  const saveShortcut = () => {
    if (editingShortcut && tempShortcut) {
      updateSetting("shortcuts", editingShortcut, tempShortcut);
      setEditingShortcut(null);
      setTempShortcut("");
    }
  };

  const cancelShortcutEdit = () => {
    setEditingShortcut(null);
    setTempShortcut("");
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
        <div className="glass-panel w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-3xl animate-fade-in shadow-[0_0_100px_rgba(0,0,0,0.6)] border border-white/10 flex flex-col pointer-events-auto">
          {/* Header */}
          <div className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-[var(--color-surface)]">
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <span className="text-xl">⚙️</span>
                <h2 className="text-xl font-black text-white uppercase tracking-wider">
                  {t("settings.title")}
                </h2>
              </div>
              <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-white/60 mt-1">
                {t("settings.systemConfig")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportSettings}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-[var(--color-surface)] text-white/60 rounded-xl hover:bg-white/10 hover:text-white transition-all border-[var(--color-border)]"
              >
                {t("settings.export")}
              </button>
              <button
                onClick={importSettings}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-[var(--color-surface)] text-white/60 rounded-xl hover:bg-white/10 hover:text-white transition-all border-[var(--color-border)]"
              >
                {t("settings.import")}
              </button>
              <button
                onClick={resetToDefaults}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-all border border-red-500/20 ml-4"
              >
                {t("settings.reset")}
              </button>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all ml-4 text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className="w-56 border-r border-white/5 p-4 space-y-2 bg-black/20">
              {[
                { id: "editor", label: t("settings.editor"), icon: "📝" },
                { id: "ui", label: t("settings.ui"), icon: "🎨" },
                { id: "git", label: t("settings.git"), icon: "📊" },
                { id: "ai", label: t("settings.ai"), icon: "🤖" },
                { id: "shortcuts", label: t("settings.shortcuts"), icon: "⌨️" },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between group ${
                    activeTab === tab.id
                      ? "bg-blue-500/10 text-white border border-blue-500/30 neon-glow-blue"
                      : "text-white/70 hover:text-white hover:bg-[var(--color-surface)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm transition-transform duration-300 ${activeTab === tab.id ? "scale-110" : "group-hover:scale-110"}`}
                    >
                      {tab.icon}
                    </span>
                    <span className="tracking-tight">{tab.label}</span>
                  </div>
                  {activeTab === tab.id && (
                    <div className="w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_5px_var(--neon-blue)]" />
                  )}
                </button>
              ))}
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/10">
              <div className="p-10 max-w-3xl">
                {activeTab === "editor" && (
                  <div className="space-y-10 animate-fade-in">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/60 mb-8">
                        {t("settings.editorConfig")}
                      </h3>
                      <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                        <div>
                          <label className="block text-[11px] font-bold text-white/70 uppercase tracking-widest mb-3 px-1">
                            {t("settings.fontSize")}
                          </label>
                          <input
                            type="number"
                            min="8"
                            max="24"
                            value={settings.editor.fontSize}
                            onChange={e =>
                              updateSetting("editor", "fontSize", Number(e.target.value))
                            }
                            className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-white font-mono focus:border-[var(--neon-blue)] focus:neon-glow-blue transition-all outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-white/70 uppercase tracking-widest mb-3 px-1">
                            {t("settings.fontFamily")}
                          </label>
                          <select
                            value={settings.editor.fontFamily}
                            onChange={e => updateSetting("editor", "fontFamily", e.target.value)}
                            className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-white font-mono focus:border-[var(--neon-blue)] transition-all outline-none"
                          >
                            <option value="Consolas, Monaco, monospace">Consolas</option>
                            <option value="'Fira Code', monospace">Fira Code</option>
                            <option value="'Source Code Pro', monospace">Source Code Pro</option>
                            <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-white/70 uppercase tracking-widest mb-3 px-1">
                            {t("settings.tabSize")}
                          </label>
                          <select
                            value={settings.editor.tabSize}
                            onChange={e =>
                              updateSetting("editor", "tabSize", Number(e.target.value))
                            }
                            className="w-full px-4 py-3 bg-[var(--color-surface)] border-[var(--color-border)] rounded-xl text-white focus:border-[var(--neon-blue)] transition-all outline-none"
                          >
                            <option value={2}>2 Spaces</option>
                            <option value={4}>4 Spaces</option>
                            <option value={8}>8 Spaces</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-white/70 uppercase tracking-widest mb-3 px-1">
                            {t("settings.autoSaveDelay")}
                          </label>
                          <input
                            type="number"
                            min="500"
                            max="5000"
                            step="100"
                            value={settings.editor.autoSaveDelay}
                            onChange={e =>
                              updateSetting("editor", "autoSaveDelay", Number(e.target.value))
                            }
                            className="w-full px-4 py-3 bg-[var(--color-surface)] border-[var(--color-border)] rounded-xl text-white font-mono focus:border-[var(--neon-blue)] transition-all outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4">
                      {[
                        { key: "insertSpaces", label: t("settings.insertSpaces") },
                        { key: "wordWrap", label: t("settings.wordWrap") },
                        { key: "lineNumbers", label: t("settings.lineNumbers") },
                        { key: "minimap", label: t("settings.minimap") },
                        { key: "autoSave", label: t("settings.autoSave") },
                      ].map(option => (
                        <label
                          key={option.key}
                          className="flex items-center justify-between px-5 py-4 bg-[var(--color-surface)] border-[var(--color-border)] rounded-2xl cursor-pointer hover:bg-white/10 transition-all group"
                        >
                          <span className="text-xs font-bold text-white/70 group-hover:text-white transition-colors tracking-tight">
                            {option.label}
                          </span>
                          <input
                            type="checkbox"
                            checked={
                              settings.editor[option.key as keyof typeof settings.editor] as boolean
                            }
                            onChange={e => updateSetting("editor", option.key, e.target.checked)}
                            className="w-5 h-5 rounded-lg border-white/10 bg-black/40 text-blue-500 focus:ring-blue-500/20"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "ui" && (
                  <div className="space-y-10 animate-fade-in">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/60 mb-8">
                        {t("settings.appearance")}
                      </h3>
                      <div className="grid grid-cols-1 gap-8">
                        <div>
                          <label className="block text-[11px] font-bold text-white/70 uppercase tracking-widest mb-3 px-1">
                            {t("settings.theme")}
                          </label>
                          <select
                            value={theme}
                            onChange={e => {
                              setTheme(e.target.value as any);
                              updateSetting("ui", "theme", e.target.value);
                            }}
                            className="w-full px-4 py-3 bg-[var(--color-surface)] border-[var(--color-border)] rounded-xl text-white font-bold tracking-tight focus:border-[var(--neon-blue)] focus:neon-glow-blue transition-all outline-none"
                          >
                            {availableThemes.map(themeName => (
                              <option key={themeName} value={themeName}>
                                {themeName.charAt(0).toUpperCase() + themeName.slice(1)} Mode
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-white/70 uppercase tracking-widest mb-3 px-1">
                            {t("settings.language")}
                          </label>
                          <LanguageSelector compact={true} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {[
                        {
                          key: "showWelcomeScreen",
                          label: t("settings.welcomeScreen"),
                        },
                        { key: "compactMode", label: t("settings.compactMode") },
                        { key: "animations", label: t("settings.animations") },
                      ].map(option => (
                        <label
                          key={option.key}
                          className="flex items-center justify-between px-5 py-4 bg-[var(--color-surface)] border-[var(--color-border)] rounded-2xl cursor-pointer hover:bg-white/10 transition-all group"
                        >
                          <span className="text-xs font-bold text-white/70 group-hover:text-white transition-colors tracking-tight">
                            {option.label}
                          </span>
                          <input
                            type="checkbox"
                            checked={settings.ui[option.key as keyof typeof settings.ui] as boolean}
                            onChange={e => updateSetting("ui", option.key, e.target.checked)}
                            className="w-5 h-5 rounded-lg border-white/10 bg-black/40 text-blue-500 focus:ring-blue-500/20"
                          />
                        </label>
                      ))}
                    </div>

                    <div className="border-t border-white/5 pt-10">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 mb-6">
                        {t("settings.workspaceMemory")}
                      </h4>
                      <div className="flex gap-4">
                        <button
                          onClick={() => {
                            onClose();
                            onShowLayoutPresets?.();
                          }}
                          className="flex-1 px-4 py-4 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-2xl hover:bg-blue-500/20 transition-all text-xs font-bold tracking-tight"
                        >
                          {t("settings.layoutOrchestrator")}
                        </button>
                        <button
                          onClick={resetLayout}
                          className="flex-1 px-4 py-4 bg-[var(--color-surface)] text-white/60 border border-white/10 rounded-2xl hover:bg-white/10 hover:text-white transition-all text-xs font-bold tracking-tight"
                        >
                          {t("settings.resetLayout")}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "ai" && (
                  <div className="space-y-10 animate-fade-in">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/60 mb-8">
                        {t("settings.aiCore")}
                      </h3>
                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <label className="block text-[11px] font-bold text-white/70 uppercase tracking-widest mb-3 px-1">
                            {t("settings.defaultModel")}
                          </label>
                          <select
                            value={settings.ai.defaultModel}
                            onChange={e => updateSetting("ai", "defaultModel", e.target.value)}
                            className="w-full px-4 py-3 bg-[var(--color-surface)] border-[var(--color-border)] rounded-xl text-white font-bold tracking-tight focus:border-[var(--neon-blue)] transition-all outline-none"
                          >
                            <option value="main">Core Infinity (Llama 3.1)</option>
                            <option value="fast">Veloce (Flash 2.0)</option>
                            <option value="planner">Strategist (Deepthink)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-white/70 uppercase tracking-widest mb-3 px-1">
                            {t("settings.contextDepth")}
                          </label>
                          <input
                            type="number"
                            min="10"
                            max="200"
                            value={settings.ai.contextLines}
                            onChange={e =>
                              updateSetting("ai", "contextLines", Number(e.target.value))
                            }
                            className="w-full px-4 py-3 bg-[var(--color-surface)] border-[var(--color-border)] rounded-xl text-white font-mono focus:border-[var(--neon-blue)] transition-all outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="flex items-center justify-between px-5 py-4 bg-[var(--color-surface)] border-[var(--color-border)] rounded-2xl cursor-pointer hover:bg-white/10 transition-all group">
                        <span className="text-xs font-bold text-white/70 group-hover:text-white transition-colors tracking-tight">
                          {t("settings.autoSuggestions")}
                        </span>
                        <input
                          type="checkbox"
                          checked={settings.ai.autoSuggestions}
                          onChange={e => updateSetting("ai", "autoSuggestions", e.target.checked)}
                          className="w-5 h-5 rounded-lg border-white/10 bg-black/40 text-blue-500 focus:ring-blue-500/20"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {activeTab === "shortcuts" && (
                  <div className="space-y-10 animate-fade-in">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/60 mb-8">
                        {t("settings.neuralShortcuts")}
                      </h3>
                      <div className="space-y-3">
                        {Object.entries(settings.shortcuts).map(([action, shortcut]) => (
                          <div
                            key={action}
                            className="flex items-center justify-between px-5 py-4 bg-[var(--color-surface)] border-[var(--color-border)] rounded-2xl group hover:border-white/20 transition-all"
                          >
                            <span className="text-xs font-bold text-white/70 tracking-tight capitalize">
                              {action.replace(/([A-Z])/g, " $1").trim()}
                            </span>

                            {editingShortcut === action ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={tempShortcut}
                                  onChange={e => setTempShortcut(e.target.value)}
                                  className="px-4 py-1.5 bg-black/40 border border-blue-500/50 rounded-xl text-xs font-mono text-white outline-none neon-glow-blue"
                                  placeholder="Ctrl+S"
                                  autoFocus
                                />
                                <button
                                  onClick={saveShortcut}
                                  className="w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded-xl shadow-lg hover:brightness-110 transition-all text-xs"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={cancelShortcutEdit}
                                  className="w-8 h-8 flex items-center justify-center bg-[var(--color-surface)] text-white/70 rounded-xl hover:bg-white/10 transition-all text-xs"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-4">
                                <kbd className="px-3 py-1 bg-black/40 border border-white/10 rounded-lg text-[11px] font-black font-mono text-white/80 group-hover:text-[var(--neon-blue)] group-hover:border-[var(--neon-blue)]/30 transition-all shadow-inner">
                                  {shortcut}
                                </kbd>
                                <button
                                  onClick={() => handleShortcutEdit(action)}
                                  className="text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-[var(--neon-blue)] transition-colors"
                                >
                                  Düzenle
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
