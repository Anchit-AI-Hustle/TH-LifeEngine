"use client";

/**
 * The generated plan: safety report, targets, the week-by-week schedule with
 * every block spelled out, and the reasoning behind it.
 */

import Link from "next/link";
import { useMemo, useState } from "react";

import styles from "../Fitness.module.css";
import { Alert, Badge, EmptyState, Stat, useFitnessData } from "../ui";
import { CATEGORY_LABELS, getActivity } from "@/lib/fitness/activities";
import { buildFitnessPlan } from "@/lib/fitness/engine";
import { GOALS } from "@/lib/fitness/goals";
import {
  getActiveProfile,
  getFitnessProfiles,
  getLatestPlanForProfile,
  saveFitnessPlan,
  setActiveProfileId,
} from "@/lib/fitness/store";
import type { FitnessPlan, FitnessProfile, PlanBlock } from "@/lib/fitness/types";

const ROLE_CLASS: Record<PlanBlock["role"], string> = {
  warmup: styles.blockWarmup,
  main: styles.blockMain,
  accessory: styles.blockAccessory,
  cooldown: styles.blockCooldown,
  mindset: styles.blockCooldown,
  habit: styles.blockCooldown,
};

const ROLE_LABEL: Record<PlanBlock["role"], string> = {
  warmup: "Warm-up",
  main: "Main work",
  accessory: "Accessory",
  cooldown: "Cool-down",
  mindset: "Mindset",
  habit: "Habit",
};

export default function PlannerPage() {
  const [weekIndex, setWeekIndex] = useState(1);
  const [busy, setBusy] = useState(false);
  const [weeks, setWeeks] = useState(4);

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
      refresh();
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return <p className={styles.muted}>Loading your plan…</p>;
  }

  if (!profile) {
    return (
      <div className={styles.page}>
        <EmptyState
          title="No health profile yet"
          actionHref="/lifeengine/fitness/profile"
          actionLabel="Create your profile"
        >
          The planner needs your age, goals, medical history and available time before it can build anything. It takes
          a few minutes and it is what makes the plan yours.
        </EmptyState>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className={styles.page}>
        <EmptyState title={`No plan generated for ${profile.name} yet`}>
          <p>Your profile is saved. Generate a plan from it whenever you are ready.</p>
          <button type="button" className="btn" disabled={busy} onClick={() => regenerate(profile, weeks)}>
            {busy ? "Building…" : "Build my plan"}
          </button>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* ---------------- header ---------------- */}
      <header className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.stack}>
            <span className={styles.eyebrow}>Activity plan · {profile.name}</span>
            <h1 className={styles.title}>{plan.title}</h1>
            <p className={styles.subtitle}>{plan.summary}</p>
            <div className={styles.row}>
              {plan.goals.slice(0, 5).map((goal) => (
                <Badge key={goal.id} tone={goal.id === plan.primaryGoal ? "info" : "neutral"}>
                  {goal.id === plan.primaryGoal ? "★ " : ""}
                  {goal.label}
                </Badge>
              ))}
            </div>
          </div>
          <div className={styles.stack}>
            {data.profiles.length > 1 ? (
              <label className={styles.field}>
                <span className={styles.eyebrow}>Profile</span>
                <select
                  className={styles.control}
                  value={profile.id}
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
            <label className={styles.field}>
              <span className={styles.eyebrow}>Plan length</span>
              <select
                className={styles.control}
                value={weeks}
                onChange={(event) => setWeeks(Number(event.target.value))}
              >
                <option value={2}>2 weeks</option>
                <option value={4}>4 weeks</option>
                <option value={8}>8 weeks</option>
                <option value={12}>12 weeks</option>
              </select>
            </label>
            <div className={styles.row}>
              <button type="button" className="btn" disabled={busy} onClick={() => regenerate(profile, weeks)}>
                {busy ? "Rebuilding…" : "Rebuild plan"}
              </button>
              <Link className="btn subtle" href="/lifeengine/fitness/profile">
                Edit profile
              </Link>
            </div>
          </div>
        </div>
        <div className={styles.row}>
          <Badge tone={plan.scores.overall >= 80 ? "good" : plan.scores.overall >= 60 ? "info" : "warn"}>
            Plan fit {plan.scores.overall}/100
          </Badge>
          <Badge tone="neutral">Safety {plan.scores.safety}</Badge>
          <Badge tone="neutral">Goal match {plan.scores.goalMatch}</Badge>
          <Badge tone="neutral">Variety {plan.scores.variety}</Badge>
          <Badge tone="neutral">Feasibility {plan.scores.feasibility}</Badge>
          <span className={styles.tiny}>Generated {new Date(plan.createdAt).toLocaleString()}</span>
        </div>
      </header>

      {/* ---------------- safety ---------------- */}
      {plan.safety.blocksPlan ? (
        <Alert tone="risk" title="Do not start this plan yet">
          <ul>
            {plan.safety.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <span>
            The plan below is shown so you can take it to your doctor, not so you can start it today. Get assessed
            first.
          </span>
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
        <Alert tone="info" title="Worth knowing about this plan">
          <ul>
            {plan.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {/* ---------------- targets ---------------- */}
      <section className={styles.stack}>
        <h2 className={styles.sectionTitle}>Your numbers</h2>
        <div className={`${styles.grid} ${styles.grid4}`}>
          <Stat label="BMI" value={plan.metrics.bmi} hint={`${plan.metrics.bmiCategory}${plan.metrics.bmiCutoffsUsed === "south_asian" ? " · Asian cut-offs" : ""}`} />
          {plan.metrics.waistToHeight ? (
            <Stat label="Waist / height" value={plan.metrics.waistToHeight} hint={plan.metrics.waistRisk} />
          ) : null}
          <Stat label="Maintenance" value={plan.metrics.tdee} unit="kcal" hint="What you burn on a typical day" />
          <Stat
            label="Daily target"
            value={plan.metrics.calorieTarget}
            unit="kcal"
            hint={
              plan.metrics.calorieDelta === 0
                ? "Maintenance"
                : `${plan.metrics.calorieDelta > 0 ? "+" : ""}${plan.metrics.calorieDelta} kcal · ~${plan.metrics.weightChangePerWeekKg} kg/week`
            }
          />
          <Stat label="Protein" value={plan.metrics.proteinG} unit="g/day" hint="Split across your main meals" />
          <Stat label="Water" value={(plan.metrics.waterMl / 1000).toFixed(1)} unit="L/day" hint="More in heat or long sessions" />
          <Stat label="Steps" value={plan.metrics.stepTarget.toLocaleString()} hint="Outside your sessions" />
          <Stat
            label="Weekly minutes"
            value={plan.metrics.weeklyMinutesTarget}
            hint={`Currently around ${plan.metrics.currentWeeklyMinutes}`}
          />
          {plan.metrics.estimatedWeeksToTarget ? (
            <Stat
              label="To target weight"
              value={plan.metrics.estimatedWeeksToTarget}
              unit="weeks"
              hint={`At ${Math.abs(plan.metrics.weightChangePerWeekKg ?? 0)} kg/week`}
            />
          ) : null}
        </div>

        <div className={styles.panel}>
          <h3 className={styles.sectionTitle} style={{ fontSize: 15 }}>
            Intensity: how hard to work
          </h3>
          <p className={styles.muted}>{plan.metrics.rpeGuidance}</p>
          {plan.metrics.heartRateZones ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Zone</th>
                    <th>Beats per minute</th>
                    <th>What it is for</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.metrics.heartRateZones.map((zone) => (
                    <tr key={zone.zone}>
                      <td>{zone.zone}</td>
                      <td className={styles.mono}>
                        {zone.low}–{zone.high}
                      </td>
                      <td className={styles.muted}>{zone.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Alert tone="info" title="Use effort, not heart rate">
              Heart-rate zones would mislead you, so every session below gives an RPE target instead — how hard it
              should feel on a 1-10 scale.
            </Alert>
          )}
          <p className={styles.tiny}>Estimated maximum heart rate: {plan.metrics.maxHr} bpm. {plan.metrics.fitnessAgeNote}</p>
        </div>
      </section>

      {/* ---------------- non-negotiables ---------------- */}
      {plan.nonNegotiables.length ? (
        <section className={styles.panel}>
          <h2 className={styles.sectionTitle}>The things that matter most</h2>
          <p className={styles.muted}>
            If you only do part of this plan, do these. They carry more of the result than any individual session.
          </p>
          <ul className={styles.blockList} style={{ fontSize: 13.5 }}>
            {plan.nonNegotiables.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ---------------- week selector + schedule ---------------- */}
      <section className={styles.stack}>
        <div className={styles.spread}>
          <h2 className={styles.sectionTitle}>Your week</h2>
          <div className={styles.chipWrap}>
            {plan.weeks.map((entry) => (
              <button
                key={entry.weekIndex}
                type="button"
                className={`${styles.chip} ${entry.weekIndex === week?.weekIndex ? styles.chipActive : ""}`}
                onClick={() => setWeekIndex(entry.weekIndex)}
                aria-pressed={entry.weekIndex === week?.weekIndex}
              >
                Week {entry.weekIndex}
                {entry.phase === "deload" ? " · easy" : ""}
              </button>
            ))}
          </div>
        </div>

        {week ? (
          <>
            <div className={styles.panel}>
              <div className={styles.spread}>
                <div className={styles.stack}>
                  <span className={styles.eyebrow}>Week {week.weekIndex} · {week.phase}</span>
                  <strong>{week.focus}</strong>
                </div>
                <div className={styles.row}>
                  <Badge tone="neutral">{week.targetWeeklyMinutes} active minutes</Badge>
                  <Badge tone="neutral">{week.days.filter((d) => !d.isRestDay).length} sessions</Badge>
                  <Badge tone="neutral">
                    ~{week.days.reduce((sum, d) => sum + d.estimatedCalories, 0)} kcal
                  </Badge>
                </div>
              </div>
              <p className={styles.muted}>{week.progressionNote}</p>
            </div>

            <div className={`${styles.grid} ${styles.grid2}`}>
              {week.days.map((day) => (
                <article key={day.dayIndex} className={`${styles.dayCard} ${day.isRestDay ? styles.dayRest : ""}`}>
                  <header className={styles.dayHeader}>
                    <div>
                      <div className={styles.dayName}>{day.weekday}</div>
                      <div className={styles.dayFocus}>{day.focus}</div>
                    </div>
                    <div className={styles.row}>
                      {!day.isRestDay ? (
                        <>
                          <Badge tone="neutral">{day.totalMinutes} min</Badge>
                          <Badge tone="neutral">~{day.estimatedCalories} kcal</Badge>
                        </>
                      ) : (
                        <Badge tone="good">Rest</Badge>
                      )}
                    </div>
                  </header>
                  <div className={styles.dayBody}>
                    {day.blocks.map((block, index) => {
                      const activity = getActivity(block.activityId);
                      return (
                        <div key={`${block.activityId}-${index}`} className={`${styles.block} ${ROLE_CLASS[block.role]}`}>
                          <div className={styles.blockTop}>
                            <span className={styles.blockName}>{block.name}</span>
                            <span className={styles.blockRole}>
                              {ROLE_LABEL[block.role]} · {block.minutes} min
                            </span>
                          </div>
                          <div className={styles.blockMeta}>
                            {CATEGORY_LABELS[block.category]} · {block.environment} · effort {block.rpeTarget[0]}–
                            {block.rpeTarget[1]}/10
                            {block.heartRateTarget
                              ? ` · ${block.heartRateTarget.low}–${block.heartRateTarget.high} bpm`
                              : ""}
                            {` · ~${block.estimatedCalories} kcal`}
                          </div>
                          {block.prescription ? <div className={styles.blockMeta}>{block.prescription}</div> : null}
                          {block.modifications.map((mod) => (
                            <div key={mod} className={styles.mod}>
                              {mod}
                            </div>
                          ))}
                          {activity ? (
                            <details className={styles.disclosure}>
                              <summary>How to do it</summary>
                              <div className={styles.disclosureBody}>
                                <p className={styles.blockMeta}>{activity.benefit}</p>
                                {activity.howTo.length ? (
                                  <ol className={styles.blockList}>
                                    {activity.howTo.map((line) => (
                                      <li key={line}>{line}</li>
                                    ))}
                                  </ol>
                                ) : null}
                                {activity.formCues.length ? (
                                  <>
                                    <span className={styles.eyebrow}>Form cues</span>
                                    <ul className={styles.blockList}>
                                      {activity.formCues.map((cue) => (
                                        <li key={cue}>{cue}</li>
                                      ))}
                                    </ul>
                                  </>
                                ) : null}
                                <p className={styles.tiny}>
                                  <strong>Make it harder:</strong> {activity.progression}
                                </p>
                                <p className={styles.tiny}>
                                  <strong>Make it easier:</strong> {activity.regression}
                                </p>
                                {block.swapOptions.length ? (
                                  <p className={styles.tiny}>
                                    <strong>Swap for:</strong>{" "}
                                    {block.swapOptions.map((swap) => `${swap.name} (${swap.environment})`).join(" · ")}
                                  </p>
                                ) : null}
                              </div>
                            </details>
                          ) : null}
                        </div>
                      );
                    })}

                    {day.notes.length ? (
                      <ul className={styles.blockList}>
                        {day.notes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    ) : null}

                    <details className={styles.disclosure}>
                      <summary>Daily targets, whatever the session</summary>
                      <div className={styles.disclosureBody}>
                        <div className={styles.blockMeta}>
                          {day.dailyTargets.steps.toLocaleString()} steps ·{" "}
                          {(day.dailyTargets.waterMl / 1000).toFixed(1)} L water · {day.dailyTargets.proteinG} g
                          protein · {day.dailyTargets.sleepHours} h sleep · {day.dailyTargets.mindfulMinutes} min
                          calm · {day.dailyTargets.standBreaks} movement breaks
                        </div>
                      </div>
                    </details>

                    <p className={styles.tiny}>
                      <em>{day.motivation}</em>
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </section>

      {/* ---------------- weather fallbacks ---------------- */}
      {plan.weatherFallbacks.length ? (
        <section className={styles.panel}>
          <h2 className={styles.sectionTitle}>If the weather (or air quality) is bad</h2>
          <p className={styles.muted}>
            Outdoor days have an indoor equivalent so a wet morning does not cost you a session.
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Instead of</th>
                  <th>Do this indoors</th>
                </tr>
              </thead>
              <tbody>
                {plan.weatherFallbacks.map((entry) => (
                  <tr key={`${entry.weekday}-${entry.instead}`}>
                    <td>{entry.weekday}</td>
                    <td>{entry.instead}</td>
                    <td>{entry.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* ---------------- safety detail ---------------- */}
      <section className={styles.stack}>
        <h2 className={styles.sectionTitle}>How this plan was adapted for you</h2>
        <div className={`${styles.grid} ${styles.grid2}`}>
          <div className={styles.panel}>
            <h3 className={styles.sectionTitle} style={{ fontSize: 15 }}>
              Limits applied
            </h3>
            <div className={styles.row}>
              <Badge tone="info">Intensity ≤ {plan.safety.intensityCeiling.replace(/_/g, " ")}</Badge>
              <Badge tone="info">Impact ≤ {plan.safety.maxImpact}</Badge>
              <Badge tone="info">Joint load ≤ {plan.safety.maxJointLoad}</Badge>
            </div>
            {plan.safety.excludedTags.length ? (
              <>
                <span className={styles.eyebrow}>Movement patterns excluded</span>
                <div className={styles.chipWrap}>
                  {plan.safety.excludedTags.map((tag) => (
                    <span key={tag} className={styles.badge}>
                      {tag.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className={styles.muted}>Nothing had to be excluded — you have the full library available.</p>
            )}
            {plan.safety.cautionTags.length ? (
              <>
                <span className={styles.eyebrow}>Allowed, but with care</span>
                <div className={styles.chipWrap}>
                  {plan.safety.cautionTags.map((tag) => (
                    <span key={tag} className={`${styles.badge} ${styles.badgeWarn}`}>
                      {tag.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          <div className={styles.panel}>
            <h3 className={styles.sectionTitle} style={{ fontSize: 15 }}>
              Modifications built in
            </h3>
            {plan.safety.requiredModifications.length ? (
              <ul className={styles.blockList} style={{ fontSize: 13 }}>
                {plan.safety.requiredModifications.map((mod) => (
                  <li key={mod}>{mod}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>No condition-specific modifications were needed.</p>
            )}
          </div>

          {plan.safety.monitoring.length ? (
            <div className={styles.panel}>
              <h3 className={styles.sectionTitle} style={{ fontSize: 15 }}>
                What to keep an eye on
              </h3>
              <ul className={styles.blockList} style={{ fontSize: 13 }}>
                {plan.safety.monitoring.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {plan.safety.redFlags.length ? (
            <div className={styles.panel}>
              <h3 className={styles.sectionTitle} style={{ fontSize: 15 }}>
                Stop and seek medical help if
              </h3>
              <Alert tone="risk">
                <ul>
                  {plan.safety.redFlags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>
              </Alert>
            </div>
          ) : null}
        </div>
      </section>

      {/* ---------------- education ---------------- */}
      <section className={styles.stack}>
        <h2 className={styles.sectionTitle}>Why the plan looks like this</h2>
        <div className={`${styles.grid} ${styles.grid2}`}>
          {plan.education.map((card) => (
            <div key={card.title} className={styles.panel}>
              <h3 className={styles.sectionTitle} style={{ fontSize: 15 }}>
                {card.title}
              </h3>
              <p className={styles.muted}>{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- goals detail ---------------- */}
      <section className={styles.panel}>
        <h2 className={styles.sectionTitle}>Your goals, and how each one is served</h2>
        {plan.goals.map((goal) => {
          const definition = GOALS[goal.id];
          return (
            <div key={goal.id} className={styles.stack} style={{ gap: 4 }}>
              <strong>
                {goal.id === plan.primaryGoal ? "★ " : ""}
                {goal.label}
              </strong>
              <p className={styles.muted}>{goal.mechanism}</p>
              {definition?.successSignals.length ? (
                <p className={styles.tiny}>
                  <strong>Signs it is working:</strong> {definition.successSignals.join(" · ")}
                </p>
              ) : null}
              <hr className={styles.divider} />
            </div>
          );
        })}
      </section>

      {/* ---------------- adherence ---------------- */}
      <section className={styles.panel}>
        <h2 className={styles.sectionTitle}>Making it stick</h2>
        <ul className={styles.blockList} style={{ fontSize: 13.5 }}>
          {plan.adherenceTips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
        <div className={styles.row}>
          <Link className="btn" href="/lifeengine/fitness/tracker">
            Start tracking today →
          </Link>
          <Link className="btn subtle" href="/lifeengine/fitness/activities">
            Browse the activity library
          </Link>
        </div>
      </section>

      <footer className={styles.panel}>
        <span className={styles.eyebrow}>Important</span>
        <ul className={styles.blockList} style={{ fontSize: 12.5 }}>
          {plan.safety.disclaimers.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </footer>
    </div>
  );
}
