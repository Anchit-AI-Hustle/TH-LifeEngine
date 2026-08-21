"use client";

/**
 * Activity library browser.
 *
 * Every activity in the catalog, filterable by category, indoor/outdoor,
 * purpose, equipment and joint impact — and, when a profile exists, flagged
 * where it clashes with that person's safety constraints.
 */

import Link from "next/link";
import { useMemo, useState } from "react";

import styles from "../Fitness.module.css";
import { Badge, useFitnessData } from "../ui";
import { ACTIVITIES, BUCKET_LABELS, CATEGORY_LABELS, EQUIPMENT_LABELS } from "@/lib/fitness/activities";
import { eligibleActivities, mergeGoals } from "@/lib/fitness/engine";
import { GOAL_LIST, GOALS } from "@/lib/fitness/goals";
import { buildSafetyReport } from "@/lib/fitness/screening";
import { getActiveProfile } from "@/lib/fitness/store";
import type { ActivityCategory, Environment, GoalId, ImpactLevel } from "@/lib/fitness/types";

const IMPACT_ORDER: ImpactLevel[] = ["none", "low", "moderate", "high"];

export default function ActivityLibraryPage() {
  const [category, setCategory] = useState<ActivityCategory | "all">("all");
  const [environment, setEnvironment] = useState<Environment | "all">("all");
  const [goal, setGoal] = useState<GoalId | "all">("all");
  const [maxImpact, setMaxImpact] = useState<ImpactLevel | "all">("all");
  const [query, setQuery] = useState("");
  const [safeOnly, setSafeOnly] = useState(false);

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

  const indoorCount = results.filter((a) => a.environments.includes("indoor")).length;
  const outdoorCount = results.filter((a) => a.environments.includes("outdoor")).length;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.stack}>
            <span className={styles.eyebrow}>Activity library</span>
            <h1 className={styles.title}>{ACTIVITIES.length} activities, indoor and outdoor</h1>
            <p className={styles.subtitle}>
              Everything the planner can draw from, with the instructions, form cues and progressions for each. Use it
              to swap a session for something you would rather do — the swap options in your plan come from here.
            </p>
          </div>
          {data?.profile ? (
            <div className={styles.stack}>
              <span className={styles.eyebrow}>Filtered for</span>
              <strong>{data.profile.name}</strong>
              <label className={styles.row} style={{ gap: 6 }}>
                <input type="checkbox" checked={safeOnly} onChange={(event) => setSafeOnly(event.target.checked)} />
                <span className={styles.tiny}>Only show what is safe for me ({data.eligibleIds?.size ?? 0})</span>
              </label>
            </div>
          ) : (
            <Link className="btn" href="/lifeengine/fitness/profile">
              Create a profile to filter for safety
            </Link>
          )}
        </div>

        <div className={`${styles.grid} ${styles.grid4}`}>
          <label className={styles.field}>
            <span className={styles.label}>Search</span>
            <input
              className={styles.control}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. knee, walking, breathing"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Indoor / outdoor</span>
            <select
              className={styles.control}
              value={environment}
              onChange={(event) => setEnvironment(event.target.value as Environment | "all")}
            >
              <option value="all">Either</option>
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Purpose</span>
            <select className={styles.control} value={goal} onChange={(event) => setGoal(event.target.value as GoalId | "all")}>
              <option value="all">Any purpose</option>
              {GOAL_LIST.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Maximum impact</span>
            <select
              className={styles.control}
              value={maxImpact}
              onChange={(event) => setMaxImpact(event.target.value as ImpactLevel | "all")}
            >
              <option value="all">Any</option>
              <option value="none">No impact only</option>
              <option value="low">Low or less</option>
              <option value="moderate">Moderate or less</option>
            </select>
          </label>
        </div>

        <div className={styles.chipWrap}>
          <button
            type="button"
            className={`${styles.chip} ${category === "all" ? styles.chipActive : ""}`}
            onClick={() => setCategory("all")}
          >
            All ({ACTIVITIES.length})
          </button>
          {(Object.keys(CATEGORY_LABELS) as ActivityCategory[]).map((key) => {
            const count = ACTIVITIES.filter((a) => a.category === key).length;
            if (!count) return null;
            return (
              <button
                key={key}
                type="button"
                className={`${styles.chip} ${category === key ? styles.chipActive : ""}`}
                onClick={() => setCategory(key)}
              >
                {CATEGORY_LABELS[key]} ({count})
              </button>
            );
          })}
        </div>

        <p className={styles.tiny}>
          Showing {results.length} activities · {indoorCount} can be done indoors · {outdoorCount} outdoors
        </p>
      </header>

      {results.length === 0 ? (
        <p className={styles.muted}>Nothing matches those filters. Try widening one of them.</p>
      ) : null}

      <div className={`${styles.grid} ${styles.grid2}`}>
        {results.map((activity) => {
          const blocked = data?.eligibleIds ? !data.eligibleIds.has(activity.id) : false;
          return (
            <article key={activity.id} className={styles.activityCard}>
              <div className={styles.activityHead}>
                <span className={styles.activityName}>{activity.name}</span>
                <div className={styles.row}>
                  {activity.environments.map((env) => (
                    <Badge key={env} tone={env === "outdoor" ? "good" : "info"}>
                      {env}
                    </Badge>
                  ))}
                </div>
              </div>

              {data?.profile && blocked ? (
                <Badge tone="warn">Not recommended for your current profile</Badge>
              ) : null}

              <p className={styles.activityBenefit}>{activity.benefit}</p>

              <div className={styles.metaGrid}>
                <span className={styles.badge}>{CATEGORY_LABELS[activity.category]}</span>
                <span className={styles.badge}>{activity.intensity.replace(/_/g, " ")}</span>
                <span className={styles.badge}>{activity.impact} impact</span>
                <span className={styles.badge}>{activity.jointLoad} joint load</span>
                <span className={styles.badge}>{activity.met} MET</span>
                <span className={styles.badge}>
                  {activity.minMinutes}–{activity.maxMinutes} min
                </span>
                <span className={styles.badge}>{activity.skill}</span>
                {activity.apartmentFriendly ? null : <span className={`${styles.badge} ${styles.badgeWarn}`}>noisy</span>}
                {activity.weatherDependent ? <span className={styles.badge}>weather dependent</span> : null}
              </div>

              <p className={styles.tiny}>
                <strong>Trains:</strong> {activity.buckets.map((b) => BUCKET_LABELS[b] ?? b).join(", ")}
                {activity.muscles.length ? ` · ${activity.muscles.join(", ")}` : ""}
              </p>
              <p className={styles.tiny}>
                <strong>Needs:</strong> {activity.equipment.map((e) => EQUIPMENT_LABELS[e] ?? e).join(", ")}
              </p>

              <details className={styles.disclosure}>
                <summary>How to do it, and how to scale it</summary>
                <div className={styles.disclosureBody}>
                  {activity.howTo.length ? (
                    <>
                      <span className={styles.eyebrow}>Method</span>
                      <ol className={styles.blockList}>
                        {activity.howTo.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ol>
                    </>
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
                    <strong>Progress it:</strong> {activity.progression}
                  </p>
                  <p className={styles.tiny}>
                    <strong>Regress it:</strong> {activity.regression}
                  </p>
                  {activity.goodFor.length ? (
                    <p className={styles.tiny}>
                      <strong>Good for:</strong>{" "}
                      {activity.goodFor
                        .map((g) => GOALS[g]?.label)
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                  {activity.tags.length ? (
                    <p className={styles.tiny}>
                      <strong>Involves:</strong> {activity.tags.map((t) => t.replace(/_/g, " ")).join(", ")}
                    </p>
                  ) : null}
                </div>
              </details>
            </article>
          );
        })}
      </div>
    </div>
  );
}
