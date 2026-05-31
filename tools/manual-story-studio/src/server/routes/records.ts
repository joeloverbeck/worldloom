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

export interface RecordsRouteOptions {
  repoRoot: string;
}

function isManualRecordClass(value: unknown): value is ManualRecordClass {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(
      MANUAL_RECORD_CLASS_PREFIXES,
      value,
    )
  );
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
    Querystring: { class?: string; includeArchived?: string };
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
      if (!isManualRecordClass(cls)) {
        return reply
          .code(400)
          .send({ error: "bad_request", message: "class query param required" });
      }
      const includeArchived = request.query.includeArchived === "true";
      const records = listRecords(root.absolutePath, cls, { includeArchived });
      return { records };
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
      if (!record) return reply.code(404).send({ error: "not_found" });
      return { record };
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
  confirm?: boolean;
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
    Querystring: { force?: string };
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
      if (!isManualRecordClass(request.params.class)) {
        return reply
          .code(400)
          .send({ error: "bad_request", message: "unknown class" });
      }
      const queryForce = request.query.force === "true";
      const bodyConfirm =
        request.body && typeof request.body === "object"
          ? Boolean((request.body as DeleteBody).confirm)
          : false;
      const force = queryForce || bodyConfirm;
      const result = deleteRecord(
        root,
        request.params.class,
        request.params.id,
        { force },
      );
      if ("ok" in result && result.ok === false) {
        return reply.code(404).send({ error: "not_found" });
      }
      return result;
    },
  );
}

function mapWriteFailure(
  reply: import("fastify").FastifyReply,
  result: {
    ok: false;
    error: "validation_failed" | "broken_refs" | "not_found";
    errors?: unknown;
    violations?: unknown;
    needsOverride?: boolean;
  },
): unknown {
  if (result.error === "not_found") {
    return reply.code(404).send({ error: "not_found" });
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
