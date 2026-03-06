"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type SessionUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  createdAt?: string;
};

type NavItem = {
  href: string;
  label: string;
};

const TOP_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/documents", label: "Documents" },
  { href: "/drafts", label: "Drafts" },
  { href: "/sent", label: "Sent" },
  { href: "/completed", label: "Completed" },
  { href: "/ai-insights", label: "AI Insights" }
];

const SIDE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/documents", label: "Documents" },
  { href: "/drafts", label: "Drafts" },
  { href: "/sent", label: "Sent" },
  { href: "/completed", label: "Completed" },
  { href: "/ai-insights", label: "AI Assistant" },
  { href: "/settings", label: "Settings" }
];

function isPublicRoute(pathname: string) {
  return pathname === "/login" || pathname === "/signup" || pathname.startsWith("/sign/");
}

function Initials({ user }: { user: SessionUser | null }) {
  const initials = useMemo(() => {
    if (!user) return "U";
    const first = user.firstName?.[0] || "";
    const last = user.lastName?.[0] || "";
    return (first + last || user.email[0] || "U").toUpperCase();
  }, [user]);

  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-xs font-semibold text-cyan-900">
      {initials}
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState("");

  const publicRoute = isPublicRoute(pathname);

  useEffect(() => {
    if (publicRoute) {
      setAuthLoading(false);
      return;
    }

    let cancelled = false;
    setAuthLoading(true);
    setError("");
    api<SessionUser>("/auth/me")
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          router.replace("/login");
        }
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [publicRoute, router, pathname]);

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // Even if logout fails server-side, force local route transition.
    } finally {
      setUser(null);
      router.replace("/login");
    }
  }

  if (publicRoute) {
    return <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>;
  }

  if (authLoading) {
    return (
      <main className="mx-auto grid min-h-[60vh] max-w-7xl place-items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          Loading workspace...
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex rounded-md border border-slate-300 px-2 py-1 text-sm lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              Menu
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-700 text-sm font-bold text-white">
                S
              </span>
              <span className="text-lg font-semibold tracking-tight text-slate-900">SignHub</span>
            </Link>
            <nav className="ml-4 hidden items-center gap-1 lg:flex">
              {TOP_NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-md px-3 py-2 text-sm transition ${
                      active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <Initials user={user} />
              <span className="hidden sm:inline">{user?.email}</span>
            </button>
            {menuOpen ? (
              <div className="absolute right-0 mt-2 w-48 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                <Link className="block rounded px-3 py-2 text-sm hover:bg-slate-100" href="/account" onClick={() => setMenuOpen(false)}>
                  Account
                </Link>
                <Link className="block rounded px-3 py-2 text-sm hover:bg-slate-100" href="/settings" onClick={() => setMenuOpen(false)}>
                  Settings
                </Link>
                <button
                  type="button"
                  className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100"
                  onClick={logout}
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-0 lg:grid-cols-[240px,1fr]">
        <aside
          className={`border-r border-slate-200 bg-white px-3 py-4 lg:block ${mobileOpen ? "block" : "hidden"}`}
        >
          <nav className="space-y-1">
            {SIDE_NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-md px-3 py-2 text-sm transition ${
                    active ? "bg-cyan-50 font-medium text-cyan-900" : "text-slate-600 hover:bg-slate-100"
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      {error ? (
        <div className="fixed bottom-3 right-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
