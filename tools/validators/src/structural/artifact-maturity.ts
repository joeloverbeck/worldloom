import yaml from "js-yaml";

import type { Context, IndexedRecord, Validator, Verdict, VerdictSeverity } from "../framework/types.js";
import {
  asPlainRecord,
  fileInputsFrom,
  locationFor,
  queryStructuralRecords,
  stringValue,
  toPosixPath
} from "./utils.js";
import { frontmatterFor } from "./yaml-parse-integrity.js";

type MaturityClass =
  | "pre_world_proposal"
  | "candidate_canon_proposal"
  | "candidate_character_proposal"
  | "realized_hybrid"
  | "accepted_world_canon"
  | "adjudication"
  | "audit"
  | "pressure_affordance"
  | "downstream_story_record";

interface AuthorityClaim {
  maturity: MaturityClass;
  evidence: string;
}

interface MaturityTarget {
  record: IndexedRecord;
  granted: MaturityClass;
  grantedLabel: string;
  routingSkill: string;
  content?: string;
}

const MATURITY_RANK: Readonly<Record<MaturityClass, number>> = {
  pre_world_proposal: 1,
  candidate_canon_proposal: 2,
  candidate_character_proposal: 2,
  audit: 2,
  pressure_affordance: 2,
  adjudication: 3,
  realized_hybrid: 4,
  accepted_world_canon: 5,
  downstream_story_record: 6
};

export const artifactMaturity: Validator = {
  name: "artifact_maturity",
  severity_mode: "fail",
  applies_to: () => true,
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const filesByPath = new Map(
      fileInputsFrom(input, ctx).map((file) => [toPosixPath(file.path), file.content])
    );
    const targets = targetsFor(await queryStructuralRecords(ctx), filesByPath);
    pushFileOnlyTargets(targets, filesByPath, ctx);

    return targets.flatMap((target) => maturityVerdicts(target, ctx));
  }
};

function targetsFor(
  records: readonly IndexedRecord[],
  filesByPath: ReadonlyMap<string, string>
): MaturityTarget[] {
  const targets: MaturityTarget[] = [];
  for (const record of records) {
    const authority = authorityFor(record);
    if (authority === undefined) {
      continue;
    }
    const content = filesByPath.get(toPosixPath(record.file_path));
    targets.push({
      record,
      ...authority,
      ...(content === undefined ? {} : { content })
    });
  }
  return targets;
}

function pushFileOnlyTargets(
  targets: MaturityTarget[],
  filesByPath: ReadonlyMap<string, string>,
  ctx: Context
): void {
  const seen = new Set(targets.map((target) => toPosixPath(target.record.file_path)));
  for (const [filePath, content] of filesByPath) {
    if (seen.has(filePath) || !isInIncrementalScope(filePath, ctx)) {
      continue;
    }
    const record = recordFromMarkdownFile(filePath, content, ctx);
    if (record === undefined) {
      continue;
    }
    const authority = authorityFor(record);
    if (authority === undefined) {
      continue;
    }
    targets.push({
      record,
      ...authority,
      content
    });
  }
}

function maturityVerdicts(target: MaturityTarget, ctx: Context): Verdict[] {
  const claim = strongestClaimFor(target);
  if (claim === undefined || !isCollapse(target.granted, claim.maturity)) {
    return [];
  }

  return [{
    validator: "artifact_maturity",
    severity: severityFor(ctx),
    code: "artifact_maturity.collapse",
    message: `${target.record.node_id} is stored as ${target.grantedLabel} but presents as ${labelFor(claim.maturity)}; route through ${target.routingSkill} instead of claiming a higher authority tier in this artifact.`,
    location: locationFor(target.record),
    detail: {
      granted_maturity: target.granted,
      presented_maturity: claim.maturity,
      evidence: claim.evidence,
      routing_skill: target.routingSkill
    },
    suggested_fix: `Rewrite the artifact framing as ${target.grantedLabel}, or route the higher-tier artifact through ${target.routingSkill}.`
  }];
}

function isCollapse(granted: MaturityClass, claimed: MaturityClass): boolean {
  return MATURITY_RANK[claimed] > MATURITY_RANK[granted];
}

function severityFor(ctx: Context): VerdictSeverity {
  return ctx.run_mode === "full-world" ? "warn" : "fail";
}

function strongestClaimFor(target: MaturityTarget): AuthorityClaim | undefined {
  const claims = [
    ...claimsFromRecord(target.record.parsed),
    ...claimsFromContent(target.content ?? "")
  ];
  return claims.sort((left, right) => MATURITY_RANK[right.maturity] - MATURITY_RANK[left.maturity])[0];
}

function claimsFromRecord(value: unknown): AuthorityClaim[] {
  const claims: AuthorityClaim[] = [];
  collectStringClaims(value, [], claims);
  return claims;
}

function collectStringClaims(value: unknown, path: string[], claims: AuthorityClaim[]): void {
  if (typeof value === "string") {
    const claim = claimFromText(value, path.join("."));
    if (claim !== undefined) {
      claims.push(claim);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStringClaims(item, [...path, String(index)], claims));
    return;
  }
  const record = asPlainRecord(value);
  for (const [key, child] of Object.entries(record)) {
    collectStringClaims(child, [...path, key], claims);
  }
}

function claimsFromContent(content: string): AuthorityClaim[] {
  if (content.length === 0) {
    return [];
  }
  const normalized = content
    .replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "")
    .replace(/```[\s\S]*?```/g, "")
    .toLowerCase();
  const claims: AuthorityClaim[] = [];
  for (const [pattern, maturity] of CONTENT_CLAIMS) {
    const match = pattern.exec(normalized);
    if (match) {
      claims.push({ maturity, evidence: match[0].trim() });
    }
  }
  return claims;
}

function claimFromText(value: string, fieldPath: string): AuthorityClaim | undefined {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  for (const [pattern, maturity] of FIELD_VALUE_CLAIMS) {
    if (pattern.test(normalized)) {
      return { maturity, evidence: `${fieldPath}: ${value}` };
    }
  }
  return undefined;
}

const FIELD_VALUE_CLAIMS: ReadonlyArray<[RegExp, MaturityClass]> = [
  [/^(accepted_)?world_canon$/, "accepted_world_canon"],
  [/^(canon_fact|canon_fact_record|hard_canon)$/, "accepted_world_canon"],
  [/^(realized_character|realized_character_dossier|character_dossier|established_character|character_record)$/, "realized_hybrid"],
  [/^(realized_diegetic_artifact|diegetic_artifact_record)$/, "realized_hybrid"],
  [/^(adjudication|provenance|pa_record)$/, "adjudication"],
  [/^(audit|audit_record)$/, "audit"],
  [/^(pressure_affordance|pressure_event)$/, "pressure_affordance"],
  [/^(candidate_character|character_proposal|ncp)$/, "candidate_character_proposal"],
  [/^(candidate_canon|canon_proposal|proposal|retcon_proposal|pr|rp)$/, "candidate_canon_proposal"],
  [/^(pre_world_proposal|world_proposal|nwp)$/, "pre_world_proposal"]
];

const CONTENT_CLAIMS: ReadonlyArray<[RegExp, MaturityClass]> = [
  [/\baccepted world canon\b/, "accepted_world_canon"],
  [/\baccepted canon fact\b/, "accepted_world_canon"],
  [/\bcanon fact record\b/, "accepted_world_canon"],
  [/\bhard canon record\b/, "accepted_world_canon"],
  [/\brealized character dossier\b/, "realized_hybrid"],
  [/\bestablished character dossier\b/, "realized_hybrid"],
  [/\bestablished character record\b/, "realized_hybrid"],
  [/\brealized diegetic artifact\b/, "realized_hybrid"],
  [/\bdiegetic artifact record\b/, "realized_hybrid"]
];

function authorityFor(record: IndexedRecord):
  | { granted: MaturityClass; grantedLabel: string; routingSkill: string }
  | undefined {
  const filePath = toPosixPath(record.file_path);
  const id = recordId(record);

  if (record.node_type === "character_proposal_card" && /^character-proposals\/[^/]+\.md$/.test(filePath) && /^NCP-\d+$/.test(id)) {
    return authority("candidate_character_proposal", "candidate character proposal (NCP under character-proposals/)", "character-generation");
  }
  if (record.node_type === "character_proposal_batch" && /^character-proposals\/batches\/[^/]+\.md$/.test(filePath) && /^NCB-\d+$/.test(id)) {
    return authority("candidate_character_proposal", "candidate character proposal batch (NCB under character-proposals/batches/)", "propose-new-characters");
  }
  if (record.node_type === "character_record" && /^characters\/[^/]+\.md$/.test(filePath)) {
    return authority("realized_hybrid", "realized character dossier (CHAR under characters/)", "character-generation");
  }
  if (record.node_type === "diegetic_artifact_record" && /^diegetic-artifacts\/[^/]+\.md$/.test(filePath)) {
    return authority("realized_hybrid", "realized diegetic artifact (DA under diegetic-artifacts/)", "diegetic-artifact workflow");
  }
  if (record.node_type === "adjudication_record" && /^adjudications\/[^/]+\.md$/.test(filePath)) {
    return authority("adjudication", "adjudication/provenance artifact (PA under adjudications/)", "canon-addition");
  }
  if (record.node_type === "audit_record" && /^audits\/[^/]+\.md$/.test(filePath) && /^AU-\d+$/.test(id)) {
    return authority("audit", "audit artifact (AU under audits/)", "continuity-audit");
  }
  if (record.node_type === "retcon_proposal_card" && /^audits\/[^/]+\/retcon-proposals\/[^/]+\.md$/.test(filePath) && /^RP-\d+$/.test(id)) {
    return authority("candidate_canon_proposal", "candidate retcon proposal (RP under audits/*/retcon-proposals/)", "canon-addition");
  }
  if (record.node_type === "proposal_card" && /^proposals\/[^/]+\.md$/.test(filePath) && /^PR-\d+$/.test(id)) {
    return authority("candidate_canon_proposal", "candidate canon proposal (PR under proposals/)", "canon-addition");
  }
  if (record.node_type === "proposal_batch" && /^proposals\/batches\/[^/]+\.md$/.test(filePath) && /^BATCH-\d+$/.test(id)) {
    return authority("candidate_canon_proposal", "candidate canon proposal batch (BATCH under proposals/batches/)", "propose-new-canon-facts");
  }
  if (record.node_type === "pressure_event_card" && /^pressure-events\/[^/]+\.md$/.test(filePath) && /^EPE-\d+$/.test(id)) {
    return authority("pressure_affordance", "pressure affordance (EPE under pressure-events/)", "emergent-pressure-events");
  }
  if (record.node_type === "pressure_event_sidecar_proposal" && /^pressure-events\/[^/]+\.proposal\.md$/.test(filePath) && /^PR-\d+$/.test(id)) {
    return authority("candidate_canon_proposal", "candidate canon proposal sidecar (PR under pressure-events/)", "canon-addition");
  }
  if (record.node_type === "world_proposal_card" && /^world-proposals\/[^/]+\.md$/.test(filePath) && /^NWP-\d+$/.test(id)) {
    return authority("pre_world_proposal", "pre-world proposal (NWP under world-proposals/)", "create-base-world");
  }
  if (record.node_type === "world_proposal_batch" && /^world-proposals\/batches\/[^/]+\.md$/.test(filePath) && /^NWB-\d+$/.test(id)) {
    return authority("pre_world_proposal", "pre-world proposal batch (NWB under world-proposals/batches/)", "propose-new-worlds-from-preferences");
  }
  if (filePath.startsWith("_source/")) {
    return authority("accepted_world_canon", "accepted world canon (_source/ record)", "canon-addition");
  }
  if (filePath.startsWith("stories/")) {
    return authority("downstream_story_record", "downstream story-bundle record", "story-bundle workflow");
  }

  return undefined;
}

function authority(granted: MaturityClass, grantedLabel: string, routingSkill: string) {
  return { granted, grantedLabel, routingSkill };
}

function recordFromMarkdownFile(filePath: string, content: string, ctx: Context): IndexedRecord | undefined {
  const frontmatter = frontmatterFor(content);
  const parsed = parseYamlSurface(frontmatter ?? "");
  const base = {
    world_slug: ctx.world_slug,
    file_path: filePath,
    parsed
  };

  if (/^character-proposals\/batches\/[^/]+\.md$/.test(filePath)) {
    return { ...base, node_type: "character_proposal_batch", node_id: stringValue(parsed.batch_id) ?? filePath };
  }
  if (/^character-proposals\/[^/]+\.md$/.test(filePath)) {
    return { ...base, node_type: "character_proposal_card", node_id: stringValue(parsed.proposal_id) ?? filePath };
  }
  if (/^characters\/[^/]+\.md$/.test(filePath)) {
    return { ...base, node_type: "character_record", node_id: stringValue(parsed.character_id) ?? filePath };
  }
  if (/^diegetic-artifacts\/[^/]+\.md$/.test(filePath)) {
    return { ...base, node_type: "diegetic_artifact_record", node_id: stringValue(parsed.artifact_id) ?? filePath };
  }
  if (/^adjudications\/[^/]+\.md$/.test(filePath)) {
    return { ...base, node_type: "adjudication_record", node_id: stringValue(parsed.pa_id) ?? filePath };
  }
  if (/^audits\/[^/]+\/retcon-proposals\/[^/]+\.md$/.test(filePath)) {
    return { ...base, node_type: "retcon_proposal_card", node_id: stringValue(parsed.id) ?? filePath };
  }
  if (/^audits\/[^/]+\.md$/.test(filePath)) {
    return { ...base, node_type: "audit_record", node_id: stringValue(parsed.audit_id) ?? filePath };
  }
  if (/^proposals\/batches\/[^/]+\.md$/.test(filePath)) {
    return { ...base, node_type: "proposal_batch", node_id: stringValue(parsed.batch_id) ?? filePath };
  }
  if (/^proposals\/[^/]+\.md$/.test(filePath)) {
    return { ...base, node_type: "proposal_card", node_id: stringValue(parsed.proposal_id) ?? filePath };
  }
  if (/^pressure-events\/batches\/[^/]+\.md$/.test(filePath)) {
    return { ...base, node_type: "pressure_event_batch", node_id: stringValue(parsed.batch_id) ?? filePath };
  }
  if (/^pressure-events\/[^/]+\.proposal\.md$/.test(filePath)) {
    return { ...base, node_type: "pressure_event_sidecar_proposal", node_id: stringValue(parsed.proposal_id) ?? filePath };
  }
  if (/^pressure-events\/[^/]+\.md$/.test(filePath)) {
    return { ...base, node_type: "pressure_event_card", node_id: stringValue(parsed.event_id) ?? filePath };
  }
  if (/^world-proposals\/batches\/[^/]+\.md$/.test(filePath)) {
    return { ...base, node_type: "world_proposal_batch", node_id: stringValue(parsed.batch_id) ?? filePath };
  }
  if (/^world-proposals\/[^/]+\.md$/.test(filePath)) {
    return { ...base, node_type: "world_proposal_card", node_id: stringValue(parsed.proposal_id) ?? filePath };
  }
  return undefined;
}

function parseYamlSurface(content: string): Record<string, unknown> {
  try {
    const parsed = yaml.load(content, { schema: yaml.JSON_SCHEMA });
    return asPlainRecord(parsed);
  } catch {
    return {};
  }
}

function recordId(record: IndexedRecord): string {
  const parsed = asPlainRecord(record.parsed);
  return (
    stringValue(parsed.id) ??
    stringValue(parsed.proposal_id) ??
    stringValue(parsed.batch_id) ??
    stringValue(parsed.character_id) ??
    stringValue(parsed.artifact_id) ??
    stringValue(parsed.audit_id) ??
    stringValue(parsed.pa_id) ??
    stringValue(parsed.event_id) ??
    record.node_id
  );
}

function labelFor(maturity: MaturityClass): string {
  return maturity.replace(/_/g, " ");
}

function isInIncrementalScope(filePath: string, ctx: Context): boolean {
  if (ctx.run_mode !== "incremental" || ctx.touched_files.length === 0) {
    return true;
  }
  const touched = new Set(ctx.touched_files.map(toPosixPath));
  return touched.has(toPosixPath(filePath));
}
