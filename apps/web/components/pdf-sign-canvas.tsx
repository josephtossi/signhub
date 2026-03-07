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

type PageMeta = {
  page: number;
  width: number;
  height: number;
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
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const loadingTaskRef = useRef<pdfjsLib.PDFDocumentLoadingTask | null>(null);
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTasksRef = useRef<pdfjsLib.RenderTask[]>([]);
  const [pages, setPages] = useState<PageMeta[]>([]);
  const [displaySizes, setDisplaySizes] = useState<Record<number, { w: number; h: number }>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function loadMeta() {
      try {
        renderTasksRef.current.forEach((task) => task.cancel());
      } catch {}
      try {
        await loadingTaskRef.current?.destroy();
      } catch {}

      const loadingTask = pdfjsLib.getDocument({ url: fileUrl, withCredentials: true });
      loadingTaskRef.current = loadingTask;
      const pdf = await loadingTask.promise;
      if (cancelled) return;
      pdfRef.current = pdf;

      const metas: PageMeta[] = [];
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.35 });
        metas.push({ page: pageNum, width: viewport.width, height: viewport.height });
      }
      setPages(metas);
    }

    loadMeta().catch((e) => {
      if (cancelled) return;
      setLoading(false);
      onError(e instanceof Error ? e.message : "Could not render PDF");
    });

    return () => {
      cancelled = true;
      try {
        renderTasksRef.current.forEach((task) => task.cancel());
      } catch {}
      try {
        loadingTaskRef.current?.destroy();
      } catch {}
    };
  }, [fileUrl, onError]);

  useEffect(() => {
    if (!pages.length || !pdfRef.current) return;
    let cancelled = false;

    async function renderPages() {
      setLoading(true);
      const pdf = pdfRef.current;
      if (!pdf) return;
      const tasks: pdfjsLib.RenderTask[] = [];
      for (const meta of pages) {
        if (cancelled) return;
        const page = await pdf.getPage(meta.page);
        const viewport = page.getViewport({ scale: 1.35 });
        const canvas = canvasRefs.current[meta.page];
        if (!canvas) continue;
        const context = canvas.getContext("2d");
        if (!context) continue;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const task = page.render({ canvasContext: context, viewport });
        tasks.push(task);
        await task.promise;
      }
      renderTasksRef.current = tasks;
      if (!cancelled) setLoading(false);
    }

    renderPages().catch((e) => {
      if (cancelled) return;
      setLoading(false);
      onError(e instanceof Error ? e.message : "Could not render PDF");
    });

    return () => {
      cancelled = true;
      try {
        renderTasksRef.current.forEach((task) => task.cancel());
      } catch {}
    };
  }, [pages, onError]);

  useEffect(() => {
    const observers: ResizeObserver[] = [];
    for (const page of pages) {
      const canvas = canvasRefs.current[page.page];
      if (!canvas) continue;
      const observer = new ResizeObserver(() => {
        const rect = canvas.getBoundingClientRect();
        setDisplaySizes((prev) => ({
          ...prev,
          [page.page]: { w: rect.width, h: rect.height }
        }));
      });
      observer.observe(canvas);
      observers.push(observer);
    }
    return () => observers.forEach((observer) => observer.disconnect());
  }, [pages]);

  const overlays = useMemo(
    () =>
      fields.map((f) => {
        const size = displaySizes[f.page] || { w: 0, h: 0 };
        return {
          ...f,
          left: f.x * size.w,
          top: f.y * size.h,
          w: f.width * size.w,
          h: f.height * size.h,
          completed: completedFieldIds.includes(f.id)
        };
      }),
    [completedFieldIds, displaySizes, fields]
  );

  return (
    <div className="relative space-y-4">
      {loading ? <div className="sticky top-2 z-20 rounded-md bg-white/90 p-2 text-center text-sm text-slate-500 shadow">Loading PDF...</div> : null}
      {pages.map((page) => (
        <div key={page.page} className="relative inline-block overflow-hidden rounded-xl border border-slate-200 bg-white shadow">
          <canvas
            ref={(node) => {
              canvasRefs.current[page.page] = node;
            }}
            className="max-w-full"
          />
          {overlays
            .filter((f) => f.page === page.page)
            .map((f) => (
              <div
                key={f.id}
                className={`absolute rounded border px-1 py-0.5 text-[10px] font-medium ${f.completed ? "border-emerald-500 bg-emerald-100/80 text-emerald-700" : "border-amber-500 bg-amber-100/80 text-amber-700"}`}
                style={{ left: f.left, top: f.top, width: f.w, height: f.h }}
              >
                {f.label || f.type}
              </div>
            ))}
          <div className="absolute bottom-2 right-2 rounded bg-slate-900/75 px-2 py-1 text-[10px] font-medium text-white">Page {page.page}</div>
        </div>
      ))}
    </div>
  );
}
