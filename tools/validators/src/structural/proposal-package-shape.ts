import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import type { Context, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, fileInputsFrom, isPlainRecord, toPosixPath, touchedFilesInclude, worldRootFrom } from "./utils.js";

const PROPOSAL_PACKAGE_PATTERN = /(?:^|\/)story-promotions\/SP-\d+-proposal-package\.ya?ml$/;
const CANDIDATE_PROMOTION_FIELDS = new Set(["promotion_provenance"]);
const SOURCE_BASIS_PROMOTION_FIELDS = new Set(["story_branch", "story_evidence"]);
const CANON_FACT_FIELDS = loadCanonFactFields();
const CANON_SOURCE_BASIS_FIELDS = loadCanonSourceBasisFields();

export const proposalPackageShape: Validator = {
  name: "proposal_package_shape",
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    touchedFilesInclude(ctx, PROPOSAL_PACKAGE_PATTERN),
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const verdicts: Verdict[] = [];
    const packages = proposalPackageInputs(input, ctx);

    for (const proposal of packages) {
      const parsed = parseYamlRecord(proposal.content);
      if (!parsed) {
        verdicts.push(verdict(proposal.path, "proposal_package_yaml_invalid", "Proposal package is not valid YAML."));
        continue;
      }

      const packageRecord = asPlainRecord(parsed);
      const candidate = asPlainRecord(packageRecord.candidate);
      if (!isPlainRecord(packageRecord.candidate)) {
        verdicts.push(verdict(proposal.path, "proposal_package_candidate_missing", "Proposal package must include a mapping at candidate."));
        continue;
      }

      if (!isPlainRecord(packageRecord.proposal_evidence)) {
        verdicts.push(verdict(proposal.path, "proposal_package_evidence_missing", "Proposal package must include top-level proposal_evidence."));
      } else if (packageRecord.source_kind === "mystery_resolution") {
        const proposalEvidence = asPlainRecord(packageRecord.proposal_evidence);
        const sourceRecords = Array.isArray(proposalEvidence.source_records)
          ? proposalEvidence.source_records
          : [];
        for (const sourceRecord of sourceRecords) {
          if (typeof sourceRecord !== "string" || !/^(SF|BEL)-\d+$/.test(sourceRecord)) {
            verdicts.push(mysteryResolutionSourceMisclass(proposal.path, sourceRecord));
          }
        }
      }

      for (const key of Object.keys(candidate)) {
        if (!CANON_FACT_FIELDS.has(key) || CANDIDATE_PROMOTION_FIELDS.has(key)) {
          verdicts.push(candidateImpurity(proposal.path, `candidate.${key}`));
        }
      }

      const sourceBasis = asPlainRecord(candidate.source_basis);
      for (const key of Object.keys(sourceBasis)) {
        if (!CANON_SOURCE_BASIS_FIELDS.has(key) || SOURCE_BASIS_PROMOTION_FIELDS.has(key)) {
          verdicts.push(candidateImpurity(proposal.path, `candidate.source_basis.${key}`));
        }
      }
    }

    return verdicts;
  }
};

interface ProposalPackageInput {
  path: string;
  content: string;
}

function proposalPackageInputs(input: unknown, ctx: Context): ProposalPackageInput[] {
  const explicit = fileInputsFrom(input, ctx)
    .filter((file) => PROPOSAL_PACKAGE_PATTERN.test(toPosixPath(file.path)))
    .map((file) => ({ path: toPosixPath(file.path), content: file.content }));

  const byPath = new Map(explicit.map((file) => [file.path, file]));
  const worldRoot = worldRootFrom(input, ctx);
  if (!worldRoot) {
    return [...byPath.values()];
  }

  for (const relativePath of listProposalPackages(worldRoot)) {
    if (byPath.has(relativePath)) {
      continue;
    }
    byPath.set(relativePath, {
      path: relativePath,
      content: readFileSync(path.join(worldRoot, relativePath), "utf8")
    });
  }

  return [...byPath.values()].sort((left, right) => left.path.localeCompare(right.path, "en-US"));
}

function listProposalPackages(worldRoot: string): string[] {
  const storiesRoot = path.join(worldRoot, "stories");
  if (!existsSync(storiesRoot)) {
    return [];
  }

  const files: string[] = [];
  for (const storyEntry of readdirSync(storiesRoot, { withFileTypes: true })) {
    if (!storyEntry.isDirectory()) {
      continue;
    }
    const promotionsDir = path.join(storiesRoot, storyEntry.name, "story-promotions");
    if (!existsSync(promotionsDir)) {
      continue;
    }
    for (const entry of readdirSync(promotionsDir, { withFileTypes: true })) {
      if (entry.isFile() && /^SP-\d+-proposal-package\.ya?ml$/.test(entry.name)) {
        files.push(toPosixPath(path.join("stories", storyEntry.name, "story-promotions", entry.name)));
      }
    }
  }
  return files;
}

function parseYamlRecord(content: string): unknown | null {
  try {
    return yaml.load(content, { schema: yaml.JSON_SCHEMA });
  } catch {
    return null;
  }
}

function candidateImpurity(file: string, fieldPath: string): Verdict {
  return verdict(
    file,
    "proposal_package_candidate_impurity",
    `Proposal package candidate contains promotion-only or non-CF field ${fieldPath}.`
  );
}

function mysteryResolutionSourceMisclass(file: string, sourceRecord: unknown): Verdict {
  return verdict(
    file,
    "mystery_resolution_source_record_misclass",
    `mystery_resolution proposal_evidence.source_records entries must be SF-<integer> or BEL-<integer>; found ${formatValue(sourceRecord)}.`
  );
}

function verdict(file: string, code: string, message: string): Verdict {
  return {
    validator: "proposal_package_shape",
    severity: "fail",
    code,
    message,
    location: { file },
    suggested_fix: "Keep the proposal candidate CF-shaped and move branch-local evidence into top-level proposal_evidence."
  };
}

function formatValue(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function loadCanonFactFields(): ReadonlySet<string> {
  const schema = loadCanonFactSchema();
  return new Set(Object.keys(asPlainRecord(schema.properties)));
}

function loadCanonSourceBasisFields(): ReadonlySet<string> {
  const schema = loadCanonFactSchema();
  const sourceBasis = asPlainRecord(asPlainRecord(schema.properties).source_basis);
  return new Set(Object.keys(asPlainRecord(sourceBasis.properties)));
}

function loadCanonFactSchema(): Record<string, unknown> {
  const schemaPath = path.resolve(__dirname, "../../../src/schemas/canon-fact-record.schema.json");
  return asPlainRecord(JSON.parse(readFileSync(schemaPath, "utf8")));
}
