"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

type SignField = {
  id: string;
  type: string;
  label?: string | null;
  required: boolean;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  value?: string | null;
};

export function PdfSignCanvas({
  fileUrl,
  fields,
  completedFieldIds,
  onError
}: {
  fileUrl: string;
  fields: SignField[];
  completedFieldIds: string[];
  onError: (message: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    async function render() {
      const loadingTask = pdfjsLib.getDocument({ url: fileUrl, withCredentials: true });
      const pdf = await loadingTask.promise;
      if (cancelled) return;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.35 });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport }).promise;
      if (!cancelled) setLoading(false);
    }
    render().catch((e) => {
      if (cancelled) return;
      setLoading(false);
      onError(e instanceof Error ? e.message : "Could not render PDF");
    });
    return () => {
      cancelled = true;
    };
  }, [fileUrl, onError]);

  const overlays = useMemo(
    () =>
      fields
        .filter((f) => f.page === 1)
        .map((f) => ({
          ...f,
          left: f.x * size.w,
          top: f.y * size.h,
          w: f.width * size.w,
          h: f.height * size.h,
          completed: completedFieldIds.includes(f.id)
        })),
    [completedFieldIds, fields, size.h, size.w]
  );

  return (
    <div ref={wrapperRef} className="relative inline-block overflow-hidden rounded-xl border border-slate-200 bg-white shadow">
      <canvas ref={canvasRef} className="max-w-full" />
      {loading ? <div className="absolute inset-0 grid place-items-center bg-white/70 text-sm text-slate-500">Loading PDF...</div> : null}
      {overlays.map((f) => (
        <div
          key={f.id}
          className={`absolute rounded border px-1 py-0.5 text-[10px] font-medium ${f.completed ? "border-emerald-500 bg-emerald-100/80 text-emerald-700" : "border-amber-500 bg-amber-100/80 text-amber-700"}`}
          style={{ left: f.left, top: f.top, width: f.w, height: f.h }}
        >
          {f.label || f.type}
        </div>
      ))}
    </div>
  );
}
