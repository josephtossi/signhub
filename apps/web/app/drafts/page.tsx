"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type DraftEnvelope = {
  id: string;
  status: string;
  updatedAt: string;
  document: { id: string; title: string };
  recipients: { id: string; fullName: string; email: string }[];
  fields: { id: string }[];
};
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<DraftEnvelope[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<DraftEnvelope[]>("/envelopes?status=DRAFT&scope=owner")
      .then(setDrafts)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load drafts"));
  }, []);

  return (
    <div className="space-y-5">
      <section className="rounded-xl bg-gradient-to-r from-slate-900 to-cyan-900 p-6 text-white">
        <h1 className="text-2xl font-semibold">Draft Envelopes</h1>
        <p className="mt-1 text-slate-200">Open a draft to continue placing fields and send when ready.</p>
      </section>

      <section className="glass rounded-xl border border-white/70 p-4">
        {drafts.length === 0 ? (
          <p className="text-sm text-slate-500">No draft envelopes found.</p>
        ) : (
          <div className="space-y-3">
            {drafts.map((draft) => (
              <Link
                key={draft.id}
                href={`/envelopes/${draft.id}/prepare`}
                className="block rounded-lg border border-slate-200 bg-white p-4 transition hover:border-cyan-300 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{draft.document?.title || "Untitled draft"}</p>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs">{draft.status}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {draft.recipients.length} recipients, {draft.fields.length} fields, updated{" "}
                  {new Date(draft.updatedAt).toLocaleString()}
                </p>
                <div className="mt-2">
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(`${API_BASE}/envelopes/${draft.id}/download`, "_blank", "noopener,noreferrer");
                    }}
                  >
                    Download Latest PDF
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </section>
    </div>
  );
}
