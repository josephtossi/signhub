"use client";

import { useEffect, useState } from "react";
import { SignaturePad } from "@/components/signature-pad";
import { api } from "@/lib/api";

type Session = {
  id: string;
  envelopeId: string;
  fullName: string;
  document?: { id: string; title: string };
  fields?: Array<{ id: string; type: string; label?: string | null; required: boolean; value?: string | null }>;
};

export default function SignPage({ params }: { params: { token: string } }) {
  const [session, setSession] = useState<Session | null>(null);
  const [signatureMode, setSignatureMode] = useState<"DRAW" | "TYPE" | "UPLOAD">("DRAW");
  const [typedSignature, setTypedSignature] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [checkboxValues, setCheckboxValues] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";

  useEffect(() => {
    api<Session>(`/sign/${params.token}/session`)
      .then((data) => {
        setSession(data);
        const values: Record<string, string> = {};
        const checks: Record<string, boolean> = {};
        for (const field of data.fields || []) {
          if (field.type === "CHECKBOX") {
            checks[field.id] = field.value === "true";
          } else {
            values[field.id] = field.value || "";
          }
        }
        setFieldValues(values);
        setCheckboxValues(checks);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load signing session"));
  }, [params.token]);

  function buildTypedSignatureImage(text: string) {
    const canvas = document.createElement("canvas");
    canvas.width = 420;
    canvas.height = 120;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "52px cursive";
    ctx.fillStyle = "#0f172a";
    ctx.fillText(text, 20, 78);
    return canvas.toDataURL("image/png");
  }

  async function uploadSignatureFile(file: File) {
    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const bytes = new Uint8Array(data);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]);
      }
      setSignature(`data:${file.type || "image/png"};base64,${btoa(binary)}`);
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!session) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      for (const field of session.fields || []) {
        if (field.type === "SIGNATURE" || field.type === "INITIAL") {
          let image = signature || "";
          if (signatureMode === "TYPE") {
            if (!typedSignature.trim()) throw new Error("Enter your typed signature.");
            image = buildTypedSignatureImage(typedSignature.trim());
          }
          if (!image) throw new Error("A signature image is required.");
          await api(`/sign/${params.token}/submit`, {
            method: "POST",
            body: JSON.stringify({
              fieldId: field.id,
              signatureType: signatureMode,
              imageBase64: image,
              typedSignature: typedSignature || undefined
            })
          });
          continue;
        }

        if (field.type === "CHECKBOX") {
          const checked = Boolean(checkboxValues[field.id]);
          if (field.required && !checked) {
            throw new Error(`Required checkbox "${field.label || field.type}" is not checked.`);
          }
          await api(`/sign/${params.token}/submit`, {
            method: "POST",
            body: JSON.stringify({
              fieldId: field.id,
              signatureType: "DRAW",
              checked
            })
          });
          continue;
        }

        const value =
          field.type === "DATE"
            ? fieldValues[field.id] || new Date().toISOString().slice(0, 10)
            : fieldValues[field.id] || "";
        if (field.required && !String(value).trim()) {
          throw new Error(`Required field "${field.label || field.type}" is empty.`);
        }
        await api(`/sign/${params.token}/submit`, {
          method: "POST",
          body: JSON.stringify({
            fieldId: field.id,
            signatureType: "DRAW",
            value
          })
        });
      }

      await api(`/sign/${params.token}/complete`, { method: "POST" });
      setMessage("Document signed successfully. You can close this window.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit signature");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="rounded-xl bg-gradient-to-r from-indigo-900 to-slate-900 p-6 text-white">
        <h1 className="text-2xl font-semibold">Secure Signing Session</h1>
        <p className="text-slate-200">{session ? `Signer: ${session.fullName}` : "Loading signer details..."}</p>
      </section>
      <div className="grid gap-5 lg:grid-cols-[1.2fr,1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 text-sm font-medium text-slate-700">{session?.document?.title || "Document Preview"}</div>
          <iframe
            src={`${apiBase}/sign/${params.token}/document`}
            className="h-[70vh] w-full rounded-lg border border-slate-200"
            title="Document preview"
          />
        </section>

        <section className="glass rounded-xl border border-white/70 p-6">
          <h2 className="text-lg font-semibold">Complete Required Fields</h2>
          <p className="mt-1 text-sm text-slate-500">Required fields are marked with *</p>

          <div className="mt-4 space-y-3">
            {(session?.fields || []).map((field) => (
              <div key={field.id} className="rounded-md border border-slate-200 bg-white p-3">
                <p className="mb-2 text-sm font-medium">
                  {field.label || field.type} {field.required ? "*" : ""}
                </p>
                {field.type === "TEXT" ? (
                  <input
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={fieldValues[field.id] || ""}
                    onChange={(e) => setFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                    placeholder="Enter text"
                  />
                ) : null}
                {field.type === "DATE" ? (
                  <input
                    type="date"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={fieldValues[field.id] || ""}
                    onChange={(e) => setFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                  />
                ) : null}
                {field.type === "CHECKBOX" ? (
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(checkboxValues[field.id])}
                      onChange={(e) => setCheckboxValues((prev) => ({ ...prev, [field.id]: e.target.checked }))}
                    />
                    Confirm
                  </label>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium">Signature Method</p>
            <div className="mt-2 flex gap-2 text-sm">
              {(["DRAW", "TYPE", "UPLOAD"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`rounded-md border px-3 py-1.5 ${signatureMode === mode ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-300"}`}
                  onClick={() => setSignatureMode(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>

            {signatureMode === "DRAW" ? <div className="mt-3"><SignaturePad onSave={setSignature} /></div> : null}
            {signatureMode === "TYPE" ? (
              <input
                className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Type your signature"
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
              />
            ) : null}
            {signatureMode === "UPLOAD" ? (
              <div className="mt-3">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadSignatureFile(file);
                  }}
                />
                {uploading ? <p className="text-xs text-slate-500">Uploading signature image...</p> : null}
              </div>
            ) : null}
          </div>

          <button
            className="mt-4 rounded-md bg-emerald-600 px-4 py-2 font-medium text-white disabled:opacity-60"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit and Complete"}
          </button>
          {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </section>
      </div>
    </div>
  );
}
