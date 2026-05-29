import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import fastifyStatic from "@fastify/static";
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";

import { resolveIndexStatus } from "../read/index-status.js";
import type { IndexStatus } from "../view-models/index-status.js";
import { wrapRouterReadOnly } from "./readonly-guard.js";
import { registerBranchMapRoute } from "./routes/branch-map.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerOverviewRoutes } from "./routes/overview.js";
import { registerPageRoutes } from "./routes/pages.js";
import { registerProseRoutes } from "./routes/prose.js";
import { registerProvenanceRoutes } from "./routes/provenance.js";
import { registerRecordRoutes } from "./routes/records.js";
import { registerSearchRoute } from "./routes/search.js";
import { registerScenesRoutes } from "./routes/scenes.js";
import { registerStoriesRoutes } from "./routes/stories.js";
import { registerTimelineRoutes } from "./routes/timeline.js";
import { registerWorldsRoutes } from "./routes/worlds.js";

export interface CreateServerOptions {
  repoRoot: string;
  port?: number;
}

export interface ResponseEnvelope {
  requestId: string;
  serverVersion: string;
  worldIndexStatus: IndexStatus | null;
}

export interface EnvelopedResponse<T = unknown> {
  _envelope: ResponseEnvelope;
  data: T;
}

type RouteParams = {
  slug?: string;
};

function packageVersion(): string {
  const packagePath = path.resolve(import.meta.dirname, "../../../package.json");
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as { version?: string };
  return packageJson.version ?? "0.0.0";
}

function worldSlugFromRequest(request: FastifyRequest): string | null {
  const params = request.params as RouteParams | undefined;
  return params?.slug ?? null;
}

function envelopeForRequest(
  request: FastifyRequest,
  repoRoot: string,
  serverVersion: string,
): ResponseEnvelope {
  const worldSlug = worldSlugFromRequest(request);

  return {
    requestId: request.id,
    serverVersion,
    worldIndexStatus: worldSlug === null ? null : resolveIndexStatus(worldSlug, repoRoot),
  };
}

function isAlreadyEnveloped(payload: unknown): payload is EnvelopedResponse {
  return typeof payload === "object" && payload !== null && "_envelope" in payload;
}

function installEnvelopeHook(server: FastifyInstance, repoRoot: string, serverVersion: string): void {
  server.addHook(
    "preSerialization",
    async (request: FastifyRequest, _reply: FastifyReply, payload: unknown) => {
      if (isAlreadyEnveloped(payload)) {
        return payload;
      }

      return {
        _envelope: envelopeForRequest(request, repoRoot, serverVersion),
        data: payload,
      };
    },
  );
}

async function registerStaticServe(server: FastifyInstance, repoRoot: string): Promise<void> {
  const webDistPath = path.resolve(repoRoot, "tools/story-explorer/web/dist");
  const indexPath = path.join(webDistPath, "index.html");

  if (!existsSync(indexPath)) {
    return;
  }

  await server.register(fastifyStatic, {
    root: webDistPath,
    prefix: "/",
    wildcard: false,
  });

  server.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith("/api")) {
      return reply.code(404).send({ error: "not_found" });
    }

    return reply.sendFile("index.html");
  });
}

export async function createServer(options: CreateServerOptions): Promise<FastifyInstance> {
  const server = wrapRouterReadOnly(
    Fastify({
      logger: false,
      genReqId: () => crypto.randomUUID(),
    }),
  );
  const serverVersion = packageVersion();

  await registerStaticServe(server, options.repoRoot);
  installEnvelopeHook(server, options.repoRoot, serverVersion);

  await registerHealthRoute(server, { serverVersion });
  await registerWorldsRoutes(server, { repoRoot: options.repoRoot });
  await registerStoriesRoutes(server, { repoRoot: options.repoRoot });
  await registerOverviewRoutes(server, { repoRoot: options.repoRoot });
  await registerTimelineRoutes(server, { repoRoot: options.repoRoot });
  await registerScenesRoutes(server, { repoRoot: options.repoRoot });
  await registerPageRoutes(server, { repoRoot: options.repoRoot });
  await registerRecordRoutes(server, { repoRoot: options.repoRoot });
  await registerProseRoutes(server, { repoRoot: options.repoRoot });
  await registerProvenanceRoutes(server, { repoRoot: options.repoRoot });
  await registerSearchRoute(server);
  await registerBranchMapRoute(server);

  return server;
}
