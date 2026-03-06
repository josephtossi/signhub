import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "SignHub",
  description: "Secure e-signature platform"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <header className="sticky top-0 z-20 border-b border-slate-200/60 glass">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600" />
                <span className="text-xl font-semibold tracking-tight text-slate-900">SignHub</span>
              </Link>
              <nav className="flex gap-6 text-sm font-medium text-slate-600">
                <Link href="/dashboard">Dashboard</Link>
                <Link href="/upload">Upload</Link>
                <Link href="/tracking">Tracking</Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-6 py-8 fade-in">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
