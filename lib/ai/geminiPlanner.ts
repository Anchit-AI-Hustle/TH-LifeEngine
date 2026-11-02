import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_LIGHT_MODEL, geminiApiKey } from './gemini';
import { PLANNER_PROMPT } from './prompts';
import type { Intake, Plan, Profile } from './schemas';

export async function generatePlan(profile: Profile, intake: Intake): Promise<Plan> {
  const apiKey = geminiApiKey();
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_LIGHT_MODEL,
    generationConfig: {
      maxOutputTokens: 4096, // Reduced for cost optimization
      temperature: 0.7,
    }
  });

  const prompt = PLANNER_PROMPT
    .replace('{age}', profile.age.toString())
    .replace('{gender}', profile.gender)
    .replace('{goals}', profile.goals.join(', '))
    .replace('{experience}', profile.experience)
    .replace('{healthConcerns}', profile.healthConcerns)
    .replace('{preferredTime}', profile.preferredTime)
    .replace('{primaryPlanType}', intake.primaryPlanType)
    .replace('{secondaryPlanType}', intake.secondaryPlanType || 'none')
    .replace('{startDate}', intake.startDate)
    .replace('{endDate}', intake.endDate);

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  try {
    const parsed = JSON.parse(text);
    return {
      id: `plan_${Date.now()}`,
      profileId: profile.id,
      intakeId: intake.profileId, // using profileId as intakeId for now
      days: parsed.days || [],
    };
  } catch (error) {
    throw new Error(`Failed to parse plan from Gemini response: ${text}`);
  }
}