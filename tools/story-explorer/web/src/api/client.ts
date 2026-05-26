// Frontend mirror of tools/story-explorer/src/view-models/index-status.ts.
export type IndexStatus =
  | { kind: 'fresh'; version: number }
  | { kind: 'missing'; remedy: string }
  | { kind: 'version_mismatch'; expected: number; found: number; remedy: string }
  | { kind: 'empty'; remedy: string }
  | { kind: 'stale'; driftedFiles: string[]; remedy: string }
  | { kind: 'open_failed'; error: string };

// Frontend mirror of tools/story-explorer/src/server/http.ts ResponseEnvelope.
export interface ResponseEnvelope {
  requestId: string;
  serverVersion: string;
  worldIndexStatus: IndexStatus | null;
}

export interface EnvelopedResult<T> {
  envelope: ResponseEnvelope | null;
  payload: T;
}

interface BackendEnvelope<T> {
  _envelope?: ResponseEnvelope;
  data?: T;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `Story Explorer API request failed with status ${status}.`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

// Frontend mirrors of tools/story-explorer/src/view-models/world-summary.ts and story-summary.ts.
export interface WorldSummary {
  worldSlug: string;
  displayName: string;
  path: string;
  indexStatus: IndexStatus;
  storyCount: number;
  hasWorldDb: boolean;
  indexVersion: number | null;
  driftedFiles: string[];
  errors: string[];
}

export interface StorySummary {
  worldSlug: string;
  storySlug: string;
  storyId: string;
  title: string | null;
  kernelPath: string;
  pageCount: number;
  choiceCount: number;
  branchCount: number;
  renderedProseCount: number;
  leafPageIds: string[];
  rootPageId: string | null;
  latestPageId: string | null;
  indexStatus: IndexStatus;
}

// Frontend mirror of tools/story-explorer/src/view-models/page-summary.ts.
export type TerminalReason = 'no_children' | 'paused' | 'terminal' | null;

export interface PageSummary {
  pageId: string;
  branchId: string;
  parentPageId: string | null;
  turnIndex: number;
  choiceId: string | null;
  resolvedEventId: string | null;
  hasRenderedProse: boolean;
  hasPlan: boolean;
  hasReceipt: boolean;
  activeRecordCounts: Record<string, number>;
  childCount: number;
  isLeaf: boolean;
  isTerminalOrPaused: boolean;
  terminalReason: TerminalReason;
}

// Frontend mirrors of tools/story-explorer/src/view-models/child-outcome-variant.ts and choice-navigation.ts.
export interface ChildOutcomeVariant {
  pageId: string;
  branchId: string;
  turnIndex: number;
  resolvedEventId: string | null;
  outcomeRoute: string | null;
  resolutionPreview: string | null;
  selectedStoryletId: string | null;
  hasRenderedProse: boolean;
  stateDeltaCounts: {
    create: number;
    supersede: number;
    close: number;
  };
}

export interface ChoiceNavigation {
  choiceId: string;
  surfaceLabel: string;
  playerVisibleIntent: string;
  pressure: string[];
  groundedInCount: number;
  childOutcomeVariants: ChildOutcomeVariant[];
  isNavigable: boolean;
}

// Frontend mirror of tools/story-explorer/src/view-models/page-detail.ts.
export type ProseStatus = 'present' | 'missing' | 'unreadable' | 'hash_mismatch';

export interface PagePlanSummary {
  path: string;
  body: string;
}

export interface ReceiptSummary {
  path: string;
  verdict: string | null;
  stateHash: string | null;
  body: Record<string, unknown>;
}

export interface EventDeltaSummary {
  eventId: string | null;
  createCount: number;
  supersedeCount: number;
  closeCount: number;
  introducedRecordIds: string[];
  relationCount: number;
}

export interface ValidationIntegritySummary {
  validationTrace: Record<string, unknown>;
  receiptVerdict: string | null;
  proseStatus: ProseStatus;
  receiptPresence?: 'present' | 'missing' | 'unreadable';
  stateHashStatus?: 'match' | 'mismatch' | 'not_checked';
  planHashStatus?: 'present' | 'missing' | 'not_checked';
  malformedYamlWarnings?: string[];
  skippedRecords?: string[];
  brokenRefs?: string[];
}

export interface BranchContext {
  branchId: string;
  branchPath: string[];
  parentPageId: string | null;
  turnIndex: number;
}

export interface RawSourceReference {
  recordId: string;
  sourcePath: string;
  contentHash: string;
}

export interface PageDetail {
  page: Record<string, unknown>;
  prose: string | null;
  proseStatus: ProseStatus;
  pagePlanSummary: PagePlanSummary | null;
  receiptSummary: ReceiptSummary | null;
  choiceNavigation: ChoiceNavigation[];
  currentStateRecordIds: string[];
  eventDelta: EventDeltaSummary;
  validationIntegrity: ValidationIntegritySummary;
  branchContext: BranchContext;
  rawSources: RawSourceReference[];
}

// Frontend mirrors of tools/story-explorer/src/view-models/record-link.ts and record-card.ts.
export interface RecordLink {
  recordId: string;
  recordClass: string;
  label: string;
  relationship: string;
  targetExists: boolean;
  activeOnCurrentPage: boolean;
  targetPageId: string | null;
  brokenReason: string | null;
}

export type RecordGroup =
  | 'Cast & Status'
  | 'Scene & Affordances'
  | 'Knowledge & Truth'
  | 'Plans & Emotion'
  | 'Relationships & Debts'
  | 'Pressure & Open Loops'
  | 'Event Delta'
  | 'Validation & Integrity';

export interface RecordField {
  name: string;
  value: string;
}

export interface RecordChip {
  label: string;
  value: string;
}

export interface RecordProvenanceSummary {
  createdAtPage: string | null;
  creatingEventId: string | null;
  modifyingEventIds: string[];
  evidenceRecordIds: string[];
}

export interface RecordCard {
  recordId: string;
  recordClass: string;
  group: RecordGroup;
  summaryLine: string;
  chips: RecordChip[];
  primaryFields: RecordField[];
  secondaryFields: RecordField[];
  status: string | null;
  visibility: string | null;
  confidence: string | null;
  urgency: string | null;
  participants: string[];
  provenance: RecordProvenanceSummary;
  links: RecordLink[];
  rawAvailable: boolean;
  sourcePath: string | null;
  contentHash: string | null;
}

export interface RecordDetail {
  record: Record<string, unknown>;
  recordCard: RecordCard;
}

export interface RawRecordSource {
  body: string;
  sourcePath: string;
  contentHash: string;
}

// Frontend mirrors of tools/story-explorer/src/view-models/branch-map-node.ts and branch-map-edge.ts.
export interface BranchMapNode {
  pageId: string;
  branchId: string;
  turnIndex: number;
  label: string;
  hasProse: boolean;
  isCurrent: boolean;
  isLeaf: boolean;
  isTerminal: boolean;
  eventKind: string | null;
  outcomeRoute: string | null;
}

export interface BranchMapEdge {
  fromPageId: string;
  toPageId: string;
  choiceId: string | null;
  choiceLabel: string | null;
  variantLabel: string | null;
  branchId: string;
}

export interface ProseBody {
  body: string | null;
  status: ProseStatus;
}

export interface PagePlanBody {
  body: string;
  sourcePath: string;
}

export interface ProseReceiptBody {
  body: Record<string, unknown>;
  sourcePath: string;
}

function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

export async function fetchEnveloped<T>(url: string, init?: RequestInit): Promise<EnvelopedResult<T>> {
  const response = await fetch(url, init);
  const body = (await response.json()) as BackendEnvelope<T> | unknown;

  if (!response.ok) {
    throw new ApiError(response.status, body);
  }

  if (typeof body === 'object' && body !== null && 'data' in body) {
    const candidate = body as BackendEnvelope<T>;
    return {
      envelope: candidate._envelope ?? null,
      payload: candidate.data as T,
    };
  }

  return {
    envelope: null,
    payload: body as T,
  };
}

export function listWorlds(): Promise<EnvelopedResult<WorldSummary[]>> {
  return fetchEnveloped('/api/worlds');
}

export function getWorld(slug: string): Promise<EnvelopedResult<WorldSummary>> {
  return fetchEnveloped(`/api/worlds/${encodeSegment(slug)}`);
}

export function listStories(slug: string): Promise<EnvelopedResult<StorySummary[]>> {
  return fetchEnveloped(`/api/worlds/${encodeSegment(slug)}/stories`);
}

export function getStory(slug: string, storySlug: string): Promise<EnvelopedResult<StorySummary>> {
  return fetchEnveloped(`/api/worlds/${encodeSegment(slug)}/stories/${encodeSegment(storySlug)}`);
}

export function listPages(slug: string, storySlug: string): Promise<EnvelopedResult<PageSummary[]>> {
  return fetchEnveloped(`/api/worlds/${encodeSegment(slug)}/stories/${encodeSegment(storySlug)}/pages?list=1`);
}

export function getRootPage(slug: string, storySlug: string): Promise<EnvelopedResult<PageSummary | null>> {
  return fetchEnveloped(`/api/worlds/${encodeSegment(slug)}/stories/${encodeSegment(storySlug)}/pages?root=1`);
}

export function getLatestPage(slug: string, storySlug: string): Promise<EnvelopedResult<PageSummary | null>> {
  return fetchEnveloped(`/api/worlds/${encodeSegment(slug)}/stories/${encodeSegment(storySlug)}/pages?latest=1`);
}

export function getPageDetail(slug: string, storySlug: string, pageId: string): Promise<EnvelopedResult<PageDetail>> {
  return fetchEnveloped(
    `/api/worlds/${encodeSegment(slug)}/stories/${encodeSegment(storySlug)}/pages/${encodeSegment(pageId)}`,
  );
}

export function getProseBody(slug: string, storySlug: string, pageId: string): Promise<EnvelopedResult<ProseBody>> {
  return fetchEnveloped(
    `/api/worlds/${encodeSegment(slug)}/stories/${encodeSegment(storySlug)}/prose/${encodeSegment(pageId)}`,
  );
}

// SPEC-89/90 routes are declared here so downstream route tickets share one URL surface.
export function getRecord(slug: string, storySlug: string, recordId: string): Promise<EnvelopedResult<RecordDetail>> {
  return fetchEnveloped(
    `/api/worlds/${encodeSegment(slug)}/stories/${encodeSegment(storySlug)}/records/${encodeSegment(recordId)}`,
  );
}

export function getRawRecord(slug: string, storySlug: string, recordId: string): Promise<EnvelopedResult<RawRecordSource>> {
  return fetchEnveloped(
    `/api/worlds/${encodeSegment(slug)}/stories/${encodeSegment(storySlug)}/records/${encodeSegment(recordId)}/raw`,
  );
}

export function getBranchMap(slug: string, storySlug: string, focus: string, depth = 3): Promise<EnvelopedResult<unknown>> {
  const query = new URLSearchParams({ focus, depth: String(depth) });
  return fetchEnveloped(`/api/worlds/${encodeSegment(slug)}/stories/${encodeSegment(storySlug)}/branch-map?${query}`);
}

export function searchPages(slug: string, storySlug: string, q: string): Promise<EnvelopedResult<unknown>> {
  const query = new URLSearchParams({ q });
  return fetchEnveloped(`/api/worlds/${encodeSegment(slug)}/stories/${encodeSegment(storySlug)}/search?${query}`);
}

export function getPagePlan(slug: string, storySlug: string, pageId: string): Promise<EnvelopedResult<PagePlanBody>> {
  return fetchEnveloped(
    `/api/worlds/${encodeSegment(slug)}/stories/${encodeSegment(storySlug)}/page-plans/${encodeSegment(pageId)}`,
  );
}

export function getProseReceipt(slug: string, storySlug: string, pageId: string): Promise<EnvelopedResult<ProseReceiptBody>> {
  return fetchEnveloped(
    `/api/worlds/${encodeSegment(slug)}/stories/${encodeSegment(storySlug)}/prose-receipts/${encodeSegment(pageId)}`,
  );
}

export function getProvenance(slug: string, storySlug: string, recordId: string): Promise<EnvelopedResult<unknown>> {
  return fetchEnveloped(
    `/api/worlds/${encodeSegment(slug)}/stories/${encodeSegment(storySlug)}/provenance/${encodeSegment(recordId)}`,
  );
}
