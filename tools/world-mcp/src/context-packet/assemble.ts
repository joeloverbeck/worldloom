import { openIndexDb } from "../db";
import { createMcpError, type McpError } from "../errors";
import type { TaskType } from "../ranking/profiles";

import { buildConstraints } from "./constraints";
import { buildEnvelope } from "./envelope";
import { buildNucleus } from "./nucleus";
import { buildSuggestedImpact } from "./suggested-impact";
import {
  DEFAULT_BUDGET_SPLIT,
  DEFAULT_PACKET_VERSION,
  estimateNodeTokens,
  estimatePacketTokens,
  estimateTextTokens,
  trimPairedListToBudget,
  trimRisksToBudget,
  uniqueStrings,
  type ContextPacket
} from "./shared";

export { DEFAULT_BUDGET_SPLIT, DEFAULT_PACKET_VERSION } from "./shared";
export type { ContextPacket, ContextPacketArgs } from "./shared";

function makeEmptyPacket(args: {
  taskType: TaskType;
  worldSlug: string;
  seedNodes: string[];
  tokenBudget: number;
}): ContextPacket {
  return {
    task_header: {
      task_type: args.taskType,
      world_slug: args.worldSlug,
      generated_at: new Date().toISOString(),
      token_budget: {
        requested: args.tokenBudget,
        allocated: 0
      },
      seed_nodes: uniqueStrings(args.seedNodes),
      packet_version: DEFAULT_PACKET_VERSION
    },
    nucleus: {
      nodes: [],
      why_included: []
    },
    envelope: {
      nodes: [],
      why_included: []
    },
    constraints: {
      active_rules: [],
      protected_surfaces: [],
      required_output_schema: [],
      prohibited_moves: [],
      open_risks: []
    },
    suggested_impact_surfaces: {
      nodes: [],
      rationale: []
    }
  };
}

function trimPacketToBudget(packet: ContextPacket, requestedBudget: number): void {
  const envelopeBudget = Math.floor(requestedBudget * DEFAULT_BUDGET_SPLIT.envelope);
  trimPairedListToBudget(
    packet.envelope.nodes,
    packet.envelope.why_included,
    envelopeBudget,
    (node, reason) => estimateNodeTokens(node) + estimateTextTokens(reason)
  );

  const suggestedBudget = Math.floor(requestedBudget * DEFAULT_BUDGET_SPLIT.suggested_impact_surfaces);
  trimPairedListToBudget(
    packet.suggested_impact_surfaces.nodes,
    packet.suggested_impact_surfaces.rationale,
    suggestedBudget,
    (node, rationale) => estimateNodeTokens(node) + estimateTextTokens(rationale)
  );

  const fixedConstraintTokens =
    packet.constraints.active_rules.reduce((sum, rule) => sum + estimateTextTokens(rule), 0) +
    packet.constraints.protected_surfaces.reduce(
      (sum, surface) => sum + estimateTextTokens(surface),
      0
    ) +
    packet.constraints.required_output_schema.reduce(
      (sum, schema) => sum + estimateTextTokens(schema),
      0
    ) +
    packet.constraints.prohibited_moves.reduce((sum, move) => sum + estimateTextTokens(move), 0);

  const riskBudget = Math.max(
    0,
    Math.floor(requestedBudget * DEFAULT_BUDGET_SPLIT.constraints) - fixedConstraintTokens
  );
  trimRisksToBudget(packet.constraints.open_risks, riskBudget);

  while (estimatePacketTokens(packet) > requestedBudget && packet.envelope.nodes.length > 0) {
    packet.envelope.nodes.pop();
    packet.envelope.why_included.pop();
  }

  while (
    estimatePacketTokens(packet) > requestedBudget &&
    packet.suggested_impact_surfaces.nodes.length > 0
  ) {
    packet.suggested_impact_surfaces.nodes.pop();
    packet.suggested_impact_surfaces.rationale.pop();
  }

  while (estimatePacketTokens(packet) > requestedBudget && packet.constraints.open_risks.length > 0) {
    packet.constraints.open_risks.pop();
  }
}

export async function assembleContextPacket(args: {
  task_type: TaskType;
  world_slug: string;
  seed_nodes: string[];
  token_budget: number;
}): Promise<ContextPacket | McpError> {
  const opened = openIndexDb(args.world_slug);
  if (!("db" in opened)) {
    return opened;
  }

  try {
    const packet = makeEmptyPacket({
      taskType: args.task_type,
      worldSlug: args.world_slug,
      seedNodes: args.seed_nodes,
      tokenBudget: args.token_budget
    });

    const nucleus = await buildNucleus(opened.db, args.world_slug, args.task_type, args.seed_nodes);
    if ("code" in nucleus) {
      return nucleus;
    }

    packet.nucleus = nucleus;
    const minimumPacketTokens = estimatePacketTokens(packet);
    if (minimumPacketTokens > args.token_budget) {
      return createMcpError(
        "budget_exhausted_nucleus",
        "The required nucleus exceeds the requested token budget. Narrow the seed nodes or raise the budget.",
        {
          requested_budget: args.token_budget,
          minimum_required_budget: minimumPacketTokens
        }
      );
    }

    packet.envelope = await buildEnvelope(opened.db, args.world_slug, nucleus.nodes);
    packet.constraints = await buildConstraints(opened.db, args.world_slug, args.task_type, nucleus.nodes);
    packet.suggested_impact_surfaces = await buildSuggestedImpact(
      opened.db,
      args.world_slug,
      nucleus.nodes
    );

    trimPacketToBudget(packet, args.token_budget);
    packet.task_header.token_budget.allocated = estimatePacketTokens(packet);

    return packet;
  } finally {
    opened.db.close();
  }
}
