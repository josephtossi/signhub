"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { DraftField, DraftFieldType, PdfPrepareCanvas } from "@/components/pdf-prepare-canvas";

type Recipient = {
  id: string;
  email: string;
  fullName: string;
  role?: string;
  routingOrder?: number;
};

type Envelope = {
  id: string;
  status: string;
  documentId: string;
  document: { id: string; title: string; versions: { id: string; createdAt: string }[] };
  recipients: Recipient[];
  fields: DraftField[];
};

type Me = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

type AiAnalysis = {
  summary: string;
  clauses: { type: string; text: string }[];
  risks: string[];
  suggestedFields: { type: string; page: number; label: string }[];
  parties: string[];
};

type AiStatus = {
  enabled: boolean;
  provider?: "openai" | "heuristic";
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";
const FIELD_TYPES: DraftFieldType[] = ["SIGNATURE", "INITIAL", "DATE", "TEXT", "CHECKBOX"];

function fieldLabel(type: DraftFieldType) {
  switch (type) {
    case "SIGNATURE":
      return "Signature";
    case "INITIAL":
      return "Initial";
    case "DATE":
      return "Date";
    case "TEXT":
      return "Text";
    case "CHECKBOX":
      return "Checkbox";
    default:
      return type;
  }
}

export default function PreparePage({ params }: { params: { envelopeId: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const [me, setMe] = useState<Me | null>(null);
  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [fields, setFields] = useState<DraftField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [ai, setAi] = useState<AiAnalysis | null>(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiProvider, setAiProvider] = useState<"openai" | "heuristic">("heuristic");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [placingType, setPlacingType] = useState<DraftFieldType | null>(null);
  const envelopeId = params?.envelopeId || "";
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(envelopeId);

  useEffect(() => {
    if (!isUuid) {
      setError("Invalid envelope ID.");
      setLoading(false);
      return;
    }
    async function load() {
      setLoading(true);
      setError("");
      try {
        console.info("[prepare] envelopeId", envelopeId);
        const [currentUser, draft] = await Promise.all([
          api<Me>("/auth/me"),
          api<Envelope>(`/envelopes/${envelopeId}`)
        ]);
        console.info("[prepare] loaded envelope status", draft.status);
        setMe(currentUser);
        setEnvelope(draft);
        setFields(draft.fields || []);
        api<AiStatus>("/ai/status")
          .then((s) => {
            setAiEnabled(s.enabled);
            setAiProvider(s.provider || "heuristic");
          })
          .catch(() => setAiEnabled(false));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load draft");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [envelopeId, isUuid]);

  const fileUrl = useMemo(() => {
    if (!envelope) return "";
    return `${API_BASE}/documents/${envelope.documentId}/versions/latest/file`;
  }, [envelope]);

  const selectedField = useMemo(
    () => fields.find((f) => f.id === selectedFieldId) || null,
    [fields, selectedFieldId]
  );

  async function saveRecipients(nextRecipients: Recipient[]) {
    if (!envelope) return;
    const updated = await api<Recipient[]>(`/envelopes/${envelope.id}/recipients`, {
      method: "POST",
      body: JSON.stringify({
        recipients: nextRecipients.map((r, index) => ({
          email: r.email,
          fullName: r.fullName,
          role: r.role || "SIGNER",
          routingOrder: r.routingOrder || index + 1
        }))
      })
    });
    setEnvelope({ ...envelope, recipients: updated });
  }

  async function addRecipient() {
    if (!envelope || !recipientName || !recipientEmail) return;
    const nextRecipients = [...envelope.recipients, { id: "", fullName: recipientName, email: recipientEmail, role: "SIGNER" }];
    try {
      await saveRecipients(nextRecipients);
      setRecipientName("");
      setRecipientEmail("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add recipient");
    }
  }

  async function addMeAsRecipient() {
    if (!envelope || !me) return;
    if (envelope.recipients.some((r) => r.email.toLowerCase() === me.email.toLowerCase())) return;
    const name = `${me.firstName || ""} ${me.lastName || ""}`.trim() || me.email;
    try {
      await saveRecipients([...envelope.recipients, { id: "", fullName: name, email: me.email, role: "SIGNER" }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add yourself");
    }
  }

  async function saveDraft() {
    if (!envelope) return;
    setSaving(true);
    setError("");
    try {
      const payload = fields.map((f) => ({
        id: f.id,
        recipientId: f.recipientId,
        type: f.type,
        page: f.page,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        label: f.label,
        required: f.required ?? true,
        value: f.value
      }));
      const persisted = await api<DraftField[]>(`/envelopes/${envelope.id}/fields`, {
        method: "POST",
        body: JSON.stringify({ fields: payload })
      });
      setFields(persisted);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save draft");
    } finally {
      setSaving(false);
    }
  }

  async function sendEnvelope() {
    if (!envelope) return;
    setSending(true);
    setError("");
    try {
      await saveDraft();
      await api(`/envelopes/${envelope.id}/send`, { method: "POST" });
      router.push(`/envelopes/${envelope.id}/tracking`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send envelope");
    } finally {
      setSending(false);
    }
  }

  function updateSelected(patch: Partial<DraftField>) {
    if (!selectedFieldId) return;
    setFields((prev) => prev.map((f) => (f.id === selectedFieldId ? { ...f, ...patch } : f)));
  }

  function deleteSelectedField() {
    if (!selectedFieldId) return;
    setFields((prev) => prev.filter((f) => f.id !== selectedFieldId));
    setSelectedFieldId(null);
  }

  async function analyzeContract() {
    if (!envelope) return;
    try {
      const result = await api<AiAnalysis>("/ai/analyze-document", {
        method: "POST",
        body: JSON.stringify({ documentId: envelope.documentId })
      });
      setAi(result);
      setAnswer("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI analysis failed");
    }
  }

  async function askAi() {
    if (!envelope || !question.trim()) return;
    try {
      const result = await api<{ answer: string }>("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ documentId: envelope.documentId, question: question.trim() })
      });
      setAnswer(result.answer);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI chat failed");
    }
  }

  async function explainClause(clause: string) {
    try {
      const result = await api<{ explanation: string }>("/ai/explain-clause", {
        method: "POST",
        body: JSON.stringify({ clause })
      });
      setAnswer(result.explanation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Clause explanation failed");
    }
  }

  const handlePdfError = useCallback((message: string) => {
    setError(`PDF render failed: ${message}`);
  }, []);

  if (loading) {
    return (
      <div className="grid gap-5 lg:grid-cols-[290px,1fr,320px]">
        <div className="h-[520px] animate-pulse rounded-xl bg-slate-100" />
        <div className="h-[520px] animate-pulse rounded-xl bg-slate-100" />
        <div className="h-[520px] animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (!envelope) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-5">
        <h1 className="text-lg font-semibold text-red-700">Unable to open draft</h1>
        <p className="mt-2 text-sm text-red-600">{error || "Envelope not found or not accessible."}</p>
      </section>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[290px,1fr,320px]">
      <section className="glass rounded-xl border border-white/70 p-4">
        <h2 className="text-lg font-semibold">Prepare Envelope</h2>
        <p className="mt-1 text-sm text-slate-500">{envelope.document?.title || "Untitled document"}</p>
        <p className="mt-1 text-xs text-slate-400">Status: {envelope.status}</p>

        <div className="mt-4 grid gap-2">
          {FIELD_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              draggable
              onDragStart={(e) => e.dataTransfer.setData("application/x-field-type", type)}
              onClick={() => setPlacingType(type)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm font-medium transition hover:border-cyan-400 hover:bg-cyan-50"
            >
              {placingType === type ? `Tap on PDF to place ${fieldLabel(type)}` : `Drag or Tap ${fieldLabel(type)}`}
            </button>
          ))}
        </div>
        {placingType ? (
          <button
            type="button"
            className="mt-2 w-full rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800"
            onClick={() => setPlacingType(null)}
          >
            Cancel placement mode ({fieldLabel(placingType)})
          </button>
        ) : null}

        <div className="mt-5 border-t border-slate-200 pt-4">
          <p className="text-sm font-medium">Recipients</p>
          <div className="mt-2 space-y-2">
            {envelope.recipients.map((r) => (
              <button
                key={r.id}
                type="button"
                className="block w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-left text-xs"
              >
                <div className="font-medium">{r.fullName}</div>
                <div className="text-slate-500">{r.email}</div>
              </button>
            ))}
            {envelope.recipients.length === 0 ? <p className="text-xs text-slate-500">No recipients yet.</p> : null}
          </div>
          <button
            type="button"
            className="mt-2 w-full rounded-md border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700"
            onClick={addMeAsRecipient}
          >
            Add Myself as Signer
          </button>
          <input
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Recipient name"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
          />
          <input
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Recipient email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
          />
          <button
            type="button"
            className="mt-2 w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
            onClick={addRecipient}
          >
            Add Recipient
          </button>
        </div>

        <div className="mt-5 grid gap-2">
          <a
            href={`${API_BASE}/envelopes/${envelope.id}/download`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-center text-sm font-medium text-slate-700"
          >
            Download Latest PDF
          </a>
          <button
            type="button"
            className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            onClick={saveDraft}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            onClick={sendEnvelope}
            disabled={sending || envelope.recipients.length === 0}
          >
            {sending ? "Sending..." : "Send Envelope"}
          </button>
        </div>
      </section>

      <section className="glass rounded-xl border border-white/70 p-4">
        {fileUrl ? (
          <PdfPrepareCanvas
            fileUrl={fileUrl}
            fields={fields}
            selectedFieldId={selectedFieldId}
            signaturePreviewText={`${me?.firstName || ""} ${me?.lastName || ""}`.trim() || me?.email || "Your Signature"}
            placingType={placingType}
            onPlacedField={() => setPlacingType(null)}
            onSelectField={setSelectedFieldId}
            onFieldsChange={setFields}
            onError={handlePdfError}
          />
        ) : (
          <div className="grid h-[500px] place-items-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
            Document preview unavailable.
          </div>
        )}
      </section>

      <aside className="glass rounded-xl border border-white/70 p-4">
        <h3 className="text-lg font-semibold">Field Inspector</h3>
        {!selectedField ? (
          <p className="mt-2 text-sm text-slate-500">Select a field on the PDF canvas to edit it.</p>
        ) : (
          <div className="mt-3 space-y-2 text-sm">
            <p className="rounded-md bg-cyan-50 px-2 py-1 text-cyan-700">{fieldLabel(selectedField.type)}</p>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">Label</span>
              <input
                className="w-full rounded-md border border-slate-300 px-2 py-2"
                value={selectedField.label || ""}
                onChange={(e) => updateSelected({ label: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">Assigned recipient</span>
              <select
                className="w-full rounded-md border border-slate-300 px-2 py-2"
                value={selectedField.recipientId || ""}
                onChange={(e) => updateSelected({ recipientId: e.target.value || undefined })}
              >
                <option value="">Unassigned</option>
                {envelope.recipients.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fullName} ({r.email})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={selectedField.required ?? true}
                onChange={(e) => updateSelected({ required: e.target.checked })}
              />
              Required field
            </label>
            <button
              type="button"
              className="w-full rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white"
              onClick={deleteSelectedField}
            >
              Remove Field
            </button>
          </div>
        )}

        <div className="mt-6 border-t border-slate-200 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold">AI Insights</h4>
            <button
              type="button"
              className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white"
              onClick={analyzeContract}
              disabled={!aiEnabled}
            >
              Analyze
            </button>
          </div>
          <p className="mb-2 text-xs text-slate-600">
            Provider: {aiProvider === "openai" ? "OpenAI" : "Built-in heuristic (no API key required)"}
          </p>
          {ai ? (
            <div className="space-y-2 text-xs text-slate-700">
              <p className="rounded-md bg-slate-100 p-2">{ai.summary}</p>
              {ai.risks.length > 0 ? (
                <div>
                  <p className="font-semibold">Risks</p>
                  <ul className="list-disc pl-4">
                    {ai.risks.map((risk) => (
                      <li key={risk}>{risk}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {ai.clauses.length > 0 ? (
                <div>
                  <p className="font-semibold">Key Clauses</p>
                  <div className="space-y-1">
                    {ai.clauses.slice(0, 6).map((clause) => (
                      <button
                        key={`${clause.type}-${clause.text.slice(0, 30)}`}
                        type="button"
                        className="block text-left text-indigo-700 underline"
                        onClick={() => explainClause(clause.text)}
                      >
                        {clause.type}: {clause.text.slice(0, 80)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Run AI analysis to view summary, clauses, and risk warnings.</p>
          )}

          <div className="mt-3 space-y-2">
            <input
              className="w-full rounded-md border border-slate-300 px-2 py-2 text-xs"
              placeholder="Ask about this contract..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button
              type="button"
              className="w-full rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white"
              onClick={askAi}
            >
              Ask AI
            </button>
            {answer ? <p className="rounded-md bg-slate-100 p-2 text-xs">{answer}</p> : null}
          </div>
        </div>

        {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}
      </aside>
    </div>
  );
}
