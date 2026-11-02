import { NextResponse } from "next/server";
import { db } from "@/lib/utils/db";
import { currentUserId } from "@/lib/auth";

declare global {
  var TH_PLANS: Map<string, any> | undefined;
}

const MEMORY_PLAN_CACHE = globalThis.TH_PLANS ?? (globalThis.TH_PLANS = new Map<string, any>());

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get("profileId");

    const dbPlans =
      profileId && profileId !== "all"
        ? await db.listPlans(profileId)
        : await db.listAllPlans();

    const seen = new Set<string>();
    const formattedPlans = dbPlans.map((plan) => {
      seen.add(plan.planId);
      return {
        id: plan.planId,
        profileId: plan.profileId,
        planName: plan.planName || `Plan for User`,
        inputSummary: plan.inputSummary || "No details",
        intakeId: plan.planJSON.intakeId,
        goals: Array.isArray(plan.planJSON.goals) ? plan.planJSON.goals : [],
        dayCount: plan.planJSON.days?.length ?? plan.days ?? 0,
        createdAt: plan.createdAt ?? plan.planJSON.createdAt,
        source: plan.source || "gemini",
      };
    });

    const uid = await currentUserId();
    for (const cached of MEMORY_PLAN_CACHE.values()) {
      if (!cached?.planId || seen.has(cached.planId)) continue;
      if (!uid || cached.ownerId !== uid) continue;
      if (profileId && profileId !== "all" && cached.profileId !== profileId) continue;
      seen.add(cached.planId);
      formattedPlans.push({
        id: cached.planId,
        profileId: cached.profileId,
        planName: cached.planName || cached.plan?.meta?.title || "Plan (Memory)",
        inputSummary: cached.inputSummary || "Cached plan awaiting persistence",
        intakeId: cached.plan?.intakeId || cached.plan?.profileId || cached.profileId,
        goals: cached.plan?.goals || [],
        dayCount: cached.plan?.days?.length || cached.plan?.weekly_schedule?.length || 0,
        createdAt: cached.createdAt || new Date().toISOString(),
        source: cached.source || "rule-engine",
      });
    }

    formattedPlans.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    return NextResponse.json({ plans: formattedPlans });
  } catch (error) {
    console.error("Error listing plans:", error);
    return NextResponse.json({ error: "Failed to list plans" }, { status: 500 });
  }
}
