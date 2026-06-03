import type {
  PromptWorkingSet,
  ValidationError,
} from "../types/manual-story.js";

export type SavePromptWorkingSetResult =
  | { ok: true; context: PromptWorkingSet }
  | { ok: false; findings: ValidationError[] };

const enc = encodeURIComponent;

function promptWorkingSetBase(worldSlug: string, msSlug: string): string {
  return `/api/worlds/${enc(worldSlug)}/manual-stories/${enc(msSlug)}/prompt-working-set`;
}

export async function fetchPromptWorkingSet(
  worldSlug: string,
  msSlug: string,
): Promise<PromptWorkingSet | null> {
  const response = await fetch(promptWorkingSetBase(worldSlug, msSlug));
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`fetchPromptWorkingSet -> ${response.status}`);
  return (await response.json()) as PromptWorkingSet | null;
}

export async function savePromptWorkingSet(
  worldSlug: string,
  msSlug: string,
  ctx: PromptWorkingSet,
): Promise<SavePromptWorkingSetResult> {
  const response = await fetch(promptWorkingSetBase(worldSlug, msSlug), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ctx),
  });
  if (response.status === 200) {
    return { ok: true, context: (await response.json()) as PromptWorkingSet };
  }
  const body = (await response.json().catch(() => ({}))) as {
    findings?: ValidationError[];
  };
  return { ok: false, findings: body.findings ?? [] };
}
