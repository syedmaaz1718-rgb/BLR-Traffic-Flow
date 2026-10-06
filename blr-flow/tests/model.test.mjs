import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { forestPredict } from "../src/ml.mjs";
const model = JSON.parse(
  fs.readFileSync(new URL("../models/model.json", import.meta.url)),
);
const fixtures = JSON.parse(
  fs.readFileSync(new URL("./parity.json", import.meta.url)),
);
test("JS forest equals sklearn to 1e-10", () => {
  for (const f of fixtures)
    assert.ok(Math.abs(forestPredict(f.features, model) - f.expected) < 1e-10);
});
test("all supported scenarios return bounded finite indices", () => {
  for (let j = 0; j < 6; j++)
    for (let h = 0; h < 24; h++)
      for (let w = 0; w < 2; w++) {
        const p = forestPredict(
          [
            j,
            Math.sin((h * 2 * Math.PI) / 24),
            Math.cos((h * 2 * Math.PI) / 24),
            w,
            1,
            1,
          ],
          model,
        );
        assert.ok(Number.isFinite(p) && p >= 0 && p <= 100);
      }
});
test("peak hour is more congested than overnight in baseline", () =>
  assert.ok(
    forestPredict([0, -1, 0, 0, 0, 0], model) >
      forestPredict([0, 0, 1, 0, 0, 0], model),
  ));
