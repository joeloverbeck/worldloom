import type { NodeType } from "@worldloom/world-index/public/types";

import { assembleContextPacket, type ContextPacket } from "../context-packet/assemble.js";
import { withIndexFreshnessGuard } from "../context-packet/freshness-guard.js";
import {
  DEFAULT_DELIVERY_MODE,
  DELIVERY_MODES,
  isStoryPipelineTaskType,
  type DeliveryMode
} from "../context-packet/shared.js";
import type { McpError } from "../errors.js";
import { NODE_TYPES } from "../package-interop.js";
import {
  DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE,
  TASK_TYPES,
  type TaskType
} from "../ranking/profiles/index.js";
import { STORY_SLUG_PATTERN } from "./_shared.js";

export interface GetContextPacketArgs {
  task_type: TaskType;
  world_slug: string;
  story_slug?: string;
  seed_nodes: string[];
  token_budget?: number;
  delivery_mode?: DeliveryMode;
  node_classes?: NodeType[];
}

const STORY_LOCAL_SEED_NODE_PATTERN =
  /^(?:(?:[a-z0-9-]+):)?(?:SF|BEL|SE|DA|OBL|CNSQ|THR|SREL|STINT|STENT|STSTAT|STLOC|STOBJ|CLK|STSEC|STQ|STPLAN|STEMO|BR|PG|CHC|SLT|SLB|SAU|SP|RSP)-\d+$/;
const STORY_LOCAL_SEED_NODE_WARNING = "story_local_seed_nodes_ignored";

function storyLocalSeedNodeWarnings(args: GetContextPacketArgs): string[] {
  if (!isStoryPipelineTaskType(args.task_type)) {
    return [];
  }

  return args.seed_nodes.some((seedNode) => STORY_LOCAL_SEED_NODE_PATTERN.test(seedNode))
    ? [STORY_LOCAL_SEED_NODE_WARNING]
    : [];
}

function seedNodesForAssembly(args: GetContextPacketArgs): string[] {
  if (!isStoryPipelineTaskType(args.task_type)) {
    return args.seed_nodes;
  }

  return args.seed_nodes.filter((seedNode) => !STORY_LOCAL_SEED_NODE_PATTERN.test(seedNode));
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

  if (isStoryPipelineTaskType(args.task_type) && args.story_slug === undefined) {
    throw new Error(`story_slug is required for story-pipeline task_type '${args.task_type}'.`);
  }

  if (args.story_slug !== undefined && !STORY_SLUG_PATTERN.test(args.story_slug)) {
    throw new Error("story_slug must be kebab-case [a-z0-9-]+.");
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

async function getContextPacketImpl(
  args: GetContextPacketArgs
): Promise<ContextPacket | McpError> {
  assertValidArgs(args);
  const seedNodes = seedNodesForAssembly(args);

  const result = await assembleContextPacket({
    task_type: args.task_type,
    world_slug: args.world_slug,
    ...(args.story_slug === undefined ? {} : { story_slug: args.story_slug }),
    seed_nodes: seedNodes,
    token_budget: args.token_budget ?? DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE[args.task_type],
    delivery_mode: args.delivery_mode ?? DEFAULT_DELIVERY_MODE,
    ...(args.node_classes === undefined ? {} : { node_classes: args.node_classes })
  });

  if (!("code" in result)) {
    result.task_header.warnings = [
      ...new Set([...result.task_header.warnings, ...storyLocalSeedNodeWarnings(args)])
    ];
  }

  return result;
}

export const getContextPacket = withIndexFreshnessGuard(getContextPacketImpl);
