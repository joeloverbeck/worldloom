# VALSTCHAR-001: Fix STCHAR `page_packet_hash` per-page contract

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators`, `tools/world-mcp` context/CLI surfaces, STCHAR schemas, shared story contracts, story-pipeline skill prose, and direct page-plan/receipt restamps
**Deps**: `archive/specs/SPEC-65-story-schema-contract-parity-hardening.md`, `archive/specs/SPEC-70-char-stchar-semantic-preservation.md`

## Problem

At intake, the STCHAR `page_packet_hash` contract was internally contradictory and rejected valid multi-page story bundles.

The shared story-state contract says `§16a` is **per-page-computed STCHAR voice authority** and that `page_packet_hash` hashes the full page-specific `§16a` packet projection. That means the same active `STCHAR-*` can lawfully have a different `page_packet_hash` on `PG-1`, `PG-2`, and later pages because each page packet projects different page-local authority.

Before this ticket, the live schema and validators instead treated `page_packet_hash` as a single stored STCHAR frontmatter field. `page_plan_stchar_packet_integrity` compared every page packet's recomputed page-specific hash to `STCHAR.page_packet_hash`, and `prose_receipt_stchar_integrity` expected receipt `page_packet_hash.expected` to equal the same stored STCHAR field. This made distinct per-page packets impossible: fixing one page necessarily broke another.

Live witness after rebuilding `erotica-world` on 2026-05-22:

```text
node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny
```

emitted `page_plan_stchar_packet_integrity.hash_mismatch` for both `stories/red-bunny/pages-prose-plans/PG-1.md` and `PG-2.md` because each page's §16a packet recomputed to a different hash for the same STCHAR.

## Assumption Reassessment (2026-05-22)

1. Pre-fix validator behavior was checked against `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts`: `packetVerdicts()` compared `profile_hash`, `voice_block_hash`, and `page_packet_hash` declarations to STCHAR parsed frontmatter, then recomputed the page packet and compared that recompute to stored `STCHAR.page_packet_hash`. The pre-fix test `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` encoded that single-STCHAR-value assumption.
2. Pre-fix receipt validation had the same assumption in `tools/validators/src/structural/prose-receipt-stchar-integrity.ts`: `hashVerdicts()` compared receipt `expected` to stored STCHAR frontmatter for all three hash fields, including `page_packet_hash`.
3. The contract boundary under audit is shared across STCHAR records, page-plan §16a packets, and prose receipts: `.claude/skills/_shared-templates/story-state-contract.md`, `.claude/skills/_shared-templates/story-record-schemas.md`, `tools/validators/src/schemas/story-character-authority.schema.json`, `tools/validators/src/schemas/prose-receipt.schema.json`, and story-pipeline skills that author STCHAR/page-plan/receipt artifacts.
4. `docs/FOUNDATIONS.md` §Story Bundles §6.1 motivates the intended principle: runtime characterization consumes active STCHAR through page-local state and §16a packets, while STCHAR remains story-local character authority. A page-specific projection hash must not become a global STCHAR invariant.
5. This ticket changes validation signals used by story-pipeline gates. Implementation must read `docs/HARD-GATE-DISCIPLINE.md` before edits and preserve gate strength: page packets and receipts must still fail when profile/voice hashes drift, when packet hashes are malformed, or when the receipt lies about the page-plan packet.
6. Pre-fix schema mismatch: `tools/validators/src/schemas/story-character-authority.schema.json` required `page_packet_hash`, while the per-page contract means this field does not belong on STCHAR frontmatter. This ticket removes the field from STCHAR's required schema and from STCHAR active-context summaries, instead of treating it as a permanent compatibility alias.
7. Adjacent contradictions were in scope when they carried the same false global-hash assumption: `.claude/skills/story-character-profile/SKILL.md`, `.claude/skills/branching-story-bootstrap/SKILL.md`, `.claude/skills/branching-story-prose-attach/SKILL.md`, `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md`, `.claude/skills/branching-story-health-audit/SKILL.md`, `docs/CONTEXT-PACKET-CONTRACT.md`, and `tools/world-mcp/src/context-packet/*` references to `active_story_characters.page_packet_hash`.
8. Baseline package proof on 2026-05-22: `cd tools/validators && npm test` passed (900 tests). `cd tools/world-mcp && npm test` was already red before implementation because `tools/validators/dist/src/public/registry.js` imported `stcharSourceFactCoverage` from a stale compiled structural module that did not export that name. Post-review reran the broad world-mcp lane after the final package builds refreshed generated artifacts, and it passed.
9. Existing `worlds/erotica-world` failures are a live-corpus witness and direct page-plan/receipt restamp target only. The live STCHAR hybrid record still carries `page_packet_hash`; removing that structural frontmatter field from an existing `story-characters/STCHAR-*.md` record is not covered by an obvious patch-engine operation in this checkout, so this ticket does not direct-edit existing STCHAR frontmatter. The live-corpus structural command may remain nonzero on `record_schema_compliance.additionalProperties` until a follow-up migration/supersession owner removes legacy STCHAR frontmatter fields through an approved engine route.

## Architecture Check

1. Clean end state: `profile_hash` and `voice_block_hash` remain STCHAR-global frontmatter fields because they are derived from the STCHAR body; `page_packet_hash` becomes page-plan/prose-receipt-local because it is derived from each page's §16a packet projection.
2. No backwards-compatibility aliasing/shims introduced. Do not keep a second meaning for `STCHAR.page_packet_hash`; remove it from the STCHAR schema/contract and update producers/consumers to stop reading it as global authority.
3. The canonical hash helper `computeStcharPagePacketHash()` remains valid; only its storage/validation owner changes from STCHAR frontmatter to page-local packet/receipt surfaces.

## Verification Layers

1. Per-page packet hash locality -> validator unit test with one STCHAR and two page plans whose §16a packets intentionally differ and both pass when each packet declaration matches its own recompute.
2. STCHAR profile/voice authority remains global -> validator unit tests still fail when §16a `profile_hash` or `voice_block_hash` differs from stored STCHAR frontmatter.
3. Receipt truthfulness -> `prose_receipt_stchar_integrity` test proves receipt `page_packet_hash.expected/observed` matches the page-plan packet hash, not STCHAR frontmatter.
4. Schema/consumer cleanup -> grep-proof that `page_packet_hash` is no longer required or projected from `story_character_authority_record` / `active_story_characters`, while `page_packet_hash` remains present in page-plan §16a and prose receipt schemas.
5. FOUNDATIONS alignment -> manual review that the final docs preserve STCHAR as runtime character authority without making page-local packet projections global STCHAR state.

## What to Change

### 1. STCHAR schema and docs

Remove `page_packet_hash` from STCHAR frontmatter authority:

- `tools/validators/src/schemas/story-character-authority.schema.json`
- `.claude/skills/_shared-templates/story-record-schemas.md`
- `.claude/skills/story-character-profile/SKILL.md`
- `.claude/skills/branching-story-bootstrap/SKILL.md`
- any patch-engine/world-mcp envelope schema descriptions that list required STCHAR payload fields

Keep `profile_hash` and `voice_block_hash` as required STCHAR body-derived hashes.

### 2. Page-plan validator

Update `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` so:

- `profile_hash` and `voice_block_hash` declarations must match stored STCHAR frontmatter.
- `page_packet_hash` declaration must match `computeStcharPagePacketHash(packet.packetText)`.
- no check compares page-local `page_packet_hash` to STCHAR frontmatter.
- failure messages and suggested fixes name the correct repair surface: update the §16a packet declaration, not STCHAR frontmatter.

### 3. Prose receipt validator

Update `tools/validators/src/structural/prose-receipt-stchar-integrity.ts` so:

- receipt `profile_hash.expected` is stored STCHAR `profile_hash`; receipt `profile_hash.observed` is page-plan §16a `profile_hash`.
- receipt `voice_block_hash.expected` is stored STCHAR `voice_block_hash`; receipt `voice_block_hash.observed` is page-plan §16a `voice_block_hash`.
- receipt `page_packet_hash.expected` and `observed` are checked against the page-plan packet's declared/recomputed page-local `page_packet_hash`, not STCHAR frontmatter.

### 4. Context packet and skill surfaces

Remove `active_story_characters.page_packet_hash` from status-based STCHAR inventory surfaces, because that inventory is not page-specific. Keep page-specific `page_packet_hash` in page plans and receipts.

Update:

- `docs/CONTEXT-PACKET-CONTRACT.md`
- `tools/world-mcp/src/context-packet/shared.ts`
- `tools/world-mcp/src/context-packet/story-bundle-context.ts`
- story-pipeline skills that describe §16a or prose receipts

### 5. Live-corpus follow-through

After the contract fix, restamp `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md`, `PG-2.md`, and `pages-prose-receipts/PG-1.yaml` so their page-local `page_packet_hash` values match the corrected validator semantics. Do not hand-edit unrelated story prose or existing STCHAR frontmatter in this ticket.

## Files to Touch

- `tools/validators/src/schemas/story-character-authority.schema.json` (modify)
- `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` (modify)
- `tools/validators/src/structural/prose-receipt-stchar-integrity.ts` (modify)
- `tools/validators/src/structural/stchar-body-integrity.ts` (modify)
- `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` (modify)
- `tools/validators/tests/structural/prose-receipt-stchar-integrity.test.ts` (modify)
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify)
- `tools/validators/tests/structural/record-schema-compliance-story-character-authority.test.ts` (modify)
- `tools/validators/tests/structural/stchar-body-integrity.test.ts` (modify)
- `tools/validators/tests/structural/stchar-bound-stent-reciprocity.test.ts` (modify)
- `tools/validators/tests/structural/stchar-source-fact-coverage.test.ts` (modify)
- `tools/validators/tests/structural/stchar-source-hash-matches-source.test.ts` (modify)
- `tools/validators/tests/structural/stchar-structural-validators.test.ts` (modify)
- `tools/validators/tests/structural/story-kernel-cast-bind-list-integrity.test.ts` (modify)
- `tools/validators/tests/integration/spec34-integration.test.ts` (modify)
- `tools/validators/tests/integration/spec57-stchar-pipeline-integration.test.ts` (modify)
- `tools/world-mcp/src/context-packet/shared.ts` (modify)
- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (modify)
- `tools/world-mcp/src/cli/compute-stchar-hashes.ts` (modify)
- `tools/world-mcp/tests/cli/compute-stchar-hashes.test.ts` (existing proof, unchanged)
- `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` (modify)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (modify)
- `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify)
- `.claude/skills/story-character-profile/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify)
- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md` (modify, live-corpus restamp only)
- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-2.md` (modify, live-corpus restamp only)
- `worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-1.yaml` (modify, live-corpus restamp only)

## Out of Scope

- Directly editing or silently migrating existing `story-characters/STCHAR-*.md` frontmatter to remove legacy `page_packet_hash`; that needs an approved engine-supported migration/supersession path.
- Rewriting STCHAR body prose or filling `source_operational_fact_map`.
- Fixing DA `claim_map` canon-status/cf-id failures.
- Changing the `computeStcharPagePacketHash()` hashing algorithm.
- Making §16a packets optional for qualifying page-local characters.
- Weakening profile/voice hash checks.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test`
2. Focused `tools/world-mcp` context/CLI tests affected by this ticket after rebuild.
3. `cd tools/world-mcp && npm test`
4. `node tools/world-index/dist/src/cli.js build erotica-world`
5. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny` as a post-change live-corpus probe; remaining STCHAR legacy-frontmatter schema failures are a deviation owned by a follow-up migration path.

### Invariants

1. A single active STCHAR may appear on multiple pages with different page-specific §16a packet projections, and each page may have its own valid `page_packet_hash`.
2. STCHAR frontmatter carries only STCHAR-global hash authority: `profile_hash` and `voice_block_hash`.
3. A page-plan §16a packet still fails when its `page_packet_hash` declaration does not match the canonical non-self-referential hash of that exact packet text.
4. A prose receipt still fails when it records STCHAR profile/voice hashes or page-local packet hashes that disagree with the page plan or STCHAR record.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` — add a two-page/same-STCHAR fixture proving distinct page packets pass independently.
2. `tools/validators/tests/structural/prose-receipt-stchar-integrity.test.ts` — update page-packet comparisons to page-plan-local expected/observed semantics.
3. `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` — remove `page_packet_hash` from required STCHAR schema expectations and keep it in prose receipt expectations.
4. `tools/validators/tests/structural/record-schema-compliance-story-character-authority.test.ts` and `tools/validators/tests/structural/stchar-body-integrity.test.ts` — remove STCHAR-global `page_packet_hash` expectations.
5. `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` — remove `page_packet_hash` from active STCHAR inventory expectations.
6. `tools/world-mcp/tests/cli/compute-stchar-hashes.test.ts` — existing page-packet helper coverage stayed current and was rerun unchanged while CLI wording moved away from STCHAR frontmatter authority.

### Commands

1. `cd tools/validators && npm test`
2. `cd tools/world-mcp && npm run build`
3. `cd tools/world-mcp && node --test dist/tests/context-packet/story-bundle-context.test.js dist/tests/cli/compute-stchar-hashes.test.js dist/tests/tools/validate-patch-plan.test.js`
4. `cd tools/world-mcp && npm test`
5. `node tools/world-index/dist/src/cli.js build erotica-world`
6. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny`

## Outcome

Completed the shared STCHAR/page-packet contract correction.

- Removed STCHAR-global `page_packet_hash` from the STCHAR JSON Schema, STCHAR body-integrity checks, context-packet `active_story_characters`, schema/fixture tests, and active story-pipeline skill prose.
- Kept `profile_hash` and `voice_block_hash` as STCHAR frontmatter authority and changed `page_packet_hash` validation to be page-local: page plans compare the §16a declaration to the canonical recompute for that exact packet, and prose receipts compare profile/voice to STCHAR while comparing page-packet expected/observed to page-plan declaration/recompute.
- Restamped `red-bunny` PG-1 and PG-2 §16a `page_packet_hash` declarations and the PG-1 prose receipt to the corrected page-local values.
- Left existing `red-bunny` `story-characters/STCHAR-*.md` frontmatter untouched; removing legacy frontmatter fields from existing hybrid STCHAR records needs an approved engine-supported migration/supersession path.

## Verification Result

1. `cd tools/validators && npm test` — PASS, 901 tests.
2. `cd tools/world-mcp && npm run build` — PASS.
3. `cd tools/world-mcp && node --test dist/tests/context-packet/story-bundle-context.test.js dist/tests/cli/compute-stchar-hashes.test.js dist/tests/tools/validate-patch-plan.test.js` — PASS, 16 tests.
4. Post-review rerun: `cd tools/world-mcp && npm test` — PASS, 429 tests.
5. `node tools/world-index/dist/src/cli.js build erotica-world` — PASS.
6. Page-local hash recompute probe over `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md` and `PG-2.md` — PASS, `page_packet_hash_mismatches=0`.
7. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny` — expected nonzero deviation: 87 validators run, 5 skipped; 63 fail, 12 warn, 3 info. The former page-packet hash mismatch is gone; remaining failures are DA `claim_map[].cf_id` type/conditional failures and legacy STCHAR frontmatter `additionalProperties` on STCHAR-1/2/3, plus existing STCHAR body/source-map warnings.

## Deviations

- The drafted clean live-corpus acceptance was narrowed. The corrected package contract makes legacy `STCHAR.page_packet_hash` frontmatter invalid, but this run did not direct-edit existing STCHAR hybrid records because the current engine surface does not expose a simple remove-field operation for existing story-character hybrid frontmatter. Follow-up `tickets/VALSTCHAR-002-remove-legacy-stchar-page-packet-frontmatter.md` owns removing legacy `page_packet_hash` from existing STCHAR records through an approved engine route.
- `tools/world-mcp/tests/cli/compute-stchar-hashes.test.ts` remained behavior-current without source changes; the implementation changed the CLI help text and retained the existing page-packet hash tests.
