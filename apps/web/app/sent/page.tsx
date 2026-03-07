"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Envelope = {
  id: string;
  status: string;
  updatedAt: string;
  document: { title: string };
  recipients: { id: string; fullName: string; email: string; status: string }[];
};

export default function SentPage() {
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api<Envelope[]>("/envelopes?status=SENT,VIEWED,PARTIALLY_SIGNED&scope=owner")
      .then(setEnvelopes)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load sent envelopes"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Loading sent envelopes...</p>;

  return (
    <div className="space-y-5">
      <section className="surface overflow-hidden p-0">
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-6 text-white">
          <h1 className="page-title text-white">Sent Envelopes</h1>
          <p className="page-subtitle text-slate-200">Waiting for recipients to complete signatures.</p>
        </div>
      </section>

      <section className="surface p-4">
        {envelopes.length === 0 ? <p className="text-sm text-slate-500">No sent envelopes.</p> : null}
        <div className="space-y-3">
          {envelopes.map((env) => (
            <Link key={env.id} href={`/envelopes/${env.id}/tracking`} className="block rounded-xl border border-slate-200 p-3 transition hover:border-blue-200 hover:bg-slate-50">
              <div className="flex items-center justify-between">
                <p className="font-medium">{env.document?.title || "Untitled"}</p>
                <span className={`status-${String(env.status).toLowerCase()}`}>{env.status}</span>
              </div>
              <p className="text-xs text-slate-500">Updated {new Date(env.updatedAt).toLocaleString()}</p>
            </Link>
          ))}
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </section>
    </div>
  );
}
