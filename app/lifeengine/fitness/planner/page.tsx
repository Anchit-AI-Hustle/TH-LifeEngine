"use client";

/**
 * The generated plan: safety, targets, the week-by-week schedule with every
 * block spelled out, and the reasoning behind it.
 */

import clsx from "clsx";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, Droplets, Flame, Footprints, Gauge, RefreshCw, Scale, Timer, Utensils } from "lucide-react";

import { Alert, Badge, Card, LinkButton, PageSkeleton, ProfileSwitcher, ROLE_LABEL, SectionHeading, Stat, useFitnessData } from "../ui";
import { ProfileSourcePicker, possessive } from "@/components/lifeengine/fitness/ProfileSourcePicker";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { CATEGORY_LABELS, getActivity } from "@/lib/fitness/activities";
import { buildFitnessPlan } from "@/lib/fitness/engine";
import { GOALS } from "@/lib/fitness/goals";
import { getActiveProfile, getFitnessProfiles, getLatestPlanForProfile, saveFitnessPlan, setActiveProfileId } from "@/lib/fitness/store";
import type { FitnessProfile, PlanBlock } from "@/lib/fitness/types";

const ROLE_BORDER: Record<PlanBlock["role"], string> = {
  warmup: "border-l-gray-300",
  main: "border-l-indigo-500",
  accessory: "border-l-indigo-200",
  cooldown: "border-l-emerald-300",
  mindset: "border-l-emerald-300",
  habit: "border-l-emerald-300",
};


function Disclosure({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="inline-flex min-h-[40px] cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 [&::-webkit-details-marker]:hidden">
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
        {summary}
      </summary>
      <div className="mt-1 space-y-2 text-sm text-gray-700">{children}</div>
    </details>
  );
}

function BulletList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={clsx("list-disc space-y-1 pl-5 text-sm text-gray-700", className)}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function PlannerPage() {
  const [weekIndex, setWeekIndex] = useState(1);
  const [busy, setBusy] = useState(false);
  const [weeks, setWeeks] = useState(4);
  const [rebuilt, setRebuilt] = useState(false);

  const [data, refresh] = useFitnessData(() => {
    const profile = getActiveProfile();
    return {
      profile,
      profiles: getFitnessProfiles(),
      plan: profile ? getLatestPlanForProfile(profile.id) : undefined,
    };
  });

  const plan = data?.plan;
  const profile = data?.profile;

  const week = useMemo(() => plan?.weeks.find((w) => w.weekIndex === weekIndex) ?? plan?.weeks[0], [plan, weekIndex]);

  const regenerate = (profileToUse: FitnessProfile, weekCount: number) => {
    setBusy(true);
    try {
      const next = buildFitnessPlan(profileToUse, { weeks: weekCount });
      saveFitnessPlan(next);
      setWeekIndex(1);
      setRebuilt(true);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <PageSkeleton />;

  if (!profile) {
    return (
      <div>
        <PageHeader title="Activity plan" description="A week-by-week plan built from a health profile." />
        <ProfileSourcePicker title="Who is the plan for?" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div>
        <PageHeader title="Activity plan" description={`Built from ${profile.name ? possessive(profile.name) : "the saved"} health profile.`} />
        <EmptyState
          icon={CalendarDays}
          title="No plan yet"
          description="The profile is saved. Build a plan from it when you are ready."
          action={
            <Button disabled={busy} onClick={() => regenerate(profile, weeks)}>
              {busy ? "Building" : "Build my plan"}
            </Button>
          }
        />
      </div>
    );
  }

  const scoreTone = plan.scores.overall >= 80 ? "good" : plan.scores.overall >= 60 ? "neutral" : "warn";

  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          eyebrow={`Activity plan · ${profile.name}`}
          title={plan.title}
          description={plan.summary}
          actions={
            <>
              <ProfileSwitcher
                profiles={data.profiles}
                activeId={profile.id}
                onChange={(id) => {
                  setActiveProfileId(id);
                  setRebuilt(false);
                  refresh();
                }}
              />
              <LinkButton variant="ghost" href="/lifeengine/fitness/profile">
                Edit profile
              </LinkButton>
              <LinkButton href="/lifeengine/fitness/tracker">Log today</LinkButton>
            </>
          }
        />
        <div className="-mt-2 flex flex-wrap gap-1.5">
          <Badge tone={scoreTone}>Plan fit {plan.scores.overall}/100</Badge>
          <Badge>Safety {plan.scores.safety}</Badge>
          <Badge>Goal match {plan.scores.goalMatch}</Badge>
          <Badge>Variety {plan.scores.variety}</Badge>
          <Badge>Feasibility {plan.scores.feasibility}</Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Goals">
          {plan.goals.slice(0, 5).map((goal) => (
            <Badge key={goal.id} tone={goal.id === plan.primaryGoal ? "info" : "neutral"}>
              {goal.id === plan.primaryGoal ? "Main: " : ""}
              {goal.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* ---------------- safety ---------------- */}
      {plan.safety.blocksPlan ? (
        <Alert tone="risk" title="Do not start this plan yet">
          <ul>
            {plan.safety.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <p>It is shown so you can take it to your doctor. Get assessed first.</p>
        </Alert>
      ) : plan.safety.level === "clearance_required" ? (
        <Alert tone="warn" title="Get medical clearance before you start">
          <ul>
            {plan.safety.reasons.slice(0, 6).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {plan.warnings.length ? (
        <Alert tone="info" title="Worth knowing">
          <ul>
            {plan.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {/* ---------------- week ---------------- */}
      <section className="space-y-4" aria-labelledby="week-title">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id="week-title" className="text-base font-semibold text-gray-900">
              Your week
            </h2>
            <p className="mt-1 text-sm text-gray-500">Pick a week to see each day.</p>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Weeks">
            {plan.weeks.map((entry) => {
              const active = entry.weekIndex === week?.weekIndex;
              return (
                <button
                  key={entry.weekIndex}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setWeekIndex(entry.weekIndex)}
                  className={clsx(
                    "inline-flex min-h-[40px] items-center rounded-full px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100",
                    active ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                  )}
                >
                  Week {entry.weekIndex}
                  {entry.phase === "deload" ? ", easy" : ""}
                </button>
              );
            })}
          </div>
        </div>

        {week ? (
          <>
            <Card className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Week {week.weekIndex} · {week.phase}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{week.focus}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  <Badge>{week.targetWeeklyMinutes} active min</Badge>
                  <Badge>{week.days.filter((d) => !d.isRestDay).length} sessions</Badge>
                  <Badge>~{week.days.reduce((sum, d) => sum + d.estimatedCalories, 0)} kcal</Badge>
                </div>
              </div>
              <p className="max-w-prose text-sm text-gray-600">{week.progressionNote}</p>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              {week.days.map((day) => (
                <article key={day.dayIndex} className={clsx("rounded-2xl border bg-white shadow-sm", day.isRestDay ? "border-gray-200 bg-gray-50/60" : "border-gray-200")}>
                  <header className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900">{day.weekday}</h3>
                      <p className="text-sm text-gray-500">{day.focus}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                      {day.isRestDay ? (
                        <Badge tone="good">Rest</Badge>
                      ) : (
                        <>
                          <Badge>{day.totalMinutes} min</Badge>
                          <Badge>~{day.estimatedCalories} kcal</Badge>
                        </>
                      )}
                    </div>
                  </header>
                  <div className="space-y-3 px-5 py-4">
                    {day.blocks.map((block, index) => {
                      const activity = getActivity(block.activityId);
                      return (
                        <div key={`${block.activityId}-${index}`} className={clsx("space-y-1 border-l-4 pl-3", ROLE_BORDER[block.role])}>
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                            <p className="text-sm font-medium text-gray-900">{block.name}</p>
                            <p className="text-xs text-gray-500">
                              {ROLE_LABEL[block.role]} · {block.minutes} min
                            </p>
                          </div>
                          <p className="text-xs text-gray-500">
                            {CATEGORY_LABELS[block.category]} · {block.environment} · effort {block.rpeTarget[0]} to {block.rpeTarget[1]} of 10
                            {block.heartRateTarget ? ` · ${block.heartRateTarget.low} to ${block.heartRateTarget.high} bpm` : ""}
                            {` · ~${block.estimatedCalories} kcal`}
                          </p>
                          {block.prescription ? <p className="text-sm text-gray-700">{block.prescription}</p> : null}
                          {block.modifications.length ? (
                            <ul className="space-y-1">
                              {block.modifications.map((mod) => (
                                <li key={mod} className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
                                  {mod}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {activity ? (
                            <Disclosure summary="How to do it">
                              <p className="text-gray-600">{activity.benefit}</p>
                              {activity.howTo.length ? (
                                <ol className="list-decimal space-y-1 pl-5">
                                  {activity.howTo.map((line) => (
                                    <li key={line}>{line}</li>
                                  ))}
                                </ol>
                              ) : null}
                              {activity.formCues.length ? (
                                <>
                                  <p className="pt-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Form cues</p>
                                  <BulletList items={activity.formCues} />
                                </>
                              ) : null}
                              <p>
                                <span className="font-medium text-gray-900">Harder: </span>
                                {activity.progression}
                              </p>
                              <p>
                                <span className="font-medium text-gray-900">Easier: </span>
                                {activity.regression}
                              </p>
                              {block.swapOptions.length ? (
                                <p>
                                  <span className="font-medium text-gray-900">Swap for: </span>
                                  {block.swapOptions.map((swap) => `${swap.name} (${swap.environment})`).join(", ")}
                                </p>
                              ) : null}
                            </Disclosure>
                          ) : null}
                        </div>
                      );
                    })}

                    {day.notes.length ? <BulletList items={day.notes} className="text-gray-600" /> : null}

                    <Disclosure summary="Daily targets">
                      <p className="text-gray-600">
                        {day.dailyTargets.steps.toLocaleString()} steps · {(day.dailyTargets.waterMl / 1000).toFixed(1)} L water · {day.dailyTargets.proteinG} g protein ·{" "}
                        {day.dailyTargets.sleepHours} h sleep · {day.dailyTargets.mindfulMinutes} min calm · {day.dailyTargets.standBreaks} movement breaks
                      </p>
                    </Disclosure>

                    {day.motivation ? <p className="text-xs text-gray-500">{day.motivation}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : null}

        <Card className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">Rebuild the plan</h3>
            <p className="mt-0.5 text-sm text-gray-500">
              After you change the profile, or to change the length. Built {new Date(plan.createdAt).toLocaleDateString()}.
            </p>
            {rebuilt ? (
              <p role="status" className="mt-1 text-sm font-medium text-emerald-700">
                Plan rebuilt.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-gray-700">
              Plan length
              <Select value={weeks} onChange={(event) => setWeeks(Number(event.target.value))} className="!w-36">
                <option value={2}>2 weeks</option>
                <option value={4}>4 weeks</option>
                <option value={8}>8 weeks</option>
                <option value={12}>12 weeks</option>
              </Select>
            </label>
            <Button variant="ghost" disabled={busy} onClick={() => regenerate(profile, weeks)}>
              <RefreshCw aria-hidden />
              {busy ? "Rebuilding" : "Rebuild"}
            </Button>
          </div>
        </Card>
      </section>

      {/* ---------------- numbers ---------------- */}
      <section className="space-y-4" aria-labelledby="numbers-title">
        <SectionHeading id="numbers-title" title="Your numbers" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="BMI"
            value={plan.metrics.bmi}
            hint={`${plan.metrics.bmiCategory}${plan.metrics.bmiCutoffsUsed === "south_asian" ? ", Asian ranges" : ""}`}
            icon={Scale}
          />
          {plan.metrics.waistToHeight ? <Stat label="Waist to height" value={plan.metrics.waistToHeight} hint={plan.metrics.waistRisk} icon={Gauge} /> : null}
          <Stat label="Maintenance" value={plan.metrics.tdee} unit="kcal" hint="What you burn on a typical day" icon={Flame} />
          <Stat
            label="Daily target"
            value={plan.metrics.calorieTarget}
            unit="kcal"
            hint={
              plan.metrics.calorieDelta === 0
                ? "Maintenance"
                : `${plan.metrics.calorieDelta > 0 ? "+" : ""}${plan.metrics.calorieDelta} kcal, about ${plan.metrics.weightChangePerWeekKg} kg a week`
            }
            icon={Utensils}
          />
          <Stat label="Protein" value={plan.metrics.proteinG} unit="g/day" hint="Split across main meals" icon={Utensils} />
          <Stat label="Water" value={(plan.metrics.waterMl / 1000).toFixed(1)} unit="L/day" hint="More in heat or long sessions" icon={Droplets} />
          <Stat label="Steps" value={plan.metrics.stepTarget.toLocaleString()} hint="Outside your sessions" icon={Footprints} />
          <Stat label="Weekly minutes" value={plan.metrics.weeklyMinutesTarget} hint={`Now about ${plan.metrics.currentWeeklyMinutes}`} icon={Timer} />
          {plan.metrics.estimatedWeeksToTarget ? (
            <Stat
              label="To target weight"
              value={plan.metrics.estimatedWeeksToTarget}
              unit="weeks"
              hint={`At ${Math.abs(plan.metrics.weightChangePerWeekKg ?? 0)} kg a week`}
              icon={CalendarDays}
            />
          ) : null}
        </div>

        <Card className="space-y-4">
          <SectionHeading level={3} title="How hard to work" description={plan.metrics.rpeGuidance} />
          {plan.metrics.heartRateZones ? (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full min-w-[28rem] text-left">
                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-2.5">Zone</th>
                    <th className="px-4 py-2.5">Beats per minute</th>
                    <th className="px-4 py-2.5">What it is for</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.metrics.heartRateZones.map((zone) => (
                    <tr key={zone.zone} className="border-t border-gray-100 text-sm">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{zone.zone}</td>
                      <td className="px-4 py-2.5 tabular-nums text-gray-700">
                        {zone.low} to {zone.high}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">{zone.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Alert tone="info" title="Use effort, not heart rate">
              Heart-rate zones would mislead you, so each session gives an effort target instead: how hard it should feel on a 1 to 10 scale.
            </Alert>
          )}
          <p className="text-xs text-gray-500">
            Estimated maximum heart rate: {plan.metrics.maxHr} bpm. {plan.metrics.fitnessAgeNote}
          </p>
        </Card>
      </section>

      {/* ---------------- non-negotiables ---------------- */}
      {plan.nonNegotiables.length ? (
        <Card className="space-y-3">
          <SectionHeading title="What matters most" description="If you only do part of the plan, do these." />
          <BulletList items={plan.nonNegotiables} />
        </Card>
      ) : null}

      {/* ---------------- weather fallbacks ---------------- */}
      {plan.weatherFallbacks.length ? (
        <Card className="space-y-3">
          <SectionHeading title="If the weather or air is bad" description="Each outdoor day has an indoor swap." />
          <ul className="divide-y divide-gray-100">
            {plan.weatherFallbacks.map((entry) => (
              <li key={`${entry.weekday}-${entry.instead}`} className="grid gap-1 py-2.5 text-sm sm:grid-cols-[6rem_minmax(0,1fr)_minmax(0,1fr)] sm:gap-4">
                <span className="font-medium text-gray-900">{entry.weekday}</span>
                <span className="text-gray-500">Instead of {entry.instead}</span>
                <span className="text-gray-700">{entry.use}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* ---------------- safety detail ---------------- */}
      <section className="space-y-4" aria-labelledby="adapted-title">
        <SectionHeading id="adapted-title" title="How the plan was adapted for you" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Limits applied</h3>
            <div className="flex flex-wrap gap-1.5">
              <Badge>Intensity up to {plan.safety.intensityCeiling.replace(/_/g, " ")}</Badge>
              <Badge>Impact up to {plan.safety.maxImpact}</Badge>
              <Badge>Joint load up to {plan.safety.maxJointLoad}</Badge>
            </div>
            {plan.safety.excludedTags.length ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Movements left out</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {plan.safety.excludedTags.map((tag) => (
                    <Badge key={tag}>{tag.replace(/_/g, " ")}</Badge>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nothing had to be left out. The full library is available.</p>
            )}
            {plan.safety.cautionTags.length ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Allowed, with care</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {plan.safety.cautionTags.map((tag) => (
                    <Badge key={tag} tone="warn">
                      {tag.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>

          <Card className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Changes built in</h3>
            {plan.safety.requiredModifications.length ? (
              <BulletList items={plan.safety.requiredModifications} />
            ) : (
              <p className="text-sm text-gray-500">No condition-specific changes were needed.</p>
            )}
          </Card>

          {plan.safety.monitoring.length ? (
            <Card className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">What to keep an eye on</h3>
              <BulletList items={plan.safety.monitoring} />
            </Card>
          ) : null}

          {plan.safety.redFlags.length ? (
            <Card className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Stop and get medical help if</h3>
              <Alert tone="risk">
                <ul>
                  {plan.safety.redFlags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>
              </Alert>
            </Card>
          ) : null}
        </div>
      </section>

      {/* ---------------- education & goals ---------------- */}
      {plan.education.length ? (
        <section className="space-y-4" aria-labelledby="why-title">
          <SectionHeading id="why-title" title="Why the plan looks like this" />
          <div className="grid gap-4 lg:grid-cols-2">
            {plan.education.map((card) => (
              <Card key={card.title} className="space-y-1.5">
                <h3 className="text-sm font-semibold text-gray-900">{card.title}</h3>
                <p className="max-w-prose text-sm text-gray-600">{card.body}</p>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <Card className="space-y-4">
        <SectionHeading title="Your goals and how each is served" />
        <ul className="divide-y divide-gray-100">
          {plan.goals.map((goal) => {
            const definition = GOALS[goal.id];
            return (
              <li key={goal.id} className="space-y-1 py-3 first:pt-0 last:pb-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900">
                  {goal.label}
                  {goal.id === plan.primaryGoal ? <Badge tone="info">Main goal</Badge> : null}
                </p>
                <p className="max-w-prose text-sm text-gray-600">{goal.mechanism}</p>
                {definition?.successSignals.length ? (
                  <p className="text-xs text-gray-500">Signs it is working: {definition.successSignals.join(", ")}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="space-y-3">
        <SectionHeading title="Making it stick" />
        <BulletList items={plan.adherenceTips} />
        <LinkButton variant="subtle" size="sm" href="/lifeengine/fitness/activities" className="-ml-3">
          Browse the activity library
        </LinkButton>
      </Card>

      <div className="max-w-prose space-y-1 text-xs text-gray-500">
        {plan.safety.disclaimers.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}
