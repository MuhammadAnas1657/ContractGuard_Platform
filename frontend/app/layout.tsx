import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ContractGuard Platform | Autonomous Agent Security Reference Monitor",
  description: "Dual-end policy synthesis and sub-millisecond runtime reference monitor powered by NVIDIA Nemotron via Nebius Token Factory.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#080C14] min-h-screen text-slate-100 flex flex-col">
        {children}
      </body>
    </html>
  );
}
