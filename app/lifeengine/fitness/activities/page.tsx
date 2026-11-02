"use client";

/**
 * Activity library browser.
 *
 * Every activity in the catalog, filterable by category, indoor or outdoor,
 * purpose and impact and, when a profile exists, flagged where it clashes
 * with that person's safety limits. Results come in pages of 20.
 */

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search, SearchX, SlidersHorizontal, X } from "lucide-react";

import { Badge, PageSkeleton, sentence, useFitnessData } from "../ui";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { ACTIVITIES, BUCKET_LABELS, CATEGORY_LABELS, EQUIPMENT_LABELS } from "@/lib/fitness/activities";
import { eligibleActivities, mergeGoals } from "@/lib/fitness/engine";
import { GOAL_LIST, GOALS } from "@/lib/fitness/goals";
import { buildSafetyReport } from "@/lib/fitness/screening";
import { getActiveProfile } from "@/lib/fitness/store";
import type { ActivityCategory, Environment, GoalId, ImpactLevel } from "@/lib/fitness/types";

const IMPACT_ORDER: ImpactLevel[] = ["none", "low", "moderate", "high"];
const PAGE_SIZE = 20;
const CATEGORIES = (Object.keys(CATEGORY_LABELS) as ActivityCategory[])
  .map((key) => ({ key, count: ACTIVITIES.filter((a) => a.category === key).length }))
  .filter((entry) => entry.count > 0);

export default function ActivityLibraryPage() {
  const [category, setCategory] = useState<ActivityCategory | "all">("all");
  const [environment, setEnvironment] = useState<Environment | "all">("all");
  const [goal, setGoal] = useState<GoalId | "all">("all");
  const [maxImpact, setMaxImpact] = useState<ImpactLevel | "all">("all");
  const [query, setQuery] = useState("");
  const [safeOnly, setSafeOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const [data] = useFitnessData(() => {
    const profile = getActiveProfile();
    if (!profile) return { profile: undefined, eligibleIds: null as Set<string> | null };
    const safety = buildSafetyReport(profile);
    const merged = mergeGoals(profile);
    return {
      profile,
      eligibleIds: new Set(eligibleActivities(profile, safety, merged).map((s) => s.activity.id)),
    };
  });

  const results = useMemo(
    () =>
      ACTIVITIES.filter((activity) => {
        if (category !== "all" && activity.category !== category) return false;
        if (environment !== "all" && !activity.environments.includes(environment)) return false;
        if (goal !== "all" && !activity.goodFor.includes(goal)) return false;
        if (maxImpact !== "all" && IMPACT_ORDER.indexOf(activity.impact) > IMPACT_ORDER.indexOf(maxImpact)) return false;
        if (safeOnly && data?.eligibleIds && !data.eligibleIds.has(activity.id)) return false;
        if (query) {
          const haystack = `${activity.name} ${activity.category} ${activity.benefit} ${activity.muscles.join(" ")}`.toLowerCase();
          if (!haystack.includes(query.toLowerCase())) return false;
        }
        return true;
      }),
    [category, environment, goal, maxImpact, query, safeOnly, data],
  );

  // Back to the first page whenever the filters change.
  useEffect(() => setVisible(PAGE_SIZE), [category, environment, goal, maxImpact, query, safeOnly]);

  const activeCount = [category !== "all", environment !== "all", goal !== "all", maxImpact !== "all", safeOnly].filter(Boolean).length;

  const clearFilters = () => {
    setCategory("all");
    setEnvironment("all");
    setGoal("all");
    setMaxImpact("all");
    setSafeOnly(false);
  };

  if (!data) return <PageSkeleton />;

  const shown = results.slice(0, visible);
  const indoorCount = results.filter((a) => a.environments.includes("indoor")).length;
  const outdoorCount = results.filter((a) => a.environments.includes("outdoor")).length;

  return (
    <div>
      <PageHeader
        title="Activity library"
        description={`${ACTIVITIES.length} activities with steps, form cues and easier or harder versions. Swaps in your plan come from here.`}
      />

      {/* ---------------- search + filters ---------------- */}
      <div className="space-y-3">
        <label htmlFor="activity-search" className="block text-[13px] font-semibold text-gray-700">
          Search activities
        </label>
        <div className="!mt-1.5 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <Input
              id="activity-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. knee, walking"
              className="!pl-10"
            />
          </div>
          <Button
            variant="ghost"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls="activity-filters"
            className="shrink-0 lg:!hidden"
          >
            <SlidersHorizontal aria-hidden />
            Filters
            {activeCount ? (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs font-semibold text-white">
                {activeCount}
              </span>
            ) : null}
          </Button>
        </div>

        <div
          id="activity-filters"
          className={clsx("rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:block", filtersOpen ? "block" : "hidden")}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Type">
              <Select value={category} onChange={(event) => setCategory(event.target.value as ActivityCategory | "all")}>
                <option value="all">All types ({ACTIVITIES.length})</option>
                {CATEGORIES.map(({ key, count }) => (
                  <option key={key} value={key}>
                    {CATEGORY_LABELS[key]} ({count})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Indoor or outdoor">
              <Select value={environment} onChange={(event) => setEnvironment(event.target.value as Environment | "all")}>
                <option value="all">Either</option>
                <option value="indoor">Indoor</option>
                <option value="outdoor">Outdoor</option>
              </Select>
            </Field>
            <Field label="Good for">
              <Select value={goal} onChange={(event) => setGoal(event.target.value as GoalId | "all")}>
                <option value="all">Any goal</option>
                {GOAL_LIST.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Maximum impact">
              <Select value={maxImpact} onChange={(event) => setMaxImpact(event.target.value as ImpactLevel | "all")}>
                <option value="all">Any</option>
                <option value="none">No impact only</option>
                <option value="low">Low or less</option>
                <option value="moderate">Moderate or less</option>
              </Select>
            </Field>
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            {data.profile ? (
              <label htmlFor="safe-only" className="flex min-h-[40px] cursor-pointer items-center gap-3 text-sm text-gray-700">
                <input
                  id="safe-only"
                  type="checkbox"
                  checked={safeOnly}
                  onChange={(event) => setSafeOnly(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-indigo-600"
                />
                Only what suits {data.profile.name || "this profile"} ({data.eligibleIds?.size ?? 0})
              </label>
            ) : (
              <p className="text-sm text-gray-500">
                <Link href="/lifeengine/fitness" className="font-medium text-indigo-600 hover:text-indigo-700">
                  Set up a fitness profile
                </Link>{" "}
                to see what is safe for you.
              </p>
            )}
            <div className="flex gap-2">
              {activeCount ? (
                <Button variant="subtle" size="sm" onClick={clearFilters}>
                  <X aria-hidden />
                  Clear filters
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" onClick={() => setFiltersOpen(false)} className="lg:!hidden">
                Done
              </Button>
            </div>
          </div>
        </div>

        <p role="status" className="text-sm text-gray-500">
          {results.length === ACTIVITIES.length && !query
            ? `${results.length} activities`
            : `${results.length} of ${ACTIVITIES.length} activities match`}
          {results.length ? `, ${indoorCount} indoor, ${outdoorCount} outdoor` : ""}
        </p>
      </div>

      {/* ---------------- results ---------------- */}
      {results.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Nothing matches"
          description="Try a different search or widen a filter."
          className="mt-4"
          action={
            <Button
              variant="ghost"
              onClick={() => {
                clearFilters();
                setQuery("");
              }}
            >
              Clear search and filters
            </Button>
          }
        />
      ) : (
        <>
          <ul className="mt-4 grid gap-4 lg:grid-cols-2">
            {shown.map((activity) => {
              const blocked = data.eligibleIds ? !data.eligibleIds.has(activity.id) : false;
              return (
                <li key={activity.id} className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-gray-900">{activity.name}</h2>
                      <p className="text-sm text-gray-500">{CATEGORY_LABELS[activity.category]}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                      {activity.environments.map((env) => (
                        <Badge key={env}>{sentence(env)}</Badge>
                      ))}
                    </div>
                  </div>

                  {data.profile && blocked ? (
                    <Badge tone="warn" className="self-start">
                      Not advised for {data.profile.name || "this profile"}
                    </Badge>
                  ) : null}

                  <p className="text-sm text-gray-700">{activity.benefit}</p>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge>{sentence(activity.intensity)}</Badge>
                    <Badge>{activity.impact === "none" ? "No impact" : `${sentence(activity.impact)} impact`}</Badge>
                    <Badge>{sentence(activity.jointLoad)} joint load</Badge>
                    <Badge>
                      {activity.minMinutes} to {activity.maxMinutes} min
                    </Badge>
                    <Badge>{sentence(activity.skill)}</Badge>
                    {activity.apartmentFriendly ? null : <Badge tone="warn">Noisy</Badge>}
                    {activity.weatherDependent ? <Badge>Weather dependent</Badge> : null}
                  </div>

                  <dl className="space-y-1 text-sm">
                    <div>
                      <dt className="inline font-medium text-gray-900">Trains: </dt>
                      <dd className="inline text-gray-600">
                        {activity.buckets.map((b) => BUCKET_LABELS[b] ?? b).join(", ")}
                        {activity.muscles.length ? `; ${activity.muscles.join(", ")}` : ""}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline font-medium text-gray-900">Needs: </dt>
                      <dd className="inline text-gray-600">{activity.equipment.map((e) => EQUIPMENT_LABELS[e] ?? e).join(", ")}</dd>
                    </div>
                  </dl>

                  <details className="group mt-auto border-t border-gray-100 pt-2">
                    <summary className="inline-flex min-h-[40px] cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 [&::-webkit-details-marker]:hidden">
                      <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
                      How to do it
                    </summary>
                    <div className="mt-1 space-y-3 text-sm text-gray-700">
                      {activity.howTo.length ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Method</p>
                          <ol className="mt-1 list-decimal space-y-1 pl-5">
                            {activity.howTo.map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ol>
                        </div>
                      ) : null}
                      {activity.formCues.length ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Form cues</p>
                          <ul className="mt-1 list-disc space-y-1 pl-5">
                            {activity.formCues.map((cue) => (
                              <li key={cue}>{cue}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      <p>
                        <span className="font-medium text-gray-900">Harder: </span>
                        {activity.progression}
                      </p>
                      <p>
                        <span className="font-medium text-gray-900">Easier: </span>
                        {activity.regression}
                      </p>
                      {activity.goodFor.length ? (
                        <p>
                          <span className="font-medium text-gray-900">Good for: </span>
                          {activity.goodFor
                            .map((g) => GOALS[g]?.label)
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      ) : null}
                      {activity.tags.length ? (
                        <p>
                          <span className="font-medium text-gray-900">Involves: </span>
                          {activity.tags.map((t) => t.replace(/_/g, " ")).join(", ")}
                        </p>
                      ) : null}
                      <p className="text-xs text-gray-500">{activity.met} MET</p>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex flex-col items-center gap-3">
            <p className="text-sm text-gray-500">
              Showing {shown.length} of {results.length}
            </p>
            {shown.length < results.length ? (
              <Button variant="ghost" onClick={() => setVisible((count) => count + PAGE_SIZE)}>
                Show {Math.min(PAGE_SIZE, results.length - shown.length)} more
              </Button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
