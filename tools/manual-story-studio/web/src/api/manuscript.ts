const enc = encodeURIComponent;

function manuscriptBase(worldSlug: string, msSlug: string): string {
  return `/api/worlds/${enc(worldSlug)}/manual-stories/${enc(msSlug)}/manuscript`;
}

async function readErrorBody(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string; message?: string };
    return body.message ?? body.error ?? `request failed ${response.status}`;
  } catch {
    return `request failed ${response.status}`;
  }
}

export interface ManuscriptResponse {
  manuscript_path: string;
  body: string;
  byte_count: number;
  word_count: number;
}

export interface RebuildManuscriptResponse {
  manuscript_path: string;
  segments_compiled: number;
  byte_count: number;
}

export async function readManuscript(
  worldSlug: string,
  msSlug: string,
): Promise<ManuscriptResponse | null> {
  const response = await fetch(manuscriptBase(worldSlug, msSlug));
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`readManuscript -> ${await readErrorBody(response)}`);
  }
  return (await response.json()) as ManuscriptResponse;
}

export async function rebuildManuscript(
  worldSlug: string,
  msSlug: string,
): Promise<RebuildManuscriptResponse> {
  const response = await fetch(`${manuscriptBase(worldSlug, msSlug)}/rebuild`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`rebuildManuscript -> ${await readErrorBody(response)}`);
  }
  return (await response.json()) as RebuildManuscriptResponse;
}
