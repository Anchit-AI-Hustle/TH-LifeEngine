import clsx from "clsx";

/**
 * A circular progress ring in SVG with an optional centre label drawn in the
 * same SVG (so it can never drift off the ring). `label` is the text
 * equivalent for assistive tech.
 */
export function ProgressRing({
  value,
  size = 56,
  stroke = 6,
  strokeClass = "stroke-indigo-600",
  label,
  center,
  centerSize = 12,
}: {
  /** 0..1 */
  value: number;
  size?: number;
  stroke?: number;
  strokeClass?: string;
  label: string;
  center?: string;
  centerSize?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  const mid = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className="shrink-0">
      <circle cx={mid} cy={mid} r={r} fill="none" strokeWidth={stroke} className="stroke-gray-100" />
      <circle
        cx={mid}
        cy={mid}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - clamped)}
        transform={`rotate(-90 ${mid} ${mid})`}
        className={clsx(strokeClass, "transition-[stroke-dashoffset] duration-500 ease-out")}
      />
      {center ? (
        <text
          x={mid}
          y={mid}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={centerSize}
          fontWeight={600}
          className="fill-gray-900 tabular-nums"
          aria-hidden
        >
          {center}
        </text>
      ) : null}
    </svg>
  );
}
