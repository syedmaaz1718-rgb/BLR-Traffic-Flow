import test from "node:test";
import assert from "node:assert/strict";
import { handle, normalize, config } from "../netlify/functions/traffic.mjs";
const req = (data, headers = {}) =>
  new Request("https://example.test/api/traffic", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(data),
  });
const flow = {
  currentSpeed: 12,
  freeFlowSpeed: 40,
  currentTravelTime: 60,
  freeFlowTravelTime: 18,
  confidence: 0.9,
  roadClosure: false,
};
test("live endpoint fails honestly without configured key", async () => {
  assert.equal((await handle(req({ junction: 0 }), { key: "" })).status, 503);
});
test("invalid locations cannot turn proxy into arbitrary endpoint", async () => {
  assert.equal(
    (await handle(req({ junction: "http://evil.test" }), { key: "test" }))
      .status,
    400,
  );
});
test("optional access password protects provider requests", async () => {
  assert.equal(
    (await handle(req({ junction: 0 }), { key: "test", access: "private" }))
      .status,
    401,
  );
});
test("provider fixture parsed, key never returned and no synthetic projection", async () => {
  let url;
  const res = await handle(req({ junction: 0 }), {
    key: "test-secret",
    fetcher: async (u) => {
      url = u;
      return Response.json({ flowSegmentData: flow });
    },
  });
  const data = await res.json();
  assert.equal(data.currentSpeed, 12);
  assert.equal(url.host, "api.tomtom.com");
  assert.equal(url.searchParams.get("unit"), "kmph");
  assert.ok(!JSON.stringify(data).includes("test-secret"));
  assert.equal(data.hourly, undefined);
});
test("provider errors sanitized, no raw key or body leaked", async () => {
  const res = await handle(req({ junction: 0 }), {
    key: "test",
    fetcher: async () => new Response("key=test", { status: 403 }),
  });
  assert.equal(res.status, 502);
  assert.ok(!(await res.text()).includes("key=test"));
});
test("invalid numeric provider response rejected", () => {
  assert.throws(() => normalize({ ...flow, currentSpeed: NaN }));
  assert.throws(() => normalize({ ...flow, confidence: 2 }));
});
test("manual endpoint has platform per-IP rate limit", () => {
  assert.equal(config.path, "/api/traffic");
  assert.equal(config.rateLimit.windowLimit, 6);
});
