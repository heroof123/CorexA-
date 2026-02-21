import { useState, useEffect } from 'react';
import { useLayout } from '../contexts/LayoutContext';

interface CustomizeLayoutProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LayoutElement {
  id: string;
  name: string;
  icon: string;
  visible: boolean;
  shortcut?: string;
}

export default function CustomizeLayout({ isOpen, onClose }: CustomizeLayoutProps) {
  const {
    showLeftSidebar,
    showRightSidebar,
    showBottomPanel,
    toggleLeftSidebar,
    toggleRightSidebar,
    toggleBottomPanel,
    resetLayout
  } = useLayout();

  const [elements, setElements] = useState<LayoutElement[]>([
    {
      id: 'menuBar',
      name: 'Menu Bar',
      icon: '☰',
      visible: true
    },
    {
      id: 'activityBar',
      name: 'Activity Bar',
      icon: '📋',
      visible: true
    },
    {
      id: 'primarySideBar',
      name: 'Primary Side Bar',
      icon: '📁',
      visible: showRightSidebar,
      shortcut: 'Ctrl + B'
    },
    {
      id: 'secondarySideBar',
      name: 'Secondary Side Bar - AI Chat',
      icon: '💬',
      visible: showLeftSidebar,
      shortcut: 'Ctrl + Alt + B'
    },
    {
      id: 'panel',
      name: 'Panel',
      icon: '📊',
      visible: showBottomPanel,
      shortcut: 'Ctrl + J'
    }
  ]);

  const [sideBarPosition, setSideBarPosition] = useState<'left' | 'right'>('right');
  const [panelAlignment, setPanelAlignment] = useState<'left' | 'right' | 'center' | 'justify'>('center');

  // ESC tuşu ile kapatma
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Layout değişikliklerini elements'e yansıt
  useEffect(() => {
    setElements(prev => prev.map(el => {
      switch (el.id) {
        case 'primarySideBar':
          return { ...el, visible: showRightSidebar };
        case 'secondarySideBar':
          return { ...el, visible: showLeftSidebar };
        case 'panel':
          return { ...el, visible: showBottomPanel };
        default:
          return el;
      }
    }));
  }, [showLeftSidebar, showRightSidebar, showBottomPanel]);

  const toggleElement = (id: string) => {
    switch (id) {
      case 'primarySideBar':
        toggleRightSidebar();
        break;
      case 'secondarySideBar':
        toggleLeftSidebar();
        break;
      case 'panel':
        toggleBottomPanel();
        break;
      default:
        // Diğer elementler için state güncelle
        setElements(prev => prev.map(el =>
          el.id === id ? { ...el, visible: !el.visible } : el
        ));
    }
  };

  const resetToDefault = () => {
    resetLayout();
    setSideBarPosition('right');
    setPanelAlignment('center');
    setElements(prev => prev.map(el => ({ ...el, visible: true })));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="h-12 bg-[var(--color-background)] border-b border-[var(--color-border)] flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎨</span>
              <h3 className="text-sm font-semibold text-[var(--color-text)]">Customize Layout</h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={resetToDefault}
                className="px-3 py-1 text-xs bg-[var(--color-secondary)] text-white rounded hover:opacity-80 transition-opacity"
                title="Reset to Default"
              >
                🔄 Reset
              </button>
              <button
                onClick={onClose}
                className="w-6 h-6 flex items-center justify-center text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-hover)] rounded transition-colors"
                title="Close (ESC)"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-3rem)]">
            {/* Visibility Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-[var(--color-text)]">Visibility</h4>
                <span className="text-xs text-[var(--color-textSecondary)]">👁️</span>
              </div>

              <div className="space-y-3">
                {elements.map(element => (
                  <div key={element.id} className="flex items-center justify-between p-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={element.visible}
                          onChange={() => toggleElement(element.id)}
                          className="rounded"
                        />
                        <span className="text-lg">{element.icon}</span>
                        <span className="text-sm font-medium">{element.name}</span>
                      </label>
                    </div>

                    {element.shortcut && (
                      <div className="flex items-center gap-1 text-xs text-[var(--color-textSecondary)]">
                        {element.shortcut.split(' + ').map((key, index) => (
                          <span key={index}>
                            {index > 0 && <span className="mx-1">+</span>}
                            <kbd className="px-1.5 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-xs">
                              {key}
                            </kbd>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Primary Side Bar Position */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-[var(--color-text)]">Primary Side Bar Position</h4>
                <span className="text-xs text-purple-400">📍</span>
              </div>

              <div className="flex gap-2">
                {['left', 'right'].map(position => (
                  <button
                    key={position}
                    onClick={() => setSideBarPosition(position as 'left' | 'right')}
                    className={`flex-1 p-3 border rounded transition-colors ${sideBarPosition === position
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                      : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{position === 'left' ? '⬅️' : '➡️'}</span>
                      <span className="text-sm capitalize">{position}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Panel Alignment */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-[var(--color-text)]">Panel Alignment</h4>
                <span className="text-xs text-purple-400">📐</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'left', label: 'Left', icon: '⬅️' },
                  { id: 'right', label: 'Right', icon: '➡️' },
                  { id: 'center', label: 'Center', icon: '⬆️' },
                  { id: 'justify', label: 'Justify', icon: '↔️' }
                ].map(alignment => (
                  <button
                    key={alignment.id}
                    onClick={() => setPanelAlignment(alignment.id as any)}
                    className={`p-3 border rounded transition-colors ${panelAlignment === alignment.id
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                      : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{alignment.icon}</span>
                      <span className="text-sm">{alignment.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-[var(--color-text)]">Quick Actions</h4>
                <span className="text-xs text-purple-400">⚡</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    // Full Screen mode
                    setElements(prev => prev.map(el => ({
                      ...el,
                      visible: el.id === 'menuBar'
                    })));
                  }}
                  className="p-3 border border-[var(--color-border)] rounded hover:border-[var(--color-primary)] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🖥️</span>
                    <span className="text-sm">Full Screen</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    // Zen Mode
                    setElements(prev => prev.map(el => ({
                      ...el,
                      visible: false
                    })));
                  }}
                  className="p-3 border border-[var(--color-border)] rounded hover:border-[var(--color-primary)] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🧘</span>
                    <span className="text-sm">Zen Mode</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}