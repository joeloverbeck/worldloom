import { assembleContextPacket, type ContextPacket } from "../context-packet/assemble";
import type { McpError } from "../errors";
import { TASK_TYPES, type TaskType } from "../ranking/profiles";

export interface GetContextPacketArgs {
  task_type: TaskType;
  world_slug: string;
  seed_nodes: string[];
  token_budget?: number;
}

function assertValidArgs(args: GetContextPacketArgs): void {
  if (args.world_slug.trim().length === 0) {
    throw new Error("world_slug must be non-empty.");
  }

  if (!TASK_TYPES.includes(args.task_type)) {
    throw new Error(`Unsupported task_type '${args.task_type}'.`);
  }

  if (args.seed_nodes.length === 0) {
    throw new Error("seed_nodes must be non-empty.");
  }

  if (args.token_budget !== undefined && args.token_budget <= 0) {
    throw new Error("token_budget must be positive.");
  }
}

export async function getContextPacket(
  args: GetContextPacketArgs
): Promise<ContextPacket | McpError> {
  assertValidArgs(args);

  return assembleContextPacket({
    task_type: args.task_type,
    world_slug: args.world_slug,
    seed_nodes: args.seed_nodes,
    token_budget: args.token_budget ?? 8000
  });
}
