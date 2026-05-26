import { createMcpError, type McpError } from "../errors.js";

import { allocateManyIds } from "./allocate-many-ids.js";
import { getRecord, isMcpError } from "./get-record.js";

export const STORY_STATE_MAINTENANCE_RECORD_TYPES = [
  "story_emotion_record",
  "story_plan_record",
  "relationship_record_story",
  "choice_record"
] as const;

export type StoryStateMaintenanceRecordType =
  (typeof STORY_STATE_MAINTENANCE_RECORD_TYPES)[number];

type StoryMaintenanceAction = "create" | "supersede";

interface MaintenanceRecordSpec {
  idClass: "STEMO" | "STPLAN" | "SREL" | "CHC";
  allocationKey: "stemo_ids" | "stplan_ids" | "srel_ids" | "chc_ids";
  operation: "create_stemo_record" | "create_stplan_record" | "create_srel_record" | "create_chc_record";
  sourceDir: "emotions" | "plans" | "relationships" | "choices";
  prefixPattern: RegExp;
}

export interface StoryStateMaintenanceOperationInput {
  action: StoryMaintenanceAction;
  record_type: StoryStateMaintenanceRecordType;
  record: Record<string, unknown>;
  supersedes?: string;
}

export interface PlanStoryStateMaintenanceArgs {
  world_slug: string;
  story_slug: string;
  reason: string;
  source_ticket: string;
  operations: StoryStateMaintenanceOperationInput[];
}

interface PlannedOperation {
  action: StoryMaintenanceAction;
  record_type: StoryStateMaintenanceRecordType;
  allocated_id: string;
  supersedes?: string;
  op: MaintenanceRecordSpec["operation"];
  target_file: string;
}

export interface PlanStoryStateMaintenanceResponse {
  status: "planned";
  world_slug: string;
  story_slug: string;
  reason: string;
  source_ticket: string;
  planned_operations: PlannedOperation[];
  affected_records: Array<{
    record_id: string;
    record_type: StoryStateMaintenanceRecordType;
    content_hash: string;
    file_path: string;
  }>;
  patch_plan: {
    plan_id: string;
    target_world: string;
    approval_token: string;
    verdict: string;
    originating_skill: string;
    expected_id_allocations: Record<string, string[]>;
    patches: Array<{
      op: MaintenanceRecordSpec["operation"];
      target_world: string;
      target_file: string;
      payload: {
        story_slug: string;
        record: Record<string, unknown>;
      };
    }>;
  };
  next_steps: {
    validate: "Call mcp__worldloom__validate_patch_plan with patch_plan before requesting approval.";
    submit: "After explicit user approval, sign this exact patch_plan and call mcp__worldloom__submit_patch_plan with the approval token.";
  };
}

const RECORD_SPECS: Record<StoryStateMaintenanceRecordType, MaintenanceRecordSpec> = {
  story_emotion_record: {
    idClass: "STEMO",
    allocationKey: "stemo_ids",
    operation: "create_stemo_record",
    sourceDir: "emotions",
    prefixPattern: /^STEMO-\d+$/
  },
  story_plan_record: {
    idClass: "STPLAN",
    allocationKey: "stplan_ids",
    operation: "create_stplan_record",
    sourceDir: "plans",
    prefixPattern: /^STPLAN-\d+$/
  },
  relationship_record_story: {
    idClass: "SREL",
    allocationKey: "srel_ids",
    operation: "create_srel_record",
    sourceDir: "relationships",
    prefixPattern: /^SREL-\d+$/
  },
  choice_record: {
    idClass: "CHC",
    allocationKey: "chc_ids",
    operation: "create_chc_record",
    sourceDir: "choices",
    prefixPattern: /^CHC-\d+$/
  }
};

function invalidInput(message: string, field: string): McpError {
  return createMcpError("invalid_input", message, { field });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function planIdFor(sourceTicket: string, storySlug: string): string {
  const ticketSlug = sourceTicket
    .toLowerCase()
    .replace(/\.md$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `story-maintenance-${ticketSlug || "unspecified"}-${storySlug}`;
}

function allocationKeyFor(spec: MaintenanceRecordSpec): string {
  return spec.allocationKey;
}

function withAllocatedFields(args: {
  action: StoryMaintenanceAction;
  allocatedId: string;
  record: Record<string, unknown>;
  supersedes?: string;
  fieldPath: string;
}): Record<string, unknown> | McpError {
  const existingId = args.record.id;
  if (existingId !== undefined && existingId !== args.allocatedId) {
    return invalidInput(
      `operations record id '${String(existingId)}' does not match allocated id '${args.allocatedId}'. Omit id or use the allocated id.`,
      `${args.fieldPath}.record.id`
    );
  }

  const next: Record<string, unknown> = { ...args.record, id: args.allocatedId };
  if (args.action === "create") {
    if (!Object.hasOwn(next, "supersedes")) {
      next.supersedes = null;
    }
    return next;
  }

  const supersedes = args.supersedes;
  if (supersedes === undefined) {
    return invalidInput("supersedes is required for supersede maintenance operations.", `${args.fieldPath}.supersedes`);
  }

  const existingSupersedes = args.record.supersedes;
  if (existingSupersedes !== undefined && existingSupersedes !== supersedes) {
    return invalidInput(
      `operations record supersedes '${String(existingSupersedes)}' does not match requested predecessor '${supersedes}'.`,
      `${args.fieldPath}.record.supersedes`
    );
  }

  return { ...next, supersedes };
}

export async function planStoryStateMaintenance(
  args: PlanStoryStateMaintenanceArgs
): Promise<PlanStoryStateMaintenanceResponse | McpError> {
  if (args.operations.length === 0) {
    return invalidInput("operations must contain at least one maintenance operation.", "operations");
  }

  for (const [index, operation] of args.operations.entries()) {
    const fieldPath = `operations[${index}]`;
    const spec = RECORD_SPECS[operation.record_type];
    if (spec === undefined) {
      return invalidInput(`Unsupported maintenance record_type '${operation.record_type}'.`, `${fieldPath}.record_type`);
    }
    if (!isRecord(operation.record)) {
      return invalidInput("record must be an object.", `${fieldPath}.record`);
    }
    if (operation.action === "supersede") {
      if (operation.supersedes === undefined || !spec.prefixPattern.test(operation.supersedes)) {
        return invalidInput(
          `${operation.record_type} supersede operations require a same-class supersedes id.`,
          `${fieldPath}.supersedes`
        );
      }
    }
  }

  const allocationResult = await allocateManyIds({
    world_slug: args.world_slug,
    allocations: args.operations.map((operation) => ({
      id_class: RECORD_SPECS[operation.record_type].idClass,
      story_slug: args.story_slug
    }))
  });
  if ("code" in allocationResult) {
    return allocationResult;
  }

  const affectedRecords: PlanStoryStateMaintenanceResponse["affected_records"] = [];
  const plannedOperations: PlannedOperation[] = [];
  const patches: PlanStoryStateMaintenanceResponse["patch_plan"]["patches"] = [];
  const expectedIdAllocations: Record<string, string[]> = {};

  for (const [index, operation] of args.operations.entries()) {
    const fieldPath = `operations[${index}]`;
    const spec = RECORD_SPECS[operation.record_type];
    const allocatedId = allocationResult.allocations[index]?.allocated_id;
    if (allocatedId === undefined) {
      return invalidInput("ID allocation did not return an entry for this operation.", fieldPath);
    }

    if (operation.action === "supersede") {
      const prior = await getRecord({
        world_slug: args.world_slug,
        story_slug: args.story_slug,
        record_id: operation.supersedes!
      });
      if (isMcpError(prior)) {
        return prior;
      }
      affectedRecords.push({
        record_id: operation.supersedes!,
        record_type: operation.record_type,
        content_hash: prior.content_hash,
        file_path: prior.file_path
      });
    }

    const record = withAllocatedFields({
      action: operation.action,
      allocatedId,
      record: operation.record,
      ...(operation.supersedes === undefined ? {} : { supersedes: operation.supersedes }),
      fieldPath
    });
    if (isMcpError(record)) {
      return record;
    }

    const targetFile = `stories/${args.story_slug}/_source/${spec.sourceDir}/${allocatedId}.yaml`;
    patches.push({
      op: spec.operation,
      target_world: args.world_slug,
      target_file: targetFile,
      payload: {
        story_slug: args.story_slug,
        record
      }
    });
    plannedOperations.push({
      action: operation.action,
      record_type: operation.record_type,
      allocated_id: allocatedId,
      ...(operation.supersedes === undefined ? {} : { supersedes: operation.supersedes }),
      op: spec.operation,
      target_file: targetFile
    });

    const allocationKey = allocationKeyFor(spec);
    expectedIdAllocations[allocationKey] = [
      ...(expectedIdAllocations[allocationKey] ?? []),
      allocatedId
    ];
  }

  return {
    status: "planned",
    world_slug: args.world_slug,
    story_slug: args.story_slug,
    reason: args.reason,
    source_ticket: args.source_ticket,
    planned_operations: plannedOperations,
    affected_records: affectedRecords,
    patch_plan: {
      plan_id: planIdFor(args.source_ticket, args.story_slug),
      target_world: args.world_slug,
      approval_token: "PENDING_HARD_GATE_APPROVAL",
      verdict: "MAINTENANCE_REVIEW",
      originating_skill: "plan_story_state_maintenance",
      expected_id_allocations: expectedIdAllocations,
      patches
    },
    next_steps: {
      validate: "Call mcp__worldloom__validate_patch_plan with patch_plan before requesting approval.",
      submit: "After explicit user approval, sign this exact patch_plan and call mcp__worldloom__submit_patch_plan with the approval token."
    }
  };
}
