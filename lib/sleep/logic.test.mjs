// Unit tests for lib/sleep/logic.ts.
// Run: node --experimental-strip-types --test lib/sleep/logic.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bedtimeAxis,
  checkEntry,
  computeInsights,
  consistencyLabel,
  defaultNight,
  durationMinutes,
  formatClock,
  formatDuration,
  lastNightEntry,
  stdDev,
  tagEffects,
  upsertEntry,
  windowNights,
} from "./logic.ts";

let n = 0;
const entry = (night, bedtime, wake, quality = 4, tags = []) => ({
  id: `e${(n += 1)}`,
  night,
  bedtime,
  wake,
  quality,
  tags,
  notes: "",
  updatedAt: "2026-11-02T00:00:00.000Z",
});

test("duration wraps past midnight", () => {
  assert.equal(durationMinutes("23:00", "07:00"), 480);
  assert.equal(durationMinutes("00:30", "06:45"), 375);
  assert.equal(durationMinutes("22:15", "22:45"), 30);
  assert.equal(durationMinutes("07:00", "07:00"), 0);
  assert.equal(durationMinutes("13:00", "15:30"), 150);
});

test("bedtime axis keeps 11 pm and 1 am two hours apart", () => {
  assert.equal(bedtimeAxis("01:00") - bedtimeAxis("23:00"), 120);
  assert.equal(bedtimeAxis("22:00"), 1320);
});

test("formatting", () => {
  assert.equal(formatDuration(465), "7h 45m");
  assert.equal(formatDuration(480), "8h");
  assert.equal(formatDuration(45), "45m");
  assert.equal(formatDuration(-100), "1h 40m");
  assert.equal(formatClock(1410), "11:30 pm");
  assert.equal(formatClock(1440 + 50), "12:50 am");
  assert.equal(formatClock(720), "12:00 pm");
  assert.equal(formatClock(5), "12:05 am");
});

test("stdDev and consistency bands", () => {
  assert.equal(stdDev([10]), 0);
  assert.equal(stdDev([2, 4, 4, 4, 5, 5, 7, 9]), 2);
  assert.equal(consistencyLabel(20, 5), "steady");
  assert.equal(consistencyLabel(50, 5), "fair");
  assert.equal(consistencyLabel(90, 5), "irregular");
  assert.equal(consistencyLabel(10, 2), "unknown");
});

test("checkEntry validates times and dates", () => {
  const today = "2026-11-02";
  assert.equal(checkEntry({ night: "2026-11-03", bedtime: "23:00", wake: "07:00" }, today).error, "That night has not happened yet.");
  assert.match(checkEntry({ night: today, bedtime: "07:00", wake: "07:00" }, today).error, /cannot be the same/);
  assert.match(checkEntry({ night: today, bedtime: "06:00", wake: "23:30" }, today).error, /Check am and pm/);
  const short = checkEntry({ night: today, bedtime: "03:00", wake: "05:00" }, today);
  assert.equal(short.error, null);
  assert.ok(short.warning);
  const ok = checkEntry({ night: "2026-11-01", bedtime: "23:20", wake: "06:50" }, today);
  assert.deepEqual(ok, { error: null, warning: null, minutes: 450 });
});

test("defaultNight: last night before 6 pm, tonight after", () => {
  assert.equal(defaultNight(new Date(2026, 10, 2, 7, 30)), "2026-11-01");
  assert.equal(defaultNight(new Date(2026, 10, 2, 22, 0)), "2026-11-02");
});

test("windowNights ends last night, or tonight if tonight is logged", () => {
  assert.deepEqual(windowNights([], "2026-11-02", 3), ["2026-10-30", "2026-10-31", "2026-11-01"]);
  assert.deepEqual(windowNights([{ night: "2026-11-02" }], "2026-11-02", 2), ["2026-11-01", "2026-11-02"]);
});

test("insights: averages, debt against goal, bedtime spread", () => {
  const entries = [
    entry("2026-10-26", "23:00", "06:00", 3), // 7h
    entry("2026-10-27", "23:30", "06:30", 3), // 7h
    entry("2026-10-28", "22:30", "06:30", 4), // 8h
    entry("2026-10-29", "23:00", "07:00", 5), // 8h
    entry("2026-10-20", "21:00", "09:00", 5), // outside the window
  ];
  const s = computeInsights(entries, { today: "2026-11-02", days: 7, goalMinutes: 480 });
  assert.equal(s.nights, 4);
  assert.equal(s.avgMinutes, 450);
  assert.equal(s.avgQuality, 3.75);
  assert.equal(s.debtMinutes, 120);
  assert.equal(s.shortNights, 2);
  assert.equal(formatClock(s.avgBedtime), "11:00 pm");
  assert.equal(Math.round(s.bedtimeSpread), 21); // 0, +30, -30, 0 minutes from the mean
  assert.equal(s.consistency, "steady");
  assert.ok(s.tips.some((t) => t.id === "short"));
});

test("insights: extra sleep offsets debt but never below zero", () => {
  const entries = [entry("2026-10-30", "22:00", "08:00"), entry("2026-10-31", "23:00", "06:00")];
  const s = computeInsights(entries, { today: "2026-11-02", days: 7, goalMinutes: 480 });
  assert.equal(s.debtMinutes, 0);
});

test("tips: too few nights asks for more data", () => {
  const s = computeInsights([entry("2026-11-01", "23:00", "07:00")], { today: "2026-11-02", days: 7, goalMinutes: 480 });
  assert.equal(s.tips.length, 1);
  assert.equal(s.tips[0].id, "more-data");
  assert.match(s.tips[0].text, /Log 2 more nights/);
});

test("tips: irregular bedtime is reported in hours and minutes", () => {
  const entries = [
    entry("2026-10-26", "21:30", "05:30"),
    entry("2026-10-27", "01:30", "09:30"),
    entry("2026-10-28", "21:30", "05:30"),
    entry("2026-10-29", "01:30", "09:30"),
  ];
  const s = computeInsights(entries, { today: "2026-11-02", days: 7, goalMinutes: 480 });
  const tip = s.tips.find((t) => t.id === "irregular");
  assert.ok(tip);
  assert.match(tip.text, /varies by about 2h/);
  assert.equal(s.consistency, "irregular");
});

test("tips: weekend shift, tag effects and a positive workout note", () => {
  const entries = [
    entry("2026-10-25", "22:30", "06:30", 4, ["workout"]), // Sun
    entry("2026-10-26", "22:30", "06:30", 4, ["workout"]), // Mon
    entry("2026-10-27", "22:45", "05:30", 2, ["caffeine"]), // Tue
    entry("2026-10-28", "22:45", "05:30", 2, ["caffeine"]), // Wed
    entry("2026-10-30", "00:30", "08:30", 4), // Fri night (after midnight)
    entry("2026-10-31", "00:30", "08:30", 4), // Sat night
  ];
  const effects = tagEffects(entries);
  const caffeine = effects.find((e) => e.tag === "caffeine");
  assert.ok(caffeine.qualityDiff <= -1.5);
  const s = computeInsights(entries, { today: "2026-11-02", days: 7, goalMinutes: 480 });
  const ids = s.tips.map((t) => t.id);
  assert.ok(ids.includes("weekend"), ids.join(","));
  assert.ok(ids.includes("tag-caffeine"), ids.join(","));
  assert.ok(s.tips.find((t) => t.id === "tag-caffeine").text.includes("before 2 pm"));
  assert.ok(s.tips.length <= 4);
});

test("tips: steady sleeper gets a positive note", () => {
  const entries = ["2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"].map((d) => entry(d, "22:45", "06:45", 4));
  const s = computeInsights(entries, { today: "2026-11-02", days: 7, goalMinutes: 480 });
  assert.deepEqual(s.tips.map((t) => t.id), ["steady"]);
  assert.equal(s.consistency, "steady");
});

test("upsertEntry keeps one entry per night, newest first", () => {
  const a = entry("2026-10-30", "23:00", "07:00");
  const b = entry("2026-10-31", "23:00", "07:00");
  const replace = { ...entry("2026-10-30", "22:00", "06:00"), id: "new" };
  const list = upsertEntry([a, b], replace);
  assert.deepEqual(list.map((e) => e.id), [b.id, "new"]);
  const edited = upsertEntry(list, { ...b, night: "2026-11-01" });
  assert.deepEqual(edited.map((e) => e.night), ["2026-11-01", "2026-10-30"]);
});

test("lastNightEntry finds the evening before today, across month ends", () => {
  const list = [entry("2026-10-31", "23:00", "07:00"), entry("2026-10-30", "22:30", "06:30")];
  assert.equal(lastNightEntry(list, "2026-11-01")?.night, "2026-10-31");
  assert.equal(lastNightEntry(list, "2026-11-02"), undefined);
  assert.equal(lastNightEntry([], "2026-11-02"), undefined);
  // Tonight's entry is not last night.
  assert.equal(lastNightEntry([entry("2026-11-02", "23:00", "07:00")], "2026-11-02"), undefined);
});
