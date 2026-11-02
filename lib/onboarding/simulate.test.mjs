// node --experimental-strip-types --test lib/onboarding/simulate.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  rng, dateKey, clock, themesFor, habitTemplatesFor, planTypesFor, fitnessGoalsFor,
  habitDoneDays, sleepNights, trackerDays,
} from "./simulate.ts";

const NOW = new Date(2026, 10, 2, 10, 0); // 2 Nov 2026
const asha = { id: "p1", name: "Asha", age: 34, gender: "female", goals: ["PCOS management", "Weight loss"], healthConcerns: "mild knee pain" };
const ravi = { id: "p2", name: "Ravi", age: 41, gender: "male", goals: ["Reduce stress", "Better sleep"] };

test("rng is deterministic per seed and in [0,1)", () => {
  const a = rng("x"), b = rng("x"), c = rng("y");
  const xs = [a(), a(), a()];
  assert.deepEqual(xs, [b(), b(), b()]);
  assert.notDeepEqual(xs, [c(), c(), c()]);
  for (const v of xs) assert.ok(v >= 0 && v < 1);
});

test("dateKey and clock", () => {
  assert.equal(dateKey(0, NOW), "2026-11-02");
  assert.equal(dateKey(2, NOW), "2026-10-31");
  assert.equal(clock(23 * 60 + 5), "23:05");
  assert.equal(clock(24 * 60 + 30), "00:30");
  assert.equal(clock(-30), "23:30");
});

test("themes and picks follow the profile", () => {
  assert.deepEqual(themesFor(asha).sort(), ["joints", "pcos", "weight"]);
  assert.ok(habitTemplatesFor(asha).includes("walk-after-meals"));
  assert.ok(habitTemplatesFor(asha).length <= 4 && habitTemplatesFor(asha)[0] === "water");
  assert.ok(planTypesFor(asha).includes("weight_loss"));
  assert.ok(fitnessGoalsFor(asha).includes("pcos_hormonal"));
  assert.ok(habitTemplatesFor(ravi).includes("sleep-by-11"));
  assert.ok(fitnessGoalsFor(ravi).includes("stress_calm"));
  assert.deepEqual(themesFor({ id: "z", name: "Z", age: 30, gender: "other", goals: [] }), ["general"]);
});

test("habit history: past days only, plausible adherence, deterministic", () => {
  const days = habitDoneDays("p1:water", 14, 0.68, NOW);
  assert.deepEqual(days, habitDoneDays("p1:water", 14, 0.68, NOW));
  assert.ok(!days.includes(dateKey(0, NOW)), "today stays open to tick");
  assert.ok(days.length >= 6 && days.length <= 13, `got ${days.length}`);
  assert.deepEqual([...days].sort(), days);
});

test("sleep nights: 14 valid nights ending last night", () => {
  const n = sleepNights("p1", 14, NOW);
  assert.equal(n.length, 14);
  assert.equal(n.at(-1).night, dateKey(1, NOW));
  for (const x of n) {
    assert.match(x.bedtime, /^\d\d:\d\d$/);
    assert.match(x.wake, /^\d\d:\d\d$/);
    assert.ok(x.quality >= 1 && x.quality <= 5);
    const [bh, bm] = x.bedtime.split(":").map(Number), [wh, wm] = x.wake.split(":").map(Number);
    const dur = ((wh * 60 + wm) - (bh * 60 + bm) + 1440) % 1440;
    assert.ok(dur >= 300 && dur <= 540, `duration ${dur}`);
  }
});

test("tracker week: one rest day, weights only on some days", () => {
  const d = trackerDays("p1", 68, 7, NOW);
  assert.equal(d.length, 7);
  assert.equal(d.filter((x) => x.adherence === "rest").length, 1);
  assert.ok(d.some((x) => x.weightKg) && d.some((x) => x.weightKg === undefined));
  for (const x of d) assert.ok(x.mood >= 1 && x.mood <= 5 && x.steps > 3000);
});
