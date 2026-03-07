"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

  const total = data
    ? data.counts.needsMySignature + data.counts.waitingForOthers + data.counts.completed + data.counts.drafts
    : 0;

  if (!data) return <p className="text-sm text-slate-500">Loading dashboard...</p>;

  return (
    <div className="space-y-6">
      <section className="surface overflow-hidden p-0">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-800 p-7 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="ai-chip mb-3 border-white/20 bg-white/10 text-indigo-100">Control Center</p>
              <h1 className="text-3xl font-semibold tracking-tight">Agreement Command Center</h1>
              <p className="mt-2 text-slate-200">Live envelope intelligence and execution status.</p>
            </div>
            <button className="btn-secondary border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
        <div className="flex items-start justify-between">
          <div className="grid w-full grid-cols-2 gap-3 px-6 py-4 text-sm md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-700">
              <p className="text-xs text-slate-500">In Focus</p>
              <p className="mt-0.5 text-xl font-semibold">{data.counts.needsMySignature}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-700">
              <p className="text-xs text-slate-500">Active Pipelines</p>
              <p className="mt-0.5 text-xl font-semibold">{data.counts.waitingForOthers}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-700">
              <p className="text-xs text-slate-500">Completed</p>
              <p className="mt-0.5 text-xl font-semibold">{data.counts.completed}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-700">
              <p className="text-xs text-slate-500">Draft Queue</p>
              <p className="mt-0.5 text-xl font-semibold">{data.counts.drafts}</p>
            </div>
          </div>
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
            className="kpi-card"
          >
            <div className={`mb-3 h-1.5 rounded-full bg-gradient-to-r ${gradient}`} />
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          </Link>
        ))}
      </section>

      <section className="surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Envelopes</h2>
          <Link href="/upload" className="btn-primary">
            New Envelope
          </Link>
        </div>
        <div className="space-y-2">
          {data.recent.map((item) => (
            <Link
              href={item.status === "DRAFT" ? `/envelopes/${item.id}/prepare` : `/envelopes/${item.id}/tracking`}
              key={item.id}
              onClick={() => console.info("[dashboard] open envelope", item.id)}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 transition hover:border-blue-200 hover:shadow-sm"
            >
              <div>
                <p className="font-medium">{item.document?.title || "Untitled"}</p>
                <p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
              <span className={`status-${String(item.status).toLowerCase()}`}>{item.status}</span>
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
