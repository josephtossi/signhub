"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type AiStatus = { enabled: boolean };

type Membership = { organizationId: string };
type MeResponse = { memberships: Membership[] };
type DocumentItem = { id: string; title: string };

type AiAnalysis = {
  summary: string;
  clauses: { type: string; text: string }[];
  risks: string[];
  suggestedFields: { type: string; page: number; label: string }[];
  parties: string[];
};

export default function AiInsightsPage() {
  const [enabled, setEnabled] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [documentId, setDocumentId] = useState("");
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const [status, me] = await Promise.all([api<AiStatus>("/ai/status"), api<MeResponse>("/auth/me")]);
        setEnabled(status.enabled);
        const orgId = me.memberships?.[0]?.organizationId;
        if (!orgId) return;
        const docs = await api<DocumentItem[]>(`/documents?organizationId=${encodeURIComponent(orgId)}`);
        setDocuments(docs);
        if (docs[0]) setDocumentId(docs[0].id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to initialize AI assistant");
      }
    }
    init();
  }, []);

  async function analyze() {
    if (!documentId) return;
    setLoading(true);
    setError("");
    try {
      const result = await api<AiAnalysis>("/ai/analyze-document", {
        method: "POST",
        body: JSON.stringify({ documentId })
      });
      setAnalysis(result);
      setAnswer("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  async function ask() {
    if (!documentId || !question.trim()) return;
    try {
      const result = await api<{ answer: string }>("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ documentId, question: question.trim() })
      });
      setAnswer(result.answer);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI chat failed");
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl bg-gradient-to-r from-slate-900 to-violet-900 p-6 text-white">
        <h1 className="text-2xl font-semibold">AI Smart Contract Assistant</h1>
        <p className="mt-1 text-slate-200">Summaries, clause extraction, risk checks, and contract Q&A.</p>
      </section>

      {!enabled ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          AI is disabled. Set `OPENAI_API_KEY` in your API environment to enable AI insights.
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-2 sm:grid-cols-[1fr,auto]">
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
          >
            <option value="">Select document</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            onClick={analyze}
            disabled={!documentId || loading || !enabled}
          >
            {loading ? "Analyzing..." : "Analyze Contract"}
          </button>
        </div>

        {analysis ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-sm font-semibold">Summary</p>
              <p className="mt-1 text-sm text-slate-700">{analysis.summary}</p>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-sm font-semibold">Detected Parties</p>
              <p className="mt-1 text-sm text-slate-700">{analysis.parties.join(", ") || "None detected"}</p>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-sm font-semibold">Key Clauses</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
                {analysis.clauses.map((c, i) => (
                  <li key={`${c.type}-${i}`}>
                    <span className="font-medium">{c.type}:</span> {c.text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-sm font-semibold">Risk Warnings</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
                {analysis.risks.map((risk) => (
                  <li key={risk}>{risk}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr,auto]">
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Ask a question about the contract..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button
            type="button"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            onClick={ask}
            disabled={!documentId || !question.trim() || !enabled}
          >
            Ask AI
          </button>
        </div>
        {answer ? <p className="mt-3 rounded-md bg-slate-100 p-3 text-sm text-slate-700">{answer}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </section>
    </div>
  );
}
