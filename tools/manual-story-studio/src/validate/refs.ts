import {
  MANUAL_RECORD_CLASS_PREFIXES,
  MANUAL_RECORD_CLASSES,
  type ManualRecord,
  type ManualRecordClass,
} from "../schema/manual-story.js";

export interface RefViolation {
  field: string;
  missingId: string;
  recordId: string;
  recordClass: ManualRecordClass;
}

export type KnownIds = Record<ManualRecordClass, Set<string>> & {
  segments: Set<string>;
};

export type RefSpec =
  | { kind: "single"; class: ManualRecordClass; nullable?: boolean }
  | {
      kind: "single";
      classes: ManualRecordClass[];
      nullable?: boolean;
    }
  | { kind: "pair"; class: ManualRecordClass }
  | { kind: "list"; class: ManualRecordClass }
  | { kind: "segment"; nullable?: boolean };

export const PER_CLASS_REF_SPECS: Partial<
  Record<ManualRecordClass, Record<string, RefSpec>>
> = {
  beliefs: {
    holder: { kind: "single", class: "cast" },
  },
  intentions: {
    holder: { kind: "single", class: "cast" },
  },
  plans: {
    holder: { kind: "single", class: "cast" },
  },
  emotions: {
    holder: { kind: "single", class: "cast" },
  },
  obligations: {
    owed_by: { kind: "single", class: "cast" },
    owed_to: { kind: "single", class: "cast" },
  },
  relationships: {
    between: { kind: "pair", class: "cast" },
  },
  objects: {
    current_location: {
      kind: "single",
      class: "locations",
      nullable: true,
    },
    current_holder: {
      kind: "single",
      class: "cast",
      nullable: true,
    },
  },
  statuses: {
    subject: {
      kind: "single",
      classes: ["cast", "locations", "objects"],
    },
  },
  consequences: {
    caused_by_segment: { kind: "segment", nullable: true },
  },
  artifacts: {
    current_holder: {
      kind: "single",
      classes: ["cast", "locations"],
      nullable: true,
    },
  },
  secrets: {
    held_by: { kind: "list", class: "cast" },
  },
};

export function emptyKnownIds(): KnownIds {
  const base: Partial<KnownIds> = {};
  for (const cls of MANUAL_RECORD_CLASSES) {
    base[cls] = new Set<string>();
  }
  base.segments = new Set<string>();
  return base as KnownIds;
}

function getRecord(record: ManualRecord): Record<string, unknown> {
  return record as unknown as Record<string, unknown>;
}

function lookupClassFromId(id: string): ManualRecordClass | null {
  for (const cls of MANUAL_RECORD_CLASSES) {
    const prefix = MANUAL_RECORD_CLASS_PREFIXES[cls];
    if (id.startsWith(`${prefix}-`)) {
      return cls;
    }
  }
  return null;
}

function pushViolation(
  out: RefViolation[],
  recordId: string,
  recordClass: ManualRecordClass,
  field: string,
  missingId: string,
): void {
  out.push({ field, missingId, recordId, recordClass });
}

function checkSingleTargetClasses(
  id: string,
  classes: ManualRecordClass[],
  knownIds: KnownIds,
): boolean {
  for (const cls of classes) {
    if (knownIds[cls].has(id)) {
      return true;
    }
  }
  return false;
}

export function validateRefs(
  record: ManualRecord,
  recordClass: ManualRecordClass,
  knownIds: KnownIds,
): RefViolation[] {
  const violations: RefViolation[] = [];
  const recordObj = getRecord(record);
  const recordId = record.id;

  // Common refs.characters / refs.locations / refs.related_records
  const refs = recordObj.refs as
    | { characters?: unknown; locations?: unknown; related_records?: unknown }
    | undefined;
  if (refs) {
    if (Array.isArray(refs.characters)) {
      refs.characters.forEach((entry, i) => {
        if (typeof entry !== "string") return;
        if (!knownIds.cast.has(entry)) {
          pushViolation(
            violations,
            recordId,
            recordClass,
            `refs.characters[${i}]`,
            entry,
          );
        }
      });
    }
    if (Array.isArray(refs.locations)) {
      refs.locations.forEach((entry, i) => {
        if (typeof entry !== "string") return;
        if (!knownIds.locations.has(entry)) {
          pushViolation(
            violations,
            recordId,
            recordClass,
            `refs.locations[${i}]`,
            entry,
          );
        }
      });
    }
    if (Array.isArray(refs.related_records)) {
      refs.related_records.forEach((entry, i) => {
        if (typeof entry !== "string") return;
        const cls = lookupClassFromId(entry);
        const field = `refs.related_records[${i}]`;
        if (cls === null) {
          pushViolation(violations, recordId, recordClass, field, entry);
          return;
        }
        if (!knownIds[cls].has(entry)) {
          pushViolation(violations, recordId, recordClass, field, entry);
        }
      });
    }
  }

  // Per-class typed pointer refs
  const specs = PER_CLASS_REF_SPECS[recordClass];
  if (!specs) {
    return violations;
  }

  for (const [field, spec] of Object.entries(specs)) {
    const value = recordObj[field];

    if (spec.kind === "single") {
      if (value === null || value === undefined) {
        if (!spec.nullable) {
          // schema validator catches required; ref validator skips
        }
        continue;
      }
      if (typeof value !== "string") continue;
      if ("classes" in spec && Array.isArray(spec.classes)) {
        if (!checkSingleTargetClasses(value, spec.classes, knownIds)) {
          pushViolation(violations, recordId, recordClass, field, value);
        }
      } else if ("class" in spec) {
        if (!knownIds[spec.class].has(value)) {
          pushViolation(violations, recordId, recordClass, field, value);
        }
      }
      continue;
    }

    if (spec.kind === "pair") {
      if (!Array.isArray(value)) continue;
      value.forEach((entry, i) => {
        if (typeof entry !== "string") return;
        if (!knownIds[spec.class].has(entry)) {
          pushViolation(
            violations,
            recordId,
            recordClass,
            `${field}[${i}]`,
            entry,
          );
        }
      });
      continue;
    }

    if (spec.kind === "list") {
      if (!Array.isArray(value)) continue;
      value.forEach((entry, i) => {
        if (typeof entry !== "string") return;
        if (!knownIds[spec.class].has(entry)) {
          pushViolation(
            violations,
            recordId,
            recordClass,
            `${field}[${i}]`,
            entry,
          );
        }
      });
      continue;
    }

    if (spec.kind === "segment") {
      if (value === null || value === undefined) {
        continue;
      }
      if (typeof value !== "string") continue;
      if (!knownIds.segments.has(value)) {
        pushViolation(violations, recordId, recordClass, field, value);
      }
      continue;
    }
  }

  return violations;
}
