import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  locationFor,
  queryStructuralRecords,
  stringArray,
  stringValue,
  touchedFilesInclude
} from "./utils.js";

const STORY_RECORD_ID = /^(?:STENT|STLOC|STOBJ|BEL|SF|SE|OBL|CNSQ|THR|SREL|DA|STSTAT|STINT|SLT|CHC|BR|PG)-\d+$/;
const GROUNDED_DEPENDENCY = /^(?:STENT|STLOC|STOBJ|BEL|OBL|CNSQ|THR|SREL|DA)-\d+$/;
const AFFORDANCE_DEPENDENCY = /^(?:STLOC|STOBJ)-\d+$/;
const UNAVAILABLE_AGENCY = new Set(["incapacitated", "captive", "dead", "unconscious"]);
const UNAVAILABLE_LOCATION = new Set(["unknown", "concealed", "offstage"]);
const HIGH_SALIENCE_URGENCY = new Set(["high", "critical"]);

export const causalDependencyThreatScan: Validator = {
  name: "causal_dependency_threat_scan",
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) =>
      patch.op === "create_se_record" ||
      patch.op === "create_pg_record" ||
      patch.op === "create_chc_record" ||
      patch.op === "create_slt_record"
    ) === true ||
    touchedFilesInclude(ctx, /^stories\/[^/]+\/_source\/(?:events|pages|choices|storylets)\/(?:SE|PG|CHC|SLT)-\d+\.yaml$/),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const verdicts: Verdict[] = [];
    const storySlugs = new Set(records.map((record) => record.story_slug).filter((slug): slug is string => typeof slug === "string"));

    for (const storySlug of storySlugs) {
      const maps = recordMapsForStory(records, storySlug);
      for (const event of maps.byType.get("story_event_record") ?? []) {
        const eventScan = scanEvent(event, maps);
        verdicts.push(...eventScan.verdicts);
      }
    }

    return verdicts;
  }
};

interface RecordMaps {
  byId: Map<string, IndexedRecord>;
  byType: Map<string, IndexedRecord[]>;
}

interface EventScan {
  event: IndexedRecord;
  eventId: string;
  parsedEvent: Record<string, unknown>;
  childPage: IndexedRecord | undefined;
  closedIds: Set<string>;
  supersededIds: Set<string>;
  createdIds: Set<string>;
  replacementBySuperseded: Map<string, IndexedRecord>;
  clobberedIds: Set<string>;
  unavailableEntities: Set<string>;
  verdicts: Verdict[];
}

function scanEvent(event: IndexedRecord, maps: RecordMaps): EventScan {
  const parsedEvent = asPlainRecord(event.parsed);
  const eventId = stringValue(parsedEvent.id) ?? event.node_id;
  const stateDelta = asPlainRecord(parsedEvent.state_delta);
  const closedIds = new Set(stringArray(stateDelta.close));
  const supersededIds = new Set(stringArray(stateDelta.supersede));
  const createdIds = new Set(stringArray(stateDelta.create));
  const replacementBySuperseded = replacementsFor(supersededIds, maps);
  const clobberedIds = clobberedRecordIds(closedIds, supersededIds, replacementBySuperseded);
  const unavailableEntities = entitiesMadeUnavailable(replacementBySuperseded);
  const childPage = pageResolvedByEvent(eventId, maps);
  const scan: EventScan = {
    event,
    eventId,
    parsedEvent,
    childPage,
    closedIds,
    supersededIds,
    createdIds,
    replacementBySuperseded,
    clobberedIds,
    unavailableEntities,
    verdicts: []
  };

  validateChoiceDependencies(scan, maps);
  validateAffordanceDependencies(scan, maps);
  validateObligations(scan, maps);
  validateStoryletPreconditions(scan, maps);
  return scan;
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

function replacementsFor(supersededIds: ReadonlySet<string>, maps: RecordMaps): Map<string, IndexedRecord> {
  const replacements = new Map<string, IndexedRecord>();
  for (const record of maps.byId.values()) {
    const supersedes = stringValue(asPlainRecord(record.parsed).supersedes);
    if (supersedes !== undefined && supersededIds.has(supersedes)) {
      replacements.set(supersedes, record);
    }
  }
  return replacements;
}

function clobberedRecordIds(
  closedIds: ReadonlySet<string>,
  supersededIds: ReadonlySet<string>,
  replacementBySuperseded: ReadonlyMap<string, IndexedRecord>
): Set<string> {
  const ids = new Set<string>(closedIds);
  for (const supersededId of supersededIds) {
    const replacement = replacementBySuperseded.get(supersededId);
    if (replacement === undefined || supersessionInvalidates(supersededId, replacement)) {
      ids.add(supersededId);
    }
  }
  return ids;
}

function supersessionInvalidates(supersededId: string, replacement: IndexedRecord): boolean {
  const parsed = asPlainRecord(replacement.parsed);
  if (/^STSTAT-\d+$/.test(supersededId)) {
    return statusUnavailable(parsed);
  }
  if (/^(?:STENT|STLOC|STOBJ|OBL|CNSQ|THR|SREL|DA|BEL|SF)-\d+$/.test(supersededId)) {
    return true;
  }
  return false;
}

function statusUnavailable(status: Record<string, unknown>): boolean {
  const life = stringValue(status.life);
  const agency = stringValue(status.agency);
  const location = stringValue(status.location);
  return life === "dead" || UNAVAILABLE_AGENCY.has(agency ?? "") || UNAVAILABLE_LOCATION.has(location ?? "");
}

function entitiesMadeUnavailable(replacementBySuperseded: ReadonlyMap<string, IndexedRecord>): Set<string> {
  const entities = new Set<string>();
  for (const replacement of replacementBySuperseded.values()) {
    if (replacement.node_type !== "story_status_record") {
      continue;
    }
    const parsed = asPlainRecord(replacement.parsed);
    const entity = stringValue(parsed.entity);
    if (entity !== undefined && statusUnavailable(parsed)) {
      entities.add(entity);
    }
  }
  return entities;
}

function pageResolvedByEvent(eventId: string, maps: RecordMaps): IndexedRecord | undefined {
  return (maps.byType.get("page_record") ?? []).find((page) => {
    const input = asPlainRecord(asPlainRecord(page.parsed).input);
    return stringValue(input.resolved_event_id) === eventId;
  });
}

function childActiveIds(scan: EventScan, recordClass: string): Set<string> {
  const activeRecords = asPlainRecord(asPlainRecord(asPlainRecord(scan.childPage?.parsed).state_snapshot).active_records);
  return new Set(stringArray(activeRecords[recordClass]));
}

function activeChoiceIds(scan: EventScan): Set<string> {
  const ids = childActiveIds(scan, "CHC");
  for (const id of stringArray(asPlainRecord(scan.childPage?.parsed).emitted_choices)) {
    ids.add(id);
  }
  return ids;
}

function validateChoiceDependencies(scan: EventScan, maps: RecordMaps): void {
  for (const choiceId of activeChoiceIds(scan)) {
    if (scan.closedIds.has(choiceId) || scan.supersededIds.has(choiceId)) {
      continue;
    }
    const choice = maps.byId.get(choiceId);
    if (choice === undefined) {
      continue;
    }
    const groundedRecords = stringArray(asPlainRecord(asPlainRecord(choice.parsed).grounded_in).records);
    groundedRecords.forEach((dependencyId, index) => {
      if (!GROUNDED_DEPENDENCY.test(dependencyId)) {
        return;
      }
      if (isDependencyClobbered(dependencyId, scan)) {
        scan.verdicts.push(choiceDependencyClobbered(scan, choice, dependencyId, index));
      }
    });
  }
}

function validateAffordanceDependencies(scan: EventScan, maps: RecordMaps): void {
  const dependencies = new Map<string, string>();
  for (const choiceId of activeChoiceIds(scan)) {
    const choice = maps.byId.get(choiceId);
    for (const dependencyId of stringArray(asPlainRecord(asPlainRecord(choice?.parsed).grounded_in).records)) {
      if (AFFORDANCE_DEPENDENCY.test(dependencyId)) {
        dependencies.set(dependencyId, `CHC ${choiceId}`);
      }
    }
  }

  const visibleAffordances = asArray(asPlainRecord(asPlainRecord(scan.childPage?.parsed).state_snapshot).visible_affordances);
  visibleAffordances.forEach((affordance, index) => {
    for (const dependencyId of stringArray(affordance.grounded_in)) {
      if (AFFORDANCE_DEPENDENCY.test(dependencyId)) {
        dependencies.set(dependencyId, `visible_affordances[${index}]`);
      }
    }
  });

  for (const [dependencyId, source] of dependencies) {
    if (isDependencyClobbered(dependencyId, scan) && !hasReplacementDependency(dependencyId, scan, maps)) {
      scan.verdicts.push(affordanceDependencyClobbered(scan, dependencyId, source));
    }
  }
}

function isDependencyClobbered(dependencyId: string, scan: EventScan): boolean {
  if (scan.clobberedIds.has(dependencyId)) {
    return true;
  }
  return /^STENT-\d+$/.test(dependencyId) && scan.unavailableEntities.has(dependencyId);
}

function hasReplacementDependency(dependencyId: string, scan: EventScan, maps: RecordMaps): boolean {
  const replacement = scan.replacementBySuperseded.get(dependencyId);
  const replacementId = stringValue(asPlainRecord(replacement?.parsed).id) ?? replacement?.node_id;
  if (replacementId !== undefined && activeChoiceIds(scan).has(replacementId)) {
    return true;
  }
  const activeIds = new Set<string>([
    ...childActiveIds(scan, "STLOC"),
    ...childActiveIds(scan, "STOBJ"),
    ...childActiveIds(scan, "STENT")
  ]);
  if (replacementId !== undefined && activeIds.has(replacementId)) {
    return true;
  }
  const visibleAffordances = asArray(asPlainRecord(asPlainRecord(scan.childPage?.parsed).state_snapshot).visible_affordances);
  return visibleAffordances.some((affordance) =>
    stringArray(affordance.grounded_in).some((id) => id !== dependencyId && AFFORDANCE_DEPENDENCY.test(id) && maps.byId.has(id))
  );
}

function validateObligations(scan: EventScan, maps: RecordMaps): void {
  const activeObligations = childActiveIds(scan, "OBL");
  for (const obligationId of activeObligations) {
    if (scan.closedIds.has(obligationId)) {
      continue;
    }
    const obligation = maps.byId.get(obligationId);
    if (obligation === undefined) {
      continue;
    }
    const parsed = asPlainRecord(obligation.parsed);
    const unavailableCounterparty = [stringValue(parsed.owed_by), stringValue(parsed.owed_to)].find(
      (counterparty) => counterparty !== undefined && scan.unavailableEntities.has(counterparty)
    );
    if (unavailableCounterparty === undefined) {
      continue;
    }
    if (!obligationTransferred(obligationId, parsed, scan, maps)) {
      scan.verdicts.push(obligationCounterpartyUnavailable(scan, obligation, unavailableCounterparty));
    }
  }
}

function obligationTransferred(
  obligationId: string,
  obligation: Record<string, unknown>,
  scan: EventScan,
  maps: RecordMaps
): boolean {
  const originalBy = stringValue(obligation.owed_by);
  const originalTo = stringValue(obligation.owed_to);
  for (const candidateId of scan.createdIds) {
    const candidate = maps.byId.get(candidateId);
    if (candidate?.node_type !== "obligation_record") {
      continue;
    }
    const parsed = asPlainRecord(candidate.parsed);
    if (stringValue(parsed.id) === obligationId) {
      continue;
    }
    const candidateBy = stringValue(parsed.owed_by);
    const candidateTo = stringValue(parsed.owed_to);
    if ((candidateBy === originalBy && candidateTo !== originalTo) || (candidateTo === originalTo && candidateBy !== originalBy)) {
      return true;
    }
  }
  return false;
}

function validateStoryletPreconditions(scan: EventScan, maps: RecordMaps): void {
  for (const storylet of maps.byType.get("storylet_record") ?? []) {
    const parsed = asPlainRecord(storylet.parsed);
    if (!isHighSalienceStorylet(parsed, maps)) {
      continue;
    }
    const clobberedReference = referencedIds(asPlainRecord(parsed.preconditions).hard).find((id) => isDependencyClobbered(id, scan));
    if (clobberedReference === undefined) {
      continue;
    }
    if (hasReplacementStorylet(scan, maps) || dependentDebtClosed(scan)) {
      continue;
    }
    scan.verdicts.push(sltPreconditionClobbered(scan, storylet, clobberedReference));
  }
}

function isHighSalienceStorylet(storylet: Record<string, unknown>, maps: RecordMaps): boolean {
  const saliencyUrgency = stringValue(asPlainRecord(storylet.saliency).urgency);
  if (HIGH_SALIENCE_URGENCY.has(saliencyUrgency ?? "")) {
    return true;
  }
  for (const id of referencedIds(storylet)) {
    const record = maps.byId.get(id);
    if (record?.node_type === "obligation_record") {
      const urgency = stringValue(asPlainRecord(record.parsed).urgency);
      if (HIGH_SALIENCE_URGENCY.has(urgency ?? "")) {
        return true;
      }
    }
  }
  return false;
}

function hasReplacementStorylet(scan: EventScan, maps: RecordMaps): boolean {
  return [...scan.createdIds].some((id) => maps.byId.get(id)?.node_type === "storylet_record");
}

function dependentDebtClosed(scan: EventScan): boolean {
  return [...scan.closedIds].some((id) => /^(?:OBL|CNSQ|THR)-\d+$/.test(id));
}

function referencedIds(value: unknown): string[] {
  const ids = new Set<string>();
  collectReferencedIds(value, ids);
  return [...ids];
}

function collectReferencedIds(value: unknown, ids: Set<string>): void {
  if (typeof value === "string") {
    for (const match of value.matchAll(/\b(?:STENT|STLOC|STOBJ|BEL|SF|SE|OBL|CNSQ|THR|SREL|DA|STSTAT|STINT|SLT|CHC|BR|PG)-\d+\b/g)) {
      ids.add(match[0]);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectReferencedIds(item, ids));
    return;
  }
  const record = asPlainRecord(value);
  for (const [key, nested] of Object.entries(record)) {
    if (STORY_RECORD_ID.test(key)) {
      ids.add(key);
    }
    collectReferencedIds(nested, ids);
  }
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asPlainRecord) : [];
}

function choiceDependencyClobbered(scan: EventScan, choice: IndexedRecord, dependencyId: string, index: number): Verdict {
  const choiceId = stringValue(asPlainRecord(choice.parsed).id) ?? choice.node_id;
  return {
    validator: "causal_dependency_threat_scan",
    severity: "fail",
    code: "choice_dependency_clobbered",
    message: `${scan.eventId} clobbers ${dependencyId} while ${choiceId} remains player-visible.`,
    location: locationFor(scan.event),
    detail: {
      event_id: scan.eventId,
      choice_id: choiceId,
      dependency_id: dependencyId,
      reference_path: `grounded_in.records[${index}]`
    },
    suggested_fix: "Close or supersede the dependent CHC, preserve the dependency, or emit a replacement grounded choice."
  };
}

function affordanceDependencyClobbered(scan: EventScan, dependencyId: string, source: string): Verdict {
  return {
    validator: "causal_dependency_threat_scan",
    severity: "fail",
    code: "affordance_dependency_clobbered",
    message: `${scan.eventId} clobbers ${dependencyId} while an affordance or grounded choice still depends on it.`,
    location: locationFor(scan.event),
    detail: { event_id: scan.eventId, dependency_id: dependencyId, source },
    suggested_fix: "Remove the affordance/dependent grounding or provide a replacement active location/object/entity."
  };
}

function obligationCounterpartyUnavailable(scan: EventScan, obligation: IndexedRecord, counterpartyId: string): Verdict {
  const obligationId = stringValue(asPlainRecord(obligation.parsed).id) ?? obligation.node_id;
  return {
    validator: "causal_dependency_threat_scan",
    severity: "fail",
    code: "obligation_counterparty_unavailable_without_transfer",
    message: `${scan.eventId} makes ${counterpartyId} unavailable while ${obligationId} remains open.`,
    location: locationFor(scan.event),
    detail: { event_id: scan.eventId, obligation_id: obligationId, counterparty_id: counterpartyId },
    suggested_fix: "Close the obligation or create a transferred replacement obligation in the same state delta."
  };
}

function sltPreconditionClobbered(scan: EventScan, storylet: IndexedRecord, dependencyId: string): Verdict {
  const storyletId = stringValue(asPlainRecord(storylet.parsed).id) ?? storylet.node_id;
  return {
    validator: "causal_dependency_threat_scan",
    severity: "fail",
    code: "slt_precondition_clobbered",
    message: `${scan.eventId} clobbers ${dependencyId} without closing the debt or emitting a replacement storylet.`,
    location: locationFor(scan.event),
    detail: { event_id: scan.eventId, storylet_id: storyletId, dependency_id: dependencyId },
    suggested_fix: "Close/transfer the dependent debt or emit a replacement SLT whose preconditions match the new state."
  };
}
