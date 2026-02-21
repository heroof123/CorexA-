import { useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";

interface ActivityBarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onSettingsClick: () => void;
}

interface ActivityItem {
  id: string;
  name: string;
  icon: string;
  shortcut?: string;
  badge?: number;
}

export default function ActivityBar({
  activeView,
  onViewChange,
  onSettingsClick,
}: ActivityBarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [badges] = useState<Record<string, number>>({
    "source-control": 3,
    extensions: 2,
  });
  const { t } = useLanguage();

  const activities: ActivityItem[] = [
    { id: "explorer", name: t("activity.explorer"), icon: "📁", shortcut: "Ctrl+Shift+E" },
    { id: "search", name: t("activity.search"), icon: "🔍", shortcut: "Ctrl+Shift+F" },
    {
      id: "source-control",
      name: t("activity.sourceControl"),
      icon: "🌿",
      shortcut: "Ctrl+Shift+G",
      badge: badges["source-control"],
    },
    { id: "run-debug", name: t("activity.runDebug"), icon: "▶️", shortcut: "Ctrl+Shift+D" },
    {
      id: "extensions",
      name: t("activity.extensions"),
      icon: "🧩",
      shortcut: "Ctrl+Shift+X",
      badge: badges["extensions"],
    },
    { id: "workspace", name: t("activity.workspace"), icon: "🏢", shortcut: "Ctrl+Shift+W" },
    { id: "database", name: t("activity.database"), icon: "🗄️", shortcut: "Ctrl+Shift+B" },
    { id: "api-testing", name: t("activity.apiTesting"), icon: "🌐", shortcut: "Ctrl+Shift+A" },
    { id: "tasks", name: t("activity.tasks"), icon: "✅", shortcut: "Ctrl+Shift+T" },
    { id: "docker", name: t("activity.docker"), icon: "🐳", shortcut: "Ctrl+Shift+K" },
    { id: "mcp", name: "MCP Servers", icon: "🔌", shortcut: "Ctrl+Shift+M" },
  ];

  const bottomActivities: ActivityItem[] = [
    { id: "accounts", name: t("activity.accounts"), icon: "👤" },
    { id: "settings", name: t("activity.settings"), icon: "⚙️", shortcut: "Ctrl+," },
  ];

  const handleItemClick = (id: string) => {
    if (id === "settings") {
      onSettingsClick();
      return;
    }
    onViewChange(activeView === id ? "" : id);
  };

  const ActivityButton = ({ activity }: { activity: ActivityItem }) => (
    <div className="relative flex items-center justify-center w-full">
      <button
        onClick={() => handleItemClick(activity.id)}
        onMouseEnter={() => setHoveredItem(activity.id)}
        onMouseLeave={() => setHoveredItem(null)}
        className={`
          w-10 h-10 flex items-center justify-center relative
          transition-all duration-300 ease-out cursor-pointer
          rounded-xl group
          ${activeView === activity.id
            ? "bg-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
            : "text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-hover)]"
          }
        `}
        type="button"
      >
        <span
          className={`text-xl transition-transform duration-300 group-hover:scale-110 ${activeView === activity.id ? "scale-110" : ""}`}
        >
          {activity.icon}
        </span>

        {activity.badge && activity.badge > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
        )}

        {/* Tooltip */}
        {hoveredItem === activity.id && (
          <div className="absolute left-14 top-1/2 -translate-y-1/2 z-[100] animate-in fade-in slide-in-from-left-2 duration-200 pointer-events-none">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 shadow-2xl backdrop-blur-xl">
              <div className="text-xs font-bold text-[var(--color-text)] whitespace-nowrap">{activity.name}</div>
              {activity.shortcut && (
                <div className="text-[10px] text-[var(--color-textSecondary)] mt-0.5">{activity.shortcut}</div>
              )}
            </div>
          </div>
        )}
      </button>

      {activeView === activity.id && (
        <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
      )}
    </div>
  );

  return (
    <div className="w-12 bg-[var(--color-background)] border-r border-[var(--color-border)] flex flex-col h-full items-center py-4 gap-2 backdrop-blur-xl z-30">
      <div className="flex-1 flex flex-col items-center gap-2 w-full">
        {activities.map(activity => (
          <ActivityButton key={activity.id} activity={activity} />
        ))}
      </div>

      <div className="flex flex-col items-center gap-2 w-full border-t border-[var(--color-border)] pt-4">
        {bottomActivities.map(activity => (
          <ActivityButton key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
}
