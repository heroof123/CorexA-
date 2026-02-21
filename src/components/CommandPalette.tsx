import { useState, useEffect, useRef } from "react";

interface Command {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
}

export default function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter commands based on query
  const filteredCommands = commands.filter(cmd =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.description.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(prev =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onClose();
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 z-50 animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-2xl glass-panel rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="p-6 border-b border-white/5 bg-white/5">
          <div className="relative group">
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-[var(--neon-blue)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Komutları arayın... (örn. kaydet, terminal)"
              className="w-full pl-12 pr-6 py-4 bg-black/30 border border-white/5 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--neon-blue)] focus:neon-glow-blue transition-all text-sm font-medium"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Commands List */}
        <div className="max-h-[28rem] overflow-y-auto custom-scrollbar bg-black/20">
          {filteredCommands.length === 0 ? (
            <div className="p-12 text-center text-neutral-500">
              <div className="text-4xl mb-4 opacity-20">🔍</div>
              <p className="text-sm font-medium">No commands found for "{query}"</p>
              <p className="text-xs text-neutral-600 mt-2">Try different keywords or check spelling</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredCommands.map((command, index) => (
                <button
                  key={command.id}
                  onClick={() => {
                    command.action();
                    onClose();
                  }}
                  className={`w-full text-left px-4 py-3.5 rounded-xl transition-all duration-200 border border-transparent ${index === selectedIndex
                    ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/20'
                    : 'hover:bg-white/5'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`text-xl transition-transform duration-300 ${index === selectedIndex ? 'scale-110' : ''}`}>
                      {command.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className={`text-sm font-bold truncate transition-colors ${index === selectedIndex ? 'text-white' : 'text-neutral-300'}`}>
                          {command.title}
                        </h3>
                        {command.shortcut && (
                          <span className="text-[10px] font-black tracking-widest text-white/30 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                            {command.shortcut}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-[11px] text-neutral-500 truncate flex-1 leading-none">
                          {command.description}
                        </p>
                        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600 bg-white/5 px-1.5 py-0.5 rounded leading-none shrink-0">
                          {command.category}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-white/5">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-neutral-600">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 select-none"><span className="text-neutral-400">↑↓</span> Navigate</div>
              <div className="flex items-center gap-2 select-none"><span className="text-neutral-400">Enter</span> Select</div>
              <div className="flex items-center gap-2 select-none"><span className="text-neutral-400">Esc</span> Close</div>
            </div>
            <span className="text-[var(--neon-blue)] opacity-50">{filteredCommands.length} commands</span>
          </div>
        </div>
      </div>
    </div>
  );
}