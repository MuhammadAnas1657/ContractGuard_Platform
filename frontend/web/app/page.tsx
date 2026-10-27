'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/auth-context';

export default function RootPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, isSuperAdmin } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace('/login');
    } else if (isSuperAdmin) {
      router.replace('/admin');
    } else {
      router.replace('/dashboard');
    }
  }, [loading, isAuthenticated, isSuperAdmin, router]);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-[var(--muted)]">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono">Routing to ContractGuard workspace...</span>
      </div>
    </div>
  );
}
