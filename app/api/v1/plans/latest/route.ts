import { NextResponse } from "next/server";
import type { LifeEnginePlan } from "@/app/types/lifeengine";
import { currentUserId } from "@/lib/auth";

type StoredPlanItem = { plan_id: string; plan: LifeEnginePlan; ownerId?: string | null };

// Access the global stores
declare global {
  var __PLANS__: StoredPlanItem[] | undefined;
  var TH_PLANS: Map<string, any> | undefined;
}

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const profile_id = url.searchParams.get("profile_id");

    if (!profile_id) {
      return NextResponse.json(
        { error: "profile_id query parameter is required" },
        { status: 400 }
      );
    }

    // Both stores are shared by every account on this server: only the caller's plans count.
    const uid = await currentUserId();
    if (!uid) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    // Check both storage systems
    const v1Store: StoredPlanItem[] = globalThis.__PLANS__ ?? [];
    const thPlansMap: Map<string, any> = globalThis.TH_PLANS ?? new Map();

    // Collect all matching plans from both stores
    const allMatchingPlans: any[] = [];

    // From v1 store (__PLANS__)
    const v1Matches = v1Store.filter(
      (item) => item.ownerId === uid && item.plan?.metadata?.profile_id === profile_id
    );
    allMatchingPlans.push(...v1Matches.map((item) => ({
      plan: item.plan,
      timestamp: item.plan?.metadata?.timestamp || 0,
      source: 'v1'
    })));

    // From TH_PLANS Map
    for (const [planId, planData] of thPlansMap.entries()) {
      if (planData.ownerId === uid && planData.profileId === profile_id) {
        allMatchingPlans.push({
          plan: planData.plan,
          timestamp: new Date(planData.createdAt).getTime(),
          source: 'th_plans',
          planId
        });
      }
    }

    if (allMatchingPlans.length === 0) {
      return NextResponse.json(
        { error: `No plans found for profile_id: ${profile_id}. Try generating a plan first.` },
        { status: 404 }
      );
    }

    // Sort by timestamp and return the most recent
    allMatchingPlans.sort((a, b) => b.timestamp - a.timestamp);
    const latestPlan = allMatchingPlans[0].plan;

    console.log(`[Latest Plan] Found ${allMatchingPlans.length} plans for ${profile_id}, returning most recent from ${allMatchingPlans[0].source}`);

    return NextResponse.json(latestPlan);
  } catch (error) {
    console.error("Error fetching latest plan:", error);
    return NextResponse.json(
      { error: "Internal server error: " + (error as Error).message },
      { status: 500 }
    );
  }
}
