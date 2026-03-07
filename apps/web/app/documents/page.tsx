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
      <section className="surface overflow-hidden p-0">
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 p-6 text-white">
          <h1 className="page-title text-white">Documents</h1>
          <p className="page-subtitle text-slate-200">Manage your uploaded files and continue workflows.</p>
        </div>
      </section>

      <section className="surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">All Documents</h2>
          <Link href="/upload" className="btn-primary">
            Upload New
          </Link>
        </div>

        {documents.length === 0 ? <p className="text-sm text-slate-500">No documents yet.</p> : null}
        {documents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Versions</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td className="font-medium text-slate-900">{doc.title}</td>
                    <td>{doc.versions.length}</td>
                    <td>{new Date(doc.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </section>
    </div>
  );
}
