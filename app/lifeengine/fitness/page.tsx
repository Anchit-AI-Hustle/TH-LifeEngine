"use client";

/**
 * Fitness & health hub: today's session, streak, profile management and the
 * way in to every other screen.
 */

import Link from "next/link";
import { useMemo } from "react";

import styles from "./Fitness.module.css";
import { Alert, Badge, EmptyState, Meter, Stat, useFitnessData } from "./ui";
import { ACTIVITIES, CATEGORY_LABELS } from "@/lib/fitness/activities";
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
  saveFitnessPlan,
  setActiveProfileId,
} from "@/lib/fitness/store";
import { summariseTracker, todayIso } from "@/lib/fitness/tracker";

const INDOOR_COUNT = ACTIVITIES.filter((a) => a.environments.includes("indoor")).length;
const OUTDOOR_COUNT = ACTIVITIES.filter((a) => a.environments.includes("outdoor")).length;

export default function FitnessHubPage() {
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

  if (!data) return <p className={styles.muted}>Loading…</p>;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.stack}>
            <span className={styles.eyebrow}>TH+ LifeEngine</span>
            <h1 className={styles.title}>Fitness &amp; health activity planner</h1>
            <p className={styles.subtitle}>
              A daily activity plan built from your complete health picture — age, sex, conditions, medications, pain,
              injuries, medical history, the time you actually have and the equipment you actually own. Indoor and
              outdoor options across running, walking, cycling, swimming, gym, HIIT, sports, yoga, pilates, mobility,
              breathwork, meditation, dance, martial arts and rehab. Then track it, and let the numbers tell you
              whether it is working.
            </p>
          </div>
          <div className={styles.stack}>
            {data.profiles.length > 0 ? (
              <label className={styles.field}>
                <span className={styles.eyebrow}>Active profile</span>
                <select
                  className={styles.control}
                  value={data.profile?.id ?? ""}
                  onChange={(event) => {
                    setActiveProfileId(event.target.value);
                    refresh();
                  }}
                >
                  {data.profiles.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className={styles.row}>
              <Link className="btn" href="/lifeengine/fitness/profile">
                {data.profile ? "Edit profile" : "Start here — build your profile"}
              </Link>
            </div>
          </div>
        </div>
        <div className={styles.row}>
          <Badge tone="neutral">{ACTIVITIES.length} activities</Badge>
          <Badge tone="info">{INDOOR_COUNT} indoor</Badge>
          <Badge tone="good">{OUTDOOR_COUNT} outdoor</Badge>
          <Badge tone="neutral">{Object.keys(GOALS).length} purposes covered</Badge>
          <Badge tone="neutral">{Object.keys(CONDITIONS).length} conditions handled</Badge>
        </div>
      </header>

      {!data.profile ? (
        <EmptyState
          title="No profile yet"
          actionHref="/lifeengine/fitness/profile"
          actionLabel="Build your health profile"
        >
          <p>
            The planner needs to know who it is planning for. Two identical-looking people with the same goal get very
            different plans if one has knee arthritis and the other takes a beta blocker — and getting that wrong is
            how exercise plans hurt people.
          </p>
          <p>Takes about five minutes. Everything stays in this browser.</p>
        </EmptyState>
      ) : (
        <>
          {/* ---------------- today ---------------- */}
          <section className={styles.stack}>
            <div className={styles.spread}>
              <h2 className={styles.sectionTitle}>Today</h2>
              {loggedToday ? <Badge tone="good">Logged</Badge> : <Badge tone="info">Not logged yet</Badge>}
            </div>

            {!data.plan ? (
              <div className={styles.panel}>
                <p className={styles.muted}>
                  {data.profile.name}&rsquo;s profile is saved, but there is no plan yet.
                </p>
                <div className={styles.row}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      saveFitnessPlan(buildFitnessPlan(data.profile!, { weeks: 4 }));
                      refresh();
                    }}
                  >
                    Build a 4-week plan
                  </button>
                </div>
              </div>
            ) : todayPlan ? (
              <div className={styles.dayCard}>
                <header className={styles.dayHeader}>
                  <div>
                    <div className={styles.dayName}>
                      {todayPlan.weekday} · {todayPlan.focus}
                    </div>
                    <div className={styles.dayFocus}>{todayPlan.motivation}</div>
                  </div>
                  <div className={styles.row}>
                    {todayPlan.isRestDay ? (
                      <Badge tone="good">Rest day</Badge>
                    ) : (
                      <>
                        <Badge tone="neutral">{todayPlan.totalMinutes} min</Badge>
                        <Badge tone="neutral">~{todayPlan.estimatedCalories} kcal</Badge>
                      </>
                    )}
                  </div>
                </header>
                <div className={styles.dayBody}>
                  {todayPlan.blocks.map((block, index) => (
                    <div key={`${block.activityId}-${index}`} className={styles.block}>
                      <div className={styles.blockTop}>
                        <span className={styles.blockName}>{block.name}</span>
                        <span className={styles.blockRole}>
                          {block.role} · {block.minutes} min
                        </span>
                      </div>
                      <div className={styles.blockMeta}>
                        {CATEGORY_LABELS[block.category]} · {block.environment} · effort {block.rpeTarget[0]}–
                        {block.rpeTarget[1]}/10
                        {block.prescription ? ` · ${block.prescription}` : ""}
                      </div>
                    </div>
                  ))}
                  <div className={styles.row}>
                    <Link className="btn" href="/lifeengine/fitness/tracker">
                      {loggedToday ? "Update today's log" : "Log this session"}
                    </Link>
                    <Link className="btn subtle" href="/lifeengine/fitness/planner">
                      See the full week
                    </Link>
                  </div>
                  <div className={styles.blockMeta}>
                    Daily targets: {todayPlan.dailyTargets.steps.toLocaleString()} steps ·{" "}
                    {(todayPlan.dailyTargets.waterMl / 1000).toFixed(1)} L water · {todayPlan.dailyTargets.proteinG} g
                    protein · {todayPlan.dailyTargets.sleepHours} h sleep
                  </div>
                </div>
              </div>
            ) : null}

            {data.plan?.safety.blocksPlan ? (
              <Alert tone="risk" title="Get assessed before starting">
                Your screening answers flagged symptoms that need medical assessment first. The plan is visible so you
                can discuss it with your doctor.
              </Alert>
            ) : data.plan?.safety.level === "clearance_required" ? (
              <Alert tone="warn" title="Medical clearance recommended">
                Take this plan to your clinician before you start it.
              </Alert>
            ) : null}
          </section>

          {/* ---------------- progress snapshot ---------------- */}
          {summary ? (
            <section className={styles.stack}>
              <h2 className={styles.sectionTitle}>Progress</h2>
              <div className={`${styles.grid} ${styles.grid4}`}>
                <Stat label="Streak" value={summary.streak.current} unit="days" hint={`Best ${summary.streak.longest}`} />
                <Stat label="This week" value={summary.thisWeek.activeMinutes} unit="min" hint={`Target ${summary.thisWeek.targetMinutes}`} />
                <Stat label="Sessions" value={summary.thisWeek.sessions} hint="This week" />
                <Stat label="Adherence" value={summary.thisWeek.adherencePct} unit="%" hint="Planned sessions kept" />
              </div>
              <div className={styles.panel}>
                <div className={styles.spread}>
                  <span className={styles.muted}>Weekly active minutes</span>
                  <span className={styles.tiny}>
                    {summary.thisWeek.activeMinutes} / {summary.thisWeek.targetMinutes}
                  </span>
                </div>
                <Meter value={summary.thisWeek.activeMinutes} max={summary.thisWeek.targetMinutes} />
                {summary.insights.slice(0, 2).map((insight) => (
                  <Alert
                    key={insight.title}
                    tone={insight.level === "risk" ? "risk" : insight.level === "warn" ? "warn" : insight.level === "good" ? "good" : "info"}
                    title={insight.title}
                  >
                    <span>{insight.detail}</span>
                    {insight.action ? (
                      <span>
                        <strong>Do this: </strong>
                        {insight.action}
                      </span>
                    ) : null}
                  </Alert>
                ))}
                <Link className="btn subtle" href="/lifeengine/fitness/tracker">
                  Open the tracker →
                </Link>
              </div>
            </section>
          ) : null}
        </>
      )}

      {/* ---------------- navigation ---------------- */}
      <section className={styles.stack}>
        <h2 className={styles.sectionTitle}>Everything in here</h2>
        <div className={`${styles.grid} ${styles.grid2}`}>
          <Link className={styles.linkCard} href="/lifeengine/fitness/profile">
            <span className={styles.linkTitle}>Health profile</span>
            <span className={styles.muted}>
              Age, sex, body measurements, goals, conditions, medications, pain map, injuries, safety screen, equipment
              and availability. The input that decides everything else.
            </span>
          </Link>
          <Link className={styles.linkCard} href="/lifeengine/fitness/planner">
            <span className={styles.linkTitle}>Activity plan</span>
            <span className={styles.muted}>
              Your week, day by day and block by block, with intensity targets, modifications, indoor fallbacks and the
              reasoning behind each choice.
            </span>
          </Link>
          <Link className={styles.linkCard} href="/lifeengine/fitness/tracker">
            <span className={styles.linkTitle}>Daily tracker</span>
            <span className={styles.muted}>
              Tick off sessions, log pain, sleep, mood, steps, weight and blood pressure, then read the streaks,
              trends and warnings that come out of it.
            </span>
          </Link>
          <Link className={styles.linkCard} href="/lifeengine/fitness/activities">
            <span className={styles.linkTitle}>Activity library</span>
            <span className={styles.muted}>
              All {ACTIVITIES.length} activities with instructions, form cues, progressions and regressions — filter by
              category, indoor or outdoor, purpose and impact.
            </span>
          </Link>
        </div>
      </section>

      {/* ---------------- profile management ---------------- */}
      {data.profiles.length ? (
        <section className={styles.panel}>
          <div className={styles.spread}>
            <h2 className={styles.sectionTitle}>Profiles</h2>
            <div className={styles.row}>
              <button type="button" className="btn subtle sm" onClick={download}>
                Export data
              </button>
              <Link className="btn subtle sm" href="/lifeengine/fitness/profile">
                + New profile
              </Link>
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Main goal</th>
                  <th>Conditions</th>
                  <th>Availability</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.profiles.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <strong>{entry.name || "Unnamed"}</strong>
                      <br />
                      <span className={styles.tiny}>
                        {entry.age}y · {entry.sex} · {entry.heightCm} cm · {entry.weightKg} kg
                      </span>
                    </td>
                    <td>{GOALS[entry.primaryGoal]?.label ?? entry.primaryGoal}</td>
                    <td className={styles.tiny}>
                      {entry.conditions.length
                        ? entry.conditions.map((id) => CONDITIONS[id]?.label ?? id).join(", ")
                        : "None reported"}
                    </td>
                    <td className={styles.tiny}>
                      {entry.daysPerWeek}×/week · {entry.minutesPerSession} min · {entry.environmentPreference}
                    </td>
                    <td>
                      <div className={styles.row}>
                        {entry.id !== data.profile?.id ? (
                          <button
                            type="button"
                            className="btn subtle sm"
                            onClick={() => {
                              setActiveProfileId(entry.id);
                              refresh();
                            }}
                          >
                            Use
                          </button>
                        ) : (
                          <Badge tone="good">Active</Badge>
                        )}
                        <button
                          type="button"
                          className="btn subtle sm"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete ${entry.name || "this profile"}? This also removes its plans and all logged history. This cannot be undone.`,
                              )
                            ) {
                              deleteFitnessProfile(entry.id);
                              refresh();
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <footer className={styles.panel}>
        <span className={styles.eyebrow}>Important</span>
        <p className={styles.tiny}>
          This planner is general wellness guidance, not medical advice, diagnosis or treatment. It does not replace
          your doctor, physiotherapist or any programme they have given you — where the two differ, follow theirs.
          Stop exercising and seek medical help for chest pain or pressure, severe breathlessness, dizziness or
          fainting, sudden severe headache, or new numbness or weakness. All data stays in this browser and is never
          sent anywhere.
        </p>
      </footer>
    </div>
  );
}
