import clsx from "clsx";

/** Soft tints for avatars. The same name always gets the same tint. */
const TINTS = [
  "bg-indigo-50 text-indigo-700 ring-indigo-100",
  "bg-emerald-50 text-emerald-700 ring-emerald-100",
  "bg-amber-50 text-amber-800 ring-amber-100",
  "bg-rose-50 text-rose-700 ring-rose-100",
  "bg-sky-50 text-sky-700 ring-sky-100",
  "bg-lime-50 text-lime-800 ring-lime-100",
  "bg-orange-50 text-orange-700 ring-orange-100",
  "bg-gray-100 text-gray-700 ring-gray-200",
];

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

function tintOf(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return TINTS[hash % TINTS.length];
}

export function ProfileAvatar({
  name,
  seed,
  size = "md",
}: {
  name: string;
  /** Stable key for the colour, usually the profile id. */
  seed?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      aria-hidden
      className={clsx(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold ring-1",
        tintOf(seed || name),
        size === "sm" && "h-9 w-9 text-xs",
        size === "md" && "h-11 w-11 text-sm",
        size === "lg" && "h-12 w-12 text-base",
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

export const GENDER_LABEL: Record<string, string> = { male: "Male", female: "Female", other: "Other" };
export const EXPERIENCE_LABEL: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};
export const TIME_LABEL: Record<string, string> = { morning: "Mornings", evening: "Evenings", flexible: "Flexible time" };
