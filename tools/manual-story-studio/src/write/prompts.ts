// Prompt write layer.
//
// Persists author-saved prompts as two paired files inside the manual-story
// sandbox: prompts/PROMPT-<n>.md (the Markdown) and prompt-runs/PROMPT-<n>.yaml
// (the sidecar carrying id, created_at, included cast/records/template,
// moment_directive, prompt_sha256, and an optional lint_override). The
// prompt_sha256 is informational only per [[feedback_author_rejects_hash_coupling]]
// and SPEC-102 §3 Key Decisions — no downstream code reads it as a
// precondition.

import crypto from "node:crypto";
import path from "node:path";

import YAML from "yaml";

import type {
  PromptComposeResult,
  PromptLintFinding,
  PromptRunSidecar,
} from "../prompt/types.js";
import { allocateNextPromptId } from "./id-allocator.js";
import {
  assertInsideSandbox,
  safeWriteFile,
  type ManualStoryRoot,
} from "./sandbox.js";

export interface WritePromptInput {
  root: ManualStoryRoot;
  composeResult: PromptComposeResult;
  lint_override?: {
    findings: PromptLintFinding[];
    copied_anyway_at: string;
  };
  // Override the created_at timestamp for deterministic tests. Default
  // is new Date().toISOString() at write time.
  now?: () => string;
}

export interface WritePromptResult {
  id: string;
  markdown_path: string;
  sidecar_path: string;
  sidecar: PromptRunSidecar;
}

export function writePrompt(input: WritePromptInput): WritePromptResult {
  const id = allocateNextPromptId(input.root.absolutePath);
  const markdown = input.composeResult.markdown;
  const promptSha256 = crypto
    .createHash("sha256")
    .update(markdown)
    .digest("hex");

  const created_at = input.now ? input.now() : new Date().toISOString();
  const sidecar: PromptRunSidecar = {
    id,
    created_at,
    manual_story_slug: input.composeResult.sidecar_draft.manual_story_slug,
    included_cast: input.composeResult.sidecar_draft.included_cast.slice(),
    included_records: input.composeResult.sidecar_draft.included_records.slice(),
    included_template_path:
      input.composeResult.sidecar_draft.included_template_path,
    moment_directive: input.composeResult.sidecar_draft.moment_directive,
    prompt_sha256: promptSha256,
  };
  if (input.lint_override) {
    sidecar.lint_override = input.lint_override;
  }

  const markdownRel = path.join("prompts", `${id}.md`);
  const sidecarRel = path.join("prompt-runs", `${id}.yaml`);

  const markdown_path = safeWriteFile(input.root, markdownRel, markdown);
  const sidecar_path = safeWriteFile(
    input.root,
    sidecarRel,
    YAML.stringify(sidecar),
  );

  // Belt-and-braces: confirm both writes land inside the sandbox. Even
  // though safeWriteFile already asserts, an explicit re-check at the
  // write-layer top makes the invariant grep-findable.
  assertInsideSandbox(markdown_path, input.root);
  assertInsideSandbox(sidecar_path, input.root);

  return { id, markdown_path, sidecar_path, sidecar };
}
