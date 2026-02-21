import { useState, useEffect } from "react";
import { ProactiveSuggestion, ProactiveAssistant } from "../services/proactiveAssistant";
import { FileIndex } from "../types/index";

interface ProactiveSuggestionsProps {
  fileIndex: FileIndex[];
  currentFile?: string;
  onSuggestionClick: (action: string) => void;
}

export default function ProactiveSuggestions({
  fileIndex,
  currentFile,
  onSuggestionClick,
}: ProactiveSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [userDismissed, setUserDismissed] = useState(false);
  const [assistant] = useState(new ProactiveAssistant());
  const [autoHideTimer, setAutoHideTimer] = useState<NodeJS.Timeout | null>(null);

  // Auto-hide after 10 seconds of no interaction
  useEffect(() => {
    if (isVisible && suggestions.length > 0) {
      // Clear existing timer
      if (autoHideTimer) {
        clearTimeout(autoHideTimer);
      }

      // Set new timer
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 10000); // 10 seconds

      setAutoHideTimer(timer);

      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [isVisible, suggestions.length]);

  // Reset timer on user interaction
  const resetAutoHideTimer = () => {
    if (autoHideTimer) {
      clearTimeout(autoHideTimer);
    }

    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 10000);

    setAutoHideTimer(timer);
  };

  useEffect(() => {
    const analyzeActiveFile = async () => {
      if (!currentFile || userDismissed) return;

      const file = fileIndex.find(f => f.path === currentFile);
      if (!file) return;

      const newSuggestions = await assistant.analyzeActiveFile(currentFile, file.content);
      if (newSuggestions.length > 0) {
        setSuggestions(newSuggestions);
        setIsVisible(true);
      }
    };

    const analyzeProject = async () => {
      if (fileIndex.length === 0 || userDismissed) return;

      const newSuggestions = await assistant.analyzeProject(fileIndex, currentFile);
      if (newSuggestions.length > 0) {
        setSuggestions(prev => {
          const ids = new Set(prev.map(s => s.id));
          const combined = [...prev];
          newSuggestions.forEach(s => {
            if (!ids.has(s.id)) combined.push(s);
          });
          return combined;
        });
        setIsVisible(true);
      }
    };

    // Aktif dosya değiştiğinde anında analiz
    analyzeActiveFile();

    // Periyodik geniş tarama
    const interval = setInterval(analyzeProject, 60000);

    return () => clearInterval(interval);
  }, [fileIndex, currentFile, assistant, userDismissed]);

  // Kullanıcı kapatırsa, 10 dakika boyunca gösterme
  const handleDismiss = () => {
    setIsVisible(false);
    setUserDismissed(true);

    // 10 dakika sonra tekrar gösterebilir
    setTimeout(() => {
      setUserDismissed(false);
    }, 600000); // 10 dakika
  };

  if (!isVisible || suggestions.length === 0 || userDismissed) return null;

  return (
    <div className="border-b border-white/5 bg-[var(--color-background)] overflow-hidden animate-slide-down">
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Ghost Reviewer</span>
            <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-300 text-[10px] rounded font-bold">
              {suggestions.length} Öneri
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/20 hover:text-white transition-all text-sm"
            title="Gizle"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {suggestions.slice(0, 3).map(suggestion => (
            <div
              key={suggestion.id}
              className={`p-2.5 rounded-lg border transition-all duration-300 group ${suggestion.priority === "high"
                  ? "bg-red-500/5 border-red-500/20 hover:border-red-500/40"
                  : "bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40"
                }`}
              onMouseEnter={resetAutoHideTimer}
              onMouseLeave={resetAutoHideTimer}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-lg flex-shrink-0 group-hover:scale-110 transition-transform">
                  {suggestion.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="text-[11px] font-bold text-neutral-200 truncate">{suggestion.title}</h4>
                    <span className={`text-[9px] font-bold uppercase ${suggestion.priority === 'high' ? 'text-red-400' : 'text-blue-400'
                      }`}>
                      {suggestion.priority}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-500 leading-relaxed mb-2 line-clamp-2">{suggestion.description}</p>
                  {suggestion.action && (
                    <button
                      onClick={() => onSuggestionClick(suggestion.action!)}
                      className="text-[10px] font-bold px-2 py-1 bg-white/5 hover:bg-white/10 text-white rounded transition-all flex items-center gap-1.5 border border-white/5"
                    >
                      <span>⚡</span> {suggestion.action}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
