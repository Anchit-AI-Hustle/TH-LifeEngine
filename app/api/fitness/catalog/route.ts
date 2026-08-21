import { NextResponse } from "next/server";

import { ACTIVITIES, BUCKET_LABELS, CATEGORY_LABELS, EQUIPMENT_LABELS } from "@/lib/fitness/activities";
import { CONDITION_FAMILY_LABELS, CONDITION_LIST, MEDICATION_LIST } from "@/lib/fitness/conditions";
import { GOAL_FAMILY_LABELS, GOAL_LIST } from "@/lib/fitness/goals";
import { SCREEN_QUESTIONS } from "@/lib/fitness/screening";

/**
 * GET /api/fitness/catalog
 *
 * Everything the intake form needs in one call: goals, conditions,
 * medications, screening questions and activity metadata.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    goals: GOAL_LIST.map((goal) => ({
      id: goal.id,
      label: goal.label,
      purpose: goal.purpose,
      family: goal.family,
      familyLabel: GOAL_FAMILY_LABELS[goal.family],
      expectedTimeline: goal.expectedTimeline,
    })),
    conditions: CONDITION_LIST.map((condition) => ({
      id: condition.id,
      label: condition.label,
      family: condition.family,
      familyLabel: CONDITION_FAMILY_LABELS[condition.family],
      clearanceRequired: condition.clearanceRequired,
      note: condition.note,
    })),
    medications: MEDICATION_LIST.map((med) => ({
      id: med.id,
      label: med.label,
      examples: med.examples,
      invalidatesHeartRateZones: med.invalidatesHeartRateZones,
    })),
    screeningQuestions: SCREEN_QUESTIONS,
    activityCategories: Object.entries(CATEGORY_LABELS).map(([id, label]) => ({
      id,
      label,
      count: ACTIVITIES.filter((a) => a.category === id).length,
      indoor: ACTIVITIES.filter((a) => a.category === id && a.environments.includes("indoor")).length,
      outdoor: ACTIVITIES.filter((a) => a.category === id && a.environments.includes("outdoor")).length,
    })),
    buckets: BUCKET_LABELS,
    equipment: EQUIPMENT_LABELS,
    activityCount: ACTIVITIES.length,
  });
}
