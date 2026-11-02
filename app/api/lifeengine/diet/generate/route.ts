import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/utils/db";
import { GEMINI_LIGHT_MODEL, geminiApiKey } from "@/lib/ai/gemini";

const dietRequestSchema = z.object({
  profileId: z.string().min(1, "Profile ID is required"),
  preferences: z.object({
    dietaryRestrictions: z.array(z.string()),
    allergies: z.array(z.string()),
    cuisinePreferences: z.array(z.string()),
    mealFrequency: z.number().min(2).max(5),
    budget: z.enum(["budget", "moderate", "premium"]),
    additionalNotes: z.string().optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const apiKey = geminiApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { profileId, preferences } = dietRequestSchema.parse(body);

    // The signed-in account's own profile (db is scoped to the session).
    const row = await db.getProfile(profileId);
    if (!row) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    const goals = (row.goals?.length ? row.goals : [row.lifestyle?.primaryGoal, ...(row.lifestyle?.secondaryGoals ?? [])])
      .filter((g): g is string => typeof g === "string" && g.length > 0);
    const profile = {
      id: row.id,
      name: row.name ?? "User",
      age: row.age ?? row.demographics?.age ?? 30,
      gender: row.gender ?? row.demographics?.sex ?? "other",
      goals: goals.length ? goals : ["general wellness"],
      healthConcerns: row.healthConcerns || row.health?.notes || "none",
      experience: row.experience ?? row.preferences?.level ?? "beginner",
    };

    // Build diet generation prompt
    const prompt = `
Generate a personalized diet plan for the following profile:

Profile Information:
- Age: ${profile.age}
- Gender: ${profile.gender}
- Goals: ${profile.goals.join(", ")}
- Experience Level: ${profile.experience}
- Health Concerns: ${profile.healthConcerns}

Dietary Preferences:
- Restrictions: ${preferences.dietaryRestrictions.join(", ") || "None"}
- Allergies: ${preferences.allergies.join(", ") || "None"}
- Cuisine Preferences: ${preferences.cuisinePreferences.join(", ") || "No preference"}
- Meals per day: ${preferences.mealFrequency}
- Budget level: ${preferences.budget}
${preferences.additionalNotes ? `- Additional Notes: ${preferences.additionalNotes}` : ""}

Please generate a comprehensive diet plan that includes:
1. Daily calorie target
2. Macronutrient breakdown (protein, carbs, fats in grams)
3. Sample daily meal plan with ${preferences.mealFrequency} meals
4. Shopping list for 7 days

Format the response as a JSON object with this exact structure:
{
  "dailyCalories": number,
  "macronutrients": {
    "protein": number,
    "carbs": number,
    "fats": number
  },
  "mealPlan": {
    "breakfast": ["item1", "item2"],
    "lunch": ["item1", "item2"],
    "dinner": ["item1", "item2"],
    "snacks": ["item1", "item2"] // only if mealFrequency > 3
  },
  "shoppingList": ["item1", "item2", "item3", ...]
}

Ensure the plan is realistic, nutritionally balanced, and considers all restrictions and preferences.`;

    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: GEMINI_LIGHT_MODEL,
      generationConfig: {
        maxOutputTokens: 3072, // Reduced for cost optimization
        temperature: 0.7,
      }
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse the JSON response
    let generatedPlan;
    try {
      // Clean up the response text to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      generatedPlan = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Failed to parse AI response:", text);
      return NextResponse.json(
        { error: "Failed to generate valid diet plan" },
        { status: 500 }
      );
    }

    // Create diet plan object
    const dietPlan = {
      id: uuidv4(),
      profileId,
      goals: profile.goals,
      preferences,
      generatedPlan,
      createdAt: new Date().toISOString(),
    };

    // Kept by the browser and synced to the account (lib/diet/store.ts).
    return NextResponse.json({
      plan: dietPlan,
      success: true,
    });

  } catch (error) {
    console.error("Diet generation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
