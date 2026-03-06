"use client";

import { useState } from "react";
import { Button, Card } from "@signhub/ui";

export default function UploadPage() {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Upload document</h1>
      <Card className="border-dashed p-12 text-center">
        <p className="mb-4 text-slate-500">Drop your PDF or DOCX file here</p>
        <label className="inline-block cursor-pointer">
          <input
            className="hidden"
            type="file"
            accept=".pdf,.docx"
            onChange={(e) => setFileName(e.target.files?.[0]?.name || null)}
          />
          <span className="rounded-md bg-indigo-700 px-4 py-2 font-medium text-white">Choose file</span>
        </label>
      </Card>
      {fileName ? (
        <Card>
          <p className="font-medium">{fileName}</p>
          <p className="mt-1 text-sm text-slate-500">Ready for recipient setup and field placement.</p>
          <div className="mt-4">
            <Button>Continue to preparation</Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

