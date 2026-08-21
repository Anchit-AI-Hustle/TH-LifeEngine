"use client";

/** Shared presentational pieces for the fitness planner screens. */

import Link from "next/link";
import { useEffect, useState } from "react";

import styles from "./Fitness.module.css";
import { FITNESS_CHANGE_EVENT } from "@/lib/fitness/store";

export function Stat({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
}) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>
        {value}
        {unit ? <span className={styles.statUnit}>{unit}</span> : null}
      </span>
      {hint ? <span className={styles.statHint}>{hint}</span> : null}
    </div>
  );
}

export type Tone = "good" | "info" | "warn" | "risk" | "neutral";

const TONE_BADGE: Record<Tone, string> = {
  good: styles.badgeGood,
  info: styles.badgeInfo,
  warn: styles.badgeWarn,
  risk: styles.badgeRisk,
  neutral: "",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`${styles.badge} ${TONE_BADGE[tone]}`}>{children}</span>;
}

const TONE_ALERT: Record<Tone, string> = {
  good: styles.alertGood,
  info: styles.alertInfo,
  warn: styles.alertWarn,
  risk: styles.alertStop,
  neutral: styles.alertInfo,
};

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: Tone;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${styles.alert} ${TONE_ALERT[tone]}`} role={tone === "risk" ? "alert" : undefined}>
      {title ? <span className={styles.alertTitle}>{title}</span> : null}
      {children}
    </div>
  );
}

export function Meter({ value, max, tone }: { value: number; max: number; tone?: "good" | "warn" }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const fill = tone === "good" ? styles.meterFillGood : tone === "warn" ? styles.meterFillWarn : "";
  return (
    <div className={styles.meter} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`${styles.meterFill} ${fill}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function BarList({
  items,
  unit = "min",
}: {
  items: { label: string; value: number }[];
  unit?: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className={styles.bars}>
      {items.map((item) => (
        <div key={item.label} className={styles.barRow}>
          <span>{item.label}</span>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: `${Math.round((item.value / max) * 100)}%` }} />
          </div>
          <span className={styles.barValue}>
            {item.value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Inline SVG sparkline — no chart library, works in both themes. */
export function Sparkline({
  points,
  invert = false,
}: {
  points: { date: string; value: number }[];
  /** True when lower is better (pain, stress, weight loss). */
  invert?: boolean;
}) {
  if (points.length < 2) {
    return <p className={styles.tiny}>Log at least two days to see a trend.</p>;
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
    <svg className={styles.spark} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={coords.join(" ")} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function EmptyState({
  title,
  children,
  actionHref,
  actionLabel,
}: {
  title: string;
  children?: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyTitle}>{title}</span>
      {children ? <div className={styles.muted}>{children}</div> : null}
      {actionHref && actionLabel ? (
        <Link className="btn" href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

/** Re-renders the caller whenever fitness data changes in another tab or view. */
export function useFitnessData<T>(read: () => T, deps: unknown[] = []): [T | null, () => void] {
  const [value, setValue] = useState<T | null>(null);

  const refresh = () => setValue(read());

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener(FITNESS_CHANGE_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(FITNESS_CHANGE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return [value, refresh];
}

export { styles as fitnessStyles };
