"use client";

import { useState } from "react";
import { Card, Button } from "@signhub/ui";
import { PdfViewer } from "@/components/pdf-viewer";

const fieldTypes = ["Signature", "Initials", "Date", "Text", "Checkbox"];

export default function PreparePage({ params }: { params: { envelopeId: string } }) {
  const [selectedField, setSelectedField] = useState("Signature");

  return (
    <div className="grid gap-6 lg:grid-cols-[300px,1fr]">
      <Card className="space-y-4">
        <h1 className="text-lg font-semibold">Envelope {params.envelopeId}</h1>
        <p className="text-sm text-slate-500">Add recipients and place fields on the document.</p>
        <div className="space-y-2">
          {fieldTypes.map((f) => (
            <button
              key={f}
              onClick={() => setSelectedField(f)}
              className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                selectedField === f ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <Button className="w-full">Send Envelope</Button>
      </Card>
      <Card>
        <PdfViewer fileUrl="https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf" />
      </Card>
    </div>
  );
}
