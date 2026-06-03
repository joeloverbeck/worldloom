import { existsSync } from "node:fs";
import path from "node:path";

import type { FastifyInstance } from "fastify";

import {
  listRecords,
  readRecord,
} from "../../read/records.js";
import {
  MANUAL_RECORD_CLASS_PREFIXES,
  type ManualRecord,
  type ManualRecordClass,
} from "../../schema/manual-story.js";
import {
  createRecord,
  deleteRecord,
  updateRecord,
} from "../../write/records.js";
import { resolveManualStoryRoot } from "../../write/sandbox.js";
import { mapReadErrorToHttpReply } from "../read-error-http.js";

export interface RecordsRouteOptions {
  repoRoot: string;
}

const RECORD_REPAIR_MODE_FLAG = "repair";

function isManualRecordClass(value: unknown): value is ManualRecordClass {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(
      MANUAL_RECORD_CLASS_PREFIXES,
      value,
    )
  );
}

// SPEC-104: beat-templates owns its dedicated /beat-templates URL space
// (see routes/beat-templates.ts). The generic /records/:class endpoint
// returns 404 with a pointer message so client errors surface the right
// path; the routes never double-serve the same logical CRUD operations.
function rejectBeatTemplatesClass(
  cls: string,
  reply: import("fastify").FastifyReply,
): boolean {
  if (cls === "beat-templates") {
    void reply.code(404).send({
      error: "wrong_url_space",
      message:
        "beat-templates is served by /beat-templates URL space; the generic /records endpoint does not handle this class",
    });
    return true;
  }
  return false;
}

function resolveManualStoryRootOrNull(
  repoRoot: string,
  worldSlug: string,
  msSlug: string,
): ReturnType<typeof resolveManualStoryRoot> | null {
  try {
    const root = resolveManualStoryRoot(repoRoot, worldSlug, msSlug);
    if (!existsSync(root.absolutePath)) return null;
    return root;
  } catch {
    return null;
  }
}

export async function registerRecordsReadRoutes(
  server: FastifyInstance,
  options: RecordsRouteOptions,
): Promise<void> {
  server.get<{
    Params: { slug: string; msSlug: string };
    Querystring: { class?: string; includeInactive?: string };
  }>(
    "/api/worlds/:slug/manual-stories/:msSlug/records",
    async (request, reply) => {
      const root = resolveManualStoryRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return reply.code(404).send({ error: "not_found" });
      const cls = request.query.class;
      if (typeof cls === "string" && rejectBeatTemplatesClass(cls, reply)) {
        return reply;
      }
      if (!isManualRecordClass(cls)) {
        return reply
          .code(400)
          .send({ error: "bad_request", message: "class query param required" });
      }
      const includeInactive = request.query.includeInactive === "true";
      const records = listRecords(root.absolutePath, cls, { includeInactive });
      if (!records.ok) return mapReadErrorToHttpReply(reply, records.error);
      return { records: records.value };
    },
  );

  server.get<{
    Params: { slug: string; msSlug: string; class: string; id: string };
  }>(
    "/api/worlds/:slug/manual-stories/:msSlug/records/:class/:id",
    async (request, reply) => {
      const root = resolveManualStoryRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return reply.code(404).send({ error: "not_found" });
      if (rejectBeatTemplatesClass(request.params.class, reply)) {
        return reply;
      }
      if (!isManualRecordClass(request.params.class)) {
        return reply
          .code(400)
          .send({ error: "bad_request", message: "unknown class" });
      }
      const record = readRecord(
        root.absolutePath,
        request.params.class,
        request.params.id,
      );
      if (!record.ok) return mapReadErrorToHttpReply(reply, record.error);
      return { record: record.value };
    },
  );
}

interface CreateBody {
  record?: Record<string, unknown>;
  overrideBrokenRefs?: boolean;
}

interface UpdateBody {
  record?: ManualRecord;
  overrideBrokenRefs?: boolean;
}

interface DeleteBody {
  mode?: string;
}

interface DeleteQuery {
  force?: string;
  mode?: string;
}

export async function registerRecordsWriteRoutes(
  server: FastifyInstance,
  options: RecordsRouteOptions,
): Promise<void> {
  server.post<{
    Params: { slug: string; msSlug: string; class: string };
    Body: CreateBody;
  }>(
    "/api/worlds/:slug/manual-stories/:msSlug/records/:class",
    async (request, reply) => {
      const root = resolveManualStoryRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return reply.code(404).send({ error: "not_found" });
      if (rejectBeatTemplatesClass(request.params.class, reply)) {
        return reply;
      }
      if (!isManualRecordClass(request.params.class)) {
        return reply
          .code(400)
          .send({ error: "bad_request", message: "unknown class" });
      }
      const body = (request.body ?? {}) as CreateBody;
      if (!body.record || typeof body.record !== "object") {
        return reply
          .code(400)
          .send({ error: "bad_request", message: "record body required" });
      }
      const result = createRecord(
        root,
        request.params.class,
        body.record as Omit<ManualRecord, "id">,
        { overrideBrokenRefs: body.overrideBrokenRefs === true },
      );
      if ("ok" in result && result.ok) {
        return reply.code(201).send({ id: result.id, record: result.record });
      }
      return mapWriteFailure(reply, result);
    },
  );

  server.put<{
    Params: { slug: string; msSlug: string; class: string; id: string };
    Body: UpdateBody;
  }>(
    "/api/worlds/:slug/manual-stories/:msSlug/records/:class/:id",
    async (request, reply) => {
      const root = resolveManualStoryRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return reply.code(404).send({ error: "not_found" });
      if (rejectBeatTemplatesClass(request.params.class, reply)) {
        return reply;
      }
      if (!isManualRecordClass(request.params.class)) {
        return reply
          .code(400)
          .send({ error: "bad_request", message: "unknown class" });
      }
      const body = (request.body ?? {}) as UpdateBody;
      if (!body.record || typeof body.record !== "object") {
        return reply
          .code(400)
          .send({ error: "bad_request", message: "record body required" });
      }
      const result = updateRecord(
        root,
        request.params.class,
        request.params.id,
        body.record as ManualRecord,
        { overrideBrokenRefs: body.overrideBrokenRefs === true },
      );
      if ("ok" in result && result.ok) {
        return { id: result.id, record: result.record };
      }
      if ("error" in result && result.error === "not_found") {
        return reply.code(404).send({ error: "not_found" });
      }
      return mapWriteFailure(reply, result);
    },
  );

  server.delete<{
    Params: { slug: string; msSlug: string; class: string; id: string };
    Querystring: DeleteQuery;
    Body: DeleteBody;
  }>(
    "/api/worlds/:slug/manual-stories/:msSlug/records/:class/:id",
    async (request, reply) => {
      const root = resolveManualStoryRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return reply.code(404).send({ error: "not_found" });
      if (rejectBeatTemplatesClass(request.params.class, reply)) {
        return reply;
      }
      if (!isManualRecordClass(request.params.class)) {
        return reply
          .code(400)
          .send({ error: "bad_request", message: "unknown class" });
      }
      const queryForce = request.query.force === "true";
      const repairMode =
        request.query.mode === RECORD_REPAIR_MODE_FLAG ||
        (request.body &&
          typeof request.body === "object" &&
          (request.body as DeleteBody).mode === RECORD_REPAIR_MODE_FLAG);
      if (queryForce && !repairMode) {
        return reply
          .code(405)
          .header("Allow", "DELETE")
          .send({
            error: "repair-mode-required",
            message:
              'force delete requires ?mode=repair or body { mode: "repair" }; see the repair-mode UI affordance.',
          });
      }
      const result = deleteRecord(
        root,
        request.params.class,
        request.params.id,
        { force: queryForce },
      );
      if ("ok" in result && result.ok === false && result.error === "not_found") {
        return reply.code(404).send({ error: "not_found" });
      }
      if ("ok" in result && result.ok === false && result.error === "read_failed") {
        return mapReadErrorToHttpReply(reply, result.read_error);
      }
      return result;
    },
  );
}

function mapWriteFailure(
  reply: import("fastify").FastifyReply,
  result: {
    ok: false;
    error: "validation_failed" | "broken_refs" | "not_found" | "read_failed";
    read_error?: import("../../read/result.js").ReadError;
    errors?: unknown;
    violations?: unknown;
    needsOverride?: boolean;
  },
): unknown {
  if (result.error === "not_found") {
    return reply.code(404).send({ error: "not_found" });
  }
  if (result.error === "read_failed" && result.read_error) {
    return mapReadErrorToHttpReply(reply, result.read_error);
  }
  if (result.error === "validation_failed") {
    return reply
      .code(400)
      .send({ error: "validation_failed", errors: result.errors });
  }
  if (result.error === "broken_refs") {
    return reply.code(400).send({
      error: "broken_refs",
      violations: result.violations,
      needsOverride: true,
    });
  }
  return reply.code(500).send({ error: "internal_error" });
}

// Stash unused path import suppression in case re-export is needed later
void path;
