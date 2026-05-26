import type { FastifyInstance } from "fastify";

import { buildRecordCard } from "../../read/record-card.js";
import { readRawRecord, readRecord, recordClass } from "../../read/record-io.js";

export interface RecordRouteOptions {
  repoRoot: string;
}

const INDEXED_CLASSES = new Set([
  "PG",
  "SE",
  "BEL",
  "SF",
  "OBL",
  "CNSQ",
  "THR",
  "SREL",
  "STINT",
  "STENT",
  "STSTAT",
  "STCHAR",
  "STLOC",
  "STOBJ",
  "CLK",
  "STSEC",
  "STQ",
  "STPLAN",
  "STEMO",
  "BR",
  "CHC",
  "SLT",
  "DA",
]);
const DIRECT_CLASSES = new Set(["SLB", "SAU", "SP", "RSP"]);
const VALID_CLASSES = new Set([...INDEXED_CLASSES, ...DIRECT_CLASSES]);

function invalidInput(message: string, field: string, recordId?: string): Record<string, unknown> {
  return {
    error: "invalid_input",
    message,
    field,
    ...(recordId === undefined ? {} : { recordId }),
  };
}

function validateRecordId(recordId: string): string | null {
  const klass = recordClass(recordId);
  if (!VALID_CLASSES.has(klass) || !/^[A-Z]+-[0-9]+$/.test(recordId)) {
    return null;
  }
  return klass;
}

export async function registerRecordRoutes(
  server: FastifyInstance,
  options: RecordRouteOptions,
): Promise<void> {
  server.get<{ Params: { slug: string; recordId: string } }>(
    "/api/worlds/:slug/records/:recordId",
    async (request, reply) =>
      reply
        .code(400)
        .send(
          invalidInput(
            `storySlug is required for story-bundle record ${request.params.recordId}`,
            "storySlug",
            request.params.recordId,
          ),
        ),
  );

  server.get<{ Params: { slug: string; storySlug: string; recordId: string } }>(
    "/api/worlds/:slug/stories/:storySlug/records/:recordId",
    async (request, reply) => {
      const klass = validateRecordId(request.params.recordId);
      if (klass === null) {
        return reply
          .code(400)
          .send(invalidInput(`Unsupported story-bundle record id: ${request.params.recordId}`, "recordId", request.params.recordId));
      }

      try {
        const raw = DIRECT_CLASSES.has(klass)
          ? await readRawRecord(request.params.slug, request.params.storySlug, request.params.recordId, options.repoRoot)
          : await readRecord(request.params.slug, request.params.storySlug, request.params.recordId, options.repoRoot);
        return {
          record: raw.parsed,
          recordCard: buildRecordCard(request.params.recordId, raw.parsed, [], {
            sourcePath: raw.sourcePath,
            contentHash: raw.contentHash,
          }),
        };
      } catch (error) {
        const candidate = error as NodeJS.ErrnoException;
        if (candidate.code === "ENOENT") {
          return reply.code(404).send({ error: "not_found", message: `Record not found: ${request.params.recordId}` });
        }
        throw error;
      }
    },
  );

  server.get<{ Params: { slug: string; storySlug: string; recordId: string } }>(
    "/api/worlds/:slug/stories/:storySlug/records/:recordId/raw",
    async (request, reply) => {
      const klass = validateRecordId(request.params.recordId);
      if (klass === null) {
        return reply
          .code(400)
          .send(invalidInput(`Unsupported story-bundle record id: ${request.params.recordId}`, "recordId", request.params.recordId));
      }

      try {
        const raw = await readRawRecord(request.params.slug, request.params.storySlug, request.params.recordId, options.repoRoot);
        return {
          body: raw.body,
          sourcePath: raw.sourcePath,
          contentHash: raw.contentHash,
        };
      } catch (error) {
        const candidate = error as NodeJS.ErrnoException;
        if (candidate.code === "ENOENT") {
          return reply.code(404).send({ error: "not_found", message: `Record not found: ${request.params.recordId}` });
        }
        throw error;
      }
    },
  );
}
