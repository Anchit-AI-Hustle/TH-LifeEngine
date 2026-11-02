'use client';
// "Set up my first week": runs every feature once for the signed-in person,
// through the same APIs and stores the screens use, so the dashboard, habits,
// sleep and fitness pages all have real data straight away.
//
// Safe to run again: habits are not duplicated, nights already logged are
// kept, and the fitness profile is reused.
import { formatErrorMessage, generatePlan } from '@/lib/lifeengine/api';
import { HABIT_TEMPLATES } from '@/lib/habits/templates';
import { loadHabits, newId as newHabitId, saveHabits } from '@/lib/habits/store';
import { loadSleep, newId as newSleepId, saveSleep } from '@/lib/sleep/store';
import { createBlankProfile } from '@/lib/fitness/samples';
import { buildFitnessPlan } from '@/lib/fitness/engine';
import { logTemplateFromPlan } from '@/lib/fitness/tracker';
import { getFitnessProfiles, saveFitnessPlan, saveFitnessProfile, saveLog, setActiveProfileId } from '@/lib/fitness/store';
import type { DailyLog, FitnessProfile, GoalId } from '@/lib/fitness/types';
import type { Habit } from '@/lib/habits/types';
import {
  type ProfileBrief,
  dateKey,
  fitnessGoalsFor,
  habitDoneDays,
  habitTemplatesFor,
  planTypesFor,
  sleepNights,
  themesFor,
  trackerDays,
} from './simulate';

export type StepId = 'profile' | 'quickPlan' | 'aiPlan' | 'diet' | 'habits' | 'sleep' | 'fitness';
export type StepState = 'pending' | 'running' | 'done' | 'skipped' | 'failed';
export type StepReport = { id: StepId; state: StepState; detail?: string; href?: string };

export const STEPS: { id: StepId; label: string }[] = [
  { id: 'profile', label: 'Your profile' },
  { id: 'quickPlan', label: 'A quick 7-day plan (built-in engine)' },
  { id: 'aiPlan', label: 'A full AI wellness plan' },
  { id: 'diet', label: 'An AI diet plan for your goals' },
  { id: 'habits', label: 'Habits that fit your goals, with two weeks of history' },
  { id: 'sleep', label: 'Two weeks of sleep' },
  { id: 'fitness', label: 'Fitness profile, activity plan and a week of check-ins' },
];

export type NewProfileInput = { name: string; age: number; gender: 'female' | 'male' | 'other'; goals: string[]; healthConcerns: string };

type Report = (r: StepReport) => void;

async function json<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body;
}

/* ------------------------------------------------------------- profile */

export async function listProfiles(): Promise<ProfileBrief[]> {
  const res = await fetch('/api/lifeengine/profiles', { cache: 'no-store' });
  const data = await json<{ profiles?: ProfileBrief[] }>(res);
  return (data.profiles ?? []).map((p) => ({ ...p, goals: Array.isArray(p.goals) ? p.goals : [] }));
}

async function createProfile(input: NewProfileInput): Promise<ProfileBrief> {
  const res = await fetch('/api/lifeengine/profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, experience: 'beginner', preferredTime: 'morning' }),
  });
  const data = await json<{ profile?: ProfileBrief } & ProfileBrief>(res);
  const p = data.profile ?? data;
  return { ...p, goals: Array.isArray(p.goals) ? p.goals : input.goals };
}

/* --------------------------------------------------------------- plans */

function planPayload(p: ProfileBrief, appVersion: 'current' | 'oss') {
  const types = planTypesFor(p);
  const gender = /^f/i.test(p.gender) ? 'F' : /^m/i.test(p.gender) ? 'M' : 'Other';
  const level = p.experience === 'advanced' ? 'advanced' : p.experience === 'intermediate' ? 'intermediate' : 'beginner';
  return {
    profileId: p.id,
    appVersion,
    profileSnapshot: {
      id: p.id,
      name: p.name,
      age: p.age,
      gender,
      height_cm: gender === 'F' ? 158 : 172,
      weight_kg: gender === 'F' ? 62 : 74,
      region: 'IN',
      activity_level: 'light',
      dietary: { type: 'veg', allergies: [], avoid_items: [], cuisine_pref: ['Indian'] },
      medical_flags: p.healthConcerns ? [p.healthConcerns] : [],
      preferences: {
        tone: 'balanced',
        indoor_only: false,
        notes: `Preferred time: ${p.preferredTime || 'morning'}. Health notes: ${p.healthConcerns || 'none'}`,
      },
      availability: { days_per_week: 5, preferred_slots: [{ start: '07:00', end: '08:00' }] },
    },
    plan_type: { primary: types[0], secondary: types.slice(1) },
    goals: (p.goals.length ? p.goals : ['General wellness']).map((name, i) => ({ name, priority: i + 1 })),
    conditions: p.healthConcerns ? [p.healthConcerns] : [],
    duration: { unit: 'days', value: 7 },
    time_budget_min_per_day: 45,
    experience_level: level,
    equipment: [],
  };
}

/* ---------------------------------------------------------- local data */

function seedHabits(p: ProfileBrief): string {
  const { state } = loadHabits();
  const have = new Set(state.habits.map((h) => h.templateId).filter(Boolean));
  const added: string[] = [];
  habitTemplatesFor(p).forEach((tid, i) => {
    if (have.has(tid)) return;
    const t = HABIT_TEMPLATES.find((x) => x.id === tid);
    if (!t) return;
    const habit: Habit = {
      id: newHabitId(),
      name: t.name,
      icon: t.icon,
      color: t.color,
      target: t.target,
      reminder: t.reminder,
      createdOn: dateKey(14),
      archived: false,
      done: habitDoneDays(`${p.id}:${tid}`),
      challenges: i === 0 ? [{ id: newHabitId(), start: dateKey(9), length: 21, status: 'active' }] : [],
      templateId: tid,
    };
    state.habits.push(habit);
    added.push(t.name);
  });
  if (added.length && !saveHabits(state)) throw new Error('This browser refused to save habits.');
  return added.length ? `Added ${added.join(', ')}` : 'Your habits were already set up';
}

function seedSleep(p: ProfileBrief): string {
  const { state } = loadSleep();
  const have = new Set(state.entries.map((e) => e.night));
  const now = new Date().toISOString();
  let added = 0;
  for (const n of sleepNights(p.id)) {
    if (have.has(n.night)) continue;
    state.entries.push({ id: newSleepId(), ...n, updatedAt: now });
    added++;
  }
  if (added && !saveSleep(state)) throw new Error('This browser refused to save sleep entries.');
  return added ? `Logged ${added} nights` : 'Those nights were already logged';
}

function seedFitness(p: ProfileBrief): string {
  const female = /^f/i.test(p.gender);
  const existing = getFitnessProfiles().find((f) => f.name === p.name);
  const goals = fitnessGoalsFor(p) as GoalId[];
  const profile: FitnessProfile = existing ?? {
    ...createBlankProfile(),
    name: p.name,
    age: p.age || 30,
    sex: female ? 'female' : /^m/i.test(p.gender) ? 'male' : 'other',
    heightCm: female ? 158 : 172,
    weightKg: female ? 62 : 74,
    goals,
    primaryGoal: goals[0],
    activityLevel: 'light',
    experience: p.experience === 'advanced' ? 'advanced' : p.experience === 'intermediate' ? 'intermediate' : 'beginner',
    medicalNotes: p.healthConcerns || undefined,
    dietPattern: 'veg',
    climate: 'hot_humid',
    preferredTime: 'morning',
    daysPerWeek: 5,
    minutesPerSession: 35,
  };
  if (!existing) saveFitnessProfile(profile);
  setActiveProfileId(profile.id);

  const plan = buildFitnessPlan(profile, { weeks: 4, startDate: dateKey(7) });
  saveFitnessPlan(plan);

  const days = trackerDays(p.id, profile.weightKg, 7, new Date(), themesFor(p).includes('weight'));
  days.forEach((d, i) => {
    let activities: DailyLog['activities'] = [];
    if (d.adherence === 'completed' || d.adherence === 'partial') {
      try {
        activities = logTemplateFromPlan(plan, 0, i % 7).map((a) => ({
          ...a,
          minutes: Math.max(5, Math.round(a.minutes * d.minutesFactor)),
          caloriesEst: Math.round(a.caloriesEst * d.minutesFactor),
        }));
      } catch {
        activities = [];
      }
    }
    const log: DailyLog = {
      id: `${profile.id}:${d.date}`,
      profileId: profile.id,
      planId: plan.id,
      date: d.date,
      activities,
      steps: d.steps,
      weightKg: d.weightKg,
      sleepHours: d.sleepHours,
      mood: d.mood,
      energy: d.energy,
      stress: d.stress,
      waterMl: d.waterMl,
      adherence: d.adherence,
      updatedAt: new Date().toISOString(),
    };
    saveLog(log);
  });
  return `${plan.title} with 7 check-ins`;
}

/* ----------------------------------------------------------------- run */

export async function runFirstWeek(
  who: { existing?: ProfileBrief; create?: NewProfileInput },
  report: Report,
): Promise<{ profile: ProfileBrief | null; failed: number }> {
  let failed = 0;
  const step = async (id: StepId, fn: () => Promise<{ detail?: string; href?: string } | string>) => {
    report({ id, state: 'running' });
    try {
      const out = await fn();
      report({ id, state: 'done', ...(typeof out === 'string' ? { detail: out } : out) });
      return true;
    } catch (e) {
      failed++;
      const msg = e && typeof e === 'object' ? formatErrorMessage(e) : '';
      report({ id, state: 'failed', detail: msg && msg !== '[object Object]' ? msg.slice(0, 160) : 'Something went wrong' });
      return false;
    }
  };

  // 1. profile
  let profile: ProfileBrief | null = who.existing ?? null;
  const okProfile = await step('profile', async () => {
    if (!profile && who.create) profile = await createProfile(who.create);
    if (!profile) throw new Error('No profile to use');
    return { detail: `${profile.name}, ${profile.age}`, href: '/lifeengine/profiles' };
  });
  if (!okProfile || !profile) {
    for (const s of STEPS.slice(1)) report({ id: s.id, state: 'skipped', detail: 'Needs a profile' });
    return { profile: null, failed };
  }
  const p: ProfileBrief = profile;

  // 2-3. plans: a fast one first so the dashboard fills even if AI is slow or down
  await step('quickPlan', async () => {
    const r = await generatePlan(planPayload(p, 'oss'));
    return { detail: 'Saved to your dashboard', href: `/lifeengine/plan/${r.planId}` };
  });
  await step('aiPlan', async () => {
    const r = await generatePlan(planPayload(p, 'current'));
    return { detail: 'Saved to your dashboard', href: `/lifeengine/plan/${r.planId}` };
  });

  // 4. diet
  await step('diet', async () => {
    const res = await fetch('/api/lifeengine/diet/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileId: p.id,
        preferences: {
          dietaryRestrictions: ['vegetarian'],
          allergies: [],
          cuisinePreferences: ['Indian'],
          mealFrequency: 4,
          budget: 'moderate',
        },
      }),
    });
    const data = await json<{ plan?: { generatedPlan?: { dailyCalories?: number } } }>(res);
    const kcal = data.plan?.generatedPlan?.dailyCalories;
    return { detail: kcal ? `About ${kcal} kcal a day, vegetarian Indian meals` : 'Diet plan created', href: '/lifeengine/diet' };
  });

  // 5-7. tracking data (saved in the browser and synced to the account)
  await step('habits', async () => ({ detail: seedHabits(p), href: '/lifeengine/habits' }));
  await step('sleep', async () => ({ detail: seedSleep(p), href: '/lifeengine/sleep' }));
  await step('fitness', async () => ({ detail: seedFitness(p), href: '/lifeengine/fitness/tracker' }));

  return { profile: p, failed };
}
