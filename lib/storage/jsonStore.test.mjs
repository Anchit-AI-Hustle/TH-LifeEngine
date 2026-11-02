// node --experimental-strip-types --test lib/storage/jsonStore.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = mkdtempSync(path.join(tmpdir(), "store-"));
process.env.LIFEENGINE_DATA_DIR = root;
delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.VERCEL;
const { readJson, writeJson, deleteAll } = await import("./jsonStore.ts");

const HMAC_A = "a".repeat(64), HMAC_B = "b".repeat(64);
const UID_A = "A".repeat(22), UID_B = "B".repeat(22);

test("deleteAll removes one account's documents and nobody else's", async () => {
  await writeJson(`accounts/${HMAC_A}.json`, { id: UID_A });
  await writeJson(`accounts/${HMAC_B}.json`, { id: UID_B });
  await writeJson(`accounts/by-id/${UID_A}.json`, { last4: "0101" });
  await writeJson(`accounts/by-id/${UID_B}.json`, { last4: "0202" });
  await writeJson(`users/${UID_A}/lifeengine.state.json`, { plans: [1] });
  await writeJson(`users/${UID_A}/client-data.json`, { k: 1 });
  await writeJson(`users/${UID_B}/lifeengine.state.json`, { plans: [2] });

  assert.equal(await deleteAll(`users/${UID_A}/`), 1);
  assert.equal(await deleteAll(`accounts/by-id/${UID_A}`), 1);
  assert.equal(await deleteAll(`accounts/${HMAC_A}`), 1);

  assert.equal(await readJson(`accounts/${HMAC_A}.json`), null);
  assert.equal(await readJson(`accounts/by-id/${UID_A}.json`), null);
  assert.equal(await readJson(`users/${UID_A}/lifeengine.state.json`), null);
  assert.equal(existsSync(path.join(root, "users", UID_A)), false);

  assert.deepEqual(await readJson(`accounts/${HMAC_B}.json`), { id: UID_B });
  assert.deepEqual(await readJson(`accounts/by-id/${UID_B}.json`), { last4: "0202" });
  assert.deepEqual(await readJson(`users/${UID_B}/lifeengine.state.json`), { plans: [2] });
});

test("deleteAll refuses anything broader than one account", async () => {
  for (const bad of ["", "users/", "accounts/", "accounts/by-id/", "users/x/", `users/${UID_A}`, "lifeengine.state.json", `accounts/${HMAC_A.slice(1)}`, "../etc"]) {
    await assert.rejects(deleteAll(bad), /refusing/, bad);
  }
});

test("deleting an account that has no data is fine", async () => {
  assert.equal(await deleteAll(`users/${"C".repeat(22)}/`), 0);
});
