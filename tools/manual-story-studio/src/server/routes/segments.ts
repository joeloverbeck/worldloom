import { existsSync } from "node:fs";

import type { FastifyInstance, FastifyReply } from "fastify";

import {
  listSegments,
  readSegmentBody,
  readSegmentSidecar,
} from "../../read/segments.js";
import {
  deleteSegment,
  editSegment,
  saveSegment,
  SegmentReadFailureError,
} from "../../write/segments.js";
import {
  resolveManualStoryRoot,
  type ManualStoryRoot,
} from "../../write/sandbox.js";
import { mapReadErrorToHttpReply } from "../read-error-http.js";

export interface SegmentsRouteOptions {
  repoRoot: string;
}

interface SaveSegmentBody {
  prose?: string;
  title?: string;
  author_note?: string;
  prompt_id?: string | null;
  selected_template?: string | null;
}

interface EditSegmentBody extends SaveSegmentBody {}

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

function isSegmentId(value: string): boolean {
  return /^SEG-\d+$/.test(value);
}

function badRequest(reply: FastifyReply, message: string): FastifyReply {
  return reply.code(400).send({ error: "invalid_input", message });
}

function parseSegmentPayload(
  body: SaveSegmentBody | undefined,
): Required<Pick<SaveSegmentBody, "prose">> & Omit<SaveSegmentBody, "prose"> {
  if (!body || typeof body !== "object" || typeof body.prose !== "string") {
    throw new Error("prose required");
  }
  const parsed: Required<Pick<SaveSegmentBody, "prose">> &
    Omit<SaveSegmentBody, "prose"> = { prose: body.prose };
  if (typeof body.title === "string") parsed.title = body.title;
  if (typeof body.author_note === "string") parsed.author_note = body.author_note;
  if (body.prompt_id === null || typeof body.prompt_id === "string") {
    parsed.prompt_id = body.prompt_id;
  }
  if (
    body.selected_template === null ||
    typeof body.selected_template === "string"
  ) {
    parsed.selected_template = body.selected_template;
  }
  return parsed;
}

function writeError(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof SegmentReadFailureError) {
    return mapReadErrorToHttpReply(reply, error.readError);
  }
  const message = error instanceof Error ? error.message : "segment write failed";
  return badRequest(reply, message);
}

export async function registerSegmentsReadRoutes(
  server: FastifyInstance,
  options: SegmentsRouteOptions,
): Promise<void> {
  server.get<{
    Params: { slug: string; msSlug: string };
  }>(
    "/api/worlds/:slug/manual-stories/:msSlug/segments",
    async (request, reply) => {
      const root = resolveRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return reply.code(404).send({ error: "manual_story_not_found" });
      const segments = listSegments({ manualStoryRoot: root.absolutePath });
      if (!segments.ok) return mapReadErrorToHttpReply(reply, segments.error);
      return { segments: segments.value };
    },
  );

  server.get<{
    Params: { slug: string; msSlug: string; segmentId: string };
  }>(
    "/api/worlds/:slug/manual-stories/:msSlug/segments/:segmentId",
    async (request, reply) => {
      const root = resolveRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return reply.code(404).send({ error: "manual_story_not_found" });
      const segmentId = request.params.segmentId;
      if (!isSegmentId(segmentId)) {
        return badRequest(reply, "bad segment id");
      }
      const body = readSegmentBody({
        manualStoryRoot: root.absolutePath,
        segmentId,
      });
      const sidecar = readSegmentSidecar({
        manualStoryRoot: root.absolutePath,
        segmentId,
      });
      if (!body.ok) return mapReadErrorToHttpReply(reply, body.error);
      if (!sidecar.ok) return mapReadErrorToHttpReply(reply, sidecar.error);
      return { body: body.value, sidecar: sidecar.value };
    },
  );
}

export async function registerSegmentsWriteRoutes(
  server: FastifyInstance,
  options: SegmentsRouteOptions,
): Promise<void> {
  server.post<{
    Params: { slug: string; msSlug: string };
    Body: SaveSegmentBody;
  }>(
    "/api/worlds/:slug/manual-stories/:msSlug/segments",
    async (request, reply) => {
      const root = resolveRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return reply.code(404).send({ error: "manual_story_not_found" });
      let payload: ReturnType<typeof parseSegmentPayload>;
      try {
        payload = parseSegmentPayload(request.body);
      } catch (error) {
        return writeError(reply, error);
      }
      try {
        const result = saveSegment({ root, ...payload });
        return reply.code(201).send({
          segment_id: result.segment_id,
          sidecar: result.sidecar,
          checklist_payload: result.checklist_payload,
        });
      } catch (error) {
        return writeError(reply, error);
      }
    },
  );

  server.put<{
    Params: { slug: string; msSlug: string; segmentId: string };
    Body: EditSegmentBody;
  }>(
    "/api/worlds/:slug/manual-stories/:msSlug/segments/:segmentId",
    async (request, reply) => {
      const root = resolveRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return reply.code(404).send({ error: "manual_story_not_found" });
      const segmentId = request.params.segmentId;
      if (!isSegmentId(segmentId)) {
        return badRequest(reply, "bad segment id");
      }
      const existing = readSegmentSidecar({
        manualStoryRoot: root.absolutePath,
        segmentId,
      });
      if (!existing.ok) return mapReadErrorToHttpReply(reply, existing.error);
      let payload: ReturnType<typeof parseSegmentPayload>;
      try {
        payload = parseSegmentPayload(request.body);
      } catch (error) {
        return writeError(reply, error);
      }
      try {
        const result = editSegment({
          root,
          segment_id: segmentId,
          ...payload,
        });
        return {
          segment_id: result.segment_id,
          sidecar: result.sidecar,
          checklist_payload: result.checklist_payload,
        };
      } catch (error) {
        return writeError(reply, error);
      }
    },
  );

  server.delete<{
    Params: { slug: string; msSlug: string; segmentId: string };
    Querystring: { force?: string };
  }>(
    "/api/worlds/:slug/manual-stories/:msSlug/segments/:segmentId",
    async (request, reply) => {
      const root = resolveRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return reply.code(404).send({ error: "manual_story_not_found" });
      const segmentId = request.params.segmentId;
      if (!isSegmentId(segmentId)) {
        return badRequest(reply, "bad segment id");
      }
      let result: ReturnType<typeof deleteSegment>;
      try {
        result = deleteSegment({
          root,
          segment_id: segmentId,
          force: request.query.force === "true",
        });
      } catch (error) {
        return writeError(reply, error);
      }
      if ("ok" in result && result.ok === false) {
        return reply.code(404).send({ error: "segment_not_found" });
      }
      return result;
    },
  );
}
