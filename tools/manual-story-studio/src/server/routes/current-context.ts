import { existsSync } from "node:fs";

import type { FastifyInstance, FastifyReply } from "fastify";

import { readCurrentContext } from "../../read/current-context.js";
import { readManualStoryMetadata } from "../../read/manual-story-metadata.js";
import { listAllKnownIds } from "../../read/records.js";
import type { ReadError } from "../../read/result.js";
import type { CurrentContext } from "../../schema/current-context.js";
import { validateCurrentContext } from "../../validate/current-context.js";
import { writeCurrentContext } from "../../write/current-context.js";
import {
  resolveManualStoryRoot,
  type ManualStoryRoot,
} from "../../write/sandbox.js";
import { mapReadErrorToHttpReply } from "../read-error-http.js";

export interface CurrentContextRouteOptions {
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

function mapCurrentContextReadError(
  reply: FastifyReply,
  error: ReadError,
): FastifyReply {
  if (error.code === "current-context-yaml-parse-failed") {
    return reply.code(409).send({
      error: error.code,
      message: error.repair_hint,
      path: error.path,
    });
  }
  return mapReadErrorToHttpReply(reply, error);
}

export async function registerCurrentContextReadRoute(
  server: FastifyInstance,
  options: CurrentContextRouteOptions,
): Promise<void> {
  server.get<{ Params: { slug: string; msSlug: string } }>(
    "/api/worlds/:slug/manual-stories/:msSlug/current-context",
    async (request, reply) => {
      const root = resolveRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return reply.code(404).send({ error: "not_found" });

      const result = readCurrentContext(root.absolutePath);
      if (!result.ok) return mapCurrentContextReadError(reply, result.error);
      return result.value;
    },
  );
}

export async function registerCurrentContextWriteRoute(
  server: FastifyInstance,
  options: CurrentContextRouteOptions,
): Promise<void> {
  server.put<{
    Params: { slug: string; msSlug: string };
    Body: CurrentContext;
  }>(
    "/api/worlds/:slug/manual-stories/:msSlug/current-context",
    async (request, reply) => {
      const root = resolveRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return reply.code(404).send({ error: "not_found" });

      const body = request.body;
      if (!body || typeof body !== "object") {
        return badRequest(reply, "current context body required");
      }

      const metadata = readManualStoryMetadata(root.absolutePath);
      if (!metadata.ok) return mapReadErrorToHttpReply(reply, metadata.error);
      const knownIds = listAllKnownIds(root.absolutePath);
      if (!knownIds.ok) return mapReadErrorToHttpReply(reply, knownIds.error);

      const validation = validateCurrentContext(
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

      writeCurrentContext(root, body);
      return reply.code(200).send(body);
    },
  );
}
