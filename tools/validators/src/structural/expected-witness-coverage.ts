import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  locationFor,
  queryStructuralRecords,
  stringArray,
  stringValue,
  touchedFilesInclude
} from "./utils.js";

const AUDIT_ONLY_EVENT_KINDS = new Set(["prose_attach", "promotion_closeout"]);
const PUBLIC_BEL_VISIBILITIES = new Set(["public", "shared", "factional", "rumored"]);
const PUBLIC_DA_CIRCULATION = new Set(["public", "factional"]);
// Excludes direct_observation (covered by direct witness checks), testimony
// (multi-hop chain), inference (not evidence-bearing), and
// authorial_initialization (bundle genesis, not propagation).
const INDIRECT_ACCESS_ROUTES = new Set([
  "document",
  "object_trace",
  "location_trace",
  "rumor",
  "surveillance",
  "institutional_channel",
  "magic_tech"
]);
const UNAVAILABLE_AGENCY = new Set(["incapacitated", "unconscious", "dead"]);
const VALID_NON_PROPAGATION_REASONS = new Set([
  "no_witness",
  "witness_incapacitated",
  "evidence_concealed",
  "institution_suppresses_report",
  "event_leaves_no_accessible_trace"
]);
const TAG_PATTERN = /non_propagation:([A-Za-z_]+)\(group=([^,()[\]\s]+), records=\[([^\]]*)\]\)/g;

export const expectedWitnessCoverage: Validator = {
  name: "expected_witness_coverage",
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => patch.op === "create_se_record") === true ||
    touchedFilesInclude(ctx, /^stories\/[^/]+\/_source\/events\/SE-\d+\.yaml$/),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const verdicts: Verdict[] = [];
    const storySlugs = new Set(records.map((record) => record.story_slug).filter((slug): slug is string => typeof slug === "string"));

    for (const storySlug of storySlugs) {
      const maps = recordMapsForStory(records, storySlug);
      for (const event of maps.byType.get("story_event_record") ?? []) {
        verdicts.push(...validateEvent(event, maps));
      }
    }

    return verdicts;
  }
};

interface RecordMaps {
  byId: Map<string, IndexedRecord>;
  byType: Map<string, IndexedRecord[]>;
}

interface WitnessGroup {
  actorLocation: string;
  directWitnesses: string[];
}

interface ParsedTag {
  reason: string;
  group: string;
  records: string[];
}

function recordMapsForStory(records: readonly IndexedRecord[], storySlug: string): RecordMaps {
  const byId = new Map<string, IndexedRecord>();
  const byType = new Map<string, IndexedRecord[]>();

  for (const record of records) {
    if (record.story_slug !== storySlug) {
      continue;
    }
    const parsed = asPlainRecord(record.parsed);
    const id = stringValue(parsed.id);
    byId.set(record.node_id, record);
    if (id !== undefined) {
      byId.set(id, record);
    }
    const typed = byType.get(record.node_type) ?? [];
    typed.push(record);
    byType.set(record.node_type, typed);
  }

  return { byId, byType };
}

function validateEvent(event: IndexedRecord, maps: RecordMaps): Verdict[] {
  const parsed = asPlainRecord(event.parsed);
  const eventKind = stringValue(parsed.event_kind);
  if (eventKind === undefined || AUDIT_ONLY_EVENT_KINDS.has(eventKind)) {
    return [];
  }

  const eventId = stringValue(parsed.id) ?? event.node_id;
  const actor = stringValue(parsed.actor);
  if (actor === undefined || !/^STENT-\d+$/.test(actor)) {
    return [];
  }

  const group = witnessGroup(event, parsed, actor, maps);
  if (group === undefined || !eventHasWitnessTrigger(parsed, eventId, actor, maps)) {
    return [];
  }

  const directWitnesses = new Set(group.directWitnesses);
  if (directWitnesses.size === 0) {
    return [];
  }

  const belCoverage = belCoverageForEvent(parsed, eventId, group, maps);
  const tags = parseTags(stringValue(parsed.world_logic_rationale) ?? "");
  const directVerdicts = directWitnessVerdicts(event, eventId, group, directWitnesses, belCoverage, tags, maps);
  if (directVerdicts.length > 0) {
    return directVerdicts;
  }

  return indirectPropagationVerdicts(event, parsed, eventId, tags, maps);
}

function directWitnessVerdicts(
  event: IndexedRecord,
  eventId: string,
  group: WitnessGroup,
  directWitnesses: ReadonlySet<string>,
  belCoverage: ReadonlySet<string>,
  tags: readonly ParsedTag[],
  maps: RecordMaps
): Verdict[] {
  if (belCoverage.size === directWitnesses.size) {
    return [];
  }

  const invalidTagRecord = firstInvalidTagRecord(tags, directWitnesses, maps);
  if (invalidTagRecord !== undefined) {
    return [tagRecordsUnresolved(event, eventId, invalidTagRecord)];
  }

  const matchingTag = tags.find((tag) => tagMatchesGroup(tag, group, directWitnesses));
  if (matchingTag !== undefined) {
    return [];
  }

  if (tags.some((tag) => VALID_NON_PROPAGATION_REASONS.has(tag.reason))) {
    return [wrongGroupLabel(event, eventId, group, tags.map((tag) => tag.group))];
  }

  if (belCoverage.size > 0) {
    return [partialBelCoverage(event, eventId, [...directWitnesses].filter((witness) => !belCoverage.has(witness)))];
  }

  return [missingPublicBel(event, eventId, [...directWitnesses])];
}

function indirectPropagationVerdicts(
  event: IndexedRecord,
  parsedEvent: Record<string, unknown>,
  eventId: string,
  tags: readonly ParsedTag[],
  maps: RecordMaps
): Verdict[] {
  const verdicts: Verdict[] = [];
  const creates = stringArray(asPlainRecord(parsedEvent.state_delta).create);

  for (const id of creates) {
    if (!/^DA-\d+$/.test(id)) {
      continue;
    }
    const artifact = maps.byId.get(id);
    if (artifact?.node_type !== "story_diegetic_artifact_record") {
      continue;
    }
    const circulation = stringValue(asPlainRecord(artifact.parsed).circulation);
    if (!PUBLIC_DA_CIRCULATION.has(circulation ?? "")) {
      continue;
    }
    if (hasIndirectBelForArtifact(id, creates, maps) || hasEventLeavesNoAccessibleTraceTag(id, tags)) {
      continue;
    }
    verdicts.push(missingIndirectPropagation(event, eventId, id, circulation ?? "unknown"));
  }

  return verdicts;
}

function hasIndirectBelForArtifact(artifactId: string, createdIds: readonly string[], maps: RecordMaps): boolean {
  for (const id of createdIds) {
    const belief = maps.byId.get(id);
    if (belief?.node_type !== "belief_record") {
      continue;
    }
    const basis = asPlainRecord(asPlainRecord(belief.parsed).basis);
    if (
      stringArray(basis.access_records).includes(artifactId) &&
      INDIRECT_ACCESS_ROUTES.has(stringValue(basis.access_route) ?? "")
    ) {
      return true;
    }
  }
  return false;
}

function hasEventLeavesNoAccessibleTraceTag(artifactId: string, tags: readonly ParsedTag[]): boolean {
  return tags.some((tag) => tag.reason === "event_leaves_no_accessible_trace" && tag.records.includes(artifactId));
}

function witnessGroup(
  event: IndexedRecord,
  parsedEvent: Record<string, unknown>,
  actor: string,
  maps: RecordMaps
): WitnessGroup | undefined {
  const actorStatus = activeStatusForEntity(actor, parentActiveStatusIds(parsedEvent, maps), maps);
  const actorLocation = stringValue(asPlainRecord(actorStatus?.parsed).location);
  if (actorLocation === undefined || !/^STLOC-\d+$/.test(actorLocation)) {
    return undefined;
  }

  const directWitnesses: string[] = [];
  const activeStatusIds = parentActiveStatusIds(parsedEvent, maps);
  for (const entity of maps.byType.get("story_entity_record") ?? []) {
    const entityId = stringValue(asPlainRecord(entity.parsed).id) ?? entity.node_id;
    if (entityId === actor) {
      continue;
    }
    const status = activeStatusForEntity(entityId, activeStatusIds, maps);
    if (status === undefined) {
      continue;
    }
    const parsedStatus = asPlainRecord(status.parsed);
    if (
      stringValue(parsedStatus.location) === actorLocation &&
      stringValue(parsedStatus.life) === "alive" &&
      !UNAVAILABLE_AGENCY.has(stringValue(parsedStatus.agency) ?? "")
    ) {
      directWitnesses.push(entityId);
    }
  }

  return {
    actorLocation,
    directWitnesses: directWitnesses.sort()
  };
}

function parentActiveStatusIds(parsedEvent: Record<string, unknown>, maps: RecordMaps): Set<string> {
  const parentPageId = stringValue(parsedEvent.parent_page_id);
  const page = parentPageId === undefined ? undefined : maps.byId.get(parentPageId);
  const activeRecords = asPlainRecord(asPlainRecord(asPlainRecord(page?.parsed).state_snapshot).active_records);
  return new Set(stringArray(activeRecords.STSTAT));
}

function activeStatusForEntity(entityId: string, activeStatusIds: ReadonlySet<string>, maps: RecordMaps): IndexedRecord | undefined {
  const statuses = (maps.byType.get("story_status_record") ?? []).filter((status) => {
    const parsed = asPlainRecord(status.parsed);
    const statusId = stringValue(parsed.id) ?? status.node_id;
    return stringValue(parsed.entity) === entityId && (activeStatusIds.size === 0 || activeStatusIds.has(statusId));
  });

  const supersededIds = new Set(
    statuses.map((status) => stringValue(asPlainRecord(status.parsed).supersedes)).filter((id): id is string => id !== undefined)
  );
  return statuses.find((status) => {
    const statusId = stringValue(asPlainRecord(status.parsed).id) ?? status.node_id;
    return !supersededIds.has(statusId);
  }) ?? statuses.at(-1);
}

function eventHasWitnessTrigger(
  parsedEvent: Record<string, unknown>,
  eventId: string,
  actor: string,
  maps: RecordMaps
): boolean {
  const stateDelta = asPlainRecord(parsedEvent.state_delta);
  const creates = stringArray(stateDelta.create);
  const supersedes = stringArray(stateDelta.supersede);

  if (creates.some((id) => publicBelForEvent(id, eventId, maps) !== undefined)) {
    return true;
  }
  if (creates.some((id) => publicDiegeticArtifact(id, maps) !== undefined)) {
    return true;
  }
  if ([...creates, ...supersedes].some((id) => /^STENT-\d+$/.test(id))) {
    return true;
  }
  return supersedes.some((id) => {
    const status = maps.byId.get(id);
    return status?.node_type === "story_status_record" && stringValue(asPlainRecord(status.parsed).entity) !== actor;
  });
}

function publicBelForEvent(id: string, eventId: string, maps: RecordMaps): IndexedRecord | undefined {
  const record = maps.byId.get(id);
  if (record?.node_type !== "belief_record") {
    return undefined;
  }
  const parsed = asPlainRecord(record.parsed);
  if (stringValue(asPlainRecord(parsed.basis).source_event) !== eventId) {
    return undefined;
  }
  return PUBLIC_BEL_VISIBILITIES.has(stringValue(parsed.visibility) ?? "") ? record : undefined;
}

function publicDiegeticArtifact(id: string, maps: RecordMaps): IndexedRecord | undefined {
  const record = maps.byId.get(id);
  if (record?.node_type !== "story_diegetic_artifact_record") {
    return undefined;
  }
  return PUBLIC_DA_CIRCULATION.has(stringValue(asPlainRecord(record.parsed).circulation) ?? "") ? record : undefined;
}

function belCoverageForEvent(
  parsedEvent: Record<string, unknown>,
  eventId: string,
  group: WitnessGroup,
  maps: RecordMaps
): Set<string> {
  const covered = new Set<string>();
  const directWitnesses = new Set(group.directWitnesses);
  for (const id of stringArray(asPlainRecord(parsedEvent.state_delta).create)) {
    const belief = publicBelForEvent(id, eventId, maps);
    if (belief === undefined) {
      continue;
    }
    const holder = stringValue(asPlainRecord(belief.parsed).holder);
    if (holder !== undefined && directWitnesses.has(holder)) {
      covered.add(holder);
      continue;
    }
    if (holder === "public" || holder === "group:direct_witnesses") {
      for (const witness of directWitnesses) {
        covered.add(witness);
      }
    }
  }
  return covered;
}

function parseTags(rationale: string): ParsedTag[] {
  return [...rationale.matchAll(TAG_PATTERN)].map((match) => ({
    reason: match[1] ?? "",
    group: match[2] ?? "",
    records: (match[3] ?? "")
      .split(",")
      .map((record) => record.trim())
      .filter((record) => record.length > 0)
  }));
}

function firstInvalidTagRecord(
  tags: readonly ParsedTag[],
  directWitnesses: ReadonlySet<string>,
  maps: RecordMaps
): { tag: ParsedTag; recordId: string } | undefined {
  for (const tag of tags) {
    if (!VALID_NON_PROPAGATION_REASONS.has(tag.reason)) {
      continue;
    }
    for (const recordId of tag.records) {
      if (!maps.byId.has(recordId) || (recordId.startsWith("STENT-") && !directWitnesses.has(recordId))) {
        return { tag, recordId };
      }
    }
  }
  return undefined;
}

function tagMatchesGroup(tag: ParsedTag, group: WitnessGroup, directWitnesses: ReadonlySet<string>): boolean {
  if (!VALID_NON_PROPAGATION_REASONS.has(tag.reason)) {
    return false;
  }
  if (!computedGroupLabels(group).has(tag.group)) {
    return false;
  }
  if (tag.records.length === 0) {
    return tag.reason === "no_witness" && directWitnesses.size === 0;
  }
  return [...directWitnesses].every((witness) => tag.records.includes(witness));
}

function computedGroupLabels(group: WitnessGroup): Set<string> {
  return new Set(["direct", "direct_witnesses", `direct:${group.actorLocation}`, `location:${group.actorLocation}`]);
}

function missingPublicBel(event: IndexedRecord, eventId: string, missingWitnesses: string[]): Verdict {
  return {
    validator: "expected_witness_coverage",
    severity: "fail",
    code: "expected_witness_coverage_missing_public_bel",
    message: `${eventId} has direct witnesses but no BEL coverage or valid non-propagation tag.`,
    location: locationFor(event),
    detail: { event_id: eventId, missing_witnesses: missingWitnesses },
    suggested_fix: "Create BEL records for every direct witness or add a valid non_propagation tag for the direct witness group."
  };
}

function wrongGroupLabel(event: IndexedRecord, eventId: string, group: WitnessGroup, groups: string[]): Verdict {
  return {
    validator: "expected_witness_coverage",
    severity: "fail",
    code: "expected_witness_coverage_wrong_group_label",
    message: `${eventId} uses a non-propagation group label that does not match the computed witness group.`,
    location: locationFor(event),
    detail: { event_id: eventId, groups, expected_groups: [...computedGroupLabels(group)] },
    suggested_fix: "Use group=direct_witnesses or another computed direct-group label in the non_propagation tag."
  };
}

function partialBelCoverage(event: IndexedRecord, eventId: string, missingWitnesses: string[]): Verdict {
  return {
    validator: "expected_witness_coverage",
    severity: "fail",
    code: "expected_witness_coverage_partial_bel_coverage",
    message: `${eventId} creates BEL coverage for only part of the direct witness group.`,
    location: locationFor(event),
    detail: { event_id: eventId, missing_witnesses: missingWitnesses },
    suggested_fix: "Create BEL records for the remaining direct witnesses or use a valid group-level BEL/non_propagation tag."
  };
}

function tagRecordsUnresolved(event: IndexedRecord, eventId: string, invalid: { tag: ParsedTag; recordId: string }): Verdict {
  return {
    validator: "expected_witness_coverage",
    severity: "fail",
    code: "expected_witness_coverage_tag_records_unresolved",
    message: `${eventId} has a non-propagation tag whose records do not resolve to the computed witness group.`,
    location: locationFor(event),
    detail: { event_id: eventId, group: invalid.tag.group, record_id: invalid.recordId },
    suggested_fix: "Use record ids that exist in the story bundle and correspond to the computed direct witness group."
  };
}

function missingIndirectPropagation(event: IndexedRecord, eventId: string, artifactId: string, circulation: string): Verdict {
  return {
    validator: "expected_witness_coverage",
    severity: "fail",
    code: "expected_witness_coverage_missing_indirect_propagation",
    message:
      `${eventId} creates DA ${artifactId} with circulation '${circulation}' but no BEL with indirect access_route ` +
      "(one of: document, object_trace, location_trace, rumor, surveillance, institutional_channel, magic_tech) references it " +
      "and no event_leaves_no_accessible_trace tag covers it.",
    location: locationFor(event),
    detail: { event_id: eventId, artifact_id: artifactId, circulation },
    suggested_fix:
      "Create a BEL whose basis.access_records names the DA and whose basis.access_route is in " +
      "{document, object_trace, location_trace, rumor, surveillance, institutional_channel, magic_tech}, or add a " +
      "non_propagation:event_leaves_no_accessible_trace tag naming the DA in SE.world_logic_rationale."
  };
}
