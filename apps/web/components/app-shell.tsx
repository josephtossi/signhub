"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
  icon: string;
};

const TOP_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "DB" },
  { href: "/documents", label: "Documents", icon: "DC" },
  { href: "/drafts", label: "Drafts", icon: "DR" },
  { href: "/sent", label: "Sent", icon: "SE" },
  { href: "/completed", label: "Completed", icon: "OK" },
  { href: "/ai-insights", label: "AI Insights", icon: "AI" }
];

const SIDE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "DB" },
  { href: "/documents", label: "Documents", icon: "DC" },
  { href: "/drafts", label: "Drafts", icon: "DR" },
  { href: "/sent", label: "Sent", icon: "SE" },
  { href: "/completed", label: "Completed", icon: "OK" },
  { href: "/ai-insights", label: "AI Assistant", icon: "AI" },
  { href: "/settings", label: "Settings", icon: "ST" }
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
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-cyan-200 bg-cyan-50 text-xs font-semibold text-cyan-900">
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
  const [routeLoading, setRouteLoading] = useState(false);
  const routeLoadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const publicRoute = isPublicRoute(pathname);
  const authRoute = pathname === "/login" || pathname === "/signup";

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

  useEffect(() => {
    if (routeLoadingTimeoutRef.current) clearTimeout(routeLoadingTimeoutRef.current);
    routeLoadingTimeoutRef.current = setTimeout(() => setRouteLoading(false), 250);
    return () => {
      if (routeLoadingTimeoutRef.current) clearTimeout(routeLoadingTimeoutRef.current);
    };
  }, [pathname]);

  useEffect(() => {
    function onAnchorClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;
      if (href === pathname) return;
      setRouteLoading(true);
    }
    document.addEventListener("click", onAnchorClick, true);
    return () => document.removeEventListener("click", onAnchorClick, true);
  }, [pathname]);

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
    if (authRoute) {
      return (
        <main className="mx-auto grid min-h-screen w-full max-w-7xl place-items-center px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      );
    }
    return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>;
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
    <div className="min-h-screen fade-in">
      {routeLoading ? (
        <div className="fixed inset-x-0 top-0 z-[100] h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500 animate-pulse" />
      ) : null}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-xs lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              Menu
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-sm font-bold text-white shadow-sm">
                SH
              </span>
              <span className="text-lg font-semibold tracking-tight text-slate-900">SignHub</span>
              <span className="ai-chip hidden sm:inline-flex">AI</span>
            </Link>
            <nav className="ml-4 hidden items-center gap-1 lg:flex">
              {TOP_NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-md px-3 py-2 text-sm transition ${
                      active ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-[10px] opacity-80">{item.icon}</span>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm transition hover:bg-slate-50"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <Initials user={user} />
              <span className="hidden sm:inline">{user?.email}</span>
            </button>
            {menuOpen ? (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
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
          className={`border-r border-slate-200/70 bg-white/85 px-3 py-4 backdrop-blur xl:px-4 lg:block ${mobileOpen ? "block" : "hidden"}`}
        >
          <nav className="space-y-1.5">
            {SIDE_NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group block rounded-lg px-3 py-2.5 text-sm transition ${
                    active ? "bg-blue-50 font-medium text-blue-800 shadow-sm ring-1 ring-blue-100" : "text-slate-600 hover:bg-slate-100"
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className={`text-[10px] ${active ? "text-blue-700" : "text-slate-400 group-hover:text-slate-600"}`}>{item.icon}</span>
                    {item.label}
                  </span>
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
