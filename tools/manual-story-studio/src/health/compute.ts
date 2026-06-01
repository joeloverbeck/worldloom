import path from "node:path";

import {
  MANUAL_RECORD_CLASSES,
  type ManualRecordClass,
} from "../schema/manual-story.js";
import { readManualStoryMetadata } from "../read/manual-story-metadata.js";
import {
  listAllKnownIds,
  listRecords,
  readRecord,
} from "../read/records.js";
import { readSegmentBody, readSegmentSidecar } from "../read/segments.js";
import { readManuscript } from "../read/manuscript.js";
import { validateRecord, validateManualStoryMetadata } from "../validate/schema.js";
import { validateRefs } from "../validate/refs.js";
import {
  deriveHealthStatus,
  type BlockedAction,
  type HealthFinding,
  type HealthReport,
} from "./types.js";
import type { ReadError } from "../read/result.js";

const ALL_BLOCKED_ACTIONS: BlockedAction[] = [
  "prompt_copy",
  "prompt_save",
  "segment_save",
  "manuscript_compile",
];

export function computeHealth(manualStoryRoot: string): HealthReport {
  const findings: HealthFinding[] = [];

  findings.push(...runFilePass(manualStoryRoot));
  findings.push(...runSchemaPass(manualStoryRoot));
  findings.push(...runReferencePass(manualStoryRoot));

  const status = deriveHealthStatus(findings);
  return {
    status,
    findings,
    blocked_actions: status === "blocked" ? ALL_BLOCKED_ACTIONS : [],
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
    const result = listRecords(root, cls, { includeArchived: true });
    if (!result.ok) {
      findings.push(recordReadFinding(result.error, cls));
    }
  }

  for (const segmentId of metadata.value.segment_order) {
    const sidecar = readSegmentSidecar({ manualStoryRoot: root, segmentId });
    if (!sidecar.ok) {
      findings.push(segmentSidecarFinding(sidecar.error, segmentId));
    }

    const body = readSegmentBody({ manualStoryRoot: root, segmentId });
    if (!body.ok) {
      findings.push(segmentBodyFinding(body.error, segmentId));
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
    const summaries = listRecords(root, cls, { includeArchived: true });
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
  for (const cls of MANUAL_RECORD_CLASSES) {
    const summaries = listRecords(root, cls, { includeArchived: true });
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
  return findings;
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
