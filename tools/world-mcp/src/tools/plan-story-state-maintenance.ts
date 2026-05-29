import {
  ACTIVE_RECORDS_CLASSES,
  type ActiveRecordsClass
} from "@worldloom/validators";

import { createMcpError, type McpError } from "../errors.js";
import { computePgStateHash } from "../package-interop.js";

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
type MaintenanceEventKind = "audit_repair" | "system_repair";
type PatchOperationKind =
  | MaintenanceRecordSpec["operation"]
  | "create_se_record"
  | "create_pg_record";

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
  parent_page_id: string;
  reason: string;
  source_ticket: string;
  event_kind?: MaintenanceEventKind;
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
      op: PatchOperationKind;
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

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function integerValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function cloneRecord(value: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function activeRecordsClassOf(id: string): ActiveRecordsClass | null {
  const prefix = id.match(/^([A-Z]+)-\d+$/)?.[1];
  return prefix !== undefined && (ACTIVE_RECORDS_CLASSES as readonly string[]).includes(prefix)
    ? (prefix as ActiveRecordsClass)
    : null;
}

function replayActiveRecords(
  parentActiveRecords: Record<string, unknown>,
  delta: { create: readonly string[]; supersede: readonly string[]; close: readonly string[] }
): Record<ActiveRecordsClass, string[]> {
  const next = {} as Record<ActiveRecordsClass, string[]>;
  for (const cls of ACTIVE_RECORDS_CLASSES) {
    next[cls] = stringArray(parentActiveRecords[cls]);
  }

  const dropIds = new Set([...delta.supersede, ...delta.close]);
  for (const cls of ACTIVE_RECORDS_CLASSES) {
    next[cls] = next[cls].filter((id) => !dropIds.has(id));
  }

  for (const id of delta.create) {
    const cls = activeRecordsClassOf(id);
    if (cls === null) {
      continue;
    }
    if (!next[cls].includes(id)) {
      next[cls].push(id);
    }
  }

  return next;
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

function introductionTriggerFor(id: string): string | undefined {
  const cls = activeRecordsClassOf(id);
  switch (cls) {
    case "SREL":
      return "trust_axis_becomes_relevant";
    case "STPLAN":
      return "pressure_forces_plan";
    case "STEMO":
      return "accumulated_pressure_crossed_threshold";
    default:
      return undefined;
  }
}

function operationTargetFile(args: {
  storySlug: string;
  sourceDir: MaintenanceRecordSpec["sourceDir"] | "events" | "pages";
  recordId: string;
}): string {
  return `stories/${args.storySlug}/_source/${args.sourceDir}/${args.recordId}.yaml`;
}

function invalidParentPage(message: string, field: string): McpError {
  return createMcpError("invalid_input", message, { field });
}

function withAllocatedFields(args: {
  action: StoryMaintenanceAction;
  allocatedId: string;
  createdAtPage: string;
  createdByEvent: string;
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

  const next: Record<string, unknown> = {
    ...args.record,
    id: args.allocatedId,
    created_at_page: args.createdAtPage
  };
  if (Object.hasOwn(args.record, "created_by_event")) {
    next.created_by_event = args.createdByEvent;
  }
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
  if (!/^PG-\d+$/.test(args.parent_page_id)) {
    return invalidInput("parent_page_id must use PG-<integer> format.", "parent_page_id");
  }
  if (args.operations.length === 0) {
    return invalidInput("operations must contain at least one maintenance operation.", "operations");
  }
  if (
    args.event_kind !== undefined &&
    args.event_kind !== "audit_repair" &&
    args.event_kind !== "system_repair"
  ) {
    return invalidInput("event_kind must be audit_repair or system_repair when supplied.", "event_kind");
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

  const parentPageResult = await getRecord({
    world_slug: args.world_slug,
    story_slug: args.story_slug,
    record_id: args.parent_page_id
  });
  if (isMcpError(parentPageResult)) {
    return parentPageResult;
  }
  if (!("record" in parentPageResult) || !isRecord(parentPageResult.record)) {
    return invalidParentPage("parent_page_id did not resolve to a parsed PG record.", "parent_page_id");
  }

  const parentPage = parentPageResult.record;
  const storyId = stringValue(parentPage.story_id);
  const branchId = stringValue(parentPage.branch_id);
  const parentBranchPath = stringArray(parentPage.branch_path);
  const parentTurnIndex = integerValue(parentPage.turn_index);
  const parentStateHash = stringValue(parentPage.state_hash);
  const parentSnapshot = isRecord(parentPage.state_snapshot) ? parentPage.state_snapshot : undefined;
  const parentActiveRecords =
    parentSnapshot !== undefined && isRecord(parentSnapshot.active_records)
      ? parentSnapshot.active_records
      : undefined;

  if (storyId === undefined) {
    return invalidParentPage("parent page must carry story_id.", "parent_page_id");
  }
  if (branchId === undefined) {
    return invalidParentPage("parent page must carry branch_id.", "parent_page_id");
  }
  if (parentBranchPath.length === 0) {
    return invalidParentPage("parent page must carry branch_path.", "parent_page_id");
  }
  if (parentTurnIndex === undefined) {
    return invalidParentPage("parent page must carry integer turn_index.", "parent_page_id");
  }
  if (parentStateHash === undefined) {
    return invalidParentPage("parent page must carry state_hash.", "parent_page_id");
  }
  if (parentSnapshot === undefined || parentActiveRecords === undefined) {
    return invalidParentPage("parent page must carry state_snapshot.active_records.", "parent_page_id");
  }

  const allocationRequests = [
    ...args.operations.map((operation) => ({
      id_class: RECORD_SPECS[operation.record_type].idClass,
      story_slug: args.story_slug
    })),
    { id_class: "SE" as const, story_slug: args.story_slug },
    { id_class: "PG" as const, story_slug: args.story_slug }
  ];

  const allocationResult = await allocateManyIds({
    world_slug: args.world_slug,
    allocations: allocationRequests
  });
  if ("code" in allocationResult) {
    return allocationResult;
  }

  const eventId = allocationResult.allocations[args.operations.length]?.allocated_id;
  const pageId = allocationResult.allocations[args.operations.length + 1]?.allocated_id;
  if (eventId === undefined || pageId === undefined) {
    return invalidInput("ID allocation did not return SE/PG entries for maintenance page.", "allocations");
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
      createdAtPage: pageId,
      createdByEvent: eventId,
      record: operation.record,
      ...(operation.supersedes === undefined ? {} : { supersedes: operation.supersedes }),
      fieldPath
    });
    if (isMcpError(record)) {
      return record;
    }

    const targetFile = operationTargetFile({
      storySlug: args.story_slug,
      sourceDir: spec.sourceDir,
      recordId: allocatedId
    });
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

  expectedIdAllocations.se_ids = [...(expectedIdAllocations.se_ids ?? []), eventId];
  expectedIdAllocations.pg_ids = [...(expectedIdAllocations.pg_ids ?? []), pageId];

  const createdActiveRecordIds = plannedOperations
    .map((operation) => operation.allocated_id)
    .filter((id) => activeRecordsClassOf(id) !== null);
  const supersededActiveRecordIds = plannedOperations
    .map((operation) => operation.supersedes)
    .filter((id): id is string => id !== undefined && activeRecordsClassOf(id) !== null);
  const stateDelta = {
    create: createdActiveRecordIds,
    supersede: supersededActiveRecordIds,
    close: [] as string[]
  };
  const eventKind = args.event_kind ?? "audit_repair";
  const recordIntroductions = plannedOperations.flatMap((operation) => {
    if (operation.supersedes !== undefined) {
      return [];
    }
    const trigger = introductionTriggerFor(operation.allocated_id);
    const cls = activeRecordsClassOf(operation.allocated_id);
    if (trigger === undefined || cls === null) {
      return [];
    }
    return [{
      record_id: operation.allocated_id,
      class: cls,
      trigger,
      evidence: [eventId],
      distinct_from: [],
      rationale: args.reason
    }];
  });
  const eventRecord: Record<string, unknown> = {
    id: eventId,
    story_id: storyId,
    created_at_page: pageId,
    parent_page_id: args.parent_page_id,
    event_kind: eventKind,
    actor: "system",
    commitment: {
      selected_slt_id: null,
      selection_source: "none",
      alias_bindings: {}
    },
    outcome_route: "accept",
    world_logic_rationale: args.reason,
    record_introductions: recordIntroductions,
    state_relations: [],
    non_propagation_facts: [],
    state_delta: stateDelta
  };

  patches.push({
    op: "create_se_record",
    target_world: args.world_slug,
    target_file: operationTargetFile({ storySlug: args.story_slug, sourceDir: "events", recordId: eventId }),
    payload: {
      story_slug: args.story_slug,
      record: eventRecord
    }
  });

  const nextSnapshot = cloneRecord(parentSnapshot);
  nextSnapshot.active_records = replayActiveRecords(parentActiveRecords, stateDelta);

  const pageRecordDraft: Record<string, unknown> = {
    id: pageId,
    story_id: storyId,
    branch_id: branchId,
    parent_page_id: args.parent_page_id,
    branch_path: [...parentBranchPath, pageId],
    turn_index: parentTurnIndex + 1,
    input: {
      choice_id: null,
      manual_action_text: null,
      resolved_event_id: eventId
    },
    state_hash_parent: parentStateHash,
    state_hash: "0".repeat(64),
    state_snapshot: nextSnapshot,
    emitted_choices: [],
    validation_trace: {
      input_legality: "PASS: maintenance event is system-authored and has no player action input.",
      parent_snapshot_compatibility: "PASS: parent page was loaded by indexed PG retrieval before planning.",
      mystery_invariant_firewall: "PASS: maintenance snapshot preserves parent mystery claims unchanged.",
      branch_isolation: "PASS: maintenance continues the parent branch path without forking.",
      append_only_delta: "PASS: maintenance records are created or superseded through patch-plan ops.",
      consequence_or_terminal: "PASS: maintenance is audit-only state repair and emits no fictional consequence.",
      plan_grounding: "PASS: maintenance SE.state_delta and PG.state_snapshot are grounded in the requested maintenance records.",
      canon_promotion_hold: "PASS: maintenance introduces no canon-candidate or promotion-hold claims.",
      turn_driver_lawfulness: "PASS: audit-only SE has no turn driver and uses selection_source none."
    }
  };
  const pageRecord = {
    ...pageRecordDraft,
    state_hash: computePgStateHash(pageRecordDraft)
  };

  patches.push({
    op: "create_pg_record",
    target_world: args.world_slug,
    target_file: operationTargetFile({ storySlug: args.story_slug, sourceDir: "pages", recordId: pageId }),
    payload: {
      story_slug: args.story_slug,
      record: pageRecord
    }
  });

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
