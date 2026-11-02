/**
 * API Utilities for Plan Generation
 */

export interface ApiError {
  message: string;
  details?: string;
  statusCode?: number;
}

export interface PlanGenerationResponse {
  planId: string;
  profileId: string;
  createdAt: string;
  plan: any;
  warnings?: string[];
  analytics?: any;
}

export interface CustomGPTResponse {
  plan: string;
  formatted: boolean;
  metadata?: any;
}

/**
 * Fetches with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = 180000 // 3 minutes default (increased from 60s)
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw {
        message: 'Request timeout',
        details: `The request took longer than ${timeout / 1000} seconds`,
        statusCode: 408,
      } as ApiError;
    }
    throw error;
  }
}

/**
 * Retry logic for failed requests
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  delay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on 4xx client errors (except timeout)
      if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 408) {
        throw error;
      }
      
      // Don't retry if it's the last attempt
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
    }
  }
  
  throw lastError;
}

/** Ids of the plans saved for this person, or null if they cannot be read. */
async function savedPlanIds(profileId: string): Promise<Map<string, string> | null> {
  try {
    const res = await fetch(`/api/lifeengine/listPlans?profileId=${encodeURIComponent(profileId)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { plans?: { id: string; source?: string; createdAt?: string }[] };
    return new Map((data.plans ?? []).map((p) => [p.id, `${p.source ?? ""}|${p.createdAt ?? ""}`]));
  } catch {
    return null;
  }
}

/**
 * A gateway or the network can drop a long request while the server carries
 * on and saves the plan. Wait for a plan that was not there before, rather
 * than generating (and saving) the same plan again.
 */
async function waitForNewPlan(
  profileId: string,
  source: string | null,
  before: Map<string, string>,
  waitMs: number,
): Promise<PlanGenerationResponse | null> {
  const until = Date.now() + waitMs;
  while (Date.now() < until) {
    await new Promise((r) => setTimeout(r, 5000));
    const now = await savedPlanIds(profileId);
    if (!now) continue;
    for (const [id, meta] of now) {
      if (before.has(id)) continue;
      const [planSource, createdAt] = meta.split("|");
      if (source && planSource && planSource !== source) continue;
      return { planId: id, profileId, createdAt: createdAt || new Date().toISOString(), plan: null };
    }
  }
  return null;
}

async function requestPlan(payload: any): Promise<PlanGenerationResponse> {
  try {
    const response = await fetchWithTimeout("/api/lifeengine/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }, 285000); // the server gives up at 260s (generate/route.ts) and must still answer

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.error || errorData.message || "Plan generation failed",
        details: errorData.details || response.statusText,
        statusCode: response.status,
      } as ApiError;
    }
    return await response.json();
  } catch (error: any) {
    if (error.message && error.statusCode) throw error; // already formatted
    throw {
      message: "Network error occurred",
      details: error.message || "Could not connect to server",
      statusCode: 0,
    } as ApiError;
  }
}

/**
 * Generates and saves a plan. Retries server and network failures, but first
 * checks whether the failed attempt saved a plan anyway, so a dropped
 * response never leaves the person with duplicate plans.
 */
export async function generatePlan(payload: any): Promise<PlanGenerationResponse> {
  const profileId: string | undefined = payload?.profileId;
  const source = payload?.appVersion === "oss" ? "rule-engine" : payload?.appVersion === "current" ? "gemini" : null;
  const before = profileId ? await savedPlanIds(profileId) : null;
  const maxRetries = 2;
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestPlan(payload);
    } catch (error: any) {
      lastError = error;
      const status = Number(error?.statusCode) || 0;
      if (status >= 400 && status < 500 && status !== 408) throw error; // the request itself is wrong
      // Dropped on the way back (network, timeout, gateway): the server may still save it.
      const maybeSaved = status === 0 || status === 408 || status === 502 || status === 504;
      if (maybeSaved && profileId && before) {
        const saved = await waitForNewPlan(profileId, source, before, 75000);
        if (saved) return saved;
      }
      if (attempt === maxRetries) throw error;
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

/**
 * Generates a plan using CustomGPT with AI-generated content
 */
export async function generatePlanWithGPT(payload: {
  prompt: string;
  profileId: string;
  model?: string;
}): Promise<CustomGPTResponse> {
  return withRetry(async () => {
    try {
      const response = await fetchWithTimeout("/api/lifeengine/custom-gpt-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }, 180000); // 3 minute timeout for GPT generation (increased from 120s)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          message: errorData.error || errorData.message || "GPT generation failed",
          details: errorData.details || response.statusText,
          statusCode: response.status,
        } as ApiError;
      }

      return await response.json();
    } catch (error: any) {
      if (error.message && error.statusCode) {
        throw error;
      }
      throw {
        message: "GPT generation error",
        details: error.message || "Could not generate plan with GPT",
        statusCode: 0,
      } as ApiError;
    }
  });
}

/**
 * Fetches the latest plan for a profile
 */
export async function getLatestPlan(profileId: string): Promise<any> {
  try {
    const response = await fetch(`/api/v1/plans/latest?profile_id=${encodeURIComponent(profileId)}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.error || "Could not fetch plan",
        details: errorData.details || response.statusText,
        statusCode: response.status,
      } as ApiError;
    }

    return await response.json();
  } catch (error: any) {
    if (error.message && error.statusCode) {
      throw error;
    }
    throw {
      message: "Failed to fetch plan",
      details: error.message || "Network error",
      statusCode: 0,
    } as ApiError;
  }
}

/**
 * Formats an error for display
 */
export function formatErrorMessage(error: ApiError | Error | any): string {
  if ('message' in error && 'details' in error) {
    const apiError = error as ApiError;
    return apiError.details 
      ? `${apiError.message}: ${apiError.details}` 
      : apiError.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return String(error);
}

/**
 * Helper to check if error is a specific HTTP status
 */
export function isErrorStatus(error: any, status: number): boolean {
  return error?.statusCode === status;
}
