import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/utils/db";
import { currentUserId } from "@/lib/auth";

declare global {
  // Reuse the in-memory plan cache populated by the generation route when persistence fails
  var TH_PLANS: Map<string, any> | undefined;
}

const MEMORY_PLAN_CACHE = globalThis.TH_PLANS ?? (globalThis.TH_PLANS = new Map<string, any>());

const QuerySchema = z.object({
  planId: z.string().min(1),
});

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get("planId");
    const { planId: parsedPlanId } = QuerySchema.parse({ planId });
    const planRow = await db.getPlan(parsedPlanId);
    if (!planRow) {
      const memoryPlan = MEMORY_PLAN_CACHE.get(parsedPlanId);
      const uid = await currentUserId();
      if (memoryPlan && uid && memoryPlan.ownerId === uid) {
        return NextResponse.json({
          plan: memoryPlan.plan,
          planName: memoryPlan.planName,
          source: memoryPlan.source,
          warnings: memoryPlan.warnings,
          analytics: memoryPlan.analytics,
          costMetrics: memoryPlan.costMetrics,
        });
      }
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    
    // Check if this is a Gemini/rule-based plan (has planJSON with days array)
    // If so, return the planJSON content directly for compatibility
    if (planRow.planJSON && planRow.planJSON.days && !(planRow.planJSON as any).weekly_schedule) {
      return NextResponse.json({ 
        plan: planRow.planJSON,
        planName: planRow.planName,
        source: planRow.source,
        warnings: planRow.warnings,
        analytics: planRow.analytics,
        costMetrics: planRow.costMetrics,
      });
    }
    
    // Otherwise return the full plan object (custom GPT format)
    return NextResponse.json({ plan: planRow });
  } catch (error: any) {
    console.error("plan:detail error", error);
    return NextResponse.json({ error: error.message ?? "Failed to load plan" }, { status: 400 });
  }
}
