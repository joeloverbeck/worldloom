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
  leafPageIds: string[];
  rootPageId: string | null;
  latestPageId: string | null;
  indexStatus: IndexStatus;
}

export interface EventDeltaSummary {
  eventId: string | null;
  createCount: number;
  supersedeCount: number;
  closeCount: number;
  introducedRecordIds: string[];
  relationCount: number;
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

export interface RecordProvenance {
  creatingSeId: string | null;
  modifyingSeIds: string[];
  evidenceRecords: string[];
}

// Frontend mirror of tools/story-explorer/src/view-models/branch-map-graph.ts.
// The page-centric BranchMapNode/BranchMapEdge mirrors were removed alongside
// the backend page-model teardown (SPEC98STOEXPSCE-002): the branch map is now
// a single-layer scene-segment graph. `pageId` on split/choice/terminal nodes
// is a reference to the fork/choice/leaf page, not a page-node identity.
export interface BranchMapSceneNode {
  kind: 'scene';
  id: string;
  branchId: string;
  pageIds: string[];
  startPg: string | null;
  endPg: string | null;
  publicationState: ScenePublicationState;
  focused: boolean;
}

export interface BranchMapUnscenedRunNode {
  kind: 'unscened_run';
  id: string;
  branchId: string;
  pageIds: string[];
  startPg: string;
  endPg: string;
  tickCount: number;
  finalChoiceCount: number;
  label: string;
  focused: boolean;
}

export interface BranchMapBranchSplitNode {
  kind: 'branch_split';
  id: string;
  branchId: string;
  pageId: string;
  childBranchIds: string[];
  focused: boolean;
}

export interface BranchMapChoiceSurfaceNode {
  kind: 'choice_surface';
  id: string;
  branchId: string;
  pageId: string;
  choiceCount: number;
  focused: boolean;
}

export interface BranchMapTerminalNode {
  kind: 'terminal_marker';
  id: string;
  branchId: string;
  pageId: string;
  reason: 'no_children' | 'paused' | 'terminal';
  focused: boolean;
}

export type BranchMapNode =
  | BranchMapSceneNode
  | BranchMapUnscenedRunNode
  | BranchMapBranchSplitNode
  | BranchMapChoiceSurfaceNode
  | BranchMapTerminalNode;

export interface BranchMapEdge {
  from: string;
  to: string;
  branchId: string;
  kind: 'sequence' | 'fork';
}

export interface BranchMapFocus {
  requested: string;
  resolvedBranchId: string | null;
  nodeId: string | null;
}

export interface BranchMapGraph {
  focus: BranchMapFocus;
  depth: number;
  branchIds: string[];
  nodes: BranchMapNode[];
  edges: BranchMapEdge[];
  indexStatus: IndexStatus;
  degradedDirectRead: boolean;
}

// ---------------------------------------------------------------------------
// SPEC-96 scene-first view models (frontend mirrors of
// tools/story-explorer/src/view-models/*.ts). Additive — the page-scoped
// surface above is removed by SPEC97STOEXPSCE-008.
// ---------------------------------------------------------------------------

// Frontend mirror of view-models/scene-publication-state.ts.
export type ScenePublicationState =
  | 'planned'
  | 'prose-present'
  | 'attached:PASS'
  | 'attached:WARN'
  | 'attached:FAIL'
  | 'superseded';

// Frontend mirror of view-models/choice-surface.ts.
export interface ChoiceSurfaceChoice {
  choiceId: string;
  surfaceLabel: string;
  playerVisibleIntent: string;
  pressure: string[];
  groundedInCount: number;
}

export interface ChoiceSurface {
  pageId: string;
  emittedChoices: ChoiceSurfaceChoice[];
}

// Frontend mirror of view-models/story-overview.ts.
export interface LatestSceneSummary {
  sceneId: string;
  publicationState: ScenePublicationState;
}

export interface BranchOverviewSummary {
  branchId: string;
  rootPageId: string | null;
  latestPageId: string | null;
  latestScene: LatestSceneSummary | null;
}

export interface SceneCoverageCounts {
  status: 'available' | 'degraded';
  activeSceneCount: number | null;
  supersededSceneCount: number | null;
  totalSceneCount: number | null;
}

export interface UnscenedRunCounts {
  status: 'available' | 'degraded';
  runCount: number | null;
  pageCount: number | null;
}

export interface StoryOverview {
  worldSlug: string;
  storySlug: string;
  storyId: string;
  title: string | null;
  rootPageId: string | null;
  latestPageId: string | null;
  branchCount: number;
  pageCount: number;
  choiceCount: number;
  branches: BranchOverviewSummary[];
  sceneCoverageCounts: SceneCoverageCounts;
  unscenedRunCounts: UnscenedRunCounts;
  indexStatus: IndexStatus;
  degradedDirectRead: boolean;
}

// Frontend mirror of view-models/branch-timeline.ts.
export interface TimelineFocus {
  requested: string;
  segmentIndex: number | null;
  pageId: string | null;
  sceneId: string | null;
}

export interface SceneTimelineSegment {
  kind: 'scene_segment';
  sceneId: string;
  pageIds: string[];
  startPageId: string;
  endPageId: string;
  publicationState: ScenePublicationState;
  focused: boolean;
}

export interface UnscenedRunTimelineSegment {
  kind: 'unscened_run';
  pageIds: string[];
  startPageId: string;
  endPageId: string;
  focused: boolean;
}

export interface ChoiceSurfaceTimelineSegment {
  kind: 'choice_surface';
  pageId: string;
  choiceSurface: ChoiceSurface;
  focused: boolean;
}

export interface BranchSplitTimelineSegment {
  kind: 'branch_split';
  pageId: string;
  childBranchIds: string[];
  focused: boolean;
}

export interface TerminalMarkerTimelineSegment {
  kind: 'terminal_marker';
  pageId: string;
  reason: 'no_children' | 'paused' | 'terminal';
  focused: boolean;
}

export type TimelineSegment =
  | SceneTimelineSegment
  | UnscenedRunTimelineSegment
  | ChoiceSurfaceTimelineSegment
  | BranchSplitTimelineSegment
  | TerminalMarkerTimelineSegment;

export interface BranchTimeline {
  branchId: string;
  segments: TimelineSegment[];
  focus: TimelineFocus | null;
  indexStatus: IndexStatus;
  degradedDirectRead: boolean;
}

// Frontend mirror of @worldloom/world-index SceneArtifactAvailability.
export interface SceneArtifactAvailability {
  hasPlan: boolean;
  hasProse: boolean;
  hasReceipt: boolean;
}

// Frontend mirror of view-models/scene-summary.ts.
export type SceneCoverageStatus = 'active' | 'superseded';

export interface SceneSummary {
  sceneId: string;
  branchId: string;
  pageIds: string[];
  startPageId: string | null;
  endPageId: string | null;
  publicationState: ScenePublicationState;
  coverageStatus: SceneCoverageStatus;
  artifactAvailability: SceneArtifactAvailability;
}

// Frontend mirror of view-models/scene-detail.ts.
export interface ScenePageSummary {
  pageId: string;
  branchId: string;
  parentPageId: string | null;
  turnIndex: number;
  resolvedEventId: string | null;
  activeRecordCounts: Record<string, number>;
  xrayHref: string;
}

export interface SceneArtifactLinks {
  plan: string;
  prose: string;
  receipt: string;
}

export interface SceneDetail {
  sceneId: string;
  branchId: string;
  sceneRecord: Record<string, unknown> | null;
  pageIds: string[];
  publicationState: ScenePublicationState;
  coverageStatus: SceneCoverageStatus;
  includedPages: ScenePageSummary[];
  endChoiceSurface: ChoiceSurface | null;
  eventDeltas: EventDeltaSummary[];
  artifactAvailability: SceneArtifactAvailability;
  artifactLinks: SceneArtifactLinks;
  indexStatus: IndexStatus;
  degradedDirectRead: boolean;
}

export interface SceneList {
  scenes: SceneSummary[];
  indexStatus: IndexStatus;
  degradedDirectRead: boolean;
}

export interface SceneArtifactRead {
  sceneId: string;
  kind: 'plan' | 'prose' | 'receipt';
  sourcePath: string;
  body: string | Record<string, unknown>;
}

// Frontend mirror of view-models/unscened-range.ts.
export interface ActiveRecordDeltaSummary {
  startActiveRecordCounts: Record<string, number>;
  endActiveRecordCounts: Record<string, number>;
  createdRecordIds: string[];
  supersededRecordIds: string[];
  closedRecordIds: string[];
}

export interface UnscenedRangeValidationStatus {
  pageCount: number;
  pagesWithValidationTrace: number;
  verdict: 'present' | 'missing';
}

export interface UnscenedRange {
  startPg: string;
  endPg: string;
  pageIds: string[];
  count: number;
  finalChoiceSurface: ChoiceSurface;
  eventDelta: EventDeltaSummary;
  activeRecordDelta: ActiveRecordDeltaSummary;
  validationStatus: UnscenedRangeValidationStatus;
  suggestedRangeLabel: string;
}

export interface UnscenedRangeList {
  branchId: string;
  ranges: UnscenedRange[];
  indexStatus: IndexStatus;
  degradedDirectRead: boolean;
}

// Frontend mirror of view-models/state-tick-xray.ts.
export interface StateTickContainerLink {
  kind: 'scene' | 'unscened_range' | 'unknown';
  sceneId: string | null;
  startPg: string | null;
  endPg: string | null;
  pageIds: string[];
}

export interface StateSnapshotSummary {
  activeRecordCounts: Record<string, number>;
  continuationStatus: string | null;
  unresolvedMysteryClaims: string[];
}

export interface StateTickXray {
  pageId: string;
  parentPageId: string | null;
  branchId: string;
  branchPath: string[];
  turnIndex: number;
  inputMode: string | null;
  resolvedEventId: string | null;
  stateHash: string | null;
  parentStateHash: string | null;
  stateSnapshotSummary: StateSnapshotSummary;
  activeRecordsByClass: Record<string, string[]>;
  visibleAffordances: string[];
  unresolvedMysteryClaims: string[];
  continuationStatus: string | null;
  emittedChoices: ChoiceSurface;
  validationTrace: Record<string, unknown>;
  rawPageYaml: {
    sourcePath: string;
    contentHash: string;
    body: string;
  };
  resolvedEvent: Record<string, unknown> | null;
  eventDelta: EventDeltaSummary;
  createdRecordIds: string[];
  supersededRecordIds: string[];
  closedRecordIds: string[];
  container: StateTickContainerLink;
  indexStatus: IndexStatus;
  degradedDirectRead: boolean;
}

// ---------------------------------------------------------------------------
// SPEC-98 search — frontend mirror of view-models/search-hit.ts.
// ---------------------------------------------------------------------------

export type SearchResultKind =
  | 'scene'
  | 'scene_prose'
  | 'scene_plan'
  | 'scene_receipt'
  | 'unscened_range'
  | 'state_tick'
  | 'event'
  | 'choice'
  | 'record'
  | 'validation'
  | 'raw_source';

export type SearchDomain = 'prose' | 'plan' | 'receipt' | 'state' | 'metadata' | 'validation';

export type SearchContainer =
  | {
      kind: 'scene';
      sceneId: string;
      branchId: string;
      startPg: string | null;
      endPg: string | null;
      pageIds: string[];
      label: string;
    }
  | {
      kind: 'unscened_range';
      branchId: string;
      startPg: string;
      endPg: string;
      pageIds: string[];
      label: string;
    }
  | { kind: 'branch_level'; branchId: string | null; label: string };

export interface SearchExpandableRef {
  recordId: string | null;
  sceneId: string | null;
  artifactKind: 'plan' | 'prose' | 'receipt' | null;
  href: string;
}

export interface SearchHit {
  kind: SearchResultKind;
  domain: SearchDomain;
  recordId: string | null;
  title: string;
  excerpt: string;
  container: SearchContainer;
  expandable: SearchExpandableRef;
}

export interface SearchGroup {
  container: SearchContainer;
  hits: SearchHit[];
}

export interface SearchResults {
  query: {
    q: string;
    kinds: SearchResultKind[];
    domains: SearchDomain[];
    groupBy: 'scene_or_unscened_range';
    limit: number;
    offset: number;
  };
  groups: SearchGroup[];
  hits: SearchHit[];
  total: number;
  indexStatus: IndexStatus;
  degradedDirectRead: boolean;
}

export interface SearchQueryOptions {
  kinds?: SearchResultKind[];
  domains?: SearchDomain[];
  limit?: number;
  offset?: number;
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

// SPEC-98 §2 item 3 — scene-layer branch map. focus accepts SCN-/PG-/CHC-/BR-.
export function getBranchMap(
  slug: string,
  storySlug: string,
  focus: string,
  depth = 3,
): Promise<EnvelopedResult<BranchMapGraph>> {
  const query = new URLSearchParams({ focus, depth: String(depth) });
  return fetchEnveloped(`/api/worlds/${encodeSegment(slug)}/stories/${encodeSegment(storySlug)}/branch-map?${query}`);
}

export function getProvenance(slug: string, storySlug: string, recordId: string): Promise<EnvelopedResult<RecordProvenance>> {
  return fetchEnveloped(
    `/api/worlds/${encodeSegment(slug)}/stories/${encodeSegment(storySlug)}/provenance/${encodeSegment(recordId)}`,
  );
}

// ---------------------------------------------------------------------------
// SPEC-96 scene-first client functions.
// ---------------------------------------------------------------------------

export function getStoryOverview(slug: string, storySlug: string): Promise<EnvelopedResult<StoryOverview>> {
  return fetchEnveloped(
    `/api/worlds/${encodeSegment(slug)}/stories/${encodeSegment(storySlug)}/overview`,
  );
}

export interface BranchTimelineQuery {
  branchId?: string;
  focus?: string;
}

export function getBranchTimeline(
  slug: string,
  storySlug: string,
  options: BranchTimelineQuery = {},
): Promise<EnvelopedResult<BranchTimeline>> {
  const query = new URLSearchParams();
  if (options.branchId !== undefined) {
    query.set('branchId', options.branchId);
  }
  if (options.focus !== undefined) {
    query.set('focus', options.focus);
  }
  const suffix = query.toString();
  return fetchEnveloped(
    `/api/worlds/${encodeSegment(slug)}/stories/${encodeSegment(storySlug)}/timeline${suffix ? `?${suffix}` : ''}`,
  );
}

export interface ListScenesQuery {
  branchId?: string;
  hasProse?: boolean;
  receiptVerdict?: 'PASS' | 'WARN' | 'FAIL';
  coverage?: SceneCoverageStatus;
}

export function listScenes(
  slug: string,
  storySlug: string,
  options: ListScenesQuery = {},
): Promise<EnvelopedResult<SceneList>> {
  const query = new URLSearchParams();
  if (options.branchId !== undefined) {
    query.set('branchId', options.branchId);
  }
  if (options.hasProse !== undefined) {
    query.set('hasProse', options.hasProse ? 'true' : 'false');
  }
  if (options.receiptVerdict !== undefined) {
    query.set('receiptVerdict', options.receiptVerdict);
  }
  if (options.coverage !== undefined) {
    query.set('coverage', options.coverage);
  }
  const suffix = query.toString();
  return fetchEnveloped(
    `/api/worlds/${encodeSegment(slug)}/stories/${encodeSegment(storySlug)}/scenes${suffix ? `?${suffix}` : ''}`,
  );
}

export function getSceneDetail(slug: string, storySlug: string, sceneId: string): Promise<EnvelopedResult<SceneDetail>> {
  return fetchEnveloped(
    `/api/worlds/${encodeSegment(slug)}/stories/${encodeSegment(storySlug)}/scenes/${encodeSegment(sceneId)}`,
  );
}

export function getScenePlan(slug: string, storySlug: string, sceneId: string): Promise<EnvelopedResult<SceneArtifactRead>> {
  return fetchEnveloped(
    `/api/worlds/${encodeSegment(slug)}/stories/${encodeSegment(storySlug)}/scenes/${encodeSegment(sceneId)}/plan`,
  );
}

export function getSceneProse(slug: string, storySlug: string, sceneId: string): Promise<EnvelopedResult<SceneArtifactRead>> {
  return fetchEnveloped(
    `/api/worlds/${encodeSegment(slug)}/stories/${encodeSegment(storySlug)}/scenes/${encodeSegment(sceneId)}/prose`,
  );
}

export function getSceneReceipt(slug: string, storySlug: string, sceneId: string): Promise<EnvelopedResult<SceneArtifactRead>> {
  return fetchEnveloped(
    `/api/worlds/${encodeSegment(slug)}/stories/${encodeSegment(storySlug)}/scenes/${encodeSegment(sceneId)}/receipt`,
  );
}

export interface UnscenedRangesQuery {
  branchId?: string;
}

export function getUnscenedRanges(
  slug: string,
  storySlug: string,
  options: UnscenedRangesQuery = {},
): Promise<EnvelopedResult<UnscenedRangeList>> {
  const query = new URLSearchParams();
  if (options.branchId !== undefined) {
    query.set('branchId', options.branchId);
  }
  const suffix = query.toString();
  return fetchEnveloped(
    `/api/worlds/${encodeSegment(slug)}/stories/${encodeSegment(storySlug)}/unscened-ranges${suffix ? `?${suffix}` : ''}`,
  );
}

export function getStateTickXray(slug: string, storySlug: string, pgId: string): Promise<EnvelopedResult<StateTickXray>> {
  return fetchEnveloped(
    `/api/worlds/${encodeSegment(slug)}/stories/${encodeSegment(storySlug)}/state-ticks/${encodeSegment(pgId)}/xray`,
  );
}

// SPEC-98 §2 item 4 — container-grouped search. groupBy is always sent
// (scene_or_unscened_range is the only supported grouping this iteration).
export function search(
  slug: string,
  storySlug: string,
  q: string,
  options: SearchQueryOptions = {},
): Promise<EnvelopedResult<SearchResults>> {
  const query = new URLSearchParams({ q });
  if (options.kinds !== undefined && options.kinds.length > 0) {
    query.set('kinds', options.kinds.join(','));
  }
  if (options.domains !== undefined && options.domains.length > 0) {
    query.set('domains', options.domains.join(','));
  }
  if (options.limit !== undefined) {
    query.set('limit', String(options.limit));
  }
  if (options.offset !== undefined) {
    query.set('offset', String(options.offset));
  }
  query.set('groupBy', 'scene_or_unscened_range');
  return fetchEnveloped(
    `/api/worlds/${encodeSegment(slug)}/stories/${encodeSegment(storySlug)}/search?${query.toString()}`,
  );
}
