import { existsSync, statSync } from "node:fs";
import path from "node:path";

import {
  MANUAL_RECORD_CLASSES,
  type ManualRecordClass,
} from "../schema/manual-story.js";
import { readPromptWorkingSet } from "../read/prompt-working-set.js";
import { readManualStoryMetadata } from "../read/manual-story-metadata.js";
import {
  listAllKnownIds,
  listRecords,
  readRecord,
} from "../read/records.js";
import { readSegmentBody, readSegmentSidecar } from "../read/segments.js";
import { readManuscript } from "../read/manuscript.js";
import { validateRecord, validateManualStoryMetadata } from "../validate/schema.js";
import { validatePromptWorkingSet } from "../validate/prompt-working-set.js";
import { validateRefs } from "../validate/refs.js";
import {
  deriveHealthStatus,
  type BlockedAction,
  type HealthFinding,
  type HealthReport,
} from "./types.js";
import type { ReadError } from "../read/result.js";

const CONTENT_POLICY_REL =
  "docs/prose-renderer-contract/content-policy.md";
const PROSE_CRAFT_CONTRACT_REL =
  "docs/manual-story-studio/prose-craft-contract.md";

const ALL_ACTIONS: readonly BlockedAction[] = [
  "prompt_copy",
  "prompt_save",
  "segment_save",
  "manuscript_compile",
] as const;

const PROMPT_ACTIONS: readonly BlockedAction[] = [
  "prompt_copy",
  "prompt_save",
] as const;

const SEGMENT_ACTIONS: readonly BlockedAction[] = [
  "segment_save",
  "manuscript_compile",
] as const;

const FINDING_DEPENDENCIES: Readonly<Record<string, readonly BlockedAction[]>> = {
  "metadata-yaml-parse-failed": ALL_ACTIONS,
  "metadata-read-failed": ALL_ACTIONS,
  "prompt-working-set-yaml-parse-failed": PROMPT_ACTIONS,
  "content-policy-missing": PROMPT_ACTIONS,
  "content-policy-unreadable": PROMPT_ACTIONS,
  "prose-craft-contract-missing": PROMPT_ACTIONS,
  "prose-craft-contract-unreadable": PROMPT_ACTIONS,
  "segment-sidecar-missing": SEGMENT_ACTIONS,
  "segment-sidecar-malformed": SEGMENT_ACTIONS,
  "segment-body-missing": SEGMENT_ACTIONS,
  "segment-body-read-failed": SEGMENT_ACTIONS,
};

export function computeHealth(manualStoryRoot: string): HealthReport {
  const findings: HealthFinding[] = [];

  findings.push(...runFilePass(manualStoryRoot));
  findings.push(...runSchemaPass(manualStoryRoot));
  findings.push(...runReferencePass(manualStoryRoot));

  const status = deriveHealthStatus(findings);
  return {
    status,
    findings,
    blocked_actions: deriveBlockedActions(findings),
  };
}

function runFilePass(root: string): HealthFinding[] {
  const findings: HealthFinding[] = [];
  const metadata = readManualStoryMetadata(root);
  if (!metadata.ok) {
    findings.push(metadataFinding(metadata.error));
    return findings;
  }

  for (const cls of MANUAL_RECORD_CLASSES) {
    const result = listRecords(root, cls, { includeInactive: true });
    if (!result.ok) {
      findings.push(recordReadFinding(result.error, cls));
    }
  }

  let segmentFilesHealthy = true;
  for (const segmentId of metadata.value.segment_order) {
    const sidecar = readSegmentSidecar({ manualStoryRoot: root, segmentId });
    if (!sidecar.ok) {
      findings.push(segmentSidecarFinding(sidecar.error, segmentId));
      segmentFilesHealthy = false;
    }

    const body = readSegmentBody({ manualStoryRoot: root, segmentId });
    if (!body.ok) {
      findings.push(segmentBodyFinding(body.error, segmentId));
      segmentFilesHealthy = false;
    }
  }

  const manuscript = readManuscript({ manualStoryRoot: root });
  if (!manuscript.ok) {
    findings.push({
      severity: "error",
      code: "manuscript-read-failed",
      path: manuscript.error.path,
      message: "manuscript.md could not be read",
      repair_hint: manuscript.error.repair_hint,
    });
  }
  if (segmentFilesHealthy && metadata.value.segment_order.length > 0) {
    const freshnessFinding = manuscriptFreshnessFinding(
      root,
      metadata.value.segment_order,
      manuscript.ok && manuscript.value.manuscript_present
        ? manuscript.value.manuscript_path
        : null,
    );
    if (freshnessFinding) findings.push(freshnessFinding);
  }

  const promptWorkingSet = readPromptWorkingSet(root);
  if (!promptWorkingSet.ok) {
    findings.push({
      severity: "blocking",
      code: "prompt-working-set-yaml-parse-failed",
      path: promptWorkingSet.error.path,
      message: "prompt-working-set.yaml could not be read",
      repair_hint: promptWorkingSet.error.repair_hint,
    });
  }

  return findings;
}

function runSchemaPass(root: string): HealthFinding[] {
  const findings: HealthFinding[] = [];
  const metadata = readManualStoryMetadata(root);
  if (!metadata.ok) return findings;

  const metadataValidation = validateManualStoryMetadata(metadata.value);
  if (!metadataValidation.ok) {
    findings.push({
      severity: "error",
      code: "metadata-schema-validation-failed",
      path: path.join(root, "manual-story.yaml"),
      message: "manual-story.yaml does not match the manual story metadata schema",
      repair_hint: metadataValidation.errors
        .map((error) => `${error.field}: ${error.message}`)
        .join("; "),
    });
  }

  for (const cls of MANUAL_RECORD_CLASSES) {
    const summaries = listRecords(root, cls, { includeInactive: true });
    if (!summaries.ok) continue;
    for (const summary of summaries.value) {
      const record = readRecord(root, cls, summary.id);
      if (!record.ok) continue;
      const result = validateRecord(cls, record.value);
      if (!result.ok) {
        findings.push({
          severity: "error",
          code: "record-schema-validation-failed",
          path: recordPath(root, cls, summary.id),
          message: `Record ${summary.id} does not match the ${cls} schema`,
          repair_hint: result.errors
            .map((error) => `${error.field}: ${error.message}`)
            .join("; "),
        });
      }
    }
  }

  return findings;
}

function runReferencePass(root: string): HealthFinding[] {
  const known = listAllKnownIds(root);
  if (!known.ok) return [];

  const findings: HealthFinding[] = [];
  findings.push(...composeRequiredDocFindings(root));

  for (const cls of MANUAL_RECORD_CLASSES) {
    const summaries = listRecords(root, cls, { includeInactive: true });
    if (!summaries.ok) continue;
    for (const summary of summaries.value) {
      const record = readRecord(root, cls, summary.id);
      if (!record.ok) continue;
      for (const violation of validateRefs(record.value, cls, known.value)) {
        findings.push({
          severity: "error",
          code: "reference-resolution-failed",
          path: recordPath(root, violation.recordClass, violation.recordId),
          message: `${violation.recordId} references missing ${violation.missingId} at ${violation.field}`,
          repair_hint: `Create ${violation.missingId} or remove the reference from ${violation.field}.`,
        });
      }
    }
  }

  const promptWorkingSet = readPromptWorkingSet(root);
  if (promptWorkingSet.ok && promptWorkingSet.value !== null) {
    const metadata = readManualStoryMetadata(root);
    if (metadata.ok) {
      const result = validatePromptWorkingSet(
        promptWorkingSet.value,
        known.value,
        metadata.value.segment_order,
      );
      if (!result.ok) {
        for (const error of result.errors) {
          findings.push({
            severity: "error",
            code: error.code ?? "prompt-working-set-reference-broken",
            path: path.join(root, "prompt-working-set.yaml"),
            message: error.message,
            repair_hint: `${error.field}: ${error.message}`,
          });
        }
      }
    }
  }
  return findings;
}

function deriveBlockedActions(
  findings: ReadonlyArray<HealthFinding>,
): BlockedAction[] {
  const blocked = new Set<BlockedAction>();
  for (const finding of findings) {
    if (finding.severity !== "blocking") continue;
    for (const action of FINDING_DEPENDENCIES[finding.code] ?? []) {
      blocked.add(action);
    }
  }
  return ALL_ACTIONS.filter((action) => blocked.has(action));
}

function composeRequiredDocFindings(root: string): HealthFinding[] {
  const repoRoot = path.resolve(root, "../../../..");
  return [
    composeRequiredDocFinding(
      repoRoot,
      CONTENT_POLICY_REL,
      "content-policy",
      "Content policy document",
    ),
    composeRequiredDocFinding(
      repoRoot,
      PROSE_CRAFT_CONTRACT_REL,
      "prose-craft-contract",
      "Prose craft contract document",
    ),
  ].filter((finding): finding is HealthFinding => finding !== null);
}

function composeRequiredDocFinding(
  repoRoot: string,
  relativePath: string,
  codePrefix: "content-policy" | "prose-craft-contract",
  label: string,
): HealthFinding | null {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!existsSync(absolutePath)) {
    return {
      severity: "blocking",
      code: `${codePrefix}-missing`,
      path: absolutePath,
      message: `${label} is missing`,
      repair_hint: `Restore ${relativePath}; prompt copy/save depends on this document.`,
    };
  }
  try {
    statSync(absolutePath);
  } catch {
    return {
      severity: "blocking",
      code: `${codePrefix}-unreadable`,
      path: absolutePath,
      message: `${label} could not be inspected`,
      repair_hint: `Check file permissions for ${relativePath}; prompt copy/save depends on this document.`,
    };
  }
  return null;
}

function manuscriptFreshnessFinding(
  root: string,
  segmentOrder: readonly string[],
  manuscriptPath: string | null,
): HealthFinding | null {
  if (!manuscriptPath) {
    return {
      severity: "error",
      code: "manuscript-stale",
      path: path.join(root, "manuscript.md"),
      message: "manuscript.md has not been compiled for the current segment order",
      repair_hint: "Run manuscript compile to regenerate manuscript.md from segment_order.",
    };
  }

  let manuscriptMtime: number;
  try {
    manuscriptMtime = statSync(manuscriptPath).mtimeMs;
  } catch {
    return {
      severity: "error",
      code: "manuscript-stale",
      path: manuscriptPath,
      message: "manuscript.md could not be checked for freshness",
      repair_hint: "Run manuscript compile to regenerate manuscript.md from segment_order.",
    };
  }

  let newestSegmentMtime = 0;
  for (const segmentId of segmentOrder) {
    for (const suffix of [".md", ".yaml"] as const) {
      const segmentPath = path.join(root, "segments", `${segmentId}${suffix}`);
      try {
        newestSegmentMtime = Math.max(
          newestSegmentMtime,
          statSync(segmentPath).mtimeMs,
        );
      } catch {
        // Missing/malformed segment files are reported by the file pass. Do
        // not duplicate those as freshness findings.
      }
    }
  }

  if (newestSegmentMtime > manuscriptMtime) {
    return {
      severity: "error",
      code: "manuscript-stale",
      path: manuscriptPath,
      message: "manuscript.md is older than one or more ordered segments",
      repair_hint: "Run manuscript compile to regenerate manuscript.md from segment_order.",
    };
  }
  return null;
}

function metadataFinding(error: ReadError): HealthFinding {
  return {
    severity: "blocking",
    code: error.code === "yaml_parse_failed"
      ? "metadata-yaml-parse-failed"
      : "metadata-read-failed",
    path: error.path,
    message: "manual-story.yaml could not be read",
    repair_hint: error.repair_hint,
  };
}

function recordReadFinding(
  error: ReadError,
  recordClass: ManualRecordClass,
): HealthFinding {
  return {
    severity: "error",
    code: error.code === "yaml_parse_failed"
      ? "record-yaml-parse-failed"
      : "record-read-failed",
    path: error.path,
    message: `Record class ${recordClass} failed integrity checks`,
    repair_hint: error.repair_hint,
  };
}

function segmentSidecarFinding(error: ReadError, segmentId: string): HealthFinding {
  return {
    severity: "blocking",
    code: error.code === "file_not_found"
      ? "segment-sidecar-missing"
      : "segment-sidecar-malformed",
    path: error.path,
    message: `Segment ${segmentId} sidecar failed integrity checks`,
    repair_hint: error.repair_hint,
  };
}

function segmentBodyFinding(error: ReadError, segmentId: string): HealthFinding {
  return {
    severity: "blocking",
    code: error.code === "file_not_found"
      ? "segment-body-missing"
      : "segment-body-read-failed",
    path: error.path,
    message: `Segment ${segmentId} body failed integrity checks`,
    repair_hint: error.repair_hint,
  };
}

function recordPath(
  root: string,
  recordClass: ManualRecordClass,
  id: string,
): string {
  return path.join(root, "records", recordClass, `${id}.yaml`);
}
