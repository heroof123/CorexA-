import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FolderOpen, Plus, LogOut, Code2 } from 'lucide-react';

interface ProjectDashboardProps {
    onOpenProject: () => void;
    onCreateProject: (projectName: string) => void;
}

export function ProjectDashboard({ onOpenProject, onCreateProject }: ProjectDashboardProps) {
    const { user, logout } = useAuth();
    const [showNameModal, setShowNameModal] = React.useState(false);
    const [newProjectName, setNewProjectName] = React.useState('');

    const handleCreateProject = () => {
        if (newProjectName.trim()) {
            onCreateProject(newProjectName.trim());
            setShowNameModal(false);
            setNewProjectName('');
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#0a0a0a] text-white flex flex-col relative overflow-hidden select-none">

            {/* Title bar drag area */}
            <div className="absolute top-0 left-0 w-full h-12 z-50 pointer-events-none" style={{ WebkitAppRegion: 'drag', appRegion: 'drag' } as React.CSSProperties}></div>

            {/* Header */}
            <header className="w-full flex items-center justify-between p-6 z-10" style={{ WebkitAppRegion: 'no-drag', appRegion: 'no-drag' } as React.CSSProperties}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center font-black text-white text-sm shadow-lg shadow-blue-500/20">
                        C
                    </div>
                    <span className="font-bold text-lg tracking-wider">COREX</span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/5 shadow-inner">
                        <img src={user?.photoURL} alt="User" className="w-8 h-8 rounded-full border border-white/20 bg-white/10" />
                        <div className="flex flex-col">
                            <span className="text-sm font-medium leading-none">{user?.name}</span>
                            <span className="text-xs text-neutral-400 mt-1 leading-none">{user?.email}</span>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="p-2 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 rounded-xl transition-all border border-transparent hover:border-red-500/30"
                        title="Çıkış Yap"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center z-10 px-4" style={{ WebkitAppRegion: 'no-drag', appRegion: 'no-drag' } as React.CSSProperties}>
                <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-4 text-center tracking-tight">
                    Ne İnşa Ediyoruz?
                </h1>
                <p className="text-neutral-400 mb-12 text-lg text-center max-w-xl leading-relaxed">
                    Corex AI ile kodlamanın yeni boyutuna geçin. Yeni bir başlangıç yapın veya mevcut projelerinizden devam edin.
                </p>

                <div className="flex flex-col md:flex-row gap-6 w-full max-w-3xl">
                    {/* Create New Project Card */}
                    <button
                        onClick={() => setShowNameModal(true)}
                        className="group flex-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 rounded-3xl p-8 flex flex-col items-center text-center transition-all duration-300 transform hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(59,130,246,0.15)] relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="w-20 h-20 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 text-blue-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                            <Plus size={40} />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-white">Yeni Proje Oluştur</h2>
                        <p className="text-neutral-400 text-sm">Corex sihirbazı ile yeni bir uygulamayı sıfırdan oluşturun.</p>
                    </button>

                    {/* Open Existing Project Card */}
                    <button
                        onClick={onOpenProject}
                        className="group flex-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 rounded-3xl p-8 flex flex-col items-center text-center transition-all duration-300 transform hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(168,85,247,0.15)] relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="w-20 h-20 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6 text-purple-400 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                            <FolderOpen size={40} strokeWidth={2} />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-white">Proje Aç</h2>
                        <p className="text-neutral-400 text-sm">Bilgisayarınızdaki mevcut bir çalışma klasörünü açın.</p>
                    </button>
                </div>

                {/* Decorational Element */}
                <div className="mt-20 text-neutral-600 flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full backdrop-blur-sm border border-white/5">
                    <Code2 size={20} />
                    <span className="text-xs font-semibold uppercase tracking-[0.2em]">Corex Workspace</span>
                </div>
            </main>

            {/* Dynamic Backgrounds for Dashboard */}
            <div className="absolute top-[20%] left-[-20%] w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[150px] mix-blend-screen pointer-events-none animate-pulse" style={{ animationDuration: '4s' }}></div>
            <div className="absolute bottom-[-20%] right-[-20%] w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[150px] mix-blend-screen pointer-events-none animate-pulse" style={{ animationDuration: '5s' }}></div>

            {/* Create Project Modal */}
            {showNameModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowNameModal(false)}></div>
                    <div className="bg-[#121216] border border-white/10 rounded-3xl p-8 w-full max-w-md relative z-10 shadow-2xl">
                        <h3 className="text-2xl font-bold mb-2">Yeni Proje</h3>
                        <p className="text-neutral-400 mb-6 text-sm">Projeniz için harika bir isim seçin.</p>

                        <input
                            type="text"
                            placeholder="Proje adı (örn: my-awesome-app)"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                            autoFocus
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors mb-6"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowNameModal(false)}
                                className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm font-semibold"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleCreateProject}
                                disabled={!newProjectName.trim()}
                                className="flex-1 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-semibold shadow-lg shadow-blue-500/20"
                            >
                                Devam Et
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
