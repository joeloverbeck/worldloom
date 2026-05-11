# Pre-flight and Prerequisites

Pre-flight is the gate that decides whether the rest of the skill runs at all. It resolves and validates every input the downstream phases read, pre-allocates the ids that Phase 7 will emit, and loads the firewall context that Phase 2 / Phase 3 / Phase 4 consume. The skill is read-only outside of Phase 7's engine submit; pre-flight cannot mutate state.

## Argument Validation

| Argument | Validation |
|---|---|
| `world_slug` | Must name an existing directory under `worlds/`. Abort if missing. |
| `story_slug` | Must name an existing story bundle under `worlds/<world-slug>/stories/`. Abort if missing — this skill never bootstraps a story. |
| `page_id` | Must match `^PG-\d{4}$`. Must belong to this story (verify via `mcp__worldloom__get_record(page_id, story_slug=...)`). |
| `execution_mode` | Optional; one of `authoring | interactive_runtime | batch_generation`. Default `authoring`. |
| `accept_plan_drift` | Optional boolean. Default `false`. |

## Required File Existence Checks

Both files must exist on disk before the skill proceeds:

| File | Purpose | Failure mode |
|---|---|---|
| `worlds/<world-slug>/stories/<story-slug>/pages-prose-plans/PG-NNNN.md` | The comprehensive plan emitted by `branching-story-bootstrap` Phase 7 (for PG-0001) or `branching-story-page-cycle` Phase 7 (for PG-0002+). Phase 1 reads this file's frontmatter for state-hash / canon-revision drift detection and reads §18 for the REQUIRED TURN cue (Phase 2 heuristic) and §15 for the selected arc record (Phase 4 ARC_TRACE extraction). | Abort with `plan_missing: pages-prose-plans/PG-NNNN.md not found — bootstrap or page-cycle must run before finalize`. |
| `worlds/<world-slug>/stories/<story-slug>/pages-prose/PG-NNNN.md` | The user-supplied (or external-LLM-rendered) prose. The skill never writes this file; it must be on disk before invocation. | Abort with `prose_missing: pages-prose/PG-NNNN.md not found — render prose against the plan, save the file, then re-run finalize`. |

## PG Record Read and `prose_status` Gate

Read the PG record via `mcp__worldloom__get_record(record_id=page_id, world_slug, story_slug)`. Validate:

| Check | Failure mode |
|---|---|
| `PG.prose_status == "pending"` | Abort with `prose_status_not_pending: PG.prose_status is "<status>"; finalize is only valid for pending pages` (re-finalize / supersession is out of scope for this skill). |
| `PG.prose_plan_path == "pages-prose-plans/PG-NNNN.md"` | Abort with `prose_plan_path_mismatch: PG.prose_plan_path is "<value>", expected "pages-prose-plans/PG-NNNN.md"` — schema drift; investigate before re-running. |

Cache the full PG record body in working context — Phase 1, Phase 5, and Phase 7 all read fields from it (no re-read between phases).

## ID Pre-allocation

Allocate every id Phase 7 will emit ops for, at pre-flight, via `mcp__worldloom__allocate_next_id`. Allocation BEFORE plan assembly is the engine's race-prevention contract — the patch envelope's `expected_id_allocations` field must match the ids actually used.

| ID class | Allocate always? | Allocate condition | Story-scoped? |
|---|---|---|---|
| `SE` | Yes | Always (every finalize emits exactly one SE event with `action: prose_finalized`) | Yes — pass `story_slug=<story-slug>` |
| `ARCTRACE` | Conditional | Only when `PG.storylet_realized != null` (i.e., the page has a selected scene-commitment arc to extract a trace from). When `PG.storylet_realized == null` (bootstrap PG-0001 root case), do NOT allocate. | Yes — pass `story_slug=<story-slug>` |

Pre-allocation example:

```
SE-NNNN = mcp__worldloom__allocate_next_id(world_slug=<slug>, id_class="SE", story_slug=<story-slug>)
if PG.storylet_realized != null:
    ARCTRACE-NNNN = mcp__worldloom__allocate_next_id(world_slug=<slug>, id_class="ARCTRACE", story_slug=<story-slug>)
```

Record both allocated ids in working context; Phase 7 emits them in the envelope's `expected_id_allocations`.

## FOUNDATIONS Load

Load `docs/FOUNDATIONS.md` into working context. The non-negotiable load (per CLAUDE.md §Non-Negotiables) covers:

- **Rule 1 — No Cosmetic Output.** The PG field updates, SE event, and (conditional) ARCTRACE record are load-bearing — they are the only record of the prose-render verdict in the bundle.
- **Rule 6 — No Silent Retcons.** The SE event with `action: prose_finalized` is the immutable audit trail for the `pending → rendered` state transition. Without the SE event, the transition is a silent retcon.
- **Rule 7 — Mystery Reserve Preservation.** Phase 2's forbidden-mystery scan + Phase 3's LLM critic together enforce the firewall over rendered prose. Pre-flight loads the world's whole-class Mystery Reserve (`mcp__worldloom__list_records('mystery_reserve_entry', world_slug)`) so Phase 2 can run the forbidden-resolution check against the live status of every M-NNNN, not just the plan's `forbidden_resolutions[]`.

**Verify FOUNDATIONS-in-context before proceeding.** A pre-flight that fails to load FOUNDATIONS is an incomplete pre-flight; treat as an abort condition.

## Retrieval Assembly

Pre-flight assembles the read set that Phase 1-Phase 5 consume. No phase re-reads from disk after pre-flight; all retrievals happen here.

| Source | Used by | Tool |
|---|---|---|
| `worlds/<slug>/stories/<story-slug>/pages-prose-plans/PG-NNNN.md` (full body) | Phase 1 (frontmatter), Phase 2 (forbidden_engine_vocabulary, forbidden_resolutions, §18 REQUIRED TURN cue), Phase 4 (§15 selected arc record) | direct file read |
| `worlds/<slug>/stories/<story-slug>/pages-prose/PG-NNNN.md` (full body) | Phase 2 (regex scans), Phase 3 (LLM critic input), Phase 5 (prose-ledger-consistency claim extraction), Phase 4 (Layer 2 evidence_span extraction) | direct file read |
| PG record | Phase 1 (state_hash, state_snapshot.canon_revision), Phase 5 (state_snapshot for prose-ledger-consistency), Phase 7 (field updates) | `mcp__worldloom__get_record` |
| Parent PG record + prior 1-2 prose pages along `branch_path` | Phase 3 (cross-page tic detection — recurring metaphor / identical anchor across pages) | `mcp__worldloom__get_record` for the parent + direct reads for the prose files along branch_path |
| World canon `mystery_reserve_entry` whole-class load | Phase 2 (live forbidden-status M scan, in addition to the plan's frozen-at-plan-time `forbidden_resolutions[]`) | `mcp__worldloom__list_records('mystery_reserve_entry', world_slug)` |
| World canon `invariant` whole-class load | Phase 5 (`prose_ledger_consistency` cross-checks claims against active INVs) | `mcp__worldloom__list_records('invariant', world_slug)` |
| Selected arc record (SLT-NNNN named in `PG.storylet_realized`) | Phase 4 (Layer 1 structural validation + Layer 2 trace extraction + Layer 3 semantic critic) | `mcp__worldloom__get_record` — skip when `PG.storylet_realized == null` |
| `content_policy` block from the story bundle's STORY_KERNEL.md | Phase 3 prompt assembly (loaded FIRST in the prompt) | direct file read |
| `prose-craft-contract.md` | Phase 3 prompt assembly (loaded verbatim, after content_policy) | direct file read of `.claude/skills/branching-story-page-cycle/references/prose-craft-contract.md` |

If any retrieval fails, abort with the specific source named — do NOT proceed with a partial read set.

## Execution-mode Resolution

Resolve `execution_mode` from the argument, defaulting to `authoring`. The mode governs:

- **Phase 4 Layer 3 budget** — `authoring` runs Layer 3 always (2 critic calls max). `interactive_runtime` runs Layer 3 only when Layer 1 / Layer 2 surfaced a possible violation (1 critic call max). `batch_generation` skips Layer 3 unless a configured checkpoint demands it.
- **Phase 6 HARD-GATE visibility** — `authoring` shows; `interactive_runtime` and `batch_generation` hide unless any phase failed.

The Phase 4.5 canon-promotion HARD-GATE handoff does NOT exist in this skill — finalize never promotes story facts to world canon in any mode.

## Pre-flight Output

On successful pre-flight, working context contains:

1. Validated `world_slug`, `story_slug`, `page_id`, `execution_mode`, `accept_plan_drift`.
2. Plan body (frontmatter + §1-§19).
3. Rendered prose body.
4. PG record (full).
5. Parent PG record (when `PG.parent_page_id != null`).
6. Prior 1-2 rendered prose files along `branch_path` (when available).
7. Pre-allocated `SE-NNNN` (always) and `ARCTRACE-NNNN` (conditional).
8. Whole-class Mystery Reserve + Invariant loads.
9. Selected arc record (when `PG.storylet_realized != null`).
10. FOUNDATIONS.md.
11. content_policy + prose-craft-contract.md.

Any missing item is a pre-flight failure; abort with the specific source named.
