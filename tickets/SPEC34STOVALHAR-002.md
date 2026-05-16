# SPEC34STOVALHAR-002: observer_firewall structural validator (deterministic subset)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new structural validator at `tools/validators/src/structural/observer-firewall.ts`; new test fixture at `tools/validators/tests/structural/observer-firewall.test.ts`; one-line registry append at `tools/validators/src/public/registry.ts`. No impact on existing validators.
**Deps**: None

## Problem

FOUNDATIONS §Story Bundles §6b (Information / Observer Firewall) requires that *"storylet selection, emitted choices, and character actions must not rely on information unavailable to the acting entity."* Story-state contract §7 gate 7 (plan grounding) names the firewall explicitly: *"Observer Firewall also applies here: selected `SLT` actor-bindings, emitted choices, and character actions must rely only on information available to the acting entity or record a valid access route."* Audit `reports/story-related-improvements-seventh-iteration.md` §11.3 line 824 names `observer_firewall_violation` as a deterministic/judgment-assisted test. `branching-story-health-audit` Phase 2d (per `.claude/skills/branching-story-health-audit/SKILL.md:200`) emits `observer_firewall_violation` findings at audit time, but no standalone validator catches violations at `world-validate` time. This ticket fills the deterministic-subset gap; semantic plausibility remains judgment-assisted in health-audit.

## Assumption Reassessment (2026-05-16)

1. `tools/validators/src/structural/` exists with 17 sibling validators after `archive/tickets/SPEC34STOVALHAR-001.md` landed `branch_isolation`; new file `observer-firewall.ts` is additive — no naming collision. Health-audit Phase 2d at `.claude/skills/branching-story-health-audit/SKILL.md:200` already reads `BEL.basis.access_route` and `BEL.basis.access_records` to evaluate observer-firewall violations; this validator uses the same fields per spec §D2 line 126.
2. SPEC-34 §D2 (lines 106-156) is the authoritative spec section; `/reassess-spec` rewrote the D2 logic during this session to (a) drive observer-firewall checks from `SE` records rather than CHCs in isolation (per the §"Where the actor comes from" clause at lines 116; CHC has no `actor` field, SLT.scope has no `actor_role` field), (b) check `BEL.basis.access_records[]` membership for the SF-access route (BEL has no `derived_from` field per contract §4.1), and (c) drop the SLT-precondition actor-access check (SLT preconditions are actor-unbound at schema time).
3. Shared boundary under audit: (i) `tools/validators/src/public/registry.ts` `structuralValidators` array (line 29) — registered via import + array-append matching sibling pattern; (ii) story-state contract schemas at `.claude/skills/_shared-templates/story-state-contract.md` §4.1 (BEL), §4.3 (SE — `actor`, `commitment.alias_bindings`, `event_kind` enum), §4.5.12 (CHC — `grounded_in.records[]`), §4.4 (SLT — `preconditions.hard | soft`, `scope.visibility`); (iii) closed predicate DSL §5 (`belief_record(holder, BEL-<integer>, mode?, confidence_floor?)`).
4. FOUNDATIONS principle motivating this ticket — §Story Bundles §6b (Information / Observer Firewall) + §7 gate 7 (plan grounding — Observer Firewall clause): the deterministic-subset validator enforces the verifiable rule (actor's recorded access route via `BEL.basis.access_records[]`, or public-SE-witness via STSTAT.location matching SE.targets co-located STLOC) without overreaching into semantic territory where validator FAILs would be false positives.
5. Adjacent contradiction noted at reassess-spec time: health-audit Phase 2d's emitted diagnostic is `observer_firewall_violation` (singular) but this ticket's D2 introduces four granular variants (`_actor_lacks_access`, `_no_access_route`, `_private_belief_leak`, `_predicate_holder_mismatch`). Classified as **future cleanup that must become its own ticket** — per SPEC-34 §Risks "Mid-implementation cascade to `branching-story-health-audit`" (line 307), health-audit alignment with the validator's granular codes is a follow-up consideration after D2 lands and stabilizes; NOT in scope for this ticket.
6. Mismatch + correction: spec §Verification item 2 cites `npm run test -- --grep 'observer-firewall'` (Mocha syntax); the actual runner is node:test (`node --test dist/tests/**/*.test.js` per `tools/validators/package.json`). Corrected to direct invocation `node --test dist/tests/structural/observer-firewall.test.js` in this ticket's Verification commands. Mechanical drift; spec intent preserved.

## Architecture Check

1. SE-driven traversal (rather than CHC-iteration) is cleaner because actor identity is bound at SE-creation per contract §4.3 line 220 (`SE.actor: STENT-<integer> | system | unknown`) and §4.3 line 225 (`SE.commitment.alias_bindings: <alias>: <record_id>`). CHC records have no `actor` field; SLT.scope has no `actor_role` field. Driving checks from SE is the only structurally correct entry point — CHC-driven iteration would have to invent or guess actor identity, which the framework cannot do at SLT-schema-validation time.
2. No backwards-compatibility aliasing/shims introduced. Net-new validator; no changes to existing validators or health-audit Phase 2d (cascade deferred per Assumption Reassessment item 5).

## Verification Layers

1. **SE.actor → CHC.grounded_in access-route check** → codebase grep-proof (`grep -n 'SE.actor\|grounded_in\|access_records' tools/validators/src/structural/observer-firewall.ts`) + node:test fixture Cases 1-4 prove own-BEL-OK, private-BEL-leak-FAIL, witness-BEL-OK, no-access-route-FAIL.
2. **SLT belief_record holder-match consistency check** → codebase grep-proof + fixture Case 5 (`belief_record(holder=X, BEL-Y)` where BEL-Y.holder ≠ X → FAIL with `_predicate_holder_mismatch`).
3. **Public-BEL / world-scope reference handling** → fixture Case 6 (CHC grounded only in `visibility: public` BEL + CHAR/ENT references → PASS).
4. **Registry integration** → codebase grep-proof (`grep -n 'observerFirewall' tools/validators/src/public/registry.ts` returns import + array-entry).
5. **FOUNDATIONS alignment** → FOUNDATIONS.md §Story Bundles §6b + §7 gate 7 cited in implementation comments; deterministic-subset boundary vs. judgment-assisted territory documented per spec §D2 line 135 carve-out.

## What to Change

### 1. New validator implementation

Create `tools/validators/src/structural/observer-firewall.ts` following the sibling pattern:

- `severity_mode: "fail"`.
- `applies_to(ctx)`: `ctx.run_mode === "full-world" || ctx.patch_plan?.patches.some(p => p.op === "create_se_record" || p.op === "create_slt_record") === true || touchedFilesInclude(ctx, /^stories\/[^/]+\/_source\/(events|storylets)\/(SE|SLT)-\d+\.yaml$/)`.
- Logic per SPEC-34 §D2 lines 118-136:
  - **Step 1**: For each `SE-<integer>` with `event_kind ∈ {selected_choice, write_in_attempt}`:
    - Resolve acting entity from `SE.actor` (or `SE.commitment.alias_bindings` for alias-bound actor cases).
    - Locate the resolving CHC: walk `parent_page_id` → that PG's `input.choice_id` when `SE.event_kind == selected_choice`. For `write_in_attempt`, no CHC; this branch's check terminates.
    - For each record-id in `CHC.grounded_in.records[]`: apply the BEL/SF access-route checks per spec lines 123-126 (BEL holder match OR public/rumored/shared/factional visibility; SF access via own BEL.basis.access_records OR public-SE-witness via STSTAT.location matching SE.targets-or-actor-co-located STLOC).
  - **Step 2**: Emitted-but-unresolved CHCs are not flagged (deferred to resolving SE).
  - **Step 3**: For each `SLT-<integer>` precondition (`hard` + `soft`), verify `belief_record(holder, BEL-<integer>, ...)` predicates' `holder` argument matches the BEL's actual `holder`. Mismatch → `observer_firewall_violation_predicate_holder_mismatch`. Existential predicates and actor-unbound exact-ID predicates (`record_active(SF-X)` etc.) are not checked here.

### 2. Diagnostics

- `observer_firewall_violation_actor_lacks_access` — fail. Cites the SE, the actor, the resolved CHC, and the referenced BEL/SF id.
- `observer_firewall_violation_no_access_route` — fail. Cites the SE, the actor, the SF, and the absent BEL/SE-witness evidence chain.
- `observer_firewall_violation_private_belief_leak` — fail. Cites the SE, the leaking BEL, its actual holder, and the borrowing actor.
- `observer_firewall_violation_predicate_holder_mismatch` — fail. Cites the SLT precondition, the predicate's holder argument, and the BEL's actual holder.

### 3. Test fixtures

Create `tools/validators/tests/structural/observer-firewall.test.ts` with 6 cases per SPEC-34 §D2 lines 147-152:

- Case 1: SE.actor=A; CHC grounded in A's own active BEL → PASS.
- Case 2: SE.actor=A; CHC grounded in another actor B's `visibility: private` BEL → FAIL with `_private_belief_leak`.
- Case 3: SE.actor=A; CHC grounded in SF-X; A has active BEL with `basis.access_records` containing SF-X → PASS.
- Case 4: SE.actor=A; CHC grounded in SF-X; A has no access route → FAIL with `_no_access_route`.
- Case 5: SLT `belief_record(holder=role_protagonist, BEL-X)` where BEL-X.holder ≠ resolved role_protagonist → FAIL with `_predicate_holder_mismatch`.
- Case 6: SE.actor=A; CHC grounded only in `public` BEL + CHAR/ENT → PASS.

### 4. Registry append

Add to `tools/validators/src/public/registry.ts`:

- Import: `import { observerFirewall } from "../structural/observer-firewall.js";`
- Array entry in `structuralValidators` at a coherent position.

## Files to Touch

- `tools/validators/src/structural/observer-firewall.ts` (new)
- `tools/validators/tests/structural/observer-firewall.test.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — 1 import line + 1 array entry)

## Out of Scope

- Semantic plausibility judgment ("actor *could* have inferred this from contextual clues") — explicitly judgment-assisted per spec §D2 line 135 carve-out; remains in health-audit Phase 2d.
- STSTAT-based co-location witness detection beyond the SF access-route check's existing co-location step — spec §Risks (line 301) names this as a future extension under stronger production-readiness constraints; out of scope here.
- Health-audit Phase 2d reformatting to use the four granular diagnostic codes — deferred per spec §Risks line 307; future ticket.
- D1/D3/D4 implementations (separate tickets in this batch).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && node --test dist/tests/structural/observer-firewall.test.js` — all 6 fixture cases pass.
2. `cd tools/validators && grep -nE 'observerFirewall' src/public/registry.ts` — returns ≥2 matches (1 import + 1 array entry).
3. `cd tools/validators && npm run test` — full validators suite green (no sibling-validator regressions).

### Invariants

1. Every `SE` with `event_kind ∈ {selected_choice, write_in_attempt}` whose resolving CHC's `grounded_in.records[]` cites a BEL or SF MUST have an actor-recorded access route (own BEL holder match, public/rumored/shared/factional visibility, BEL.basis.access_records membership for SF, or public-SE-witness via co-located STLOC). Private-BEL leakage and missing-access-route are hard failures.
2. Every SLT `belief_record(holder, BEL-<integer>, ...)` precondition MUST have the BEL's actual `holder` field match the predicate's `holder` argument. Mismatch is a hard failure regardless of which actor the SLT eventually binds.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/observer-firewall.test.ts` (new) — exercises the 6 fixture cases above; covers BEL-holder-match, private-leak, SF-access-via-BEL, no-access-route, predicate-holder-mismatch, and public-BEL paths.

### Commands

1. `cd tools/validators && npm run build && node --test dist/tests/structural/observer-firewall.test.js` (targeted)
2. `cd tools/validators && npm run test` (full suite — confirms no regressions; note that the new diagnostic codes do not collide with existing validator codes since each validator owns its own code namespace per the framework's Verdict shape)
3. The targeted command is the correct verification boundary for the validator's own correctness; the full-suite command catches integration regressions from the registry append.
