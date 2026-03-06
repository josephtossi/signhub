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
          <header className="border-b bg-white">
            <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-4">
              <Link href="/dashboard" className="text-xl font-semibold text-brand-900">
                SignHub
              </Link>
              <nav className="flex gap-4 text-sm text-slate-600">
                <Link href="/dashboard">Dashboard</Link>
                <Link href="/upload">Upload</Link>
                <Link href="/tracking/demo">Tracking</Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}

