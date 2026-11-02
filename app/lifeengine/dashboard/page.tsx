"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";
import JSZip from "jszip";
import {
  Bot,
  CalendarDays,
  CircleAlert,
  CircleCheck,
  ClipboardList,
  Cpu,
  Download,
  FileArchive,
  FileDown,
  History,
  Info,
  LayoutGrid,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  SlidersHorizontal,
  Sparkles,
  Table2,
  Target,
  User,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";

type PlanSummary = {
  id: string;
  profileId: string;
  planName?: string; // e.g., "Plan for Anchit Tandon"
  inputSummary?: string; // e.g., "Yoga + Diet | 4 weeks | intermediate"
  intakeId: string;
  createdAt: string;
  goals: string[];
  planTypes?: string[];
  duration?: string;
  intensity?: string;
  dayCount?: number;
  source?: "gemini" | "custom-gpt" | "rule-engine"; // AI provider
};

type Profile = {
  id: string;
  name: string;
  age: number;
  gender: string;
  goals: string[];
  createdAt: string;
};

type ActivityLog = {
  id: string;
  type: "plan_created" | "profile_created" | "chat_message";
  description: string;
  timestamp: string;
  profileId?: string;
  planId?: string;
};

type Notice = { tone: "success" | "error" | "info"; text: string };

const SOURCES: Record<"gemini" | "custom-gpt" | "rule-engine", { label: string; icon: LucideIcon; className: string }> = {
  gemini: { label: "Gemini", icon: Sparkles, className: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  "custom-gpt": { label: "Custom GPT", icon: Bot, className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  "rule-engine": { label: "Rule engine", icon: Cpu, className: "bg-gray-100 text-gray-700 ring-gray-200" },
};

const ACTIVITY: Record<ActivityLog["type"], { title: string; icon: LucideIcon; className: string }> = {
  plan_created: { title: "Plan created", icon: ClipboardList, className: "bg-indigo-50 text-indigo-600" },
  profile_created: { title: "Profile added", icon: UserPlus, className: "bg-emerald-50 text-emerald-600" },
  chat_message: { title: "Chat message", icon: MessageCircle, className: "bg-gray-100 text-gray-600" },
};

const ACTIVITY_PREVIEW = 5;

const inputClass =
  "w-full min-h-[40px] rounded-[10px] border border-gray-300 bg-white py-2 text-sm text-gray-900 placeholder:text-gray-400 hover:border-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100";
const secondaryLinkClass =
  "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-[10px] border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100";
const primaryLinkClass =
  "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-[10px] bg-gray-900 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100";
const iconButtonClass =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-gray-300 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-55";
const checkboxClass = "h-4 w-4 cursor-pointer rounded border-gray-300 accent-indigo-600";

const relativeFormatter = typeof Intl !== "undefined" ? new Intl.RelativeTimeFormat("en", { numeric: "auto" }) : null;
const RELATIVE_STEPS: [number, Intl.RelativeTimeFormatUnit][] = [
  [60, "second"],
  [60, "minute"],
  [24, "hour"],
  [7, "day"],
  [4.348, "week"],
  [12, "month"],
  [Number.POSITIVE_INFINITY, "year"],
];

function relativeTime(iso: string) {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time) || !relativeFormatter) return "";
  let value = (time - Date.now()) / 1000;
  if (Math.abs(value) < 45) return "Just now";
  for (const [size, unit] of RELATIVE_STEPS) {
    if (Math.abs(value) < size) {
      const text = relativeFormatter.format(Math.round(value), unit);
      return text.charAt(0).toUpperCase() + text.slice(1);
    }
    value /= size;
  }
  return "";
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function toGoalList(goals: unknown): string[] {
  if (!Array.isArray(goals)) return [];
  return goals
    .map((g) => (typeof g === "string" ? g : g && typeof g === "object" ? String((g as any).name ?? (g as any).label ?? "") : ""))
    .filter(Boolean);
}

/** Goals when the plan has them, otherwise the parts of its input summary ("holistic | 4 weeks | beginner"). */
function planTags(plan: PlanSummary): string[] {
  return plan.goals.length > 0 ? plan.goals : summaryParts(plan);
}

function summaryParts(plan: PlanSummary): string[] {
  if (!plan.inputSummary || plan.inputSummary === "No details") return [];
  return plan.inputSummary
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part && part !== "Cached plan awaiting persistence");
}

function sourceOf(plan: PlanSummary) {
  return SOURCES[plan.source && plan.source in SOURCES ? plan.source : "rule-engine"];
}

function SourceBadge({ plan }: { plan: PlanSummary }) {
  const source = sourceOf(plan);
  const Icon = source.icon;
  return (
    <span className={clsx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1", source.className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {source.label}
    </span>
  );
}

function GoalChips({ goals, max = 3 }: { goals: string[]; max?: number }) {
  if (goals.length === 0) return <span className="text-sm text-gray-500">No goals listed</span>;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Goals">
      {goals.slice(0, max).map((goal, i) => (
        <li key={`${goal}-${i}`} className="inline-flex max-w-full items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
          <span className="truncate">{goal}</span>
        </li>
      ))}
      {goals.length > max && (
        <li className="inline-flex items-center rounded-full px-1.5 py-1 text-xs font-medium text-gray-500">+{goals.length - max} more</li>
      )}
    </ul>
  );
}

function StatCard({ label, value, hint, icon: Icon }: { label: string; value: ReactNode; hint: string; icon: LucideIcon }) {
  return (
    <div className="flex flex-col-reverse gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:p-5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{value}</p>
        <p className="mt-1 text-xs text-gray-500">{hint}</p>
      </div>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
    </div>
  );
}

function Bar({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-lg bg-gray-100", className)} aria-hidden />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <p role="status" className="sr-only">
        Loading your dashboard
      </p>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="w-full space-y-2">
              <Bar className="h-4 w-24" />
              <Bar className="h-7 w-12" />
              <Bar className="h-3 w-32" />
            </div>
            <Bar className="h-10 w-10 shrink-0 rounded-xl" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Bar className="h-5 w-32" />
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <Bar className="h-10 w-full" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <Bar className="h-5 w-2/3" />
                <Bar className="h-4 w-1/2" />
                <div className="flex gap-2">
                  <Bar className="h-6 w-20 rounded-full" />
                  <Bar className="h-6 w-16 rounded-full" />
                </div>
                <Bar className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Bar className="h-5 w-28" />
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Bar className="h-8 w-8 shrink-0 rounded-full" />
                <div className="w-full space-y-2">
                  <Bar className="h-4 w-1/2" />
                  <Bar className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NoticeBanner({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
  const Icon = notice.tone === "success" ? CircleCheck : notice.tone === "error" ? CircleAlert : Info;
  return (
    <div
      role={notice.tone === "error" ? "alert" : "status"}
      className={clsx(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        notice.tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
        notice.tone === "error" && "border-red-200 bg-red-50 text-red-700",
        notice.tone === "info" && "border-indigo-200 bg-indigo-50 text-indigo-800",
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1">{notice.text}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss message"
        className="-my-2 -mr-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlans, setSelectedPlans] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [exporting, setExporting] = useState<"all" | "selected" | null>(null);
  const [showAllActivity, setShowAllActivity] = useState(false);

  // Filter states
  const [filterProfile, setFilterProfile] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [syncing, setSyncing] = useState(false);

  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  const cardsCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Cards read better than a wide table on phones and tablets.
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setViewMode("cards");
    }
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!notice || notice.tone === "error") return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const loadDashboardData = async () => {
    setSyncing(true);
    setError(null);
    try {
      const plansResponse = await fetch("/api/lifeengine/listPlans");
      const plansData = plansResponse.ok ? await plansResponse.json() : { plans: [] };

      const profilesResponse = await fetch("/api/lifeengine/profiles");
      const profilesData = profilesResponse.ok ? await profilesResponse.json() : { profiles: [] };

      const loadedPlans: PlanSummary[] = (plansData.plans || []).map((plan: PlanSummary) => ({
        ...plan,
        goals: toGoalList(plan.goals),
      }));
      const loadedProfiles: Profile[] = profilesData.profiles || [];

      setPlans(loadedPlans);
      setProfiles(loadedProfiles);
      // Drop selections for plans that no longer exist.
      setSelectedPlans((prev) => new Set(Array.from(prev).filter((id) => loadedPlans.some((p) => p.id === id))));

      const nameById = new Map(loadedProfiles.map((p) => [p.id, p.name]));
      const activities: ActivityLog[] = [];

      loadedPlans.forEach((plan) => {
        const goals = plan.goals.slice(0, 2).join(", ");
        const who = nameById.get(plan.profileId);
        activities.push({
          id: `plan-${plan.id}`,
          type: "plan_created",
          description: [plan.planName || (who ? `Plan for ${who}` : "Health plan"), goals].filter(Boolean).join(" · "),
          timestamp: plan.createdAt,
          profileId: plan.profileId,
          planId: plan.id,
        });
      });

      loadedProfiles.forEach((profile) => {
        activities.push({
          id: `profile-${profile.id}`,
          type: "profile_created",
          description: profile.age ? `${profile.name}, ${profile.age} years` : profile.name,
          timestamp: profile.createdAt,
          profileId: profile.id,
        });
      });

      // Most recent first, last 10.
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivityLog(activities.slice(0, 10));
    } catch (err: any) {
      setError(err?.message || "Could not load your dashboard.");
      console.error("[Dashboard] Failed to load data:", err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const profileNames = useMemo(() => new Map(profiles.map((p) => [p.id, p.name])), [profiles]);
  const getProfileName = (profileId: string) => profileNames.get(profileId) || "Deleted profile";
  const planTitle = (plan: PlanSummary) => plan.planName || `Plan for ${getProfileName(plan.profileId)}`;

  const togglePlanSelection = (planId: string) => {
    const next = new Set(selectedPlans);
    if (next.has(planId)) next.delete(planId);
    else next.add(planId);
    setSelectedPlans(next);
  };

  const filteredPlans = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return plans.filter((plan) => {
      if (filterProfile !== "all" && plan.profileId !== filterProfile) return false;
      if (filterSource !== "all" && plan.source !== filterSource) return false;
      if (filterDateFrom) {
        if (new Date(plan.createdAt) < new Date(filterDateFrom)) return false;
      }
      if (filterDateTo) {
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999); // Include the entire day
        if (new Date(plan.createdAt) > toDate) return false;
      }
      if (query) {
        const name = profileNames.get(plan.profileId) || "Deleted profile";
        const matches =
          plan.planName?.toLowerCase().includes(query) ||
          name.toLowerCase().includes(query) ||
          plan.goals.some((g) => g.toLowerCase().includes(query)) ||
          plan.id.toLowerCase().includes(query);
        if (!matches) return false;
      }
      return true;
    });
  }, [plans, profileNames, filterProfile, filterSource, filterDateFrom, filterDateTo, searchQuery]);

  const activeFilterCount =
    (filterProfile !== "all" ? 1 : 0) + (filterSource !== "all" ? 1 : 0) + (filterDateFrom ? 1 : 0) + (filterDateTo ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0 || searchQuery !== "";

  const clearFilters = () => {
    setFilterProfile("all");
    setFilterSource("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSearchQuery("");
  };

  const shownSelectedCount = filteredPlans.filter((p) => selectedPlans.has(p.id)).length;
  const allShownSelected = filteredPlans.length > 0 && shownSelectedCount === filteredPlans.length;
  const someShownSelected = shownSelectedCount > 0 && !allShownSelected;

  useEffect(() => {
    for (const ref of [headerCheckboxRef, cardsCheckboxRef]) {
      if (ref.current) ref.current.indeterminate = someShownSelected;
    }
  });

  const toggleAllShown = () => {
    const next = new Set(selectedPlans);
    if (allShownSelected) filteredPlans.forEach((p) => next.delete(p.id));
    else filteredPlans.forEach((p) => next.add(p.id));
    setSelectedPlans(next);
  };

  const openPlanForPdf = (planId: string) => {
    // The plan page has the PDF download.
    const win = window.open(`/lifeengine/plan/${planId}?autoDownload=pdf`, "_blank");
    if (win) {
      setNotice({ tone: "info", text: "The plan opened in a new tab. Use Download PDF there to save it." });
    } else {
      setNotice({ tone: "error", text: "Your browser blocked the new tab. Open the plan and use Download PDF." });
    }
  };

  const exportAsZip = async (list: PlanSummary[], kind: "all" | "selected") => {
    if (list.length === 0) {
      setNotice({ tone: "error", text: kind === "all" ? "There are no plans to export yet." : "Select at least one plan to export." });
      return;
    }
    setExporting(kind);
    setNotice(null);
    try {
      const zip = new JSZip();
      let added = 0;
      for (const plan of list) {
        try {
          const response = await fetch(`/api/lifeengine/getPlan?id=${encodeURIComponent(plan.id)}`);
          if (response.ok) {
            const planData = await response.json();
            const fileName = `${planTitle(plan).replace(/[^a-z0-9]/gi, "_")}_${plan.id.slice(-8)}.json`;
            zip.file(fileName, JSON.stringify(planData, null, 2));
            added += 1;
          }
        } catch (err) {
          console.error(`Failed to fetch plan ${plan.id}:`, err);
        }
      }
      if (added === 0) throw new Error("No plans could be fetched");

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().split("T")[0];
      a.download = kind === "all" ? `TH_LifeEngine_All_Plans_${date}.zip` : `TH_LifeEngine_Plans_${date}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const skipped = list.length - added;
      setNotice({
        tone: "success",
        text:
          `Exported ${added} plan${added === 1 ? "" : "s"} as a ZIP file.` +
          (skipped > 0 ? ` ${skipped} could not be fetched and ${skipped === 1 ? "was" : "were"} skipped.` : ""),
      });
    } catch (err) {
      console.error("Failed to export plans:", err);
      setNotice({ tone: "error", text: "Export failed. Check your connection and try again." });
    } finally {
      setExporting(null);
    }
  };

  const exportSelectedAsZip = () => exportAsZip(plans.filter((p) => selectedPlans.has(p.id)), "selected");
  const exportAllAsZip = () => exportAsZip(plans, "all");

  // Metrics
  const totalProfiles = profiles.length;
  const totalPlans = plans.length;
  const plansByType = plans.reduce((acc, plan) => {
    const primaryGoal = plan.goals[0] || "General";
    acc[primaryGoal] = (acc[primaryGoal] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const successRate = totalPlans > 0 ? 100 : 0; // Every stored plan finished generating.

  const header = (
    <PageHeader
      title="Dashboard"
      description="Your plans, profiles and recent activity in one place."
      actions={
        <>
          <Link href="/lifeengine/create" className={primaryLinkClass}>
            <Plus className="h-4 w-4" aria-hidden />
            Create plan
          </Link>
          <Link href="/lifeengine/chat" className={secondaryLinkClass}>
            <Bot className="h-4 w-4" aria-hidden />
            Plan with Custom GPT
          </Link>
        </>
      }
    />
  );

  if (loading) {
    return (
      <div>
        {header}
        <DashboardSkeleton />
      </div>
    );
  }

  if (error && plans.length === 0 && profiles.length === 0) {
    return (
      <div>
        {header}
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 sm:flex-row sm:items-center">
          <CircleAlert className="h-5 w-5 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">We couldn&apos;t load your dashboard</p>
            <p className="mt-0.5 text-red-600">{error}</p>
          </div>
          <Button variant="ghost" onClick={loadDashboardData} disabled={syncing}>
            <RefreshCw className={clsx(syncing && "animate-spin")} aria-hidden />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const visibleActivity = showAllActivity ? activityLog : activityLog.slice(0, ACTIVITY_PREVIEW);

  const viewOptions = [
    { value: "cards" as const, label: "Cards", icon: LayoutGrid },
    { value: "table" as const, label: "Table", icon: Table2 },
  ];

  return (
    <div>
      {header}

      <div className="space-y-6">
        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p className="min-w-0 flex-1">Refresh failed: {error}</p>
            <button type="button" onClick={loadDashboardData} className="font-semibold underline underline-offset-2">
              Try again
            </button>
          </div>
        )}

        <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard label="Profiles" value={totalProfiles} hint="People you plan for" icon={Users} />
          <StatCard label="Plans created" value={totalPlans} hint="Across all profiles" icon={ClipboardList} />
          <StatCard label="Plans ready" value={`${successRate}%`} hint="Finished generating" icon={CircleCheck} />
          <StatCard label="Focus areas" value={Object.keys(plansByType).length} hint="Different main goals" icon={Target} />
        </section>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
          {/* Plans */}
          <section aria-labelledby="plans-title" className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="plans-title" className="text-base font-semibold text-gray-900">
                  Your plans
                </h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  {hasActiveFilters
                    ? `Showing ${filteredPlans.length} of ${plans.length} plan${plans.length === 1 ? "" : "s"}`
                    : `${plans.length} plan${plans.length === 1 ? "" : "s"}`}
                </p>
              </div>
              {plans.length > 0 && (
                <Button variant="ghost" onClick={exportAllAsZip} disabled={exporting !== null}>
                  {exporting === "all" ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
                  {exporting === "all" ? "Exporting…" : `Export all (${plans.length})`}
                </Button>
              )}
            </div>

            {plans.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                  <div className="min-w-0 flex-1">
                    <label htmlFor="plan-search" className="mb-1.5 block text-[13px] font-semibold text-gray-700">
                      Search plans
                    </label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
                      <input
                        id="plan-search"
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Name, profile, goal or ID"
                        className={clsx(inputClass, "pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden")}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          aria-label="Clear search"
                          className="absolute right-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-gray-400 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
                        >
                          <X className="h-4 w-4" aria-hidden />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFiltersOpen((open) => !open)}
                      aria-expanded={filtersOpen}
                      aria-controls="plan-filters"
                      className={clsx(
                        "inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-[10px] border bg-white px-3 text-sm font-semibold shadow-sm transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 md:hidden",
                        activeFilterCount > 0 ? "border-indigo-300 text-indigo-700" : "border-gray-300 text-gray-700",
                      )}
                    >
                      <SlidersHorizontal className="h-4 w-4" aria-hidden />
                      Filters
                      {activeFilterCount > 0 && (
                        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs font-semibold text-white">
                          <span className="sr-only">, </span>
                          {activeFilterCount}
                          <span className="sr-only"> active</span>
                        </span>
                      )}
                    </button>

                    <div role="group" aria-label="View" className="inline-grid grid-flow-col rounded-xl bg-gray-100 p-1">
                      {viewOptions.map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={viewMode === value}
                          onClick={() => setViewMode(value)}
                          className={clsx(
                            "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100",
                            viewMode === value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800",
                          )}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                          {label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={loadDashboardData}
                      disabled={syncing}
                      aria-label={syncing ? "Refreshing plans" : "Refresh plans"}
                      title="Refresh"
                      className={iconButtonClass}
                    >
                      <RefreshCw className={clsx("h-4 w-4", syncing && "animate-spin")} aria-hidden />
                    </button>
                  </div>
                </div>

                <div
                  id="plan-filters"
                  className={clsx("mt-4 gap-3 sm:grid-cols-2 md:grid lg:grid-cols-4", filtersOpen ? "grid" : "hidden")}
                >
                  <Field label="Profile">
                    <Select id="filterProfile" value={filterProfile} onChange={(e) => setFilterProfile(e.target.value)}>
                      <option value="all">All profiles</option>
                      {profiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Made with">
                    <Select id="filterSource" value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
                      <option value="all">All sources</option>
                      <option value="gemini">Gemini</option>
                      <option value="custom-gpt">Custom GPT</option>
                      <option value="rule-engine">Rule engine</option>
                    </Select>
                  </Field>
                  <Field label="Created from">
                    <Input type="date" id="filterDateFrom" value={filterDateFrom} max={filterDateTo || undefined} onChange={(e) => setFilterDateFrom(e.target.value)} />
                  </Field>
                  <Field label="Created to">
                    <Input type="date" id="filterDateTo" value={filterDateTo} min={filterDateFrom || undefined} onChange={(e) => setFilterDateTo(e.target.value)} />
                  </Field>
                </div>

                {hasActiveFilters && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                    <p className="text-sm text-gray-500" role="status">
                      {filteredPlans.length} of {plans.length} plans match
                    </p>
                    <Button variant="subtle" onClick={clearFilters}>
                      <X aria-hidden />
                      Clear filters
                    </Button>
                  </div>
                )}
              </div>
            )}

            {notice && <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />}

            {filteredPlans.length > 0 && (viewMode === "cards" || selectedPlans.size > 0) && (
              <div
                className={clsx(
                  "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-1",
                  selectedPlans.size > 0 ? "border-indigo-200 bg-indigo-50" : "border-gray-200 bg-white",
                )}
              >
                {viewMode === "cards" ? (
                  <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-3 text-sm font-medium text-gray-700">
                    <input
                      ref={cardsCheckboxRef}
                      type="checkbox"
                      checked={allShownSelected}
                      onChange={toggleAllShown}
                      className={checkboxClass}
                    />
                    {selectedPlans.size > 0 ? `${selectedPlans.size} selected` : `Select all (${filteredPlans.length})`}
                  </label>
                ) : (
                  <p className="inline-flex min-h-[40px] items-center text-sm font-medium text-indigo-800">{selectedPlans.size} selected</p>
                )}
                {selectedPlans.size > 0 && (
                  <div className="flex flex-wrap items-center gap-2 py-1">
                    <Button variant="ghost" onClick={exportSelectedAsZip} disabled={exporting !== null}>
                      {exporting === "selected" ? <Loader2 className="animate-spin" aria-hidden /> : <FileArchive aria-hidden />}
                      {exporting === "selected" ? "Exporting…" : "Export selected"}
                    </Button>
                    <Button variant="subtle" onClick={() => setSelectedPlans(new Set())}>
                      Clear selection
                    </Button>
                  </div>
                )}
              </div>
            )}

            {plans.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No plans yet"
                description="Create your first personalised plan. It takes under a minute and covers yoga, diet, sleep and habits."
                action={
                  <Link href="/lifeengine/create" className={primaryLinkClass}>
                    <Plus className="h-4 w-4" aria-hidden />
                    Create your first plan
                  </Link>
                }
              />
            ) : filteredPlans.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="No plans match"
                description="Try a different search or remove a filter."
                action={
                  <Button variant="ghost" onClick={clearFilters}>
                    <X aria-hidden />
                    Clear filters
                  </Button>
                }
              />
            ) : viewMode === "table" ? (
              <div className="relative overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full min-w-[760px] text-left">
                  <caption className="sr-only">Your plans</caption>
                  <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <tr>
                      <th scope="col" className="w-12 py-1 pl-2 pr-0">
                        <label className="flex h-10 w-10 cursor-pointer items-center justify-center">
                          <input
                            ref={headerCheckboxRef}
                            type="checkbox"
                            checked={allShownSelected}
                            onChange={toggleAllShown}
                            className={checkboxClass}
                            aria-label="Select all shown plans"
                          />
                        </label>
                      </th>
                      <th scope="col" className="px-3 py-3">Plan</th>
                      <th scope="col" className="px-3 py-3">Created</th>
                      <th scope="col" className="px-3 py-3">Source</th>
                      <th scope="col" className="px-3 py-3">Details</th>
                      <th scope="col" className="px-3 py-3 text-right">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlans.map((plan) => {
                      const selected = selectedPlans.has(plan.id);
                      const title = planTitle(plan);
                      return (
                        <tr key={plan.id} className={clsx("border-t border-gray-100 text-sm", selected ? "bg-indigo-50/60" : "hover:bg-gray-50")}>
                          <td className="py-2 pl-2 pr-0 align-middle">
                            <label className="flex h-10 w-10 cursor-pointer items-center justify-center">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => togglePlanSelection(plan.id)}
                                className={checkboxClass}
                                aria-label={`Select ${title}`}
                              />
                            </label>
                          </td>
                          <td className="max-w-[260px] px-3 py-3 align-middle">
                            <Link href={`/lifeengine/plan/${plan.id}`} className="block truncate font-semibold text-gray-900 hover:text-indigo-700">
                              {title}
                            </Link>
                            <span className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                              <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              <span className="truncate">{getProfileName(plan.profileId)}</span>
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 align-middle">
                            <span className="block text-gray-900">{formatDate(plan.createdAt)}</span>
                            <span className="mt-0.5 block text-xs text-gray-500">{relativeTime(plan.createdAt)}</span>
                          </td>
                          <td className="px-3 py-3 align-middle">
                            <SourceBadge plan={plan} />
                          </td>
                          <td className="max-w-[280px] px-3 py-3 align-middle">
                            {summaryParts(plan).length > 0 ? (
                              <span className="line-clamp-2 text-gray-700">{summaryParts(plan).join(" · ")}</span>
                            ) : (
                              <GoalChips goals={plan.goals} max={2} />
                            )}
                            {plan.dayCount ? (
                              <span className="mt-1 block text-xs text-gray-500">
                                {plan.dayCount} day{plan.dayCount === 1 ? "" : "s"}
                              </span>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right align-middle">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openPlanForPdf(plan.id)}
                                className={iconButtonClass}
                                aria-label={`Download PDF of ${title} (opens in a new tab)`}
                                title="Download PDF"
                              >
                                <FileDown className="h-4 w-4" aria-hidden />
                              </button>
                              <Link href={`/lifeengine/plan/${plan.id}`} className={primaryLinkClass} aria-label={`Open ${title}`}>
                                Open
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <ul className="grid gap-4 md:grid-cols-2">
                {filteredPlans.map((plan) => {
                  const selected = selectedPlans.has(plan.id);
                  const title = planTitle(plan);
                  return (
                    <li
                      key={plan.id}
                      className={clsx(
                        "flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition-colors",
                        selected ? "border-indigo-300 ring-1 ring-indigo-300" : "border-gray-200",
                      )}
                    >
                      <div className="-ml-2.5 -mt-2.5 flex items-center justify-between gap-2">
                        <label className="flex h-10 w-10 cursor-pointer items-center justify-center">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => togglePlanSelection(plan.id)}
                            className={checkboxClass}
                            aria-label={`Select ${title}`}
                          />
                        </label>
                        <SourceBadge plan={plan} />
                      </div>
                      <h3 className="mt-1 line-clamp-2 text-base font-semibold text-gray-900">{title}</h3>
                      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                        <div className="flex min-w-0">
                          <dt className="sr-only">Profile</dt>
                          <dd className="flex min-w-0 items-center gap-1.5">
                            <User className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                            <span className="truncate">{getProfileName(plan.profileId)}</span>
                          </dd>
                        </div>
                        <div className="flex">
                          <dt className="sr-only">Created</dt>
                          <dd className="flex items-center gap-1.5">
                            <CalendarDays className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                            {formatDate(plan.createdAt)}
                          </dd>
                        </div>
                        {plan.dayCount ? (
                          <div className="flex">
                            <dt className="sr-only">Length</dt>
                            <dd className="flex items-center gap-1.5">
                              <History className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                              {plan.dayCount} day{plan.dayCount === 1 ? "" : "s"}
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                      <div className="mt-4 flex-1">
                        <GoalChips goals={planTags(plan)} />
                      </div>
                      <div className="mt-5 flex gap-2">
                        <Link href={`/lifeengine/plan/${plan.id}`} className={clsx(primaryLinkClass, "flex-1")} aria-label={`Open ${title}`}>
                          Open
                        </Link>
                        <Button variant="ghost" onClick={() => openPlanForPdf(plan.id)} aria-label={`Download PDF of ${title} (opens in a new tab)`}>
                          <FileDown aria-hidden />
                          PDF
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Recent activity */}
          <section aria-labelledby="activity-title" className="min-w-0 space-y-4">
            <div>
              <h2 id="activity-title" className="text-base font-semibold text-gray-900">
                Recent activity
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">New plans and profiles, latest first.</p>
            </div>
            {activityLog.length === 0 ? (
              <EmptyState
                icon={History}
                title="Nothing here yet"
                description="Add a profile or create a plan and it will show up here."
                action={
                  <Link href="/lifeengine/profiles" className={secondaryLinkClass}>
                    <UserPlus className="h-4 w-4" aria-hidden />
                    Add a profile
                  </Link>
                }
              />
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <ol className="space-y-0">
                  {visibleActivity.map((activity, i) => {
                    const meta = ACTIVITY[activity.type];
                    const Icon = meta.icon;
                    const isLast = i === visibleActivity.length - 1;
                    const body = (
                      <>
                        <span className="block text-sm font-medium text-gray-900">{meta.title}</span>
                        <span className="mt-0.5 block truncate text-sm text-gray-500">{activity.description}</span>
                        <time dateTime={activity.timestamp} title={formatDateTime(activity.timestamp)} className="mt-0.5 block text-xs text-gray-500">
                          {relativeTime(activity.timestamp) || formatDate(activity.timestamp)}
                        </time>
                      </>
                    );
                    return (
                      <li key={activity.id} className={clsx("relative flex gap-3", !isLast && "pb-5")}>
                        {!isLast && <span className="absolute bottom-0 left-4 top-9 w-px bg-gray-200" aria-hidden />}
                        <span className={clsx("relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full", meta.className)}>
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        {activity.planId ? (
                          <Link
                            href={`/lifeengine/plan/${activity.planId}`}
                            className="-m-1 min-w-0 flex-1 rounded-lg p-1 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
                          >
                            {body}
                          </Link>
                        ) : (
                          <div className="min-w-0 flex-1">{body}</div>
                        )}
                      </li>
                    );
                  })}
                </ol>
                {activityLog.length > ACTIVITY_PREVIEW && (
                  <div className="mt-4 border-t border-gray-100 pt-3">
                    <Button variant="subtle" onClick={() => setShowAllActivity((v) => !v)} aria-expanded={showAllActivity}>
                      {showAllActivity ? "Show less" : `Show all (${activityLog.length})`}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
