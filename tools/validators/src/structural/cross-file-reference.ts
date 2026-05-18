import type { Context, IndexedEdge, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  FILE_CLASS_TO_SUBDIR,
  asPlainRecord,
  locationFor,
  nestedRecord,
  nestedRecords,
  queryStructuralRecords,
  stringArray,
  stringValue
} from "./utils.js";

const RECORD_REFERENCE_PATTERN = /^(CF|CH|M|OQ|ENT|SEC-[A-Z]{3})-[0-9]+$/;
const INDEXED_REFERENCE_EDGE_TYPES = [
  "state_delta_create",
  "state_delta_supersede",
  "creation_evidence"
] as const;

export const crossFileReference: Validator = {
  name: "cross_file_reference",
  severity_mode: "fail",
  applies_to: () => true,
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const existingIds = new Set(records.map((record) => record.node_id));
    const recordsById = new Map(records.map((record) => [record.node_id, record]));
    const verdicts: Verdict[] = [];

    for (const record of records) {
      const parsed = asPlainRecord(record.parsed);
      const refs = referencesFor(record, parsed);

      for (const ref of refs) {
        if (ref.kind === "record" && !existingIds.has(ref.value)) {
          verdicts.push(orphanReference(record, ref.value, ref.field));
        }
        if (ref.kind === "file_class" && !Object.hasOwn(FILE_CLASS_TO_SUBDIR, ref.value)) {
          verdicts.push({
            validator: "cross_file_reference",
            severity: "fail",
            code: "cross_file_reference.unknown_file_class",
            message: `${record.node_id} references unknown file_class ${ref.value} in ${ref.field}`,
            location: locationFor(record)
          });
        }
      }
    }

    verdicts.push(...(await indexedEdgeReferenceVerdicts(ctx, existingIds, recordsById)));

    return verdicts;
  }
};

type Reference =
  | { kind: "record"; value: string; field: string }
  | { kind: "file_class"; value: string; field: string };

function referencesFor(record: IndexedRecord, parsed: Record<string, unknown>): Reference[] {
  const refs: Reference[] = [];

  if (record.node_type === "canon_fact_record") {
    for (const value of stringArray(nestedRecord(parsed, "source_basis").derived_from)) {
      refs.push({ kind: "record", value, field: "source_basis.derived_from" });
    }
    for (const value of stringArray(parsed.required_world_updates)) {
      refs.push({ kind: "file_class", value, field: "required_world_updates" });
    }
  }

  if (record.node_type === "change_log_entry") {
    for (const value of stringArray(parsed.affected_fact_ids)) {
      refs.push({ kind: "record", value, field: "affected_fact_ids" });
    }
  }

  if (record.node_type === "section") {
    for (const value of stringArray(parsed.touched_by_cf)) {
      refs.push({ kind: "record", value, field: "touched_by_cf" });
    }
  }

  const originatingCf = stringValue(parsed.originating_cf);
  if (originatingCf && originatingCf !== "null") {
    refs.push({ kind: "record", value: originatingCf, field: "originating_cf" });
  }

  for (const entry of [...nestedRecords(parsed, "modification_history"), ...nestedRecords(parsed, "extensions")]) {
    const cf = stringValue(entry.originating_cf);
    const change = stringValue(entry.change_id);
    if (cf) {
      refs.push({ kind: "record", value: cf, field: "originating_cf" });
    }
    if (change) {
      refs.push({ kind: "record", value: change, field: "change_id" });
    }
  }

  return refs.filter((ref) => ref.kind !== "record" || RECORD_REFERENCE_PATTERN.test(ref.value));
}

function orphanReference(record: IndexedRecord, missingId: string, field: string): Verdict {
  return {
    validator: "cross_file_reference",
    severity: "fail",
    code: "cross_file_reference.orphan_reference",
    message: `${record.node_id} references missing ${missingId} in ${field}`,
    location: locationFor(record)
  };
}

async function indexedEdgeReferenceVerdicts(
  ctx: Context,
  existingIds: ReadonlySet<string>,
  recordsById: ReadonlyMap<string, IndexedRecord>
): Promise<Verdict[]> {
  if (!ctx.index.queryEdges) {
    return [];
  }

  const allRelevantEdges = (
    await Promise.all(
      INDEXED_REFERENCE_EDGE_TYPES.map((edgeType) =>
        ctx.index.queryEdges!({
          edge_type: edgeType,
          world_slug: ctx.world_slug,
          story_slug: ctx.story_slug ?? null
        })
      )
    )
  ).flat();
  const creatingSeByCreatedRecord = new Map(
    allRelevantEdges
      .filter((edge) => edge.edge_type === "state_delta_create" && edge.target_node_id !== null)
      .map((edge) => [edge.target_node_id!, edge.source_node_id])
  );

  return allRelevantEdges
    .filter((edge) => edge.target_unresolved_ref !== null)
    .filter((edge) => !existingIds.has(edge.target_unresolved_ref!))
    .map((edge) => danglingIndexedEdge(edge, recordsById, creatingSeByCreatedRecord));
}

function danglingIndexedEdge(
  edge: IndexedEdge,
  recordsById: ReadonlyMap<string, IndexedRecord>,
  creatingSeByCreatedRecord: ReadonlyMap<string, string>
): Verdict {
  const source = recordsById.get(edge.source_node_id);
  const missingId = edge.target_unresolved_ref ?? "<unknown>";
  const authoringSe = edge.edge_type === "creation_evidence" ? creatingSeByCreatedRecord.get(edge.source_node_id) : undefined;
  const authoringSuffix = authoringSe ? ` authored by ${authoringSe}` : "";

  return {
    validator: "cross_file_reference",
    severity: "warn",
    code: `cross_file_reference.dangling_${edge.edge_type}`,
    message: `${edge.source_node_id}${authoringSuffix} has unresolved ${edge.edge_type} target ${missingId}`,
    location: source
      ? locationFor(source)
      : {
          file: "<indexed-edge>",
          node_id: edge.source_node_id
        }
  };
}
