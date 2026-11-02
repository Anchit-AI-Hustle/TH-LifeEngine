import type { Profile } from "@/lib/ai/schemas";
import { currentUserId } from "@/lib/auth";
import { normalizeMobile } from "@/lib/auth/phone";
import { isLegacyOwnerPin } from "@/lib/auth/legacy";
import { readJson, writeJson } from "@/lib/storage/jsonStore";

export type Sex = "F" | "M" | "Other";

type Contact = {
  email?: string;
  phone?: string;
  location?: string;
};

type PreferredSlot = {
  start?: string;
  end?: string;
};

export type StoredPlanDay = {
  date: string;
  activities: {
    type: string;
    name: string;
    duration: number;
    description: string;
  }[];
  meals: {
    type: string;
    name: string;
    calories: number;
    description: string;
  }[];
};

export type StoredPlan = {
  id: string;
  profileId: string;
  intakeId: string;
  goals: string[];
  createdAt: string;
  days: StoredPlanDay[];
};

export type UiProfileSnapshot = Profile & {
  createdAt: string;
  updatedAt?: string;
};

export type ProfileRow = {
  id: string;
  name: string;
  age?: number;
  gender?: Profile["gender"];
  goals?: string[];
  healthConcerns?: string;
  experience?: Profile["experience"];
  preferredTime?: Profile["preferredTime"];
  subscriptionType?: Profile["subscriptionType"];
  demographics?: {
    age?: number;
    sex?: Sex;
    height?: number;
    weight?: number;
  };
  contact?: Contact;
  lifestyle?: {
    occupation?: string;
    timeZone?: string;
    activityLevel?: string;
    primaryGoal?: string;
    secondaryGoals?: string[];
  };
  health?: {
    flags?: string[];
    allergies?: string[];
    chronicConditions?: string[];
    injuries?: string[];
    medications?: string[];
    notes?: string;
  };
  nutrition?: {
    dietType?: string;
    cuisinePreference?: string;
    dislikes?: string[];
    supplements?: string[];
    hydrationTargetMl?: number;
    fastingWindow?: string;
  };
  schedule?: {
    timeBudgetMin?: number;
    daysPerWeek?: number;
    preferredSlots?: PreferredSlot[];
    notes?: string;
  };
  equipment?: string[];
  preferences?: {
    modules?: string[];
    tone?: "gentle" | "balanced" | "intense";
    indoorOnly?: boolean;
    level?: "beginner" | "intermediate" | "advanced" | string;
    coachingNotes?: string;
    focusAreas?: string[];
  };
  coachingNotes?: string;
  createdAt?: string;
  updatedAt?: string;
  ui?: UiProfileSnapshot;
};

type PlanRow = {
  planId: string;
  profileId: string;
  planName?: string; // e.g., "Plan for Anchit Tandon"
  days: number;
  confidence: number;
  warnings: string[];
  planJSON: StoredPlan;
  analytics?: Record<string, any>;
  costMetrics?: Record<string, any>;
  createdAt?: string;
  inputSummary?: string; // Summary of input parameters
  source?: "gemini" | "custom-gpt" | "rule-engine"; // AI provider used
};

type MemoryState = {
  profiles: ProfileRow[];
  plans: PlanRow[];
};

// Every account has its own state document, so nobody sees anyone else's
// profiles or plans. The account comes from the signed session cookie; the
// data routes only run for signed-in requests (see middleware.ts).
const stateKey = (uid: string) => `users/${uid}/lifeengine.state.json`;

// Before accounts, all data lived in this one shared document.
const LEGACY_KEY = "lifeengine.state.json";

export class NotSignedInError extends Error {
  constructor() {
    super("Not signed in");
  }
}

async function requireUser(): Promise<string> {
  const uid = await currentUserId();
  if (!uid) throw new NotSignedInError();
  return uid;
}

function emptyState(): MemoryState {
  return { profiles: [], plans: [] };
}

function normalizeState(raw: Partial<MemoryState> | null): MemoryState {
  return {
    profiles: Array.isArray(raw?.profiles) ? raw.profiles : [],
    plans: Array.isArray(raw?.plans) ? raw.plans : [],
  };
}

async function readState(): Promise<MemoryState> {
  const uid = await requireUser();
  return normalizeState(await readJson<MemoryState>(stateKey(uid)));
}

async function writeState(state: MemoryState) {
  const uid = await requireUser();
  await writeJson(stateKey(uid), state);
}

/**
 * Give the data saved before accounts existed to the owner's account, once:
 * when the number matches LEGACY_OWNER_MOBILE, the PIN is the old owner PIN
 * (APP_PIN_HASH), and the account has no data yet, copy the old shared
 * document into it. The old document is left in place.
 */
export async function importLegacyData(uid: string, mobileE164: string, pin: string): Promise<boolean> {
  const owner = normalizeMobile(process.env.LEGACY_OWNER_MOBILE ?? "");
  if (!owner || owner !== mobileE164) return false;
  if (await readJson<MemoryState>(stateKey(uid))) return false;
  if (!(await isLegacyOwnerPin(pin))) return false;
  const legacy = await readJson<MemoryState>(LEGACY_KEY);
  await writeJson(stateKey(uid), legacy ? normalizeState(legacy) : emptyState());
  return !!legacy;
}

export const db = {
  async getProfiles(): Promise<ProfileRow[]> {
    const state = await readState();
    return [...state.profiles].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  },
  async getProfile(id: string): Promise<ProfileRow | null> {
    const state = await readState();
    return state.profiles.find((profile) => profile.id === id) ?? null;
  },
  async saveProfile(profile: ProfileRow) {
    const payload = { ...profile, createdAt: profile.createdAt ?? new Date().toISOString() };
    if (payload.ui) {
      payload.ui = {
        ...payload.ui,
        createdAt: payload.createdAt ?? payload.ui.createdAt ?? new Date().toISOString(),
        updatedAt: payload.ui.updatedAt ?? payload.updatedAt ?? payload.createdAt,
      };
    }
    payload.updatedAt = profile.updatedAt ?? payload.updatedAt ?? payload.createdAt;
    const state = await readState();
    const filtered = state.profiles.filter((p) => p.id !== profile.id);
    state.profiles = [payload, ...filtered];
    await writeState(state);
  },
  async updateProfile(profile: ProfileRow) {
    const payload = { ...profile, createdAt: profile.createdAt ?? new Date().toISOString() };
    payload.updatedAt = profile.updatedAt ?? new Date().toISOString();
    if (payload.ui) {
      payload.ui = {
        ...payload.ui,
        createdAt: payload.createdAt ?? payload.ui.createdAt ?? new Date().toISOString(),
        updatedAt: payload.updatedAt,
      };
    }
    const state = await readState();
    state.profiles = state.profiles.map((p) => (p.id === profile.id ? { ...p, ...payload } : p));
    await writeState(state);
  },
  async deleteProfile(id: string) {
    const state = await readState();
    state.profiles = state.profiles.filter((profile) => profile.id !== id);
    state.plans = state.plans.filter((plan) => plan.profileId !== id);
    await writeState(state);
  },
  async savePlan(plan: PlanRow) {
    const payload = { ...plan, createdAt: plan.createdAt ?? new Date().toISOString() };
    const state = await readState();
    state.plans = [payload, ...state.plans];
    await writeState(state);
  },
  async listPlans(profileId: string): Promise<PlanRow[]> {
    const state = await readState();
    return state.plans
      .filter((plan) => plan.profileId === profileId)
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  },
  async listAllPlans(): Promise<PlanRow[]> {
    const state = await readState();
    return [...state.plans].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  },
  async getPlan(planId: string): Promise<PlanRow | null> {
    const state = await readState();
    return state.plans.find((plan) => plan.planId === planId) ?? null;
  },
};
