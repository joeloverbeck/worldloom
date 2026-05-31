import { existsSync } from "node:fs";
import path from "node:path";

import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";

import {
  registerManualStoriesGetRoute,
  registerManualStoriesWriteRoutes,
} from "./routes/manual-stories.js";
import {
  registerMetadataReadRoute,
  registerMetadataWriteRoute,
} from "./routes/metadata.js";
import {
  registerPromptsReadRoutes,
  registerPromptsWriteRoutes,
} from "./routes/prompts.js";
import {
  registerRecordsReadRoutes,
  registerRecordsWriteRoutes,
} from "./routes/records.js";
import {
  registerSegmentsReadRoutes,
  registerSegmentsWriteRoutes,
} from "./routes/segments.js";
import { registerWorldsRoutes } from "./routes/worlds.js";
import { wrapRouterWritable } from "./write-scope-guard.js";

export interface CreateServerOptions {
  repoRoot: string;
  port?: number;
}

async function registerStaticServe(server: FastifyInstance, repoRoot: string): Promise<void> {
  const webDistPath = path.resolve(repoRoot, "tools/manual-story-studio/web/dist");
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
  const server = Fastify({
    logger: false,
    genReqId: () => crypto.randomUUID(),
  });

  await registerStaticServe(server, options.repoRoot);

  await registerWorldsRoutes(server, { repoRoot: options.repoRoot });
  await registerManualStoriesGetRoute(server, { repoRoot: options.repoRoot });
  await registerRecordsReadRoutes(server, { repoRoot: options.repoRoot });
  await registerMetadataReadRoute(server, { repoRoot: options.repoRoot });
  await registerPromptsReadRoutes(server, { repoRoot: options.repoRoot });
  await registerSegmentsReadRoutes(server, { repoRoot: options.repoRoot });

  await wrapRouterWritable(server, async (writableRouter) => {
    await registerManualStoriesWriteRoutes(writableRouter, {
      repoRoot: options.repoRoot,
    });
    await registerRecordsWriteRoutes(writableRouter, {
      repoRoot: options.repoRoot,
    });
    await registerMetadataWriteRoute(writableRouter, {
      repoRoot: options.repoRoot,
    });
    await registerPromptsWriteRoutes(writableRouter, {
      repoRoot: options.repoRoot,
    });
    await registerSegmentsWriteRoutes(writableRouter, {
      repoRoot: options.repoRoot,
    });
  });

  return server;
}
