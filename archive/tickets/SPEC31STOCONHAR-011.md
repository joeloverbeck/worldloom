# SPEC31STOCONHAR-011: Clarify `mystery_resolution` source-record mapping

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/story-fact-promotion-to-canon/SKILL.md`, `tools/validators/src/structural/proposal-package-shape.ts`, `tools/validators/tests/structural/proposal-package-shape.test.ts`
**Deps**: `archive/tickets/SPEC31STOCONHAR-006.md`

## Problem

At intake, `story-fact-promotion-to-canon/SKILL.md:113` muddled "governing firewall load" (M) with "source record" (SF/BEL) in the mystery_resolution row of the source-kind mapping table. Contract `.claude/skills/_shared-templates/story-state-contract.md:236` is clean: `promotion_claims[].source_record` enum is `SF | BEL`. The user-supplied `source_record_ids` parameter for `mystery_resolution` should take SF/BEL — the governing M record is loaded by the skill from world context, not user-supplied as a source record. Additionally, the YAML at `:256` was malformed: `mysteries_scanned: <count of M-<integer> records loaded` was missing a closing brace/quote.

## Assumption Reassessment (2026-05-15)

1. **Codebase symbols verified**: skill `:113,:146,:256` confirmed; contract `:236` `promotion_claims[].source_record` enum is `SF | BEL`.
2. **Spec assumptions verified**: `specs/SPEC-31-story-contract-hardening-iii.md` §D11 specifies the clarification.
3. **Cross-skill / cross-artifact boundary under audit**: promotion skill source-kind mapping ↔ proposal package validator (`proposal_package_shape.ts` created in 006). This ticket extends 006's validator with a `mystery_resolution`-specific check.
4. **FOUNDATIONS principle under audit (restated)**: Rule 7 (Preserve Mystery Deliberately) — `M` records are governing firewall load, not branch evidence; promoting a mystery requires SF/BEL evidence from the branch, not the M itself.
5. **Package command corrected**: the repo has no root pnpm workspace; validator proof uses package-local `npm run build`, `node --test dist/tests/structural/proposal-package-shape.test.js`, and `npm test` from `tools/validators`.
6. **Skill dry-run substitute**: no executable `.claude/skills` dry-run harness exists in this repo. The skill contract was verified by direct text review and grep for the pre-flight abort wording, the SF/BEL mapping, and the well-formed YAML line.

## Architecture Check

1. **Cleaner than alternative**: keeping the existing `source_record_ids` parameter name and clarifying the mapping prose preserves the user-facing input shape; renaming would be a breaking change.
2. **No backwards-compatibility shims**: documentation-level fix; pre-existing promotion shape unchanged.

## Verification Layers

1. **Skill `source_record_ids` input rejects M-id for mystery_resolution** → manual contract review and grep proof confirm the pre-flight rejects non-SF/BEL `source_record_ids` for `mystery_resolution` with `source_kind_record_class_mismatch`.
2. **Validator rejects proposal package with M in proposal_evidence.source_records** → schema validation (extends 006's validator with `mystery_resolution_source_record_misclass`).
3. **Phase 4 YAML is well-formed** → codebase grep-proof (no malformed YAML at `:256`).

## Landed Changes

### 1. Promotion skill `story-fact-promotion-to-canon/SKILL.md` Inputs `:113`

Replaced the `mystery_resolution` row with:
```
| `mystery_resolution` | `SF-<integer>` or `BEL-<integer>` that states the apparent, held, or candidate resolution | resolving `SE`, pre-resolution BEL chain, relevant `PG.state_snapshot.unresolved_mystery_claims[].evidence_records[]` | Required | M records are governing firewall load (auto-loaded from world context; not user-supplied as source_record_ids) |
```

### 2. Pre-flight (`:146` area)

When `source_kind == mystery_resolution`, verify each `source_record_ids` entry is `SF-<integer>` or `BEL-<integer>` (not `M-<integer>`); abort with `source_kind_record_class_mismatch` if violated.

### 3. Phase 4 (`:243-256` area)

Explicitly note that M records are loaded by the skill from world canon context (whole-class Mystery Reserve seeded into the context packet); they are NOT user-supplied via `source_record_ids`.

Fix the malformed YAML at `:256`:
```yaml
mysteries_scanned: <count of M-<integer> records loaded>
```

### 4. Validator extension (`tools/validators/src/structural/proposal-package-shape.ts` created by `archive/tickets/SPEC31STOCONHAR-006.md`)

Added a check: when `source_kind == mystery_resolution`, every `source_record` in `proposal_evidence.source_records[]` is `SF` or `BEL`, not `M`. The validator emits `mystery_resolution_source_record_misclass` (severity: fail) on violation.

## Files to Touch

- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify — `:113`, `:146`, `:256`)
- `tools/validators/src/structural/proposal-package-shape.ts` (modify — extend the rule created in 006)
- `tools/validators/tests/structural/proposal-package-shape.test.ts` (modify — new fixtures)
- `specs/SPEC-31-story-contract-hardening-iii.md` (modify — D11 implementation note)

## Out of Scope

- Renaming `source_record_ids` parameter — explicitly avoided.
- Other source-kind rows — only `mystery_resolution` row changed; the rest remain.

## Acceptance Criteria

### Tests That Must Pass

1. Validator test: proposal package with `source_kind: mystery_resolution` and `source_records: [SF-4]` → PASS.
2. Validator test: same with `source_records: [M-3]` → `mystery_resolution_source_record_misclass` FAIL.
3. Skill contract review: `story-fact-promotion-to-canon` pre-flight text rejects `source_kind: mystery_resolution` with non-SF/BEL `source_record_ids`, including `M-<integer>`, via `source_kind_record_class_mismatch`.

### Invariants

1. `M` records are never user-supplied as `source_record_ids` for `mystery_resolution`.
2. Phase 4 YAML in the skill prose is well-formed.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/proposal-package-shape.test.ts` — extend with `mystery_resolution` cases (SF/BEL PASS, M FAIL).

### Commands

1. `npm run build` from `tools/validators` → green.
2. `node --test dist/tests/structural/proposal-package-shape.test.js` from `tools/validators` → green (6/6).
3. `npm test` from `tools/validators` → green (269/269).
4. `grep -n "mysteries_scanned" .claude/skills/story-fact-promotion-to-canon/SKILL.md` → match shows well-formed YAML post-edit.

## Outcome

- Promotion skill inputs and source-kind mapping now define `mystery_resolution` source records as `SF-<integer>` or `BEL-<integer>`.
- The same skill's pre-flight now rejects `M-<integer>` as a user-supplied `source_record_ids` entry for `mystery_resolution` and names `source_kind_record_class_mismatch`.
- Phase 4 now states that Mystery Reserve `M` records are whole-class governing firewall context loaded from world canon, not branch evidence supplied through `source_record_ids`.
- The malformed `mysteries_scanned` YAML placeholder is fixed.
- `proposal_package_shape` now fails `mystery_resolution` proposal packages whose `proposal_evidence.source_records[]` contains `M-*` or any non-SF/BEL value.
- Structural tests cover SF/BEL acceptance and M rejection.

## Verification Result

Completed on 2026-05-15:

- `npm run build` (`tools/validators`) passed.
- `node --test dist/tests/structural/proposal-package-shape.test.js` (`tools/validators`) passed: 6 tests, 6 pass.
- `npm test` (`tools/validators`) passed: 269 tests, 269 pass.
- `rg -n 'source_record_ids.*M-3|\[M-3\] for mystery_resolution|M-<integer> for Mystery Reserve audit' .claude/skills/story-fact-promotion-to-canon/SKILL.md` returned no matches.
- `rg -n 'mysteries_scanned|source_kind_record_class_mismatch|mystery_resolution_source_record_misclass|M records are governing firewall|governing firewall context' ...` confirmed the live skill and validator contain the landed contract.

## Deviations

- Replaced the drafted pnpm command with package-local npm proof because this repo has no root validators workspace.
- Replaced the drafted skill dry-run with manual contract review plus grep proof because `.claude/skills` workflows are not executable tests in this checkout.
- Also corrected the `source_record_ids` argument description because it contained the same stale `[M-3] for mystery_resolution` example.
