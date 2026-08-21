import { NextResponse } from "next/server";

import { buildFitnessPlan } from "@/lib/fitness/engine";
import { buildSafetyReport, emptyScreen } from "@/lib/fitness/screening";
import { createBlankProfile } from "@/lib/fitness/samples";
import type { FitnessProfile } from "@/lib/fitness/types";

/**
 * POST /api/fitness/plan/generate
 *
 * Body: { profile: FitnessProfile, weeks?: number }
 *
 * Runs the deterministic rule engine — no model call — so the same profile
 * always returns the same plan. Missing optional fields are backfilled from a
 * blank profile so partial intakes still produce something usable.
 */
export async function POST(request: Request) {
  let body: { profile?: Partial<FitnessProfile>; weeks?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.profile) {
    return NextResponse.json({ ok: false, error: "A `profile` object is required" }, { status: 400 });
  }

  const profile: FitnessProfile = {
    ...createBlankProfile(body.profile.id),
    ...body.profile,
    screen: { ...emptyScreen(), ...(body.profile.screen ?? {}) },
    conditions: body.profile.conditions ?? [],
    medications: body.profile.medications ?? [],
    painPoints: body.profile.painPoints ?? [],
    injuries: body.profile.injuries ?? [],
    goals: body.profile.goals?.length ? body.profile.goals : [body.profile.primaryGoal ?? "maintain_weight"],
  } as FitnessProfile;

  if (!profile.age || profile.age < 5 || profile.age > 110) {
    return NextResponse.json({ ok: false, error: "`age` must be between 5 and 110" }, { status: 400 });
  }
  if (!profile.heightCm || !profile.weightKg) {
    return NextResponse.json({ ok: false, error: "`heightCm` and `weightKg` are required" }, { status: 400 });
  }

  try {
    const safety = buildSafetyReport(profile);
    const plan = buildFitnessPlan(profile, { weeks: body.weeks });
    return NextResponse.json({ ok: true, plan, safety });
  } catch (error) {
    console.error("Fitness plan generation failed:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Plan generation failed" },
      { status: 500 },
    );
  }
}

/** GET returns the shape the POST endpoint expects, for quick discovery. */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/fitness/plan/generate",
    method: "POST",
    body: { profile: "FitnessProfile", weeks: "1-12 (default 4)" },
    notes: "Deterministic rule engine. No AI credits are consumed and it works offline.",
  });
}
