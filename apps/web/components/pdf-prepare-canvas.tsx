"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export type DraftFieldType = "SIGNATURE" | "INITIAL" | "DATE" | "TEXT" | "CHECKBOX";

export type DraftField = {
  id: string;
  recipientId?: string;
  type: DraftFieldType;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  required?: boolean;
  value?: string;
};

type Props = {
  fileUrl: string;
  fields: DraftField[];
  selectedFieldId: string | null;
  signaturePreviewText?: string;
  placingType?: DraftFieldType | null;
  onPlacedField?: () => void;
  onSelectField: (id: string | null) => void;
  onFieldsChange: (fields: DraftField[]) => void;
  onError: (message: string) => void;
};

type PageMeta = {
  page: number;
  width: number;
  height: number;
};

type DragMode = {
  id: string;
  page: number;
  kind: "move" | "resize";
  pointerId: number;
  startX: number;
  startY: number;
  startField: DraftField;
};

const defaultSize: Record<DraftFieldType, { w: number; h: number }> = {
  SIGNATURE: { w: 0.25, h: 0.08 },
  INITIAL: { w: 0.16, h: 0.08 },
  DATE: { w: 0.2, h: 0.06 },
  TEXT: { w: 0.3, h: 0.06 },
  CHECKBOX: { w: 0.05, h: 0.05 }
};

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function PdfPrepareCanvas({
  fileUrl,
  fields,
  selectedFieldId,
  signaturePreviewText,
  placingType,
  onPlacedField,
  onSelectField,
  onFieldsChange,
  onError
}: Props) {
  const fieldsRef = useRef<DraftField[]>(fields);
  const onErrorRef = useRef(onError);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const loadingTaskRef = useRef<pdfjsLib.PDFDocumentLoadingTask | null>(null);
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTasksRef = useRef<pdfjsLib.RenderTask[]>([]);

  const [pages, setPages] = useState<PageMeta[]>([]);
  const [pageSizes, setPageSizes] = useState<Record<number, { w: number; h: number }>>({});
  const [dragMode, setDragMode] = useState<DragMode | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

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

    loadMeta().catch((e: unknown) => {
      if (cancelled) return;
      const name = (e as { name?: string })?.name;
      if (name === "RenderingCancelledException") return;
      setLoading(false);
      onErrorRef.current(e instanceof Error ? e.message : "Could not render PDF");
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
  }, [fileUrl]);

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

    renderPages().catch((e: unknown) => {
      if (cancelled) return;
      const name = (e as { name?: string })?.name;
      if (name === "RenderingCancelledException") return;
      setLoading(false);
      onErrorRef.current(e instanceof Error ? e.message : "Could not render PDF");
    });

    return () => {
      cancelled = true;
      try {
        renderTasksRef.current.forEach((task) => task.cancel());
      } catch {}
    };
  }, [pages]);

  useEffect(() => {
    const observers: ResizeObserver[] = [];
    for (const page of pages) {
      const canvas = canvasRefs.current[page.page];
      if (!canvas) continue;
      const observer = new ResizeObserver(() => {
        const rect = canvas.getBoundingClientRect();
        setPageSizes((prev) => ({
          ...prev,
          [page.page]: { w: rect.width, h: rect.height }
        }));
      });
      observer.observe(canvas);
      observers.push(observer);
    }
    return () => observers.forEach((observer) => observer.disconnect());
  }, [pages]);

  useEffect(() => {
    function onPointerUp(event: PointerEvent) {
      if (!dragMode || dragMode.pointerId !== event.pointerId) return;
      setDragMode(null);
    }
    function onPointerMove(event: PointerEvent) {
      if (!dragMode) return;
      const pageSize = pageSizes[dragMode.page];
      const pageEl = pageRefs.current[dragMode.page];
      if (!pageSize || !pageEl) return;
      const rect = pageEl.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const deltaX = (pointerX - dragMode.startX) / pageSize.w;
      const deltaY = (pointerY - dragMode.startY) / pageSize.h;

      onFieldsChange(
        fieldsRef.current.map((f) => {
          if (f.id !== dragMode.id) return f;
          if (dragMode.kind === "move") {
            return {
              ...f,
              x: clamp(dragMode.startField.x + deltaX, 0, 1 - f.width),
              y: clamp(dragMode.startField.y + deltaY, 0, 1 - f.height)
            };
          }
          return {
            ...f,
            width: clamp(dragMode.startField.width + deltaX, 0.03, 1 - f.x),
            height: clamp(dragMode.startField.height + deltaY, 0.03, 1 - f.y)
          };
        })
      );
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragMode, onFieldsChange, pageSizes]);

  function appendField(type: DraftFieldType, page: number, clientX: number, clientY: number) {
    const pageSize = pageSizes[page];
    const pageEl = pageRefs.current[page];
    if (!pageSize || !pageEl) return;
    const rect = pageEl.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / pageSize.w, 0, 1);
    const y = clamp((clientY - rect.top) / pageSize.h, 0, 1);
    const size = defaultSize[type];
    const next: DraftField = {
      id: crypto.randomUUID(),
      type,
      page,
      x,
      y,
      width: size.w,
      height: size.h,
      required: true
    };
    onFieldsChange([...fieldsRef.current, next]);
    onSelectField(next.id);
    onPlacedField?.();
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>, page: number) {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/x-field-type") as DraftFieldType;
    if (!type) return;
    appendField(type, page, event.clientX, event.clientY);
  }

  function onTap(event: React.PointerEvent<HTMLDivElement>, page: number) {
    if (!placingType) {
      onSelectField(null);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    appendField(placingType, page, event.clientX, event.clientY);
  }

  const renderedFields = fields.map((field) => {
    const size = pageSizes[field.page] || { w: 0, h: 0 };
    return {
      ...field,
      left: field.x * size.w,
      top: field.y * size.h,
      w: field.width * size.w,
      h: field.height * size.h
    };
  });

  return (
    <div className="relative space-y-4">
      {loading ? (
        <div className="sticky top-2 z-20 rounded-md bg-white/90 p-2 text-center text-sm text-slate-500 shadow">
          Rendering PDF...
        </div>
      ) : null}
      {pages.map((page) => (
        <div
          key={page.page}
          ref={(node) => {
            pageRefs.current[page.page] = node;
          }}
          className="relative inline-block select-none overflow-hidden rounded-xl border border-slate-200 bg-white shadow"
          onDrop={(event) => onDrop(event, page.page)}
          onDragOver={(event) => event.preventDefault()}
          onPointerDown={(event) => onTap(event, page.page)}
        >
          <canvas
            ref={(node) => {
              canvasRefs.current[page.page] = node;
            }}
            className="max-w-full"
          />

          {renderedFields
            .filter((field) => field.page === page.page)
            .map((field) => {
              const selected = field.id === selectedFieldId;
              return (
                <div
                  key={field.id}
                  className={`absolute select-none rounded border text-[11px] font-medium transition ${selected ? "border-cyan-500 bg-cyan-100/80 ring-2 ring-cyan-300" : "border-indigo-500 bg-indigo-100/70"}`}
                  style={{ left: field.left, top: field.top, width: field.w, height: field.h, touchAction: "none" }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onSelectField(field.id);
                    const rect = pageRefs.current[field.page]?.getBoundingClientRect();
                    setDragMode({
                      id: field.id,
                      page: field.page,
                      kind: "move",
                      pointerId: event.pointerId,
                      startX: event.clientX - (rect?.left || 0),
                      startY: event.clientY - (rect?.top || 0),
                      startField: field
                    });
                  }}
                >
                  <div className="flex h-full items-center justify-between px-2">
                    {field.type === "SIGNATURE" ? (
                      <div className="flex flex-col">
                        <span className="font-serif text-[12px] italic leading-none">{signaturePreviewText || "Your Signature"}</span>
                        <span className="text-[9px] uppercase tracking-wide text-slate-600">Signature</span>
                      </div>
                    ) : (
                      <span>{field.label || field.type}</span>
                    )}
                    {selected ? <span className="h-2.5 w-2.5 rounded-full bg-cyan-600" /> : null}
                  </div>
                  <button
                    type="button"
                    className="absolute -bottom-1 -right-1 h-3 w-3 cursor-se-resize rounded bg-cyan-600"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onSelectField(field.id);
                      const rect = pageRefs.current[field.page]?.getBoundingClientRect();
                      setDragMode({
                        id: field.id,
                        page: field.page,
                        kind: "resize",
                        pointerId: event.pointerId,
                        startX: event.clientX - (rect?.left || 0),
                        startY: event.clientY - (rect?.top || 0),
                        startField: field
                      });
                    }}
                  />
                </div>
              );
            })}
          <div className="absolute bottom-2 right-2 rounded bg-slate-900/75 px-2 py-1 text-[10px] font-medium text-white">Page {page.page}</div>
        </div>
      ))}
    </div>
  );
}
