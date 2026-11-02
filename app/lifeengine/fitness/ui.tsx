"use client";

/** Shared presentational pieces for the fitness screens, built on the app design system. */

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";

import buttonStyles from "@/components/ui/Button.module.css";
import { Select } from "@/components/ui/Select";
import { FITNESS_CHANGE_EVENT } from "@/lib/fitness/store";
import { SYNCED_EVENT } from "@/lib/sync/client";
import type { FitnessProfile } from "@/lib/fitness/types";

/* ---------------- layout ---------------- */

export function Card({ children, className, as: As = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return <As className={clsx("rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6", className)}>{children}</As>;
}

export function SectionHeading({
  title,
  description,
  action,
  level = 2,
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  level?: 2 | 3;
  id?: string;
}) {
  const H = level === 2 ? "h2" : "h3";
  return (
    <div className={clsx("flex gap-3", level === 3 ? "items-start justify-between" : "flex-col sm:flex-row sm:items-start sm:justify-between")}>
      <div className="min-w-0">
        <H id={id} className="text-base font-semibold text-gray-900">
          {title}
        </H>
        {description ? <p className="mt-1 max-w-prose text-sm text-gray-500">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

/* ---------------- buttons as links ---------------- */

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: "primary" | "ghost" | "subtle"; size?: "sm" | "md" };

/** A Next link that looks exactly like <Button>. */
export function LinkButton({ variant = "primary", size = "md", className, ...props }: LinkButtonProps) {
  return (
    <Link
      {...props}
      className={clsx(
        buttonStyles.button,
        variant !== "primary" && buttonStyles[variant],
        size === "sm" && buttonStyles.sm,
        "no-underline",
        className,
      )}
    />
  );
}

/* ---------------- stats & chips ---------------- */

export function Stat({
  label,
  value,
  unit,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
          {value}
          {unit ? <span className="ml-1 text-sm font-medium text-gray-500">{unit}</span> : null}
        </p>
        {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
      </div>
      {Icon ? (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      ) : null}
    </div>
  );
}

export type Tone = "good" | "info" | "warn" | "risk" | "neutral";

const CHIP_TONE: Record<Tone, string> = {
  neutral: "bg-gray-100 text-gray-700",
  info: "bg-indigo-50 text-indigo-700",
  good: "bg-emerald-50 text-emerald-700",
  warn: "bg-amber-50 text-amber-800",
  risk: "bg-red-50 text-red-700",
};

/** Small status chip. Gray by default; colour only when it carries meaning. */
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", CHIP_TONE[tone], className)}>
      {children}
    </span>
  );
}

/** Toggle chip for multi-select lists (goals, equipment, symptoms). */
export function ToggleChip({
  selected,
  onClick,
  children,
  tone = "accent",
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  tone?: "accent" | "warn";
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={clsx(
        "inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100",
        selected
          ? tone === "warn"
            ? "border-amber-300 bg-amber-50 text-amber-900"
            : "border-indigo-200 bg-indigo-50 text-indigo-700"
          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50",
      )}
    >
      {children}
    </button>
  );
}

/* ---------------- alerts ---------------- */

const ALERT_TONE: Record<Tone, { box: string; icon: LucideIcon; iconClass: string }> = {
  good: { box: "border-emerald-200 bg-emerald-50 text-emerald-900", icon: CircleCheck, iconClass: "text-emerald-600" },
  info: { box: "border-gray-200 bg-gray-50 text-gray-700", icon: Info, iconClass: "text-indigo-600" },
  neutral: { box: "border-gray-200 bg-gray-50 text-gray-700", icon: Info, iconClass: "text-gray-500" },
  warn: { box: "border-amber-200 bg-amber-50 text-amber-900", icon: TriangleAlert, iconClass: "text-amber-600" },
  risk: { box: "border-red-200 bg-red-50 text-red-800", icon: CircleAlert, iconClass: "text-red-600" },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const style = ALERT_TONE[tone];
  const Icon = style.icon;
  return (
    <div className={clsx("flex gap-3 rounded-xl border px-4 py-3 text-sm", style.box, className)} role={tone === "risk" ? "alert" : undefined}>
      <Icon className={clsx("mt-0.5 h-4 w-4 shrink-0", style.iconClass)} aria-hidden />
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="space-y-1 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-4">{children}</div> : null}
      </div>
    </div>
  );
}

export function insightTone(level: string): Tone {
  return level === "risk" ? "risk" : level === "warn" ? "warn" : level === "good" ? "good" : "info";
}

/* ---------------- charts ---------------- */

export function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={clsx("h-full rounded-full", pct >= 100 ? "bg-emerald-500" : "bg-indigo-500")} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function BarList({ items, unit = "min" }: { items: { label: string; value: number }[]; unit?: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.label} className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm">
          <span className="truncate text-gray-700" title={item.label}>
            {item.label}
          </span>
          <span className="h-2 overflow-hidden rounded-full bg-gray-100">
            <span className="block h-full rounded-full bg-indigo-500" style={{ width: `${Math.round((item.value / max) * 100)}%` }} />
          </span>
          <span className="tabular-nums text-gray-500">
            {item.value} {unit}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Inline SVG sparkline, no chart library. */
export function Sparkline({
  points,
  invert = false,
}: {
  points: { date: string; value: number }[];
  /** True when lower is better (pain, stress, weight loss). */
  invert?: boolean;
}) {
  if (points.length < 2) {
    return <p className="text-xs text-gray-500">Log at least two days to see a trend.</p>;
  }
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 300;
  const height = 40;
  const coords = points.map((point, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - ((point.value - min) / span) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const first = values[0];
  const last = values[values.length - 1];
  const improving = invert ? last < first : last > first;
  const stroke = last === first ? "var(--muted)" : improving ? "var(--success)" : "var(--warn)";

  return (
    <svg className="block h-10 w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ---------------- profile switcher & loading ---------------- */

export function ProfileSwitcher({
  profiles,
  activeId,
  onChange,
}: {
  profiles: FitnessProfile[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  if (profiles.length < 2) return null;
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
      <span className="shrink-0">Person</span>
      <Select value={activeId} onChange={(event) => onChange(event.target.value)} className="!w-auto min-w-[10rem]">
        {profiles.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.name || "Unnamed"}
          </option>
        ))}
      </Select>
    </label>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="h-8 w-56 animate-pulse rounded-lg bg-gray-100" />
      <div className="h-4 w-80 max-w-full animate-pulse rounded-lg bg-gray-100" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
    </div>
  );
}

/* ---------------- data ---------------- */

/** Re-renders the caller whenever fitness data changes in another tab or view. */
export function useFitnessData<T>(read: () => T, deps: unknown[] = []): [T | null, () => void] {
  const [value, setValue] = useState<T | null>(null);

  const refresh = () => setValue(read());

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener(FITNESS_CHANGE_EVENT, handler);
    window.addEventListener("storage", handler);
    // Data pulled from the account after sign-in.
    window.addEventListener(SYNCED_EVENT, handler);
    return () => {
      window.removeEventListener(SYNCED_EVENT, handler);
      window.removeEventListener(FITNESS_CHANGE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return [value, refresh];
}

export const ROLE_LABEL: Record<string, string> = {
  warmup: "Warm-up",
  main: "Main",
  accessory: "Accessory",
  cooldown: "Cool-down",
  mindset: "Mindset",
  habit: "Habit",
};

/** "low_impact" -> "Low impact". */
export const sentence = (text: string) => {
  const t = text.replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export const SEX_LABEL: Record<FitnessProfile["sex"], string> = { female: "Female", male: "Male", other: "Other" };
