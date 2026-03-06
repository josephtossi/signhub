"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Envelope = {
  id: string;
  status: string;
  documentId: string;
  createdAt: string;
  completedAt?: string | null;
  document: { title: string };
  recipients: { id: string; email: string; fullName: string; status: string; signedAt?: string | null }[];
  signatures: { id: string; signedAt: string; recipientId: string }[];
};

export default function TrackingPage({ params }: { params: { envelopeId: string } }) {
  const [envelope, setEnvelope] = useState<Envelope | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";

  useEffect(() => {
    api<Envelope>(`/envelopes/${params.envelopeId}`).then(setEnvelope).catch(() => null);
  }, [params.envelopeId]);

  if (!envelope) return <p className="text-sm text-slate-500">Loading envelope...</p>;

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-gradient-to-r from-slate-900 to-indigo-900 p-6 text-white">
        <h1 className="text-2xl font-semibold">{envelope.document?.title || "Envelope"}</h1>
        <p className="mt-1 text-slate-200">Status: {envelope.status}</p>
        {envelope.status === "COMPLETED" ? (
          <a
            href={`${apiBase}/documents/${envelope.documentId}/versions/latest/file`}
            className="mt-3 inline-block rounded-md border border-white/30 px-3 py-1.5 text-sm"
            target="_blank"
            rel="noreferrer"
          >
            Download Signed PDF
          </a>
        ) : null}
      </section>

      <section className="glass rounded-xl border border-white/70 p-5">
        <h2 className="mb-3 text-lg font-semibold">Recipients</h2>
        <div className="space-y-2">
          {envelope.recipients.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3">
              <div>
                <p className="font-medium">{r.fullName}</p>
                <p className="text-xs text-slate-500">{r.email}</p>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium">{r.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
