# SPEC30STOCONHAR-008: `choice_set_noncollapse` Validator + Turn-Cycle Gate + Audit Replay

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new `rule_choice_set_noncollapse.ts` validator + test, registry, `branching-story-turn-cycle` Phase 7 gate, `branching-story-health-audit` Phase 2 replay
**Deps**: None

## Problem

`branching-story-health-audit/SKILL.md:163` Choice Consequence Integrity catches *individual* cosmetic accepted choices at audit-time replay. The choice menu itself can still collapse: three differently-worded `CHC` records on the same plan that all map to the same SLT, the same record set, and the same `likely_state_pressure`. There is no current gate for choice-set collapse pre-selection — the player picks among rhetorical variants that resolve to identical state changes. This ticket adds the missing gate.

## Assumption Reassessment (2026-05-15)

1. Verified `tools/validators/src/schemas/story-choice.schema.json` includes all four discriminating axes the spec names: `target_or_action_families` (line 23-51), `grounded_in.records` (line 60-68), `associated_commitment_block` (line 53-56), `likely_state_pressure` (line 52). The spec's §Risks "verify this exists during D7 implementation" question is answered: all four axes are first-class fields. No CHC schema edit required.
2. Verified `tools/validators/src/public/registry.ts:35-45` defines `ruleValidators` as a flat array; appending a new validator is the established extension point. The existing entry pattern (e.g., `import { storyletPredicateDslParsability } ... ` then array append) is the model.
3. Verified the existing rhetorical-mark mechanism is page-plan prose, not a schema field — Choice Consequence Integrity at `branching-story-health-audit/SKILL.md:163` reads "the parent page plan did not explicitly mark the choice as rhetorical or expressive". This ticket adopts the same prose convention; no schema field is added.
4. Cross-skill / cross-artifact boundary under audit: the new gate spans (a) a new validator module under `tools/validators/src/rules/`, (b) the validator registry, (c) the turn-cycle Phase 7 page-commit gate, (d) the health-audit Phase 2 replay. Each surface is independent in scope; the validator is the shared core.
5. FOUNDATIONS principle under audit: Rule 5 (No Consequence Evasion) implicit alignment — a collapsed choice set evades consequence-differentiation by definition. The new gate is the structural enforcement of the "accepted choices must be substantively different unless explicitly marked rhetorical" prose. Rule 6 (No Silent Retcons): this ticket adds a new constraint, retconning the page-commit gates. The retcon is cited under §What to Change and §Architecture Check; not silent.
6. HARD-GATE / Mystery Reserve firewall verification: this ticket adds a new fail-severity rule validator and a page-commit gate. It does NOT weaken the MR firewall or any existing canon-safety check; it adds a sibling constraint operating on CHC sets.
7. Schema extension classification: NOT a schema extension. New validator module + registry append; CHC schema unchanged.
8. Existing test directory `tools/validators/tests/rules/` is where the new validator's test file lands (per the established layout: tests live under `tests/`, not co-located).
9. Adjacent contradictions: the audit-time finding code is named `choice_set_collapse_observed` (audit replay) vs. the validator's `choice_set_collapse` (commit-time) to keep the two surfaces distinguishable in audit reports — neither is silently aliased.

## Architecture Check

1. A new rule-validator module is structurally cleaner than overloading an existing validator (e.g., `state_snapshot_integrity`) because the choice-set check operates per CHC group emitted by a single PG and reads from the CHC schema; the existing structural validators check different invariants. Following the established one-validator-per-rule pattern keeps the registry diff trivial and the validator's blast radius minimal.
2. No backwards-compatibility shim: the new validator runs on `create_pg_record` patches (when CHCs are emitted) per `applies_to`. Pre-production bundles have no CHCs to grandfather. The audit-time replay reuses the same logic to flag historical violations (when any historical bundle eventually exists).

## Verification Layers

1. Validator logic → validator unit test: PG with three CHCs differing in `target_or_action_families` → PASS; PG with three CHCs identical on all four axes, none marked rhetorical → `choice_set_collapse`; PG with two CHCs identical, both marked rhetorical → PASS.
2. Registry membership → codebase grep-proof: `grep -n "ruleChoiceSetNoncollapse" tools/validators/src/public/registry.ts` returns the import + array-append.
3. Turn-cycle gate → skill dry-run: turn-cycle Phase 7 page-commit fails with `choice_set_collapse` when the drafted CHC set collapses; succeeds when at least two CHCs differ materially.
4. Audit-time replay → skill dry-run: `branching-story-health-audit` Phase 2 replays each PG's CHC set; historical collapse emits `choice_set_collapse_observed`.
5. FOUNDATIONS alignment check: spec doesn't claim a FOUNDATIONS rule citation explicitly; this ticket leaves FOUNDATIONS prose untouched. Rule 5 alignment is implicit; no Rule 5 prose edit is needed.

## What to Change

### 1. New validator module

Create `tools/validators/src/rules/rule_choice_set_noncollapse.ts`:

- Exports `ruleChoiceSetNoncollapse: Validator` with `name: "choice_set_noncollapse"`, `severity_mode: "fail"`, `applies_to: (ctx: Context) => ctx.patch_plan?.patches.some((patch) => patch.op === "create_pg_record") === true`.
- For any non-terminal page with more than one CHC emitted, verify at least two CHC records differ materially in any of: `target_or_action_families`, `grounded_in.records`, `associated_commitment_block`, or `likely_state_pressure`.
- Rhetorical exemption: if the parent page plan (per `pages-prose-plans/PG-<integer>.md` body content scan, or per a structured marker in `validation_trace` consistent with the existing rhetorical-mark prose convention) explicitly marks ≥2 CHCs as rhetorical, those CHCs are exempt from the materiality requirement among themselves.
- Emit `choice_set_collapse` (severity: error) when collapse detected.
- Emit `choice_set_rhetorical_unmarked` (severity: warning) when ≥2 CHCs are identical on all four axes but neither is marked rhetorical (transitional softer finding alongside the error to ease audit triage).

### 2. Validator test

Create `tools/validators/tests/rules/rule_choice_set_noncollapse.test.ts` with the test matrix:

- (a) three CHCs differing in `target_or_action_families` → PASS.
- (b) three CHCs identical on all four axes, none rhetorical → `choice_set_collapse`.
- (c) two CHCs identical, both marked rhetorical → PASS.
- (d) two CHCs identical, neither marked rhetorical, third differs materially → `choice_set_rhetorical_unmarked` (warning) + overall PASS.
- (e) page with one CHC → PASS (rule doesn't apply).
- (f) terminal page → PASS (rule doesn't apply).

### 3. Registry append

In `tools/validators/src/public/registry.ts`:
- Add `import { ruleChoiceSetNoncollapse } from "../rules/rule_choice_set_noncollapse.js";` at the top alongside the existing rule imports.
- Append `ruleChoiceSetNoncollapse` to the `ruleValidators` array (line 45 area).

### 4. Turn-cycle Phase 7 gate prose

In `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 7 (page-plan / CHC emission), add prose noting the `choice_set_noncollapse` validator runs as part of the page-commit gates; commit fails when `choice_set_collapse` fires. Document the rhetorical-marking convention authors should use when intentionally emitting rhetorical CHC variants.

### 5. Health-audit Phase 2 audit replay

In `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2 (an appropriate sub-section, e.g., adjacent to Phase 2a Replay events), add an audit-time replay that walks committed PGs and emits `choice_set_collapse_observed` for historical violations.

## Files to Touch

- `tools/validators/src/rules/rule_choice_set_noncollapse.ts` (new)
- `tools/validators/tests/rules/rule_choice_set_noncollapse.test.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — import + array append)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — Phase 7 prose adds gate citation + rhetorical-marking convention)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — Phase 2 prose adds audit-time replay finding `choice_set_collapse_observed`)
- `tools/validators/tests/rules/registry.test.ts` (modify — update count assertion to include the new validator if the test asserts an exact count)

## Out of Scope

- Any change to the CHC schema or its four discriminating axes.
- Any new rhetorical-mark schema field (deliberately: prose convention reused).
- A page-plan structured marker for rhetorical CHCs (the prose convention is the existing mechanism; a structured field would be a separate spec).
- Cross-bundle choice-set analysis (per-page within a single bundle only).
- Auto-repair of collapsed choice sets at the validator (the validator emits; remediation lives at the audit's `repair_kind: turn_repair` route).

## Acceptance Criteria

### Tests That Must Pass

1. `npm --prefix tools/validators run build` succeeds.
2. From `tools/validators`, `npm run test` — all validator tests pass including the six new `rule_choice_set_noncollapse` cases and the updated registry-count assertion.
3. `grep -n "ruleChoiceSetNoncollapse" tools/validators/src/public/registry.ts` returns both the import line and the array-append line.
4. `grep -n "choice_set_collapse" .claude/skills/branching-story-turn-cycle/SKILL.md` returns the Phase 7 gate citation.
5. `grep -n "choice_set_collapse_observed" .claude/skills/branching-story-health-audit/SKILL.md` returns the Phase 2 audit-time finding code.

### Invariants

1. A page with ≥2 CHCs cannot land unless ≥2 of them differ materially on any of the four axes OR ≥2 are page-plan-marked rhetorical.
2. The CHC schema is unchanged; the rule is rule-level, not schema-level.
3. Audit-time and commit-time finding codes are distinct (`choice_set_collapse_observed` vs. `choice_set_collapse`) so audit reports preserve provenance.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rules/rule_choice_set_noncollapse.test.ts` — six-case matrix (new file).
2. `tools/validators/tests/rules/registry.test.ts` — update if it asserts exact validator count or membership (extend the array assertion to include `ruleChoiceSetNoncollapse`).

### Commands

1. From `tools/validators`: `npm run test`
2. `grep -nE "choice_set_collapse|choice_set_collapse_observed|ruleChoiceSetNoncollapse" tools/validators/src/ .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md`
3. The full `tools/validators` `test` command is the correct boundary because the new validator + registry append are exercised together by `tests/rules/registry.test.ts`.
