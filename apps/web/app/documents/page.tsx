"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Membership = {
  organizationId: string;
};

type MeResponse = {
  memberships: Membership[];
};

type DocumentItem = {
  id: string;
  title: string;
  createdAt: string;
  versions: { id: string; createdAt: string }[];
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const me = await api<MeResponse>("/auth/me");
        const orgId = me.memberships?.[0]?.organizationId;
        if (!orgId) {
          setDocuments([]);
          return;
        }
        const docs = await api<DocumentItem[]>(`/documents?organizationId=${encodeURIComponent(orgId)}`);
        setDocuments(docs);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load documents");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading documents...</p>;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl bg-gradient-to-r from-slate-900 to-cyan-900 p-6 text-white">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <p className="mt-1 text-slate-200">Manage your uploaded files and continue workflows.</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">All Documents</h2>
          <Link href="/upload" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
            Upload New
          </Link>
        </div>

        {documents.length === 0 ? <p className="text-sm text-slate-500">No documents yet.</p> : null}
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="rounded-md border border-slate-200 p-3">
              <p className="font-medium">{doc.title}</p>
              <p className="text-xs text-slate-500">
                Versions: {doc.versions.length} | Created: {new Date(doc.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </section>
    </div>
  );
}
