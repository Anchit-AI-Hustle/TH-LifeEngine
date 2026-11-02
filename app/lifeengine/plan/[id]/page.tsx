"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarX2, Download, FileText, LoaderCircle, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import type { LifeEnginePlan } from "@/app/types/lifeengine";
import {
  daysFromRulePlan,
  daysFromWeeklySchedule,
  formatDate,
  parseLocalDate,
  type RuleDay,
} from "@/components/lifeengine/plan-view/model";
import { PlanDayView } from "@/components/lifeengine/plan-view/PlanDayView";
import { PlanReader } from "@/components/lifeengine/plan-view/PlanReader";
import { PlanExportPanel, ExportStatusLine, usePdfExport, type ExportStatus } from "@/components/lifeengine/plan-view/PlanExport";
import { PlanPrintStyles, PrintPages } from "@/components/lifeengine/plan-view/PlanPrint";
import { PlanExtras, PlanSummaryCard } from "@/components/lifeengine/plan-view/PlanOverview";
import { PlanError, PlanSkeleton, primaryLinkClass, secondaryLinkClass } from "@/components/lifeengine/plan-view/PlanStates";
import { safeFileName } from "@/components/lifeengine/plan-view/exportPdf";

type RulePlan = {
  id: string;
  profileId: string;
  intakeId: string;
  createdAt?: string;
  days: RuleDay[];
};

type PlanInfo = { planName?: string; createdAt?: string };

const EXPORT_PANEL_ID = "plan-export";

export default function PlanDetailPage() {
  const params = useParams<{ id: string }>();
  const planId = typeof params?.id === "string" ? params.id : "";

  const [rulePlan, setRulePlan] = useState<RulePlan | null>(null);
  const [customPlan, setCustomPlan] = useState<LifeEnginePlan | null>(null);
  const [info, setInfo] = useState<PlanInfo>({});
  const [profileName, setProfileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [currentDay, setCurrentDay] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [docStatus, setDocStatus] = useState<ExportStatus>({ kind: "idle" });
  const autoDownloadDone = useRef(false);
  const exportButtonRef = useRef<HTMLButtonElement>(null);

  const cacheKey = `th_plan_cache_${planId}`;

  const applyPayload = useCallback((payload: any): boolean => {
    const plan = payload?.plan;
    const nextInfo: PlanInfo = {
      planName: payload?.planName ?? plan?.planName,
      createdAt: plan?.createdAt ?? plan?.metadata?.timestamp ?? payload?.createdAt,
    };
    if (plan?.weekly_schedule) {
      setCustomPlan(plan as LifeEnginePlan);
      setRulePlan(null);
    } else if (plan?.days) {
      setRulePlan(plan as RulePlan);
      setCustomPlan(null);
    } else {
      return false;
    }
    setInfo(nextInfo);
    return true;
  }, []);

  const persistPlanToSession = (payload: any) => {
    try {
      window.sessionStorage.setItem(cacheKey, JSON.stringify(payload));
    } catch (err) {
      console.warn("Failed to persist plan cache:", err);
    }
  };

  const hydrateFromSession = () => {
    try {
      const cached = window.sessionStorage.getItem(cacheKey);
      if (!cached) return false;
      if (!applyPayload(JSON.parse(cached))) return false;
      setError(null);
      setNotFound(false);
      setLoading(false);
      return true;
    } catch (err) {
      console.warn("Failed to hydrate plan from session cache:", err);
      try {
        window.sessionStorage.removeItem(cacheKey);
      } catch {
        // Storage may be blocked; nothing to clean up then.
      }
      return false;
    }
  };

  /** `background` refreshes a plan already shown from the session cache, so failures stay quiet. */
  const loadPlan = async (background = false, retryCount = 0): Promise<void> => {
    if (!background) setLoading(true);
    setError(null);
    setNotFound(false);
    let retrying = false;
    const fail = (kind: "missing" | "error", message?: string) => {
      if (background) return;
      if (kind === "missing") setNotFound(true);
      else setError(message ?? "Check your connection and try again.");
    };
    try {
      // Generated plans and Custom GPT plans.
      const detailRes = await fetch(`/api/lifeengine/plan/detail?planId=${encodeURIComponent(planId)}`);
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        if (applyPayload(detailData)) {
          persistPlanToSession(detailData);
          return;
        }
      }

      // Older plans.
      const response = await fetch(`/api/lifeengine/getPlan?id=${encodeURIComponent(planId)}`);
      if (!response.ok) {
        // A plan that was just generated can take a moment to be saved.
        if (response.status === 404 && retryCount < 3) {
          retrying = true;
          await new Promise((resolve) => setTimeout(resolve, (retryCount + 1) * 500));
          return loadPlan(background, retryCount + 1);
        }
        if (response.status === 404) return fail("missing");
        return fail("error", "The server could not return this plan right now.");
      }

      const data = await response.json();
      if (!applyPayload({ plan: data.plan })) return fail("missing");
      persistPlanToSession({ plan: data.plan });
    } catch (err) {
      console.error("Failed to load plan:", err);
      fail("error");
    } finally {
      if (!background && !retrying) setLoading(false);
    }
  };

  useEffect(() => {
    if (!planId) return;
    const cacheHit = hydrateFromSession();
    loadPlan(cacheHit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  const days = useMemo(() => {
    if (customPlan) {
      const weekly = daysFromWeeklySchedule(customPlan.weekly_schedule);
      if (weekly.length) return weekly;
    }
    if (rulePlan) return daysFromRulePlan(rulePlan.days);
    return [];
  }, [customPlan, rulePlan]);

  // Without a saved plan name, name the plan after its profile.
  useEffect(() => {
    if (info.planName || !rulePlan?.profileId) return;
    let cancelled = false;
    fetch("/api/lifeengine/profiles")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const match = data?.profiles?.find((p: any) => p.id === rulePlan.profileId);
        if (!cancelled && match?.name) setProfileName(match.name);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [info.planName, rulePlan?.profileId]);

  const title = info.planName || (profileName ? `Plan for ${profileName}` : customPlan ? "Your weekly plan" : "Your plan");
  const description = useMemo(() => {
    const parts: string[] = [];
    if (days.length) parts.push(`${days.length} ${days.length === 1 ? "day" : "days"}`);
    const first = parseLocalDate(rulePlan?.days?.[0]?.date);
    const last = parseLocalDate(rulePlan?.days?.[rulePlan.days.length - 1]?.date);
    if (first && last) {
      const sameYear = first.getFullYear() === last.getFullYear();
      parts.push(
        `${formatDate(first, { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) })} – ${formatDate(last, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`,
      );
    } else {
      const created = parseLocalDate(info.createdAt);
      if (created) parts.push(`Created ${formatDate(created, { day: "numeric", month: "short", year: "numeric" })}`);
    }
    if (customPlan?.metadata?.plan_type?.length) parts.push(customPlan.metadata.plan_type.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(", "));
    return parts.join(" · ");
  }, [days.length, rulePlan, customPlan, info.createdAt]);

  const items = useMemo(() => days.map(({ label, sublabel, short, isToday }) => ({ label, sublabel, short, isToday })), [days]);

  const renderPaperDay = useCallback(
    (index: number) => days[index] && <PlanDayView day={days[index]} idPrefix={`plan-paper-${index}`} mode="paper" />,
    [days],
  );

  const pdf = usePdfExport({ fileName: `TH_LifeEngine_Plan_${planId.slice(-8) || "plan"}.pdf`, renderPage: renderPaperDay });

  // The dashboard opens plans with ?autoDownload=pdf for its download button.
  useEffect(() => {
    if (loading || !days.length || autoDownloadDone.current) return;
    const search = new URLSearchParams(window.location.search);
    if (search.get("autoDownload") !== "pdf") return;
    autoDownloadDone.current = true;
    search.delete("autoDownload");
    const query = search.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    pdf.exportDays(days.map((_, i) => i));
  }, [loading, days, pdf]);

  const exportDoc = async () => {
    setDocStatus({ kind: "busy", text: "Preparing the document…" });
    try {
      const res = await fetch(`/api/lifeengine/plan/export/doc?planId=${encodeURIComponent(planId)}`);
      if (!res.ok) throw new Error(`Export failed with ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeFileName(title)}.doc`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDocStatus({ kind: "done", text: "Your document has been downloaded." });
    } catch (err) {
      console.error("DOC export failed:", err);
      setDocStatus({ kind: "error", text: "We could not create the document. Please try again." });
    }
  };

  const backLink = (
    <Link href="/lifeengine/dashboard" className={secondaryLinkClass}>
      <ArrowLeft aria-hidden />
      Dashboard
    </Link>
  );

  if (loading) {
    return <PlanSkeleton />;
  }

  if (notFound) {
    return (
      <>
        <PageHeader title="Plan not found" description="This plan may have been deleted, or it was created with a different account." />
        <EmptyState
          icon={CalendarX2}
          title="We could not find this plan"
          description="Open one of your saved plans from the dashboard, or create a new one."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/lifeengine/dashboard" className={primaryLinkClass}>
                Go to dashboard
              </Link>
              <Link href="/lifeengine/create" className={secondaryLinkClass}>
                <Plus aria-hidden />
                Create a plan
              </Link>
            </div>
          }
        />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Your plan" />
        <PlanError message={error} onRetry={() => loadPlan()}>
          {backLink}
        </PlanError>
      </>
    );
  }

  if (!days.length) {
    return (
      <>
        <PageHeader title={title} description={description} actions={backLink} />
        <EmptyState
          icon={CalendarX2}
          title="This plan has no days yet"
          description="Something went wrong while it was being created. Try creating the plan again."
          action={
            <Link href="/lifeengine/create" className={primaryLinkClass}>
              <Plus aria-hidden />
              Create a plan
            </Link>
          }
        />
      </>
    );
  }

  const headerStatus = !exportOpen && pdf.status.kind !== "idle" ? pdf.status : docStatus;

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
                disabled={pdf.busy && !exportOpen}
              >
                {pdf.busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <Download aria-hidden />}
                Export PDF
              </Button>
              <Button type="button" variant="ghost" onClick={exportDoc} disabled={docStatus.kind === "busy"}>
                {docStatus.kind === "busy" ? <LoaderCircle className="animate-spin" aria-hidden /> : <FileText aria-hidden />}
                Export DOC
              </Button>
              <Button type="button" variant="ghost" onClick={() => window.print()}>
                <Printer aria-hidden />
                Print
              </Button>
              {backLink}
            </>
          }
        />

        {headerStatus.kind !== "idle" && (
          <div className="-mt-3 mb-6">
            <ExportStatusLine status={headerStatus} />
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

        {customPlan && (
          <div className="mb-6">
            <PlanSummaryCard plan={customPlan} />
          </div>
        )}

        <PlanReader
          items={items}
          idPrefix="plan"
          onChange={setCurrentDay}
          renderDay={(index, { headingId, stepper }) => (
            <PlanDayView day={days[index]} idPrefix={`plan-day-${index}`} headingId={headingId} titleActions={stepper} />
          )}
        />

        {customPlan && (
          <div className="mt-8">
            <PlanExtras plan={customPlan} showMeta={false} />
          </div>
        )}
      </div>

      <PrintPages title={title} subtitle={description} count={days.length} renderPage={renderPaperDay} />
      {pdf.host}
    </>
  );
}
