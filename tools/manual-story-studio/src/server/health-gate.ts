import type { FastifyReply } from "fastify";

import { computeHealth } from "../health/compute.js";
import type { BlockedAction } from "../health/types.js";

export function blockIfHealthDisallows(
  reply: FastifyReply,
  manualStoryRoot: string,
  action: BlockedAction,
): FastifyReply | null {
  const report = computeHealth(manualStoryRoot);
  if (!report.blocked_actions.includes(action)) return null;
  return reply.code(409).send(report);
}
