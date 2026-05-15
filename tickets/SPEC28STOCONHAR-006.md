# SPEC28STOCONHAR-006: Closeout supersession/disposition reconciliation

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `story-promotion-closeout` skill SKILL.md (validation gate + ledger schema description; no templates/ directory — the ledger schema is described inline).
**Deps**: None

## Problem

`.claude/skills/story-promotion-closeout/SKILL.md` contradicts itself: line 177 says supersede story-local source records "only when an amended-schema field must change"; the line-221 validation gate says "every source record gets a corresponding supersession … Missing supersessions for accepted-flavored verdicts indicate the closeout is incomplete; abort." The conditional and the mandatory readings cannot both hold — the gate's abort condition forces a supersession the line-177 rule would prevent. SPEC-28 D6.

## Assumption Reassessment (2026-05-15)

1. Verified against `.claude/skills/story-promotion-closeout/SKILL.md`: line 177 (supersede "only when an amended-schema field must change") and line 221 (validation gate requires "every source record gets a corresponding supersession … abort" on accepted-flavored verdicts) are both present and contradict — confirmed during SPEC-28's brainstorm verification round. The `story-promotion-closeout` directory contains only `SKILL.md` — no `templates/` directory (verified at decomposition), so the `SP-<integer>-closeout.md` ledger schema is described inline in `SKILL.md`, not in a separate template file.
2. Verified against `archive/specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md`: SPEC-27 did not touch the closeout supersession gate. SPEC-28 D6 is the first ticket to address this contradiction. The `source_record_dispositions:` map prescribed by SPEC-28 D6 has no prior precedent in the closeout skill — it is the new disposition vocabulary D6 introduces.
3. Cross-artifact shared boundary: the closeout's source records (SF / BEL / DA / STENT / SREL — the five classes the skill's existing prose enumerates as supersession-eligible) are the boundary. Their schemas live in `.claude/skills/_shared-templates/story-state-contract.md` §4 (SF §4.5.3, BEL §4.1, DA §4.5.10, STENT §4.5.1, SREL §4.5.7); the closeout's gate is a CONSUMER of those schemas, not a producer. D6 does not edit `story-state-contract.md` — only `story-promotion-closeout/SKILL.md`.
4. FOUNDATIONS principle motivating this ticket — §Story Bundles §5b (Schema-Minimalism): SPEC-28 D6 explicitly notes that the `source_record_dispositions:` map "preserves §5b schema-minimalism (no forced supersessions)" — the new vocabulary records the per-record disposition without forcing a supersession when no schema field actually changes. The disposition map IS the §5b-preserving design choice.
5. HARD-GATE / canon-write ordering: `story-promotion-closeout` records the verdict on story-local records AFTER `canon-addition` has adjudicated the proposal. D6 changes WHEN supersession happens — only on real schema-field change, with an explicit disposition recorded for every source record (whether or not it was superseded). This is a validation-gate semantics change (from supersession-count to disposition-completeness), but it does not weaken the Mystery Reserve firewall — disposition completeness is an audit-trail discipline, orthogonal to mystery-resolution. The change does not alter canon-write ordering between `canon-addition` and `story-promotion-closeout` (the closeout still runs after canon adjudication).

## Architecture Check

1. Replacing the supersession-count gate with a disposition-completeness gate (rather than relaxing line 221's abort condition or removing line 177's conditional rule) is cleaner because it preserves BOTH the line-177 minimalism rule (supersede only on real schema-field change) AND the closeout's audit-trail completeness (every source record has an explicit disposition). The disposition vocabulary (`superseded | ledger_only | unchanged_no_schema_field_changed`) makes per-record handling auditable without forcing redundant supersessions.
2. No backwards-compatibility shims or alias paths — the contradictory line-221 gate is replaced in place; line 177's wording is preserved unchanged. The `SP-<integer>-closeout.md` ledger gains the `source_record_dispositions:` map as a required block; no migration is meaningful (zero production bundles exist).

## Verification Layers

1. Contradiction resolved -> codebase grep-proof: `grep -nE "every source record gets a corresponding supersession|Missing supersessions" .claude/skills/story-promotion-closeout/SKILL.md` returns no hits; the line-221 region instead requires `source_record_dispositions:` completeness.
2. Line-177 wording preserved -> codebase grep-proof: `grep -n "only when an amended-schema field must change" .claude/skills/story-promotion-closeout/SKILL.md` still returns a hit (line 177 is preserved).
3. Disposition vocabulary documented -> codebase grep-proof: `grep -nE "source_record_dispositions|superseded|ledger_only|unchanged_no_schema_field_changed" .claude/skills/story-promotion-closeout/SKILL.md` returns hits, with the three disposition values documented as a closed enum and the `source_record_dispositions:` map declared as part of the `SP-<integer>-closeout.md` ledger schema.
4. Single-skill ticket: the four layers above (contradiction, line-177 preservation, disposition vocabulary, ledger-schema documentation) are the distinct invariants; no schema-validation or skill-dry-run layer applies because the closeout ledger is a markdown artifact with no JSON-schema counterpart and zero production bundles exist.

## What to Change

### 1. Replace the line-221 supersession-count validation gate with a disposition-completeness gate

In `.claude/skills/story-promotion-closeout/SKILL.md` at the line-221 region, replace the "every source record gets a corresponding supersession … Missing supersessions for accepted-flavored verdicts indicate the closeout is incomplete; abort" gate with a disposition-completeness gate: the closeout MUST record a `source_record_dispositions:` map carrying one disposition per source record listed in the proposal package's `source_records` inventory, with each disposition drawn from the closed enum `superseded | ledger_only | unchanged_no_schema_field_changed`. Missing or extraneous entries (the map's key set must equal the proposal package's `source_records` set) abort the closeout.

### 2. Preserve the line-177 wording

Leave the line-177 rule ("Supersede story-local source records only when an amended-schema field must change") unchanged — D6 keeps the conditional supersession discipline; only the gate is rewritten to check disposition completeness instead of supersession count.

### 3. Document the `source_record_dispositions:` map in the ledger schema

Update the `SP-<integer>-closeout.md` ledger schema description (inline in `story-promotion-closeout/SKILL.md`, since there is no `templates/` directory) to include the `source_record_dispositions:` map as a required block. Document the three disposition values: `superseded` (a new record was written supersding the source — used when a schema field changed), `ledger_only` (the canon link is recorded only in the closeout ledger, no new record), and `unchanged_no_schema_field_changed` (the source record is unchanged because no amended-schema field needed updating).

## Files to Touch

- `.claude/skills/story-promotion-closeout/SKILL.md` (modify)

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

### Invariants

1. The closeout's validation gate checks disposition completeness — `source_record_dispositions` key set equals the proposal package's `source_records` set — not supersession count.
2. The line-177 rule (supersede only on a real schema-field change) is preserved; no forced supersessions are introduced (FOUNDATIONS §Story Bundles §5b schema-minimalism).
3. Every source record listed in the proposal package's `source_records` inventory has an explicit disposition in the closeout ledger, drawn from the closed enum `superseded | ledger_only | unchanged_no_schema_field_changed`.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "every source record gets a corresponding supersession|Missing supersessions|source_record_dispositions" .claude/skills/story-promotion-closeout/SKILL.md`
2. `grep -n "only when an amended-schema field must change" .claude/skills/story-promotion-closeout/SKILL.md` (must still return a hit).
3. A narrower command is the correct verification boundary: D6 touches one SKILL.md file with no JSON-schema or code counterpart; grep-proofs against that file fully cover the change.
