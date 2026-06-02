import type {
  ManualRecord,
  ManualRecordClass,
  ManualRecordSummary,
  ManualStoryMetadata,
  RefViolation,
  ValidationError,
} from "../types/manual-story.js";

export type CreateResult =
  | { ok: true; id: string; record: ManualRecord }
  | { ok: false; error: "validation_failed"; errors: ValidationError[] }
  | {
      ok: false;
      error: "broken_refs";
      violations: RefViolation[];
      needsOverride: true;
    }
  | { ok: false; error: "bad_request"; message: string };

export type UpdateResult = CreateResult | { ok: false; error: "not_found" };

export type DeleteResult =
  | { outcome: "hard_deleted"; id: string }
  | {
      outcome: "inactive_default";
      id: string;
      retiredReason: string;
      referrers: Array<{ recordClass: ManualRecordClass; id: string; field: string }>;
    }
  | {
      outcome: "force_deleted";
      id: string;
      auditEntry: {
        deletedAt: string;
        deletedClassAndId: string;
        referrers: Array<{
          recordClass: ManualRecordClass;
          id: string;
          field: string;
        }>;
      };
    }
  | { ok: false; error: "not_found" };

export type MetadataUpdateResult =
  | { ok: true }
  | {
      ok: false;
      status: number;
      error: string;
      message?: string;
      errors?: ValidationError[];
    };

const enc = encodeURIComponent;

function recordsBase(worldSlug: string, msSlug: string): string {
  return `/api/worlds/${enc(worldSlug)}/manual-stories/${enc(msSlug)}/records`;
}

function metadataBase(worldSlug: string, msSlug: string): string {
  return `/api/worlds/${enc(worldSlug)}/manual-stories/${enc(msSlug)}/metadata`;
}

export async function listRecords(
  worldSlug: string,
  msSlug: string,
  recordClass: ManualRecordClass,
  opts: { includeArchived?: boolean } = {},
): Promise<ManualRecordSummary[]> {
  const url = new URL(recordsBase(worldSlug, msSlug), window.location.origin);
  url.searchParams.set("class", recordClass);
  if (opts.includeArchived) url.searchParams.set("includeArchived", "true");
  const response = await fetch(url.pathname + url.search);
  if (!response.ok) {
    throw new Error(`listRecords ${recordClass} → ${response.status}`);
  }
  const body = (await response.json()) as { records: ManualRecordSummary[] };
  return body.records;
}

export interface ManualRecordSummaryWithClass {
  recordClass: ManualRecordClass;
  summary: ManualRecordSummary;
}

export async function listRecordsForClasses(
  worldSlug: string,
  msSlug: string,
  classes: readonly ManualRecordClass[],
  opts: { includeArchived?: boolean } = {},
): Promise<ManualRecordSummaryWithClass[]> {
  const entries = await Promise.all(
    classes.map((recordClass) =>
      listRecords(worldSlug, msSlug, recordClass, opts).then((records) => ({
        recordClass,
        records,
      })),
    ),
  );
  return entries.flatMap(({ recordClass, records }) =>
    records.map((summary) => ({ recordClass, summary })),
  );
}

export async function readRecord(
  worldSlug: string,
  msSlug: string,
  recordClass: ManualRecordClass,
  id: string,
): Promise<ManualRecord | null> {
  const response = await fetch(
    `${recordsBase(worldSlug, msSlug)}/${enc(recordClass)}/${enc(id)}`,
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`readRecord → ${response.status}`);
  const body = (await response.json()) as { record: ManualRecord };
  return body.record;
}

export async function createRecord(
  worldSlug: string,
  msSlug: string,
  recordClass: ManualRecordClass,
  record: Omit<ManualRecord, "id">,
  opts: { overrideBrokenRefs?: boolean } = {},
): Promise<CreateResult> {
  const response = await fetch(
    `${recordsBase(worldSlug, msSlug)}/${enc(recordClass)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ record, overrideBrokenRefs: opts.overrideBrokenRefs }),
    },
  );
  return interpretWriteResponse(response);
}

export async function updateRecord(
  worldSlug: string,
  msSlug: string,
  recordClass: ManualRecordClass,
  id: string,
  record: ManualRecord,
  opts: { overrideBrokenRefs?: boolean } = {},
): Promise<UpdateResult> {
  const response = await fetch(
    `${recordsBase(worldSlug, msSlug)}/${enc(recordClass)}/${enc(id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ record, overrideBrokenRefs: opts.overrideBrokenRefs }),
    },
  );
  if (response.status === 404) return { ok: false, error: "not_found" };
  return interpretWriteResponse(response);
}

async function interpretWriteResponse(response: Response): Promise<CreateResult> {
  if (response.status === 200 || response.status === 201) {
    const body = (await response.json()) as { id: string; record: ManualRecord };
    return { ok: true, id: body.id, record: body.record };
  }
  const errorBody = (await response.json().catch(() => ({}))) as {
    error?: string;
    errors?: ValidationError[];
    violations?: RefViolation[];
    needsOverride?: boolean;
    message?: string;
  };
  if (errorBody.error === "validation_failed") {
    return {
      ok: false,
      error: "validation_failed",
      errors: errorBody.errors ?? [],
    };
  }
  if (errorBody.error === "broken_refs") {
    return {
      ok: false,
      error: "broken_refs",
      violations: errorBody.violations ?? [],
      needsOverride: true,
    };
  }
  return {
    ok: false,
    error: "bad_request",
    message: errorBody.message ?? `request failed ${response.status}`,
  };
}

export async function deleteRecord(
  worldSlug: string,
  msSlug: string,
  recordClass: ManualRecordClass,
  id: string,
  opts: { force?: boolean } = {},
): Promise<DeleteResult> {
  const qs = opts.force ? "?force=true" : "";
  const response = await fetch(
    `${recordsBase(worldSlug, msSlug)}/${enc(recordClass)}/${enc(id)}${qs}`,
    { method: "DELETE" },
  );
  if (response.status === 404) return { ok: false, error: "not_found" };
  if (!response.ok) {
    throw new Error(`deleteRecord → ${response.status}`);
  }
  return (await response.json()) as DeleteResult;
}

export async function readMetadata(
  worldSlug: string,
  msSlug: string,
): Promise<ManualStoryMetadata | null> {
  const response = await fetch(metadataBase(worldSlug, msSlug));
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`readMetadata → ${response.status}`);
  const body = (await response.json()) as { metadata: ManualStoryMetadata };
  return body.metadata;
}

export async function updateMetadata(
  worldSlug: string,
  msSlug: string,
  metadata: ManualStoryMetadata,
): Promise<MetadataUpdateResult> {
  const response = await fetch(metadataBase(worldSlug, msSlug), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metadata }),
  });
  if (response.status === 200) return { ok: true };
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
    errors?: ValidationError[];
  };
  return {
    ok: false,
    status: response.status,
    error: body.error ?? "error",
    message: body.message,
    errors: body.errors,
  };
}
