import { existsSync } from "node:fs";
import path from "node:path";

import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";

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

  await wrapRouterWritable(server, async (_writableRouter) => {
    // Ticket 007 registers registerManualStoriesWriteRoutes here for the POST create path.
  });

  return server;
}
