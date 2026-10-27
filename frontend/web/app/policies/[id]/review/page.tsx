'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { ReviewStudio } from '@/components/policies/ReviewStudio';
import { Policy } from '@/lib/types/policy';
import { apiClient } from '@/lib/api/client';

export default function PolicyReviewPage() {
  const params = useParams();
  const id = params?.id as string;

  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadPolicyData() {
      try {
        setLoading(true);
        const data = await apiClient.getPolicy(id);
        if (!ignore) {
          if (!data) {
            // If not found directly by id, fallback to first policy or placeholder policy for demo continuity
            const all = await apiClient.getPolicies();
            if (all.length > 0) {
              setPolicy(all[0]);
            } else {
              setError(`Policy with ID "${id}" was not found.`);
            }
          } else {
            setPolicy(data);
          }
        }
      } catch (err: any) {
        if (!ignore) {
          setError(err?.message || 'Failed to load policy');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    if (id) {
      loadPolicyData();
    }
    return () => {
      ignore = true;
    };
  }, [id]);

  if (loading) {
    return (
      <AppShell title="Review Studio">
        <div className="py-24 text-center text-xs text-[var(--muted)] space-y-3">
          <div className="w-8 h-8 border-2 border-[var(--ai)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Loading Review Studio workspace & policy AST...</p>
        </div>
      </AppShell>
    );
  }

  if (error || !policy) {
    return (
      <AppShell title="Review Studio">
        <div className="max-w-md mx-auto py-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 text-[var(--danger)] flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text)]">Policy Not Found</h2>
          <p className="text-xs text-[var(--muted)] mt-1">{error || 'Unknown error'}</p>
          <Link
            href="/policies"
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--accent)] text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Policies</span>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`Review Studio: ${policy.title}`}
      breadcrumbs={[
        { label: 'Policies', href: '/policies' },
        { label: policy.title, href: `/policies/${policy.id}` },
        { label: 'Review Studio' },
      ]}
    >
      <ReviewStudio policy={policy} />
    </AppShell>
  );
}
