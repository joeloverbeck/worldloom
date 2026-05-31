// Typed fetch client for the SPEC-104 beat-templates CRUD + candidates
// HTTP surface. Mirrors the per-tool pattern in api/records.ts /
// api/prompts.ts / api/segments.ts / api/manuscript.ts.

import type {
  BeatTemplate,
  BeatTemplateCandidate,
  CandidateRequestBody,
  ValidationError,
} from "../types/manual-story.js";

const enc = encodeURIComponent;

function baseUrl(worldSlug: string, msSlug: string): string {
  return `/api/worlds/${enc(worldSlug)}/manual-stories/${enc(msSlug)}/beat-templates`;
}

function candidatesUrl(worldSlug: string, msSlug: string): string {
  return `/api/worlds/${enc(worldSlug)}/manual-stories/${enc(msSlug)}/moment-composer/template-candidates`;
}

export type CreateOrUpdateResult =
  | { ok: true; id: string; template: BeatTemplate }
  | { ok: false; error: "validation_failed"; violations: ValidationError[] }
  | { ok: false; error: "not_found" }
  | { ok: false; error: "bad_request"; message: string };

export interface BeatTemplateDeleteResult {
  outcome?: "hard_deleted" | "inactive_default" | "force_deleted";
  archived?: boolean;
  deleted?: boolean;
}

export async function listBeatTemplates(
  worldSlug: string,
  msSlug: string,
  opts: { includeArchived?: boolean } = {},
): Promise<BeatTemplate[]> {
  const url = new URL(baseUrl(worldSlug, msSlug), window.location.origin);
  if (opts.includeArchived) url.searchParams.set("includeArchived", "true");
  const response = await fetch(url.pathname + url.search);
  if (!response.ok) {
    throw new Error(`listBeatTemplates → ${response.status}`);
  }
  const body = (await response.json()) as { templates: BeatTemplate[] };
  return body.templates;
}

export async function getBeatTemplate(
  worldSlug: string,
  msSlug: string,
  id: string,
): Promise<BeatTemplate | null> {
  const response = await fetch(`${baseUrl(worldSlug, msSlug)}/${enc(id)}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`getBeatTemplate → ${response.status}`);
  }
  const body = (await response.json()) as { template: BeatTemplate };
  return body.template;
}

export async function createBeatTemplate(
  worldSlug: string,
  msSlug: string,
  template: Omit<BeatTemplate, "id">,
): Promise<CreateOrUpdateResult> {
  const response = await fetch(baseUrl(worldSlug, msSlug), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ record: template }),
  });
  return interpretWriteResponse(response);
}

export async function updateBeatTemplate(
  worldSlug: string,
  msSlug: string,
  id: string,
  template: BeatTemplate,
): Promise<CreateOrUpdateResult> {
  const response = await fetch(`${baseUrl(worldSlug, msSlug)}/${enc(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ record: template }),
  });
  if (response.status === 404) return { ok: false, error: "not_found" };
  return interpretWriteResponse(response);
}

export async function deleteBeatTemplate(
  worldSlug: string,
  msSlug: string,
  id: string,
  opts: { force?: boolean } = {},
): Promise<BeatTemplateDeleteResult | { ok: false; error: "not_found" }> {
  const qs = opts.force ? "?force=true" : "";
  const response = await fetch(`${baseUrl(worldSlug, msSlug)}/${enc(id)}${qs}`, {
    method: "DELETE",
  });
  if (response.status === 404) return { ok: false, error: "not_found" };
  if (!response.ok) {
    throw new Error(`deleteBeatTemplate → ${response.status}`);
  }
  return (await response.json()) as BeatTemplateDeleteResult;
}

export async function getCandidates(
  worldSlug: string,
  msSlug: string,
  input: CandidateRequestBody,
): Promise<BeatTemplateCandidate[]> {
  const response = await fetch(candidatesUrl(worldSlug, msSlug), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(`getCandidates → ${response.status}`);
  }
  const body = (await response.json()) as { candidates: BeatTemplateCandidate[] };
  return body.candidates;
}

async function interpretWriteResponse(
  response: Response,
): Promise<CreateOrUpdateResult> {
  if (response.status === 200 || response.status === 201) {
    const body = (await response.json()) as { id: string; template: BeatTemplate };
    return { ok: true, id: body.id, template: body.template };
  }
  const errorBody = (await response.json().catch(() => ({}))) as {
    error?: string;
    violations?: ValidationError[];
    message?: string;
  };
  if (errorBody.error === "validation_failed") {
    return {
      ok: false,
      error: "validation_failed",
      violations: errorBody.violations ?? [],
    };
  }
  return {
    ok: false,
    error: "bad_request",
    message: errorBody.message ?? `request failed ${response.status}`,
  };
}
