import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FaGoogle } from 'react-icons/fa';

export function Login() {
    const { loginWithGoogle, loading } = useAuth();

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden" style={{ WebkitAppRegion: 'drag', appRegion: 'drag' } as React.CSSProperties}>

            {/* Title bar controls space (invisible but draggable) */}
            <div className="absolute top-0 left-0 w-full h-12 z-50"></div>

            {/* Dynamic Background */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[150px] mix-blend-screen animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>

            <div className="relative z-10 w-full max-w-md p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col items-center transform transition-all hover:scale-[1.01]" style={{ WebkitAppRegion: 'no-drag', appRegion: 'no-drag' } as React.CSSProperties}>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center font-black text-white text-3xl mb-6 shadow-lg shadow-blue-500/30">
                    C
                </div>

                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Corex'e Giriş Yap</h1>
                <p className="text-neutral-400 mb-8 text-center text-sm">
                    Geleceğin yapay zeka destekli geliştirme ortamına bağlanın.
                </p>

                <button
                    onClick={loginWithGoogle}
                    disabled={loading}
                    className={`flex items-center justify-center gap-3 w-full py-3.5 px-4 rounded-xl font-semibold text-white transition-all bg-white/10 hover:bg-white/20 border border-white/5 hover:border-white/10 ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]'}`}
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <FaGoogle className="text-xl text-red-400" />
                    )}
                    <span>{loading ? 'Bağlanıyor...' : 'Google ile Devam Et'}</span>
                </button>

                <div className="mt-8 text-xs text-neutral-500 text-center">
                    Giriş yaparak Corex AI <a href="#" className="hover:text-blue-400 underline decoration-white/20 hover:decoration-blue-400/50 transition-colors">Kullanım Koşullarını</a> ve <a href="#" className="hover:text-blue-400 underline decoration-white/20 hover:decoration-blue-400/50 transition-colors">Gizlilik Politikasını</a> kabul etmiş olursunuz.
                </div>
            </div>
        </div>
    );
}
