# SPEC28STOCONHAR-006: Closeout supersession/disposition reconciliation

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `story-promotion-closeout` skill SKILL.md (validation gate + ledger schema description; no templates/ directory — the ledger schema is described inline); SPEC-28 D6 implementation note.
**Deps**: None

## Problem

At intake, `.claude/skills/story-promotion-closeout/SKILL.md` contradicted itself: line 177 said supersede story-local source records "only when an amended-schema field must change"; the line-221 validation gate said "every source record gets a corresponding supersession ... Missing supersessions for accepted-flavored verdicts indicate the closeout is incomplete; abort." The conditional and the mandatory readings could not both hold — the gate's abort condition forced a supersession the line-177 rule would prevent. SPEC-28 D6.

## Assumption Reassessment (2026-05-15)

1. Verified against `.claude/skills/story-promotion-closeout/SKILL.md`: line 177 (supersede "only when an amended-schema field must change") and line 221 (validation gate requires "every source record gets a corresponding supersession … abort" on accepted-flavored verdicts) are both present and contradict — confirmed during SPEC-28's brainstorm verification round. The `story-promotion-closeout` directory contains only `SKILL.md` — no `templates/` directory (verified at decomposition), so the `SP-<integer>-closeout.md` ledger schema is described inline in `SKILL.md`, not in a separate template file.
2. Verified against `archive/specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md`: SPEC-27 did not touch the closeout supersession gate. SPEC-28 D6 is the first ticket to address this contradiction. The `source_record_dispositions:` map prescribed by SPEC-28 D6 has no prior precedent in the closeout skill — it is the new disposition vocabulary D6 introduces.
3. Cross-artifact shared boundary: the closeout's source records (SF / BEL / DA / STENT / SREL — the five classes the skill's existing prose enumerates as supersession-eligible) are the boundary. Their schemas live in `.claude/skills/_shared-templates/story-state-contract.md` §4 (SF §4.5.3, BEL §4.1, DA §4.5.10, STENT §4.5.1, SREL §4.5.7); the closeout's gate is a CONSUMER of those schemas, not a producer. D6 does not edit `story-state-contract.md`; the executable contract edit is limited to `story-promotion-closeout/SKILL.md`.
4. FOUNDATIONS principle motivating this ticket — §Story Bundles §5b (Schema-Minimalism): SPEC-28 D6 explicitly notes that the `source_record_dispositions:` map "preserves §5b schema-minimalism (no forced supersessions)" — the new vocabulary records the per-record disposition without forcing a supersession when no schema field actually changes. The disposition map IS the §5b-preserving design choice.
5. HARD-GATE / canon-write ordering: `story-promotion-closeout` records the verdict on story-local records AFTER `canon-addition` has adjudicated the proposal. D6 changes WHEN supersession happens — only on real schema-field change, with an explicit disposition recorded for every source record (whether or not it was superseded). This is a validation-gate semantics change (from supersession-count to disposition-completeness), but it does not weaken the Mystery Reserve firewall — disposition completeness is an audit-trail discipline, orthogonal to mystery-resolution. The change does not alter canon-write ordering between `canon-addition` and `story-promotion-closeout` (the closeout still runs after canon adjudication).
6. Live reassessment found same-seam stale supersession-count wording outside the line-221 region: the HARD-GATE summary, process-flow text, and pre-flight id-allocation step also implied allocation/supersession per `source_records` inventory. Those lines are required fallout for the D6 contract and were updated in the same pass. `docs/HARD-GATE-DISCIPLINE.md` was read because this ticket changes HARD-GATE-facing validation-gate semantics.
7. Explicit SPEC-28 reference truthing: `specs/SPEC-28-story-contract-hardening.md` still carried D6 current-state/intake prose. This ticket owns adding the same dated implementation-note pattern already used for D1-D5, while leaving the historical D6 problem/change text as intake context.
8. Post-ticket-review blocker resolved (2026-05-15): archival review found same-seam stale skill wording still present after the initial implementation. `.claude/skills/story-promotion-closeout/SKILL.md` line 54 still asked for a "per-source-record supersession plan"; the Output table lines 119 and 121-123 still implied supersession records were created from verdict/source-kind presence rather than only when an amended-schema field actually changes. The resumed implementation corrected those passages to disposition-plan / amended-schema-change wording and reran the stale-anchor proof.

## Architecture Check

1. Replacing the supersession-count gate with a disposition-completeness gate (rather than relaxing line 221's abort condition or removing line 177's conditional rule) is cleaner because it preserves BOTH the line-177 minimalism rule (supersede only on real schema-field change) AND the closeout's audit-trail completeness (every source record has an explicit disposition). The disposition vocabulary (`superseded | ledger_only | unchanged_no_schema_field_changed`) makes per-record handling auditable without forcing redundant supersessions.
2. No backwards-compatibility shims or alias paths — the contradictory line-221 gate is replaced in place; line 177's wording is preserved unchanged. The `SP-<integer>-closeout.md` ledger gains the `source_record_dispositions:` map as a required block; no migration is meaningful (zero production bundles exist).

## Verification Layers

1. Contradiction resolved -> codebase grep-proof: `grep -nE "every source record gets a corresponding supersession|Missing supersessions" .claude/skills/story-promotion-closeout/SKILL.md` returns no hits; the line-221 region instead requires `source_record_dispositions:` completeness.
2. Line-177 wording preserved -> codebase grep-proof: `grep -n "only when an amended-schema field must change" .claude/skills/story-promotion-closeout/SKILL.md` still returns a hit (line 177 is preserved).
3. Disposition vocabulary documented -> codebase grep-proof: `grep -nE "source_record_dispositions|superseded|ledger_only|unchanged_no_schema_field_changed" .claude/skills/story-promotion-closeout/SKILL.md` returns hits, with the three disposition values documented as a closed enum and the `source_record_dispositions:` map declared as part of the `SP-<integer>-closeout.md` ledger schema.
4. Single-skill ticket: the grep/manual-review layers above cover the distinct invariants (contradiction removal, line-177 preservation, disposition vocabulary, ledger-schema documentation); no schema-validation or skill-dry-run layer applies because the closeout ledger is a markdown artifact with no JSON-schema counterpart and zero production bundles exist.

## Landed Changes

### 1. Replaced the supersession-count validation gate with a disposition-completeness gate

In `.claude/skills/story-promotion-closeout/SKILL.md`, replaced the line-221 supersession-count gate with a disposition-completeness gate: the closeout MUST record a `source_record_dispositions:` map carrying one disposition per source record listed in the proposal package's `source_records` inventory, with each disposition drawn from the closed enum `superseded | ledger_only | unchanged_no_schema_field_changed`. Missing or extraneous entries abort the closeout.

### 2. Preserved the line-177 wording and corrected same-seam stale summaries

The line-177 rule ("Supersede story-local source records only when an amended-schema field must change") remains unchanged. The HARD-GATE summary, process flow, and pre-flight allocation step now describe source-record loading, disposition completeness, and supersession-id allocation only for records that actually need replacement story-state records.

### 3. Documented the `source_record_dispositions:` map in the ledger schema

The `SP-<integer>-closeout.md` ledger schema description now includes `source_record_dispositions:` as a required block. The inline schema documents `superseded` (a new record was written because a schema field changed), `ledger_only` (the verdict or canon link is recorded only in the closeout ledger), and `unchanged_no_schema_field_changed` (the source record remains unchanged because no amended-schema field needed updating).

### 4. Truthed the SPEC-28 D6 reference

Added a dated implementation note to `specs/SPEC-28-story-contract-hardening.md` marking D6 as landed and labeling the remaining D6 current-state prose as historical intake context.

### 5. Resolved the post-review stale output wording

After post-ticket-review reopened the ticket, updated the HARD-GATE deliverable summary from "per-source-record supersession plan" to "per-source-record disposition plan" and rewrote the supersession rows in the Output table so SF / BEL / STENT / SREL / DA replacement records are created only when `source_record_dispositions[<record-id>] = superseded`.

## Files to Touch

- `.claude/skills/story-promotion-closeout/SKILL.md` (modify)
- `specs/SPEC-28-story-contract-hardening.md` (modify)

## Out of Scope

- Story-state-contract.md amendments — D6 does not change any source-record schema; it changes the closeout's gate semantics.
- Other phases of `story-promotion-closeout` (the verdict-recording phase, the per-world stories/INDEX.md archival on accepted-flavored verdicts, etc.).
- The story-fact-promotion-to-canon side — `archive/tickets/SPEC28STOCONHAR-005.md` (SPEC-28 D5).
- Adding a JSON-schema validator for `SP-<integer>-closeout.md` — the ledger is a markdown artifact; D6 documents the schema inline without introducing a JSON-schema counterpart.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "every source record gets a corresponding supersession|Missing supersessions" .claude/skills/story-promotion-closeout/SKILL.md` returns no hits.
2. `grep -n "only when an amended-schema field must change" .claude/skills/story-promotion-closeout/SKILL.md` still returns a hit (line-177 wording preserved).
3. `grep -nE "source_record_dispositions|ledger_only|unchanged_no_schema_field_changed" .claude/skills/story-promotion-closeout/SKILL.md` returns hits with the three disposition values declared and the `source_record_dispositions:` map documented as part of the closeout-ledger schema.
4. `grep -nE 'per-source-record supersession plan|`SF-<integer>` \(supersession\).*proposal contains SF source records|`STENT-<integer>` \(supersession\).*verdict accepted-flavored|`SREL-<integer>` \(supersession\).*verdict accepted-flavored|`DA-<integer>` \(supersession\).*verdict accepted-flavored' .claude/skills/story-promotion-closeout/SKILL.md` returns no hits.
5. Manual review confirms the SPEC-28 D6 implementation note matches the landed closeout skill contract.

### Invariants

1. The closeout's validation gate checks disposition completeness — `source_record_dispositions` key set equals the proposal package's `source_records` set — not supersession count.
2. The line-177 rule (supersede only on a real schema-field change) is preserved; no forced supersessions are introduced (FOUNDATIONS §Story Bundles §5b schema-minimalism).
3. Every source record listed in the proposal package's `source_records` inventory has an explicit disposition in the closeout ledger, drawn from the closed enum `superseded | ledger_only | unchanged_no_schema_field_changed`.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "every source record gets a corresponding supersession|Missing supersessions" .claude/skills/story-promotion-closeout/SKILL.md` (must return no hits).
2. `grep -n "only when an amended-schema field must change" .claude/skills/story-promotion-closeout/SKILL.md` (must still return a hit).
3. `grep -nE "source_record_dispositions|ledger_only|unchanged_no_schema_field_changed" .claude/skills/story-promotion-closeout/SKILL.md`
4. `grep -nE "per source_records count|supersession count matches" .claude/skills/story-promotion-closeout/SKILL.md` (must return no hits).
5. `grep -nE 'per-source-record supersession plan|`SF-<integer>` \(supersession\).*proposal contains SF source records|`STENT-<integer>` \(supersession\).*verdict accepted-flavored|`SREL-<integer>` \(supersession\).*verdict accepted-flavored|`DA-<integer>` \(supersession\).*verdict accepted-flavored' .claude/skills/story-promotion-closeout/SKILL.md` (must return no hits).
6. A narrower command is the correct verification boundary: D6's executable contract lives in one SKILL.md file with no JSON-schema or code counterpart; grep-proofs against that file plus manual review of the SPEC-28 implementation note fully cover the change.

## Outcome

Completed on 2026-05-15. `story-promotion-closeout` now validates explicit source-record dispositions instead of forcing a supersession per source record. The skill keeps conditional supersession discipline, documents the required `source_record_dispositions:` ledger block, allocates supersession ids only for records that actually need replacement story-state records, and no longer carries the post-review stale HARD-GATE/Output-table wording. SPEC-28 D6 now has a dated implementation note.

## Verification Result

1. `grep -nE "every source record gets a corresponding supersession|Missing supersessions" .claude/skills/story-promotion-closeout/SKILL.md` — passed with no hits (expected exit 1 / empty output).
2. `grep -n "only when an amended-schema field must change" .claude/skills/story-promotion-closeout/SKILL.md` — passed; hit the preserved accepted-verdict rule.
3. `grep -nE "source_record_dispositions|ledger_only|unchanged_no_schema_field_changed" .claude/skills/story-promotion-closeout/SKILL.md` — passed; hits cover the Phase 2 disposition map, Phase 3 completeness gate, and inline closeout-ledger schema.
4. `grep -nE "per source_records count|supersession count matches" .claude/skills/story-promotion-closeout/SKILL.md` — passed with no hits (expected exit 1 / empty output).
5. Manual review confirmed `specs/SPEC-28-story-contract-hardening.md` D6 has the dated implementation note and preserves the old D6 description as historical intake context.
6. `grep -nE 'per-source-record supersession plan|`SF-<integer>` \(supersession\).*proposal contains SF source records|`STENT-<integer>` \(supersession\).*verdict accepted-flavored|`SREL-<integer>` \(supersession\).*verdict accepted-flavored|`DA-<integer>` \(supersession\).*verdict accepted-flavored' .claude/skills/story-promotion-closeout/SKILL.md` — passed with no hits (expected exit 1 / empty output), proving the post-review stale HARD-GATE/Output-table wording was removed.

## Deviations

The implementation included same-seam stale wording outside the drafted line-221 edit: the HARD-GATE summary, process flow, pre-flight allocation text, and Output table also encoded the old supersession-count assumption. The resumed implementation updated those same-seam passages rather than limiting the fix to the originally drafted line-221 gate. The explicit SPEC-28 reference was updated with the established implementation-note pattern.
