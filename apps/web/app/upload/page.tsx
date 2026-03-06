"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card } from "@signhub/ui";
import { api } from "@/lib/api";

type CreatedDocument = { id: string };
type CreatedEnvelope = { id: string };

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [organizationId, setOrganizationId] = useState("");
  const [title, setTitle] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit() {
    if (!file) return setError("Select a PDF file");
    if (!organizationId) return setError("Organization ID is required");
    if (!token) return setError("JWT token is required");
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return setError("Only PDF files are supported");
    }

    setLoading(true);
    setError("");
    try {
      localStorage.setItem("signhub_token", token);

      const doc = await api<CreatedDocument>("/documents", {
        method: "POST",
        token,
        body: JSON.stringify({
          organizationId,
          title: title || file.name
        })
      });

      const formData = new FormData();
      formData.append("file", file);
      await api(`/documents/${doc.id}/upload`, {
        method: "POST",
        token,
        body: formData,
        skipJsonContentType: true
      });

      const envelope = await api<CreatedEnvelope>("/envelopes", {
        method: "POST",
        token,
        body: JSON.stringify({
          organizationId,
          documentId: doc.id,
          subject: `Please sign: ${title || file.name}`,
          message: "Review and sign",
          recipients: []
        })
      });

      router.push(`/prepare/${envelope.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload document");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Upload PDF</h1>
      <Card className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">Organization ID</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              placeholder="org_uuid"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">JWT Access Token</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="eyJhbGciOi..."
            />
          </label>
        </div>
        <label className="space-y-1 text-sm">
          <span className="text-slate-600">Document title</span>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="NDA 2026"
          />
        </label>
        <label className="block cursor-pointer rounded-lg border border-dashed border-slate-300 p-10 text-center">
          <input
            className="hidden"
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <p className="text-sm text-slate-500">{file ? file.name : "Select PDF to upload"}</p>
        </label>
        <Button onClick={onSubmit} disabled={loading}>
          {loading ? "Uploading..." : "Upload and Open Preparation"}
        </Button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </Card>
    </div>
  );
}

