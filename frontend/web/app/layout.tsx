import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'ContractGuard | AI-Agent Security Platform',
  description: 'AI-agent security platform that generates, reviews, and exports verifiable security policies and enforcement specifications.',
  openGraph: {
    title: 'ContractGuard | AI-Agent Security Platform',
    description: 'AI-agent security platform that generates, reviews, and exports verifiable security policies and enforcement specifications.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ContractGuard | AI-Agent Security Platform',
    description: 'AI-agent security platform that generates, reviews, and exports verifiable security policies and enforcement specifications.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
