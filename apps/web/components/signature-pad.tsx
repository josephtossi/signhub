"use client";

import { useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@signhub/ui";

export function SignaturePad({ onSave }: { onSave: (dataUrl: string) => void }) {
  const sigRef = useRef<SignatureCanvas>(null);

  return (
    <div className="space-y-3">
      <SignatureCanvas
        ref={sigRef}
        penColor="black"
        canvasProps={{ className: "h-44 w-full rounded border bg-white" }}
      />
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={() => sigRef.current?.clear()}>
          Clear
        </Button>
        <Button
          type="button"
          onClick={() => {
            const dataUrl = sigRef.current?.toDataURL("image/png");
            if (dataUrl) onSave(dataUrl);
          }}
        >
          Save Signature
        </Button>
      </div>
    </div>
  );
}

