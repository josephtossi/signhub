"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  onSelectField: (id: string | null) => void;
  onFieldsChange: (fields: DraftField[]) => void;
  onError: (message: string) => void;
};

const defaultSize: Record<DraftFieldType, { w: number; h: number }> = {
  SIGNATURE: { w: 0.25, h: 0.08 },
  INITIAL: { w: 0.16, h: 0.08 },
  DATE: { w: 0.2, h: 0.06 },
  TEXT: { w: 0.3, h: 0.06 },
  CHECKBOX: { w: 0.05, h: 0.05 }
};

type DragMode = {
  id: string;
  kind: "move" | "resize";
  startX: number;
  startY: number;
  startField: DraftField;
};

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function PdfPrepareCanvas({
  fileUrl,
  fields,
  selectedFieldId,
  signaturePreviewText,
  onSelectField,
  onFieldsChange,
  onError
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fieldsRef = useRef<DraftField[]>(fields);
  const loadingTaskRef = useRef<pdfjsLib.PDFDocumentLoadingTask | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [dragMode, setDragMode] = useState<DragMode | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  useEffect(() => {
    let cancelled = false;

    async function renderPdf() {
      setLoading(true);
      try {
        renderTaskRef.current?.cancel();
      } catch {}
      try {
        await loadingTaskRef.current?.destroy();
      } catch {}

      const loadingTask = pdfjsLib.getDocument({
        url: fileUrl,
        withCredentials: true
      });
      loadingTaskRef.current = loadingTask;
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
      const task = page.render({ canvasContext: context, viewport });
      renderTaskRef.current = task;
      await task.promise;
      if (!cancelled) setLoading(false);
    }

    renderPdf().catch((e: unknown) => {
      if (cancelled) return;
      const name = (e as { name?: string })?.name;
      if (name === "RenderingCancelledException") return;
      const message = e instanceof Error ? e.message : "Could not render PDF";
      setLoading(false);
      onError(message);
    });

    return () => {
      cancelled = true;
      try {
        renderTaskRef.current?.cancel();
      } catch {}
      try {
        loadingTaskRef.current?.destroy();
      } catch {}
    };
  }, [fileUrl, onError]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new ResizeObserver(() => {
      const rect = wrapper.getBoundingClientRect();
      setDisplaySize({ width: rect.width, height: rect.height });
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function onMouseUp() {
      setDragMode(null);
    }
    function onMouseMove(event: MouseEvent) {
      if (!dragMode || displaySize.width === 0 || displaySize.height === 0) return;
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const deltaX = (pointerX - dragMode.startX) / displaySize.width;
      const deltaY = (pointerY - dragMode.startY) / displaySize.height;

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
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragMode, displaySize.height, displaySize.width, onFieldsChange]);

  function addField(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/x-field-type") as DraftFieldType;
    if (!type) return;

    const wrapper = wrapperRef.current;
    if (!wrapper || displaySize.width === 0 || displaySize.height === 0) return;

    const rect = wrapper.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / displaySize.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / displaySize.height, 0, 1);
    const size = defaultSize[type];
    const next: DraftField = {
      id: crypto.randomUUID(),
      type,
      page: 1,
      x,
      y,
      width: size.w,
      height: size.h,
      required: true
    };
    onFieldsChange([...fields, next]);
    onSelectField(next.id);
  }

  const renderedFields = useMemo(
    () =>
      fields.map((f) => ({
        ...f,
        left: f.x * displaySize.width,
        top: f.y * displaySize.height,
        w: f.width * displaySize.width,
        h: f.height * displaySize.height
      })),
    [displaySize.height, displaySize.width, fields]
  );

  return (
    <div
      ref={wrapperRef}
      className="relative inline-block select-none overflow-hidden rounded-xl border border-slate-200 bg-white shadow"
      onDrop={addField}
      onDragOver={(e) => e.preventDefault()}
      onMouseDown={() => onSelectField(null)}
    >
      <canvas ref={canvasRef} className="max-w-full" />
      {loading ? (
        <div className="absolute inset-0 grid place-items-center bg-white/70 text-sm text-slate-500">Rendering PDF...</div>
      ) : null}
      {renderedFields.map((field) => {
        const selected = field.id === selectedFieldId;
        return (
          <div
            key={field.id}
            className={`absolute select-none rounded border text-[11px] font-medium transition ${selected ? "border-cyan-500 bg-cyan-100/80 ring-2 ring-cyan-300" : "border-indigo-500 bg-indigo-100/70"}`}
            style={{ left: field.left, top: field.top, width: field.w, height: field.h }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelectField(field.id);
              setDragMode({
                id: field.id,
                kind: "move",
                startX: e.clientX - (wrapperRef.current?.getBoundingClientRect().left || 0),
                startY: e.clientY - (wrapperRef.current?.getBoundingClientRect().top || 0),
                startField: field
              });
            }}
          >
            <div className="flex h-full items-center justify-between px-2">
              {field.type === "SIGNATURE" ? (
                <div className="flex flex-col">
                  <span className="font-serif text-[12px] italic leading-none">
                    {signaturePreviewText || "Your Signature"}
                  </span>
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
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelectField(field.id);
                setDragMode({
                  id: field.id,
                  kind: "resize",
                  startX: e.clientX - (wrapperRef.current?.getBoundingClientRect().left || 0),
                  startY: e.clientY - (wrapperRef.current?.getBoundingClientRect().top || 0),
                  startField: field
                });
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
