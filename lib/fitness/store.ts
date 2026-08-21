/**
 * Local persistence for the fitness planner.
 *
 * Uses localStorage, matching the pattern the rest of the LifeEngine surface
 * already follows, so the feature works with no backend configured. Every
 * write emits the shared change event so open views refresh.
 */

import type { DailyLog, FitnessPlan, FitnessProfile } from "./types";

const PROFILES_KEY = "th_fitness_profiles";
const PLANS_KEY = "th_fitness_plans";
const LOGS_KEY = "th_fitness_logs";
const ACTIVE_PROFILE_KEY = "th_fitness_active_profile";

export const FITNESS_CHANGE_EVENT = "th-fitness-change";

function emit(key: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FITNESS_CHANGE_EVENT, { detail: { key } }));
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    emit(key);
  } catch (error) {
    console.error(`Failed to persist ${key}:`, error);
  }
}

/* ---------------- profiles ---------------- */

export function getFitnessProfiles(): FitnessProfile[] {
  return read<FitnessProfile[]>(PROFILES_KEY, []);
}

export function saveFitnessProfile(profile: FitnessProfile): FitnessProfile[] {
  const others = getFitnessProfiles().filter((p) => p.id !== profile.id);
  const next = [{ ...profile, updatedAt: new Date().toISOString() }, ...others];
  write(PROFILES_KEY, next);
  return next;
}

export function deleteFitnessProfile(id: string): FitnessProfile[] {
  const next = getFitnessProfiles().filter((p) => p.id !== id);
  write(PROFILES_KEY, next);
  write(PLANS_KEY, getFitnessPlans().filter((p) => p.profileId !== id));
  write(LOGS_KEY, getLogs().filter((l) => l.profileId !== id));
  if (getActiveProfileId() === id) setActiveProfileId(next[0]?.id ?? null);
  return next;
}

export function getFitnessProfile(id: string): FitnessProfile | undefined {
  return getFitnessProfiles().find((p) => p.id === id);
}

export function getActiveProfileId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_PROFILE_KEY);
}

export function setActiveProfileId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) window.localStorage.setItem(ACTIVE_PROFILE_KEY, id);
  else window.localStorage.removeItem(ACTIVE_PROFILE_KEY);
  emit(ACTIVE_PROFILE_KEY);
}

/** Active profile, falling back to the most recently updated one. */
export function getActiveProfile(): FitnessProfile | undefined {
  const profiles = getFitnessProfiles();
  const id = getActiveProfileId();
  return profiles.find((p) => p.id === id) ?? profiles[0];
}

/* ---------------- plans ---------------- */

export function getFitnessPlans(): FitnessPlan[] {
  return read<FitnessPlan[]>(PLANS_KEY, []);
}

export function saveFitnessPlan(plan: FitnessPlan): FitnessPlan[] {
  const others = getFitnessPlans().filter((p) => p.id !== plan.id);
  const next = [plan, ...others].slice(0, 40);
  write(PLANS_KEY, next);
  return next;
}

export function deleteFitnessPlan(id: string): FitnessPlan[] {
  const next = getFitnessPlans().filter((p) => p.id !== id);
  write(PLANS_KEY, next);
  return next;
}

export function getLatestPlanForProfile(profileId: string): FitnessPlan | undefined {
  return getFitnessPlans()
    .filter((p) => p.profileId === profileId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

/* ---------------- logs ---------------- */

export function getLogs(): DailyLog[] {
  return read<DailyLog[]>(LOGS_KEY, []);
}

export function getLogsForProfile(profileId: string): DailyLog[] {
  return getLogs()
    .filter((l) => l.profileId === profileId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getLog(profileId: string, date: string): DailyLog | undefined {
  return getLogs().find((l) => l.profileId === profileId && l.date === date);
}

export function saveLog(log: DailyLog): DailyLog[] {
  const others = getLogs().filter((l) => !(l.profileId === log.profileId && l.date === log.date));
  const next = [...others, { ...log, updatedAt: new Date().toISOString() }];
  write(LOGS_KEY, next);
  return next;
}

export function deleteLog(profileId: string, date: string): DailyLog[] {
  const next = getLogs().filter((l) => !(l.profileId === profileId && l.date === date));
  write(LOGS_KEY, next);
  return next;
}

/* ---------------- import / export ---------------- */

export function exportFitnessData(): string {
  return JSON.stringify(
    { profiles: getFitnessProfiles(), plans: getFitnessPlans(), logs: getLogs(), exportedAt: new Date().toISOString() },
    null,
    2,
  );
}

export function importFitnessData(json: string) {
  const payload = JSON.parse(json) as { profiles?: FitnessProfile[]; plans?: FitnessPlan[]; logs?: DailyLog[] };
  if (payload.profiles) write(PROFILES_KEY, payload.profiles);
  if (payload.plans) write(PLANS_KEY, payload.plans);
  if (payload.logs) write(LOGS_KEY, payload.logs);
}
