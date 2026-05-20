# SPEC56STCHARMACFOU-001: FOUNDATIONS + shared-contract STCHAR amendments

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `docs/FOUNDATIONS.md`, `.claude/skills/_shared-templates/story-state-contract.md`, `.claude/skills/_shared-templates/story-record-schemas.md`, `specs/SPEC-56-stchar-machine-foundation.md` (contract/doc surfaces; no code).
**Deps**: None

## Problem

At intake, the story pipeline had no stable story-local character authority. `STENT` bound to a world `CHAR-*` dossier through a thin `bound_char_id` pointer that no runtime skill loaded the body of, so rendered characters collapsed to generic competence (the reported downgrade). This ticket lands the contract layer for `STCHAR` — a story-local character-authority record — so every downstream machine-layer ticket (schema, validators, patch-engine, index, MCP) has an authoritative definition to implement against. It is the foundation ticket: it defines the class, the world/story-separation rule, and the `STENT` field cutover (`bound_char_id` → `bound_stchar_id`).

## Assumption Reassessment (2026-05-20)

1. At intake, `STENT` schema at `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.1 carried `bound_char_id: CHAR-<integer> | null` and no `bound_stchar_id` (verified this session before edits). `record_active` predicate lawful-class list was at story-state-contract.md line ~187; `PG.state_snapshot.active_records` at story-record-schemas.md §4.2; `CHC.grounded_in.records[]` at §4.5.12 — all confirmed.
2. At intake, `docs/FOUNDATIONS.md` §Story Bundles §6 (Story-Bundle ID Classes) enumerated the per-bundle classes without `STCHAR`; §6a (Belief vs. Fact) and §6b (Observer firewall) exist and are the basis for excluding STCHAR from `BEL.basis.access_records`.
3. **Cross-artifact boundary under audit**: the shared story-state contract (`story-state-contract.md` + `story-record-schemas.md`) is consumed by all seven story-pipeline skills (FOUNDATIONS §Story Bundles §7) and by the JSON schemas (ticket 002). This ticket changes the contract's record inventory, `record_active` list, `active_records`, lifecycle discipline, `STENT` schema, and grounding surfaces; §5b forbids skills adding fields without amending this contract first — so this amendment must land before 002/003/etc.
4. **FOUNDATIONS principle restatement**: §Story Bundles world/story separation (world `CHAR` stays story-agnostic; story-local authority is downstream) + §6a (STCHAR is persona authority, NOT epistemic access — must NOT enter `BEL.basis.access_records`) + Rule 6 No Silent Retcons (the `bound_char_id` removal is a documented contract change, not a silent edit). These principles, not the spec narrative alone, govern the amendment.
5. **Rename/remove blast radius** (`bound_char_id` field): the field is documented here and removed; pipeline-wide grep shows consumers in `tools/validators/src/schemas/story-entity.schema.json` + `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (ticket 002), `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (ticket 004), `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (ticket 007), and `.claude/skills/branching-story-turn-cycle/references/pre-flight-and-prerequisites.md` (SPEC-57, out of scope). World-index does NOT parse `bound_char_id` (verified — zero blast radius there). This ticket changes only the contract docs; code sites land in their own tickets.
6. Closeout same-seam correction: `.claude/skills/_shared-templates/story-record-schemas.md` is the full record-schema authority for §4, so the landed contract also adds a `STCHAR` schema entry there. This keeps ticket 002's contract↔schema parity target honest rather than leaving the STCHAR field set only in the spec narrative.

## Architecture Check

1. Defining STCHAR in the contract first (rather than letting each tool invent its own shape) preserves the §5b single-source-of-truth discipline: the JSON schema, validators, index, and MCP all encode what the contract declares. A scattered definition would drift.
2. No backwards-compatibility aliasing: `bound_char_id` is removed outright (zero production story bundles — verified; only the test fixture uses it), not dual-written alongside `bound_stchar_id`.

## Verification Layers

1. STCHAR listed as a story-bundle ID class → grep-proof: `grep -n "STCHAR" docs/FOUNDATIONS.md` returns the §6 entry + the new §Story-Local Character Authority subsection.
2. `STENT.bound_stchar_id` replaces `bound_char_id` with the background-only-null rule → grep-proof: `grep -n "bound_stchar_id\|bound_char_id" .claude/skills/_shared-templates/story-record-schemas.md` shows `bound_stchar_id` present, `bound_char_id` absent.
3. STCHAR excluded from `BEL.basis.access_records` and `SE.promotion_claims[].source_record` → manual review against §6a + the spec's explicit "do NOT add" instruction.

## Landed Changes

### 1. `docs/FOUNDATIONS.md`

- §Story Bundles §6 Story-Bundle ID Classes: add `STCHAR` with gloss "story-local character authority profile; hybrid markdown artifact under `story-characters/`."
- Add a new §Story-Local Character Authority subsection under §Story Bundles with the world/story-separation rule (world `CHAR` story-agnostic; runtime consumes active STCHAR not world `CHAR`; `CHAR` provenance recordable in STCHAR frontmatter but never an operational shortcut in `STENT`/`CHC`/page plans/prose receipts).

### 2. `.claude/skills/_shared-templates/story-state-contract.md`

- §3 Record Class Inventory: add `STCHAR` entry.
- `record_active` predicate lawful-class list: add `STCHAR`.
- Lifecycle write discipline: add the STCHAR hybrid-artifact note (created/superseded by patch-engine hybrid ops; participates in `PG.state_snapshot.active_records`).
- §8 page-plan minimum contract: **reserve** a §16-class "STCHAR-derived character authority packets" section as a named placeholder, explicitly NOT-yet-mandatory (SPEC-57 promotes it to mandatory once producer + enforcer land). Do not mandate it here.

### 3. `.claude/skills/_shared-templates/story-record-schemas.md`

- §4.5.1: replace `STENT` schema — remove `bound_char_id`, add `bound_stchar_id: STCHAR-<integer> | null` with the rule "null only when `role_in_story` is exactly `[background]`."
- §4.2: add `STCHAR: [STCHAR-<integer>]` to `PG.state_snapshot.active_records`.
- Add `STCHAR` to `CHC.grounded_in.records[]` (§4.5.12), `SE.state_delta.create/supersede/close[]`, `SE.record_introductions[].class`, `SREL.derived_from[]`, `STPLAN.derived_from[]`, `STEMO.derived_from[]`.
- Do **NOT** add `STCHAR` to `BEL.basis.access_records[]` or `SE.promotion_claims[].source_record`.
- Add `STCHAR` as the story-local character authority schema entry in §4.5.19 so the shared contract, not only the originating spec, defines the STCHAR field set for ticket 002.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify)
- `specs/SPEC-56-stchar-machine-foundation.md` (modify — Phase 1 implementation note)

## Out of Scope

- JSON schema files (`tools/validators/src/schemas/*`) — ticket 002.
- Any skill behavior change (bootstrap/turn-cycle/etc.) — SPEC-57.
- The page-plan §16 packet's full text + mandatory promotion — SPEC-57.
- `bound_char_id` removal in code/tests/fixtures — tickets 002/004/007.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "STCHAR" docs/FOUNDATIONS.md` → §6 ID-class entry + §Story-Local Character Authority subsection present.
2. `grep -n "bound_char_id" .claude/skills/_shared-templates/story-record-schemas.md` → zero matches (replaced by `bound_stchar_id`).
3. `grep -n "BEL.basis.access_records\|promotion_claims" .claude/skills/_shared-templates/story-record-schemas.md` → STCHAR absent from both surfaces (manual confirm against §6a).

### Invariants

1. The shared story-state contract remains the single source of truth for story-record schemas (§5b) — no tool encodes a STCHAR field this contract doesn't declare.
2. STCHAR is persona authority, never epistemic access — it stays out of `BEL.basis.access_records` (§6a).

## Test Plan

### New/Modified Tests

1. `None — documentation/contract-only ticket; verification is grep-based against the amended contract surfaces. Code-side conformance is exercised by tickets 002–007.`

### Commands

1. `grep -n "STCHAR" docs/FOUNDATIONS.md .claude/skills/_shared-templates/story-state-contract.md .claude/skills/_shared-templates/story-record-schemas.md`
2. `grep -rn "bound_char_id" .claude/skills/_shared-templates/` → zero matches.
3. Narrower grep boundary is correct here: this ticket touches only markdown contract files; no package build/test applies until the schema ticket (002) lands.

## Outcome

Completed on 2026-05-20.

The contract layer now declares `STCHAR` as a story-local character authority class in `docs/FOUNDATIONS.md`, the shared story-state contract, and the story-record schema authority. `STENT` now binds non-background entities through `bound_stchar_id`; page snapshots, record introductions, event deltas, choice grounding, and derived relationship/plan/emotion surfaces can name `STCHAR`. The page-plan contract reserves STCHAR-derived character authority packets without making them mandatory before SPEC-57 lands producers and enforcement.

## Verification Result

1. `grep -n "STCHAR" docs/FOUNDATIONS.md .claude/skills/_shared-templates/story-state-contract.md .claude/skills/_shared-templates/story-record-schemas.md` — PASS: found STCHAR in FOUNDATIONS §6/§6.1, story-state inventory/record_active/lifecycle/page-plan reservation, and story-record schema/grounding surfaces.
2. `grep -rn "bound_char_id" .claude/skills/_shared-templates/` — PASS: returned no matches, confirming the shared templates no longer carry the removed field.
3. `grep -n "BEL.basis.access_records\\|promotion_claims\\|source_record" .claude/skills/_shared-templates/story-record-schemas.md` — PASS: `promotion_claims[].source_record` still lists only `SF | BEL | DA | STENT | STSTAT | SREL`, and `STCHAR` is absent from epistemic/promotion source surfaces.
4. Manual review of `specs/SPEC-56-stchar-machine-foundation.md` — PASS: Phase 1 now carries a dated implementation note, while the remaining Phase 1 prose is labelled as historical implementation scope.

## Deviations

The landed contract adds a `STCHAR` schema entry to `story-record-schemas.md` even though the ticket's drafted bullet list focused on references from existing schemas. This is same-seam contract truthing: `story-record-schemas.md` is the canonical §4 schema enumeration, and ticket 002 needs an explicit contract field set to encode. The originating spec also received a dated implementation note instead of a broad Phase 1 rewrite, keeping the spec usable as historical scope while making the current status explicit.
