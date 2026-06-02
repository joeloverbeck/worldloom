import type {
  CurrentContext,
  ValidationError,
} from "../types/manual-story.js";

export type SaveCurrentContextResult =
  | { ok: true; context: CurrentContext }
  | { ok: false; findings: ValidationError[] };

const enc = encodeURIComponent;

function currentContextBase(worldSlug: string, msSlug: string): string {
  return `/api/worlds/${enc(worldSlug)}/manual-stories/${enc(msSlug)}/current-context`;
}

export async function fetchCurrentContext(
  worldSlug: string,
  msSlug: string,
): Promise<CurrentContext | null> {
  const response = await fetch(currentContextBase(worldSlug, msSlug));
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`fetchCurrentContext -> ${response.status}`);
  return (await response.json()) as CurrentContext | null;
}

export async function saveCurrentContext(
  worldSlug: string,
  msSlug: string,
  ctx: CurrentContext,
): Promise<SaveCurrentContextResult> {
  const response = await fetch(currentContextBase(worldSlug, msSlug), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ctx),
  });
  if (response.status === 200) {
    return { ok: true, context: (await response.json()) as CurrentContext };
  }
  const body = (await response.json().catch(() => ({}))) as {
    findings?: ValidationError[];
  };
  return { ok: false, findings: body.findings ?? [] };
}
