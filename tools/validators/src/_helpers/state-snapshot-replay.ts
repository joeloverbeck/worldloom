export type StateSnapshot = Record<string, unknown>;
export type StoryEventOp = Record<string, unknown>;
export type StoryRecordMap = ReadonlyMap<string, Record<string, unknown>>;

// Active-records classes per story state contract §4.2 (PG.state_snapshot.active_records).
// Auxiliary classes (CHC, SLT, BR, PG, SE, ...) are tracked on other PG fields
// or as page-level metadata; they are not part of active_records.
export const ACTIVE_RECORDS_CLASSES = [
  "STENT",
  "STINT",
  "SF",
  "BEL",
  "OBL",
  "CNSQ",
  "THR",
  "SREL",
  "STLOC",
  "STOBJ",
  "DA"
] as const;

export type ActiveRecordsClass = (typeof ACTIVE_RECORDS_CLASSES)[number];

export interface StateDelta {
  create?: readonly string[];
  supersede?: readonly string[];
  close?: readonly string[];
}

export function activeRecordsClassOf(id: string): ActiveRecordsClass | null {
  const match = id.match(/^([A-Z]+)-[0-9]+$/);
  if (match === null) {
    return null;
  }
  const prefix = match[1] as ActiveRecordsClass;
  return (ACTIVE_RECORDS_CLASSES as readonly string[]).includes(prefix) ? prefix : null;
}

export function replayActiveRecords(
  parentActiveRecords: Record<string, readonly string[]>,
  delta: StateDelta
): Record<ActiveRecordsClass, string[]> {
  const next = {} as Record<ActiveRecordsClass, string[]>;
  for (const cls of ACTIVE_RECORDS_CLASSES) {
    const seed = parentActiveRecords[cls];
    next[cls] = Array.isArray(seed)
      ? seed.filter((item): item is string => typeof item === "string")
      : [];
  }

  const dropIds = new Set<string>([
    ...(delta.supersede ?? []),
    ...(delta.close ?? [])
  ]);
  for (const cls of ACTIVE_RECORDS_CLASSES) {
    next[cls] = next[cls].filter((id) => !dropIds.has(id));
  }

  for (const id of delta.create ?? []) {
    const cls = activeRecordsClassOf(id);
    if (cls === null) {
      continue;
    }
    const list = next[cls];
    if (!list.includes(id)) {
      list.push(id);
    }
  }

  return next;
}

export class SnapshotReplayError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "SnapshotReplayError";
    this.code = code;
  }
}

export function replayStateSnapshot(
  parentSnapshot: StateSnapshot,
  ops: readonly StoryEventOp[],
  recordMap: StoryRecordMap
): StateSnapshot {
  const snapshot = cloneRecord(parentSnapshot);
  for (const op of ops) {
    applyEventOp(snapshot, op, recordMap);
  }
  return snapshot;
}

function applyEventOp(snapshot: StateSnapshot, op: StoryEventOp, recordMap: StoryRecordMap): void {
  const opType = stringValue(op.op_type);
  if (!opType) {
    throw new SnapshotReplayError("snapshot_replay_equality.missing_op_type", "Story event op is missing op_type");
  }

  switch (opType) {
    case "fact_create":
      addFact(snapshot, outputRecordId(op), recordMap);
      return;
    case "fact_invalidate":
      for (const id of inputRecordIds(op)) {
        removeFact(snapshot, id);
      }
      addFact(snapshot, outputRecordId(op), recordMap);
      return;
    case "obligation_open":
      appendUniqueList(snapshot, "obligations_open", outputRecordId(op));
      return;
    case "obligation_pay_off":
      moveObligation(snapshot, op, "obligations_paid_off");
      return;
    case "obligation_complicate":
      moveObligation(snapshot, op, "obligations_complicated");
      return;
    case "obligation_abandon":
      moveObligation(snapshot, op, "obligations_abandoned");
      return;
    case "obligation_transfer":
    case "obligation_supersede":
      replaceAcrossLists(snapshot, obligationLists(), inputRecordId(op), outputRecordId(op));
      return;
    case "consequence_open":
      appendUniqueList(snapshot, "consequences_pending", outputRecordId(op));
      return;
    case "consequence_address":
      removeFromList(snapshot, "consequences_pending", inputRecordId(op));
      appendUniqueList(snapshot, "consequences_addressed", outputRecordId(op));
      return;
    case "thread_supersede":
      replaceInList(snapshot, "threads_active", inputRecordId(op), outputRecordId(op));
      return;
    case "relationship_supersede":
      replaceInList(snapshot, "relationships_current", inputRecordId(op), outputRecordId(op));
      return;
    case "intention_refresh":
      replaceOrAppend(snapshot, "intentions_current", inputRecordIds(op), outputRecordId(op));
      return;
    case "cast_change":
      applyCastChange(snapshot, op);
      return;
    case "location_change":
      applyLocationChange(snapshot, op);
      return;
    case "inventory_change":
      applyInventoryChange(snapshot, op);
      return;
    case "canon_sync":
      applyCanonSync(snapshot, op);
      return;
    default:
      throw new SnapshotReplayError(
        "snapshot_replay_equality.unsupported_op_type",
        `Unsupported story event op_type '${opType}'`
      );
  }
}

function addFact(snapshot: StateSnapshot, factId: string, recordMap: StoryRecordMap): void {
  const fact = recordMap.get(factId) ?? {};
  const payload = factPayload(fact);
  const epistemicClass = stringValue(payload.epistemic_class) ?? stringValue(payload.epistemicClass) ?? "objective";

  if (epistemicClass === "objective") {
    appendUniqueList(snapshot, "objective_facts", factId);
  } else if (epistemicClass === "apparent") {
    appendUniqueList(snapshot, "apparent_facts", factId);
  } else if (epistemicClass === "disputed") {
    appendUniqueList(snapshot, "disputed_facts", factId);
  } else if (epistemicClass === "rumor") {
    appendUniqueList(snapshot, "rumor_state", factId);
  } else if (epistemicClass === "belief") {
    for (const actorId of knownBy(payload)) {
      appendActorBelief(snapshot, actorId, factId);
    }
  }

  if (payload.visible_to_reader === true || payload.reader_known === true) {
    appendUniqueList(snapshot, "reader_known_facts", factId);
  }
  for (const actorId of knownBy(payload)) {
    appendActorBelief(snapshot, actorId, factId);
  }
}

function removeFact(snapshot: StateSnapshot, factId: string): void {
  for (const field of ["objective_facts", "apparent_facts", "disputed_facts", "reader_known_facts", "rumor_state"]) {
    removeFromList(snapshot, field, factId);
  }
  const beliefs = plainRecord(snapshot.belief_state_by_actor);
  for (const [actorId, value] of Object.entries(beliefs)) {
    beliefs[actorId] = stringArray(value).filter((id) => id !== factId);
  }
  snapshot.belief_state_by_actor = beliefs;
}

function moveObligation(snapshot: StateSnapshot, op: StoryEventOp, targetField: string): void {
  const inputId = inputRecordId(op);
  const outputId = outputRecordId(op);
  for (const field of obligationLists()) {
    removeFromList(snapshot, field, inputId);
  }
  appendUniqueList(snapshot, targetField, outputId);
}

function applyCastChange(snapshot: StateSnapshot, op: StoryEventOp): void {
  const payload = deterministicPayload(op);
  const castPresent = stringArray(payload.cast_present);
  if (castPresent.length > 0) {
    snapshot.cast_present = castPresent;
  } else {
    for (const id of stringArray(payload.remove_cast).concat(stringArray(payload.cast_removed))) {
      removeFromList(snapshot, "cast_present", id);
    }
    for (const id of stringArray(payload.add_cast).concat(stringArray(payload.cast_added))) {
      appendUniqueList(snapshot, "cast_present", id);
    }
  }

  const entityStatus = plainRecord(snapshot.entity_status);
  for (const [entityId, status] of Object.entries(plainRecord(payload.entity_status))) {
    entityStatus[entityId] = status;
  }
  for (const entityId of stringArray(payload.present_entities)) {
    entityStatus[entityId] = { ...plainRecord(entityStatus[entityId]), present: true };
  }
  for (const entityId of stringArray(payload.absent_entities)) {
    entityStatus[entityId] = { ...plainRecord(entityStatus[entityId]), present: false };
  }
  snapshot.entity_status = entityStatus;
}

function applyLocationChange(snapshot: StateSnapshot, op: StoryEventOp): void {
  const payload = deterministicPayload(op);
  const to = stringValue(payload.to) ?? stringValue(payload.to_location) ?? stringValue(payload.current_location);
  if (to) {
    snapshot.current_location = to;
  }
  const accessible = stringArray(payload.accessible_locations);
  if (accessible.length > 0) {
    snapshot.accessible_locations = accessible;
  }
}

function applyInventoryChange(snapshot: StateSnapshot, op: StoryEventOp): void {
  const payload = deterministicPayload(op);
  const inventoryByEntity = plainRecord(snapshot.inventory_by_entity);

  for (const [entityId, value] of Object.entries(plainRecord(payload.inventory_by_entity))) {
    inventoryByEntity[entityId] = stringArray(value);
  }

  const entityId = stringValue(payload.entity_id) ?? stringValue(payload.owner) ?? stringValue(payload.owner_id);
  if (entityId) {
    const current = stringArray(inventoryByEntity[entityId]);
    const removed = new Set(stringArray(payload.remove_objects).concat(inputRecordIds(op)));
    const kept = current.filter((id) => !removed.has(id));
    inventoryByEntity[entityId] = unique([...kept, ...outputRecordIds(op), ...stringArray(payload.add_objects)]);
  }

  snapshot.inventory_by_entity = inventoryByEntity;

  const objectsInScope = stringArray(payload.objects_in_scope);
  if (objectsInScope.length > 0) {
    snapshot.objects_in_scope = objectsInScope;
    return;
  }
  for (const id of stringArray(payload.remove_objects)) {
    removeFromList(snapshot, "objects_in_scope", id);
  }
  for (const id of stringArray(payload.add_objects).concat(outputRecordIds(op))) {
    appendUniqueList(snapshot, "objects_in_scope", id);
  }
}

function applyCanonSync(snapshot: StateSnapshot, op: StoryEventOp): void {
  const payload = deterministicPayload(op);
  const revision = stringValue(payload.canon_revision) ?? stringValue(payload.change_id);
  if (revision !== undefined) {
    snapshot.canon_revision = revision;
  }
}

function factPayload(fact: Record<string, unknown>): Record<string, unknown> {
  return { ...plainRecord(fact.deterministic_payload), ...fact };
}

function knownBy(record: Record<string, unknown>): string[] {
  return unique([
    ...stringArray(record.known_by),
    ...stringArray(record.visible_to),
    ...stringArray(record.believed_by)
  ]);
}

function appendActorBelief(snapshot: StateSnapshot, actorId: string, factId: string): void {
  const beliefs = plainRecord(snapshot.belief_state_by_actor);
  beliefs[actorId] = unique([...stringArray(beliefs[actorId]), factId]);
  snapshot.belief_state_by_actor = beliefs;
}

function replaceAcrossLists(snapshot: StateSnapshot, fields: readonly string[], inputId: string, outputId: string): void {
  let replaced = false;
  for (const field of fields) {
    replaced = replaceInList(snapshot, field, inputId, outputId) || replaced;
  }
  if (!replaced) {
    appendUniqueList(snapshot, fields[0] ?? "obligations_open", outputId);
  }
}

function replaceOrAppend(snapshot: StateSnapshot, field: string, inputIds: readonly string[], outputId: string): void {
  let replaced = false;
  for (const inputId of inputIds) {
    replaced = replaceInList(snapshot, field, inputId, outputId) || replaced;
  }
  if (!replaced) {
    appendUniqueList(snapshot, field, outputId);
  }
}

function replaceInList(snapshot: StateSnapshot, field: string, inputId: string, outputId: string): boolean {
  const list = stringArray(snapshot[field]);
  const index = list.indexOf(inputId);
  if (index === -1) {
    snapshot[field] = list;
    return false;
  }
  const next = [...list];
  next[index] = outputId;
  snapshot[field] = unique(next);
  return true;
}

function appendUniqueList(snapshot: StateSnapshot, field: string, id: string): void {
  snapshot[field] = unique([...stringArray(snapshot[field]), id]);
}

function removeFromList(snapshot: StateSnapshot, field: string, id: string): void {
  snapshot[field] = stringArray(snapshot[field]).filter((item) => item !== id);
}

function inputRecordId(op: StoryEventOp): string {
  return requiredFirst(inputRecordIds(op), "input_records", op);
}

function outputRecordId(op: StoryEventOp): string {
  return requiredFirst(outputRecordIds(op), "output_records", op);
}

function inputRecordIds(op: StoryEventOp): string[] {
  return stringArray(op.input_records);
}

function outputRecordIds(op: StoryEventOp): string[] {
  return stringArray(op.output_records);
}

function requiredFirst(values: string[], field: string, op: StoryEventOp): string {
  const first = values[0];
  if (first === undefined) {
    throw new SnapshotReplayError(
      "snapshot_replay_equality.missing_record_reference",
      `${stringValue(op.op_type) ?? "Story event op"} requires ${field}[0]`
    );
  }
  return first;
}

function deterministicPayload(op: StoryEventOp): Record<string, unknown> {
  return plainRecord(op.deterministic_payload);
}

function obligationLists(): readonly string[] {
  return ["obligations_open", "obligations_paid_off", "obligations_complicated", "obligations_abandoned"];
}

function plainRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function cloneRecord<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
