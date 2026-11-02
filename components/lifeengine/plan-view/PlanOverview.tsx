import { Droplets, HeartPulse, Info } from "lucide-react";
import type { LifeEnginePlan } from "@/app/types/lifeengine";
import { humanize, parseLocalDate, formatDate } from "./model";

/** Motivation, category and summary from a Custom GPT plan. */
export function PlanSummaryCard({ plan }: { plan: LifeEnginePlan }) {
  if (!plan.motivation && !plan.summary && !plan.category_tag) return null;
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      {plan.category_tag && (
        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
          {plan.category_tag}
        </span>
      )}
      {plan.motivation && <h2 className="mt-3 text-base font-semibold text-gray-900 first:mt-0">{plan.motivation}</h2>}
      {plan.summary && <p className="mt-1.5 text-sm leading-6 text-gray-700">{plan.summary}</p>}
    </section>
  );
}

/** Hydration, recovery and the safety note that apply to the whole plan. */
export function PlanExtras({ plan, showMeta = true }: { plan: LifeEnginePlan; showMeta?: boolean }) {
  const recovery = Array.isArray(plan.recovery_tips) ? plan.recovery_tips.filter(Boolean) : [];
  const created = parseLocalDate(plan.metadata?.timestamp);
  const types = (plan.metadata?.plan_type ?? []).map(humanize).join(", ");
  const meta = [
    created ? `Created ${formatDate(created, { day: "numeric", month: "short", year: "numeric" })}` : null,
    types || null,
    plan.metadata?.language ? humanize(plan.metadata.language) : null,
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      {(plan.hydration_goals || recovery.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {plan.hydration_goals && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Droplets className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="text-base font-semibold text-gray-900">Hydration</h3>
              </div>
              <p className="mt-3 text-sm text-gray-700">{plan.hydration_goals}</p>
            </section>
          )}
          {recovery.length > 0 && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <HeartPulse className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="text-base font-semibold text-gray-900">Recovery</h3>
              </div>
              <ul className="mt-3 space-y-2">
                {recovery.map((tip, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-gray-700">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    <span className="min-w-0 flex-1">{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {plan.disclaimer && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <p className="min-w-0">
            <span className="font-semibold">Before you start: </span>
            {plan.disclaimer}
          </p>
        </div>
      )}

      {showMeta && meta.length > 0 && <p className="text-xs text-gray-500">{meta.join(" · ")}</p>}
    </div>
  );
}
