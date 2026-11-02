import { NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { isAuthenticated } from '@/lib/auth';
import { GEMINI_LIGHT_MODEL, geminiApiKey } from "@/lib/ai/gemini";

type RequestPayload = {
  prompt: string;
  profileId: string;
  model?: string;
};

export async function POST(req: Request) {
  try {
    // 🔒 AUTHENTICATION CHECK
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      console.warn('[Auth] Unauthorized API access attempt:', {
        endpoint: '/api/lifeengine/custom-gpt-generate',
        timestamp: new Date().toISOString(),
      });
      
      return NextResponse.json(
        { error: 'Unauthorized. Please login to access this API.' },
        { status: 401 }
      );
    }

    const { prompt, profileId, model } = (await req.json()) as RequestPayload;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt is required and must be a string" }, { status: 400 });
    }

    if (!profileId) {
      return NextResponse.json({ error: "Profile ID is required" }, { status: 400 });
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    const googleKey = geminiApiKey();

    if (!openAiKey && !googleKey) {
      return NextResponse.json(
        { error: "No AI provider configured. Please set OPENAI_API_KEY or GOOGLE_API_KEY." },
        { status: 500 }
      );
    }

    if (openAiKey) {
      try {
        const data = await generateWithOpenAI({
          prompt,
          profileId,
          modelOverride: model,
          apiKey: openAiKey,
        });
        return NextResponse.json(data);
      } catch (error) {
        console.error("❌ [CustomGPT API] OpenAI call failed:", error);
        if (!googleKey) {
          throw error;
        }
        console.warn("⚠️ Falling back to Gemini due to OpenAI error.");
      }
    }

    if (googleKey) {
      const data = await generateWithGemini({
        prompt,
        profileId,
        modelOverride: model,
        apiKey: googleKey,
      });
      return NextResponse.json(data);
    }

    throw new Error("No AI provider available.");
  } catch (error: any) {
    console.error("❌ [CustomGPT API] Error:", error);

    return NextResponse.json(
      {
        error: "Failed to generate plan with AI",
        details: error?.message || "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

async function generateWithOpenAI({
  prompt,
  profileId,
  modelOverride,
  apiKey,
}: {
  prompt: string;
  profileId: string;
  modelOverride?: string;
  apiKey: string;
}) {
  const client = new OpenAI({ apiKey });
  
  // Use standard OpenAI models (gpt-4o, gpt-4o-mini, etc.)
  // NOT Custom GPT IDs (those start with 'g-')
  const model = modelOverride || process.env.NEXT_PUBLIC_LIFEENGINE_GPT_ID || "gpt-4o-mini";

  if (!model) {
    throw new Error("OpenAI model is not configured.");
  }

  // Validate that we're not trying to use a Custom GPT ID
  if (model.startsWith('g-')) {
    throw new Error(
      `Invalid model "${model}". Custom GPT IDs (g-xxxxx) cannot be used via API. ` +
      `Please use standard OpenAI models like "gpt-4o" or "gpt-4o-mini". ` +
      `Set NEXT_PUBLIC_LIFEENGINE_GPT_ID in your .env file.`
    );
  }

  console.log(`[OpenAI] Generating plan with model: ${model}`);

  // Use standard Chat Completions API
  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: "You are TH_LifeEngine, an expert wellness coach. Generate comprehensive, personalized wellness plans in valid JSON format with detailed step-by-step instructions for all exercises, yoga poses, and recipes."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 6000,
    response_format: { type: "json_object" }
  });

  const planText = response.choices[0]?.message?.content?.trim() || "";
  
  if (!planText) {
    throw new Error("OpenAI returned an empty response.");
  }

  // Log token usage for cost tracking
  const usage = response.usage;
  const inputTokens = usage?.prompt_tokens || 0;
  const outputTokens = usage?.completion_tokens || 0;
  const totalTokens = usage?.total_tokens || 0;

  // Calculate cost based on model pricing
  let inputCostPer1M = 0.15;  // gpt-4o-mini default
  let outputCostPer1M = 0.60;
  
  if (model.includes('gpt-4o') && !model.includes('mini')) {
    inputCostPer1M = 2.50;  // gpt-4o
    outputCostPer1M = 10.00;
  } else if (model.includes('gpt-3.5-turbo')) {
    inputCostPer1M = 0.50;  // gpt-3.5-turbo
    outputCostPer1M = 1.50;
  }

  const inputCost = (inputTokens / 1000000) * inputCostPer1M;
  const outputCost = (outputTokens / 1000000) * outputCostPer1M;
  const totalCost = inputCost + outputCost;

  console.log(`[COST TRACKING] Tokens - Input: ${inputTokens}, Output: ${outputTokens}, Total: ${totalTokens}`);
  console.log(`[COST TRACKING] Estimated cost: $${totalCost.toFixed(6)} (Input: $${inputCost.toFixed(6)}, Output: $${outputCost.toFixed(6)})`);

  return {
    plan: planText,
    formatted: true,
    metadata: {
      provider: "openai",
      model,
      profileId,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: totalTokens,
      },
      cost: {
        input_usd: inputCost,
        output_usd: outputCost,
        total_usd: totalCost,
      },
      usage: response.usage,
      generatedAt: new Date().toISOString(),
    },
  };
}

async function generateWithGemini({
  prompt,
  profileId,
  modelOverride,
  apiKey,
}: {
  prompt: string;
  profileId: string;
  modelOverride?: string;
  apiKey: string;
}) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = modelOverride || GEMINI_LIGHT_MODEL;
  const geminiModel = genAI.getGenerativeModel({ model });

  // ULTRA COST OPTIMIZATION for hobby project
  const maxTokens = parseInt(process.env.MAX_OUTPUT_TOKENS || "3000");
  
  const generationConfig = {
    temperature: 0.5, // Reduced from 0.7 for more focused output
    topP: 0.8,         // Reduced from 0.95 for less randomness
    topK: 20,          // Reduced from 40 to limit token exploration
    maxOutputTokens: maxTokens, // Configurable limit (default 3000)
  };

  console.log(`[COST CONTROL] Using model: ${model}, max tokens: ${maxTokens}`);

  const result = await geminiModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig,
  });

  const response = result.response;
  const text = response.text().trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  const cleanedText = stripCodeFences(text);

  // Log token usage for cost tracking
  const usageMetadata = (response as any).usageMetadata || {};
  const inputTokens = usageMetadata.promptTokenCount || 0;
  const outputTokens = usageMetadata.candidatesTokenCount || 0;
  const totalTokens = usageMetadata.totalTokenCount || 0;
  
  // Calculate approximate cost (gemini-1.5-flash-8b pricing)
  const inputCost = (inputTokens / 1000000) * 0.0375;
  const outputCost = (outputTokens / 1000000) * 0.15;
  const totalCost = inputCost + outputCost;

  console.log(`[COST TRACKING] Tokens - Input: ${inputTokens}, Output: ${outputTokens}, Total: ${totalTokens}`);
  console.log(`[COST TRACKING] Estimated cost: $${totalCost.toFixed(6)} (Input: $${inputCost.toFixed(6)}, Output: $${outputCost.toFixed(6)})`);

  return {
    plan: cleanedText,
    formatted: true,
    metadata: {
      provider: "google-gemini",
      model,
      profileId,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: totalTokens,
      },
      cost: {
        input_usd: inputCost,
        output_usd: outputCost,
        total_usd: totalCost,
      },
      generatedAt: new Date().toISOString(),
    },
  };
}

function extractResponseText(response: any): string {
  if (response?.output_text) {
    return response.output_text;
  }

  if (response?.output?.length) {
    return response.output
      .map((item: any) =>
        item.content
          ?.map((part: any) => {
            if (part?.text?.value) return part.text.value;
            if (typeof part?.text === "string") return part.text;
            return "";
          })
          .join("\n"),
      )
      .join("\n");
  }

  if (response?.content?.length) {
    return response.content
      .map((item: any) => item.text ?? item?.content?.map((part: any) => part?.text).join("\n"))
      .join("\n");
  }

  return "";
}

function stripCodeFences(value: string) {
  const match = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (match?.[1]) {
    return match[1].trim();
  }
  return value;
}
