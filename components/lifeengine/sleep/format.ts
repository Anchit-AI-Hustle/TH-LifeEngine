import type { SleepQuality } from "@/lib/sleep/types";

export const QUALITY_LABELS: Record<SleepQuality, string> = {
  1: "Poor",
  2: "Restless",
  3: "Okay",
  4: "Good",
  5: "Great",
};

function keyDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const DAY_FMT = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const WEEKDAY_FMT = new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" });

/** "Sun, 1 Nov" */
export const formatNight = (key: string) => DAY_FMT.format(keyDate(key));
/** "Sun" */
export const formatWeekday = (key: string) => WEEKDAY_FMT.format(keyDate(key));
/** "1" */
export const formatDayNumber = (key: string) => String(Number(key.slice(8, 10)));
