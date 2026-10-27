import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { THEME_STORAGE_KEY } from '@/lib/design-tokens';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ContractGuard — Security Policies for AI Agents',
  description:
    'Generate, review, and export deterministic security policies for AI agents.',
  openGraph: {
    title: 'ContractGuard — Security Policies for AI Agents',
    description:
      'Generate, review, and export deterministic security policies for AI agents.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ContractGuard — Security Policies for AI Agents',
    description:
      'Generate, review, and export deterministic security policies for AI agents.',
  },
};

const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-screen flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <SiteHeader />
          <main className="relative z-10 flex-1 w-full">{children}</main>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
