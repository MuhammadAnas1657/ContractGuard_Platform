'use client';

import React from 'react';
import { ThemeProvider } from '@/lib/context/theme-context';
import { AuthProvider } from '@/lib/context/auth-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
}
