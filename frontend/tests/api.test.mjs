import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));

function loadApi(fetch, browser = false) {
  const source = fs.readFileSync(path.join(testDir, "../lib/api.ts"), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } }).outputText;
  const context = { exports: {}, fetch, process: { env: { API_BASE_URL: "http://backend.test:8080" } } };
  if (browser) context.window = {};
  vm.runInNewContext(code, context);
  return context.exports;
}

test("server API reads preserve the backend origin and /api/v1 path", async () => {
  const calls = [];
  const client = loadApi(async (url, options) => {
    calls.push({ url, options });
    return Response.json([{ id: 7 }]);
  });
  const menus = await client.apiFetch("/api/v1/menus?branchId=mapo");
  assert.equal(menus[0].id, 7);
  assert.equal(calls[0].url, "http://backend.test:8080/api/v1/menus?branchId=mapo");
});

test("browser writes send the session CSRF token and body to the same origin", async () => {
  const calls = [];
  const client = loadApi(async (url, options) => {
    calls.push({ url, options });
    return calls.length === 1
      ? Response.json({ headerName: "X-CSRF-TOKEN", token: "test-token" })
      : new Response(null, { status: 204 });
  }, true);
  await client.api("/admin/events/1", { method: "DELETE", body: { reason: "test" } });
  assert.equal(calls[0].url, "/api/v1/auth/csrf");
  assert.equal(calls[1].url, "/api/v1/admin/events/1");
  assert.equal(calls[1].options.headers["X-CSRF-TOKEN"], "test-token");
  assert.equal(calls[1].options.credentials, "same-origin");
  assert.equal(calls[1].options.body, '{"reason":"test"}');
});

test("failed CSRF preparation stops the mutation and preserves its status", async () => {
  let calls = 0;
  const client = loadApi(async () => { calls++; return new Response(null, { status: 403 }); }, true);
  await assert.rejects(client.api("/races/bets", { method: "POST" }), error => error.status === 403);
  assert.equal(calls, 1);
});

test("authentication errors remain available to the UI", async () => {
  const client = loadApi(async () => new Response(null, { status: 401 }), true);
  await assert.rejects(client.api("/coupons/me"), error => error.status === 401 && error.code === "UNAUTHORIZED");
});
