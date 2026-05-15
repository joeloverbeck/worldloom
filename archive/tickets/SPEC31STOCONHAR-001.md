# SPEC31STOCONHAR-001: Delete `PG.prose_path` and `PG.prose_receipt_path`

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/validators/src/schemas/story-page.schema.json`, `tools/world-mcp/src/cli/compute-pg-hashes.ts`, `tools/world-index/src/hash/content.ts`, `tools/patch-engine/src/ops/update-record-field.ts`, `.claude/skills/_shared-templates/story-state-contract.md`, `.claude/skills/branching-story-bootstrap/SKILL.md`, `.claude/skills/branching-story-turn-cycle/SKILL.md`, `.claude/skills/branching-story-prose-attach/SKILL.md`, `.claude/skills/branching-story-health-audit/SKILL.md`, package tests under `tools/{validators,world-index,world-mcp,patch-engine}/tests/`
**Deps**: `archive/specs/SPEC-31-story-contract-hardening-iii.md`

## Problem

At intake, `PG.prose_path` and `PG.prose_receipt_path` were documented at `.claude/skills/_shared-templates/story-state-contract.md` §4.2 as "informational publication receipts" but `branching-story-bootstrap/SKILL.md` and `branching-story-turn-cycle/SKILL.md` both committed PG records with these fields set to `null`, and `branching-story-prose-attach/SKILL.md` declares it "never mutate[s] the page record." So once a PG committed with both fields null, they remained null forever — even after `pages-prose/PG-<integer>.md` and `pages-prose-receipts/PG-<integer>.yaml` existed on disk.

Two downstream consumer surfaces silently broke on this stale-null state:
1. `branching-story-health-audit/SKILL.md` keyed `missing_prose_file` and `missing_prose_receipt` findings off `PG.prose_path`. Both checks silently passed even after prose landed.
2. `branching-story-turn-cycle/SKILL.md` (`accept_parent_unrendered: false` mode) read `parent.prose_path` and aborted when null — even when prose WAS rendered.

At intake, the hash payload already excluded both fields, so fork-replay safety was intact. Removing the fields and replacing the two consumer checks with deterministic filesystem stats closed the lifecycle lie.

## Assumption Reassessment (2026-05-15)

1. **Codebase symbols verified**: `tools/validators/src/schemas/story-page.schema.json:163,168` confirmed both fields present in PG schema. `tools/world-mcp/src/cli/compute-pg-hashes.ts` and `tools/world-index/src/hash/content.ts:44,63,71,74` confirmed `canonicalJsonStringify` / `computePgStateHash` / `computePlanHash` exports as the hash helpers the skills reference. `branching-story-bootstrap/SKILL.md:313`, `branching-story-turn-cycle/SKILL.md:373,162`, `branching-story-prose-attach/SKILL.md:31,150`, `branching-story-health-audit/SKILL.md:250-251` all verified at quoted lines.
2. **Spec assumptions verified**: `archive/specs/SPEC-31-story-contract-hardening-iii.md` §Deliverable D1 + §Verification §Phase 1 + §Migration impact at D1's end (test-fixture hash recomputation) are the authoritative scope. No discrepancies with the codebase.
3. **Cross-skill / cross-artifact boundary under audit**: the PG-record schema (`story-page.schema.json` + contract §4.2/§4.2a) is the shared boundary; four story-pipeline skills (bootstrap / turn-cycle / prose-attach / health-audit) plus two tooling modules (`compute-pg-hashes.ts` + `content.ts`) plus the validator (`record-schema-compliance.ts`) all consume it. The retcon eliminates two fields from the schema and removes their two consumer-side checks; nothing else on the schema changes.
4. **FOUNDATIONS principle under audit (restated)**: §Story Bundles §5b (Schema-Minimalism — "every field in every story-bundle record schema must be load-bearing") motivates this ticket. The two fields are currently NOT load-bearing — they exist but are written as `null` and never updated, so the two consumer checks (`missing_prose_file`, `accept_parent_unrendered: false`) actually read stale state. Deletion restores the §5b invariant. Distinct from FOUNDATIONS Rule 5 (No Consequence Evasion); the spec's §FOUNDATIONS Alignment table mislabeled this as "Rule 5" — corrected here.
5. **HARD-GATE / canon-write impact**: none. PG records are story-bundle scope (Hook 3 blocks raw writes to `worlds/<slug>/stories/<slug>/_source/`); this ticket modifies the schema definition but does not weaken any write-time enforcement. Mystery Reserve firewall is unaffected.
6. **Schema extension impact**: this is a schema *contraction* (additive-inverse), not extension. Consumers are the four named skills + hash helpers + validator; all are updated in this ticket. No production story bundles exist anywhere in `worlds/<slug>/stories/` to migrate. Test fixtures under `tools/validators/tests/fixtures/` carrying these fields must have them stripped and PG hashes recomputed as part of this ticket (per spec §Risks).
7. **Mismatch + correction**: spec §D1 names `tools/world-mcp/src/cli/compute-pg-hashes.ts` correctly; the `.js` dist artifact at `tools/world-mcp/dist/src/cli/compute-pg-hashes.js` is downstream of the `.ts` source and rebuilds automatically — no separate touch needed.
8. **Same-seam fallout corrected**: live tests and helpers outside the initial file list also encoded the retired fields: `tools/validators/tests/structural/contract-schema-roundtrip.test.ts`, `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts`, `tools/world-index/tests/hash/content.test.ts`, `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts`, and `tools/patch-engine/tests/ops/update-record-field.test.ts`. `tools/patch-engine/src/ops/update-record-field.ts` also allowed `update_record_field` to set `PG.prose_path` as a prose-finalize transition. These were required same-seam fallout because otherwise validators, schema discovery, hash proof, and patch-plan repair behavior would still preserve the retired PG field.
9. **Fixture migration corrected**: `rg -n 'prose_path|prose_receipt_path' tools/validators/tests/fixtures` returned no hits at implementation time, so no checked-in fixture hashes needed recomputation. The live proof moved to structural/schema tests and hash/CLI tests.
10. **Skill dry-run substitution**: there is no executable dry-run runner for `.claude/skills/branching-story-*` in this repo. The turn-cycle and health-audit behavior was verified by manual contract review plus stale-anchor grep over the edited skill prose, while schema/hash behavior was verified by package tests.

## Architecture Check

1. **Cleaner than alternative**: the alternative (keep the fields, require prose-attach to update PG on each receipt write) would violate FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary) — rendered prose is explicitly not state; PG is committed at plan-commit and never thereafter. Deletion is the only design that preserves §4a.
2. **No backwards-compatibility shims**: no production stories exist, no migration path needed. Test fixtures are recomputed in-place. The schema rejection (`additionalProperties: false` or explicit field-not-allowed) is the new contract; old fixture format does not coexist.

## Verification Layers

1. **PG schema rejects `prose_path` / `prose_receipt_path` post-deletion** → schema validation (validator test: PG record with `prose_path` → `record_schema_compliance` FAIL).
2. **Hash payload no longer exclusively excludes the fields** → codebase grep-proof (grep `prose_path` in `tools/world-index/src/hash/content.ts` returns 0 hits post-edit; grep `prose_path` in `branching-story-prose-attach/SKILL.md:150` returns 0 hits).
3. **`snapshot_replay_equality` produces correct hashes on the new payload** → schema validation (existing replay test re-runs against fixtures with hashes recomputed; PASS confirms the canonical-JSON serializer no longer references the deleted fields).
4. **Health-audit `missing_prose_file` / `missing_prose_receipt` are specified from filesystem state, not record state** → manual review + stale-anchor grep over `branching-story-health-audit/SKILL.md`.
5. **Turn-cycle `accept_parent_unrendered: false` aborts on filesystem state, not record state** → manual review + stale-anchor grep over `branching-story-turn-cycle/SKILL.md`.
6. **FOUNDATIONS alignment**: §Story Bundles §5b (Schema-Minimalism) — fields without load-bearing consumers are dropped.

## Landed Changes

### 1. Contract (`_shared-templates/story-state-contract.md` §4.2)

- Delete the lines defining `prose_path` and `prose_receipt_path` in the PG schema block (lines 149-150).
- Delete the explanatory paragraph at `:163` referring to these as "informational publication receipts."
- Insert after `validation_trace`:
  ```
  Rendered prose and prose receipts are publication artifacts discovered by
  deterministic paths: `pages-prose/PG-<integer>.md` and
  `pages-prose-receipts/PG-<integer>.yaml`. They are not page-state fields and
  are not included in `PG`. `INDEX.md` may render publication status for human
  navigation; `PG` remains the authoritative fork-state record.
  ```

### 2. Contract §4.2a hash payload

Replace the explicit exclusion list (currently naming `prose_path` and `prose_receipt_path` as excluded) with:
```
The fork-state payload is the complete PG mapping except `state_hash` itself.
Rendered prose and prose receipts are not PG fields and therefore are not hash
inputs.
```

### 3. Schema (`tools/validators/src/schemas/story-page.schema.json`)

- Delete the `prose_path` property definition (line 163-167 area).
- Delete the `prose_receipt_path` property definition (line 168-172 area).
- Ensure the schema's existing `additionalProperties: false` (verify during implementation) causes records carrying these fields to fail validation. If `additionalProperties: false` is not yet set on the PG schema, add it; otherwise the deletion alone is sufficient.

### 4. Validator (`tools/validators/src/structural/record-schema-compliance.ts`)

No rule change. Confirm during implementation that the schema deletion causes `record_schema_compliance` to surface a clear additional-property rejection.

### 5. Tooling (`tools/world-index/src/hash/content.ts`)

In `computePgStateHash` and `canonicalJsonStringify` (lines 44, 63, 71), update the canonical-JSON exclusion list to drop references to `prose_path` and `prose_receipt_path`. The exclusion is unreachable after the fields no longer exist; clean it for clarity.

### 6. CLI (`tools/world-mcp/src/cli/compute-pg-hashes.ts`)

Verify the CLI consumes `computePgStateHash` from `@worldloom/world-index/hash/content` (it should per the skill prose). No direct edit needed if the helper update is the single source of truth; spot-check the CLI's exclusion-comment prose and update if stale.

### 7. Bootstrap skill (`.claude/skills/branching-story-bootstrap/SKILL.md`)

- Delete the `prose_path: null, prose_receipt_path: null` line at `:313` (Phase 6 PG-1 record shape).
- Update Phase 9 hash CLI prose at `:359` to drop references to the two fields from the exclusion comment.

### 8. Turn-cycle skill (`.claude/skills/branching-story-turn-cycle/SKILL.md`)

- Delete the `prose_path: null, prose_receipt_path: null` line at `:373` (new-PG record shape).
- Replace the `accept_parent_unrendered: false` check at `:162` to test filesystem presence at `worlds/<world_slug>/stories/<story_slug>/pages-prose/<parent_page_id>.md` (filesystem stat), not `parent.prose_path`.
- Update the `accept_parent_unrendered` argument description at `:28` accordingly.
- Update the hash CLI prose at `:437` to drop the exclusion-list reference.

### 9. Prose-attach skill (`.claude/skills/branching-story-prose-attach/SKILL.md`)

- Update the hash computation prose at `:150` to drop `prose_path` and `prose_receipt_path` from the exclusion-list description.

### 10. Health-audit skill (`.claude/skills/branching-story-health-audit/SKILL.md`)

- Replace `missing_prose_file` at `:250` with a check that fires when an expected `pages-prose/PG-<integer>.md` is absent for any PG (filesystem stat). Severity: INFO when absent without a forcing signal, WARNING when paired with an outstanding promotion requiring prose evidence.
- Replace `missing_prose_receipt` at `:251` to fire when `pages-prose/PG-<integer>.md` exists but `pages-prose-receipts/PG-<integer>.yaml` is absent (filesystem stat).

### 11. Test fixtures

No checked-in PG fixtures under `tools/validators/tests/fixtures/` carried `prose_path` or `prose_receipt_path` at implementation time, so there were no fixture hashes to recompute. The validator suite passed against structural tests that now cover the retired fields explicitly.

### 12. Same-seam tests and patch-engine guard

- Update schema roundtrip and PG schema-compliance tests to remove the retired fields from valid PG payloads and add explicit additional-property rejection coverage for `prose_path` / `prose_receipt_path`.
- Update world-index hash and world-mcp compute CLI tests so the canonical PG payload excludes only `state_hash`.
- Remove patch-engine's prose-finalize exception for setting `PG.prose_path`; rendered prose is now a deterministic direct artifact, not a PG field.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §4.2 + §4.2a)
- `tools/validators/src/schemas/story-page.schema.json` (modify)
- `tools/validators/src/structural/record-schema-compliance.ts` (verify; no rule change)
- `tools/world-index/src/hash/content.ts` (modify — exclusion list)
- `tools/world-mcp/src/cli/compute-pg-hashes.ts` (verify; spot-check comment)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — `:313`, `:359`)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — `:28`, `:162`, `:373`, `:437`)
- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify — `:150`)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — `:250-251`)
- `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` (modify — valid PG payload + retired-field rejection)
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify — expected story-page property set)
- `tools/world-index/tests/hash/content.test.ts` (modify — hash exclusion contract)
- `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` (modify — CLI hash fixture)
- `tools/patch-engine/src/ops/update-record-field.ts` (modify — remove `PG.prose_path` prose-finalize exception)
- `tools/patch-engine/tests/ops/update-record-field.test.ts` (modify — remove `PG.prose_path` mutation fixture)
- `tools/validators/tests/fixtures/**/*.yaml` (verified — no matching fields present at implementation time)

## Out of Scope

- INDEX.md prose-status rendering — out of scope; INDEX is a human-navigation surface and not part of this lifecycle fix.
- Any new validator rule beyond confirming the existing `record_schema_compliance` rejection path — D2 (audit-only SE) and D7 (parseable tags) introduce their own validators in separate tickets.
- Story-bundle records other than PG — not touched.

## Acceptance Criteria

### Tests That Must Pass

1. `npm test` from `tools/validators/` passes; includes PG additional-property rejection and snapshot replay coverage.
2. `npm run build && npm test` from `tools/world-index/` passes after rebuilding `dist/`.
3. `npm test` from `tools/patch-engine/` passes; confirms `PG.prose_path` is no longer a prose-finalize mutation path.
4. `node --test dist/tests/cli/compute-pg-hashes.test.js dist/tests/tools/get-record-schema.test.js` from `tools/world-mcp/` passes after `npm test` built the package; proves the changed CLI and schema-discovery surfaces. The broad `tools/world-mcp npm test` lane is not claimed green because one unrelated local fixture test returned `index_version_mismatch` for `erotica-world`.
5. Manual contract review verifies bootstrap, turn-cycle, prose-attach, and health-audit skill prose no longer treats rendered prose or prose receipts as PG fields.

### Invariants

1. PG schema's effective `additionalProperties: false` (or explicit field rejection) rejects any PG record carrying `prose_path` or `prose_receipt_path`.
2. `computePgStateHash(pgRecord)` excludes only `state_hash`; retired fields are not named in the hash module post-edit.
3. No current PG-authoring or PG-consuming skill prose under `.claude/skills/branching-story-*/` references `PG.prose_path` or `PG.prose_receipt_path` post-edit. Remaining `prose_path` hits are limited to the separate prose receipt artifact schema/output.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` — valid PG no longer carries retired fields; PG with `prose_path` or `prose_receipt_path` fails as an additional property.
2. `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` — story-page property inventory no longer lists retired fields.
3. `tools/world-index/tests/hash/content.test.ts` — state hash excludes only `state_hash`; extra fields alter the payload.
4. `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` — CLI fixture computes against a PG draft without retired fields.
5. `tools/patch-engine/tests/ops/update-record-field.test.ts` — prose-finalize transition no longer sets `PG.prose_path`.

### Commands

1. `rg -n 'prose_path|prose_receipt_path' .claude/skills/branching-story-*/SKILL.md .claude/skills/_shared-templates/story-state-contract.md tools/world-index/src/hash tools/world-mcp/src/cli tools/patch-engine/src/ops tools/validators/src/schemas/story-page.schema.json` → only legitimate prose receipt artifact-schema/output hits remain.
2. `rg -n 'prose_path|prose_receipt_path' tools/validators/tests/fixtures` → no matches.
3. `npm test` from `tools/validators/`.
4. `npm run build` and `npm test` from `tools/world-index/`.
5. `npm test` from `tools/patch-engine/`.
6. `node --test dist/tests/cli/compute-pg-hashes.test.js dist/tests/tools/get-record-schema.test.js` from `tools/world-mcp/`.

## Outcome

Completed: 2026-05-15

The PG contract now removes `prose_path` and `prose_receipt_path`; rendered prose and receipt files are documented as deterministic publication artifacts discovered at `pages-prose/PG-<integer>.md` and `pages-prose-receipts/PG-<integer>.yaml`. The JSON Schema rejects retired PG fields through `additionalProperties: false`, hash helpers and CLI prose exclude only `state_hash`, and patch-engine no longer treats `PG.prose_path` as a prose-finalize field.

Bootstrap and turn-cycle no longer emit null retired fields. Turn-cycle's `accept_parent_unrendered: false` policy now checks `pages-prose/<parent_page_id>.md` on disk. Health-audit prose checks now describe filesystem-based missing-prose and missing-receipt checks. Prose-attach recomputes PG state hash by excluding only `state_hash`.

No checked-in validator fixtures under `tools/validators/tests/fixtures/` contained the retired fields, so no fixture hash recomputation was needed.

## Verification Result

1. `npm test` from `tools/patch-engine/` — PASS (75 tests).
2. `npm run build` from `tools/world-index/` — PASS.
3. `npm test` from `tools/world-index/` after rebuild — PASS (82 tests).
4. `npm test` from `tools/validators/` — PASS (242 tests).
5. `node --test dist/tests/cli/compute-pg-hashes.test.js dist/tests/tools/get-record-schema.test.js` from `tools/world-mcp/` — PASS (14 tests).
6. `rg -n 'prose_path|prose_receipt_path' tools/validators/tests/fixtures` — no matches.
7. `rg -n 'prose_path|prose_receipt_path' .claude/skills/branching-story-*/SKILL.md .claude/skills/_shared-templates/story-state-contract.md tools/world-index/src/hash tools/world-mcp/src/cli tools/patch-engine/src/ops tools/validators/src/schemas/story-page.schema.json` — only legitimate prose receipt artifact-schema/output hits remain: `.claude/skills/_shared-templates/story-state-contract.md` §4.6 and `.claude/skills/branching-story-prose-attach/SKILL.md` receipt output.
8. `git diff --check` — PASS.

## Deviations

- The drafted skill dry-run acceptance was replaced with manual contract review plus stale-anchor grep because this repo has no executable runner for `.claude/skills/branching-story-*`.
- The drafted fixture migration was a no-op: `tools/validators/tests/fixtures/` had no `prose_path` / `prose_receipt_path` hits at implementation time.
- The broad `npm test` lane from `tools/world-mcp/` was run after build but not claimed green. It failed one unrelated local context-packet fixture test (`erotica-world character and artifact skill defaults protect governing full bodies`) with `index_version_mismatch` where the test expected `packet_incomplete_required_classes`. The ticket-owned MCP proof (`compute-pg-hashes` + `get-record-schema`) passed.
