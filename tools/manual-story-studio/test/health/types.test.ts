import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveHealthStatus,
  type HealthFinding,
} from "../../src/health/types.js";

function finding(severity: HealthFinding["severity"]): HealthFinding {
  return {
    severity,
    code: `${severity}-finding`,
    path: "worlds/example/manual-stories/example/manual-story.yaml",
    message: `${severity} finding`,
    repair_hint: "Repair the fixture file.",
  };
}

test("deriveHealthStatus returns blocked when any finding is blocking", () => {
  assert.equal(
    deriveHealthStatus([finding("info"), finding("blocking")]),
    "blocked",
  );
});

test("deriveHealthStatus returns degraded when any finding is error and none are blocking", () => {
  assert.equal(
    deriveHealthStatus([finding("warn"), finding("error")]),
    "degraded",
  );
});

test("deriveHealthStatus returns ok for warn/info findings", () => {
  assert.equal(deriveHealthStatus([finding("warn"), finding("info")]), "ok");
});

test("deriveHealthStatus returns ok for empty findings", () => {
  assert.equal(deriveHealthStatus([]), "ok");
});
