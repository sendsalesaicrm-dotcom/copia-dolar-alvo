import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Theme } from '../../types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { showError } from '../utils/toast';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, loading: authLoading } = useAuth();
  const [theme, internalSetTheme] = useState<Theme>('light');
  const initializedRef = useRef(false);
  const isSavingRef = useRef(false); // Prevent multiple simultaneous saves

  // Function to persist theme change to Supabase
  const persistTheme = useCallback(async (newTheme: Theme, userId: string) => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ theme: newTheme })
        .eq('id', userId);

      if (error) {
        console.error('Error updating theme in Supabase:', error);
        showError('Erro ao salvar a preferência de tema.');
      }
    } finally {
      isSavingRef.current = false;
    }
  }, []);

  // 1. Function to update theme in state and DOM
  const setTheme = useCallback((newTheme: Theme) => {
    internalSetTheme(newTheme);
    applyTheme(newTheme);
    
    // Persist change if user is logged in and auth is done loading
    if (user && !authLoading) {
        persistTheme(newTheme, user.id);
    }
  }, [user, authLoading, persistTheme]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  // 2. Effect to initialize theme from profile or system preference
  useEffect(() => {
    if (authLoading) return;

    let initialTheme: Theme = 'light';
    let shouldApply = false;

    // Prioritize profile theme if available and user is logged in
    if (user && profile?.theme) {
      initialTheme = profile.theme;
      shouldApply = true;
    } else if (!initializedRef.current) {
      // Use system preference only on first load if no profile theme exists
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      initialTheme = systemPrefersDark ? 'dark' : 'light';
      shouldApply = true;
    }
    
    if (shouldApply) {
        internalSetTheme(initialTheme);
        applyTheme(initialTheme);
        initializedRef.current = true; // Mark as initialized
    }

  }, [user, profile, authLoading]);

  // 3. Effect to handle theme persistence if user logs in *after* ThemeProvider mounts
  useEffect(() => {
    if (user && !authLoading && initializedRef.current && profile?.theme !== theme) {
        // If the theme in state doesn't match the profile theme (e.g., user logged in 
        // and we need to load their preference), update state and persist.
        internalSetTheme(profile?.theme || 'light');
        applyTheme(profile?.theme || 'light');
    }
  }, [user, profile, authLoading]);


  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};