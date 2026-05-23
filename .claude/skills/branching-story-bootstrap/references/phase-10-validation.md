# Phase 10: Validate

Covers original §Phase 10 (Validate).

Run the 8 shared hard gates per `.claude/skills/_shared-templates/story-state-contract.md` §7 against the drafted records. Populate `PG-1.validation_trace` with one-line PASS rationale per gate:

1. **input legality** — `story_start` has no parent page and uses the shared contract §4.2 PG-1 carve-out: `choice_id: null`, `manual_action_text: null`, `resolved_event_id: SE-1`.
2. **parent snapshot compatibility** — no parent snapshot; `state_hash_parent: null` matches.
3. **mystery / invariant firewall** — no forbidden `M-<integer>` resolved; no INV violated; `forbidden_mystery_resolutions` properly enumerated in state seed.
4. **branch isolation** — no sibling-branch state in `state_snapshot.active_records`; no seed SLT references branch-local records (none exist at bootstrap); selected-cast `source_char_id` values appear only as STCHAR provenance, not as branch runtime authority.
5. **append-only delta** — `SE-1.state_delta` is creates-only; no supersessions or closes at root.
6. **consequence capacity or terminal proof** — at least one eligible commitment block (seed or JIT-able); terminal root rejected as authoring error.
7. **plan grounding** — every required beat and every emitted `CHC` is grounded in active records or world canon. (a) Each `PG-1.state_snapshot.visible_affordances[].grounded_in[]` resolves to active `STLOC` or `STOBJ` records ONLY per shared contract `_shared-templates/story-record-schemas.md` §4.2 schema pattern `^(STLOC|STOBJ)-[0-9]+$` — `STENT`, `STCHAR`, `CNSQ`, `OBL`, `BEL`, and other story-bundle ids are NOT valid grounding for `visible_affordances[].grounded_in[]` and the `record_schema_compliance` validator rejects them at dry-run. (b) Each emitted `CHC.grounded_in.records[]` resolves to `PG-1.state_snapshot.active_records` (any active record class is permissible — STENT, STCHAR, STOBJ, STLOC, CNSQ, OBL, BEL, SREL, THR, CLK, STSEC, STQ, DA, etc. per shared contract §4.5.12). (c) Each emitted `CHC.grounded_in.affordance_ordinals[]` resolves to `PG-1.state_snapshot.visible_affordances[].ordinal`. (d) Any triggered `expected_witness_coverage` path from shared contract §5a.3 is discharged by public-coverage `BEL.visibility` (`public`, `shared`, `factional`, `rumored`) or a legal `SE-1.non_propagation_facts[]` entry; private BEL records do not discharge this validator.
8. **canon promotion hold** — `NOT_APPLICABLE: bootstrap does not assert canon-level truths at root; no SE.promotion_claims drafted`.

Plus 5 bootstrap-additional checks (recorded in working memory; not on `PG.validation_trace`):

1. **Cast resolution** — every `selected_cast[]` entry resolved to an existing CHAR dossier (covered by Pre-flight step 4; re-verified here).
2. **STCHAR authority complete before state** — every selected non-background cast member has a schema-valid active `STCHAR`, both STCHAR-global hashes, all 13 body sections, and the future `STENT.bound_stchar_id` mapping; failure aborts before any STENT, temporal, page, choice, or markdown artifact is created.
3. **No SF globalization** — every mirrored `SF` carries parent CF ids in `derived_from`, and its branch-local statement does not widen the parent CF's geographic / temporal / social scope.
4. **Root page plan self-containment** — the plan body contains all 19 numbered sections plus optional §9b / §9c / §10b when relevant active records exist, the mandatory §16a STCHAR packets when relevant (including reduced `offstage_causal` packets for causally relevant offstage characters), including the verbatim §2 / §3 / §19, with no external-renderer-undefined references.
5. **Continuation capacity** — at least one seed `SLT` is eligible at `PG-1` (`seed_commitment_blocks != 'none'`) OR the turn-cycle's JIT path is the planned continuation (`seed_commitment_blocks: 'none'`). Terminal root rejected as authoring error.

After all gates and additional checks pass, compute final PG hashes per shared contract §4.2a:

1. Invoke `tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan <plan-path> --pg <pg-draft-path>`. The CLI emits `{plan_hash, state_hash}` as JSON to stdout:
   - **`plan_hash`** — stamp onto `PG-1.plan.plan_hash`; covers the exact UTF-8 bytes of the finalized `pages-prose-plans/PG-1.md` draft.
   - **`state_hash`** — stamp onto `PG-1.state_hash`; covers the deterministic canonical JSON fork-state payload after `plan.plan_hash` and `validation_trace` are final, excluding only `state_hash` itself.
   - **Input PG draft** — may carry placeholder values for both hashes (or omit them); the CLI ignores `state_hash` and overwrites `plan.plan_hash` in the canonical payload with the value computed from `--plan`.
   - **No hand-rolled serializer.** The CLI reuses the shared `canonicalJsonStringify` / `computePgStateHash` / `computePlanHash` helpers from `@worldloom/world-index/hash/content` that the validator's `snapshot_replay_equality` consumes, so authoring-time and validation-time hashes are byte-identical by construction.
2. Verify both values are 64-character lowercase hex sha256 strings. Missing, placeholder, uppercase, non-hex, or stale values are hard-stop authoring errors before the commit phase.

If any gate, additional check, or hash check fails, abort before the commit phase — write nothing.
