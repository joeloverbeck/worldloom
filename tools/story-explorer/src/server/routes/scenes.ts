import type { FastifyInstance } from "fastify";

import { readSceneArtifact, readSceneDetail, readSceneList } from "../../read/scene-detail.js";
import { invalidRouteParam, isValidRouteSlug, type InvalidInputBody } from "./params.js";

export interface ScenesRouteOptions {
  repoRoot: string;
}

function isValidBranchId(value: string): boolean {
  return /^BR-[0-9]+$/.test(value);
}

function isValidSceneId(value: string): boolean {
  return /^SCN-[0-9]+$/.test(value);
}

function parseBoolean(value: string | undefined): boolean | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return null;
}

function validateStoryParams(params: { slug: string; storySlug: string }): InvalidInputBody | null {
  if (!isValidRouteSlug(params.slug)) {
    return invalidRouteParam("slug", params.slug, "a lowercase world slug");
  }
  if (!isValidRouteSlug(params.storySlug)) {
    return invalidRouteParam("storySlug", params.storySlug, "a lowercase story slug");
  }
  return null;
}

export async function registerScenesRoutes(
  server: FastifyInstance,
  options: ScenesRouteOptions,
): Promise<void> {
  server.get<{
    Params: { slug: string; storySlug: string };
    Querystring: {
      branchId?: string;
      hasProse?: string;
      receiptVerdict?: "PASS" | "WARN" | "FAIL";
      coverage?: "active" | "superseded";
    };
  }>("/api/worlds/:slug/stories/:storySlug/scenes", async (request, reply) => {
    const paramsError = validateStoryParams(request.params);
    if (paramsError !== null) {
      return reply.code(400).send(paramsError);
    }
    if (request.query.branchId !== undefined && !isValidBranchId(request.query.branchId)) {
      return reply.code(400).send(invalidRouteParam("branchId", request.query.branchId, "a branch id like BR-12"));
    }
    const hasProse = parseBoolean(request.query.hasProse);
    if (hasProse === null) {
      return reply.code(400).send(invalidRouteParam("hasProse", request.query.hasProse ?? "", "true or false"));
    }
    if (
      request.query.receiptVerdict !== undefined &&
      !["PASS", "WARN", "FAIL"].includes(request.query.receiptVerdict)
    ) {
      return reply.code(400).send(invalidRouteParam("receiptVerdict", request.query.receiptVerdict, "PASS, WARN, or FAIL"));
    }
    if (
      request.query.coverage !== undefined &&
      !["active", "superseded"].includes(request.query.coverage)
    ) {
      return reply.code(400).send(invalidRouteParam("coverage", request.query.coverage, "active or superseded"));
    }

    return readSceneList(
      request.params.slug,
      request.params.storySlug,
      {
        ...(request.query.branchId === undefined ? {} : { branchId: request.query.branchId }),
        ...(hasProse === undefined ? {} : { hasProse }),
        ...(request.query.receiptVerdict === undefined ? {} : { receiptVerdict: request.query.receiptVerdict }),
        ...(request.query.coverage === undefined ? {} : { coverage: request.query.coverage }),
      },
      options.repoRoot,
    );
  });

  server.get<{ Params: { slug: string; storySlug: string; sceneId: string } }>(
    "/api/worlds/:slug/stories/:storySlug/scenes/:sceneId",
    async (request, reply) => {
      const paramsError = validateStoryParams(request.params);
      if (paramsError !== null) {
        return reply.code(400).send(paramsError);
      }
      if (!isValidSceneId(request.params.sceneId)) {
        return reply.code(400).send(invalidRouteParam("sceneId", request.params.sceneId, "a scene id like SCN-12"));
      }

      const detail = await readSceneDetail(
        request.params.slug,
        request.params.storySlug,
        request.params.sceneId,
        options.repoRoot,
      );
      if (detail === null) {
        return reply.code(404).send({ error: "not_found", message: `Scene not found: ${request.params.sceneId}` });
      }
      return detail;
    },
  );

  for (const kind of ["plan", "prose", "receipt"] as const) {
    server.get<{ Params: { slug: string; storySlug: string; sceneId: string } }>(
      `/api/worlds/:slug/stories/:storySlug/scenes/:sceneId/${kind}`,
      async (request, reply) => {
        const paramsError = validateStoryParams(request.params);
        if (paramsError !== null) {
          return reply.code(400).send(paramsError);
        }
        if (!isValidSceneId(request.params.sceneId)) {
          return reply.code(400).send(invalidRouteParam("sceneId", request.params.sceneId, "a scene id like SCN-12"));
        }

        const artifact = await readSceneArtifact(
          request.params.slug,
          request.params.storySlug,
          request.params.sceneId,
          kind,
          options.repoRoot,
        );
        if (artifact === null) {
          return reply
            .code(404)
            .send({ error: "not_found", message: `Scene ${kind} not found: ${request.params.sceneId}` });
        }
        return artifact;
      },
    );
  }
}
