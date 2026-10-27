'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { RepoList } from '@/components/repositories/RepoList';

export default function RepositoriesPage() {
  return (
    <AppShell
      title="Repositories"
      breadcrumbs={[
        { label: 'Repositories' },
      ]}
    >
      <RepoList />
    </AppShell>
  );
}
