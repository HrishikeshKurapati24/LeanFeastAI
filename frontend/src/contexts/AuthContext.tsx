import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../config/supabaseClient.js';
import { clearSessionMode } from '../utils/sessionMode';
import { useUserStoreInitialization } from '../hooks/useUserStoreInitialization';

// Infer Session type from Supabase's return type
type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'];

interface AuthContextType {
    user: User | null;
    session: Session;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Initialize user store on login/logout
    useUserStoreInitialization(user?.id || null, !!user);

    const signOut = async () => {
        try {
            // Sign out from Supabase (this clears session, tokens, and localStorage)
            const { error } = await supabase.auth.signOut();

            if (error) {
                console.error('Error signing out:', error);
                // Still clear local state even if there's an error
            }

            // Clear local state
            setUser(null);
            setSession(null);

            // Clear app-specific localStorage items
            localStorage.removeItem('leanfeast_form_data'); // Clear Feast Studio form data
            clearSessionMode();

        } catch (err) {
            console.error('Exception during sign out:', err);
            // Still clear local state even if there's an exception
            setUser(null);
            setSession(null);
            clearSessionMode();
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}