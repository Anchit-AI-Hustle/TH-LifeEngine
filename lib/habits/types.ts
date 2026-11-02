/** Data shapes for the habit tracker. Stored in localStorage (see ./store). */

export type HabitColor = "indigo" | "emerald" | "amber" | "rose" | "lime" | "slate";

export type HabitIcon =
  | "droplets"
  | "footprints"
  | "wind"
  | "moon"
  | "candy-off"
  | "book-open"
  | "sun"
  | "person-standing"
  | "dumbbell"
  | "apple"
  | "brain"
  | "leaf"
  | "heart"
  | "monitor-off"
  | "coffee"
  | "salad";

/** "daily" = every day; "weekly" = any `perWeek` days in each Monday-to-Sunday week. */
export type HabitTarget = { kind: "daily" } | { kind: "weekly"; perWeek: number };

export type ChallengeStatus = "active" | "completed" | "stopped";

export type Challenge = {
  id: string;
  /** Date key (YYYY-MM-DD) of day 1. */
  start: string;
  /** Always 21 today; stored so longer challenges can be added later. */
  length: number;
  status: ChallengeStatus;
  /** Date key the challenge was marked complete or stopped. */
  endedOn?: string;
};

export type Habit = {
  id: string;
  name: string;
  icon: HabitIcon;
  color: HabitColor;
  target: HabitTarget;
  /** Free text cue, e.g. "After breakfast" or "7:00 am". The app sends no notifications. */
  reminder?: string;
  /** Date key the habit was created (or the earliest day ticked, if earlier). */
  createdOn: string;
  archived: boolean;
  /** Sorted, unique date keys on which the habit was done. */
  done: string[];
  challenges: Challenge[];
  templateId?: string;
};

export type HabitsState = { version: 1; habits: Habit[] };

export type HabitTemplate = {
  id: string;
  name: string;
  icon: HabitIcon;
  color: HabitColor;
  target: HabitTarget;
  reminder?: string;
  /** One line on why it helps. */
  why: string;
};
