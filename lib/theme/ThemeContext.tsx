'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppTheme = 'bauhaus' | 'minimal';

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  isMinimal: boolean;
  isBauhaus: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'bauhaus',
  setTheme: () => {},
  toggleTheme: () => {},
  isMinimal: false,
  isBauhaus: true,
});

export const useTheme = () => useContext(ThemeContext);

const STORAGE_KEY = 'app-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>('bauhaus');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as AppTheme | null;
      const initialTheme: AppTheme = saved === 'minimal' ? 'minimal' : 'bauhaus';
      setThemeState(initialTheme);
      applyThemeToDom(initialTheme);
    } catch {
      applyThemeToDom('bauhaus');
    }
  }, []);

  const applyThemeToDom = (t: AppTheme) => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.setAttribute('data-theme', t);
      if (t === 'minimal') {
        root.classList.add('theme-minimal');
        root.classList.remove('theme-bauhaus');
      } else {
        root.classList.add('theme-bauhaus');
        root.classList.remove('theme-minimal');
      }
    }
  };

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {}
    applyThemeToDom(newTheme);
  };

  const toggleTheme = () => {
    const next = theme === 'bauhaus' ? 'minimal' : 'bauhaus';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isMinimal: theme === 'minimal',
        isBauhaus: theme === 'bauhaus',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
