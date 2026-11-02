import { NextResponse } from "next/server";
import type { LifeEnginePlan, PlanPostResponse } from "@/app/types/lifeengine";
import { currentUserId } from "@/lib/auth";

// Global in-memory store for plans (replace with DB in production)
declare global {
  var __PLANS__: { plan_id: string; plan: LifeEnginePlan; ownerId?: string | null }[] | undefined;
}

const store =
  globalThis.__PLANS__ ?? (globalThis.__PLANS__ = []);

function generatePlanId(): string {
  return (
    "plan_" +
    Math.random().toString(36).slice(2) +
    Date.now().toString(36)
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate required fields
    if (
      !body?.summary ||
      !body?.weekly_schedule ||
      !body?.metadata ||
      !body?.recovery_tips ||
      !body?.hydration_goals
    ) {
      return NextResponse.json(
        { error: "Invalid payload - missing required fields" },
        { status: 400 }
      );
    }

    // Validate metadata
    if (
      !body.metadata.generated_by ||
      !body.metadata.plan_type ||
      !body.metadata.language ||
      !body.metadata.timestamp
    ) {
      return NextResponse.json(
        { error: "Invalid metadata - missing required fields" },
        { status: 400 }
      );
    }

    const plan: LifeEnginePlan = body;
    const plan_id = generatePlanId();

    // Store the plan, tagged with its account: this store is shared by everyone on this server.
    store.push({ plan_id, plan, ownerId: await currentUserId() });

    const response: PlanPostResponse = {
      ok: true,
      plan_id,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error storing plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
