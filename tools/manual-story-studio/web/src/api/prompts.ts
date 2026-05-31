import type {
  PromptComposeRequestInput,
  PromptComposeResult,
  PromptLintFinding,
  PromptLintResult,
  PromptRunSidecar,
} from "../types/manual-story.js";

const enc = encodeURIComponent;

function promptsBase(worldSlug: string, msSlug: string): string {
  return `/api/worlds/${enc(worldSlug)}/manual-stories/${enc(msSlug)}/prompts`;
}

export interface PromptListEntry {
  id: string;
  created_at: string;
  moment_directive_snippet: string;
  linked_segments: string[];
  // SPEC-104: derived `mtemplate-<integer>` id from the prompt sidecar's
  // included_template_path (null if no template was selected). Surfaced
  // by PromptHistory.tsx alongside the other per-prompt metadata.
  selected_template: string | null;
}

export interface SavePromptResult {
  id: string;
  markdown_path: string;
  sidecar_path: string;
  sidecar: PromptRunSidecar;
  lint: PromptLintResult;
}

async function readErrorBody(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string; message?: string };
    return body.message ?? body.error ?? `request failed ${response.status}`;
  } catch {
    return `request failed ${response.status}`;
  }
}

export async function previewPrompt(
  worldSlug: string,
  msSlug: string,
  input: PromptComposeRequestInput,
): Promise<PromptComposeResult> {
  const response = await fetch(
    `${promptsBase(worldSlug, msSlug)}/preview`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) {
    throw new Error(`previewPrompt → ${await readErrorBody(response)}`);
  }
  return (await response.json()) as PromptComposeResult;
}

export type SavePromptOutcome =
  | { ok: true; saved: SavePromptResult }
  | {
      ok: false;
      error: "lint_blocks_save";
      findings: PromptLintFinding[];
    }
  | { ok: false; error: "bad_request"; message: string };

export async function savePrompt(
  worldSlug: string,
  msSlug: string,
  input: PromptComposeRequestInput & {
    lint_override?: {
      findings: PromptLintFinding[];
      copied_anyway_at: string;
    };
  },
): Promise<SavePromptOutcome> {
  const response = await fetch(promptsBase(worldSlug, msSlug), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (response.status === 201) {
    const saved = (await response.json()) as SavePromptResult;
    return { ok: true, saved };
  }
  if (response.status === 409) {
    const body = (await response.json()) as {
      error: "lint_blocks_save";
      findings: PromptLintFinding[];
    };
    return { ok: false, error: "lint_blocks_save", findings: body.findings };
  }
  return {
    ok: false,
    error: "bad_request",
    message: await readErrorBody(response),
  };
}

export async function listPrompts(
  worldSlug: string,
  msSlug: string,
): Promise<{ prompts: PromptListEntry[] }> {
  const response = await fetch(promptsBase(worldSlug, msSlug));
  if (!response.ok) {
    throw new Error(`listPrompts → ${await readErrorBody(response)}`);
  }
  return (await response.json()) as { prompts: PromptListEntry[] };
}

export async function getPrompt(
  worldSlug: string,
  msSlug: string,
  promptId: string,
): Promise<{ markdown: string; sidecar: PromptRunSidecar } | null> {
  const response = await fetch(
    `${promptsBase(worldSlug, msSlug)}/${enc(promptId)}`,
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`getPrompt → ${await readErrorBody(response)}`);
  }
  return (await response.json()) as { markdown: string; sidecar: PromptRunSidecar };
}
