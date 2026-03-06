"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type DashboardData = {
  counts: {
    needsMySignature: number;
    waitingForOthers: number;
    completed: number;
    drafts: number;
  };
  recent: {
    id: string;
    status: string;
    createdAt: string;
    document: { title: string };
    recipients: { email: string; status: string }[];
  }[];
  nextToSign: {
    envelopeId: string;
    recipientId: string;
    status: string;
    documentTitle: string;
  } | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        await api("/auth/me");
        const summary = await api<DashboardData>("/dashboard");
        setData(summary);
      } catch {
        router.push("/login");
      }
    }
    load();
  }, [router]);

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const total = useMemo(() => {
    if (!data) return 0;
    const c = data.counts;
    return c.needsMySignature + c.waitingForOthers + c.completed + c.drafts;
  }, [data]);

  if (!data) return <p className="text-sm text-slate-500">Loading dashboard...</p>;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-900 to-cyan-800 p-7 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Agreement Command Center</h1>
            <p className="mt-2 text-slate-200">Live envelope intelligence and execution status.</p>
          </div>
          <button className="rounded-lg border border-white/30 px-4 py-2 text-sm" onClick={logout}>
            Logout
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          [
            "Needs My Signature",
            data.counts.needsMySignature,
            "from-amber-400 to-orange-500",
            data.nextToSign ? `/envelopes/${data.nextToSign.envelopeId}/tracking` : "/tracking"
          ],
          ["Waiting For Others", data.counts.waitingForOthers, "from-blue-500 to-indigo-600", "/sent"],
          ["Completed", data.counts.completed, "from-emerald-400 to-green-600", "/completed"],
          ["Drafts", data.counts.drafts, "from-slate-400 to-slate-600", "/drafts"]
        ].map(([label, value, gradient, href]) => (
          <Link
            key={String(label)}
            href={String(href)}
            onClick={() => console.info("[dashboard] navigate", label, href)}
            className="glass rounded-xl border border-white/70 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className={`mb-3 h-1.5 rounded-full bg-gradient-to-r ${gradient}`} />
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-semibold">{value}</p>
          </Link>
        ))}
      </section>

      <section className="glass rounded-xl border border-white/70 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Envelopes</h2>
          <Link href="/upload" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
            New Envelope
          </Link>
        </div>
        <div className="space-y-2">
          {data.recent.map((item) => (
            <Link
              href={item.status === "DRAFT" ? `/envelopes/${item.id}/prepare` : `/envelopes/${item.id}/tracking`}
              key={item.id}
              onClick={() => console.info("[dashboard] open envelope", item.id)}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/70 p-3 transition hover:bg-white"
            >
              <div>
                <p className="font-medium">{item.document?.title || "Untitled"}</p>
                <p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium">{item.status}</span>
            </Link>
          ))}
          {data.recent.length === 0 ? <p className="text-sm text-slate-500">No envelopes yet.</p> : null}
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <p className="text-xs text-slate-500">Total envelopes in view: {total}</p>
    </div>
  );
}
