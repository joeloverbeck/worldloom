import assert from "node:assert/strict";
import test from "node:test";

import { MCP_ERROR_CODES } from "../src/errors";

test("MCP_ERROR_CODES matches the SPEC-02 error taxonomy exactly", () => {
  assert.deepEqual(MCP_ERROR_CODES, [
    "invalid_input",
    "index_missing",
    "index_version_mismatch",
    "stale_index",
    "empty_index",
    "world_not_found",
    "node_not_found",
    "token_invalid",
    "token_expired",
    "token_consumed",
    "token_tampered",
    "packet_incomplete_required_classes",
    "anchor_drift",
    "validator_unavailable",
    "phase1_stub"
  ]);
});
