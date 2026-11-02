// node --experimental-strip-types --test lib/lifeengine/api.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { generatePlan } from "./api.ts";

const json = (body, status = 200, statusText = "OK") =>
  new Response(JSON.stringify(body), { status, statusText, headers: { "Content-Type": "application/json" } });

function mockFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || "GET" });
    return handler(String(url), init, calls);
  };
  return calls;
}

test("a dropped response reuses the plan the server saved instead of generating again", async () => {
  let listed = 0;
  const calls = mockFetch((url) => {
    if (url.startsWith("/api/lifeengine/listPlans")) {
      listed++;
      const plans = [{ id: "old", source: "gemini", createdAt: "2026-11-01T00:00:00Z" }];
      if (listed > 1) plans.push({ id: "new", source: "gemini", createdAt: "2026-11-02T10:40:00Z" });
      return json({ plans });
    }
    return new Response("<html>Bad Gateway</html>", { status: 502, statusText: "Bad Gateway" });
  });
  const r = await generatePlan({ profileId: "p1", appVersion: "current" });
  assert.equal(r.planId, "new");
  assert.equal(calls.filter((c) => c.url === "/api/lifeengine/generate").length, 1, "generated once");
});

test("a server error that saved nothing is retried without waiting, then reported", async () => {
  const calls = mockFetch((url) => {
    if (url.startsWith("/api/lifeengine/listPlans")) return json({ plans: [] });
    return json({ error: "Gemini generation failed." }, 500, "Internal Server Error");
  });
  const t0 = Date.now();
  await assert.rejects(generatePlan({ profileId: "p1", appVersion: "current" }), (e) => e.statusCode === 500);
  assert.equal(calls.filter((c) => c.url === "/api/lifeengine/generate").length, 3);
  assert.equal(calls.filter((c) => c.url.startsWith("/api/lifeengine/listPlans")).length, 1, "no polling after a 500");
  assert.ok(Date.now() - t0 < 6000);
});

test("a bad request is not retried", async () => {
  const calls = mockFetch((url) =>
    url.startsWith("/api/lifeengine/listPlans") ? json({ plans: [] }) : json({ error: "Invalid input" }, 400, "Bad Request"),
  );
  await assert.rejects(generatePlan({ profileId: "p1", appVersion: "oss" }), (e) => e.statusCode === 400);
  assert.equal(calls.filter((c) => c.url === "/api/lifeengine/generate").length, 1);
});
