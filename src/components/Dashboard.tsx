import CorexLogo from "./CorexLogo";

// Dashboard component - Shows when no file is selected
export default function Dashboard() {
  const shortcuts = [
    { label: "New Agent", keys: ["Ctrl", "Shift", "L"] },
    { label: "Show Terminal", keys: ["Ctrl", "J"] },
    { label: "Hide Files", keys: ["Ctrl", "B"] },
    { label: "Search Files", keys: ["Ctrl", "P"] },
    { label: "Open Browser", keys: ["Ctrl", "Shift", "B"] },
    { label: "Maximize Chat", keys: ["Ctrl", "Alt", "E"] },
  ];

  return (
    <div className="w-full h-full flex items-center justify-center bg-transparent relative overflow-hidden">
      {/* Infinite Background */}
      <div className="absolute inset-0 bg-[var(--color-background)]">
        {/* Animated Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(var(--neon-blue) 1px, transparent 1px),
              linear-gradient(90deg, var(--neon-blue) 1px, transparent 1px)
            `,
            backgroundSize: "80px 80px",
            animation: "gridMove 40s linear infinite",
          }}
        />

        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-[2px] h-[2px] bg-[var(--neon-blue)] rounded-full opacity-20 shadow-[0_0_8px_var(--neon-blue)]"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${10 + Math.random() * 20}s ease-in-out infinite`,
                animationDelay: `${Math.random() * -10}s`,
              }}
            />
          ))}
        </div>

        {/* Glowing Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--neon-blue)] opacity-5 blur-[120px] rounded-full animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--neon-purple)] opacity-5 blur-[120px] rounded-full animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="flex flex-col items-center relative z-10 animate-fade-in">
        {/* Corex Logo */}
        <div className="mb-12 relative group">
          <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full scale-150 group-hover:bg-blue-500/30 transition-all duration-700" />
          <CorexLogo
            size={120}
            className="drop-shadow-[0_0_30px_rgba(59,130,246,0.5)] relative transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        {/* Shortcuts List */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-2xl px-6">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between px-5 py-3 rounded-xl glass-card hover:border-[var(--neon-blue)] hover:neon-glow-blue transition-all duration-300 group cursor-default"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-textSecondary)] group-hover:text-[var(--color-text)] transition-colors">
                {shortcut.label}
              </span>
              <div className="flex items-center gap-1.5">
                {shortcut.keys.map((key, keyIndex) => (
                  <span key={keyIndex} className="flex items-center gap-1">
                    <kbd className="px-2 py-1 text-[10px] font-black text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md shadow-inner group-hover:border-[var(--color-primary)] transition-all">
                      {key}
                    </kbd>
                    {keyIndex < shortcut.keys.length - 1 && (
                      <span className="text-[var(--color-textSecondary)] font-light">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(100px, 100px); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        .bg-gradient-radial {
          background: radial-gradient(circle at center, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
}
