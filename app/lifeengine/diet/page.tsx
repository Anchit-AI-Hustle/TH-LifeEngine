"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  Apple,
  Ban,
  Beef,
  Check,
  CircleAlert,
  Coffee,
  Copy,
  Flame,
  Globe,
  Loader2,
  Milk,
  Carrot,
  Nut,
  Package,
  RefreshCw,
  Salad,
  ShoppingBasket,
  Soup,
  Sparkles,
  UserRound,
  UtensilsCrossed,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { GENDER_LABEL, ProfileAvatar } from "../profiles/ProfileAvatar";
import { loadDietPlan, saveDietPlan } from "@/lib/diet/store";

interface Profile {
  id: string;
  name: string;
  age: number;
  gender: string;
  goals: string[];
  healthConcerns?: string;
  experience: string;
  preferredTime: string;
  subscriptionType: string;
}

interface DietPlan {
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
    macronutrients: {
      protein: number;
      carbs: number;
      fats: number;
    };
    mealPlan: {
      breakfast: string[];
      lunch: string[];
      dinner: string[];
      snacks: string[];
    };
    shoppingList: string[];
  };
  createdAt: string;
}

/** value is what the API receives; label is what people see. */
type Option = { value: string; label: string };
const opt = (value: string, label = value): Option => ({ value, label });

const RESTRICTIONS: Option[] = [
  opt("Vegetarian"),
  opt("Vegan"),
  opt("Eggetarian"),
  opt("Jain"),
  opt("Keto"),
  opt("Paleo"),
  opt("Mediterranean"),
  opt("Low-Carb", "Low-carb"),
  opt("Gluten-Free", "Gluten-free"),
];
const ALLERGIES: Option[] = ["Nuts", "Dairy", "Eggs", "Soy", "Shellfish", "Wheat", "Fish"].map((v) => opt(v));
const CUISINES: Option[] = ["Indian", "Italian", "Mexican", "Asian", "Mediterranean", "American", "Middle Eastern"].map(
  (v) => opt(v),
);

const BUDGETS: Option[] = [opt("budget", "Low cost"), opt("moderate", "Moderate"), opt("premium", "Premium")];
const BUDGET_LABEL: Record<string, string> = { budget: "low-cost", moderate: "moderate", premium: "premium" };

const MEALS: { key: keyof DietPlan["generatedPlan"]["mealPlan"]; title: string; icon: LucideIcon; tint: string }[] = [
  { key: "breakfast", title: "Breakfast", icon: Coffee, tint: "bg-amber-50 text-amber-700" },
  { key: "lunch", title: "Lunch", icon: Soup, tint: "bg-emerald-50 text-emerald-700" },
  { key: "dinner", title: "Dinner", icon: UtensilsCrossed, tint: "bg-indigo-50 text-indigo-600" },
  { key: "snacks", title: "Snacks", icon: Apple, tint: "bg-rose-50 text-rose-600" },
];

/** Groups for the shopping list. The longest matching keyword wins ("eggplant" beats "egg"). */
const AISLES: { title: string; icon: LucideIcon; words: string[] }[] = [
  {
    title: "Nuts and seeds",
    icon: Nut,
    words: ["almond", "cashew", "walnut", "peanut", "pistachio", "nut", "seed", "chia", "flax", "sesame", "makhana", "raisin", "dates", "dry fruit", "trail mix"],
  },
  {
    title: "Meat, fish and tofu",
    icon: Beef,
    words: ["chicken", "mutton", "lamb", "fish", "prawn", "shrimp", "salmon", "tuna", "turkey", "meat", "tofu", "tempeh", "soya chunk", "soy chunk"],
  },
  {
    title: "Dairy and eggs",
    icon: Milk,
    words: ["milk", "curd", "yogurt", "yoghurt", "dahi", "paneer", "cheese", "butter", "ghee", "cream", "egg", "buttermilk", "chaas", "whey"],
  },
  {
    title: "Spices, oils and pantry",
    icon: Package,
    words: ["oil", "salt", "sugar", "jaggery", "honey", "spice", "masala", "turmeric", "cumin", "jeera", "mustard seed", "black pepper", "chilli powder", "chili powder", "coriander powder", "garam", "hing", "asafoetida", "tea", "coffee", "vinegar", "sauce", "stock", "cocoa", "baking", "powder", "pickle"],
  },
  {
    title: "Grains and pulses",
    icon: Wheat,
    words: ["rice", "atta", "wheat", "flour", "oat", "bread", "roti", "chapati", "quinoa", "millet", "ragi", "jowar", "bajra", "poha", "rava", "semolina", "suji", "pasta", "noodle", "dal", "lentil", "chana", "chickpea", "rajma", "kidney bean", "moong", "urad", "toor", "masoor", "besan", "cereal", "muesli", "tortilla", "dalia", "beans"],
  },
  {
    title: "Vegetables and fruit",
    icon: Carrot,
    words: ["spinach", "palak", "tomato", "onion", "potato", "carrot", "cucumber", "capsicum", "bell pepper", "pepper", "broccoli", "cauliflower", "cabbage", "green bean", "peas", "okra", "bhindi", "gourd", "lauki", "brinjal", "eggplant", "garlic", "ginger", "lemon", "lime", "apple", "banana", "mango", "orange", "berr", "fruit", "vegetable", "veggie", "lettuce", "mushroom", "coriander", "cilantro", "mint", "curry lea", "avocado", "papaya", "guava", "pomegranate", "grape", "melon", "chilli", "chili", "beetroot", "sweet potato", "kale", "zucchini", "salad", "herb", "coconut", "methi", "pumpkin", "corn", "sprout"],
  },
];
const OTHER_AISLE = { title: "Other", icon: ShoppingBasket };

function aisleOf(item: string) {
  const text = item.toLowerCase();
  let best = -1;
  let bestLen = 0;
  AISLES.forEach((aisle, index) => {
    for (const word of aisle.words) {
      if (word.length > bestLen && new RegExp(`\\b${word}`).test(text)) {
        best = index;
        bestLen = word.length;
      }
    }
  });
  return best;
}

export default function DietBuilderPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [profilesError, setProfilesError] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<DietPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);
  const resultsRef = useRef<HTMLHeadingElement>(null);

  // Form state
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [cuisinePreferences, setCuisinePreferences] = useState<string[]>([]);
  const [mealFrequency, setMealFrequency] = useState(3);
  const [budget, setBudget] = useState("moderate");
  const [additionalNotes, setAdditionalNotes] = useState("");

  useEffect(() => {
    loadProfiles();
  }, []);

  // Show the person's latest saved plan; switching person shows theirs.
  useEffect(() => {
    if (!selectedProfileId) return;
    setGeneratedPlan(loadDietPlan(selectedProfileId));
    setChecked(new Set());
  }, [selectedProfileId]);

  const loadProfiles = async () => {
    setProfilesLoading(true);
    setProfilesError(false);
    try {
      const response = await fetch("/api/lifeengine/profiles");
      if (response.ok) {
        const data = await response.json();
        setProfiles(data.profiles || []);
        if (data.profiles?.length > 0 && !selectedProfileId) {
          setSelectedProfileId(data.profiles[0].id);
        }
      } else {
        setProfilesError(true);
      }
    } catch (error) {
      console.error("Failed to load profiles:", error);
      setProfilesError(true);
    } finally {
      setProfilesLoading(false);
    }
  };

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (value: string) =>
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  const generateDietPlan = async () => {
    if (!selectedProfileId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/lifeengine/diet/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: selectedProfileId,
          preferences: {
            dietaryRestrictions,
            allergies,
            cuisinePreferences,
            mealFrequency,
            budget,
            additionalNotes,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 503) {
          throw new Error("Diet plans need the AI service, and it is not set up on this server yet.");
        }
        throw new Error(data.error ? `${data.error}.` : "The diet plan could not be built.");
      }

      const data = await response.json();
      setGeneratedPlan(data.plan);
      if (data.plan) saveDietPlan(data.plan);
      setChecked(new Set());
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        resultsRef.current?.focus({ preventScroll: true });
      });
    } catch (error) {
      // fetch() rejects with a TypeError when the request never reached the server.
      const network = error instanceof TypeError || !(error instanceof Error);
      if (network) console.error("Diet generation error:", error);
      setError(network ? "The network request failed. Check your connection." : (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);
  const plan = generatedPlan?.generatedPlan;

  const shopping = useMemo(() => {
    const items = plan?.shoppingList ?? [];
    const groups = new Map<number, { item: string; index: number }[]>();
    items.forEach((item, index) => {
      const aisle = aisleOf(item);
      if (!groups.has(aisle)) groups.set(aisle, []);
      groups.get(aisle)!.push({ item, index });
    });
    return [...groups.entries()]
      .sort(([a], [b]) => (a === -1 ? 1 : b === -1 ? -1 : a - b))
      .map(([aisle, entries]) => ({ ...(aisle === -1 ? OTHER_AISLE : AISLES[aisle]), entries }));
  }, [plan]);

  const shoppingTotal = plan?.shoppingList?.length ?? 0;

  const copyList = async () => {
    const text = shopping.map((g) => `${g.title}\n${g.entries.map((e) => `- ${e.item}`).join("\n")}`).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const macros = plan?.macronutrients;
  const macroKcal = macros
    ? { protein: (macros.protein || 0) * 4, carbs: (macros.carbs || 0) * 4, fats: (macros.fats || 0) * 9 }
    : null;
  const macroTotal = macroKcal ? macroKcal.protein + macroKcal.carbs + macroKcal.fats : 0;
  const pct = (n: number) => (macroTotal ? Math.round((n / macroTotal) * 100) : 0);

  const selectionSummary = [
    `${mealFrequency} meals a day`,
    `${BUDGET_LABEL[budget]} budget`,
    dietaryRestrictions.length ? `${dietaryRestrictions.length} restriction${dietaryRestrictions.length > 1 ? "s" : ""}` : null,
    allergies.length ? `${allergies.length} allerg${allergies.length > 1 ? "ies" : "y"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <PageHeader
        title="Diet builder"
        description="A day of meals and a week's shopping list that respect restrictions, allergies and the food you like."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:items-start">
        {/* Profile */}
        <section
          aria-labelledby="diet-profile-heading"
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:col-start-2 lg:row-start-1"
        >
          <h2 id="diet-profile-heading" className="text-base font-semibold text-gray-900">
            Who is it for?
          </h2>
          {profilesLoading ? (
            <div className="mt-4 space-y-3" aria-busy="true" aria-label="Loading profiles">
              <div className="h-10 animate-pulse rounded-xl bg-gray-100" />
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 animate-pulse rounded-full bg-gray-100" />
                <div className="h-4 w-1/2 animate-pulse rounded-lg bg-gray-100" />
              </div>
            </div>
          ) : profilesError ? (
            <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p className="flex items-start gap-2">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Profiles could not be loaded.
              </p>
              <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={loadProfiles}>
                <RefreshCw aria-hidden />
                Retry
              </Button>
            </div>
          ) : profiles.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-gray-300 px-4 py-5 text-center">
              <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <UserRound className="h-5 w-5" aria-hidden />
              </span>
              <p className="text-sm font-semibold text-gray-900">Add a profile first</p>
              <p className="mt-1 text-sm text-gray-600">Plans are built around a person&apos;s age, goals and health notes.</p>
              <Link
                href="/lifeengine/profiles"
                className="mt-4 inline-flex min-h-[40px] items-center justify-center rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
              >
                Create a profile
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <Field label="Profile">
                <Select value={selectedProfileId} onChange={(e) => setSelectedProfileId(e.target.value)}>
                  <option value="">Select a profile</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} ({profile.age})
                    </option>
                  ))}
                </Select>
              </Field>
              {selectedProfile ? (
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="flex items-center gap-3">
                    <ProfileAvatar name={selectedProfile.name} seed={selectedProfile.id} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{selectedProfile.name}</p>
                      <p className="text-sm text-gray-500">
                        {selectedProfile.age} yrs · {GENDER_LABEL[selectedProfile.gender] ?? selectedProfile.gender}
                      </p>
                    </div>
                  </div>
                  {selectedProfile.goals?.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Goals">
                      {selectedProfile.goals.map((goal) => (
                        <li
                          key={goal}
                          className="max-w-full truncate rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200"
                        >
                          {goal}
                        </li>
                      ))}
                    </ul>
                  )}
                  {selectedProfile.healthConcerns?.trim() && (
                    <p className="mt-3 line-clamp-2 text-sm text-gray-600">
                      <span className="font-medium text-gray-700">Health: </span>
                      {selectedProfile.healthConcerns}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Choose who the plan is for.</p>
              )}
            </div>
          )}
        </section>

        {/* Preferences */}
        <section
          aria-labelledby="diet-prefs-heading"
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:col-start-1 lg:row-span-2 lg:row-start-1"
        >
          <h2 id="diet-prefs-heading" className="text-base font-semibold text-gray-900">
            Food preferences
          </h2>
          <p className="mt-1 text-sm text-gray-500">Tap to select. Leave a group empty if it does not apply.</p>

          <div className="mt-5 divide-y divide-gray-100">
            <ChipGroup
              title="Diet"
              icon={Salad}
              options={RESTRICTIONS}
              selected={dietaryRestrictions}
              onToggle={toggle(setDietaryRestrictions)}
              onClear={() => setDietaryRestrictions([])}
            />
            <ChipGroup
              title="Allergies"
              hint="Never included"
              icon={Ban}
              options={ALLERGIES}
              selected={allergies}
              onToggle={toggle(setAllergies)}
              onClear={() => setAllergies([])}
              tone="warn"
            />
            <ChipGroup
              title="Cuisines"
              icon={Globe}
              options={CUISINES}
              selected={cuisinePreferences}
              onToggle={toggle(setCuisinePreferences)}
              onClear={() => setCuisinePreferences([])}
            />
            <div className="pt-5">
              <Field label="Anything else" helper="Dislikes, fasting days, timings or foods to include.">
                <Textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="e.g. No onion or garlic on Tuesdays, prefers millets"
                  rows={3}
                />
              </Field>
            </div>
          </div>
        </section>

        {/* Plan settings + build */}
        <section
          aria-labelledby="diet-settings-heading"
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:col-start-2 lg:row-start-2"
        >
          <h2 id="diet-settings-heading" className="text-base font-semibold text-gray-900">
            Plan settings
          </h2>
          <div className="mt-4 space-y-4">
            <Segmented
              label="Meals per day"
              name="mealFrequency"
              value={String(mealFrequency)}
              options={["2", "3", "4", "5"].map((v) => opt(v))}
              onChange={(v) => setMealFrequency(parseInt(v))}
            />
            <Segmented label="Budget" name="budget" value={budget} options={BUDGETS} onChange={setBudget} />
          </div>

          <div className="mt-6 border-t border-gray-100 pt-5">
            <p className="mb-3 text-sm text-gray-500">{selectionSummary}</p>
            <Button
              type="button"
              onClick={generateDietPlan}
              disabled={loading || !selectedProfileId}
              aria-describedby={!selectedProfileId ? "diet-build-hint" : undefined}
              className="w-full"
            >
              {loading ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
              {loading ? "Building your plan…" : generatedPlan ? "Rebuild diet plan" : "Build diet plan"}
            </Button>
            {!selectedProfileId && !profilesLoading && (
              <p id="diet-build-hint" className="mt-2 text-xs text-gray-500">
                Select a profile to build a plan.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Results */}
      <div className="mt-8 space-y-6" aria-live="polite">
        {error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="flex items-start gap-2">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                <span className="font-semibold">No plan this time.</span> {error}
              </span>
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={generateDietPlan} disabled={loading}>
              <RefreshCw aria-hidden />
              Try again
            </Button>
          </div>
        )}

        {loading && (
          <div role="status" aria-label="Building your diet plan">
            <p className="mb-4 flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" aria-hidden />
              Building the plan. This can take up to a minute.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-100" />
                  <div className="mt-4 h-4 w-1/2 animate-pulse rounded-lg bg-gray-100" />
                  <div className="mt-3 h-3 w-4/5 animate-pulse rounded-lg bg-gray-100" />
                  <div className="mt-2 h-3 w-3/5 animate-pulse rounded-lg bg-gray-100" />
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !generatedPlan && !error && (
          <EmptyState
            icon={UtensilsCrossed}
            title="Your meal plan appears here"
            description="Pick who it is for and any preferences, then build the plan."
          />
        )}

        {generatedPlan && plan && !loading && (
          <section aria-labelledby="diet-results-heading" className="space-y-6">
            <div>
              <h2
                id="diet-results-heading"
                ref={resultsRef}
                tabIndex={-1}
                className="scroll-mt-20 text-lg font-semibold text-gray-900 focus:outline-none"
              >
                {selectedProfile && selectedProfile.id === generatedPlan.profileId
                  ? `Diet plan for ${selectedProfile.name}`
                  : "Your diet plan"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">A sample day of meals and a shopping list for seven days.</p>
            </div>

            {/* Calories and macros */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-8">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                    <Flame className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Daily calories</p>
                    <p className="text-2xl font-semibold tabular-nums text-gray-900">
                      {plan.dailyCalories?.toLocaleString("en-IN") ?? "—"}
                      <span className="ml-1 text-sm font-medium text-gray-500">kcal</span>
                    </p>
                  </div>
                </div>
                {macros && macroKcal && (
                  <div className="min-w-0">
                    <div
                      className="flex h-2.5 overflow-hidden rounded-full bg-gray-100"
                      role="img"
                      aria-label={`Calories from protein ${pct(macroKcal.protein)}%, carbs ${pct(macroKcal.carbs)}%, fats ${pct(macroKcal.fats)}%`}
                    >
                      <span className="bg-indigo-500" style={{ width: `${pct(macroKcal.protein)}%` }} />
                      <span className="bg-emerald-500" style={{ width: `${pct(macroKcal.carbs)}%` }} />
                      <span className="bg-amber-400" style={{ width: `${pct(macroKcal.fats)}%` }} />
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-3">
                      {[
                        { label: "Protein", grams: macros.protein, share: pct(macroKcal.protein), dot: "bg-indigo-500" },
                        { label: "Carbs", grams: macros.carbs, share: pct(macroKcal.carbs), dot: "bg-emerald-500" },
                        { label: "Fats", grams: macros.fats, share: pct(macroKcal.fats), dot: "bg-amber-400" },
                      ].map((m) => (
                        <div key={m.label} className="min-w-0">
                          <dt className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                            <span className={clsx("h-2 w-2 shrink-0 rounded-full", m.dot)} aria-hidden />
                            {m.label}
                          </dt>
                          <dd className="mt-0.5 text-base font-semibold tabular-nums text-gray-900">
                            {m.grams ?? 0}g <span className="text-xs font-medium text-gray-500">{m.share}%</span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            </div>

            {/* Meals */}
            <div>
              <h3 className="mb-3 text-base font-semibold text-gray-900">Sample day</h3>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {MEALS.filter((m) => (plan.mealPlan?.[m.key] ?? []).length > 0).map((meal) => {
                  const Icon = meal.icon;
                  return (
                    <li key={meal.key} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", meal.tint)}>
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <h4 className="text-sm font-semibold text-gray-900">{meal.title}</h4>
                      </div>
                      <ul className="mt-4 space-y-2">
                        {(plan.mealPlan[meal.key] ?? []).map((item, i) => (
                          <li key={i} className="flex gap-2 text-sm text-gray-700">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" aria-hidden />
                            <span className="min-w-0 break-words">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Shopping list */}
            {shoppingTotal > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Shopping list</h3>
                    <p className="mt-1 text-sm text-gray-500" aria-live="polite">
                      {checked.size} of {shoppingTotal} picked up
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {checked.size > 0 && (
                      <Button type="button" variant="subtle" size="sm" onClick={() => setChecked(new Set())}>
                        Clear ticks
                      </Button>
                    )}
                    <Button type="button" variant="ghost" size="sm" onClick={copyList}>
                      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                      {copied ? "Copied" : "Copy list"}
                    </Button>
                  </div>
                </div>
                <div className="mt-5 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {shopping.map((group) => {
                    const Icon = group.icon;
                    return (
                      <fieldset key={group.title} className="min-w-0">
                        <legend className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                          <Icon className="h-4 w-4 text-gray-400" aria-hidden />
                          {group.title}
                        </legend>
                        <ul className="divide-y divide-gray-100">
                          {group.entries.map(({ item, index }) => {
                            const isChecked = checked.has(index);
                            return (
                              <li key={index}>
                                <label className="flex min-h-[40px] cursor-pointer items-start gap-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() =>
                                      setChecked((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(index)) next.delete(index);
                                        else next.add(index);
                                        return next;
                                      })
                                    }
                                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-indigo-600"
                                  />
                                  <span
                                    className={clsx(
                                      "min-w-0 break-words text-sm",
                                      isChecked ? "text-gray-400 line-through" : "text-gray-700",
                                    )}
                                  >
                                    {item}
                                  </span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      </fieldset>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function ChipGroup({
  title,
  hint,
  icon: Icon,
  options,
  selected,
  onToggle,
  onClear,
  tone = "accent",
}: {
  title: string;
  hint?: string;
  icon: LucideIcon;
  options: Option[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  tone?: "accent" | "warn";
}) {
  const headingId = `chips-${title.toLowerCase()}`;
  return (
    <div className="py-5 first:pt-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 id={headingId} className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-900">
          <Icon className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          {title}
          {hint && <span className="font-normal text-gray-500">· {hint}</span>}
          <span
            className={clsx(
              "rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
              selected.length ? "bg-indigo-50 text-indigo-700" : "bg-gray-100 text-gray-500",
            )}
          >
            {selected.length}
            <span className="sr-only"> selected</span>
          </span>
        </h3>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
            aria-label={`Clear ${title.toLowerCase()}`}
          >
            Clear
          </button>
        )}
      </div>
      <div role="group" aria-labelledby={headingId} className="flex flex-wrap gap-2">
        {options.map((option) => {
          const on = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(option.value)}
              className={clsx(
                "inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100",
                on
                  ? tone === "warn"
                    ? "bg-amber-50 text-amber-800 ring-1 ring-amber-300 hover:bg-amber-100"
                    : "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-100"
                  : "bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50",
              )}
            >
              {on && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Segmented({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-[13px] font-semibold text-gray-700">{label}</legend>
      <div
        className="grid rounded-xl bg-gray-100 p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((option) => (
          <label key={option.value} className="relative min-w-0">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span className="flex min-h-[40px] cursor-pointer items-center justify-center truncate rounded-lg px-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 peer-checked:bg-white peer-checked:text-gray-900 peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
