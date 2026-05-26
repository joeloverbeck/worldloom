import type { FastifyInstance } from "fastify";

export interface HealthRouteOptions {
  serverVersion: string;
}

export async function registerHealthRoute(
  server: FastifyInstance,
  options: HealthRouteOptions,
): Promise<void> {
  server.get("/api/health", async () => ({
    ok: true,
    version: options.serverVersion,
  }));
}
