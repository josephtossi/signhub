"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card } from "@signhub/ui";
import { api } from "@/lib/api";
import { PdfPrepareCanvas, SignatureField } from "@/components/pdf-prepare-canvas";

type EnvelopeStatus = {
  id: string;
  documentId: string;
};

type DbField = {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: "SIGNATURE";
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";

export default function PreparePage({ params }: { params: { envelopeId: string } }) {
  const [token, setToken] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [fields, setFields] = useState<SignatureField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = localStorage.getItem("signhub_token") || "";
    setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    async function load() {
      try {
        setLoading(true);
        const envelope = await api<EnvelopeStatus>(`/envelopes/${params.envelopeId}/status`, { token });
        setDocumentId(envelope.documentId);
        const existing = await api<DbField[]>(`/envelopes/${params.envelopeId}/fields`, { token });
        setFields(
          existing
            .filter((f) => f.type === "SIGNATURE")
            .map((f) => ({
              id: f.id,
              page: f.page,
              x: f.x,
              y: f.y,
              width: f.width,
              height: f.height
            }))
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load preparation");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.envelopeId, token]);

  const fileUrl = useMemo(
    () => (documentId ? `${API_BASE}/documents/${documentId}/versions/latest/file` : ""),
    [documentId]
  );

  async function saveFields() {
    if (!token) {
      setError("Missing access token. Upload first or set token in localStorage.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api(`/envelopes/${params.envelopeId}/fields`, {
        method: "POST",
        token,
        body: JSON.stringify({
          fields: fields.map((f) => ({
            type: "SIGNATURE",
            page: f.page,
            x: Number(f.x.toFixed(6)),
            y: Number(f.y.toFixed(6)),
            width: Number(f.width.toFixed(6)),
            height: Number(f.height.toFixed(6))
          }))
        })
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save fields");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
      <Card className="space-y-4">
        <h1 className="text-lg font-semibold">Prepare Envelope</h1>
        <p className="text-sm text-slate-500">Drag the signature block to the PDF. Then click save.</p>
        <div
          draggable
          onDragStart={(e) => e.dataTransfer.setData("application/x-signature-field", "SIGNATURE")}
          className="cursor-grab rounded-md border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm text-indigo-700"
        >
          Drag Signature Field
        </div>
        <p className="text-xs text-slate-500">Coordinates are saved normalized (0..1) to support any viewport size.</p>
        <Button className="w-full" onClick={saveFields} disabled={saving || loading}>
          {saving ? "Saving..." : "Save Field Coordinates"}
        </Button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </Card>
      <Card>
        {loading ? (
          <p className="text-sm text-slate-500">Loading document...</p>
        ) : fileUrl && token ? (
          <PdfPrepareCanvas fileUrl={fileUrl} token={token} fields={fields} setFields={setFields} />
        ) : (
          <p className="text-sm text-slate-500">Missing document or token.</p>
        )}
      </Card>
    </div>
  );
}

