"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { PdfPrepareCanvas, SignatureField } from "@/components/pdf-prepare-canvas";

type Envelope = {
  id: string;
  documentId: string;
  recipients: { id: string; email: string; fullName: string }[];
  fields: { id: string; page: number; x: number; y: number; width: number; height: number; type: string }[];
};

type AiAnalysis = {
  summary: string;
  clauses: { type: string; text: string }[];
  risks: string[];
  suggestedFields: { type: string; page: number; label: string }[];
  parties: string[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";

export default function PreparePage({ params }: { params: { envelopeId: string } }) {
  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [fields, setFields] = useState<SignatureField[]>([]);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [ai, setAi] = useState<AiAnalysis | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await api<Envelope>(`/envelopes/${params.envelopeId}`);
        setEnvelope(data);
        setFields(
          (data.fields || [])
            .filter((f) => f.type === "SIGNATURE")
            .map((f) => ({ id: f.id, page: f.page, x: f.x, y: f.y, width: f.width, height: f.height }))
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load envelope");
      }
    }
    load();
  }, [params.envelopeId]);

  const fileUrl = useMemo(
    () => (envelope ? `${API_BASE}/documents/${envelope.documentId}/versions/latest/file` : ""),
    [envelope]
  );

  async function saveFields() {
    await api(`/envelopes/${params.envelopeId}/fields`, {
      method: "POST",
      body: JSON.stringify({
        fields: fields.map((f) => ({ type: "SIGNATURE", page: f.page, x: f.x, y: f.y, width: f.width, height: f.height }))
      })
    });
  }

  async function addRecipient() {
    if (!recipientEmail || !recipientName) return;
    const recipients = [...(envelope?.recipients || []), { id: "", email: recipientEmail, fullName: recipientName }];
    const updated = await api<{ id: string; email: string; fullName: string }[]>(`/envelopes/${params.envelopeId}/recipients`, {
      method: "POST",
      body: JSON.stringify({ recipients })
    });
    setEnvelope((prev) => (prev ? { ...prev, recipients: updated } : prev));
    setRecipientName("");
    setRecipientEmail("");
  }

  async function sendEnvelope() {
    await saveFields();
    await api(`/envelopes/${params.envelopeId}/send`, { method: "POST" });
    alert("Envelope sent.");
  }

  async function analyze() {
    if (!envelope) return;
    const result = await api<AiAnalysis>("/ai/analyze-document", {
      method: "POST",
      body: JSON.stringify({ documentId: envelope.documentId })
    });
    setAi(result);
  }

  async function ask() {
    if (!envelope || !question) return;
    const result = await api<{ answer: string }>("/ai/chat", {
      method: "POST",
      body: JSON.stringify({ documentId: envelope.documentId, question })
    });
    setAnswer(result.answer);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px,1fr,360px]">
      <section className="glass rounded-xl border border-white/70 p-4">
        <h2 className="text-lg font-semibold">Envelope Setup</h2>
        <p className="mt-1 text-sm text-slate-500">Add recipients, place signature fields, then send.</p>
        <div className="mt-4 rounded-md border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm text-indigo-700" draggable onDragStart={(e) => e.dataTransfer.setData("application/x-signature-field", "SIGNATURE")}>
          Drag Signature Field
        </div>
        <div className="mt-4 space-y-2">
          <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Recipient name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
          <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Recipient email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} />
          <button className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white" onClick={addRecipient}>
            Add Recipient
          </button>
        </div>
        <div className="mt-3 space-y-1 text-xs text-slate-600">
          {(envelope?.recipients || []).map((r) => (
            <p key={r.email}>{r.fullName} - {r.email}</p>
          ))}
        </div>
        <button className="mt-4 w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white" onClick={sendEnvelope}>
          Save & Send
        </button>
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      </section>

      <section className="glass rounded-xl border border-white/70 p-4">
        {fileUrl ? <PdfPrepareCanvas fileUrl={fileUrl} fields={fields} setFields={setFields} /> : <p>Loading PDF...</p>}
      </section>

      <aside className="glass rounded-xl border border-white/70 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">AI Contract Assistant</h3>
          <button className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white" onClick={analyze}>
            Analyze
          </button>
        </div>
        {ai ? (
          <div className="space-y-3 text-sm">
            <p className="rounded-md bg-slate-100 p-2">{ai.summary}</p>
            <div>
              <p className="font-medium">Risks</p>
              <ul className="list-disc pl-4">
                {ai.risks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium">Key Clauses</p>
              <ul className="space-y-1">
                {ai.clauses.map((c) => (
                  <li key={c.type}>
                    <button
                      className="text-left text-indigo-700 underline"
                      onClick={async () => {
                        const x = await api<{ explanation: string }>("/ai/explain-clause", {
                          method: "POST",
                          body: JSON.stringify({ clause: c.text })
                        });
                        alert(x.explanation);
                      }}
                    >
                      {c.type}: {c.text}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Run analysis to get summary, risks, parties, and suggestions.</p>
        )}
        <div className="mt-4 space-y-2">
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Ask about this contract..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white" onClick={ask}>
            Ask AI
          </button>
          {answer ? <p className="rounded-md bg-slate-100 p-2 text-sm">{answer}</p> : null}
        </div>
      </aside>
    </div>
  );
}

