"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { API_URL, api } from "@/lib/api";

type Envelope = {
  id: string;
  status: string;
  documentId: string;
  createdAt: string;
  completedAt?: string | null;
  document: { title: string };
  recipients: { id: string; email: string; fullName: string; status: string; signedAt?: string | null }[];
};

type DocumentMeta = {
  id: string;
  title: string;
  versions: { id: string; createdAt: string }[];
};

export function EnvelopeTrackingPage({ envelopeId }: { envelopeId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [documentMeta, setDocumentMeta] = useState<DocumentMeta | null>(null);
  const [mySigningUrl, setMySigningUrl] = useState<string | null>(null);
  const apiBase = API_URL;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(envelopeId);

  useEffect(() => {
    if (!isUuid) {
      setLoading(false);
      setError("Invalid envelope ID.");
      return;
    }
    let cancelled = false;
    const load = async (initial = false) => {
      if (initial) setLoading(true);
      setError("");
      try {
        const [full, status] = await Promise.all([
          api<Envelope>(`/envelopes/${envelopeId}`),
          api<Envelope>(`/envelopes/${envelopeId}/status`)
        ]);
        if (cancelled) return;
        setEnvelope({ ...full, status: status.status || full.status });
        try {
          const mine = await api<{ canSign: boolean; signingUrl?: string }>("/envelopes/" + envelopeId + "/my-signing-link");
          if (!cancelled) setMySigningUrl(mine.canSign ? mine.signingUrl || null : null);
        } catch {
          if (!cancelled) setMySigningUrl(null);
        }
        try {
          const doc = await api<DocumentMeta>(`/documents/${full.documentId}`);
          if (!cancelled) setDocumentMeta(doc);
        } catch {
          if (!cancelled) setDocumentMeta(null);
        }
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Failed to load envelope";
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load(true);
    const interval = window.setInterval(() => load(false), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [envelopeId, isUuid]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-28 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }
  if (error) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-5">
        <h1 className="text-lg font-semibold text-red-700">Envelope not found</h1>
        <p className="mt-2 text-sm text-red-600">{error}</p>
        <Link href="/tracking" className="mt-3 inline-block rounded-md bg-slate-900 px-3 py-2 text-sm text-white">
          Back to Tracking
        </Link>
      </section>
    );
  }
  if (!envelope) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-600">Envelope data is unavailable.</p>
      </section>
    );
  }

  const signedCount = envelope.recipients.filter((r) => r.status === "SIGNED").length;
  const totalSigners = envelope.recipients.length || 1;
  const progress = Math.round((signedCount / totalSigners) * 100);
  const isDraft = envelope.status === "DRAFT";

  return (
    <div className="space-y-6">
      <section className="surface overflow-hidden p-0">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{envelope.document?.title || "Envelope"}</h1>
            <p className="mt-1 text-slate-200">Status: {envelope.status}</p>
            <p className="mt-1 text-xs text-slate-300">Created {new Date(envelope.createdAt).toLocaleString()}</p>
            <p className="mt-1 text-xs text-slate-300">Versions: {documentMeta?.versions?.length || 0}</p>
            {envelope.completedAt ? (
              <p className="mt-1 text-xs text-slate-300">Completed {new Date(envelope.completedAt).toLocaleString()}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {isDraft ? (
              <Link href={`/envelopes/${envelope.id}/prepare`} className="btn-secondary border-white/30 bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">
                Edit Draft
              </Link>
            ) : null}
            {mySigningUrl ? (
              <a
                href={mySigningUrl}
                className="btn-primary bg-emerald-600 px-3 py-1.5 text-sm"
              >
                Sign Now
              </a>
            ) : null}
            <a
              href={`${apiBase}/envelopes/${envelope.id}/download`}
              className="btn-secondary border-white/30 bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
              target="_blank"
              rel="noreferrer"
            >
              Download Latest PDF
            </a>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-200">
            <span>Signing progress</span>
            <span>
              {signedCount}/{totalSigners}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/20">
            <div className="h-2 rounded-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="mb-3 text-lg font-semibold">Recipients</h2>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Signed At</th>
              </tr>
            </thead>
            <tbody>
              {envelope.recipients.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.fullName}</td>
                  <td>{r.email}</td>
                  <td>
                    <span className={`status-${String(r.status).toLowerCase()}`}>{r.status}</span>
                  </td>
                  <td>{r.signedAt ? new Date(r.signedAt).toLocaleString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
