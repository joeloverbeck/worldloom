import { NODE_TYPES, type NodeType } from "@worldloom/world-index/public/types";

import { assembleContextPacket, type ContextPacket } from "../context-packet/assemble";
import {
  DEFAULT_DELIVERY_MODE,
  DELIVERY_MODES,
  type DeliveryMode
} from "../context-packet/shared";
import type { McpError } from "../errors";
import {
  DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE,
  TASK_TYPES,
  type TaskType
} from "../ranking/profiles";

export interface GetContextPacketArgs {
  task_type: TaskType;
  world_slug: string;
  seed_nodes: string[];
  token_budget?: number;
  delivery_mode?: DeliveryMode;
  node_classes?: NodeType[];
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

  if (args.delivery_mode !== undefined && !DELIVERY_MODES.includes(args.delivery_mode)) {
    throw new Error(`Unsupported delivery_mode '${args.delivery_mode}'.`);
  }

  if (args.node_classes !== undefined) {
    for (const nodeClass of args.node_classes) {
      if (!NODE_TYPES.includes(nodeClass)) {
        throw new Error(`Unsupported node_classes entry '${nodeClass}'.`);
      }
    }
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
    token_budget: args.token_budget ?? DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE[args.task_type],
    delivery_mode: args.delivery_mode ?? DEFAULT_DELIVERY_MODE,
    ...(args.node_classes === undefined ? {} : { node_classes: args.node_classes })
  });
}
