import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ContractGuard-X | Zero-Trust Security Gateway & Reference Monitor for AI Agents",
  description: "Dual-end policy synthesis and sub-millisecond runtime reference monitor powered by NVIDIA Nemotron via Nebius Token Factory.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png" },
      { url: "/logo-icon.png", sizes: "128x128", type: "image/png" },
    ],
    apple: [
      { url: "/logo.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col font-sans selection:bg-blue-600 selection:text-white antialiased">
        {children}
      </body>
    </html>
  );
}
