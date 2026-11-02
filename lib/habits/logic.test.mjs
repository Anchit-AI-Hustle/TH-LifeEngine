// Unit tests for lib/habits/logic.ts.
// Run: node --experimental-strip-types --test lib/habits/logic.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  challengeProgress,
  dailyStreaks,
  dayTotals,
  diffDays,
  endChallenge,
  heatLevel,
  heatmapSummary,
  heatmapWeeks,
  habitStreaks,
  lastNDays,
  milestone,
  overallWeekCompletion,
  plural,
  startChallenge,
  toggleDay,
  toggleHabitDay,
  weekCompletion,
  weekStart,
  weekday,
  weeklyStreaks,
} from "./logic.ts";

const habit = (over = {}) => ({
  id: "h1",
  name: "Water",
  icon: "droplets",
  color: "indigo",
  target: { kind: "daily" },
  createdOn: "2026-10-01",
  archived: false,
  done: [],
  challenges: [],
  ...over,
});

test("date keys: add, diff, weekday and week start across month and DST edges", () => {
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(addDays("2028-03-01", -1), "2028-02-29");
  assert.equal(diffDays("2026-10-25", "2026-11-02"), 8);
  assert.equal(weekday("2026-11-02"), 0); // Monday
  assert.equal(weekday("2026-11-08"), 6); // Sunday
  assert.equal(weekStart("2026-11-08"), "2026-11-02");
  assert.equal(weekStart("2026-11-02"), "2026-11-02");
});

test("toggleDay keeps a sorted unique list", () => {
  assert.deepEqual(toggleDay(["2026-11-02"], "2026-11-01"), ["2026-11-01", "2026-11-02"]);
  assert.deepEqual(toggleDay(["2026-11-01", "2026-11-02"], "2026-11-01"), ["2026-11-02"]);
});

test("toggleHabitDay moves createdOn back when an earlier day is ticked", () => {
  const h = toggleHabitDay(habit({ createdOn: "2026-11-02" }), "2026-10-30");
  assert.equal(h.createdOn, "2026-10-30");
  const back = toggleHabitDay(h, "2026-10-30");
  assert.equal(back.createdOn, "2026-10-30");
  assert.deepEqual(back.done, []);
});

test("daily streak counts back from today, or from yesterday if today is not ticked", () => {
  const done = ["2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"];
  assert.deepEqual(dailyStreaks(done, "2026-11-02"), { current: 4 + 1, best: 5 });
  assert.deepEqual(dailyStreaks([...done, "2026-11-02"], "2026-11-02"), { current: 6, best: 6 });
  // A gap yesterday breaks it.
  assert.equal(dailyStreaks(["2026-10-30", "2026-10-31"], "2026-11-02").current, 0);
  assert.equal(dailyStreaks([], "2026-11-02").current, 0);
});

test("daily best streak finds the longest run, ignoring future days", () => {
  const done = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-10", "2026-11-02", "2026-11-05", "2026-11-06"];
  const s = dailyStreaks(done, "2026-11-02");
  assert.equal(s.best, 3);
  assert.equal(s.current, 1);
});

test("weekly streak counts weeks that met the target; an unmet current week does not break it", () => {
  // Target 3 per week. Weeks starting 2026-10-12, 10-19, 10-26 met; this week (11-02) has 1.
  const done = [
    "2026-10-12", "2026-10-14", "2026-10-16",
    "2026-10-19", "2026-10-20", "2026-10-21",
    "2026-10-26", "2026-10-28", "2026-11-01",
    "2026-11-02",
  ];
  assert.deepEqual(weeklyStreaks(done, 3, "2026-11-02"), { current: 3, best: 3 });
  // Once this week reaches 3 it counts.
  const more = [...done, "2026-11-03", "2026-11-04"];
  assert.deepEqual(weeklyStreaks(more, 3, "2026-11-04"), { current: 4, best: 4 });
  // A missed week in between resets the run.
  const gap = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-19", "2026-10-20", "2026-10-21"];
  assert.deepEqual(weeklyStreaks(gap, 3, "2026-10-28"), { current: 1, best: 1 });
});

test("habitStreaks picks the unit from the target", () => {
  assert.equal(habitStreaks(habit(), "2026-11-02").unit, "day");
  assert.equal(habitStreaks(habit({ target: { kind: "weekly", perWeek: 3 } }), "2026-11-02").unit, "week");
});

test("lastNDays returns oldest first and flags today and days before the habit started", () => {
  const days = lastNDays(habit({ createdOn: "2026-10-31", done: ["2026-11-01"] }), "2026-11-02", 7);
  assert.equal(days.length, 7);
  assert.equal(days[0].date, "2026-10-27");
  assert.equal(days[6].isToday, true);
  assert.equal(days[5].done, true);
  assert.equal(days.filter((d) => d.beforeStart).length, 4);
});

test("weekCompletion: daily uses only days the habit existed; weekly is done/target capped at 1", () => {
  const h = habit({ createdOn: "2026-10-31", done: ["2026-10-31", "2026-11-01"] });
  assert.equal(weekCompletion(h, "2026-11-02"), 2 / 3);
  const full = habit({ createdOn: "2026-01-01", done: ["2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"] });
  assert.equal(weekCompletion(full, "2026-11-02"), 1);
  const weekly = habit({ target: { kind: "weekly", perWeek: 3 }, done: ["2026-10-28", "2026-10-30", "2026-11-01", "2026-11-02"] });
  assert.equal(weekCompletion(weekly, "2026-11-02"), 1);
  assert.equal(weekCompletion(habit({ target: { kind: "weekly", perWeek: 4 }, done: ["2026-11-01"] }), "2026-11-02"), 0.25);
});

test("heatmapWeeks builds Monday-first columns ending in the current week, future cells empty", () => {
  const cols = heatmapWeeks("2026-11-04", 12, (d) => (d === "2026-11-03" ? 1 : 0));
  assert.equal(cols.length, 12);
  assert.ok(cols.every((c) => c.length === 7));
  assert.equal(cols[11][0].date, "2026-11-02");
  assert.equal(cols[0][0].date, "2026-08-17");
  assert.equal(cols[11][1].value, 1);
  assert.equal(cols[11][3].future, true);
  const sum = heatmapSummary(cols);
  assert.equal(sum.days, 11 * 7 + 3);
  assert.equal(sum.activeDays, 1);
});

test("heatLevel buckets ratios into 0..4", () => {
  assert.deepEqual([0, 0.2, 0.5, 0.8, 1].map(heatLevel), [0, 1, 2, 3, 4]);
  assert.equal(heatLevel(Number.NaN), 0);
});

test("dayTotals skips archived habits and habits created later (unless ticked)", () => {
  const habits = [
    habit({ id: "a", done: ["2026-11-01"] }),
    habit({ id: "b", createdOn: "2026-11-02" }),
    habit({ id: "c", archived: true, done: ["2026-11-01"] }),
  ];
  assert.deepEqual(dayTotals(habits, "2026-11-01"), { done: 1, total: 1 });
  assert.deepEqual(dayTotals(habits, "2026-11-02"), { done: 0, total: 2 });
});

test("21-day challenge: day number, done count, missed days, completion", () => {
  let h = startChallenge(habit(), "2026-11-01", "c1");
  assert.equal(h.challenges.length, 1);
  // Starting twice does nothing.
  assert.equal(startChallenge(h, "2026-11-02", "c2").challenges.length, 1);
  const ch = h.challenges[0];

  let p = challengeProgress(ch, [], "2026-11-01");
  assert.deepEqual([p.day, p.doneCount, p.missed, p.windowOver], [1, 0, 0, false]);

  p = challengeProgress(ch, ["2026-11-01", "2026-11-03"], "2026-11-04");
  assert.equal(p.day, 4);
  assert.equal(p.doneCount, 2);
  assert.equal(p.missed, 1); // 2 Nov missed; 4 Nov is still open

  const all = Array.from({ length: 21 }, (_, i) => addDays("2026-11-01", i));
  p = challengeProgress(ch, [...all, "2026-11-30"], "2026-11-30");
  assert.equal(p.day, 21);
  assert.equal(p.doneCount, 21);
  assert.equal(p.perfect, true);
  assert.equal(p.windowOver, true);
  assert.equal(p.ratio, 1);

  h = endChallenge(h, "completed", "2026-11-21");
  assert.equal(h.challenges[0].status, "completed");
  assert.equal(h.challenges[0].endedOn, "2026-11-21");
});

test("milestones", () => {
  assert.equal(milestone(7), 7);
  assert.equal(milestone(8), null);
});

test("overallWeekCompletion averages live habits and ignores archived ones", () => {
  const today = "2026-11-02";
  assert.equal(overallWeekCompletion([], today), null);
  assert.equal(overallWeekCompletion([habit({ archived: true })], today), null);
  const all = habit({ id: "a", done: [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(today, -i)) });
  const none = habit({ id: "b" });
  const gone = habit({ id: "c", archived: true, done: [today] });
  assert.equal(overallWeekCompletion([all, none, gone], today), 0.5);
  // A habit created today counts only today.
  const fresh = habit({ id: "d", createdOn: today, done: [today] });
  assert.equal(overallWeekCompletion([fresh], today), 1);
});

test("plural picks the singular only for exactly one", () => {
  assert.equal(plural(1, "habit"), "1 habit");
  assert.equal(plural(0, "habit"), "0 habits");
  assert.equal(plural(4, "habit"), "4 habits");
  assert.equal(plural(2, "check-in"), "2 check-ins");
  assert.equal(plural(3, "day", "days"), "3 days");
});
