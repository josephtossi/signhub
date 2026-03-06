"use client";

import { useState } from "react";
import { Card, Button } from "@signhub/ui";
import { SignaturePad } from "@/components/signature-pad";

export default function SignPage({ params }: { params: { token: string } }) {
  const [signature, setSignature] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <p className="text-sm text-slate-500">Signing token</p>
        <p className="font-mono text-sm">{params.token}</p>
      </Card>
      <Card className="space-y-4">
        <h1 className="text-2xl font-semibold">Sign document</h1>
        <SignaturePad onSave={setSignature} />
        {signature ? <p className="text-sm text-green-700">Signature captured and ready.</p> : null}
        <Button disabled={!signature}>Complete signing</Button>
      </Card>
    </div>
  );
}

