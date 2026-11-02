"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import clsx from "clsx";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { HabitColor, HabitIcon, HabitTarget } from "@/lib/habits/types";
import { COLOR_KEYS, HABIT_COLORS, HABIT_ICONS, ICON_KEYS } from "./palette";

export type HabitDraft = {
  name: string;
  icon: HabitIcon;
  color: HabitColor;
  target: HabitTarget;
  reminder: string;
};

export const BLANK_DRAFT: HabitDraft = {
  name: "",
  icon: "leaf",
  color: "indigo",
  target: { kind: "daily" },
  reminder: "",
};

/** Create or edit a habit in a native modal dialog (focus trap and Esc for free). */
export function HabitDialog({
  open,
  mode,
  initial,
  onSave,
  onClose,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial: HabitDraft;
  onSave: (draft: HabitDraft) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [draft, setDraft] = useState<HabitDraft>(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      setDraft(initial);
      setError(null);
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
    // `initial` is read only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const name = draft.name.trim();
    if (!name) {
      setError("Give the habit a short name.");
      return;
    }
    onSave({ ...draft, name, reminder: draft.reminder.trim() });
  };

  const perWeek = draft.target.kind === "weekly" ? draft.target.perWeek : 3;

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-gray-200 bg-white p-0 text-gray-900 shadow-xl backdrop:bg-gray-900/40"
    >
      <form onSubmit={submit} noValidate className="flex max-h-[85vh] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-gray-900">
              {mode === "create" ? "New habit" : "Edit habit"}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">Small and specific works best.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <Field label="Name" required error={error ?? undefined}>
            <Input
              value={draft.name}
              maxLength={60}
              autoComplete="off"
              placeholder="e.g. Drink a glass of water on waking"
              onChange={(e) => {
                setDraft({ ...draft, name: e.target.value });
                if (error) setError(null);
              }}
            />
          </Field>

          <fieldset>
            <legend className="text-[13px] font-semibold text-gray-700">Icon</legend>
            <div className="mt-2 grid grid-cols-6 gap-2 sm:grid-cols-8">
              {ICON_KEYS.map((key) => {
                const { icon: Icon, label } = HABIT_ICONS[key];
                const selected = draft.icon === key;
                return (
                  <label key={key} className="relative flex justify-center" title={label}>
                    <input
                      type="radio"
                      name="habit-icon"
                      value={key}
                      checked={selected}
                      onChange={() => setDraft({ ...draft, icon: key })}
                      aria-label={label}
                      className="peer sr-only"
                    />
                    <span
                      className={clsx(
                        "flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2",
                        selected
                          ? `${HABIT_COLORS[draft.color].soft} border-transparent ring-2 ring-inset ring-current`
                          : "border-gray-200 text-gray-500 hover:bg-gray-50",
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-[13px] font-semibold text-gray-700">Colour</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLOR_KEYS.map((key) => {
                const selected = draft.color === key;
                return (
                  <label key={key} className="relative" title={HABIT_COLORS[key].label}>
                    <input
                      type="radio"
                      name="habit-color"
                      value={key}
                      checked={selected}
                      onChange={() => setDraft({ ...draft, color: key })}
                      aria-label={HABIT_COLORS[key].label}
                      className="peer sr-only"
                    />
                    <span
                      className={clsx(
                        "flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-white ring-offset-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500",
                        HABIT_COLORS[key].swatch,
                        selected && "ring-2 ring-gray-900",
                      )}
                    >
                      {selected ? <Check className="h-4 w-4" aria-hidden /> : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-[13px] font-semibold text-gray-700">How often</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {[
                { kind: "daily" as const, title: "Every day", body: "Builds a daily streak." },
                { kind: "weekly" as const, title: "Some days a week", body: "Streak counts weeks that hit the target." },
              ].map((opt) => {
                const selected = draft.target.kind === opt.kind;
                return (
                  <label
                    key={opt.kind}
                    className={clsx(
                      "flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-500",
                      selected ? "border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500" : "border-gray-200 hover:bg-gray-50",
                    )}
                  >
                    <input
                      type="radio"
                      name="habit-target"
                      checked={selected}
                      onChange={() =>
                        setDraft({
                          ...draft,
                          target: opt.kind === "daily" ? { kind: "daily" } : { kind: "weekly", perWeek },
                        })
                      }
                      className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-600"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-gray-900">{opt.title}</span>
                      <span className="block text-xs text-gray-500">{opt.body}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            {draft.target.kind === "weekly" ? (
              <div className="mt-3 max-w-[14rem]">
                <Field label="Days per week">
                  <Select
                    value={perWeek}
                    onChange={(e) => setDraft({ ...draft, target: { kind: "weekly", perWeek: Number(e.target.value) } })}
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "day" : "days"}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            ) : null}
          </fieldset>

          <Field label="Cue or reminder time" helper="Optional. Shown on the habit as a prompt, e.g. 'After breakfast' or '7:00 am'. No notifications are sent.">
            <Input
              value={draft.reminder}
              maxLength={60}
              autoComplete="off"
              placeholder="After breakfast"
              onChange={(e) => setDraft({ ...draft, reminder: e.target.value })}
            />
          </Field>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{mode === "create" ? "Add habit" : "Save changes"}</Button>
        </div>
      </form>
    </dialog>
  );
}
