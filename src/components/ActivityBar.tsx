import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

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

export default function ActivityBar({ activeView, onViewChange, onSettingsClick }: ActivityBarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [badges, setBadges] = useState<Record<string, number>>({
    'source-control': 3,
    'extensions': 2
  });
  const { t } = useLanguage();

  const activities: ActivityItem[] = [
    {
      id: 'explorer',
      name: t('activity.explorer'),
      icon: '📁',
      shortcut: 'Ctrl+Shift+E'
    },
    {
      id: 'search',
      name: t('activity.search'),
      icon: '🔍',
      shortcut: 'Ctrl+Shift+F'
    },
    {
      id: 'source-control',
      name: t('activity.sourceControl'),
      icon: '🌿',
      shortcut: 'Ctrl+Shift+G',
      badge: badges['source-control']
    },
    {
      id: 'run-debug',
      name: t('activity.runDebug'),
      icon: '▶️',
      shortcut: 'Ctrl+Shift+D'
    },
    {
      id: 'extensions',
      name: t('activity.extensions'),
      icon: '🧩',
      shortcut: 'Ctrl+Shift+X',
      badge: badges['extensions']
    },
    {
      id: 'workspace',
      name: t('activity.workspace'),
      icon: '🏢',
      shortcut: 'Ctrl+Shift+W'
    },
    {
      id: 'database',
      name: t('activity.database'),
      icon: '🗄️',
      shortcut: 'Ctrl+Shift+B'
    },
    {
      id: 'api-testing',
      name: t('activity.apiTesting'),
      icon: '🌐',
      shortcut: 'Ctrl+Shift+A'
    },
    {
      id: 'tasks',
      name: t('activity.tasks'),
      icon: '✅',
      shortcut: 'Ctrl+Shift+T'
    },
    {
      id: 'docker',
      name: t('activity.docker'),
      icon: '🐳',
      shortcut: 'Ctrl+Shift+K'
    },
    {
      id: 'compare',
      name: 'Model Comparison',
      icon: '⚖️',
      shortcut: 'Ctrl+Shift+C'
    },
    {
      id: 'mcp',

      name: 'MCP Servers',
      icon: '🔌',
      shortcut: 'Ctrl+Shift+M'
    }
  ];

  const bottomActivities: ActivityItem[] = [
    {
      id: 'accounts',
      name: t('activity.accounts'),
      icon: '👤'
    },
    {
      id: 'settings',
      name: t('activity.settings'),
      icon: '⚙️',
      shortcut: 'Ctrl+,'
    }
  ];

  const handleItemClick = (id: string) => {
    // Special handling for settings
    if (id === 'settings') {
      onSettingsClick();
      return;
    }

    // Clear badge when clicking on an item
    if (badges[id] && badges[id] > 0) {
      setBadges(prev => ({ ...prev, [id]: 0 }));
    }

    if (activeView === id) {
      // If clicking the same item, toggle it off
      onViewChange('');
    } else {
      onViewChange(id);
    }
  };

  const ActivityButton = ({ activity, isBottom = false }: { activity: ActivityItem; isBottom?: boolean }) => (
    <div className="relative flex items-center justify-center">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleItemClick(activity.id);
        }}
        onMouseEnter={() => setHoveredItem(activity.id)}
        onMouseLeave={() => setHoveredItem(null)}
        className={`
          ${isBottom ? 'w-8 h-8' : 'w-10 h-10'} 
          flex items-center justify-center relative
          transition-all duration-200 ease-in-out cursor-pointer
          rounded hover:bg-[var(--color-hover)]
          ${activeView === activity.id
            ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
            : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
          }
        `}
        type="button"
        title={`${activity.name}${activity.shortcut ? ` (${activity.shortcut})` : ''}`}
      >
        <span className={isBottom ? 'text-lg' : 'text-xl'}>{activity.icon}</span>

        {/* Badge */}
        {activity.badge && activity.badge > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 ${isBottom ? 'w-3 h-3 text-[8px]' : 'w-3.5 h-3.5 text-[9px]'} bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center pointer-events-none`}>
            {activity.badge > 9 ? '9+' : activity.badge}
          </span>
        )}
      </button>

      {/* Active Indicator */}
      {activeView === activity.id && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--color-primary)] rounded-r"></div>
      )}

      {/* Tooltip */}
      {hoveredItem === activity.id && (
        <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 z-[100] pointer-events-none">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1 shadow-lg whitespace-nowrap">
            <div className="text-xs font-medium text-[var(--color-text)]">{activity.name}</div>
            {activity.shortcut && (
              <div className="text-[10px] text-[var(--color-textSecondary)]">{activity.shortcut}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-16 bg-[var(--color-background)] border-r border-[var(--color-border)] flex flex-col h-full items-center">
      {/* Top Activities */}
      <div className="flex-1 py-0.5 space-y-0 flex flex-col items-center">
        {activities.map(activity => (
          <ActivityButton key={activity.id} activity={activity} />
        ))}
      </div>

      {/* Bottom Activities */}
      <div className="pb-0.5 space-y-0 flex flex-col items-center">
        {bottomActivities.map(activity => (
          <ActivityButton key={activity.id} activity={activity} isBottom={true} />
        ))}
      </div>
    </div>
  );
}