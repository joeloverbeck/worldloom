# SPEC31STOCONHAR-001: Delete `PG.prose_path` and `PG.prose_receipt_path`

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/validators/src/schemas/story-page.schema.json`, `tools/world-mcp/src/cli/compute-pg-hashes.ts`, `tools/world-index/src/hash/content.ts`, `.claude/skills/_shared-templates/story-state-contract.md`, `.claude/skills/branching-story-bootstrap/SKILL.md`, `.claude/skills/branching-story-turn-cycle/SKILL.md`, `.claude/skills/branching-story-prose-attach/SKILL.md`, `.claude/skills/branching-story-health-audit/SKILL.md`, test fixtures under `tools/validators/tests/fixtures/`
**Deps**: `specs/SPEC-31-story-contract-hardening-iii.md`

## Problem

`PG.prose_path` and `PG.prose_receipt_path` are documented at `.claude/skills/_shared-templates/story-state-contract.md:149-150,163` as "informational publication receipts" but `branching-story-bootstrap/SKILL.md:313` and `branching-story-turn-cycle/SKILL.md:373` both commit PG records with these fields set to `null`, and `branching-story-prose-attach/SKILL.md:31` declares it "never mutate[s] the page record." So once a PG commits with both fields null, they remain null forever — even after `pages-prose/PG-<integer>.md` and `pages-prose-receipts/PG-<integer>.yaml` exist on disk.

Two downstream consumer surfaces silently break on this stale-null state:
1. `branching-story-health-audit/SKILL.md:250-251` keys `missing_prose_file` and `missing_prose_receipt` findings off `PG.prose_path`. Both checks silently pass even after prose lands.
2. `branching-story-turn-cycle/SKILL.md:162` (`accept_parent_unrendered: false` mode) reads `parent.prose_path` and aborts when null — even when prose IS rendered.

The hash payload already excludes both fields (`story-state-contract.md:181-182` + prose-attach `:150`), so fork-replay safety is intact. Removing the fields and replacing the two consumer checks with deterministic filesystem stats closes the lifecycle lie.

## Assumption Reassessment (2026-05-15)

1. **Codebase symbols verified**: `tools/validators/src/schemas/story-page.schema.json:163,168` confirmed both fields present in PG schema. `tools/world-mcp/src/cli/compute-pg-hashes.ts` and `tools/world-index/src/hash/content.ts:44,63,71,74` confirmed `canonicalJsonStringify` / `computePgStateHash` / `computePlanHash` exports as the hash helpers the skills reference. `branching-story-bootstrap/SKILL.md:313`, `branching-story-turn-cycle/SKILL.md:373,162`, `branching-story-prose-attach/SKILL.md:31,150`, `branching-story-health-audit/SKILL.md:250-251` all verified at quoted lines.
2. **Spec assumptions verified**: `specs/SPEC-31-story-contract-hardening-iii.md` §Deliverable D1 + §Verification §Phase 1 + §Migration impact at D1's end (test-fixture hash recomputation) are the authoritative scope. No discrepancies with the codebase.
3. **Cross-skill / cross-artifact boundary under audit**: the PG-record schema (`story-page.schema.json` + contract §4.2/§4.2a) is the shared boundary; four story-pipeline skills (bootstrap / turn-cycle / prose-attach / health-audit) plus two tooling modules (`compute-pg-hashes.ts` + `content.ts`) plus the validator (`record-schema-compliance.ts`) all consume it. The retcon eliminates two fields from the schema and removes their two consumer-side checks; nothing else on the schema changes.
4. **FOUNDATIONS principle under audit (restated)**: §Story Bundles §5b (Schema-Minimalism — "every field in every story-bundle record schema must be load-bearing") motivates this ticket. The two fields are currently NOT load-bearing — they exist but are written as `null` and never updated, so the two consumer checks (`missing_prose_file`, `accept_parent_unrendered: false`) actually read stale state. Deletion restores the §5b invariant. Distinct from FOUNDATIONS Rule 5 (No Consequence Evasion); the spec's §FOUNDATIONS Alignment table mislabeled this as "Rule 5" — corrected here.
5. **HARD-GATE / canon-write impact**: none. PG records are story-bundle scope (Hook 3 blocks raw writes to `worlds/<slug>/stories/<slug>/_source/`); this ticket modifies the schema definition but does not weaken any write-time enforcement. Mystery Reserve firewall is unaffected.
6. **Schema extension impact**: this is a schema *contraction* (additive-inverse), not extension. Consumers are the four named skills + hash helpers + validator; all are updated in this ticket. No production story bundles exist anywhere in `worlds/<slug>/stories/` to migrate. Test fixtures under `tools/validators/tests/fixtures/` carrying these fields must have them stripped and PG hashes recomputed as part of this ticket (per spec §Risks).
7. **Mismatch + correction**: spec §D1 names `tools/world-mcp/src/cli/compute-pg-hashes.ts` correctly; the `.js` dist artifact at `tools/world-mcp/dist/src/cli/compute-pg-hashes.js` is downstream of the `.ts` source and rebuilds automatically — no separate touch needed.

## Architecture Check

1. **Cleaner than alternative**: the alternative (keep the fields, require prose-attach to update PG on each receipt write) would violate FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary) — rendered prose is explicitly not state; PG is committed at plan-commit and never thereafter. Deletion is the only design that preserves §4a.
2. **No backwards-compatibility shims**: no production stories exist, no migration path needed. Test fixtures are recomputed in-place. The schema rejection (`additionalProperties: false` or explicit field-not-allowed) is the new contract; old fixture format does not coexist.

## Verification Layers

1. **PG schema rejects `prose_path` / `prose_receipt_path` post-deletion** → schema validation (validator test: PG record with `prose_path` → `record_schema_compliance` FAIL).
2. **Hash payload no longer exclusively excludes the fields** → codebase grep-proof (grep `prose_path` in `tools/world-index/src/hash/content.ts` returns 0 hits post-edit; grep `prose_path` in `branching-story-prose-attach/SKILL.md:150` returns 0 hits).
3. **`snapshot_replay_equality` produces correct hashes on the new payload** → schema validation (existing replay test re-runs against fixtures with hashes recomputed; PASS confirms the canonical-JSON serializer no longer references the deleted fields).
4. **Health-audit `missing_prose_file` / `missing_prose_receipt` fire on filesystem state, not record state** → skill dry-run (audit-test fixture: PG-1 with no `prose_path` field but with `pages-prose/PG-1.md` absent → `missing_prose_file` INFO emitted from filesystem stat).
5. **Turn-cycle `accept_parent_unrendered: false` aborts on filesystem state, not record state** → skill dry-run (turn-cycle test fixture: parent PG without `prose_path` field, `pages-prose/PG-<parent>.md` absent on disk, `accept_parent_unrendered: false` → aborts; same scenario with prose file present → proceeds).
6. **FOUNDATIONS alignment**: §Story Bundles §5b (Schema-Minimalism) — fields without load-bearing consumers are dropped.

## What to Change

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

Recursively strip `prose_path` and `prose_receipt_path` from every PG record in `tools/validators/tests/fixtures/`. Recompute affected PG hashes via `compute-pg-hashes` CLI. Re-run the validator test suite to confirm green.

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
- `tools/validators/tests/fixtures/**/*.yaml` (modify — strip fields, recompute hashes)

## Out of Scope

- INDEX.md prose-status rendering — out of scope; INDEX is a human-navigation surface and not part of this lifecycle fix.
- Any new validator rule beyond confirming the existing `record_schema_compliance` rejection path — D2 (audit-only SE) and D7 (parseable tags) introduce their own validators in separate tickets.
- Story-bundle records other than PG — not touched.

## Acceptance Criteria

### Tests That Must Pass

1. `pnpm --filter @worldloom/validators test -t "record_schema_compliance"` (or equivalent project test runner; confirm against `tools/validators/package.json` at implementation): PG fixture with `prose_path` → FAIL.
2. `pnpm --filter @worldloom/validators test -t "snapshot_replay_equality"`: golden fixtures (re-hashed in this ticket) → PASS.
3. Bootstrap dry-run produces a PG-1 record without the two fields and passes `record_schema_compliance`.
4. Health-audit dry-run on a bundle where `pages-prose/PG-2.md` exists but `pages-prose-receipts/PG-2.yaml` is absent → emits `missing_prose_receipt` (INFO/WARNING per severity rule).
5. Turn-cycle dry-run with `accept_parent_unrendered: false` aborts when `pages-prose/<parent>.md` is absent on disk; succeeds when present.

### Invariants

1. PG schema's effective `additionalProperties: false` (or explicit field rejection) rejects any PG record carrying `prose_path` or `prose_receipt_path`.
2. `canonicalJsonStringify(pgRecord)` does not reference `prose_path` or `prose_receipt_path` for inclusion-or-exclusion logic — both names absent from the hash module post-edit.
3. No skill prose under `.claude/skills/branching-story-*/` references `PG.prose_path` or `PG.prose_receipt_path` post-edit.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance.test.ts` — add fixture: PG with `prose_path` → expect FAIL.
2. `tools/validators/tests/structural/snapshot-replay-equality.test.ts` — recompute golden hashes for any fixtures touched by the field deletion.
3. `tools/validators/tests/fixtures/**/PG-*.yaml` — strip fields from all existing PG fixtures.
4. Bootstrap / turn-cycle / health-audit have no automated test suites; verification is via dry-run command (see Commands).

### Commands

1. `grep -rn "prose_path\|prose_receipt_path" .claude/skills/branching-story-*/SKILL.md .claude/skills/_shared-templates/story-state-contract.md tools/world-index/src/hash/ tools/world-mcp/src/cli/` → expect 0 matches.
2. `grep -n "prose_path\|prose_receipt_path" tools/validators/src/schemas/story-page.schema.json` → expect 0 matches.
3. `pnpm --filter @worldloom/validators test` (full validator pipeline).
4. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan <fixture-plan> --pg <fixture-pg>` on a recomputed fixture → emits valid `{plan_hash, state_hash}` JSON.
