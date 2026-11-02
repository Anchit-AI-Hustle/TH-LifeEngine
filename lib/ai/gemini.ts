// One place for the Gemini key and the default model of the lighter AI
// features (diet, chat, Custom GPT plans). The main plan generator picks its
// own models (app/api/lifeengine/generate/route.ts).
//
// gemini-1.5-flash-8b, the old default, is no longer served by Google, so
// every call that relied on it failed. Override with GEMINI_MODEL.
export const GEMINI_LIGHT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

/** The configured Gemini key, whichever of the names the deployment uses. */
export function geminiApiKey(): string | null {
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  return key && key.trim() ? key.trim() : null;
}
