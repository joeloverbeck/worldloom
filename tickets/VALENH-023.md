# VALENH-023: Structural validator for §4.6 prose-receipt YAML

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — adds `tools/validators/src/schemas/prose-receipt.schema.json` (new JSON schema mirroring shared contract §4.6); adds `tools/validators/src/structural/prose-receipt-schema-compliance.ts` (new structural rule); registers the rule in `tools/validators/src/public/registry.ts`; adds `tools/validators/tests/structural/prose-receipt-schema-compliance.test.ts`.
**Deps**: `archive/tickets/SCAUD-001-apply-audit-verdicts-to-story-state-contract.md` (renumbered the receipt to §4.6 and added `prose_receipt_path` to the PG schema), `archive/tickets/SCAUD-003-tighten-json-validator-schemas.md` (tightened the PG schema's `prose_receipt_path` regex constraint; this ticket complements that PG-side path constraint with content-side validation of the file the path points to)

## Problem

`branching-story-prose-attach` writes a `pages-prose-receipts/PG-<integer>.yaml` deliverable as a direct-write artifact (not an atomic `_source/` record) at its Phase 6 step 4b after HARD-GATE approval. The receipt's structure is canonically defined at `.claude/skills/_shared-templates/story-state-contract.md` §4.6 — required top-level fields (`page_id`, `story_id`, `plan_path`, `prose_path`, `plan_hash`, `prose_hash`, `state_hash_at_plan_time`, `checked_at`, `strict`, `verdict`, `checks`, `notes`, `repair_recommendation`), the eight-key `checks` sub-map with per-check enums (`PASS | WARN | FAIL` and `PASS | FAIL` variants per check), the `verdict` enum (`PASS | WARN | FAIL`), the `repair_recommendation` enum (`none | revise_prose | run_turn_cycle_repair | run_story_fact_promotion_to_canon`), and the `craft_critic` enum extension (`PASS | WARN | FAIL | NOT_RUN`).

No validator currently enforces this schema. The session this audit was filed in produced a conforming receipt at `worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-1.yaml`, but a single field-name typo (e.g., `repair_recommendations` instead of `repair_recommendation`), a stale enum token (e.g., `revise_plan` instead of `revise_prose`), a missing required check key (e.g., omitting `craft_critic` when it should be `NOT_RUN`), or a non-sha256 `prose_hash` would have landed unchallenged. The prose-attach skill is the sole producer today, but `branching-story-health-audit` mode `prose` and any future receipt-aggregating workflow will consume these files structurally; drift between skill-emitted YAML and §4.6 will compound silently in proportion to receipt volume.

## Assumption Reassessment (2026-05-17)

1. Codebase reassessment: `grep -rniE 'prose[ _-]?receipt|pages-prose-receipts' tools/validators/src/` returned zero matches at HEAD; `ls tools/validators/src/schemas/` enumerates 28 schemas (canon-fact-record, change-log-entry, character-frontmatter, diegetic-artifact-frontmatter, entity, invariant, mystery-reserve, open-question, section, story-belief, story-branch, story-choice, story-consequence, story-diegetic-artifact, story-entity, story-event, story-fact, story-intention, story-location, story-object, story-obligation, story-page, story-relationship, story-status, story-storylet, story-thread, adjudication-frontmatter, plus `_shared`) — none for prose receipts. The validator framework's discovery surface in `tools/validators/src/structural/record-schema-compliance.ts:232` iterates `RECORD_TYPE_TO_SCHEMA` and is scoped to `_source/<class>/*.yaml`; receipts at `pages-prose-receipts/PG-*.yaml` fall outside that enumeration. New structural rules register in `tools/validators/src/public/registry.ts:14-39` via the pattern at `recordSchemaCompliance: Validator` exported from each structural module.
2. Doc reassessment: shared contract §4.6 (`grep -n '### 4.6 Prose receipt' .claude/skills/_shared-templates/story-state-contract.md` → line 677) carries the canonical receipt schema definition; the preamble at line 64 lists it as "the prose receipt direct-write artifact" — the contract-side schema exists in markdown form but is not enforced by any validator. The prose-attach SKILL.md Guardrails section claims "The shared contract §4.6 receipt schema is already in place"; this is true at the *contract-definition* layer and false at the *validator-enforcement* layer. SCAUD-001's Outcome confirms it renumbered the receipt to §4.6 and added `prose_receipt_path` to the PG schema (PG-side path constraint), and SCAUD-003's Outcome confirms it tightened `prose_receipt_path` to a regex (path-shape constraint); neither addressed the receipt-content schema gap.
3. Shared boundary: this is a cross-artifact ticket spanning (a) `.claude/skills/_shared-templates/story-state-contract.md` §4.6 (canonical schema definition — the source of truth the new JSON schema mirrors), (b) `tools/validators/src/schemas/` (the validator-side schema catalog this ticket extends), (c) `tools/validators/src/structural/` (the validator rule catalog this ticket extends), (d) `tools/validators/src/public/registry.ts` (the rule-registration surface), and (e) `.claude/skills/branching-story-prose-attach/SKILL.md` Phase 6 (the producer whose output the new validator covers). The contract is the source-of-truth surface; the validator schema is the derivative-but-machine-enforced surface; drift between them is the failure mode the new rule is designed to detect.
4. **FOUNDATIONS principle restatement.** FOUNDATIONS §Tooling Recommendation requires structural backstops for prose-attach's deterministic checks, of which the receipt is the audit-trail artifact. Rule 7 (Preserve Mystery Deliberately) is enforced at prose-attach Phase 3 check 3 (`forbidden_mystery_resolution: PASS | FAIL`); without schema enforcement on the receipt, a future skill modification that silently broadens the `forbidden_mystery_resolution` enum to include a `WARN` value (or renames it altogether) would not be caught by any structural surface — only by a downstream consumer's parse error. This ticket structurally backstops that enum boundary alongside the other per-check enums. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism) governs: the new JSON schema must mirror §4.6 exactly, no additional fields beyond what the contract names — extras invite contract bloat that the schema-minimalism doctrine forbids.
5. **Adjacent contradictions surfaced during reassessment**: the target skill's Guardrails sentence "The shared contract §4.6 receipt schema is already in place" is ambiguous and may be misread as a claim of validator coverage when only the contract-side definition exists. This is a separate skill-prose-drift bug uncovered during reassessment; it must become its own follow-up via `/skill-audit .claude/skills/branching-story-prose-attach` (routing-path-a per `/mcp-integration-audit` Phase 8 convention) — NOT a required consequence of this ticket. A second adjacent finding: shared contract §4.2a's canonical-CLI mandate enumerates only "branching-story-bootstrap Phase 7 hash steps, branching-story-turn-cycle Phase 9" — it does not extend to PG-verifying skills like prose-attach, whose state_hash recomputation also requires the canonical-JSON serializer. This is a docs-drift on the shared contract itself, addressable by direct edit (routing-path-b); not a required consequence of this ticket.

## Architecture Check

1. The proposed approach (a dedicated `prose_receipt_schema_compliance` structural rule that discovers files via glob at `pages-prose-receipts/PG-*.yaml` per world bundle and validates each against a new `prose-receipt.schema.json`) is cleaner than the alternatives: extending `record_schema_compliance` with prose-receipt cases would tangle two enumeration surfaces (the `_source/` `RECORD_TYPE_TO_SCHEMA` map at `record-schema-compliance.ts:232` and a new non-`_source/` glob discovery), violating the discovery-surface boundary; pushing receipt validation into the prose-attach skill itself would lose the structural-backstop property that JSON-Schema-driven validators provide (skill-internal validation is a workflow assertion, not a pipeline gate).
2. No backwards-compatibility shims introduced. The new schema mirrors §4.6 strictly; the new structural rule registers alongside the existing 21 rules without superseding any. Existing receipts conforming to §4.6 PASS without modification; the only behavior change is detection of NEW drift, which is the ticket's purpose.

## Verification Layers

1. **Schema-content fidelity to §4.6** → codebase grep-proof: `grep -nE '"required":|"enum":' tools/validators/src/schemas/prose-receipt.schema.json` must enumerate the §4.6 required-field set and the per-check / verdict / repair_recommendation enums exactly as §4.6 specifies. Direct comparison against `.claude/skills/_shared-templates/story-state-contract.md` lines 681-704.
2. **Validator-rule registration** → codebase grep-proof: `grep -n 'proseReceiptSchemaCompliance' tools/validators/src/public/registry.ts` must return both the import line and the registry entry.
3. **Positive-case PASS on the existing red-bunny receipt** → schema validation: `node tools/validators/dist/cli/world-validate.js --world erotica-world --rule prose_receipt_schema_compliance` against the receipt written this session must report zero issues.
4. **Negative-case FAIL on synthetic drift** → schema validation via test fixture: a fixture that flips `repair_recommendation` from `none` to `revise_plan` (typo) must FAIL with the validator's diagnostic naming the offending enum value.
5. **Contract-to-schema parity** → manual review: a side-by-side reading of `tools/validators/src/schemas/prose-receipt.schema.json` against shared contract §4.6 must confirm zero schema fields beyond what §4.6 names (FOUNDATIONS §Story Bundles §5b schema-minimalism).

## What to Change

### 1. New JSON schema mirroring shared contract §4.6

Create `tools/validators/src/schemas/prose-receipt.schema.json` enforcing:
- All 13 top-level required fields: `page_id`, `story_id`, `plan_path`, `prose_path`, `plan_hash`, `prose_hash`, `state_hash_at_plan_time`, `checked_at`, `strict`, `verdict`, `checks`, `notes`, `repair_recommendation`.
- Pattern constraints: `page_id` matches `^PG-[0-9]+$`; `story_id` matches `^STORY-[0-9]+$`; `plan_hash` / `prose_hash` / `state_hash_at_plan_time` match `^[0-9a-f]{64}$`; `plan_path` matches `^pages-prose-plans/PG-[0-9]+\\.md$`; `prose_path` matches `^pages-prose/PG-[0-9]+\\.md$`; `checked_at` matches an ISO8601 pattern.
- `strict` boolean.
- `verdict` enum: `["PASS", "WARN", "FAIL"]`.
- `checks` object with all eight deterministic-check keys required (`hash_integrity`, `engine_jargon_leak`, `forbidden_mystery_resolution`, `required_event_rendered`, `choice_consequence_visibility`, `entity_status_consistency`, `invented_structural_fact`, `canon_claim_without_authority`) plus `craft_critic`; per-check enums: `hash_integrity` / `engine_jargon_leak` / `required_event_rendered` / `choice_consequence_visibility` / `entity_status_consistency` / `invented_structural_fact` accept `["PASS", "WARN", "FAIL"]`; `forbidden_mystery_resolution` / `canon_claim_without_authority` accept `["PASS", "FAIL"]`; `craft_critic` accepts `["PASS", "WARN", "FAIL", "NOT_RUN"]`.
- `notes` array of strings.
- `repair_recommendation` enum: `["none", "revise_prose", "run_turn_cycle_repair", "run_story_fact_promotion_to_canon"]`.
- `additionalProperties: false` at the top level and within `checks` (schema-minimalism — extras invite contract bloat).

### 2. New structural rule with glob-based file discovery

Create `tools/validators/src/structural/prose-receipt-schema-compliance.ts`:
- Export `proseReceiptSchemaCompliance: Validator` following the pattern of `recordSchemaCompliance` at `tools/validators/src/structural/record-schema-compliance.ts:69`.
- Validator name: `"prose_receipt_schema_compliance"`.
- Discovery surface: glob `worlds/<world-slug>/stories/<story-slug>/pages-prose-receipts/PG-*.yaml` for every story bundle in scope; this surface is distinct from the `_source/` `RECORD_TYPE_TO_SCHEMA` enumeration to preserve the existing discovery-surface boundary.
- Parse each YAML; validate against `prose-receipt.schema.json` via the existing AJV harness (`tools/validators/src/structural/utils.ts` provides the common validator helpers).
- Emit issues keyed `prose_receipt_schema_compliance.<error.keyword>` per the existing per-keyword convention at `record-schema-compliance.ts:117`.

### 3. Register the new rule in the validator framework

Modify `tools/validators/src/public/registry.ts`:
- Add `import { proseReceiptSchemaCompliance } from "../structural/prose-receipt-schema-compliance.js";` alongside the existing imports at lines 14-39.
- Add `proseReceiptSchemaCompliance` to the registry export list, preserving the existing ordering convention.

### 4. New structural test

Create `tools/validators/tests/structural/prose-receipt-schema-compliance.test.ts` following the pattern of `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts`:
- A `validReceiptPayload()` helper returning a §4.6-conforming object.
- Tests: (a) valid payload PASSes; (b) missing required field FAILs with `prose_receipt_schema_compliance.required`; (c) stale `repair_recommendation` token (e.g., `revise_plan`) FAILs with `prose_receipt_schema_compliance.enum`; (d) non-sha256 `prose_hash` FAILs with `prose_receipt_schema_compliance.pattern`; (e) extra top-level field FAILs with `prose_receipt_schema_compliance.additionalProperties`.

## Files to Touch

- `tools/validators/src/schemas/prose-receipt.schema.json` (new)
- `tools/validators/src/structural/prose-receipt-schema-compliance.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — import + registry entry)
- `tools/validators/tests/structural/prose-receipt-schema-compliance.test.ts` (new)

## Out of Scope

- No edits to `.claude/skills/branching-story-prose-attach/SKILL.md` — the Guardrails sentence ambiguity surfaced at Assumption Reassessment item 5 is a separate skill-prose drift addressable via `/skill-audit .claude/skills/branching-story-prose-attach`, not this ticket.
- No edits to `.claude/skills/_shared-templates/story-state-contract.md` — §4.6 is the canonical source of truth this ticket mirrors; the §4.2a docs-drift surfaced at item 5 is a separate direct-edit recommendation (routing-path-b).
- No extension of `record_schema_compliance` to cover prose receipts — see Architecture Check item 1 (the discovery-surface boundary is preserved by a dedicated rule).
- No prose-attach skill modification to run `world-validate --rule prose_receipt_schema_compliance` after the receipt write — that workflow integration is a separate skill-side ticket if the operator wants the skill to self-check before HARD-GATE step 4c lands.
- No changes to receipt-emitting workflows beyond prose-attach — `branching-story-health-audit` mode `prose` may also touch receipts, but only as a reader; reader-side validation is per-call concern, not in scope here.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run test -- --grep prose-receipt-schema-compliance` — all five test cases (valid PASS, missing-field FAIL, enum FAIL, pattern FAIL, additionalProperties FAIL) pass.
2. `node tools/validators/dist/cli/world-validate.js --world erotica-world --rule prose_receipt_schema_compliance` against the receipt written in the session this ticket was filed (`worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-1.yaml`) reports zero issues — the receipt was authored against §4.6 and must validate as conforming.
3. `cd tools/validators && npm run typecheck && npm run lint && npm test` — full package build / lint / test passes with the new rule in place.

### Invariants

1. The validator's schema contents mirror shared contract §4.6 exactly — no additional fields, no relaxed enums; if §4.6 changes, the schema changes in the same commit (FOUNDATIONS §Story Bundles §5b schema-minimalism).
2. Discovery glob is scoped to `pages-prose-receipts/PG-*.yaml` under story bundles — the `_source/` enumeration surface used by `record_schema_compliance` is not touched (Architecture Check item 1's discovery-surface boundary).
3. The receipt remains a direct-write artifact — this ticket adds detection, not pre-write enforcement; prose-attach's Phase 6 step 4b write path is unchanged.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/prose-receipt-schema-compliance.test.ts` (new) — five cases covering positive PASS and the four documented FAIL modes (missing required field, enum violation, pattern violation, additionalProperties violation).

### Commands

1. `cd tools/validators && npm run test -- --grep prose-receipt-schema-compliance` — targeted test run.
2. `cd tools/validators && npm run typecheck && npm run lint && npm test` — full-package verification.
3. `node tools/validators/dist/cli/world-validate.js --world erotica-world --rule prose_receipt_schema_compliance` — end-to-end CLI verification against the existing red-bunny receipt.
