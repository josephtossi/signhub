"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { API_URL, api } from "@/lib/api";

type DraftEnvelope = {
  id: string;
  status: string;
  updatedAt: string;
  document: { id: string; title: string };
  recipients: { id: string; fullName: string; email: string }[];
  fields: { id: string }[];
};
const API_BASE = API_URL;

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
      <section className="surface overflow-hidden p-0">
        <div className="bg-gradient-to-r from-slate-900 to-cyan-900 p-6 text-white">
          <h1 className="page-title text-white">Draft Envelopes</h1>
          <p className="page-subtitle text-slate-200">Open a draft to continue placing fields and send when ready.</p>
        </div>
      </section>

      <section className="surface p-4">
        {drafts.length === 0 ? (
          <div className="surface-soft p-6 text-sm text-slate-600">No draft envelopes found.</div>
        ) : (
          <div className="space-y-3">
            {drafts.map((draft) => (
              <Link
                key={draft.id}
                href={`/envelopes/${draft.id}/prepare`}
                className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-cyan-300 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{draft.document?.title || "Untitled draft"}</p>
                  <span className={`status-${String(draft.status).toLowerCase()}`}>{draft.status}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {draft.recipients.length} recipients, {draft.fields.length} fields, updated{" "}
                  {new Date(draft.updatedAt).toLocaleString()}
                </p>
                <div className="mt-2">
                  <button
                    type="button"
                    className="btn-secondary px-2 py-1 text-xs"
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
