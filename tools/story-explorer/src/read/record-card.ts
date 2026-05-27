import { recordClass } from "./record-io.js";
import type { RecordCard, RecordField, RecordGroup, RecordProvenanceSummary } from "../view-models/record-card.js";
import type { RecordLink } from "../view-models/record-link.js";

type ParsedRecord = Record<string, unknown>;

interface SummaryRule {
  group: RecordGroup;
  primaryFields: string[];
  secondaryFields?: string[];
  statusField?: string;
  visibilityField?: string;
  confidenceField?: string;
  urgencyField?: string;
  participantFields?: string[];
}

export interface BuildRecordCardOptions {
  sourcePath?: string | null;
  contentHash?: string | null;
  provenance?: Partial<RecordProvenanceSummary>;
}

const SUMMARY_RULES: Record<string, SummaryRule> = {
  BEL: {
    group: "Knowledge & Truth",
    primaryFields: ["claim"],
    secondaryFields: ["holder", "belief_mode", "truth_relation"],
    visibilityField: "visibility",
    confidenceField: "confidence",
    participantFields: ["holder"],
  },
  BR: {
    group: "Event Delta",
    primaryFields: ["label"],
    secondaryFields: ["description", "parent_branch_id", "forked_at_page_id", "root_page_id"],
  },
  CHC: {
    group: "Event Delta",
    primaryFields: ["surface_label", "player_visible_intent"],
    secondaryFields: ["target_or_action_families", "likely_state_pressure", "grounded_in"],
  },
  CLK: {
    group: "Pressure & Open Loops",
    primaryFields: ["title"],
    secondaryFields: ["clock_kind", "current_tick", "max_tick", "stakes"],
    statusField: "status",
    visibilityField: "visibility",
    urgencyField: "salience",
  },
  CNSQ: {
    group: "Pressure & Open Loops",
    primaryFields: ["description"],
    secondaryFields: ["consequence_kind", "resolves_when"],
    statusField: "status",
    urgencyField: "urgency",
  },
  DA: {
    group: "Knowledge & Truth",
    primaryFields: ["title"],
    secondaryFields: ["author", "genre", "truth_relation"],
  },
  OBL: {
    group: "Relationships & Debts",
    primaryFields: ["description"],
    secondaryFields: ["obligation_kind", "owed_by", "owed_to", "trigger_to_close"],
    statusField: "status",
    urgencyField: "urgency",
    participantFields: ["owed_by", "owed_to"],
  },
  PG: {
    group: "Event Delta",
    primaryFields: ["id"],
    secondaryFields: ["branch_id", "parent_page_id", "turn_index"],
  },
  RSP: {
    group: "Validation & Integrity",
    primaryFields: ["title", "status", "holder", "recommendation"],
    secondaryFields: ["severity", "finding", "target_record"],
    statusField: "status",
    urgencyField: "severity",
    participantFields: ["holder"],
  },
  SAU: {
    group: "Validation & Integrity",
    primaryFields: ["title", "status", "scope", "verdict"],
    secondaryFields: ["audited_story", "audited_branch", "summary"],
    statusField: "status",
  },
  SE: {
    group: "Event Delta",
    primaryFields: ["event_kind", "outcome_route", "world_logic_rationale"],
    secondaryFields: ["actor", "targets", "turn_driver", "driver_records"],
    visibilityField: "pov_visibility",
    participantFields: ["actor", "targets"],
  },
  SF: {
    group: "Knowledge & Truth",
    primaryFields: ["claim"],
    secondaryFields: ["authority", "derived_from", "scope"],
    visibilityField: "authority",
  },
  SLB: {
    group: "Plans & Emotion",
    primaryFields: ["title", "move_family", "scope_visibility"],
    secondaryFields: ["branch_scope", "status"],
    statusField: "status",
    visibilityField: "scope_visibility",
  },
  SLT: {
    group: "Plans & Emotion",
    primaryFields: ["title"],
    secondaryFields: ["author_scope", "eligibility", "saliency"],
    visibilityField: "author_scope.visibility",
    urgencyField: "saliency.urgency",
  },
  SP: {
    group: "Validation & Integrity",
    primaryFields: ["title", "status", "claim", "holder"],
    secondaryFields: ["promotion_kind", "target_record", "rationale"],
    statusField: "status",
    participantFields: ["holder"],
  },
  SREL: {
    group: "Relationships & Debts",
    primaryFields: ["description"],
    secondaryFields: ["axis", "participants", "direction", "value", "valence"],
    participantFields: ["participants"],
  },
  STCHAR: {
    group: "Cast & Status",
    primaryFields: ["title", "name", "display_name", "status"],
    secondaryFields: ["profile_kind", "source_char_id", "created_from"],
    statusField: "status",
  },
  STEMO: {
    group: "Plans & Emotion",
    primaryFields: ["emotion", "description", "holder"],
    secondaryFields: ["target", "intensity", "reason"],
    statusField: "status",
    urgencyField: "intensity",
    participantFields: ["holder", "target"],
  },
  STENT: {
    group: "Cast & Status",
    primaryFields: ["display_name", "name"],
    secondaryFields: ["bound_stchar_id", "role_in_story"],
  },
  STINT: {
    group: "Plans & Emotion",
    primaryFields: ["intent"],
    secondaryFields: ["holder", "expires_when"],
    urgencyField: "urgency",
    participantFields: ["holder"],
  },
  STLOC: {
    group: "Scene & Affordances",
    primaryFields: ["label", "description"],
    secondaryFields: ["region", "access"],
  },
  STOBJ: {
    group: "Scene & Affordances",
    primaryFields: ["label", "description"],
    secondaryFields: ["owner", "current_location"],
    participantFields: ["owner"],
  },
  STPLAN: {
    group: "Plans & Emotion",
    primaryFields: ["objective"],
    secondaryFields: ["root_intention", "plan_status", "resources", "next_steps"],
    statusField: "plan_status",
  },
  STQ: {
    group: "Pressure & Open Loops",
    primaryFields: ["question_or_setup"],
    secondaryFields: ["question_kind", "answer_conditions"],
    statusField: "status",
    visibilityField: "audience_visibility",
    urgencyField: "salience",
  },
  STSEC: {
    group: "Knowledge & Truth",
    primaryFields: ["secret_claim"],
    secondaryFields: ["secret_kind", "holders", "reveal_conditions"],
    statusField: "status",
    urgencyField: "salience",
    participantFields: ["holders"],
  },
  STSTAT: {
    group: "Cast & Status",
    primaryFields: ["entity", "life", "agency", "location"],
    secondaryFields: ["conditions", "resources", "affordances"],
    statusField: "life",
    participantFields: ["entity"],
  },
  THR: {
    group: "Pressure & Open Loops",
    primaryFields: ["title", "summary"],
    secondaryFields: ["thread_kind", "resolution_conditions"],
    statusField: "status",
    urgencyField: "urgency",
  },
};

const EXPLICIT_SUMMARY_FIELDS = ["title", "label", "name", "display_name", "objective", "claim"];
const DEFAULT_MEANINGFUL_FIELDS = [
  "summary",
  "description",
  "secret_claim",
  "question_or_setup",
  "intent",
  "surface_label",
  "player_visible_intent",
  "event_kind",
  "outcome_route",
  "emotion",
  "status",
];
const RECORD_ID_PATTERN = /^(?:STENT|STCHAR|STSTAT|SF|BEL|SE|OBL|CNSQ|THR|SREL|STINT|STLOC|STOBJ|CLK|STSEC|STQ|DA|BR|PG|CHC|SLT|STPLAN|STEMO|SLB|SAU|SP|RSP)-[0-9]+$/;

function ruleFor(recordId: string): SummaryRule {
  const className = recordClass(recordId);
  return SUMMARY_RULES[className] ?? {
    group: "Validation & Integrity",
    primaryFields: ["id"],
  };
}

function nestedValue(body: ParsedRecord, path: string): unknown {
  let value: unknown = body;
  for (const part of path.split(".")) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }
    value = (value as ParsedRecord)[part];
  }
  return value;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function stringifyValue(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const parts = value.map((entry) => stringifyValue(entry)).filter((entry): entry is string => entry !== null);
    return parts.length > 0 ? parts.join(", ") : null;
  }
  if (value !== null && typeof value === "object") {
    const id = stringValue((value as ParsedRecord).record_id) ?? stringValue((value as ParsedRecord).id);
    return id;
  }
  return null;
}

function fieldList(body: ParsedRecord, fields: string[] = []): RecordField[] {
  return fields.flatMap((field) => {
    const rendered = stringifyValue(nestedValue(body, field));
    return rendered === null ? [] : [{ name: field, value: rendered }];
  });
}

function firstFieldValue(body: ParsedRecord, fields: string[]): string | null {
  for (const field of fields) {
    const value = stringifyValue(nestedValue(body, field));
    if (value !== null) {
      return value;
    }
  }
  return null;
}

function firstMeaningfulString(body: ParsedRecord, fields: string[]): string | null {
  for (const field of fields) {
    const value = stringValue(nestedValue(body, field));
    if (value !== null && !RECORD_ID_PATTERN.test(value)) {
      return value;
    }
  }
  return null;
}

function summaryLine(recordId: string, body: ParsedRecord, rule: SummaryRule): string {
  const explicit = firstMeaningfulString(body, EXPLICIT_SUMMARY_FIELDS);
  if (explicit !== null) {
    return explicit;
  }

  const primarySummaryFields = rule.primaryFields.filter((field) => field !== "status");
  const classSpecificFields = [...primarySummaryFields, ...DEFAULT_MEANINGFUL_FIELDS].filter((field) => field !== "status");
  const classSpecific = firstMeaningfulString(body, classSpecificFields);
  if (classSpecific !== null) {
    return classSpecific;
  }

  const classSpecificReference = firstFieldValue(body, primarySummaryFields);
  if (classSpecificReference !== null) {
    return classSpecificReference;
  }

  const id = stringValue(body.id);
  if (id !== null) {
    return `${id} (${recordClass(recordId)})`;
  }

  return `Untitled ${recordClass(recordId)} record`;
}

function recordIdsFrom(value: unknown): string[] {
  if (typeof value === "string") {
    return RECORD_ID_PATTERN.test(value) ? [value] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(recordIdsFrom);
  }
  if (value !== null && typeof value === "object") {
    const object = value as ParsedRecord;
    const direct = recordIdsFrom(object.record_id).concat(recordIdsFrom(object.id), recordIdsFrom(object.target_record));
    return direct.concat(Object.values(object).flatMap(recordIdsFrom));
  }
  return [];
}

function linkedRecordIdsFrom(value: unknown, key: string | null = null): string[] {
  if (key === "id" || key === "story_id" || key === "created_at_page") {
    return [];
  }
  if (typeof value === "string") {
    return RECORD_ID_PATTERN.test(value) ? [value] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => linkedRecordIdsFrom(entry));
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value as ParsedRecord).flatMap(([childKey, childValue]) => linkedRecordIdsFrom(childValue, childKey));
  }
  return [];
}

function participants(body: ParsedRecord, rule: SummaryRule): string[] {
  const fields = rule.participantFields ?? [];
  const values = fields.flatMap((field) => recordIdsFrom(nestedValue(body, field)));
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}

function activeRecordSet(activeOnCurrentPage: Iterable<string> | ReadonlySet<string>): Set<string> {
  return activeOnCurrentPage instanceof Set ? new Set(activeOnCurrentPage) : new Set(activeOnCurrentPage);
}

function links(body: ParsedRecord, ownRecordId: string, activeRecords: Set<string>): RecordLink[] {
  const ids = [...new Set(Object.entries(body).flatMap(([key, value]) => linkedRecordIdsFrom(value, key)))]
    .filter((id) => id !== ownRecordId)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  return ids.map((id) => ({
    recordId: id,
    recordClass: recordClass(id),
    label: id,
    relationship: "references",
    targetExists: true,
    activeOnCurrentPage: activeRecords.has(id),
    targetPageId: id.startsWith("PG-") ? id : null,
    brokenReason: null,
  }));
}

function provenance(body: ParsedRecord, options: BuildRecordCardOptions): RecordProvenanceSummary {
  return {
    createdAtPage: options.provenance?.createdAtPage ?? stringValue(body.created_at_page),
    creatingEventId: options.provenance?.creatingEventId ?? null,
    modifyingEventIds: options.provenance?.modifyingEventIds ?? [],
    evidenceRecordIds: options.provenance?.evidenceRecordIds ?? [],
  };
}

export function buildRecordCard(
  recordId: string,
  parsedBody: ParsedRecord,
  activeOnCurrentPage: Iterable<string> | ReadonlySet<string> = [],
  options: BuildRecordCardOptions = {}
): RecordCard {
  const rule = ruleFor(recordId);
  const activeRecords = activeRecordSet(activeOnCurrentPage);

  return {
    recordId,
    recordClass: recordClass(recordId),
    group: rule.group,
    summaryLine: summaryLine(recordId, parsedBody, rule),
    primaryFields: fieldList(parsedBody, rule.primaryFields),
    secondaryFields: fieldList(parsedBody, rule.secondaryFields),
    status: rule.statusField === undefined ? null : stringifyValue(nestedValue(parsedBody, rule.statusField)),
    visibility: rule.visibilityField === undefined ? null : stringifyValue(nestedValue(parsedBody, rule.visibilityField)),
    confidence: rule.confidenceField === undefined ? null : stringifyValue(nestedValue(parsedBody, rule.confidenceField)),
    urgency: rule.urgencyField === undefined ? null : stringifyValue(nestedValue(parsedBody, rule.urgencyField)),
    participants: participants(parsedBody, rule),
    provenance: provenance(parsedBody, options),
    links: links(parsedBody, recordId, activeRecords),
    rawAvailable: true,
    sourcePath: options.sourcePath ?? null,
    contentHash: options.contentHash ?? null,
  };
}

export function recordCardClasses(): string[] {
  return Object.keys(SUMMARY_RULES).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}
