import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
    id: string;
    name: string;
    email: string;
    photoURL: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check local storage for mock session
        const storedUser = localStorage.getItem('corex_mock_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const loginWithGoogle = async () => {
        setLoading(true);
        // Simulate network delay for a realistic feel
        await new Promise(resolve => setTimeout(resolve, 800));
        const mockUser = {
            id: '1',
            name: 'Geliştirici',
            email: 'dev@corex.ai',
            photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4'
        };
        setUser(mockUser);
        localStorage.setItem('corex_mock_user', JSON.stringify(mockUser));
        setLoading(false);
    };

    const logout = async () => {
        setUser(null);
        localStorage.removeItem('corex_mock_user');
    };

    return (
        <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
