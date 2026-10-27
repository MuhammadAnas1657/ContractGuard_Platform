'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { RepoUpload } from '@/components/repositories/RepoUpload';

export default function NewRepositoryPage() {
  return (
    <AppShell
      title="Add Repository"
      breadcrumbs={[
        { label: 'Repositories', href: '/repositories' },
        { label: 'Add Repository (Upload)' },
      ]}
    >
      <RepoUpload />
    </AppShell>
  );
}
