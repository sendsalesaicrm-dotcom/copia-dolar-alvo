import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../../types';
import { showError } from '../utils/toast';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<boolean>; // Retorna boolean
  refreshProfile: (userId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true); // Starts true

  const isAuthenticated = !!user;

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means 'no rows found'
      console.error('Error fetching profile:', error);
      showError('Erro ao carregar perfil do usuário.');
      return null;
    }
    return data as UserProfile | null;
  }, []);

  const refreshProfile = useCallback(async (userId?: string) => { // Adiciona userId opcional
    const currentUserId = userId || user?.id; // Usa o userId fornecido ou o do estado
    if (currentUserId) {
      const fetchedProfile = await fetchProfile(currentUserId);
      setProfile(fetchedProfile);
    }
  }, [user, fetchProfile]);

  // 1. Initial Session Check (using getSession for immediate resolution)
  useEffect(() => {
    const resolveInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          const fetchedProfile = await fetchProfile(session.user.id);
          setProfile(fetchedProfile);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error("Error resolving initial session:", error);
        // Even if there's an error, we must stop loading to allow navigation
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    resolveInitialSession();
  }, [fetchProfile]);

  // 2. Auth State Change Listener (for subsequent events like login/logout)
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      // We ignore INITIAL_SESSION here as it's handled by getSession() above.
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser(session.user);
          // Refresh profile in background for these events
          refreshProfile(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [refreshProfile]);


  const signOut = async (): Promise<boolean> => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError('Erro ao sair: ' + error.message);
      return false;
    }
    return true;
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAuthenticated, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};