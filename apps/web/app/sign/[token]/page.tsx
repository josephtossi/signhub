"use client";

import { useEffect, useState } from "react";
import { SignaturePad } from "@/components/signature-pad";
import { api } from "@/lib/api";

type Session = {
  id: string;
  envelopeId: string;
  fullName: string;
  fields?: Array<{ id: string; type: string }>;
};

export default function SignPage({ params }: { params: { token: string } }) {
  const [session, setSession] = useState<Session | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api<Session>(`/sign/${params.token}/session`)
      .then(setSession)
      .catch((e) => setMessage(e instanceof Error ? e.message : "Failed to load signing session"));
  }, [params.token]);

  async function submit() {
    if (!signature) return;
    const signField = session?.fields?.find((f) => f.type === "SIGNATURE")?.id;
    if (!signField) {
      setMessage("No signature field is assigned for this recipient.");
      return;
    }

    await api(`/sign/${params.token}`, {
      method: "POST",
      body: JSON.stringify({
        fieldId: signField,
        signatureType: "DRAW",
        imageBase64: signature
      })
    });
    setMessage("Document signed successfully.");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="rounded-xl bg-gradient-to-r from-indigo-900 to-slate-900 p-6 text-white">
        <h1 className="text-2xl font-semibold">Secure Signing Session</h1>
        <p className="text-slate-200">{session ? `Signer: ${session.fullName}` : "Loading signer details..."}</p>
      </section>
      <section className="glass rounded-xl border border-white/70 p-6">
        <SignaturePad onSave={setSignature} />
        <button className="mt-4 rounded-md bg-emerald-600 px-4 py-2 font-medium text-white" onClick={submit} disabled={!signature}>
          Sign Document
        </button>
        {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
      </section>
    </div>
  );
}
