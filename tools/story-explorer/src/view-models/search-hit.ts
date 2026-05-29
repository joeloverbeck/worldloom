import type { IndexStatus } from "./index-status.js";

// SPEC-98 §2 item 2 — container-grouped, scene-first search output.
//
// The result `kind` classifies WHAT matched; the `domain` classifies WHICH
// text surface matched; the `container` classifies WHERE the hit lives in the
// scene/unscened/branch roll-up. These three axes are independent: a single
// matched node can be (kind=state_tick, domain=state, container=scene).
//
// `raw` bodies are never inlined at the top level — every hit carries an
// `expandable` reference the frontend fetches on demand (SPEC-98 §2: "raw
// bodies expandable, not dumped").

export type SearchResultKind =
  | "scene"
  | "scene_prose"
  | "scene_plan"
  | "scene_receipt"
  | "unscened_range"
  | "state_tick"
  | "event"
  | "choice"
  | "record"
  | "validation"
  | "raw_source";

export const SEARCH_RESULT_KINDS: readonly SearchResultKind[] = [
  "scene",
  "scene_prose",
  "scene_plan",
  "scene_receipt",
  "unscened_range",
  "state_tick",
  "event",
  "choice",
  "record",
  "validation",
  "raw_source",
];

export type SearchDomain =
  | "prose" // rendered scene prose text
  | "plan" // scene plan text
  | "receipt" // scene receipt text
  | "state" // state YAML (record / page body)
  | "metadata" // metadata / id / heading surface
  | "validation"; // validation / freshness surface

export const SEARCH_DOMAINS: readonly SearchDomain[] = [
  "prose",
  "plan",
  "receipt",
  "state",
  "metadata",
  "validation",
];

export type SearchContainer =
  | {
      kind: "scene";
      sceneId: string;
      branchId: string;
      startPg: string | null;
      endPg: string | null;
      pageIds: string[];
      label: string;
    }
  | {
      kind: "unscened_range";
      branchId: string;
      startPg: string;
      endPg: string;
      pageIds: string[];
      label: string;
    }
  | {
      // Orphan / technical hits that do not roll up to a live scene or unscened
      // run (records not active at any current tick, validation/freshness).
      kind: "branch_level";
      branchId: string | null;
      label: string;
    };

export interface SearchExpandableRef {
  // The id whose raw body the frontend fetches on expand. Exactly one of
  // recordId / sceneId is populated depending on whether the body lives in a
  // _source record or a scene publication artifact.
  recordId: string | null;
  sceneId: string | null;
  artifactKind: "plan" | "prose" | "receipt" | null;
  href: string;
}

export interface SearchHit {
  kind: SearchResultKind;
  domain: SearchDomain;
  // Primary matched id (record id, page id, or scene id). May be null for a
  // purely technical hit (e.g. an index-freshness validation hit).
  recordId: string | null;
  title: string;
  // A short snippet — never the full body. The full body is fetched via
  // `expandable`.
  excerpt: string;
  container: SearchContainer;
  expandable: SearchExpandableRef;
}

export interface SearchGroup {
  container: SearchContainer;
  hits: SearchHit[];
}

export interface SearchQueryEcho {
  q: string;
  kinds: SearchResultKind[];
  domains: SearchDomain[];
  groupBy: "scene_or_unscened_range";
  limit: number;
  offset: number;
}

export interface SearchResults {
  query: SearchQueryEcho;
  // Container-grouped roll-up — the top-level shape consumed by the frontend.
  groups: SearchGroup[];
  // Flat hit list (already sliced by limit/offset) for clients that prefer it.
  hits: SearchHit[];
  // Total matched hits before limit/offset.
  total: number;
  indexStatus: IndexStatus;
  // True when the index is not fresh and the search degraded to an empty,
  // non-fabricated result set.
  degradedDirectRead: boolean;
}
