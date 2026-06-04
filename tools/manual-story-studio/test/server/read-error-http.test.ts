import assert from "node:assert/strict";
import test from "node:test";
import type { FastifyReply } from "fastify";

import type { HealthReport } from "../../src/health/types.js";
import type { ReadError } from "../../src/read/result.js";
import { mapReadErrorToHttpReply } from "../../src/server/read-error-http.js";

interface TestReply {
  statusCode?: number;
  body?: unknown;
  warnings: unknown[];
  code: (statusCode: number) => TestReply;
  send: (body: unknown) => TestReply;
  log: {
    warn: (...args: unknown[]) => void;
  };
}

function createReply(): TestReply {
  const reply: TestReply = {
    warnings: [],
    code(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
    log: {
      warn(...args) {
        reply.warnings.push(args);
      },
    },
  };
  return reply;
}

function readError(code: string): ReadError {
  return {
    code,
    path: "worlds/example/manual-stories/story/manual-story.yaml",
    repair_hint: `Repair ${code}.`,
  };
}

function dispatch(error: ReadError): TestReply {
  const reply = createReply();
  mapReadErrorToHttpReply(reply as unknown as FastifyReply, error);
  return reply;
}

test("file_not_found maps to 404 not_found", () => {
  const reply = dispatch(readError("file_not_found"));

  assert.equal(reply.statusCode, 404);
  assert.deepEqual(reply.body, { error: "not_found" });
  assert.deepEqual(reply.warnings, []);
});

test("invalid_id_shape maps to 400 bad_request with the read error code", () => {
  const reply = dispatch(readError("invalid_id_shape"));

  assert.equal(reply.statusCode, 400);
  assert.deepEqual(reply.body, {
    error: "bad_request",
    reason: "invalid_id_shape",
  });
  assert.deepEqual(reply.warnings, []);
});

test("yaml_parse_failed maps to 409 blocked HealthReport with all blocked actions", () => {
  const error = readError("yaml_parse_failed");
  const reply = dispatch(error);
  const body = reply.body as HealthReport;

  assert.equal(reply.statusCode, 409);
  assert.equal(body.status, "blocked");
  assert.equal(body.findings.length, 1);
  assert.deepEqual(body.findings[0], {
    severity: "blocking",
    code: error.code,
    path: error.path,
    message: error.repair_hint,
    repair_hint: error.repair_hint,
  });
  assert.deepEqual(body.blocked_actions, [
    "prompt_copy",
    "prompt_save",
    "segment_save",
    "manuscript_compile",
  ]);
});

test("schema_validation_failed maps to 409 degraded HealthReport", () => {
  const error = readError("schema_validation_failed");
  const reply = dispatch(error);
  const body = reply.body as HealthReport;

  assert.equal(reply.statusCode, 409);
  assert.equal(body.status, "degraded");
  assert.equal(body.findings.length, 1);
  assert.equal(body.findings[0]?.severity, "error");
  assert.equal(body.findings[0]?.code, error.code);
  assert.deepEqual(body.blocked_actions, []);
});

test("id_filename_mismatch maps to 409 degraded HealthReport", () => {
  const error = readError("id_filename_mismatch");
  const reply = dispatch(error);
  const body = reply.body as HealthReport;

  assert.equal(reply.statusCode, 409);
  assert.equal(body.status, "degraded");
  assert.equal(body.findings.length, 1);
  assert.equal(body.findings[0]?.severity, "error");
  assert.equal(body.findings[0]?.code, error.code);
  assert.deepEqual(body.blocked_actions, []);
});

test("reference_unresolved maps to 409 degraded HealthReport", () => {
  const error = readError("reference_unresolved");
  const reply = dispatch(error);
  const body = reply.body as HealthReport;

  assert.equal(reply.statusCode, 409);
  assert.equal(body.status, "degraded");
  assert.equal(body.findings.length, 1);
  assert.equal(body.findings[0]?.severity, "error");
  assert.equal(body.findings[0]?.path, error.path);
  assert.deepEqual(body.blocked_actions, []);
});

test("io_error maps to 500 internal_error", () => {
  const reply = dispatch(readError("io_error"));

  assert.equal(reply.statusCode, 500);
  assert.deepEqual(reply.body, { error: "internal_error" });
  assert.deepEqual(reply.warnings, []);
});

test("unrecognized read error code maps to 500 and logs a warning", () => {
  const error = readError("new_code");
  const reply = dispatch(error);

  assert.equal(reply.statusCode, 500);
  assert.deepEqual(reply.body, { error: "internal_error" });
  assert.equal(reply.warnings.length, 1);
  assert.deepEqual(reply.warnings[0], [
    { code: error.code, path: error.path },
    "unrecognized read-error code; defaulting to 500",
  ]);
});
