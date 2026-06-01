import crypto from "node:crypto";
import {
  existsSync,
  readFileSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";

import YAML from "yaml";

import { compileManuscript } from "../manuscript/compile.js";
import type { PromptRunSidecar } from "../prompt/types.js";
import {
  type ManualStoryMetadata,
  type SegmentSidecar,
} from "../schema/manual-story.js";
import {
  buildStateUpdateChecklist,
  type StateUpdateChecklistPayload,
} from "../state-update-checklist.js";
import { scanReferences, type ReferrerEntry } from "../read/records.js";
import type { ReadError } from "../read/result.js";
import { allocateNextSegmentId } from "./segment-id-allocator.js";
import {
  assertInsideSandbox,
  safeWriteFile,
  type ManualStoryRoot,
} from "./sandbox.js";

export interface SaveSegmentInput {
  root: ManualStoryRoot;
  prose: string;
  title?: string;
  author_note?: string;
  prompt_id?: string | null;
  selected_template?: string | null;
  now?: () => string;
  compile?: typeof compileManuscript;
}

export interface EditSegmentInput {
  root: ManualStoryRoot;
  segment_id: string;
  prose: string;
  title?: string;
  author_note?: string;
  prompt_id?: string | null;
  selected_template?: string | null;
  now?: () => string;
  compile?: typeof compileManuscript;
}

export interface SegmentWriteResult {
  segment_id: string;
  prose_path: string;
  sidecar_path: string;
  sidecar: SegmentSidecar;
  checklist_payload: StateUpdateChecklistPayload;
}

export class SegmentReadFailureError extends Error {
  constructor(readonly readError: ReadError) {
    super(`segment_read_failed: ${readError.code} at ${readError.path}`);
  }
}

export type DeleteSegmentResult =
  | { ok: false; error: "not_found" }
  | {
      outcome: "hard_deleted";
      segment_id: string;
      referrers: ReferrerEntry[];
    }
  | {
      outcome: "segment_order_removed_files_preserved";
      segment_id: string;
      referrers: ReferrerEntry[];
    }
  | {
      outcome: "force_deleted";
      segment_id: string;
      referrers: ReferrerEntry[];
      warning: string;
    };

export interface DeleteSegmentInput {
  root: ManualStoryRoot;
  segment_id: string;
  force?: boolean;
  compile?: typeof compileManuscript;
}

export function saveSegment(input: SaveSegmentInput): SegmentWriteResult {
  const segment_id = allocateNextSegmentId(input.root.absolutePath);
  const timestamp = input.now ? input.now() : new Date().toISOString();
  const promptFields = readPromptFields(input.root, input.prompt_id ?? null);
  const sidecar: SegmentSidecar = {
    id: segment_id,
    created_at: timestamp,
    updated_at: timestamp,
    title: normalizeTitle(input.title, input.prose),
    prompt_id: input.prompt_id ?? null,
    prompt_sha256: promptFields.prompt_sha256,
    moment_directive: promptFields.moment_directive,
    selected_template: input.selected_template ?? promptFields.selected_template,
    included_record_summary: promptFields.included_record_summary,
    author_note: input.author_note ?? "",
    word_count: countWords(input.prose),
  };

  const prose_path = safeWriteFile(
    input.root,
    path.join("segments", `${segment_id}.md`),
    input.prose,
  );
  const sidecar_path = safeWriteFile(
    input.root,
    path.join("segments", `${segment_id}.yaml`),
    YAML.stringify(sidecar),
  );

  updateMetadata(input.root, (metadata) => {
    if (!metadata.segment_order.includes(segment_id)) {
      metadata.segment_order.push(segment_id);
    }
  });
  maybeCompile(input.root, input.compile);

  const checklistResult = buildStateUpdateChecklist({
    manualStoryRoot: input.root,
    sidecar,
  });
  if (!checklistResult.ok) throw new SegmentReadFailureError(checklistResult.error);
  const checklist_payload = checklistResult.value;
  return { segment_id, prose_path, sidecar_path, sidecar, checklist_payload };
}

export function editSegment(input: EditSegmentInput): SegmentWriteResult {
  if (!isSegmentId(input.segment_id)) {
    return missingEdit(input);
  }

  const existing = readSegmentSidecar(input.root, input.segment_id);
  if (!existing) {
    return missingEdit(input);
  }

  const timestamp = input.now ? input.now() : new Date().toISOString();
  const promptFields =
    input.prompt_id === undefined
      ? fieldsFromExisting(existing)
      : readPromptFields(input.root, input.prompt_id);
  const promptId = input.prompt_id === undefined
    ? existing.prompt_id
    : input.prompt_id;
  const sidecar: SegmentSidecar = {
    id: existing.id,
    created_at: existing.created_at,
    updated_at: timestamp,
    title: input.title === undefined
      ? existing.title
      : normalizeTitle(input.title, input.prose),
    prompt_id: promptId,
    prompt_sha256: promptFields.prompt_sha256,
    moment_directive: promptFields.moment_directive,
    selected_template: input.selected_template === undefined
      ? promptFields.selected_template
      : input.selected_template,
    included_record_summary: promptFields.included_record_summary,
    author_note: input.author_note ?? existing.author_note,
    word_count: countWords(input.prose),
  };

  const prose_path = safeWriteFile(
    input.root,
    path.join("segments", `${input.segment_id}.md`),
    input.prose,
  );
  const sidecar_path = safeWriteFile(
    input.root,
    path.join("segments", `${input.segment_id}.yaml`),
    YAML.stringify(sidecar),
  );
  maybeCompile(input.root, input.compile);

  const checklistResult = buildStateUpdateChecklist({
    manualStoryRoot: input.root,
    sidecar,
  });
  if (!checklistResult.ok) throw new SegmentReadFailureError(checklistResult.error);
  const checklist_payload = checklistResult.value;
  return {
    segment_id: input.segment_id,
    prose_path,
    sidecar_path,
    sidecar,
    checklist_payload,
  };
}

export function deleteSegment(input: DeleteSegmentInput): DeleteSegmentResult {
  if (!isSegmentId(input.segment_id)) {
    return { ok: false, error: "not_found" };
  }

  const prosePath = path.join(
    input.root.absolutePath,
    "segments",
    `${input.segment_id}.md`,
  );
  const sidecarPath = path.join(
    input.root.absolutePath,
    "segments",
    `${input.segment_id}.yaml`,
  );
  if (!existsSync(prosePath) || !existsSync(sidecarPath)) {
    return { ok: false, error: "not_found" };
  }

  const referrersResult = scanReferences(input.root.absolutePath, input.segment_id);
  if (!referrersResult.ok) throw new SegmentReadFailureError(referrersResult.error);
  const referrers = referrersResult.value.filter((entry) =>
      entry.recordClass === "consequences" &&
      entry.field === "caused_by_segment",
    );
  removeSegmentFromOrder(input.root, input.segment_id);

  if (referrers.length === 0 && input.force !== true) {
    unlinkSegmentFiles(input.root, prosePath, sidecarPath);
    maybeCompile(input.root, input.compile);
    return {
      outcome: "hard_deleted",
      segment_id: input.segment_id,
      referrers,
    };
  }

  if (input.force === true) {
    unlinkSegmentFiles(input.root, prosePath, sidecarPath);
    maybeCompile(input.root, input.compile);
    const referrerList = referrers.map((entry) => entry.id).join(", ");
    return {
      outcome: "force_deleted",
      segment_id: input.segment_id,
      referrers,
      warning: referrers.length > 0
        ? `force-deleted ${input.segment_id}; unresolved caused_by_segment referrers: ${referrerList}`
        : `force-deleted ${input.segment_id}; no caused_by_segment referrers found`,
    };
  }

  maybeCompile(input.root, input.compile);
  return {
    outcome: "segment_order_removed_files_preserved",
    segment_id: input.segment_id,
    referrers,
  };
}

function missingEdit(input: EditSegmentInput): never {
  throw new Error(`segment not found: ${input.segment_id}`);
}

function readPromptFields(
  root: ManualStoryRoot,
  promptId: string | null,
): Pick<
  SegmentSidecar,
  | "prompt_sha256"
  | "moment_directive"
  | "selected_template"
  | "included_record_summary"
> {
  if (promptId === null) {
    return {
      prompt_sha256: null,
      moment_directive: "",
      selected_template: null,
      included_record_summary: { characters: [], records: [] },
    };
  }
  if (!/^PROMPT-\d+$/.test(promptId)) {
    throw new Error(`invalid prompt id: ${promptId}`);
  }

  const promptPath = path.join(root.absolutePath, "prompts", `${promptId}.md`);
  const sidecarPath = path.join(
    root.absolutePath,
    "prompt-runs",
    `${promptId}.yaml`,
  );
  const markdown = readFileSync(promptPath, "utf8");
  const sidecar = YAML.parse(
    readFileSync(sidecarPath, "utf8"),
  ) as PromptRunSidecar;
  const prompt_sha256 = crypto
    .createHash("sha256")
    .update(markdown)
    .digest("hex");

  return {
    prompt_sha256,
    moment_directive: sidecar.moment_directive,
    // SPEC-104 §2.6: segment sidecar's `selected_template` carries the
    // mtemplate-<integer> id (not the path). Derive the id from the
    // prompt sidecar's path-shaped `included_template_path`. Returns
    // null when no template was selected.
    selected_template: deriveTemplateIdFromPath(sidecar.included_template_path),
    included_record_summary: {
      characters: sidecar.included_cast.slice(),
      records: sidecar.included_records.slice(),
    },
  };
}

function deriveTemplateIdFromPath(p: string | null | undefined): string | null {
  if (!p) return null;
  const m = /(mtemplate-\d+)\.yaml$/.exec(p);
  return m ? m[1] ?? null : null;
}

function fieldsFromExisting(
  sidecar: SegmentSidecar,
): ReturnType<typeof readPromptFields> {
  return {
    prompt_sha256: sidecar.prompt_sha256,
    moment_directive: sidecar.moment_directive,
    selected_template: sidecar.selected_template,
    included_record_summary: {
      characters: sidecar.included_record_summary.characters.slice(),
      records: sidecar.included_record_summary.records.slice(),
    },
  };
}

function readSegmentSidecar(
  root: ManualStoryRoot,
  segmentId: string,
): SegmentSidecar | null {
  const sidecarPath = path.join(root.absolutePath, "segments", `${segmentId}.yaml`);
  if (!existsSync(sidecarPath)) return null;
  const parsed = YAML.parse(readFileSync(sidecarPath, "utf8")) as unknown;
  return parsed as SegmentSidecar;
}

function updateMetadata(
  root: ManualStoryRoot,
  apply: (metadata: ManualStoryMetadata) => void,
): void {
  const metadata = readMetadata(root);
  apply(metadata);
  safeWriteFile(root, "manual-story.yaml", YAML.stringify(metadata));
}

function readMetadata(root: ManualStoryRoot): ManualStoryMetadata {
  const metadataPath = path.join(root.absolutePath, "manual-story.yaml");
  return YAML.parse(readFileSync(metadataPath, "utf8")) as ManualStoryMetadata;
}

function removeSegmentFromOrder(root: ManualStoryRoot, segmentId: string): void {
  updateMetadata(root, (metadata) => {
    metadata.segment_order = metadata.segment_order.filter((id) => id !== segmentId);
  });
}

function maybeCompile(
  root: ManualStoryRoot,
  compile: typeof compileManuscript = compileManuscript,
): void {
  const metadata = readMetadata(root);
  if (metadata.manuscript.compile_on_segment_save) {
    compile({ manualStoryRoot: root });
  }
}

function unlinkSegmentFiles(
  root: ManualStoryRoot,
  prosePath: string,
  sidecarPath: string,
): void {
  assertInsideSandbox(prosePath, root);
  assertInsideSandbox(sidecarPath, root);
  unlinkSync(prosePath);
  unlinkSync(sidecarPath);
}

function normalizeTitle(title: string | undefined, prose: string): string {
  const trimmed = title?.trim();
  if (trimmed) return trimmed;
  const firstSentence = prose
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s/u)[0]
    ?.trim();
  if (!firstSentence) return "Untitled segment";
  return firstSentence.length > 80
    ? `${firstSentence.slice(0, 77).trimEnd()}...`
    : firstSentence;
}

function countWords(prose: string): number {
  return prose.trim().length === 0 ? 0 : prose.trim().split(/\s+/u).length;
}

function isSegmentId(id: string): boolean {
  return /^SEG-\d+$/.test(id);
}
