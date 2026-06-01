import type {
  SegmentSidecar,
  StateUpdateChecklistPayload,
} from "../types/manual-story.js";

const enc = encodeURIComponent;

function segmentsBase(worldSlug: string, msSlug: string): string {
  return `/api/worlds/${enc(worldSlug)}/manual-stories/${enc(msSlug)}/segments`;
}

async function readErrorBody(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string; message?: string };
    return body.message ?? body.error ?? `request failed ${response.status}`;
  } catch {
    return `request failed ${response.status}`;
  }
}

export interface SegmentListEntry {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  word_count: number;
}

export interface SaveSegmentRequest {
  prose: string;
  title?: string;
  author_note?: string;
  prompt_id?: string | null;
}

export interface SaveSegmentResponse {
  segment_id: string;
  sidecar: SegmentSidecar;
  checklist_payload: StateUpdateChecklistPayload;
}

export interface ReadSegmentResponse {
  body: string;
  sidecar: SegmentSidecar;
}

export interface SegmentReferrer {
  recordClass: string;
  id: string;
  field: string;
}

export interface DeleteSegmentResponse {
  outcome:
    | "hard_deleted"
    | "segment_order_removed_files_preserved"
    | "force_deleted";
  referrers: SegmentReferrer[];
  warning?: string;
}

export async function listSegments(
  worldSlug: string,
  msSlug: string,
): Promise<SegmentListEntry[]> {
  const response = await fetch(segmentsBase(worldSlug, msSlug));
  if (!response.ok) {
    throw new Error(`listSegments -> ${await readErrorBody(response)}`);
  }
  const body = (await response.json()) as { segments: SegmentListEntry[] };
  return body.segments;
}

export async function saveSegment(
  worldSlug: string,
  msSlug: string,
  request: SaveSegmentRequest,
): Promise<SaveSegmentResponse> {
  const response = await fetch(segmentsBase(worldSlug, msSlug), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error(`saveSegment -> ${await readErrorBody(response)}`);
  }
  return (await response.json()) as SaveSegmentResponse;
}

export async function readSegment(
  worldSlug: string,
  msSlug: string,
  segmentId: string,
): Promise<ReadSegmentResponse | null> {
  const response = await fetch(
    `${segmentsBase(worldSlug, msSlug)}/${enc(segmentId)}`,
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`readSegment -> ${await readErrorBody(response)}`);
  }
  return (await response.json()) as ReadSegmentResponse;
}

export async function editSegment(
  worldSlug: string,
  msSlug: string,
  segmentId: string,
  request: SaveSegmentRequest,
  options: { mode?: "repair"; force_replace?: boolean } = {},
): Promise<SaveSegmentResponse> {
  const params = new URLSearchParams();
  if (options.mode) params.set("mode", options.mode);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const body = options.force_replace
    ? { ...request, force_replace: true }
    : request;
  const response = await fetch(
    `${segmentsBase(worldSlug, msSlug)}/${enc(segmentId)}${qs}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    throw new Error(`editSegment -> ${await readErrorBody(response)}`);
  }
  return (await response.json()) as SaveSegmentResponse;
}

export async function deleteSegment(
  worldSlug: string,
  msSlug: string,
  segmentId: string,
  options: { force?: boolean; mode?: "repair" } = {},
): Promise<DeleteSegmentResponse | { ok: false; error: "not_found" }> {
  const params = new URLSearchParams();
  if (options.mode) params.set("mode", options.mode);
  if (options.force) params.set("force", "true");
  const qs = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(
    `${segmentsBase(worldSlug, msSlug)}/${enc(segmentId)}${qs}`,
    { method: "DELETE" },
  );
  if (response.status === 404) return { ok: false, error: "not_found" };
  if (!response.ok) {
    throw new Error(`deleteSegment -> ${await readErrorBody(response)}`);
  }
  return (await response.json()) as DeleteSegmentResponse;
}
