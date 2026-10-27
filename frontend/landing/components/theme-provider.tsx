'use client';

import React, { createContext, useContext, useEffect, useSyncExternalStore } from 'react';
import { THEME_STORAGE_KEY, type ThemeMode } from '@/lib/design-tokens';

interface ThemeContextValue {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const listeners = new Set<() => void>();

function notifyThemeListeners() {
  listeners.forEach((listener) => listener());
}

function subscribeTheme(callback: () => void) {
  listeners.add(callback);
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleMedia = () => callback();
  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      callback();
    }
  };

  mediaQuery.addEventListener('change', handleMedia);
  window.addEventListener('storage', handleStorage);

  return () => {
    listeners.delete(callback);
    mediaQuery.removeEventListener('change', handleMedia);
    window.removeEventListener('storage', handleStorage);
  };
}

function getThemeSnapshot(): ThemeMode {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getServerThemeSnapshot(): ThemeMode {
  return 'dark';
}

function subscribeMounted() {
  return () => {};
}

function applyDocumentTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);
  const mounted = useSyncExternalStore(
    subscribeMounted,
    () => true,
    () => false
  );

  useEffect(() => {
    applyDocumentTheme(theme);
  }, [theme]);

  const setTheme = (mode: ThemeMode) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    applyDocumentTheme(mode);
    notifyThemeListeners();
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
