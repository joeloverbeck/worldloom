import type { FastifyReply } from "fastify";

import {
  deriveHealthStatus,
  type BlockedAction,
  type HealthFinding,
  type HealthReport,
} from "../health/types.js";
import type { ReadError } from "../read/result.js";

interface DispatchEntry {
  status: number;
  severity: HealthFinding["severity"];
}

const ALL_BLOCKED_ACTIONS: BlockedAction[] = [
  "prompt_copy",
  "prompt_save",
  "segment_save",
  "manuscript_compile",
];

const DISPATCH: Record<string, DispatchEntry> = {
  file_not_found: { status: 404, severity: "info" },
  invalid_id_shape: { status: 400, severity: "warn" },
  yaml_parse_failed: { status: 409, severity: "blocking" },
  schema_validation_failed: { status: 409, severity: "error" },
  reference_unresolved: { status: 409, severity: "error" },
  io_error: { status: 500, severity: "error" },
};

export function mapReadErrorToHttpReply(
  reply: FastifyReply,
  error: ReadError,
): FastifyReply {
  const entry = DISPATCH[error.code];
  if (!entry) {
    reply.log.warn(
      { code: error.code, path: error.path },
      "unrecognized read-error code; defaulting to 500",
    );
    return reply.code(500).send({ error: "internal_error" });
  }

  if (entry.status === 404) {
    return reply.code(404).send({ error: "not_found" });
  }

  if (entry.status === 400) {
    return reply.code(400).send({ error: "bad_request", reason: error.code });
  }

  if (entry.status === 409) {
    const finding: HealthFinding = {
      severity: entry.severity,
      code: error.code,
      path: error.path,
      message: error.repair_hint,
      repair_hint: error.repair_hint,
    };
    const body: HealthReport = {
      status: deriveHealthStatus([finding]),
      findings: [finding],
      blocked_actions: entry.severity === "blocking" ? ALL_BLOCKED_ACTIONS : [],
    };
    return reply.code(409).send(body);
  }

  return reply.code(500).send({ error: "internal_error" });
}
