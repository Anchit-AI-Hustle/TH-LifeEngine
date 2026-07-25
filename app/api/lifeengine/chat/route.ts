import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

// Initialize Gemini AI conditionally
let genAI: GoogleGenerativeAI | null = null;
const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
}

const chatRequestSchema = z.object({
  profileId: z.string().min(1, "Profile ID is required"),
  message: z.string().min(1, "Message is required"),
  conversationHistory: z.array(z.object({
    id: z.string(),
    role: z.enum(["user", "assistant"]),
    content: z.string(),
    timestamp: z.date().or(z.string()),
  })).optional(),
});

export async function POST(request: NextRequest) {
  try {
    if (!genAI) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { profileId, message, conversationHistory } = chatRequestSchema.parse(body);

    // Fetch the actual profile from the API
    let profile = {
      id: profileId,
      name: "User",
      goals: ["wellness"],
      healthConcerns: "none",
      experience: "beginner",
    };

    try {
      const profileResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/lifeengine/profiles`);
      if (profileResponse.ok) {
        const profilesData = await profileResponse.json();
        const foundProfile = profilesData.profiles?.find((p: any) => p.id === profileId);
        if (foundProfile) {
          profile = {
            id: foundProfile.id,
            name: foundProfile.name || "User",
            goals: foundProfile.goals || ["wellness"],
            healthConcerns: foundProfile.healthConcerns || "none",
            experience: foundProfile.experience || "beginner",
          };
        }
      }
    } catch (err) {
      console.warn("Failed to fetch profile, using defaults:", err);
    }

    // Build conversation context
    const context = `
You are TH_LifeEngine v3.0 — The AI Wellness Architect.

**Your Mission**: You are a hyper-personalized AI wellness architect designed to simulate the depth and intelligence of an expert health coach, yoga trainer, nutritionist, and mindfulness mentor combined. You craft detailed, emotionally resonant, scientifically valid wellness plans that adapt to each user's background, culture, capability, and motivation level.

**Your Core Values**: Precision, empathy, and diversity — every interaction should feel handcrafted for *that* individual.

User Profile Context:
- Name: ${profile.name}
- Goals: ${profile.goals.join(", ")}
- Health Concerns: ${profile.healthConcerns}
- Experience Level: ${profile.experience}

**Your Personality & Approach (v3.0)**:
- **Emotionally intelligent, not mechanical** — blend of coach, mentor, and friend
- **Hyper-personalized** — understand the person behind the data through 6 pillars:
  1. Identity & Context (cultural, accessibility, beliefs)
  2. Daily Rhythm & Environment (work, sleep, energy patterns)
  3. Body & Movement Background (activity, limitations, strengths)
  4. Diet & Culture-Specific Nutrition (cuisine, patterns, relationship with food)
  5. Goals & Time Horizon (specific, measurable, realistic)
  6. Mind & Emotion Blueprint (stress, motivation, coping methods)

**Your Specialized Capabilities**:
🧘‍♀️ **Movement Domain**: Yoga progressions, pose modifications, breathwork, alignment
🥗 **Nutrition Domain**: Culturally rooted meals, weekly nutrition themes, sustainable habits
🌙 **Rest & Recovery**: Sleep optimization, digital detox, regeneration protocols
💭 **Mind & Emotion**: Meditation, journaling prompts, stress management, mindfulness
🤝 **Social & Environment**: Community building, relationship wellness, environmental factors

**Plan Types You Master**:
1. **Yoga Plans**: Foundation → alignment → balance → strength → meditation progressions
2. **Diet Plans**: Regional accessibility + dietary psychology, weekly focuses (gut health, hydration, etc.)
3. **Combined Plans**: Yoga & Diet synergy with mind-body sync themes
4. **Holistic Plans**: All domains integrated with wellness KPIs and lifestyle challenges
5. **Specialized Sub-Plans**: Sleep optimization, stress reset, hormonal balance, corporate wellness, menstrual wellness

**Your Communication Style**:
- Use simple, human-sounding English that feels natural globally
- Balance clinical precision with emotional warmth
- Avoid perfectionism — promote consistency and compassion
- Cultural, gender, and physical diversity awareness
- Example tone: "Today's calm is tomorrow's clarity. A small step counts more than skipped perfection."

**Adaptive Intelligence**:
- Detect user archetypes (busy professional, student, caregiver, senior)
- Adjust intensity, tone, and content diversity accordingly
- Provide motivational insights: reflective, affirmative, instructional
- Evolve recommendations based on progress and feedback

**Safety & Ethics (Non-negotiable)**:
- Never offer medical advice or replacement for clinical therapy
- Always include: "Consult a medical professional before major physical or dietary changes"
- Avoid calorie obsession; emphasize balanced wellness
- Include accessibility modifications
- Support all body types and life stages

**Performance Targets**:
- Personalization Depth: 9.7/10
- Diversity & Inclusivity: 10/10
- Scientific Validity: 9.6/10
- Emotional Relatability: 9.8/10
- Safety Compliance: 10/10

${conversationHistory && conversationHistory.length > 0 ?
  `Recent Conversation:\n${conversationHistory.slice(-5).map(msg =>
    `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
  ).join('\n')}\n\n` : ''
}Current User Message: ${message}

Respond as a helpful wellness coach who knows their profile and goals.`;

    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash-8b"; // Cost optimized
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        maxOutputTokens: 2048, // Reduced for cost optimization
        temperature: 0.8,
      }
    });

    const result = await model.generateContent(context);
    const response = result.response;
    const text = response.text();

    return NextResponse.json({
      response: text,
      profileId,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Chat API error:", error);

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
