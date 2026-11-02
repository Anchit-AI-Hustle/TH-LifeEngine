"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarX2, Download, LoaderCircle, Plus, Printer } from "lucide-react";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlanReader } from "@/components/lifeengine/plan-view/PlanReader";
import { ExportStatusLine, PlanExportPanel, usePdfExport } from "@/components/lifeengine/plan-view/PlanExport";
import { PlanPrintStyles, PrintPages } from "@/components/lifeengine/plan-view/PlanPrint";
import { PlanError, PlanSkeleton, primaryLinkClass, secondaryLinkClass } from "@/components/lifeengine/plan-view/PlanStates";
import { formatDate, parseLocalDate } from "@/components/lifeengine/plan-view/model";
import { safeFileName } from "@/components/lifeengine/plan-view/exportPdf";
import type { ViewMode } from "@/components/lifeengine/plan-view/PlanDayView";

interface DayPage {
  dayNumber: number;
  title: string;
  content: string;
}

interface PlanData {
  id: string;
  plan: {
    raw: string;
    pages: DayPage[];
    metadata: {
      generatedAt: string;
      model: string;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      estimatedCost: number;
      duration: number;
    };
  };
  formData: any;
  createdAt: string;
}

const EXPORT_PANEL_ID = "custom-gpt-export";

// ---------- plain-text plan formatting ----------

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "steps"; items: string[] };

/** Turn the model's plain text (light Markdown) into headings, paragraphs and lists. */
function parseContent(content: string): Block[] {
  const blocks: Block[] = [];
  const push = (type: "bullets" | "steps", item: string) => {
    const last = blocks[blocks.length - 1];
    if (last && last.type === type) last.items.push(item);
    else blocks.push({ type, items: [item] });
  };
  for (const raw of (content || "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^[-*_=]{3,}$/.test(line)) continue;
    let match: RegExpExecArray | null;
    if ((match = /^#{1,6}\s+(.*)$/.exec(line))) blocks.push({ type: "heading", text: match[1].replace(/\*\*/g, "") });
    else if ((match = /^\*\*(.+?)\*\*:?$/.exec(line))) blocks.push({ type: "heading", text: match[1].replace(/:$/, "") });
    else if ((match = /^[-*•●]\s+(.*)$/.exec(line))) push("bullets", match[1]);
    else if ((match = /^\d+[.)]\s+(.*)$/.exec(line))) push("steps", match[1]);
    else if (line.length <= 60 && /:$/.test(line) && !/[.!?]\s/.test(line)) blocks.push({ type: "heading", text: line.slice(0, -1) });
    else blocks.push({ type: "paragraph", text: line });
  }
  return blocks;
}

/** **bold** inside a line. */
function inline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    /^\*\*[^*]+\*\*$/.test(part) ? (
      <strong key={i} className="font-semibold text-gray-900">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

function PlanText({ content, mode = "screen" }: { content: string; mode?: ViewMode }) {
  const blocks = useMemo(() => parseContent(content), [content]);
  const paper = mode === "paper";
  const body = paper ? "text-black" : "text-gray-700";
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h3 key={i} className={clsx("pt-3 text-base font-semibold first:pt-0", paper ? "text-black" : "text-gray-900")}>
              {block.text}
            </h3>
          );
        }
        if (block.type === "paragraph") {
          return (
            <p key={i} className={clsx("text-sm leading-6", body)}>
              {inline(block.text)}
            </p>
          );
        }
        if (block.type === "bullets") {
          return (
            <ul key={i} className="space-y-1.5">
              {block.items.map((item, j) => (
                <li key={j} className={clsx("flex gap-2.5 text-sm leading-6", body)}>
                  <span aria-hidden className={clsx("mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full", paper ? "bg-black" : "bg-gray-400")} />
                  <span className="min-w-0 flex-1">{inline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <ol key={i} className="space-y-2">
            {block.items.map((item, j) => (
              <li key={j} className={clsx("flex gap-3 text-sm", body)}>
                {paper ? (
                  <span aria-hidden className="w-5 shrink-0 text-right font-semibold tabular-nums">
                    {j + 1}.
                  </span>
                ) : (
                  <span
                    aria-hidden
                    className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold tabular-nums text-indigo-700"
                  >
                    {j + 1}
                  </span>
                )}
                <span className={clsx("min-w-0 flex-1 leading-5", !paper && "pt-0.5")}>{inline(item)}</span>
              </li>
            ))}
          </ol>
        );
      })}
    </div>
  );
}

/** "Day 2: Strength and balance" -> "Strength and balance" */
const dayTopic = (page: DayPage) => page.title.replace(/^\s*day\s*\d+\s*[:\-–—]?\s*/i, "").trim();

function DayContent({
  page,
  mode = "screen",
  headingId,
  actions,
}: {
  page: DayPage;
  mode?: ViewMode;
  headingId?: string;
  actions?: ReactNode;
}) {
  const paper = mode === "paper";
  const topic = dayTopic(page);
  return (
    <article className={clsx(paper ? "bg-white" : "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6")}>
      <div className={clsx("flex items-start justify-between gap-3", paper ? "border-b-2 border-black pb-3" : "border-b border-gray-100 pb-4")}>
        <div className="min-w-0">
          <p className={clsx("text-sm font-medium", paper ? "text-gray-800" : "text-gray-500")}>Day {page.dayNumber}</p>
          <h2 id={headingId} className={clsx("mt-0.5 text-xl font-semibold tracking-tight sm:text-2xl", paper ? "text-black" : "text-gray-900")}>
            {topic || page.title}
          </h2>
        </div>
        {actions}
      </div>
      <div className="mt-5">
        <PlanText content={page.content} mode={mode} />
      </div>
    </article>
  );
}

export default function CustomGPTPlanPage() {
  const params = useParams<{ id: string }>();
  const planId = typeof params?.id === "string" ? params.id : null;
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDay, setCurrentDay] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const exportButtonRef = useRef<HTMLButtonElement>(null);

  const loadPlan = useCallback(() => {
    if (planId === null) return;
    setLoading(true);
    setError(null);
    try {
      // Custom GPT plans are kept in this browser only.
      const storedPlans = JSON.parse(localStorage.getItem("custom_gpt_plans") || "[]");
      const plan = Array.isArray(storedPlans) ? storedPlans.find((p: PlanData) => p.id === planId) : null;
      setPlanData(plan && Array.isArray(plan.plan?.pages) ? plan : null);
    } catch (err) {
      console.error("Failed to read saved Custom GPT plans:", err);
      setError("The plans saved in this browser could not be read.");
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const pages = planData?.plan.pages ?? [];
  const items = useMemo(
    () => pages.map((page) => ({ label: `Day ${page.dayNumber}`, sublabel: dayTopic(page) || undefined, short: "" })),
    [pages],
  );

  const name: string = planData?.formData?.fullName || "";
  const title = name ? `Plan for ${name}` : "Your Custom GPT plan";
  const created = parseLocalDate(planData?.createdAt);
  const description = [
    `${pages.length} ${pages.length === 1 ? "day" : "days"}`,
    created ? `Created ${formatDate(created, { day: "numeric", month: "short", year: "numeric" })}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const renderPaperDay = useCallback(
    (index: number) =>
      pages[index] && (
        <>
          <DayContent page={pages[index]} mode="paper" />
          <p className="mt-8 border-t border-gray-300 pt-3 text-xs text-gray-700">
            TH+ LifeEngine · {name || "Custom GPT plan"}
            {created ? ` · ${formatDate(created, { day: "numeric", month: "short", year: "numeric" })}` : ""}
          </p>
        </>
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pages, name, planData?.createdAt],
  );

  const pdf = usePdfExport({
    fileName: `CustomGPT_Plan_${safeFileName(name || "plan")}_${new Date().toLocaleDateString("en-CA")}.pdf`,
    renderPage: renderPaperDay,
  });

  const newPlanLink = (
    <Link href="/custom-gpt/create" className={secondaryLinkClass}>
      <Plus aria-hidden />
      New plan
    </Link>
  );

  if (loading) return <PlanSkeleton />;

  if (error) {
    return (
      <>
        <PageHeader title="Your Custom GPT plan" />
        <PlanError message={error} onRetry={loadPlan}>
          {newPlanLink}
        </PlanError>
      </>
    );
  }

  if (!planData || !pages.length) {
    return (
      <>
        <PageHeader title="Plan not found" description="Custom GPT plans are saved in the browser they were created in." />
        <EmptyState
          icon={CalendarX2}
          title="We could not find this plan"
          description="It may have been created in another browser, or the saved data was cleared."
          action={
            <Link href="/custom-gpt/create" className={primaryLinkClass}>
              <Plus aria-hidden />
              Create a new plan
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <PlanPrintStyles />
      <div className="print:hidden">
        <PageHeader
          title={title}
          description={description}
          actions={
            <>
              <Button
                ref={exportButtonRef}
                type="button"
                onClick={() => setExportOpen((open) => !open)}
                aria-expanded={exportOpen}
                aria-controls={EXPORT_PANEL_ID}
              >
                {pdf.busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <Download aria-hidden />}
                Export PDF
              </Button>
              <Button type="button" variant="ghost" onClick={() => window.print()}>
                <Printer aria-hidden />
                Print
              </Button>
              {newPlanLink}
            </>
          }
        />

        {!exportOpen && pdf.status.kind !== "idle" && (
          <div className="-mt-3 mb-6">
            <ExportStatusLine status={pdf.status} />
          </div>
        )}

        {exportOpen && (
          <PlanExportPanel
            id={EXPORT_PANEL_ID}
            items={items}
            current={currentDay}
            status={pdf.status}
            onDownload={pdf.exportDays}
            onClose={() => {
              setExportOpen(false);
              exportButtonRef.current?.focus();
            }}
          />
        )}

        <PlanReader
          items={items}
          idPrefix="gpt"
          onChange={setCurrentDay}
          renderDay={(index, { headingId, stepper }) => <DayContent page={pages[index]} headingId={headingId} actions={stepper} />}
        />
      </div>

      <PrintPages title={title} subtitle={description} count={pages.length} renderPage={renderPaperDay} />
      {pdf.host}
    </>
  );
}
