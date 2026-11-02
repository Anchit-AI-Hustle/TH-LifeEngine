"use client";

import clsx from "clsx";
import { Plus } from "lucide-react";
import { targetLabel } from "@/lib/habits/logic";
import type { HabitTemplate } from "@/lib/habits/types";
import { HABIT_COLORS, HABIT_ICONS } from "./palette";

/** Ready-made habits, one tap to add. */
export function TemplateGallery({
  templates,
  onAdd,
  columns = "sm:grid-cols-2 xl:grid-cols-3",
}: {
  templates: HabitTemplate[];
  onAdd: (template: HabitTemplate) => void;
  columns?: string;
}) {
  return (
    <ul className={clsx("grid gap-3", columns)}>
      {templates.map((t) => {
        const Icon = HABIT_ICONS[t.icon].icon;
        return (
          <li key={t.id} className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <span className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", HABIT_COLORS[t.color].soft)}>
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">{t.name}</p>
              <p className="mt-0.5 text-sm text-gray-600">{t.why}</p>
              <p className="mt-1.5 text-xs text-gray-500">{targetLabel(t.target)}</p>
            </div>
            <button
              type="button"
              onClick={() => onAdd(t)}
              aria-label={`Add ${t.name}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              <Plus className="h-5 w-5" aria-hidden />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
