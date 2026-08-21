import { NextResponse } from "next/server";

import { ACTIVITIES, CATEGORY_LABELS } from "@/lib/fitness/activities";
import type { ActivityCategory, Environment } from "@/lib/fitness/types";

/**
 * GET /api/fitness/activities
 *
 * Filters: ?category=yoga&environment=outdoor&goal=joint_pain&equipment=none
 *          &maxImpact=low&maxMinutes=30&q=walk
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const category = params.get("category") as ActivityCategory | null;
  const environment = params.get("environment") as Environment | null;
  const goal = params.get("goal");
  const equipment = params.get("equipment");
  const maxImpact = params.get("maxImpact");
  const maxMinutes = params.get("maxMinutes");
  const query = params.get("q")?.toLowerCase();

  const impactOrder = ["none", "low", "moderate", "high"];

  const results = ACTIVITIES.filter((activity) => {
    if (category && activity.category !== category) return false;
    if (environment && !activity.environments.includes(environment)) return false;
    if (goal && !activity.goodFor.includes(goal as never)) return false;
    if (equipment && !activity.equipment.includes(equipment as never)) return false;
    if (maxImpact && impactOrder.indexOf(activity.impact) > impactOrder.indexOf(maxImpact)) return false;
    if (maxMinutes && activity.minMinutes > Number(maxMinutes)) return false;
    if (query && !`${activity.name} ${activity.category} ${activity.benefit}`.toLowerCase().includes(query)) return false;
    return true;
  });

  return NextResponse.json({
    ok: true,
    count: results.length,
    total: ACTIVITIES.length,
    categories: Object.entries(CATEGORY_LABELS).map(([id, label]) => ({
      id,
      label,
      count: ACTIVITIES.filter((a) => a.category === id).length,
    })),
    activities: results,
  });
}
