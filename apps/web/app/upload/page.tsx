"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

type UploadResponse = {
  document: { id: string; title: string };
};

type EnvelopeResponse = {
  id: string;
};

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (!file) return setError("Select a PDF file");
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return setError("Only PDF files are supported");
    }

    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title || file.name);

      const uploaded = await api<UploadResponse>("/documents/upload", {
        method: "POST",
        body: formData,
        skipJsonContentType: true
      });

      const envelope = await api<EnvelopeResponse>("/envelopes", {
        method: "POST",
        body: JSON.stringify({
          documentId: uploaded.document.id,
          subject: `Please sign: ${uploaded.document.title}`,
          message: "Review and sign",
          recipients: []
        })
      });

      router.push(`/envelopes/${envelope.id}/prepare`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="surface overflow-hidden p-0">
        <div className="bg-gradient-to-r from-slate-900 to-sky-900 p-6 text-white">
          <h1 className="page-title text-white">Upload and Prepare</h1>
          <p className="page-subtitle text-slate-200">Upload a contract PDF to start a real signing workflow.</p>
        </div>
      </section>

      <div className="surface p-6">
        <label className="mb-2 block text-sm text-slate-600">Document title</label>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Service Agreement 2026"
        />
        <label className="mt-4 block cursor-pointer rounded-lg border border-dashed border-slate-300 p-10 text-center">
          <input className="hidden" type="file" accept=".pdf,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <p className="text-sm text-slate-500">{file ? file.name : "Choose PDF file"}</p>
        </label>
        <button
          className="btn-primary mt-4"
          onClick={onSubmit}
          disabled={loading}
        >
          {loading ? "Uploading..." : "Continue to Preparation"}
        </button>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
