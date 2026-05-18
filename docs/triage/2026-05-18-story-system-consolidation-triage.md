# Story-System Consolidation — Triage (2026-05-18)

**Source**: `reports/story-system-consolidation.md` (ChatGPT-Pro consolidation analysis)
**Deliverable**: `specs/SPEC-44-story-state-append-only-lifecycle-and-schema-correctness.md`
**Triggering context**: User suspected overlap/missing structures after recent story-pipeline additions (SPEC-38 / SPEC-42 / SPEC-43). Report produced before SPEC-43 landed; SPEC-43 was the user's contemporaneous response to a sibling research brief.

## Critical reframing context

SPEC-43 (`Present-Causal Mid-Story State Introduction`, merged 2026-05-18) explicitly adjudicated the report's §1 highest-risk issue #1 — "intro tags are stringly typed" — with the **opposite verdict** (SPEC-43 line 34-35: "Considered new predicate DSL entries... rejected... Use parseable `SE.world_logic_rationale` tags instead"). The mid-story introduction proof IS now machine-critical, but SPEC-43 made it machine-critical by making the grammar deterministic (closed regex + closed per-class trigger vocabularies + 9 enforcing validators), NOT by moving it to structured SE fields. The original research brief (`reports/mid-story-state-introduction.md`) was archived 2026-05-18 as "exploited" after SPEC-43 merged. Several of the report's "Must-do" items therefore re-litigate already-decided architecture; SPEC-44 scopes to the items not addressed by SPEC-43 and not deferred to Wave 3.

## Verdict summary

| Bucket | Count | Routing |
|---|---|---|
| ACCEPT | 10 | SPEC-44 (this brainstorm's deliverable) |
| REJECT | 5 | Documented here; contradicts SPEC-43 or out-of-scope |
| DEFER | 4 | Wave 3 (per SPEC-43 deferral list) or follow-up spec |
| ALREADY RESOLVED | 3 | Documented here; cite existing validator/contract |
| CONFIRMS EXISTING POSITION | 3 | Documented here; aligns with FOUNDATIONS already |

## ACCEPT — routed to SPEC-44

| ID | Item | SPEC-44 phase | Rationale |
|---|---|---|---|
| R-MD3 | Remove 7 patch-engine lifecycle mutation ops; enforce supersession-only | Phase 2 | Verified violates FOUNDATIONS §Story Bundles §8. 7 ops staged at `tools/patch-engine/src/ops/{tick-pressure-clock, resolve-pressure-clock, append-secret-clue-carrier, mark-secret-clue-discovered, reveal-story-secret, answer-story-question, abandon-story-question}.ts`. |
| R-MD4 | Fix `story-event.schema.json` state_delta to include STSTAT/CLK/STSEC/STQ | Phase 1 | Verified schema bug at `tools/validators/src/schemas/story-event.schema.json:90-108`. |
| R-SD1 | Upgrade `srel_intro_duplicate_axis` from warn → fail | Phase 1 | Validator exists at `tools/validators/src/structural/relationship-introduction-grounding-integrity.ts`. |
| R-MD7-a | Add `no_story_state_in_place_mutation` validator | Phase 2 | Backstops R-MD3 at the pre-apply gate. |
| R-MD7-b | Add `state_delta_class_integrity` validator | Phase 2 | Backstops R-MD4 at runtime. |
| R-MD7-c | Add `propagation_exception_integrity` validator | Phase 3 | Consumes existing `non_propagation:` tag mechanism (`tools/validators/src/structural/non-propagation-tag-shape.ts`); adds coverage check. |
| R-MD7-d | Add `page_affordance_integrity` validator | Phase 3 | New check; no current validator covers affordance shape integrity. |
| R-SD4 | Extract `$defs.PageAffordance` schema component | Phase 1 | Enables R-MD7-d; mechanical refactor. |
| O1 | Document supersession pattern in turn-cycle skill references | Phase 2 | Required companion to R-MD3 — removed lifecycle ops need replacement authoring guidance. |
| O2 | Document that `supersede_<class>_record` ops are CREATE ops (no rename) | Phase 2 | Verified at `tools/patch-engine/src/ops/create-story-record.ts:198-232` + `commit/temp-file.ts:271-278`. Honest documentation cheaper than rename. |

## REJECT

| ID | Item | Reason |
|---|---|---|
| R-MD1 | Replace parseable intro tags with structured `SE.record_introductions[]` | Contradicts SPEC-43 design decision (line 34-35). Parseable form is deterministic via closed grammar + 9 validators. Reversing 5 days post-merge undoes 17 implementation tickets without changing what validators enforce. |
| R-MD6 | Remove compatibility/grandfathering/normalization paths | (structural) `compatibility-drift.ts`, `OPTIONAL_ACTIVE_RECORDS_CLASSES`, `isLegacyCompatibilityPage` exist by SPEC-43 design (lines 112-130) as the transition discipline. Hard-fail is Wave 3. Removing now breaks pre-SPEC-43 bundles. |
| R-MD5 | Make `PG.state_snapshot.active_records` strictly require all keys | (structural) Wave 3 dependency. SPEC-44 Phase 3's `active-records-full-shape` validator ships `warn`-level as the bridge. |
| R-7-a | Extend mid-story introduction grounding from 6 → 14 created classes | (pragmatic) The 6 SPEC-43 classes carry persistent causal pressure; STSTAT (via `entity_introduction_status_pairing`) and the other 8 classes have alternate grounding mechanisms. Each extension needs its own trigger vocabulary + per-class grounding validator. Scope-distinct from SPEC-44. |
| R-MD7-various (8 of 12 proposed validators) | Already exist per verification | `state-snapshot-integrity` (active_records shape), `audit-only-se-shape` (state_delta partial), `slt-created-at-page-origin-consistency`+`midstory-record-introduction-grounding` (provenance), `midstory-introduction-utils` (no_machine_tags), `snapshot-replay-equality` (snapshot replay), `critical-secret-clue-coverage-when-revealed` (stsec reveal evidence), `story-question-setup-predates-payoff` (stq setup-before-payoff), `clock-firing-threshold-integrity`+`clock-threshold-ordering` (clock threshold). |

## DEFER

| ID | Item | Routed to |
|---|---|---|
| R-MD8 | World-index edge expansion (18 new edge types) + MCP context-packet provenance summaries + 4 retrieval helpers | (structural) Follow-up spec (SPEC-45-or-later). Capability-expansion track; scope-distinct from SPEC-44's contract-correctness work. Verified absent: `tools/world-index/src/schema/types.ts` lacks all 18 proposed types; `tools/world-mcp/src/context-packet/story-bundle-context.ts` lacks provenance summaries. |
| R-SD6 | Manual repair guidance for invalid old stories | Wave 3 per SPEC-43 line 224-231 — awaits `branching-story-compatibility-repair` skill. |
| R-7-b | Hard-fail severity for `compatibility_drift` | Wave 3 per SPEC-43. |
| R-13 | "Do not silently migrate" / fail-old-structures posture | (structural) Wave 3 dependency — predicated on the repair skill landing. |

## ALREADY RESOLVED

| ID | Item | Existing implementation |
|---|---|---|
| R-SD2 | Strict STSEC reveal evidence validation | `tools/validators/src/structural/critical-secret-clue-coverage-when-revealed.ts` — high-salience revealed STSEC must have reveal_event + ≥2 discovered clue_carriers. |
| R-SD3 | Strict STQ setup-before-payoff validation | `tools/validators/src/structural/story-question-setup-predates-payoff.ts` — validates payoff_of-setup STQ precedes payoff STQ on branch_path. |
| R-MD2 (partial) | Creation provenance required for created active state records | SPEC-43 ships for CLK/STSEC/STQ/THR/STENT/SREL (6 classes); STSTAT covered by `entity_introduction_status_pairing`. Remaining 8 classes → R-7-a deferral. |

## CONFIRMS EXISTING POSITION

| ID | Item | Alignment |
|---|---|---|
| R-Reject-Act | Report rejects act/arc/drama-manager machinery | FOUNDATIONS §Story Bundles §5c "No act structure / No global drama manager" |
| R-Reject-STCLUE | Report rejects first-class STCLUE | Current `STSEC.clue_carriers` embedded design (story-record-schemas.md:680-687) |
| R-Reject-Optimal | Report rejects "optimal story" global search | FOUNDATIONS §Story Bundles §5c |
| R-Reject-Cosmetics | Report rejects fields neither validated nor consumed | FOUNDATIONS §Story Bundles §5b "Schema minimalism" |
| R-Reject-Prose-State | Report rejects prose as hidden state | FOUNDATIONS §Story Bundles §4a "Plan-Authority Boundary" |

## Out-of-report findings (operator-surfaced)

| ID | Finding | Routing |
|---|---|---|
| O1 | Turn-cycle skill references need updates after R-MD3 lifecycle ops are deleted | SPEC-44 Phase 2 deliverable |
| O2 | `supersede_<class>_record` ops are misleadingly named — they CREATE new records via `stageCreateStoryRecord` → `stageNewRecordFile`, with `supersedes` set on the body. Verified at `tools/patch-engine/src/ops/create-story-record.ts:198-232` and `tools/patch-engine/src/commit/temp-file.ts:271-278`. | SPEC-44 documents semantics; rename rejected as pragmatic-cost-too-high |
| O3 | Report's "propagation_exceptions" proposal duplicates the existing `non_propagation:` tag mechanism — verified at `tools/validators/src/structural/non-propagation-tag-shape.ts`. The actual gap is a coverage validator, not a structured-fields rewrite. | Folded into R-MD7-c |
| O4 | Only CLK/STSEC/STQ have explicit `supersede_<class>_record` op kinds. The other 17 story-bundle classes use `create_<class>_record` with `supersedes` set on the body. Asymmetric naming but the semantics are uniform. | Documented in SPEC-44 Out of Scope (rename rejected) |

## Verification notes

Triage verdicts produced from 7 parallel Explore agents covering:
1. SE schema + intro tag parser (verified state_delta omits 4 classes; intro tags exist with closed grammar)
2. Patch-engine lifecycle ops (verified all 7 mutate in-place via `stageExistingRecordFile`)
3. Compatibility validators (verified `compatibility-drift.ts`, `OPTIONAL_ACTIVE_RECORDS_CLASSES`, `isLegacyCompatibilityPage`, health-audit SKILL.md references)
4. World-index parse + edge types (verified 20 dir mappings exact; 18 proposed edges absent; SE/STSEC/STQ/CLK have zero edge extraction)
5. Story-state contract + record schemas (verified contract structure; SE has no `record_introductions[]`; PG.active_records has 15 keys all required)
6. Validator coverage (verified 8 of 12 proposed validators already exist; 2 absent; 2 partial)
7. SPEC-43 + prior specs (verified SPEC-43 merged 2026-05-18 with explicit Wave 3 deferral list)

All verbatim quotes with file:line citations preserved in agent reports; cited inline in SPEC-44 §Problem Statement.
