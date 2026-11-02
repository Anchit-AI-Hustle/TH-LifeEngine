import {
  Apple,
  BookOpen,
  Brain,
  CandyOff,
  Coffee,
  Droplets,
  Dumbbell,
  Footprints,
  Heart,
  Leaf,
  MonitorOff,
  Moon,
  PersonStanding,
  Salad,
  Sun,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { HabitColor, HabitIcon } from "@/lib/habits/types";

export const HABIT_ICONS: Record<HabitIcon, { icon: LucideIcon; label: string }> = {
  droplets: { icon: Droplets, label: "Water" },
  footprints: { icon: Footprints, label: "Walk" },
  wind: { icon: Wind, label: "Breathing" },
  moon: { icon: Moon, label: "Sleep" },
  "candy-off": { icon: CandyOff, label: "No sugar" },
  "book-open": { icon: BookOpen, label: "Reading" },
  sun: { icon: Sun, label: "Sunlight" },
  "person-standing": { icon: PersonStanding, label: "Stretch" },
  dumbbell: { icon: Dumbbell, label: "Strength" },
  apple: { icon: Apple, label: "Fruit" },
  salad: { icon: Salad, label: "Vegetables" },
  coffee: { icon: Coffee, label: "Less caffeine" },
  brain: { icon: Brain, label: "Mind" },
  leaf: { icon: Leaf, label: "Nature" },
  heart: { icon: Heart, label: "Heart" },
  "monitor-off": { icon: MonitorOff, label: "Screen-free" },
};

export const ICON_KEYS = Object.keys(HABIT_ICONS) as HabitIcon[];

/**
 * Literal Tailwind classes per habit colour (Tailwind only scans components/
 * and app/, so these must live here, not in lib/).
 */
export const HABIT_COLORS: Record<
  HabitColor,
  { label: string; solid: string; soft: string; swatch: string; stroke: string; border: string; text: string }
> = {
  indigo: {
    label: "Indigo",
    solid: "bg-indigo-600 text-white",
    soft: "bg-indigo-50 text-indigo-600",
    swatch: "bg-indigo-600",
    stroke: "stroke-indigo-600",
    border: "border-indigo-600",
    text: "text-indigo-700",
  },
  emerald: {
    label: "Green",
    solid: "bg-emerald-600 text-white",
    soft: "bg-emerald-50 text-emerald-600",
    swatch: "bg-emerald-600",
    stroke: "stroke-emerald-600",
    border: "border-emerald-600",
    text: "text-emerald-700",
  },
  amber: {
    label: "Amber",
    solid: "bg-amber-500 text-white",
    soft: "bg-amber-50 text-amber-600",
    swatch: "bg-amber-500",
    stroke: "stroke-amber-500",
    border: "border-amber-500",
    text: "text-amber-700",
  },
  rose: {
    label: "Rose",
    solid: "bg-rose-600 text-white",
    soft: "bg-rose-50 text-rose-600",
    swatch: "bg-rose-600",
    stroke: "stroke-rose-600",
    border: "border-rose-600",
    text: "text-rose-700",
  },
  lime: {
    label: "Lime",
    solid: "bg-lime-600 text-white",
    soft: "bg-lime-50 text-lime-700",
    swatch: "bg-lime-600",
    stroke: "stroke-lime-600",
    border: "border-lime-600",
    text: "text-lime-700",
  },
  slate: {
    label: "Slate",
    solid: "bg-slate-700 text-white",
    soft: "bg-slate-100 text-slate-700",
    swatch: "bg-slate-700",
    stroke: "stroke-slate-700",
    border: "border-slate-700",
    text: "text-slate-700",
  },
};

export const COLOR_KEYS = Object.keys(HABIT_COLORS) as HabitColor[];

/** Five heatmap shades for the all-habits view (0 = nothing done). */
export const HEAT_SHADES = ["bg-gray-100", "bg-indigo-200", "bg-indigo-300", "bg-indigo-500", "bg-indigo-700"] as const;

/** Single-habit heatmap: done cells in the habit colour. */
export const HABIT_HEAT: Record<HabitColor, string> = {
  indigo: "bg-indigo-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-400",
  rose: "bg-rose-500",
  lime: "bg-lime-500",
  slate: "bg-slate-600",
};

const DAY_FMT = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const LONG_FMT = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const NARROW_FMT = new Intl.DateTimeFormat("en-IN", { weekday: "narrow", timeZone: "UTC" });

function keyDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** "Mon, 2 Nov" */
export const formatDay = (key: string) => DAY_FMT.format(keyDate(key));
/** "Monday, 2 November" */
export const formatLongDay = (key: string) => LONG_FMT.format(keyDate(key));
/** "M" */
export const formatNarrowDay = (key: string) => NARROW_FMT.format(keyDate(key));
