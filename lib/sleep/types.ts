/** Data shapes for the sleep log. Stored in localStorage (see ./store). */

export type SleepTag = "caffeine" | "screens" | "workout" | "stress" | "late-meal" | "alcohol" | "nap";

export type SleepQuality = 1 | 2 | 3 | 4 | 5;

export type SleepEntry = {
  id: string;
  /** Date key (YYYY-MM-DD) of the evening the night started. */
  night: string;
  /** "HH:MM", 24-hour. */
  bedtime: string;
  /** "HH:MM", 24-hour. Earlier than bedtime means the next morning. */
  wake: string;
  quality: SleepQuality;
  tags: SleepTag[];
  notes: string;
  updatedAt: string;
};

export type SleepState = {
  version: 1;
  /** Nightly goal in minutes (default 480 = 8h). */
  goalMinutes: number;
  entries: SleepEntry[];
};
