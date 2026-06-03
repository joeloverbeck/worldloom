import { existsSync } from "node:fs";

import type { FastifyInstance, FastifyReply } from "fastify";

import { dropLegacyReviewKey, readPromptWorkingSet } from "../../read/prompt-working-set.js";
import { readManualStoryMetadata } from "../../read/manual-story-metadata.js";
import { listAllKnownIds } from "../../read/records.js";
import type { ReadError } from "../../read/result.js";
import type { PromptWorkingSet } from "../../schema/prompt-working-set.js";
import { validatePromptWorkingSet } from "../../validate/prompt-working-set.js";
import { writePromptWorkingSet } from "../../write/prompt-working-set.js";
import {
  resolveManualStoryRoot,
  type ManualStoryRoot,
} from "../../write/sandbox.js";
import { mapReadErrorToHttpReply } from "../read-error-http.js";

export interface PromptWorkingSetRouteOptions {
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

function badRequest(reply: FastifyReply, message: string): FastifyReply {
  return reply.code(400).send({ error: "bad_request", message });
}

function mapPromptWorkingSetReadError(
  reply: FastifyReply,
  error: ReadError,
): FastifyReply {
  if (error.code === "prompt-working-set-yaml-parse-failed") {
    return reply.code(409).send({
      error: error.code,
      message: error.repair_hint,
      path: error.path,
    });
  }
  return mapReadErrorToHttpReply(reply, error);
}

export async function registerPromptWorkingSetReadRoute(
  server: FastifyInstance,
  options: PromptWorkingSetRouteOptions,
): Promise<void> {
  server.get<{ Params: { slug: string; msSlug: string } }>(
    "/api/worlds/:slug/manual-stories/:msSlug/prompt-working-set",
    async (request, reply) => {
      const root = resolveRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return reply.code(404).send({ error: "not_found" });

      const result = readPromptWorkingSet(root.absolutePath);
      if (!result.ok) return mapPromptWorkingSetReadError(reply, result.error);
      return result.value;
    },
  );
}

export async function registerPromptWorkingSetWriteRoute(
  server: FastifyInstance,
  options: PromptWorkingSetRouteOptions,
): Promise<void> {
  server.put<{
    Params: { slug: string; msSlug: string };
    Body: PromptWorkingSet;
  }>(
    "/api/worlds/:slug/manual-stories/:msSlug/prompt-working-set",
    async (request, reply) => {
      const root = resolveRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return reply.code(404).send({ error: "not_found" });

      const body = dropLegacyReviewKey(request.body);
      if (!body || typeof body !== "object") {
        return badRequest(reply, "prompt working set body required");
      }

      const metadata = readManualStoryMetadata(root.absolutePath);
      if (!metadata.ok) return mapReadErrorToHttpReply(reply, metadata.error);
      const knownIds = listAllKnownIds(root.absolutePath);
      if (!knownIds.ok) return mapReadErrorToHttpReply(reply, knownIds.error);

      const validation = validatePromptWorkingSet(
        body,
        knownIds.value,
        metadata.value.segment_order,
      );
      if (!validation.ok) {
        return reply.code(422).send({
          error: "validation_failed",
          findings: validation.errors,
        });
      }

      writePromptWorkingSet(root, body);
      return reply.code(200).send(body);
    },
  );
}
