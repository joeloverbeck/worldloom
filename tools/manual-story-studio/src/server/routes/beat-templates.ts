// Beat-templates dedicated CRUD routes + moment-composer template-candidates
// route. Owns the entire /beat-templates URL space; the generic
// /records/beat-templates URL returns 404 with a pointer message (see
// routes/records.ts coordination).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import type { FastifyInstance, FastifyReply } from "fastify";
import YAML from "yaml";

import { listRecords, readRecord } from "../../read/records.js";
import { readManualStoryMetadata } from "../../read/manual-story-metadata.js";
import type {
  BeatTemplate,
  BeatTemplateMoveFamily,
} from "../../schema/beat-template.js";
import type {
  ManualCharacterProfile,
  ManualSecretRecord,
} from "../../schema/manual-story.js";
import {
  filterBeatTemplates,
  type FilterLocationEntry,
  type FilterRecordEntry,
  type FilterSecretEntry,
} from "../../templates/filter.js";
import {
  validateBeatTemplate,
  type BeatTemplateValidationResult,
} from "../../validate/beat-template-schema.js";
import { allocateNextIdForClass } from "../../write/id-allocator.js";
import {
  createRecord,
  deleteRecord,
  updateRecord,
} from "../../write/records.js";
import {
  resolveManualStoryRoot,
  type ManualStoryRoot,
} from "../../write/sandbox.js";

export interface BeatTemplatesRouteOptions {
  repoRoot: string;
}

function resolveRootOrNull(
  repoRoot: string,
  worldSlug: string,
  msSlug: string,
): ManualStoryRoot | null {
  try {
    const root = resolveManualStoryRoot(repoRoot, worldSlug, msSlug);
    if (!existsSync(root.absolutePath)) return null;
    return root;
  } catch {
    return null;
  }
}

function listAllBeatTemplates(manualStoryRoot: string): BeatTemplate[] {
  const dir = path.join(manualStoryRoot, "records", "beat-templates");
  if (!existsSync(dir)) return [];
  const out: BeatTemplate[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!/^mtemplate-\d+\.yaml$/.test(entry.name)) continue;
    try {
      const text = readFileSync(path.join(dir, entry.name), "utf8");
      const parsed = YAML.parse(text);
      const result = validateBeatTemplate(parsed);
      if (result.valid) out.push(result.record);
    } catch {
      // skip malformed
    }
  }
  out.sort((a, b) =>
    extractNumericSuffix(a.id) - extractNumericSuffix(b.id),
  );
  return out;
}

function extractNumericSuffix(id: string): number {
  const m = /-(\d+)$/.exec(id);
  if (!m) return 0;
  const n = Number.parseInt(m[1] ?? "0", 10);
  return Number.isFinite(n) ? n : 0;
}

function notFound(reply: FastifyReply, msg: string): FastifyReply {
  return reply.code(404).send({ error: "not_found", message: msg });
}

function badRequest(reply: FastifyReply, msg: string): FastifyReply {
  return reply.code(400).send({ error: "invalid_input", message: msg });
}

function mapValidationFailure(
  reply: FastifyReply,
  result: BeatTemplateValidationResult,
): FastifyReply | undefined {
  if (result.valid) return undefined;
  return reply.code(400).send({
    error: "validation_failed",
    violations: result.violations,
  });
}

interface CreateBody {
  record?: Record<string, unknown>;
}
interface UpdateBody {
  record?: Record<string, unknown>;
}
interface DeleteBody {
  confirm?: boolean;
}
interface CandidatesBody {
  moment_directive?: string;
  selected_cast?: string[];
  optional_move_family?: BeatTemplateMoveFamily;
  optional_tags?: string[];
  optional_location?: string;
}

export async function registerBeatTemplatesReadRoutes(
  server: FastifyInstance,
  options: BeatTemplatesRouteOptions,
): Promise<void> {
  server.get<{
    Params: { slug: string; msSlug: string };
    Querystring: { includeArchived?: string };
  }>(
    "/api/worlds/:slug/manual-stories/:msSlug/beat-templates",
    async (request, reply) => {
      const root = resolveRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return notFound(reply, "manual_story_not_found");
      const includeArchived = request.query.includeArchived === "true";
      const all = listAllBeatTemplates(root.absolutePath);
      const filtered = includeArchived ? all : all.filter((t) => t.active);
      return { templates: filtered };
    },
  );

  server.get<{
    Params: { slug: string; msSlug: string; id: string };
  }>(
    "/api/worlds/:slug/manual-stories/:msSlug/beat-templates/:id",
    async (request, reply) => {
      const root = resolveRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return notFound(reply, "manual_story_not_found");
      if (!/^mtemplate-\d+$/.test(request.params.id)) {
        return badRequest(reply, "bad id");
      }
      const fullPath = path.join(
        root.absolutePath,
        "records",
        "beat-templates",
        `${request.params.id}.yaml`,
      );
      if (!existsSync(fullPath)) return notFound(reply, "template_not_found");
      const parsed = YAML.parse(readFileSync(fullPath, "utf8"));
      const result = validateBeatTemplate(parsed);
      if (!result.valid) {
        return reply.code(500).send({
          error: "stored_template_invalid",
          violations: result.violations,
        });
      }
      return { template: result.record };
    },
  );
}

export async function registerBeatTemplatesWriteRoutes(
  server: FastifyInstance,
  options: BeatTemplatesRouteOptions,
): Promise<void> {
  server.post<{
    Params: { slug: string; msSlug: string };
    Body: CreateBody;
  }>(
    "/api/worlds/:slug/manual-stories/:msSlug/beat-templates",
    async (request, reply) => {
      const root = resolveRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return notFound(reply, "manual_story_not_found");
      const body = (request.body ?? {}) as CreateBody;
      if (!body.record || typeof body.record !== "object") {
        return badRequest(reply, "record body required");
      }
      const id = allocateNextIdForClass(root.absolutePath, "beat-templates");
      const composed = { id, ...body.record };
      const validated = validateBeatTemplate(composed);
      const failure = mapValidationFailure(reply, validated);
      if (failure) return failure;
      if (!validated.valid) return failure;
      const result = createRecord(
        root,
        "beat-templates",
        body.record as never,
      );
      if ("ok" in result && result.ok) {
        return reply.code(201).send({ id: result.id, template: result.record });
      }
      return reply.code(400).send(result);
    },
  );

  server.put<{
    Params: { slug: string; msSlug: string; id: string };
    Body: UpdateBody;
  }>(
    "/api/worlds/:slug/manual-stories/:msSlug/beat-templates/:id",
    async (request, reply) => {
      const root = resolveRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return notFound(reply, "manual_story_not_found");
      if (!/^mtemplate-\d+$/.test(request.params.id)) {
        return badRequest(reply, "bad id");
      }
      const body = (request.body ?? {}) as UpdateBody;
      if (!body.record || typeof body.record !== "object") {
        return badRequest(reply, "record body required");
      }
      const composed = { ...body.record, id: request.params.id };
      const validated = validateBeatTemplate(composed);
      const failure = mapValidationFailure(reply, validated);
      if (failure) return failure;
      if (!validated.valid) return failure;
      const result = updateRecord(
        root,
        "beat-templates",
        request.params.id,
        composed as never,
      );
      if ("ok" in result && result.ok) {
        return { id: result.id, template: result.record };
      }
      if ("error" in result && result.error === "not_found") {
        return notFound(reply, "template_not_found");
      }
      return reply.code(400).send(result);
    },
  );

  server.delete<{
    Params: { slug: string; msSlug: string; id: string };
    Querystring: { force?: string };
    Body: DeleteBody;
  }>(
    "/api/worlds/:slug/manual-stories/:msSlug/beat-templates/:id",
    async (request, reply) => {
      const root = resolveRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return notFound(reply, "manual_story_not_found");
      if (!/^mtemplate-\d+$/.test(request.params.id)) {
        return badRequest(reply, "bad id");
      }
      const queryForce = request.query.force === "true";
      const bodyConfirm =
        request.body && typeof request.body === "object"
          ? Boolean((request.body as DeleteBody).confirm)
          : false;
      const force = queryForce || bodyConfirm;
      const result = deleteRecord(root, "beat-templates", request.params.id, {
        force,
      });
      if ("ok" in result && result.ok === false) {
        return notFound(reply, "template_not_found");
      }
      return result;
    },
  );

  server.post<{
    Params: { slug: string; msSlug: string };
    Body: CandidatesBody;
  }>(
    "/api/worlds/:slug/manual-stories/:msSlug/moment-composer/template-candidates",
    async (request, reply) => {
      const root = resolveRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return notFound(reply, "manual_story_not_found");
      const body = (request.body ?? {}) as CandidatesBody;
      const metadata = readManualStoryMetadata(root.absolutePath);
      if (!metadata) {
        return reply.code(500).send({ error: "metadata_not_found" });
      }
      const allTemplates = listAllBeatTemplates(root.absolutePath);
      const selectedCastIds = new Set(body.selected_cast ?? []);
      const selectedCast: ManualCharacterProfile[] = [];
      for (const id of selectedCastIds) {
        const c = readRecord(root.absolutePath, "cast", id);
        if (c) selectedCast.push(c as ManualCharacterProfile);
      }

      // Collect active records (across all classes except beat-templates,
      // which is the filter target itself) as filter entries.
      const activeRecords: FilterRecordEntry[] = [];
      const activeSecrets: FilterSecretEntry[] = [];
      const activeLocations: FilterLocationEntry[] = [];
      const RECORD_CLASSES_TO_SCAN = [
        "cast",
        "entities",
        "statuses",
        "locations",
        "objects",
        "facts",
        "beliefs",
        "intentions",
        "plans",
        "emotions",
        "relationships",
        "threads",
        "obligations",
        "consequences",
        "clocks",
        "secrets",
        "questions",
        "artifacts",
      ] as const;
      for (const cls of RECORD_CLASSES_TO_SCAN) {
        const summaries = listRecords(root.absolutePath, cls, {
          includeArchived: false,
        });
        for (const s of summaries) {
          activeRecords.push({
            id: s.id,
            recordClass: cls,
            tags: [...s.tags],
          });
        }
        if (cls === "secrets") {
          for (const s of summaries) {
            const full = readRecord(root.absolutePath, "secrets", s.id) as
              | ManualSecretRecord
              | null;
            if (full && Array.isArray(full.forbidden_reveal_tags)) {
              activeSecrets.push({
                id: full.id,
                forbidden_reveal_tags: [...full.forbidden_reveal_tags],
              });
            }
          }
        }
        if (cls === "locations") {
          for (const s of summaries) {
            activeLocations.push({ id: s.id, tags: [...s.tags] });
          }
        }
      }

      const optionalAuthorPins: {
        moveFamily?: BeatTemplateMoveFamily;
        tags?: string[];
        location?: string;
      } = {};
      if (body.optional_move_family !== undefined) {
        optionalAuthorPins.moveFamily = body.optional_move_family;
      }
      if (body.optional_tags !== undefined) {
        optionalAuthorPins.tags = body.optional_tags;
      }
      if (body.optional_location !== undefined) {
        optionalAuthorPins.location = body.optional_location;
      }

      const candidates = filterBeatTemplates({
        manualStoryRoot: root.absolutePath,
        storyContract: metadata.story_contract,
        promptPolicy: metadata.prompt_policy,
        selectedCast,
        activeRecords,
        activeSecrets,
        activeLocations,
        segmentOrder: metadata.segment_order,
        optionalAuthorPins,
        allTemplates,
      });
      return { candidates };
    },
  );
}
