import { readFileSync } from "node:fs";
import path from "node:path";

import Ajv2020Module from "ajv/dist/2020.js";
import type { AnySchema, ErrorObject, ValidateFunction } from "ajv";
import yaml from "js-yaml";

import {
  CF_TYPE_EPISTEMIC_PROFILE_REQUIRED,
  CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED
} from "@worldloom/world-index/public/canonical-vocabularies";
import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  RECORD_TYPE_TO_SCHEMA,
  asPlainRecord,
  fileInputsFrom,
  queryStructuralRecords,
  toPosixPath
} from "./utils.js";
import { frontmatterFor } from "./yaml-parse-integrity.js";

type Ajv2020Instance = {
  addSchema(schema: AnySchema): unknown;
  compile(schema: AnySchema): ValidateFunction;
  errorsText(errors?: ErrorObject[] | null): string;
};
type Ajv2020Constructor = new (opts?: Record<string, unknown>) => Ajv2020Instance;
const Ajv2020 = Ajv2020Module as unknown as Ajv2020Constructor;
const ajv = new Ajv2020({ allErrors: true, strict: true, formats: { date: true } });
const validatorsByRecordType = loadSchemaValidators();

export {
  CF_TYPE_EPISTEMIC_PROFILE_REQUIRED as EPISTEMIC_PROFILE_REQUIRED_TYPES,
  CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED as EXCEPTION_GOVERNANCE_REQUIRED_TYPES
} from "@worldloom/world-index/public/canonical-vocabularies";

export const ONTOLOGY_CATEGORY_KEYWORDS = [
  "entity",
  "species",
  "person",
  "faction",
  "institution",
  "polity",
  "place",
  "region",
  "route",
  "resource",
  "craft",
  "technology",
  "magic practice",
  "magic",
  "belief",
  "ritual",
  "law",
  "taboo",
  "artifact",
  "hazard",
  "event",
  "historical process",
  "historical",
  "social role",
  "text/tradition",
  "text",
  "tradition",
  "ecological system",
  "ecological",
  "bodily condition",
  "metaphysical rule",
  "metaphysical",
  "geography",
  "physics",
  "structural",
  "institutional"
] as const;

export const recordSchemaCompliance: Validator = {
  name: "record_schema_compliance",
  severity_mode: "fail",
  applies_to: () => true,
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const verdicts: Verdict[] = [];
    const records = await queryStructuralRecords(ctx);
    const preApplyTouchedFiles = touchedPreApplyFiles(input, ctx);

    for (const record of records) {
      if (!isInIncrementalScope(record.file_path, ctx)) {
        continue;
      }
      const validate = validatorsByRecordType.get(String(record.node_type));
      if (!validate) {
        continue;
      }
      if (!validate(record.parsed)) {
        verdicts.push(...schemaVerdicts(record, validate.errors ?? []));
      }
      verdicts.push(...storyQuestionDisciplineVerdicts(record));
      verdicts.push(...canonSafetyBlockVerdicts(record, ctx, preApplyTouchedFiles));
    }

    for (const hybrid of hybridRecordsFromFiles(input, ctx)) {
      const validate = validatorsByRecordType.get(hybrid.node_type);
      if (!validate) {
        continue;
      }
      if (!validate(hybrid.parsed)) {
        verdicts.push(...schemaVerdicts(hybrid, validate.errors ?? []));
      }
    }

    return verdicts;
  }
};

export interface SchemaTarget {
  node_id: string;
  node_type: string;
  file_path: string;
  parsed: unknown;
}

function schemaVerdicts(record: SchemaTarget, errors: ErrorObject[]): Verdict[] {
  return errors.map((error) => ({
    validator: "record_schema_compliance",
    severity: "fail",
    code: `record_schema_compliance.${error.keyword}`,
    message: `${record.node_id} schema violation at ${error.instancePath || "/"}: ${error.message ?? error.keyword}`,
    location: {
      file: record.file_path,
      node_id: record.node_id
    }
  }));
}

function canonSafetyBlockVerdicts(
  record: SchemaTarget,
  ctx: Context,
  preApplyTouchedFiles: ReadonlySet<string>
): Verdict[] {
  if (record.node_type !== "canon_fact_record") {
    return [];
  }

  const parsed = asPlainRecord(record.parsed);
  const verdicts: Verdict[] = [];

  if (currentSchemaRequiredFor(record, ctx, preApplyTouchedFiles)) {
    const type = String(parsed.type ?? "");
    if (requiresExceptionGovernance(type) && parsed.exception_governance === undefined) {
      verdicts.push(customSchemaVerdict(
        record,
        "record_schema_compliance.missing_exception_governance",
        `${record.node_id} canon safety block violation: type '${type}' requires exception_governance`
      ));
    }
    if (requiresEpistemicProfile(type) && parsed.epistemic_profile === undefined) {
      verdicts.push(customSchemaVerdict(
        record,
        "record_schema_compliance.missing_epistemic_profile",
        `${record.node_id} canon safety block violation: type '${type}' requires epistemic_profile`
      ));
    }
  }

  verdicts.push(...naRationaleVerdicts(record, "epistemic_profile", parsed.epistemic_profile));
  verdicts.push(...naRationaleVerdicts(record, "exception_governance", parsed.exception_governance));
  return verdicts;
}

function storyQuestionDisciplineVerdicts(record: SchemaTarget): Verdict[] {
  if (record.node_type !== "story_question_record") {
    return [];
  }

  const parsed = asPlainRecord(record.parsed);
  const directFields: Array<[string, string]> = [
    [
      "expected_payoff_mode",
      "STQ records prohibit expected_payoff_mode per FOUNDATIONS Story Bundles 5c; it encodes future shape."
    ],
    [
      "act_position",
      "STQ records prohibit act-position fields per FOUNDATIONS Story Bundles 5c; the engine tracks present causal state, not narrative shape."
    ],
    [
      "midpoint",
      "STQ records prohibit act-position fields per FOUNDATIONS Story Bundles 5c; the engine tracks present causal state, not narrative shape."
    ],
    [
      "climax",
      "STQ records prohibit act-position fields per FOUNDATIONS Story Bundles 5c; the engine tracks present causal state, not narrative shape."
    ],
    [
      "dramatic_curve_position",
      "STQ records prohibit dramatic-curve fields per FOUNDATIONS Story Bundles 5c."
    ],
    [
      "tension_arc",
      "STQ records prohibit dramatic-curve fields per FOUNDATIONS Story Bundles 5c."
    ],
    [
      "expected_chapter",
      "STQ records prohibit scene-sequence fields per FOUNDATIONS Story Bundles 5a."
    ],
    [
      "scene_sequence",
      "STQ records prohibit scene-sequence fields per FOUNDATIONS Story Bundles 5a."
    ],
    [
      "holders",
      "STQ records prohibit separate holders field; audience-vs-character distinction is covered by audience_visibility plus source_records grounding."
    ]
  ];

  const verdicts = directFields
    .filter(([field]) => Object.prototype.hasOwnProperty.call(parsed, field))
    .map(([field, message]) => customSchemaVerdict(
      record,
      `record_schema_compliance.stq_prohibited_${field}`,
      `${record.node_id} STQ discipline violation at /${field}: ${message}`
    ));

  if (parsed.setup_kind === "moral_question") {
    verdicts.push(customSchemaVerdict(
      record,
      "record_schema_compliance.stq_prohibited_moral_question",
      `${record.node_id} STQ discipline violation at /setup_kind: STQ.setup_kind prohibits moral_question per FOUNDATIONS Story Bundles 5c; it is authorial and not validator-readable.`
    ));
  }

  return verdicts;
}

export function requiresExceptionGovernance(type: string): boolean {
  return CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED.some((requiredType) => normalizeType(type) === normalizeType(requiredType));
}

export function requiresEpistemicProfile(type: string): boolean {
  return CF_TYPE_EPISTEMIC_PROFILE_REQUIRED.some((requiredType) => normalizeType(type) === normalizeType(requiredType));
}

function currentSchemaRequiredFor(
  record: SchemaTarget,
  ctx: Context,
  preApplyTouchedFiles: ReadonlySet<string>
): boolean {
  if (ctx.run_mode === "pre-apply") {
    return preApplyTouchedFiles.has(toPosixPath(record.file_path));
  }
  if (ctx.run_mode === "incremental") {
    return isInIncrementalScope(record.file_path, ctx);
  }
  return false;
}

function touchedPreApplyFiles(input: unknown, ctx: Context): ReadonlySet<string> {
  if (ctx.run_mode !== "pre-apply") {
    return new Set();
  }
  return new Set(fileInputsFrom(input, ctx).map((file) => toPosixPath(file.path)));
}

export function naRationaleVerdicts(record: SchemaTarget, blockName: string, block: unknown): Verdict[] {
  const value = asPlainRecord(block).n_a;
  if (value === undefined) {
    return [];
  }
  const rationale = typeof value === "string" ? value : "";
  const lower = rationale.toLowerCase();
  if (ONTOLOGY_CATEGORY_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return [];
  }
  return [
    customSchemaVerdict(
      record,
      "record_schema_compliance.na_rationale_quality",
      `${record.node_id} canon safety block violation at /${blockName}/n_a: rationale must include a FOUNDATIONS ontology category keyword`
    )
  ];
}

function customSchemaVerdict(record: SchemaTarget, code: string, message: string): Verdict {
  return {
    validator: "record_schema_compliance",
    severity: "fail",
    code,
    message,
    location: {
      file: record.file_path,
      node_id: record.node_id
    }
  };
}

function normalizeType(type: string): string {
  return type.trim().toLowerCase().replace(/[-\s]+/g, "_");
}

function loadSchemaValidators(): Map<string, ValidateFunction> {
  const schemaRoot = path.resolve(import.meta.dirname, "../../../src/schemas");
  const sharedSchema = JSON.parse(readFileSync(path.join(schemaRoot, "_shared/extension-entry.schema.json"), "utf8")) as AnySchema;
  ajv.addSchema(sharedSchema);

  const validators = new Map<string, ValidateFunction>();
  for (const [recordType, schemaName] of Object.entries(RECORD_TYPE_TO_SCHEMA)) {
    const schema = JSON.parse(readFileSync(path.join(schemaRoot, `${schemaName}.schema.json`), "utf8")) as AnySchema;
    const validate = ajv.compile(schema);
    validators.set(recordType, validate);
  }
  return validators;
}

function hybridRecordsFromFiles(input: unknown, ctx: Context): SchemaTarget[] {
  const records: SchemaTarget[] = [];
  for (const file of fileInputsFrom(input, ctx)) {
    const normalizedPath = toPosixPath(file.path);
    if (!isInIncrementalScope(normalizedPath, ctx)) {
      continue;
    }
    if (normalizedPath.startsWith("characters/")) {
      const frontmatter = frontmatterFor(file.content);
      if (frontmatter !== null) {
        const parsed = parseYamlSurface(frontmatter);
        if (!parsed) {
          continue;
        }
        records.push({
          node_id: String(asPlainRecord(parsed).character_id ?? normalizedPath),
          node_type: "character_record",
          file_path: normalizedPath,
          parsed
        });
      }
    }
    if (normalizedPath.startsWith("diegetic-artifacts/")) {
      const frontmatter = frontmatterFor(file.content);
      if (frontmatter !== null) {
        const parsed = parseYamlSurface(frontmatter);
        if (!parsed) {
          continue;
        }
        records.push({
          node_id: String(asPlainRecord(parsed).artifact_id ?? normalizedPath),
          node_type: "diegetic_artifact_record",
          file_path: normalizedPath,
          parsed
        });
      }
    }
    if (normalizedPath.startsWith("adjudications/")) {
      const frontmatter = frontmatterFor(file.content);
      const parsed = frontmatter === null ? {} : parseYamlSurface(frontmatter);
      if (!parsed) {
        continue;
      }
      records.push({
        node_id: String(asPlainRecord(parsed).pa_id ?? normalizedPath),
        node_type: "adjudication_record",
        file_path: normalizedPath,
        parsed
      });
    }
  }
  return records;
}

function parseYamlSurface(content: string): unknown | null {
  try {
    return yaml.load(content, { schema: yaml.JSON_SCHEMA });
  } catch {
    return null;
  }
}

function isInIncrementalScope(filePath: string, ctx: Context): boolean {
  if (ctx.run_mode !== "incremental" || ctx.touched_files.length === 0) {
    return true;
  }
  const touched = new Set(ctx.touched_files.map(toPosixPath));
  return touched.has(toPosixPath(filePath));
}
