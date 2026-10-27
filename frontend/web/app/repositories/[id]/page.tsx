'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { RepoDetail } from '@/components/repositories/RepoDetail';

export default function RepositoryDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  return (
    <AppShell
      title="Repository Analysis"
      breadcrumbs={[
        { label: 'Repositories', href: '/repositories' },
        { label: id || 'Analysis Details' },
      ]}
    >
      <RepoDetail id={id} />
    </AppShell>
  );
}
