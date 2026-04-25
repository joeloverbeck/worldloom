import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import type { Verdict } from "./types.js";

const POLICY_RELATIVE_PATH = path.join("audits", "validation-grandfathering.yaml");

interface GrandfatherFinding {
  validator: string;
  code: string;
  message: string;
  location: {
    file: string;
    node_id?: string;
  };
}

interface GrandfatherEntry {
  id: string;
  rationale: string;
  findings: GrandfatherFinding[];
}

interface GrandfatherPolicy {
  schema: string;
  world_slug: string;
  entries: GrandfatherEntry[];
}

export function applyGrandfathering(verdicts: readonly Verdict[], input: unknown): Verdict[] {
  const policy = loadGrandfatherPolicy(input);
  if (!policy) {
    return [...verdicts];
  }

  const dispositions = new Map<string, { id: string; rationale: string }>();
  for (const entry of policy.entries) {
    for (const finding of entry.findings) {
      dispositions.set(findingKey(finding), { id: entry.id, rationale: entry.rationale });
    }
  }

  return verdicts.map((verdict) => {
    if (verdict.severity !== "fail") {
      return verdict;
    }

    const disposition = dispositions.get(findingKey(verdict));
    if (!disposition) {
      return verdict;
    }

    return {
      ...verdict,
      severity: "info",
      message: `Grandfathered by ${disposition.id}: ${verdict.message}`,
      suggested_fix: `Accepted bootstrap disposition: ${disposition.rationale}`
    };
  });
}

export function grandfatherPolicyPath(input: unknown): string | null {
  const worldRoot = worldRootFrom(input);
  return worldRoot ? path.join(worldRoot, POLICY_RELATIVE_PATH) : null;
}

function loadGrandfatherPolicy(input: unknown): GrandfatherPolicy | null {
  const policyPath = grandfatherPolicyPath(input);
  if (!policyPath || !existsSync(policyPath)) {
    return null;
  }

  const parsed = yaml.load(readFileSync(policyPath, "utf8"), { schema: yaml.JSON_SCHEMA });
  if (!isPolicy(parsed)) {
    throw new Error(`invalid validation grandfather policy at ${policyPath}`);
  }
  const worldSlug = worldSlugFrom(input);
  if (worldSlug && parsed.world_slug !== worldSlug) {
    throw new Error(
      `validation grandfather policy at ${policyPath} is for world '${parsed.world_slug}', not '${worldSlug}'`
    );
  }

  return parsed;
}

function isPolicy(value: unknown): value is GrandfatherPolicy {
  if (!isRecord(value) || value.schema !== "worldloom.validation_grandfathering.v1") {
    return false;
  }
  if (typeof value.world_slug !== "string" || !Array.isArray(value.entries)) {
    return false;
  }

  return value.entries.every(
    (entry) =>
      isRecord(entry) &&
      typeof entry.id === "string" &&
      typeof entry.rationale === "string" &&
      Array.isArray(entry.findings) &&
      entry.findings.every(isFinding)
  );
}

function isFinding(value: unknown): value is GrandfatherFinding {
  return (
    isRecord(value) &&
    typeof value.validator === "string" &&
    typeof value.code === "string" &&
    typeof value.message === "string" &&
    isRecord(value.location) &&
    typeof value.location.file === "string" &&
    (value.location.node_id === undefined || typeof value.location.node_id === "string")
  );
}

function worldRootFrom(input: unknown): string | null {
  if (!isRecord(input) || typeof input.world_root !== "string") {
    return null;
  }
  return input.world_root;
}

function worldSlugFrom(input: unknown): string | null {
  if (!isRecord(input) || typeof input.world_slug !== "string") {
    return null;
  }
  return input.world_slug;
}

function findingKey(finding: GrandfatherFinding | Verdict): string {
  return JSON.stringify({
    validator: finding.validator,
    code: finding.code,
    file: finding.location.file,
    node_id: finding.location.node_id ?? "",
    message: finding.message
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
