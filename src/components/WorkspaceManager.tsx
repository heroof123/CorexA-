import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useLanguage } from '../contexts/LanguageContext';

interface Workspace {
  id: string;
  name: string;
  path: string;
  lastOpened: number;
  projectType: string;
  fileCount: number;
  isActive: boolean;
}

interface WorkspaceManagerProps {
  currentProjectPath: string;
  onWorkspaceSelect: (path: string) => void;
}

export default function WorkspaceManager({ currentProjectPath, onWorkspaceSelect }: WorkspaceManagerProps) {
  const { t } = useLanguage();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const projectTemplates = [
    {
      id: 'react-ts',
      name: 'React + TypeScript',
      description: 'TypeScript ve Vite ile modern React uygulaması',
      icon: '⚛️',
      files: ['package.json', 'src/App.tsx', 'src/main.tsx', 'index.html']
    },
    {
      id: 'vue-ts',
      name: 'Vue 3 + TypeScript',
      description: 'TypeScript ile Vue 3 Composition API',
      icon: '💚',
      files: ['package.json', 'src/App.vue', 'src/main.ts', 'index.html']
    },
    {
      id: 'node-express',
      name: 'Node.js + Express',
      description: 'Express ve TypeScript ile REST API sunucusu',
      icon: '🟢',
      files: ['package.json', 'src/server.ts', 'src/routes/index.ts']
    },
    {
      id: 'python-fastapi',
      name: 'Python + FastAPI',
      description: 'FastAPI ile modern Python API',
      icon: '🐍',
      files: ['requirements.txt', 'main.py', 'app/routes.py']
    },
    {
      id: 'rust-tauri',
      name: 'Rust + Tauri',
      description: 'Rust backend ve web frontend ile masaüstü uygulaması',
      icon: '🦀',
      files: ['Cargo.toml', 'src-tauri/src/main.rs', 'src/App.tsx']
    }
  ];

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const saved = localStorage.getItem('workspaces');
      if (saved) {
        const parsed = JSON.parse(saved);
        setWorkspaces(parsed.map((w: Workspace) => ({
          ...w,
          isActive: w.path === currentProjectPath
        })));
      }
    } catch (error) {
      console.error('Error loading workspaces:', error);
    }
  };

  const addWorkspace = async (path: string) => {
    try {
      const files = await invoke<string[]>('scan_project', { path });
      const name = path.split(/[\\/]/).pop() || 'Unknown';

      let projectType = 'Unknown';
      if (files.some(f => f.endsWith('package.json'))) projectType = 'Node.js';
      if (files.some(f => f.endsWith('Cargo.toml'))) projectType = 'Rust';
      if (files.some(f => f.endsWith('requirements.txt'))) projectType = 'Python';

      const newWorkspace: Workspace = {
        id: Date.now().toString(),
        name,
        path,
        lastOpened: Date.now(),
        projectType,
        fileCount: files.length,
        isActive: true
      };

      const updated = workspaces.map(w => ({ ...w, isActive: false }));
      updated.push(newWorkspace);

      setWorkspaces(updated);
      localStorage.setItem('workspaces', JSON.stringify(updated));
    } catch (error) {
      console.error('Error adding workspace:', error);
    }
  };

  const removeWorkspace = (id: string) => {
    const updated = workspaces.filter(w => w.id !== id);
    setWorkspaces(updated);
    localStorage.setItem('workspaces', JSON.stringify(updated));
  };

  const switchWorkspace = (workspace: Workspace) => {
    const updated = workspaces.map(w => ({
      ...w,
      isActive: w.id === workspace.id,
      lastOpened: w.id === workspace.id ? Date.now() : w.lastOpened
    }));

    setWorkspaces(updated);
    localStorage.setItem('workspaces', JSON.stringify(updated));
    onWorkspaceSelect(workspace.path);
  };

  const createFromTemplate = async (templateId: string, projectName: string, location: string) => {
    try {
      const template = projectTemplates.find(t => t.id === templateId);
      if (!template) return;

      const projectPath = `${location}/${projectName}`;

      // Create project structure based on template
      await invoke('create_directory', { path: projectPath });

      // Create template files
      for (const file of template.files) {
        const filePath = `${projectPath}/${file}`;
        let content = '';

        if (file === 'package.json' && templateId.includes('react')) {
          content = JSON.stringify({
            name: projectName,
            version: "0.1.0",
            type: "module",
            scripts: {
              dev: "vite",
              build: "tsc && vite build",
              preview: "vite preview"
            },
            dependencies: {
              react: "^18.2.0",
              "react-dom": "^18.2.0"
            },
            devDependencies: {
              "@types/react": "^18.2.0",
              "@types/react-dom": "^18.2.0",
              "@vitejs/plugin-react": "^4.0.0",
              typescript: "^5.0.0",
              vite: "^4.4.0"
            }
          }, null, 2);
        } else if (file === 'src/App.tsx') {
          content = `import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <h1>${projectName}</h1>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  )
}

export default App`;
        }

        await invoke('write_file', { path: filePath, content });
      }

      await addWorkspace(projectPath);
      setShowCreateTemplate(false);
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--color-surface)]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[var(--color-border)]">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-2">🏢 {t('activity.workspace')}</h2>

        <div className="flex gap-2">
          <button
            onClick={async () => {
              const selected = await open({ directory: true });
              if (typeof selected === 'string') {
                await addWorkspace(selected);
              }
            }}
            className="flex-1 px-3 py-2 bg-[var(--color-primary)] text-white rounded text-sm hover:opacity-80 transition-opacity"
          >
            📁 {t('workspace.openWorkspace')}
          </button>
          <button
            onClick={() => setShowCreateTemplate(true)}
            className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-sm hover:opacity-80 transition-opacity"
          >
            ➕ {t('workspace.newProject')}
          </button>
        </div>
      </div>

      {/* Workspaces List */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {workspaces.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-textSecondary)]">
            <div className="text-4xl mb-4">🏢</div>
            <p className="mb-2">{t('workspace.noWorkspaces')}</p>
            <p className="text-sm">{t('workspace.getStarted')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {workspaces.map(workspace => (
              <div
                key={workspace.id}
                className={`p-3 border rounded cursor-pointer transition-all ${workspace.isActive
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                    : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
                  }`}
                onClick={() => switchWorkspace(workspace)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[var(--color-text)]">{workspace.name}</h3>
                      {workspace.isActive && (
                        <span className="px-2 py-0.5 bg-[var(--color-primary)] text-white text-xs rounded">{t('workspace.active')}</span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--color-textSecondary)] mb-2">{workspace.path}</p>
                    <div className="flex items-center gap-4 text-xs text-[var(--color-textSecondary)]">
                      <span>📁 {workspace.fileCount} {t('workspace.files')}</span>
                      <span>🏷️ {workspace.projectType}</span>
                      <span>🕒 {new Date(workspace.lastOpened).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeWorkspace(workspace.id);
                    }}
                    className="p-1 hover:bg-red-500/20 rounded text-red-500"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Template Modal */}
      {showCreateTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Yeni Proje Oluştur</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Proje Şablonu</label>
                <div className="space-y-2">
                  {projectTemplates.map(template => (
                    <div
                      key={template.id}
                      className={`p-3 border rounded cursor-pointer transition-colors ${selectedTemplate === template.id
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                          : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
                        }`}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{template.icon}</span>
                        <div>
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-[var(--color-textSecondary)]">{template.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowCreateTemplate(false)}
                  className="flex-1 px-4 py-2 border border-[var(--color-border)] rounded hover:bg-[var(--color-hover)] transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={() => {
                    if (selectedTemplate) {
                      // For demo, create in current directory
                      createFromTemplate(selectedTemplate, 'new-project', '.');
                    }
                  }}
                  disabled={!selectedTemplate}
                  className="flex-1 px-4 py-2 bg-[var(--color-primary)] text-white rounded hover:opacity-80 transition-opacity disabled:opacity-50"
                >
                  Oluştur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}