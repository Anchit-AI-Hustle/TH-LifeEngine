/**
 * The latest diet plan for each person, kept in the browser and synced to the
 * account (lib/sync), like habits and sleep. Browser only: call from effects
 * or event handlers, never during render.
 */
import { markChanged } from "@/lib/sync/client";

export const DIET_KEY = "lifeengine.diet.v1";
const MAX_PROFILES = 30;

export type SavedDietPlan = {
  id: string;
  profileId: string;
  goals: string[];
  preferences: {
    dietaryRestrictions: string[];
    allergies: string[];
    cuisinePreferences: string[];
    mealFrequency: number;
    budget: string;
  };
  generatedPlan: {
    dailyCalories: number;
    macronutrients: { protein: number; carbs: number; fats: number };
    mealPlan: { breakfast: string[]; lunch: string[]; dinner: string[]; snacks: string[] };
    shoppingList: string[];
  };
  createdAt: string;
};

type DietState = { version: 1; byProfile: Record<string, SavedDietPlan> };

function isPlan(raw: unknown): raw is SavedDietPlan {
  if (!raw || typeof raw !== "object") return false;
  const p = raw as Partial<SavedDietPlan>;
  return (
    typeof p.id === "string" &&
    typeof p.profileId === "string" &&
    typeof p.createdAt === "string" &&
    !!p.generatedPlan &&
    typeof p.generatedPlan === "object" &&
    !!p.generatedPlan.mealPlan
  );
}

function read(): DietState {
  const empty: DietState = { version: 1, byProfile: {} };
  if (typeof window === "undefined") return empty;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DIET_KEY) || "null") as Partial<DietState> | null;
    const byProfile: Record<string, SavedDietPlan> = {};
    for (const [id, plan] of Object.entries(parsed?.byProfile ?? {})) {
      if (isPlan(plan) && plan.profileId === id) byProfile[id] = plan;
    }
    return { version: 1, byProfile };
  } catch {
    return empty;
  }
}

/** The person's latest diet plan, or null. */
export function loadDietPlan(profileId: string): SavedDietPlan | null {
  return read().byProfile[profileId] ?? null;
}

/** Keep this as the person's latest plan. Returns false if the browser refused. */
export function saveDietPlan(plan: SavedDietPlan): boolean {
  if (!isPlan(plan)) return false;
  const state = read();
  state.byProfile[plan.profileId] = plan;
  const ids = Object.keys(state.byProfile);
  if (ids.length > MAX_PROFILES) {
    ids
      .sort((a, b) => state.byProfile[a].createdAt.localeCompare(state.byProfile[b].createdAt))
      .slice(0, ids.length - MAX_PROFILES)
      .forEach((id) => delete state.byProfile[id]);
  }
  try {
    window.localStorage.setItem(DIET_KEY, JSON.stringify(state));
    markChanged(DIET_KEY);
    return true;
  } catch {
    return false;
  }
}
