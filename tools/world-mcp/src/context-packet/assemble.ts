import { openIndexDb } from "../db";
import { createMcpError, type McpError } from "../errors";
import type { TaskType } from "../ranking/profiles";

import { buildExactRecordLinks } from "./exact-record-links";
import { buildGoverningWorldContext } from "./governing-world-context";
import {
  buildLocalAuthority,
  findLocalAuthoritySourceNodeIds
} from "./local-authority";
import { buildImpactSurfaces } from "./impact-surfaces";
import { buildScopedLocalContext } from "./scoped-local-context";
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

const REQUIRED_PACKET_CLASSES = [
  "local_authority",
  "exact_record_links",
  "scoped_local_context",
  "governing_world_context"
] as const;

type RequiredPacketClass = (typeof REQUIRED_PACKET_CLASSES)[number];

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
    local_authority: {
      nodes: [],
      why_included: []
    },
    exact_record_links: {
      nodes: [],
      why_included: []
    },
    scoped_local_context: {
      nodes: [],
      why_included: []
    },
    governing_world_context: {
      active_rules: [],
      protected_surfaces: [],
      required_output_schema: [],
      prohibited_moves: [],
      open_risks: [],
      nodes: [],
      why_included: []
    },
    impact_surfaces: {
      nodes: [],
      rationale: []
    }
  };
}

function trimPacketToBudget(packet: ContextPacket, requestedBudget: number): void {
  const suggestedBudget = Math.max(
    0,
    Math.floor(requestedBudget * DEFAULT_BUDGET_SPLIT.impact_surfaces)
  );
  trimPairedListToBudget(
    packet.impact_surfaces.nodes,
    packet.impact_surfaces.rationale,
    suggestedBudget,
    (node, rationale) => estimateNodeTokens(node) + estimateTextTokens(rationale)
  );

  const fixedConstraintTokens =
    packet.governing_world_context.active_rules.reduce(
      (sum, rule) => sum + estimateTextTokens(rule),
      0
    ) +
    packet.governing_world_context.protected_surfaces.reduce(
      (sum, surface) => sum + estimateTextTokens(surface),
      0
    ) +
    packet.governing_world_context.required_output_schema.reduce(
      (sum, schema) => sum + estimateTextTokens(schema),
      0
    ) +
    packet.governing_world_context.prohibited_moves.reduce(
      (sum, move) => sum + estimateTextTokens(move),
      0
    ) +
    packet.governing_world_context.nodes.reduce((sum, node) => sum + estimateNodeTokens(node), 0) +
    packet.governing_world_context.why_included.reduce(
      (sum, reason) => sum + estimateTextTokens(reason),
      0
    );

  const riskBudget = Math.max(
    0,
    Math.floor(requestedBudget * DEFAULT_BUDGET_SPLIT.governing_world_context) - fixedConstraintTokens
  );
  trimRisksToBudget(packet.governing_world_context.open_risks, riskBudget);

  while (estimatePacketTokens(packet) > requestedBudget && packet.impact_surfaces.nodes.length > 0) {
    packet.impact_surfaces.nodes.pop();
    packet.impact_surfaces.rationale.pop();
  }

  while (
    estimatePacketTokens(packet) > requestedBudget &&
    packet.governing_world_context.open_risks.length > 0
  ) {
    packet.governing_world_context.open_risks.pop();
  }
}

function classHasRequiredContent(packet: ContextPacket, className: RequiredPacketClass): boolean {
  switch (className) {
    case "local_authority":
    case "exact_record_links":
    case "scoped_local_context":
      return packet[className].nodes.length > 0;
    case "governing_world_context":
      return (
        packet.governing_world_context.nodes.length > 0 ||
        packet.governing_world_context.active_rules.length > 0 ||
        packet.governing_world_context.protected_surfaces.length > 0 ||
        packet.governing_world_context.required_output_schema.length > 0 ||
        packet.governing_world_context.prohibited_moves.length > 0 ||
        packet.governing_world_context.open_risks.length > 0
      );
  }
}

function cloneClassIntoPacket(
  packet: ContextPacket,
  source: ContextPacket,
  className: RequiredPacketClass
): void {
  switch (className) {
    case "local_authority":
      packet.local_authority = {
        nodes: [...source.local_authority.nodes],
        why_included: [...source.local_authority.why_included]
      };
      return;
    case "exact_record_links":
      packet.exact_record_links = {
        nodes: [...source.exact_record_links.nodes],
        why_included: [...source.exact_record_links.why_included]
      };
      return;
    case "scoped_local_context":
      packet.scoped_local_context = {
        nodes: [...source.scoped_local_context.nodes],
        why_included: [...source.scoped_local_context.why_included]
      };
      return;
    case "governing_world_context":
      packet.governing_world_context = {
        active_rules: [...source.governing_world_context.active_rules],
        protected_surfaces: [...source.governing_world_context.protected_surfaces],
        required_output_schema: [...source.governing_world_context.required_output_schema],
        prohibited_moves: [...source.governing_world_context.prohibited_moves],
        open_risks: [...source.governing_world_context.open_risks],
        nodes: [...source.governing_world_context.nodes],
        why_included: [...source.governing_world_context.why_included]
      };
  }
}

function estimateSelfConsistentMinimumBudget(requiredPacket: ContextPacket): number {
  let candidate = estimatePacketTokens(requiredPacket);

  for (;;) {
    const packetForEstimate: ContextPacket = {
      ...requiredPacket,
      task_header: {
        ...requiredPacket.task_header,
        token_budget: {
          ...requiredPacket.task_header.token_budget,
          requested: candidate
        }
      }
    };
    const adjusted = estimatePacketTokens(packetForEstimate);
    if (adjusted <= candidate) {
      return candidate;
    }

    candidate = adjusted;
  }
}

function classifyBudgetInsufficiency(
  completePacket: ContextPacket,
  args: {
    taskType: TaskType;
    worldSlug: string;
    seedNodes: string[];
    tokenBudget: number;
  }
): { minimumRequiredBudget: number; missingClasses: string[]; retainedClasses: string[] } | null {
  const requiredPacket = makeEmptyPacket(args);
  const retainedClasses: string[] = [];

  for (const className of REQUIRED_PACKET_CLASSES) {
    if (!classHasRequiredContent(completePacket, className)) {
      continue;
    }

    cloneClassIntoPacket(requiredPacket, completePacket, className);

    const candidatePacket = makeEmptyPacket(args);
    for (const retainedClassName of [...retainedClasses, className] as RequiredPacketClass[]) {
      cloneClassIntoPacket(candidatePacket, completePacket, retainedClassName);
    }

    if (estimatePacketTokens(candidatePacket) > args.tokenBudget) {
      return {
        minimumRequiredBudget: estimateSelfConsistentMinimumBudget(requiredPacket),
        missingClasses: REQUIRED_PACKET_CLASSES.filter(
          (requiredClassName) =>
            classHasRequiredContent(completePacket, requiredClassName) &&
            !retainedClasses.includes(requiredClassName)
        ),
        retainedClasses
      };
    }

    retainedClasses.push(className);
  }

  return null;
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

    const localAuthoritySourceIds = await findLocalAuthoritySourceNodeIds(
      opened.db,
      args.world_slug,
      args.seed_nodes
    );
    if ("code" in localAuthoritySourceIds) {
      return localAuthoritySourceIds;
    }

    packet.local_authority = buildLocalAuthority(opened.db, args.world_slug, localAuthoritySourceIds);
    packet.exact_record_links = buildExactRecordLinks(
      opened.db,
      args.world_slug,
      localAuthoritySourceIds,
      packet.local_authority.nodes.map((node) => node.id)
    );
    packet.scoped_local_context = buildScopedLocalContext(
      opened.db,
      args.world_slug,
      localAuthoritySourceIds,
      [...packet.local_authority.nodes, ...packet.exact_record_links.nodes]
    );
    packet.governing_world_context = await buildGoverningWorldContext(
      opened.db,
      args.world_slug,
      args.task_type,
      [
        ...packet.local_authority.nodes,
        ...packet.exact_record_links.nodes,
        ...packet.scoped_local_context.nodes
      ]
    );

    const insufficiency = classifyBudgetInsufficiency(packet, {
      taskType: args.task_type,
      worldSlug: args.world_slug,
      seedNodes: args.seed_nodes,
      tokenBudget: args.token_budget
    });
    if (insufficiency !== null) {
      return createMcpError(
        "packet_incomplete_required_classes",
        "The requested token budget cannot fit the required locality-first packet classes.",
        {
          missing_classes: insufficiency.missingClasses,
          requested_budget: args.token_budget,
          minimum_required_budget: insufficiency.minimumRequiredBudget,
          retry_with: { token_budget: insufficiency.minimumRequiredBudget },
          retained_classes: insufficiency.retainedClasses
        }
      );
    }

    packet.impact_surfaces = await buildImpactSurfaces(opened.db, args.world_slug, [
      ...packet.local_authority.nodes,
      ...packet.exact_record_links.nodes,
      ...packet.scoped_local_context.nodes
    ]);

    trimPacketToBudget(packet, args.token_budget);
    packet.task_header.token_budget.allocated = estimatePacketTokens(packet);

    return packet;
  } finally {
    opened.db.close();
  }
}
