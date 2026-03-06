"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Envelope = {
  id: string;
  status: string;
  completedAt?: string | null;
  documentId: string;
  document: { title: string };
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";

export default function CompletedPage() {
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api<Envelope[]>("/envelopes?status=COMPLETED&scope=owner")
      .then(setEnvelopes)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load completed envelopes"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Loading completed envelopes...</p>;

  return (
    <div className="space-y-5">
      <section className="rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 p-6 text-white">
        <h1 className="text-2xl font-semibold">Completed Envelopes</h1>
        <p className="mt-1 text-emerald-100">Download final signed documents and verify completion history.</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        {envelopes.length === 0 ? <p className="text-sm text-slate-500">No completed envelopes yet.</p> : null}
        <div className="space-y-2">
          {envelopes.map((env) => (
            <div key={env.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Link href={`/envelopes/${env.id}/tracking`} className="font-medium hover:underline">
                    {env.document?.title || "Untitled"}
                  </Link>
                  <p className="text-xs text-slate-500">
                    Completed {env.completedAt ? new Date(env.completedAt).toLocaleString() : "Unknown"}
                  </p>
                </div>
                <a
                  href={`${API_BASE}/documents/${env.documentId}/versions/latest/file`}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100"
                  target="_blank"
                  rel="noreferrer"
                >
                  Download PDF
                </a>
              </div>
            </div>
          ))}
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </section>
    </div>
  );
}
