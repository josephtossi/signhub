"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs";

export type SignatureField = {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type Props = {
  fileUrl: string;
  token: string;
  fields: SignatureField[];
  setFields: (fields: SignatureField[]) => void;
};

export function PdfPrepareCanvas({ fileUrl, token, fields, setFields }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    async function render() {
      const loadingTask = pdfjsLib.getDocument({
        url: fileUrl,
        httpHeaders: { Authorization: `Bearer ${token}` }
      });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.25 });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setCanvasSize({ width: viewport.width, height: viewport.height });
      await page.render({ canvasContext: context, viewport }).promise;
    }
    render().catch(() => null);
  }, [fileUrl, token]);

  function addField(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (event.dataTransfer.getData("application/x-signature-field") !== "SIGNATURE") return;
    const wrapper = wrapperRef.current;
    if (!wrapper || canvasSize.width === 0 || canvasSize.height === 0) return;
    const rect = wrapper.getBoundingClientRect();
    const xPx = event.clientX - rect.left;
    const yPx = event.clientY - rect.top;
    const widthPx = 160;
    const heightPx = 48;

    const field: SignatureField = {
      id: crypto.randomUUID(),
      page: 1,
      x: Math.max(0, Math.min(1, xPx / canvasSize.width)),
      y: Math.max(0, Math.min(1, yPx / canvasSize.height)),
      width: widthPx / canvasSize.width,
      height: heightPx / canvasSize.height
    };
    setFields([...fields, field]);
  }

  function onMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (!draggingId) return;
    const wrapper = wrapperRef.current;
    if (!wrapper || canvasSize.width === 0 || canvasSize.height === 0) return;
    const rect = wrapper.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / canvasSize.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / canvasSize.height));
    setFields(fields.map((f) => (f.id === draggingId ? { ...f, x, y } : f)));
  }

  const renderedFields = useMemo(
    () =>
      fields.map((field) => ({
        ...field,
        left: field.x * canvasSize.width,
        top: field.y * canvasSize.height,
        w: field.width * canvasSize.width,
        h: field.height * canvasSize.height
      })),
    [canvasSize.height, canvasSize.width, fields]
  );

  return (
    <div
      ref={wrapperRef}
      className="relative inline-block"
      onDrop={addField}
      onDragOver={(e) => e.preventDefault()}
      onMouseMove={onMouseMove}
      onMouseUp={() => setDraggingId(null)}
      onMouseLeave={() => setDraggingId(null)}
    >
      <canvas ref={canvasRef} className="max-w-full rounded border bg-white shadow-sm" />
      {renderedFields.map((field) => (
        <div
          key={field.id}
          onMouseDown={() => setDraggingId(field.id)}
          className="absolute cursor-move rounded border-2 border-indigo-600 bg-indigo-100/70 px-2 py-1 text-xs font-medium text-indigo-700"
          style={{ left: field.left, top: field.top, width: field.w, height: field.h }}
        >
          Signature
        </div>
      ))}
    </div>
  );
}

