"use client";

/**
 * Fitness overview: today's session, progress, the people set up for fitness
 * and the way in to every other fitness screen.
 */

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  Activity,
  CalendarDays,
  ChevronRight,
  Download,
  Flame,
  HeartPulse,
  LibraryBig,
  Target,
  Timer,
  Trash2,
  Upload,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import { Alert, Badge, Card, LinkButton, Meter, PageSkeleton, ProfileSwitcher, ROLE_LABEL, SectionHeading, SEX_LABEL, Stat, insightTone, useFitnessData } from "./ui";
import { ProfileSourcePicker, possessive } from "@/components/lifeengine/fitness/ProfileSourcePicker";
import { ProfileAvatar } from "@/app/lifeengine/profiles/ProfileAvatar";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { CATEGORY_LABELS } from "@/lib/fitness/activities";
import { buildFitnessPlan } from "@/lib/fitness/engine";
import { GOALS } from "@/lib/fitness/goals";
import { CONDITIONS } from "@/lib/fitness/conditions";
import {
  deleteFitnessProfile,
  exportFitnessData,
  getActiveProfile,
  getFitnessProfiles,
  getLatestPlanForProfile,
  getLogsForProfile,
  importFitnessData,
  saveFitnessPlan,
  setActiveProfileId,
} from "@/lib/fitness/store";
import { summariseTracker, todayIso } from "@/lib/fitness/tracker";

const SECTIONS: { href: string; title: string; body: string; icon: LucideIcon }[] = [
  { href: "/lifeengine/fitness/profile", title: "Health profile", body: "Goals, conditions, pain, safety screen, equipment and schedule.", icon: HeartPulse },
  { href: "/lifeengine/fitness/planner", title: "Activity plan", body: "Your week, day by day, with effort targets and the reasons behind it.", icon: CalendarDays },
  { href: "/lifeengine/fitness/tracker", title: "Activity tracker", body: "Log sessions, pain, sleep and mood, then read the trends.", icon: Activity },
  { href: "/lifeengine/fitness/activities", title: "Activity library", body: "Every activity with steps, form cues and easier or harder versions.", icon: LibraryBig },
];

export default function FitnessHubPage() {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: "good" | "risk"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [data, refresh] = useFitnessData(() => {
    const profile = getActiveProfile();
    return {
      profile,
      profiles: getFitnessProfiles(),
      plan: profile ? getLatestPlanForProfile(profile.id) : undefined,
      logs: profile ? getLogsForProfile(profile.id) : [],
    };
  });

  const summary = useMemo(
    () => (data?.profile ? summariseTracker(data.profile, data.logs, data.plan) : null),
    [data],
  );

  const todayPlan = useMemo(() => {
    if (!data?.plan) return null;
    const weekday = new Date().getDay();
    const dayIndex = weekday === 0 ? 7 : weekday;
    return data.plan.weeks[0]?.days.find((day) => day.dayIndex === dayIndex) ?? null;
  }, [data?.plan]);

  const loggedToday = data?.logs.some((log) => log.date === todayIso() && log.activities.length > 0) ?? false;

  const download = () => {
    const blob = new Blob([exportFitnessData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `fitness-data-${todayIso()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const upload = async (file: File) => {
    try {
      importFitnessData(await file.text());
      setStatus({ tone: "good", text: "Fitness data imported." });
      refresh();
    } catch {
      setStatus({ tone: "risk", text: "That file is not a fitness data export." });
    }
  };

  if (!data) return <PageSkeleton />;

  const { profile } = data;

  return (
    <div>
      <PageHeader
        title={profile?.name ? `${possessive(profile.name)} fitness` : "Fitness"}
        description="A weekly activity plan that fits your health, time and equipment. Log each day to see what is working."
        actions={
          profile ? (
            <>
              <ProfileSwitcher
                profiles={data.profiles}
                activeId={profile.id}
                onChange={(id) => {
                  setActiveProfileId(id);
                  refresh();
                }}
              />
              <LinkButton variant="ghost" href="/lifeengine/fitness/profile">
                Edit profile
              </LinkButton>
            </>
          ) : null
        }
      />

      {!profile ? (
        <div className="space-y-4">
          <ProfileSourcePicker />
          <p className="mx-auto max-w-2xl text-sm text-gray-500">
            Just browsing?{" "}
            <Link href="/lifeengine/fitness/activities" className="font-medium text-indigo-600 hover:text-indigo-700">
              Open the activity library
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ---------------- today ---------------- */}
          <Card>
            <SectionHeading
              title="Today"
              action={data.plan ? loggedToday ? <Badge tone="good">Logged</Badge> : <Badge>Not logged yet</Badge> : null}
            />
            {!data.plan ? (
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600">The profile is saved. Build a plan from it when you are ready.</p>
                <Button
                  onClick={() => {
                    saveFitnessPlan(buildFitnessPlan(profile, { weeks: 4 }));
                    refresh();
                  }}
                >
                  Build a 4-week plan
                </Button>
              </div>
            ) : todayPlan ? (
              <div className="mt-4 space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {todayPlan.weekday} · {todayPlan.focus}
                    </p>
                    <p className="mt-0.5 max-w-prose text-sm text-gray-500">{todayPlan.motivation}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    {todayPlan.isRestDay ? (
                      <Badge tone="good">Rest day</Badge>
                    ) : (
                      <>
                        <Badge>{todayPlan.totalMinutes} min</Badge>
                        <Badge>~{todayPlan.estimatedCalories} kcal</Badge>
                      </>
                    )}
                  </div>
                </div>
                {todayPlan.blocks.length ? (
                  <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                    {todayPlan.blocks.map((block, index) => (
                      <li key={`${block.activityId}-${index}`} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">{block.name}</p>
                          <p className="text-xs text-gray-500">
                            {CATEGORY_LABELS[block.category]} · {block.environment} · effort {block.rpeTarget[0]} to {block.rpeTarget[1]} of 10
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-gray-500">
                          {ROLE_LABEL[block.role] ?? block.role} · {block.minutes} min
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="text-xs text-gray-500">
                  Daily targets: {todayPlan.dailyTargets.steps.toLocaleString()} steps · {(todayPlan.dailyTargets.waterMl / 1000).toFixed(1)} L water ·{" "}
                  {todayPlan.dailyTargets.proteinG} g protein · {todayPlan.dailyTargets.sleepHours} h sleep
                </p>
                <div className="flex flex-wrap gap-2">
                  <LinkButton href="/lifeengine/fitness/tracker">{loggedToday ? "Update today’s log" : "Log this session"}</LinkButton>
                  <LinkButton variant="ghost" href="/lifeengine/fitness/planner">
                    See the full week
                  </LinkButton>
                </div>
              </div>
            ) : null}

            {data.plan?.safety.blocksPlan ? (
              <Alert tone="risk" title="Get assessed before starting" className="mt-4">
                Your screening answers flagged symptoms that need a doctor first. The plan is visible so you can discuss it with them.
              </Alert>
            ) : data.plan?.safety.level === "clearance_required" ? (
              <Alert tone="warn" title="Medical clearance recommended" className="mt-4">
                Take this plan to your clinician before you start it.
              </Alert>
            ) : null}
          </Card>

          {/* ---------------- progress ---------------- */}
          {summary ? (
            <section className="space-y-4" aria-labelledby="progress-title">
              <SectionHeading id="progress-title" title="Progress" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Streak" value={summary.streak.current} unit="days" hint={`Best ${summary.streak.longest}`} icon={Flame} />
                <Stat label="This week" value={summary.thisWeek.activeMinutes} unit="min" hint={`Target ${summary.thisWeek.targetMinutes}`} icon={Timer} />
                <Stat label="Sessions" value={summary.thisWeek.sessions} hint="This week" icon={CalendarDays} />
                <Stat label="Adherence" value={summary.thisWeek.adherencePct} unit="%" hint="Planned sessions kept" icon={Target} />
              </div>
              <Card className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-gray-600">Weekly active minutes</span>
                    <span className="tabular-nums text-gray-500">
                      {summary.thisWeek.activeMinutes} / {summary.thisWeek.targetMinutes}
                    </span>
                  </div>
                  <Meter value={summary.thisWeek.activeMinutes} max={summary.thisWeek.targetMinutes} label="Weekly active minutes" />
                </div>
                {summary.insights.slice(0, 2).map((insight) => (
                  <Alert key={insight.title} tone={insightTone(insight.level)} title={insight.title}>
                    <p>{insight.detail}</p>
                    {insight.action ? <p className="font-medium">{insight.action}</p> : null}
                  </Alert>
                ))}
                <LinkButton variant="subtle" size="sm" href="/lifeengine/fitness/tracker" className="-ml-3">
                  Open the tracker
                  <ChevronRight aria-hidden />
                </LinkButton>
              </Card>
            </section>
          ) : null}

          {/* ---------------- sections ---------------- */}
          <section className="space-y-4" aria-labelledby="explore-title">
            <SectionHeading id="explore-title" title="Explore" />
            <div className="grid gap-4 sm:grid-cols-2">
              {SECTIONS.map(({ href, title, body, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-gray-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-gray-900">{title}</span>
                    <span className="mt-0.5 block text-sm text-gray-500">{body}</span>
                  </span>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 group-hover:text-gray-600" aria-hidden />
                </Link>
              ))}
            </div>
          </section>

          {/* ---------------- people ---------------- */}
          <Card className="space-y-4">
            <SectionHeading
              title="People"
              description="Everyone set up for fitness. Their plans and logs are kept separately."
              action={
                <>
                  <Button variant="subtle" size="sm" onClick={download}>
                    <Download aria-hidden />
                    Export
                  </Button>
                  <Button variant="subtle" size="sm" onClick={() => fileRef.current?.click()}>
                    <Upload aria-hidden />
                    Import
                  </Button>
                  <LinkButton variant="ghost" size="sm" href="/lifeengine/fitness/profile?new=1">
                    <UserPlus aria-hidden />
                    Add person
                  </LinkButton>
                </>
              }
            />
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              tabIndex={-1}
              aria-label="Import fitness data file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
                event.target.value = "";
              }}
            />
            {status ? (
              <div role="status">
                <Alert tone={status.tone}>{status.text}</Alert>
              </div>
            ) : null}
            <ul className="divide-y divide-gray-100">
              {data.profiles.map((entry) => {
                const active = entry.id === profile.id;
                return (
                  <li key={entry.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <ProfileAvatar name={entry.name || "?"} seed={entry.sourceProfileId ?? entry.id} size="md" />
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900">
                            {entry.name || "Unnamed"}
                            {active ? <Badge tone="good">Active</Badge> : null}
                          </p>
                          <p className="text-xs text-gray-500">
                            {entry.age} yrs · {SEX_LABEL[entry.sex] ?? entry.sex} · {entry.heightCm} cm · {entry.weightKg} kg
                          </p>
                          <p className="mt-1 text-sm text-gray-700">
                            {GOALS[entry.primaryGoal]?.label ?? entry.primaryGoal} · {entry.daysPerWeek} days a week, {entry.minutesPerSession} min
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {entry.conditions.length
                              ? entry.conditions.map((id) => CONDITIONS[id]?.label ?? id).join(", ")
                              : "No conditions reported"}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                        {confirmDelete === entry.id ? (
                          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-red-50 px-3 py-2" role="group" aria-label={`Delete ${entry.name}`}>
                            <span className="text-sm text-red-800">Delete with its plans and logs?</span>
                            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>
                              Cancel
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => {
                                deleteFitnessProfile(entry.id);
                                setConfirmDelete(null);
                                refresh();
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        ) : (
                          <>
                            {!active ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setActiveProfileId(entry.id);
                                  refresh();
                                }}
                              >
                                Make active
                              </Button>
                            ) : null}
                            <Button variant="subtle" size="sm" onClick={() => setConfirmDelete(entry.id)} aria-label={`Delete ${entry.name || "profile"}`}>
                              <Trash2 aria-hidden />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      )}

      <p className="mt-8 max-w-prose text-xs text-gray-500">
        General wellness guidance, not medical advice. If your doctor or physiotherapist has given you a programme, follow theirs. Stop and get help
        for chest pain, severe breathlessness, dizziness, a sudden severe headache, or new numbness or weakness.
      </p>
    </div>
  );
}
