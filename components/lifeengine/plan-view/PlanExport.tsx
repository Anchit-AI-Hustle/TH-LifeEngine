"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CircleAlert, CircleCheck, Download, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { DayNavItem } from "./PlanDayNav";
import { exportElementsToPdf, nextPaint } from "./exportPdf";

export type ExportStatus = { kind: "idle" } | { kind: "busy"; text: string } | { kind: "done"; text: string } | { kind: "error"; text: string };

/**
 * Renders the chosen days off screen in the paper layout, captures them and
 * saves a PDF. `renderPage` draws one day for paper.
 */
export function usePdfExport({
  fileName,
  renderPage,
}: {
  fileName: string | ((indices: number[]) => string);
  renderPage: (index: number) => ReactNode;
}) {
  const [pages, setPages] = useState<number[] | null>(null);
  const [status, setStatus] = useState<ExportStatus>({ kind: "idle" });
  const hostRef = useRef<HTMLDivElement>(null);
  const resolveMount = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (pages && resolveMount.current) {
      resolveMount.current();
      resolveMount.current = null;
    }
  }, [pages]);

  const exportDays = useCallback(
    async (indices: number[]) => {
      if (!indices.length) {
        setStatus({ kind: "error", text: "Choose at least one day to export." });
        return false;
      }
      const sorted = [...indices].sort((a, b) => a - b);
      setStatus({ kind: "busy", text: `Preparing ${sorted.length === 1 ? "1 day" : `${sorted.length} days`}…` });
      try {
        await new Promise<void>((resolve) => {
          resolveMount.current = resolve;
          setPages(sorted);
        });
        await nextPaint();
        const elements = Array.from(hostRef.current?.querySelectorAll<HTMLElement>("[data-export-page]") ?? []);
        if (!elements.length) throw new Error("Nothing to export");
        await exportElementsToPdf(elements, typeof fileName === "function" ? fileName(sorted) : fileName);
        setStatus({ kind: "done", text: "Your PDF has been downloaded." });
        return true;
      } catch (error) {
        console.error("PDF export failed:", error);
        setStatus({ kind: "error", text: "We could not create the PDF. Please try again." });
        return false;
      } finally {
        setPages(null);
      }
    },
    [fileName],
  );

  const host =
    pages && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={hostRef}
            aria-hidden
            className="pointer-events-none fixed left-[-12000px] top-0 w-[794px] bg-white"
          >
            {pages.map((index) => (
              <div key={index} data-export-page className="bg-white px-10 py-8 text-black">
                {renderPage(index)}
              </div>
            ))}
          </div>,
          document.body,
        )
      : null;

  return { exportDays, status, setStatus, busy: status.kind === "busy", host };
}

export function ExportStatusLine({ status }: { status: ExportStatus }) {
  if (status.kind === "idle") return <span role="status" className="sr-only" />;
  if (status.kind === "error") {
    return (
      <p role="alert" className="flex items-center gap-2 text-sm text-red-700">
        <CircleAlert className="h-4 w-4 shrink-0" aria-hidden />
        {status.text}
      </p>
    );
  }
  return (
    <p role="status" className="flex items-center gap-2 text-sm text-gray-600">
      {status.kind === "busy" ? (
        <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-indigo-600" aria-hidden />
      ) : (
        <CircleCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
      )}
      {status.text}
    </p>
  );
}

/** Inline panel for choosing which days go into the PDF. */
export function PlanExportPanel({
  id,
  items,
  current,
  status,
  onDownload,
  onClose,
}: {
  id: string;
  items: DayNavItem[];
  current: number;
  status: ExportStatus;
  onDownload: (indices: number[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(items.map((_, i) => i)));
  const busy = status.kind === "busy";
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const toggle = (index: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const textButton =
    "min-h-[40px] rounded-lg px-3 text-sm font-medium text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100";

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 print:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="text-base font-semibold text-gray-900 focus:outline-none">
            Export as PDF
          </h2>
          <p className="mt-1 text-sm text-gray-500">Choose the days to include. Each day starts on a new page.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close export options"
          className="-mr-2 -mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <fieldset className="mt-4">
        <legend className="sr-only">Days to include</legend>
        <div className="-ml-3 flex flex-wrap gap-1">
          <button type="button" className={textButton} onClick={() => setSelected(new Set(items.map((_, i) => i)))}>
            Select all
          </button>
          <button type="button" className={textButton} onClick={() => setSelected(new Set([current]))}>
            Only {items[current]?.label ?? "this day"}
          </button>
          <button type="button" className={textButton} onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {items.map((item, index) => (
            <label
              key={index}
              className="flex min-h-[48px] cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 px-3 py-2 hover:bg-gray-50 has-[:checked]:border-indigo-300 has-[:checked]:bg-indigo-50/60 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-indigo-100"
            >
              <input
                type="checkbox"
                checked={selected.has(index)}
                onChange={() => toggle(index)}
                className="h-4 w-4 shrink-0 rounded border-gray-300 accent-indigo-600 focus:outline-none"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-900">{item.label}</span>
                {(item.short || item.sublabel) && <span className="block truncate text-xs text-gray-500">{item.short || item.sublabel}</span>}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ExportStatusLine status={status} />
        <Button
          type="button"
          onClick={() => onDownload(Array.from(selected))}
          disabled={busy || selected.size === 0}
          className="sm:ml-auto"
        >
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
          {busy ? "Preparing PDF" : `Download PDF (${selected.size} ${selected.size === 1 ? "day" : "days"})`}
        </Button>
      </div>
    </section>
  );
}
