import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import type { Context, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, isPlainRecord, stringArray, stringValue, toPosixPath, touchedFilesInclude } from "./utils.js";
import { frontmatterFor } from "./yaml-parse-integrity.js";

const VALIDATOR = "character_memorability_structure";
const CHARACTER_PATH = /^characters\/[^/]+\.md$/;
const PROPOSAL_CARD_PATH = /^character-proposals\/[^/]+\.md$/;
const PROPOSAL_BATCH_PATH = /^character-proposals\/batches\//;
const SOURCE_PROPOSAL_ID_PATTERN = /^NCP-[0-9]+$/;
const PLACEHOLDER_PATTERN = /\b(?:TODO|TBD|PLACEHOLDER)\b/i;
const PLACEHOLDER_ABSENCE_PATTERN = /\b(?:no|none|not|without)\b[^.\n]*(?:TODO|TBD|PLACEHOLDER)\b/i;

const REQUIRED_CHARACTER_SECTIONS = [
  "Protagonist-Grade Core",
  "Pressure Behavior",
  "Self-Mythology and Blind Spots",
  "Relational Charge",
  "Moral and Psychological Edge",
  "Signature Scene Behavior"
] as const;

export const characterMemorabilityStructure: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context) => {
    if (ctx.run_mode === "full-world") {
      return true;
    }
    return ctx.touched_files.some((file) => relevantPath(file)) || touchedFilesInclude(ctx, /^(characters|character-proposals)\//);
  },
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const verdicts: Verdict[] = [];

    for (const file of memorabilityFileInputs(input, ctx)) {
      const filePath = toPosixPath(file.path);
      if (!relevantPath(filePath) || !isInIncrementalScope(filePath, ctx)) {
        continue;
      }

      const parsed = parseFrontmatter(file.content);
      if (parsed === null) {
        continue;
      }

      if (hasPlaceholderText(file.content)) {
        verdicts.push(verdict(
          filePath,
          nodeIdFor(filePath, parsed),
          "placeholder_text",
          "Character memorability surfaces must not contain TODO/TBD/PLACEHOLDER text."
        ));
      }

      if (CHARACTER_PATH.test(filePath)) {
        verdicts.push(...characterVerdicts(filePath, file.content, parsed));
      } else if (PROPOSAL_CARD_PATH.test(filePath) && !PROPOSAL_BATCH_PATH.test(filePath)) {
        verdicts.push(...proposalVerdicts(filePath, file.content, parsed));
      }
    }

    return verdicts;
  }
};

function characterVerdicts(filePath: string, content: string, parsed: Record<string, unknown>): Verdict[] {
  const nodeId = nodeIdFor(filePath, parsed);
  const verdicts: Verdict[] = [];
  for (const section of REQUIRED_CHARACTER_SECTIONS) {
    if (!hasHeading(content, section)) {
      verdicts.push(verdict(
        filePath,
        nodeId,
        "missing_character_section",
        `${nodeId} missing required character body section '## ${section}'.`
      ));
    }
  }

  const dramaticCore = asPlainRecord(parsed.dramatic_core);
  const signatureSceneBehaviors = stringArray(dramaticCore.signature_scene_behaviors);
  if (signatureSceneBehaviors.length < 3) {
    verdicts.push(verdict(
      filePath,
      nodeId,
      "signature_scene_behaviors_min_items",
      `${nodeId} dramatic_core.signature_scene_behaviors must contain at least 3 scene behaviors.`
    ));
  }

  const pressureBehavior = asPlainRecord(dramaticCore.pressure_behavior);
  const pressureValues = Object.values(pressureBehavior).filter((value): value is string => typeof value === "string");
  const normalized = pressureValues.map((value) => value.trim().toLowerCase());
  if (normalized.some((value) => value.length === 0)) {
    verdicts.push(verdict(
      filePath,
      nodeId,
      "pressure_behavior_empty",
      `${nodeId} dramatic_core.pressure_behavior entries must be non-empty.`
    ));
  }
  if (new Set(normalized.filter(Boolean)).size < normalized.filter(Boolean).length) {
    verdicts.push(verdict(
      filePath,
      nodeId,
      "pressure_behavior_duplicate",
      `${nodeId} dramatic_core.pressure_behavior entries must describe distinct behaviors, not duplicate responses.`
    ));
  }

  const sourceBasis = asPlainRecord(parsed.source_basis);
  const sourceProposalId = sourceBasis.source_proposal_id;
  if (sourceProposalId !== undefined && (typeof sourceProposalId !== "string" || !SOURCE_PROPOSAL_ID_PATTERN.test(sourceProposalId))) {
    verdicts.push(verdict(
      filePath,
      nodeId,
      "source_proposal_id_format",
      `${nodeId} source_basis.source_proposal_id must match NCP-<integer> when present.`
    ));
  }

  return verdicts;
}

function proposalVerdicts(filePath: string, content: string, parsed: Record<string, unknown>): Verdict[] {
  const nodeId = nodeIdFor(filePath, parsed);
  const verdicts: Verdict[] = [];
  const upgradeLineage = asPlainRecord(parsed.upgrade_lineage);

  if (requiresRejectedDirectionsAudit(upgradeLineage.origin_kind)) {
    if (!hasHeading(content, "Rejected Directions Audit")) {
      verdicts.push(verdict(
        filePath,
        nodeId,
        "missing_rejected_directions_audit",
        `${nodeId} upgraded/user-seed NCP cards must include '## Rejected Directions Audit'.`
      ));
    }

    if (!Array.isArray(upgradeLineage.rejected_directions_audit) || upgradeLineage.rejected_directions_audit.length < 3) {
      verdicts.push(verdict(
        filePath,
        nodeId,
        "rejected_directions_audit_min_items",
        `${nodeId} upgrade_lineage.rejected_directions_audit must contain at least 3 entries for upgraded/user-seed NCP cards.`
      ));
    }
  }

  const canonAssumptionFlags = asPlainRecord(parsed.canon_assumption_flags);
  if (
    canonAssumptionFlags.status === "canon-requiring" &&
    (!Array.isArray(canonAssumptionFlags.implied_new_facts) || canonAssumptionFlags.implied_new_facts.length === 0)
  ) {
    verdicts.push(verdict(
      filePath,
      nodeId,
      "canon_requiring_missing_implied_facts",
      `${nodeId} canon-requiring NCP cards must list implied_new_facts with preferred routes.`
    ));
  }

  return verdicts;
}

function requiresRejectedDirectionsAudit(originKind: unknown): boolean {
  return originKind === "upgraded_seed" || originKind === "user_seed";
}

function relevantPath(filePath: string): boolean {
  const normalized = toPosixPath(filePath);
  if (normalized.endsWith("/INDEX.md")) {
    return false;
  }
  return CHARACTER_PATH.test(normalized) || (PROPOSAL_CARD_PATH.test(normalized) && !PROPOSAL_BATCH_PATH.test(normalized));
}

interface MemorabilityFileInput {
  path: string;
  content: string;
}

function memorabilityFileInputs(input: unknown, ctx: Context): MemorabilityFileInput[] {
  const record = asPlainRecord(input);
  if (Array.isArray(record.files) && record.files.length > 0) {
    return record.files
      .filter(isPlainRecord)
      .map((file) => ({
        path: String(file.path ?? ""),
        content: String(file.content ?? "")
      }))
      .filter((file) => file.path.length > 0);
  }

  const worldRoot = stringValue(record.world_root) ?? stringValue(record.worldRoot);
  if (!worldRoot) {
    return [];
  }

  return listMemorabilityFiles(path.resolve(worldRoot), ctx).map((relativePath) => ({
    path: relativePath,
    content: readFileSync(path.join(path.resolve(worldRoot), relativePath), "utf8")
  }));
}

function listMemorabilityFiles(worldRoot: string, ctx: Context): string[] {
  const files: string[] = [];
  for (const dir of ["characters", "character-proposals"]) {
    const absoluteDir = path.join(worldRoot, dir);
    if (!existsSync(absoluteDir)) {
      continue;
    }
    for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(toPosixPath(path.join(dir, entry.name)));
      }
    }
  }
  if (ctx.run_mode !== "incremental") {
    return files.sort((left, right) => left.localeCompare(right, "en-US"));
  }
  const touched = new Set(ctx.touched_files.map(toPosixPath));
  return files.filter((file) => touched.has(file)).sort((left, right) => left.localeCompare(right, "en-US"));
}

function isInIncrementalScope(filePath: string, ctx: Context): boolean {
  if (ctx.run_mode !== "incremental" || ctx.touched_files.length === 0) {
    return true;
  }
  const touched = new Set(ctx.touched_files.map(toPosixPath));
  return touched.has(toPosixPath(filePath));
}

function hasHeading(content: string, heading: string): boolean {
  const pattern = new RegExp(`^## ${escapeRegExp(heading)}\\s*$`, "m");
  return pattern.test(content);
}

function hasPlaceholderText(content: string): boolean {
  return content
    .split(/\r?\n/)
    .some((line) => PLACEHOLDER_PATTERN.test(line) && !PLACEHOLDER_ABSENCE_PATTERN.test(line));
}

function parseFrontmatter(content: string): Record<string, unknown> | null {
  const frontmatter = frontmatterFor(content);
  if (frontmatter === null) {
    return {};
  }
  try {
    return asPlainRecord(yaml.load(frontmatter, { schema: yaml.JSON_SCHEMA }));
  } catch {
    return null;
  }
}

function nodeIdFor(filePath: string, parsed: Record<string, unknown>): string {
  if (typeof parsed.character_id === "string") {
    return parsed.character_id;
  }
  if (typeof parsed.proposal_id === "string") {
    return parsed.proposal_id;
  }
  return filePath;
}

function verdict(file: string, nodeId: string, code: string, message: string): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code: `${VALIDATOR}.${code}`,
    message,
    location: {
      file,
      node_id: nodeId
    }
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
