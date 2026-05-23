# SPEC72PLAHASADV-003: prose-attach SKILL.md — split-signal hash_integrity + remove accept_plan_drift

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/branching-story-prose-attach/SKILL.md` (frontmatter arguments, HARD-GATE block, Process Flow, Inputs, World-State Prerequisites context, Phase 1 hash-computation step, Phase 2 hash integrity check, Phase 5 repair table). No code changes.
**Deps**: SPEC72PLAHASADV-002

## Problem

`branching-story-prose-attach` Phase 2 currently re-derives both `computed_plan_hash` (sha256 over plan bytes) AND `computed_state_hash` (via the `compute-pg-hashes` CLI which couples the plan_hash into the state_hash payload). When the plan file is edited post-commit, the CLI returns a state_hash that disagrees with the committed PG record's stored `state_hash` — even when the committed state itself is unchanged — and the skill emits `hash_integrity: FAIL` purely from the plan-file drift. Verified live on `red-bunny` PG-2: prose-attach returned `verdict: FAIL` from `hash_integrity` alone, despite every content check and all three STCHAR authority checks passing.

The `accept_plan_drift` input was the mitigation: setting it `true` downgraded the FAIL to WARN. But under FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary), the plan IS a render input whose deviation should be *routed* (revise / repair / promote), not blocked by a binary verdict.

This ticket lands SPEC-72 §2.2 + §2.3 operational changes: the prose-attach SKILL.md updates to compute `state_hash` from the committed PG record's parsed fields (NOT via the CLI), to split `hash_integrity` into plan_hash drift (WARN advisory) and state_hash drift (FAIL tamper), to update the Phase 5 repair table so plan-only drift recommends `none` rather than `run_turn_cycle_repair`, to drop `accept_plan_drift` from the frontmatter arguments and HARD-GATE block (b) clause, and to update the World-State Prerequisites text so the `pre_apply_drift_handling` posture matches the new semantics.

## Assumption Reassessment (2026-05-23)

1. `.claude/skills/branching-story-prose-attach/SKILL.md` carries the `accept_plan_drift` input at 7 distinct sites: frontmatter arguments[] (lines 21-23), Process Flow Phase 2 box (lines 60-63), Inputs Optional list (line 93), Phase 2 body conditional A (line 176, `accept_plan_drift: false` → FAIL branch), Phase 2 body conditional B (line 178, `accept_plan_drift: true` → WARN branch), Phase 2 body unconditional clause (line 180, `regardless of accept_plan_drift` for missing/placeholder hash), and HARD-GATE block (b) clause (line 38, `hash_integrity check applied per accept_plan_drift`). Phase 1's hash-computation step (line 164) prescribes calling `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js` for `computed_state_hash`; under SPEC-72 §2.2 this changes to a direct `computePgStateHash` call on the parsed PG record. Phase 5's repair table at lines 295-307 has a `verdict: FAIL with hash_integrity: FAIL (alone) → run_turn_cycle_repair` row that needs to be split: plan_hash drift alone produces WARN (not FAIL), so the table needs a `verdict: WARN with hash_integrity: WARN (plan-only) → none` row, while the existing `run_turn_cycle_repair` row narrows to `hash_integrity: FAIL with state_hash drift or missing/placeholder state_hash`. Phase 6 receipt YAML schema at lines 311-353 already aligns with the split-signal enum (`hash_integrity: PASS | WARN | FAIL`); no schema change needed there. World-State Prerequisites at lines 106-118 references the shared contract §4.6 as load-bearing, which SPEC72PLAHASADV-002 updates first.
2. SPEC-72 §2.2 prescribes the split-signal design (plan_hash drift → WARN advisory; state_hash drift → FAIL tamper) and explicitly names the implementation pathway: *"call `computePgStateHash` from `@worldloom/world-index/hash/content` directly on the parsed PG record; do not use the `compute-pg-hashes` CLI here, since the CLI re-reads the plan file and overwrites `plan.plan_hash` before computing `state_hash`."* SPEC-72 §2.3 prescribes the SKILL.md surface updates: *"Phase 2 (split computation, drop the plan-file `state_hash` derivation), Phase 5 repair table (plan_hash drift → advisory, not `run_turn_cycle_repair`), and the HARD-GATE/`accept_plan_drift` references."* SPEC-72 §2.2 also clarifies (per `/reassess-spec` Q1 resolution) that structurally-invalid `plan_hash` is rejected at PG schema validation; prose-attach Phase 2 sees only well-formed `plan_hash` values, so the lines 180 conditional ("If either PG.plan.plan_hash or PG.state_hash is missing, placeholder ...") narrows to `state_hash` only.
3. Cross-skill boundary: prose-attach Phase 2's new computation pathway imports `computePgStateHash` from `@worldloom/world-index/hash/content` — a cross-package boundary (`branching-story-prose-attach` runs at LLM-skill level; `@worldloom/world-index` is the validator's shared hash module). The validator's `snapshot_replay_equality` at `tools/validators/src/structural/snapshot-replay-equality.ts:1` already imports from this exact path; prose-attach Phase 2 will use the same import. The Phase 5 repair-table semantics are also a cross-skill boundary — the `repair_recommendation` enum is consumed by the receipt at the post-attach handoff (`branching-story-turn-cycle` for `run_turn_cycle_repair`, `story-fact-promotion-to-canon` for `run_story_fact_promotion_to_canon`, the user for `revise_prose`). Plan-only drift's recommendation becoming `none` means no downstream skill is invoked for that case; the breadcrumb in `notes[]` is the entire audit trail.
4. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary) and §5b (Schema-Minimalism) are the load-bearing principles. §4a: plan deviation is routed, not blocked — the split-signal semantics put the receipt verdict on the correct side of the boundary (state-tamper FAIL, render-input drift advisory). §5b: removing `accept_plan_drift` aligns the SKILL with schema-minimalism — the toggle is no longer load-bearing because advisory is now the default for plan_hash drift.
5. HARD-GATE / canon-write ordering: this ticket modifies the HARD-GATE block (b) clause to drop the `accept_plan_drift` reference. The HARD-GATE itself remains in place — the gate still requires Phases 1-5 completion before write, still requires user approval, still applies under Auto Mode. Only the conditional "applied per `accept_plan_drift`" wording changes. The Canon Safety surface (the gate that controls when prose-attach writes the receipt + INDEX update + optional `SE-<integer>` event) is structurally unchanged; only the conditional gating on a removed input parameter is dropped. Mystery Reserve firewall is unaffected — the `forbidden_mystery_resolution` check at Phase 3 check 3 is unchanged.
6. Rename/remove blast radius: `accept_plan_drift` is being removed from the skill's input contract. Audit at `/reassess-spec` time confirmed zero code-level consumers (grep across `tools/`, `.claude/skills/`, `docs/`, `specs/` returned matches only inside the prose-attach SKILL.md itself plus the shared contract §4.6 prose updated in SPEC72PLAHASADV-002 plus historical docs/plans/ entries that are not active references). No CLI, no MCP tool, no hook, no validator consumes the input. The skill is the sole owner; removal is clean.

## Architecture Check

1. The split-signal design places verdict authority where state authority lives: `state_hash` (committed PG-record state) drives FAIL because tampering with committed state is a genuine corruption; `plan_hash` (render-input drift) drives WARN because the plan file is a rendering of state per §4a, not state itself. Calling `computePgStateHash` directly on the parsed PG record (rather than via the CLI) is the natural extension of `snapshot_replay_equality`'s pattern — the validator already does this exact thing at `tools/validators/src/structural/snapshot-replay-equality.ts:296`, and using the same helper from the same module keeps authoring-time hashes (CLI-produced) and validation-time recomputations (helper-produced) byte-identical by construction. The `compute-pg-hashes` CLI's plan-file coupling is correct for authoring (`bootstrap` Phase 7 and `turn-cycle` Phase 9 stamp both hashes together at commit, plan-file as the canonical input) but wrong for verification (where the committed PG record IS the canonical input). The architecture cleanly separates the two roles.
2. No backwards-compatibility aliasing/shims: `accept_plan_drift` is removed outright from the frontmatter arguments[] — the input contract narrows by one slot rather than being preserved as a deprecated-but-ignored option. The Phase 1 hash-computation step replaces the CLI invocation with the direct helper call rather than supporting both paths behind a feature flag. The Phase 5 repair table is rewritten rather than carrying both the old and new ladder behind a `legacy_repair_recommendation` toggle. Per CLAUDE.md §Core Rules and the project's no-backcompat-shims discipline, the SKILL contract narrows to the new state cleanly.

## Verification Layers

1. `accept_plan_drift` is removed from prose-attach's input contract → grep-proof: `grep -n "accept_plan_drift" .claude/skills/branching-story-prose-attach/SKILL.md` returns zero matches.
2. Phase 1 hash-computation step references the direct helper, not the CLI, for `computed_state_hash` → grep-proof: `grep -n "computePgStateHash\|@worldloom/world-index/hash/content" .claude/skills/branching-story-prose-attach/SKILL.md` returns ≥1 match in Phase 1 / Phase 2; `grep -n "compute-pg-hashes.*state_hash\|--plan.*--pg" .claude/skills/branching-story-prose-attach/SKILL.md` returns zero matches in Phase 1 / Phase 2 (the CLI is no longer invoked for state_hash recomputation).
3. Phase 2 split-signal logic is present → grep-proof: `grep -n "plan_hash drift.*WARN\|plan-only drift\|advisory" .claude/skills/branching-story-prose-attach/SKILL.md` returns ≥1 match inside Phase 2.
4. Phase 5 repair table maps plan-only drift to `none`, not `run_turn_cycle_repair` → manual review of the table rows: `hash_integrity: WARN (plan_hash drift)` row → `none`; `hash_integrity: FAIL (state_hash drift)` row → `run_turn_cycle_repair`.
5. HARD-GATE block (b) clause no longer cites `accept_plan_drift` → grep-proof: `grep -n "accept_plan_drift" .claude/skills/branching-story-prose-attach/SKILL.md` (covered by #1).
6. Live regression on `red-bunny` PG-2: re-running prose-attach against the regenerated PG-2 plan returns `hash_integrity: WARN` and `verdict: PASS` (or `WARN` driven by content checks if applicable) — NOT `verdict: FAIL` from `hash_integrity` alone — per SPEC-72 §5 acceptance criterion #4.

## What to Change

### 1. Frontmatter — remove `accept_plan_drift` from arguments[]

Modify `.claude/skills/branching-story-prose-attach/SKILL.md:21-23` (the `accept_plan_drift` block inside the YAML `arguments:` list). Delete the three lines:

```yaml
  - name: accept_plan_drift
    description: "true | false; default false. When false, a mismatch between PG.plan.plan_hash / state_hash and computed values fails the receipt; when true, drift is recorded in receipt notes without forcing fail. Drift is NEVER written to the PG record."
    required: false
```

Preserve the surrounding `- name: strict`, `- name: run_craft_critic`, and `- name: emit_attach_event` blocks unchanged.

### 2. HARD-GATE block (b) clause — drop `accept_plan_drift` conditional

Modify `.claude/skills/branching-story-prose-attach/SKILL.md:38` (the HARD-GATE block (b) clause). Replace the substring `hash_integrity check applied per accept_plan_drift` with `hash_integrity check applied per the split-signal semantics in shared contract §4.6 (plan_hash drift → WARN advisory; state_hash drift → FAIL)`. The rest of the (b) clause is unchanged.

### 3. Process Flow Phase 2 box — update wording

Modify the Phase 2 box at lines 60-63 (inside the `## Process Flow` code-block). Replace:

```
Phase 2: Hash integrity check (computed vs recorded plan_hash + state_hash;
                               hash_integrity FAIL unless
                               accept_plan_drift=true; record drift in
                               receipt notes, never in PG)
```

with:

```
Phase 2: Hash integrity check (split signal: plan_hash drift → WARN advisory
                               per SPEC-72 / FOUNDATIONS §Story Bundles §4a;
                               state_hash drift → FAIL tamper; state_hash
                               recomputed via computePgStateHash directly
                               on the committed PG record's parsed fields,
                               not via the CLI; record drift in receipt
                               notes, never in PG)
```

### 4. Inputs §Optional — remove `accept_plan_drift` bullet

Modify line 93 (inside `## Inputs` → `### Optional`). Delete the bullet:

```
- `accept_plan_drift` — `true | false` — default `false`. Tolerates plan_hash / state_hash mismatch.
```

Preserve the surrounding `strict`, `run_craft_critic`, `emit_attach_event` bullets unchanged.

### 5. Phase 1 hash-computation step — replace CLI call with direct helper

Modify `.claude/skills/branching-story-prose-attach/SKILL.md:164` (the `computed_state_hash:` bullet under "Compute fresh hashes:"). Replace the existing bullet:

> *"`computed_state_hash`: produced by the canonical CLI per shared contract §4.2a — run `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan pages-prose-plans/<page_id>.md --pg _source/pages/<page_id>.yaml`, parse the JSON `{plan_hash, state_hash}` from stdout, and use the `state_hash` value as `computed_state_hash`. The CLI applies the canonical-JSON serializer the contract mandates ..."*

with:

> *"`computed_state_hash`: recompute by calling `computePgStateHash` from `@worldloom/world-index/hash/content` directly on the parsed PG record (the `snapshot_replay_equality` basis per shared contract §4.2a Tooling carve-out). The validator package's `snapshot_replay_equality` at `tools/validators/src/structural/snapshot-replay-equality.ts:296` is the canonical pattern — invoke the same helper on the same parsed-PG input. Do NOT use the `compute-pg-hashes` CLI here: the CLI re-reads the plan file via `--plan` and overwrites `plan.plan_hash` in the PG payload before computing `state_hash` (see `tools/world-mcp/src/cli/compute-pg-hashes.ts:211` `applyComputedPlanHash`), which re-introduces the plan-file→state-hash coupling SPEC-72 §2.2 removes. The CLI remains correct for authoring-time use in `branching-story-bootstrap` Phase 7 and `branching-story-turn-cycle` Phase 9, where both hashes are stamped together at commit; it is not correct for verification-time use in prose-attach Phase 2."*

The `computed_plan_hash: sha256 over the plan file's bytes.` line above this bullet stays unchanged — prose-attach still derives `plan_hash` from the plan bytes for the advisory drift report.

### 6. Phase 2 body — split-signal logic + drop accept_plan_drift conditionals

Modify the Phase 2 body at `.claude/skills/branching-story-prose-attach/SKILL.md:167-184` (the four paragraphs after "## Phase 2: Hash integrity check"). Replace the existing four paragraphs (the "If both recorded hash fields are lowercase sha256-shaped and both match their computed values" paragraph plus the three `accept_plan_drift`-conditional paragraphs) with the split-signal logic:

> *"Compare:*
>
> - *`PG.plan.plan_hash` vs `computed_plan_hash` (advisory).*
> - *`PG.state_hash` vs `computed_state_hash` (verdict-driving).*
>
> *If both recorded hash fields are lowercase sha256-shaped and both match their computed values: set `checks.hash_integrity: PASS`.*
>
> *If `plan_hash` differs but `state_hash` matches: set `checks.hash_integrity: WARN` and record the drift in the receipt's `notes` field as `"plan_hash drift (advisory): PG.plan.plan_hash=<recorded> computed=<computed>"`. Plan-only drift is advisory per SPEC-72 / FOUNDATIONS §Story Bundles §4a — the page plan is a render input whose deviation is routed (revise / repair / promote), not blocked. The WARN does NOT drive `verdict: FAIL`; `repair_recommendation` for plan-only-drift WARNs is `none` (per Phase 5 table).*
>
> *If `state_hash` differs: set `checks.hash_integrity: FAIL` and record the drift in the receipt's `notes` field as `"state_hash drift (PG-record tamper): PG.state_hash=<recorded> computed=<computed>"`. A `state_hash` mismatch means the committed PG record has been hand-edited — genuine corruption; this stays a hard FAIL and routes to `repair_recommendation: run_turn_cycle_repair` per Phase 5.*
>
> *If `PG.state_hash` is missing, placeholder (`PLACEHOLDER_TO_BE_COMPUTED*`), or non-sha256-shaped: set `checks.hash_integrity: FAIL`. The receipt records the invalid value in `notes`; the repair path is upstream PG repair — `repair_recommendation: run_turn_cycle_repair` per Phase 5. Structurally-invalid `plan_hash` (missing, placeholder, non-sha256) is rejected at PG schema validation per `tools/validators/src/schemas/story-page.schema.json` (`plan_hash` is required with pattern `^[0-9a-f]{64}$`); prose-attach Phase 2 therefore sees only well-formed `plan_hash` values, whose drift is advisory per the rule above.*
>
> *Hook 6 surfaces a non-blocking drift notice (per `archive/tickets/SPEC72PLAHASADV-001.md`) on direct `Edit` / `Write` to `pages-prose-plans/PG-<integer>.md` and bundle `INDEX.md` between prose-attach invocations when the stamped `PG.plan.plan_hash` does not match the plan body; this Phase 2 check still runs because receipt truth must not depend only on hook installation, and the WARN here is the receipt-side mirror of Hook 6's edit-time notice.*
>
> ***Drift is recorded in the receipt, NEVER in the `PG` record.** The PG is committed state per FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary)."*

### 7. Phase 5 repair table — split the hash_integrity row

Modify `.claude/skills/branching-story-prose-attach/SKILL.md:295-307` (the `## Phase 5: Compute verdict + repair_recommendation` table). Locate the table row reading:

| `verdict: FAIL` with `hash_integrity: FAIL` (alone) | `run_turn_cycle_repair` (the page state is authoritative; the stamped PG hash is stale — re-commit / restamp the page upstream) |

Replace it with two rows:

| `verdict: WARN` with `hash_integrity: WARN` (plan-only drift) | `none` (plan-only drift is advisory per SPEC-72 / FOUNDATIONS §Story Bundles §4a; the page state is authoritative, the plan file is a render input — the breadcrumb in `notes[]` is the audit trail) |
| `verdict: FAIL` with `hash_integrity: FAIL` (state_hash drift or missing/placeholder/non-sha256 state_hash) | `run_turn_cycle_repair` (the page state is genuinely corrupt or unverifiable — re-commit / restamp the page upstream) |

The other table rows (verdict: PASS → none; verdict: WARN only → revise_prose; forbidden_mystery_resolution → revise_prose; choice_consequence_visibility → revise_prose; invented_structural_fact / entity_status_consistency → run_turn_cycle_repair; canon_claim_without_authority → run_story_fact_promotion_to_canon; char_authority_leak / stchar_authority → use profile_fidelity local recommendation) are unchanged.

Adjacent prose: the *"If multiple FAIL conditions co-occur ..."* paragraph below the table stays unchanged — the precedence rule (`run_story_fact_promotion_to_canon > run_turn_cycle_repair > revise_prose`) still applies, and the new plan-only-drift WARN does not introduce a new repair precedent (its recommendation is `none`).

### 8. World-State Prerequisites — refresh the §4.6 reference framing

The World-State Prerequisites block at lines 106-118 cites the shared contract §4.6 as load-bearing. SPEC72PLAHASADV-002 updates §4.6 to the split-signal wording; this ticket's SKILL changes operationalize that contract. No literal text change is required here unless the implementer wants to add an inline note that §4.6's hash_integrity semantics are now split-signal — optional refinement, not required for correctness.

## Files to Touch

- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify) — frontmatter arguments[] (lines 21-23), HARD-GATE block (b) clause (line 38), Process Flow Phase 2 box (lines 60-63), Inputs Optional list (line 93), Phase 1 hash-computation step (line 164), Phase 2 body (lines 167-184), Phase 5 repair table (lines 295-307).

## Out of Scope

- Hook 6 changes — landed in `archive/tickets/SPEC72PLAHASADV-001.md`.
- Shared contract updates (`story-record-schemas.md` §4.6 + §4.2a) — landed in SPEC72PLAHASADV-002 (this ticket depends on -002 so the SKILL's references to the contract align with the contract's updated state).
- `compute-pg-hashes` CLI source changes — SPEC-72 §3 Out of scope; the CLI is unchanged and continues to be used by `branching-story-bootstrap` Phase 7 and `branching-story-turn-cycle` Phase 9 with the plan-file→state-hash coupling intact.
- `prose-receipt.schema.json` and `story-page.schema.json` — unchanged per SPEC-72 §2.3.
- `snapshot_replay_equality` validator — SPEC-72 §3 Out of scope; the validator's behavior is byte-identical to pre-spec.
- Phase 6 receipt YAML schema (lines 311-353) — the `hash_integrity: PASS | WARN | FAIL` enum is already correct in the receipt schema and in `prose-receipt.schema.json`; no Phase 6 changes needed.
- Phase 3 deterministic checks (lines 186-264) — unchanged; the eight checks plus `char_authority_leak` plus the STCHAR blocks are unrelated to hash_integrity.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "accept_plan_drift" .claude/skills/branching-story-prose-attach/SKILL.md` returns zero matches.
2. `grep -n "computePgStateHash\|@worldloom/world-index/hash/content" .claude/skills/branching-story-prose-attach/SKILL.md` returns ≥1 match (Phase 1 hash-computation step cites the helper + module).
3. `grep -n "compute-pg-hashes.*--plan.*--pg\|node tools/world-mcp/dist/src/cli/compute-pg-hashes" .claude/skills/branching-story-prose-attach/SKILL.md` returns zero matches inside Phase 1 / Phase 2 (the CLI is no longer invoked for state_hash recomputation; references in the Out of Scope discussion or in cross-spec context are acceptable but should not appear as an operational instruction).
4. `grep -n "plan-only drift\|plan_hash drift.*WARN\|plan_hash drift.*advisory" .claude/skills/branching-story-prose-attach/SKILL.md` returns ≥1 match inside Phase 2 and Phase 5.
5. Manual verification on `red-bunny` PG-2 (per SPEC-72 §5 acceptance criterion #4): re-run prose-attach on the regenerated PG-2 plan; receipt's `hash_integrity` field is `WARN` (not `FAIL`); receipt's `verdict` is `PASS` or `WARN` driven by content/STCHAR checks (not auto-`FAIL` from hash_integrity alone); receipt's `notes[]` contains the plan_hash drift breadcrumb; `repair_recommendation` is `none`.
6. Manual or fixture-based verification that hand-editing a committed `_source/pages/PG-<integer>.yaml` state field still produces `hash_integrity: FAIL` (per SPEC-72 §5 acceptance criterion #3 — PG-record tamper detection is strengthened, not weakened).
7. `tools/` build + test suites green (per SPEC-72 §5 acceptance criterion #5): `npm test --prefix tools/validators`, `npm test --prefix tools/world-mcp`, `npm test --prefix tools/hooks` all pass.

### Invariants

1. prose-attach Phase 2 NEVER re-derives `state_hash` from the plan file. The state_hash recomputation source is exactly the committed PG record's parsed contents, via `computePgStateHash` from `@worldloom/world-index/hash/content` — the same helper `snapshot_replay_equality` uses.
2. plan_hash drift alone NEVER produces `verdict: FAIL`. The receipt's roll-up verdict for plan-only drift is at most `WARN`, and `repair_recommendation` for plan-only-drift WARNs is `none`.
3. state_hash drift, missing state_hash, placeholder state_hash, or non-sha256 state_hash ALWAYS produces `hash_integrity: FAIL` and `repair_recommendation: run_turn_cycle_repair` (subject to multi-FAIL precedence rules).
4. The `accept_plan_drift` input is removed entirely from the skill's contract; any user invocation passing `accept_plan_drift: true` or `accept_plan_drift: false` is silently ignored (the frontmatter no longer declares it).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket (prose-attach is an LLM-skill, not a TypeScript module; verification is grep-based on the SKILL.md plus manual / fixture verification of the live red-bunny PG-2 case). Existing pipeline coverage: tools/validators tests cover prose-receipt.schema.json conformance unchanged; tools/world-mcp tests cover compute-pg-hashes CLI behavior unchanged; tools/hooks tests cover Hook 6 in archive/tickets/SPEC72PLAHASADV-001.md.`

### Commands

1. `grep -n "accept_plan_drift\|computePgStateHash\|plan-only drift\|plan_hash drift" .claude/skills/branching-story-prose-attach/SKILL.md` — targeted grep confirming the four terminology shifts landed (zero `accept_plan_drift`; ≥1 `computePgStateHash`; ≥1 `plan-only drift` or `plan_hash drift` in Phase 2 + Phase 5).
2. `npm test --prefix tools/validators && npm test --prefix tools/world-mcp && npm test --prefix tools/hooks` — full pipeline verification confirming no regressions in adjacent surfaces.
3. Manual: invoke `/branching-story-prose-attach worldloom_animalia red-bunny PG-2` against the regenerated PG-2 plan and inspect the emitted receipt's `hash_integrity` field, `verdict`, `notes[]`, and `repair_recommendation` per acceptance criterion #5.
