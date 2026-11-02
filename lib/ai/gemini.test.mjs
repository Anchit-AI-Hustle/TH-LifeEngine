// node --experimental-strip-types --test lib/ai/gemini.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { isModelUnavailableError } from "./gemini.ts";

test("quota and missing-model errors switch models", () => {
  const quota = new Error("[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent: [429 Too Many Requests] You exceeded your current quota, please check your plan and billing details.");
  assert.equal(isModelUnavailableError(quota), true);
  assert.equal(isModelUnavailableError(new Error("[404 Not Found] models/gemini-9 is not found for API version v1beta")), true);
  assert.equal(isModelUnavailableError("Resource has been exhausted (e.g. check quota)."), true);
});

test("other errors do not", () => {
  assert.equal(isModelUnavailableError(new Error("Generation timed out after 90 seconds.")), false);
  assert.equal(isModelUnavailableError(new Error("[400 Bad Request] API key not valid. Please pass a valid API key.")), false);
  assert.equal(isModelUnavailableError(new Error("[503 Service Unavailable] The model is overloaded.")), false);
  assert.equal(isModelUnavailableError(null), false);
});
