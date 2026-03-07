"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

type Envelope = {
  id: string;
  status: string;
  updatedAt: string;
  document: { title: string };
  recipients: { id: string; email: string; status: string }[];
};

export default function TrackingIndexPage() {
  const searchParams = useSearchParams();
  const [inbox, setInbox] = useState<Envelope[]>([]);
  const [sent, setSent] = useState<Envelope[]>([]);
  const [completed, setCompleted] = useState<Envelope[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [inboxItems, sentItems, completedItems] = await Promise.all([
          api<Envelope[]>("/envelopes?scope=inbox&status=PENDING,SENT,VIEWED,PARTIALLY_SIGNED"),
          api<Envelope[]>("/envelopes?scope=owner&status=SENT,VIEWED,PARTIALLY_SIGNED"),
          api<Envelope[]>("/envelopes?scope=owner&status=COMPLETED")
        ]);
        console.info("[tracking] inbox envelopes", inboxItems.length);
        console.info("[tracking] sent envelopes", sentItems.length);
        console.info("[tracking] completed envelopes", completedItems.length);
        setInbox(inboxItems);
        setSent(sentItems);
        setCompleted(completedItems);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load tracking data";
        console.error("[tracking] load failed", msg);
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-xl bg-slate-200" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-56 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-56 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-56 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    );
  }

  const invalidParamError = searchParams.get("error") === "invalid-envelope-id";
  const hasAny = inbox.length > 0 || sent.length > 0 || completed.length > 0;

  return (
    <div className="space-y-5">
      <section className="surface overflow-hidden p-0">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-6 text-white">
          <h1 className="page-title text-white">Envelope Tracking</h1>
          <p className="page-subtitle text-slate-200">Monitor incoming signatures, sent envelopes, and completed agreements.</p>
        </div>
      </section>

      {invalidParamError ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Invalid envelope link detected. Please open an envelope from the list below.
        </section>
      ) : null}

      {error ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </section>
      ) : null}

      {!hasAny ? (
        <section className="surface p-6 text-sm text-slate-600">
          No envelopes are available yet. Upload a document to start a new signature workflow.
          <div className="mt-3">
            <Link href="/upload" className="btn-primary">
              Upload Document
            </Link>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="surface p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Needs My Signature</h2>
          <div className="space-y-2">
            {inbox.map((item) => {
              const statusClass = `status-${String(item.status).toLowerCase()}`;
              return (
                <Link key={item.id} href={`/envelopes/${item.id}/tracking`} className="block rounded-xl border border-slate-200 p-3 transition hover:border-blue-200 hover:bg-slate-50">
                  <p className="font-medium">{item.document?.title || "Untitled envelope"}</p>
                  <div className="mt-1">
                    <span className={statusClass}>{item.status}</span>
                  </div>
                </Link>
              );
            })}
            {inbox.length === 0 ? <p className="text-xs text-slate-500">No envelopes awaiting your signature.</p> : null}
          </div>
        </section>

        <section className="surface p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Waiting For Others</h2>
          <div className="space-y-2">
            {sent.map((item) => {
              const statusClass = `status-${String(item.status).toLowerCase()}`;
              return (
                <Link key={item.id} href={`/envelopes/${item.id}/tracking`} className="block rounded-xl border border-slate-200 p-3 transition hover:border-blue-200 hover:bg-slate-50">
                  <p className="font-medium">{item.document?.title || "Untitled envelope"}</p>
                  <div className="mt-1">
                    <span className={statusClass}>{item.status}</span>
                  </div>
                </Link>
              );
            })}
            {sent.length === 0 ? <p className="text-xs text-slate-500">No envelopes waiting on recipients.</p> : null}
          </div>
        </section>

        <section className="surface p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Completed</h2>
          <div className="space-y-2">
            {completed.map((item) => {
              const statusClass = `status-${String(item.status).toLowerCase()}`;
              return (
                <Link key={item.id} href={`/envelopes/${item.id}/tracking`} className="block rounded-xl border border-slate-200 p-3 transition hover:border-blue-200 hover:bg-slate-50">
                  <p className="font-medium">{item.document?.title || "Untitled envelope"}</p>
                  <div className="mt-1">
                    <span className={statusClass}>{item.status}</span>
                  </div>
                </Link>
              );
            })}
            {completed.length === 0 ? <p className="text-xs text-slate-500">No completed envelopes yet.</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
