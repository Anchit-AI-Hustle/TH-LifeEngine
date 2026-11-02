// One display model for every plan format the app stores, so the plan page,
// the notebook demo and the Custom GPT preview all read the same way.
import type { DayPlan as WeeklyDayPlan, WeeklySchedule } from "@/app/types/lifeengine";

export type ChipKind = "time" | "kcal" | "sets" | "reps" | "rest" | "portion" | "text";
export type ViewChip = { kind: ChipKind; text: string };
export type ViewNote = { label?: string; text: string };

export type Nutrition = {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
};

export type ViewPose = {
  name: string;
  chips: ViewChip[];
  description?: string;
  benefits?: string;
  focus?: string;
  steps: string[];
  breathing?: string;
  modifications?: string;
  avoid: string[];
};

export type ViewYoga = {
  title?: string;
  chips: ViewChip[];
  poses: ViewPose[];
  /** Free-text practice when there is no pose sequence. */
  description?: string;
  notes: ViewNote[];
};

export type ViewExercise = {
  name: string;
  type?: string;
  chips: ViewChip[];
  muscles: string[];
  description?: string;
  steps: string[];
  formCues: string[];
  avoid: string[];
  tips: string[];
  progress?: string;
  regress?: string;
};

export type ViewMeal = {
  label: string;
  title: string;
  chips: ViewChip[];
  nutrition: Nutrition;
  description?: string;
  ingredients: string[];
  steps: string[];
  notes?: string;
  swap?: string;
};

export type ViewDay = {
  /** "Day 3" */
  label: string;
  /** "Wednesday" or "Wed, 4 Nov" */
  sublabel?: string;
  /** Short form for the day chips: "Wed" or "4 Nov". */
  short?: string;
  isToday?: boolean;
  restDay?: boolean;
  note?: string;
  yoga: ViewYoga | null;
  exercises: ViewExercise[];
  meals: ViewMeal[];
  tips: ViewNote[];
};

// ---------- small helpers ----------

export const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

export function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/** "evening_tea" -> "Evening tea" */
export function humanize(value: string) {
  return capitalize(value.replace(/[_-]+/g, " ").trim().toLowerCase());
}

export const minutes = (value?: number | null) => (value ? `${value} min` : undefined);

const num = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()).map((s) => s.trim()) : [];

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

function chips(...items: (ViewChip | undefined | false | null)[]): ViewChip[] {
  return items.filter(Boolean) as ViewChip[];
}

const chip = (kind: ChipKind, value?: string | false | null): ViewChip | undefined =>
  value ? { kind, text: value } : undefined;

/** "10-12" -> "10–12 reps", "30 seconds" stays as it is. */
export function repsLabel(reps: unknown): string | undefined {
  if (reps === undefined || reps === null || reps === "") return undefined;
  const value = String(reps).trim();
  if (/^[\d\s\-–x×]+$/i.test(value)) return `${value.replace(/-/g, "–")} reps`;
  return value;
}

export function setsLabel(sets: unknown): string | undefined {
  const value = num(sets);
  if (!value) return undefined;
  return `${value} ${value === 1 ? "set" : "sets"}`;
}

/** Local yyyy-mm-dd, so "today" matches the user's own calendar. */
export function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse "2026-11-02" (or a full ISO string) as a local calendar date. */
export function parseLocalDate(value?: string): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(date: Date, opts: Intl.DateTimeFormatOptions) {
  return date.toLocaleDateString("en-IN", opts);
}

export function todayWeekday() {
  return WEEKDAYS[(new Date().getDay() + 6) % 7];
}

/** Totals across the day's meals, only for values the plan actually gives. */
export function dayNutrition(meals: ViewMeal[]): Nutrition {
  const total: Nutrition = {};
  for (const meal of meals) {
    (Object.keys(meal.nutrition) as (keyof Nutrition)[]).forEach((key) => {
      const value = meal.nutrition[key];
      if (typeof value === "number") total[key] = (total[key] ?? 0) + value;
    });
  }
  return total;
}

export function hasContent(day: ViewDay) {
  return Boolean(day.yoga || day.exercises.length || day.meals.length || day.tips.length || day.note);
}

// ---------- weekly schedule (Custom GPT plans) ----------

function weeklyYoga(day: WeeklyDayPlan): ViewYoga | null {
  const session = day?.yoga;
  if (!session) return null;
  const poses: ViewPose[] = (session.sequence ?? []).map((pose) => ({
    name: pose.name,
    chips: chips(chip("time", minutes(pose.duration_min)), chip("kcal", pose.calories_burned ? `${Math.round(pose.calories_burned)} kcal` : undefined)),
    benefits: text(pose.benefits),
    focus: text(pose.focus),
    steps: strings(pose.steps),
    breathing: text(pose.breathing_instructions),
    modifications: text(pose.modifications),
    avoid: strings(pose.common_mistakes),
  }));
  const poseMinutes = (session.sequence ?? []).reduce((sum, pose) => sum + (pose.duration_min || 0), 0);
  const total = poseMinutes + (session.warmup_min ?? 0) + (session.cooldown_min ?? 0);
  const notes: ViewNote[] = [];
  if (text(session.breathwork)) notes.push({ label: "Breathwork", text: session.breathwork!.trim() });
  if (text(session.journal_prompt)) notes.push({ label: "Journal prompt", text: session.journal_prompt!.trim() });
  return {
    title: text(session.focus_area),
    chips: chips(
      chip("time", total ? `${total} min total` : undefined),
      chip("text", session.warmup_min ? `Warm-up ${session.warmup_min} min` : undefined),
      chip("text", session.cooldown_min ? `Cool-down ${session.cooldown_min} min` : undefined),
    ),
    poses,
    notes,
  };
}

function weeklyExercises(day: WeeklyDayPlan): ViewExercise[] {
  if (!Array.isArray(day?.exercises)) return [];
  return day.exercises.map((exercise) => ({
    name: exercise.name,
    type: text(exercise.type) ? humanize(exercise.type) : undefined,
    chips: chips(
      chip("sets", setsLabel(exercise.sets)),
      chip("reps", repsLabel(exercise.reps)),
      chip("rest", exercise.rest_period ? `Rest ${exercise.rest_period}` : undefined),
      chip("time", minutes(exercise.duration_min)),
      chip("kcal", exercise.calories_burned ? `${Math.round(exercise.calories_burned)} kcal` : undefined),
    ),
    muscles: strings(exercise.target_muscles),
    description: text(exercise.description),
    steps: strings(exercise.steps),
    formCues: strings(exercise.form_cues),
    avoid: strings(exercise.common_mistakes),
    tips: [],
    progress: text(exercise.progressions),
    regress: text(exercise.regressions),
  }));
}

function weeklyMeal(label: string, meal: any): ViewMeal | null {
  if (!meal) return null;
  const steps = strings(meal.recipe_steps).length
    ? strings(meal.recipe_steps)
    : strings(meal.steps).length
      ? strings(meal.steps)
      : strings(meal.instructions);
  return {
    label,
    title: text(meal.title) ?? text(meal.name) ?? label,
    chips: chips(
      chip("time", meal.preparation_time ? `Prep ${meal.preparation_time}` : undefined),
      chip("time", meal.cooking_time ? `Cook ${meal.cooking_time}` : undefined),
      chip("portion", text(meal.portion_guidance) ?? text(meal.portions)),
    ),
    nutrition: {
      calories: num(meal.calories),
      protein: num(meal.protein_g),
      carbs: num(meal.carbs_g),
      fat: num(meal.fat_g),
      fiber: num(meal.fiber_g),
      sugar: num(meal.sugar_g),
    },
    ingredients: strings(meal.ingredients),
    steps,
    notes: text(meal.notes),
    swap: text(meal.swap),
  };
}

function weeklyMeals(day: WeeklyDayPlan): ViewMeal[] {
  const diet = (day as any)?.diet ?? (day as any)?.nutrition;
  if (!diet) return [];
  const meals: (ViewMeal | null)[] = [weeklyMeal("Breakfast", diet.breakfast), weeklyMeal("Lunch", diet.lunch)];
  if (Array.isArray(diet.snacks)) {
    diet.snacks.forEach((snack: any, index: number) =>
      meals.push(weeklyMeal(diet.snacks.length > 1 ? `Snack ${index + 1}` : "Snack", snack)),
    );
  }
  if (diet.evening_tea) meals.push(weeklyMeal("Evening tea", diet.evening_tea));
  meals.push(weeklyMeal("Dinner", diet.dinner));
  return meals.filter(Boolean) as ViewMeal[];
}

function weeklyTips(day: WeeklyDayPlan): ViewNote[] {
  const tips: ViewNote[] = [];
  const holistic = day?.holistic;
  if (text(holistic?.mindfulness)) tips.push({ label: "Mindfulness", text: holistic!.mindfulness!.trim() });
  if (text(holistic?.affirmation)) tips.push({ label: "Affirmation", text: holistic!.affirmation!.trim() });
  if (text(holistic?.sleep)) tips.push({ label: "Sleep", text: holistic!.sleep!.trim() });
  const dietNotes = (day as any)?.diet?.notes || (day as any)?.nutrition?.notes;
  if (text(dietNotes)) tips.push({ label: "Nutrition", text: dietNotes.trim() });
  return tips;
}

export function daysFromWeeklySchedule(schedule: WeeklySchedule | undefined | null): ViewDay[] {
  if (!schedule) return [];
  const today = todayWeekday();
  const days: ViewDay[] = [];
  WEEKDAYS.forEach((key) => {
    const day = schedule[key];
    if (!day) return;
    days.push({
      label: `Day ${days.length + 1}`,
      sublabel: capitalize(key),
      short: capitalize(key).slice(0, 3),
      isToday: key === today,
      restDay: Boolean(day.holistic?.rest_day),
      yoga: weeklyYoga(day),
      exercises: weeklyExercises(day),
      meals: weeklyMeals(day),
      tips: weeklyTips(day),
    });
  });
  return days;
}

// ---------- day list (generated plans: { date, activities, meals }) ----------

export type RuleActivity = { type: string; name: string; duration: number; description: string };
export type RuleMeal = { type: string; name: string; calories: number; description: string };
export type RuleDay = { date: string; activities?: RuleActivity[]; meals?: RuleMeal[] };

const YOGA_TYPES = ["yoga"];
const TRAINING_TYPES = ["movement", "exercise", "fitness", "strength", "cardio", "workout", "flexibility", "mobility"];

export function daysFromRulePlan(days: RuleDay[] | undefined): ViewDay[] {
  const todayKey = localDateKey();
  return (days ?? []).map((day, index) => {
    const activities = day.activities ?? [];
    const yogaActivities = activities.filter((a) => YOGA_TYPES.includes(a.type?.toLowerCase()));
    const training = activities.filter((a) => TRAINING_TYPES.includes(a.type?.toLowerCase()));
    const other = activities.filter((a) => !yogaActivities.includes(a) && !training.includes(a));
    const date = parseLocalDate(day.date);
    const yogaMinutes = yogaActivities.reduce((sum, a) => sum + (a.duration || 0), 0);

    const yoga: ViewYoga | null = yogaActivities.length
      ? {
          chips: chips(chip("time", yogaMinutes ? `${yogaMinutes} min total` : undefined)),
          poses: yogaActivities.map((a) => ({
            name: a.name,
            chips: chips(chip("time", minutes(a.duration))),
            description: text(a.description),
            steps: [],
            avoid: [],
          })),
          notes: [],
        }
      : null;

    return {
      label: `Day ${index + 1}`,
      sublabel: date ? formatDate(date, { weekday: "long", day: "numeric", month: "short" }) : undefined,
      short: date ? formatDate(date, { weekday: "short", day: "numeric" }) : undefined,
      isToday: Boolean(date && localDateKey(date) === todayKey),
      yoga,
      exercises: training.map((a) => ({
        name: a.name,
        type: text(a.type) ? humanize(a.type) : undefined,
        chips: chips(chip("time", minutes(a.duration))),
        muscles: [],
        description: text(a.description),
        steps: [],
        formCues: [],
        avoid: [],
        tips: [],
      })),
      meals: (day.meals ?? []).map((meal) => ({
        label: humanize(meal.type || "Meal"),
        title: meal.name,
        chips: [],
        nutrition: { calories: num(meal.calories) },
        description: text(meal.description),
        ingredients: [],
        steps: [],
      })),
      tips: [
        ...other.map((a) => ({
          label: a.name,
          text: [text(a.description), a.duration ? `${a.duration} min` : undefined].filter(Boolean).join(" · "),
        })),
        { text: "Hydrate regularly through the day." },
        { text: "Notice how you feel and note it down." },
        { text: "Stretch gently before sleep." },
      ],
    };
  });
}
