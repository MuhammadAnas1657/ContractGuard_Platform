import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ContractGuard-X | Zero-Trust Security Gateway & Reference Monitor for AI Agents",
  description: "Dual-end policy synthesis and sub-millisecond runtime reference monitor powered by NVIDIA Nemotron via Nebius Token Factory.",
  icons: {
    icon: "/logo-icon.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#EEF2F6] min-h-screen text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white antialiased">
        {children}
      </body>
    </html>
  );
}
