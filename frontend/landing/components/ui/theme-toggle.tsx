'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();
  const isDark = mounted ? theme === 'dark' : true;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={toggleTheme}
      className="neu-raised inline-flex h-10 min-w-10 items-center justify-center gap-2 px-3.5 text-sm font-medium text-[var(--text)] shrink-0 whitespace-nowrap cursor-pointer"
    >
      {mounted ? (
        isDark ? (
          <>
            <Moon className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
            <span className="hidden sm:inline">Dark</span>
          </>
        ) : (
          <>
            <Sun className="h-4 w-4 text-[var(--warning)]" aria-hidden="true" />
            <span className="hidden sm:inline">Light</span>
          </>
        )
      ) : (
        <span className="inline-block h-4 w-10" aria-hidden="true" />
      )}
    </button>
  );
}
