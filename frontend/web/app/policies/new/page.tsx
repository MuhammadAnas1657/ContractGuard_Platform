'use client';

import React, { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PolicyStudio } from '@/components/policies/PolicyStudio';

export default function NewPolicyPage() {
  return (
    <AppShell
      title="Policy Studio"
      breadcrumbs={[
        { label: 'Policies', href: '/policies' },
        { label: 'Studio (New Policy)' },
      ]}
    >
      <Suspense fallback={<div className="p-8 text-center text-xs text-[var(--muted)]">Loading Policy Studio...</div>}>
        <PolicyStudio />
      </Suspense>
    </AppShell>
  );
}
