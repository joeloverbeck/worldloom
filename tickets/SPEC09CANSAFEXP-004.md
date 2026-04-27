# SPEC09CANSAFEXP-004: canon-addition Phase 14a Tests 11/12 + Phase 13a block authoring

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/canon-addition/SKILL.md` Phase 14a (append Tests 11/12 to the contiguous test block); `.claude/skills/canon-addition/SKILL.md` Phase 13a (populate the new blocks on `create_cf_record` ops); `.claude/skills/canon-addition/references/counterfactual-and-verdict.md` (extend with detailed criteria for Tests 11/12 at the existing SPEC-09-anticipating anchor).
**Deps**: `archive/tickets/SPEC09CANSAFEXP-001.md`, `archive/tickets/SPEC09CANSAFEXP-002.md`, SPEC09CANSAFEXP-003

## Problem

canon-addition is the canon-mutating skill that emits CF records via `create_cf_record` patch ops. With Rules 11 and 12 mechanized as validators (SPEC09CANSAFEXP-003) and the conditionally-mandatory blocks structurally enforced (`archive/tickets/SPEC09CANSAFEXP-002.md`), canon-addition must (a) populate `epistemic_profile` and `exception_governance` (or `n_a` with fact-type rationale) at Phase 13a (patch plan assembly) before the validate_patch_plan call at Phase 14a, and (b) append Tests 11 (Action-Space Integrity, judgment-layer) and 12 (Redundancy, judgment-layer) to the existing 10-test contiguous block at Phase 14a per the explicit anticipation comment at canon-addition/SKILL.md:97 ("SPEC-09 Phase 2.5 will append Tests 11 (action-space) and 12 (redundancy) atop this contiguous block — preserve the numbering"). Without this skill update, canon-addition emits CFs that fail the archived SPEC09CANSAFEXP-002 structural validator and never produces the skill-side judgment layer that completes the action-space / redundancy enforcement.

## Assumption Reassessment (2026-04-27)

1. `.claude/skills/canon-addition/SKILL.md` Phase 14a (Validation) contains the contiguous 10-test block (Tests 1-10 documented inline) and the explicit SPEC-09 anticipation comment: *"SPEC-09 Phase 2.5 will append Tests 11 (action-space) and 12 (redundancy) atop this contiguous block — preserve the numbering."* Phase 13a (Patch plan assembly) and Phase 12a (modification_history scan — axis-(c) judgment) are siblings to Phase 14a in the skill's Procedure section. (Confirmed via prior reassessment session reads.)
2. `.claude/skills/canon-addition/references/counterfactual-and-verdict.md` contains an existing SPEC-09 anchor reading *"SPEC-09 will append Tests 11/12 here."* (locatable by greppable substring). This is the correct extension target for detailed criteria (per /reassess-spec finding M8 resolution).
3. **Cross-skill / cross-artifact boundary under audit**: this ticket is the consumer-side of `archive/tickets/SPEC09CANSAFEXP-002.md` structural-schema enforcement and SPEC09CANSAFEXP-003's rule validators. canon-addition emits `create_cf_record` ops; those ops carry `epistemic_profile` and `exception_governance` blocks per Phase 13a; structural enforcement runs at validate_patch_plan; rule 11/12 validators run at the same gate. Skill prose at Phase 14a documents the judgment layer that is NOT mechanized — leverage entries tied to concrete in-world mechanisms; trace registers tied to specific in-world forms.
4. **FOUNDATIONS principle motivating this ticket**: FOUNDATIONS (post-SPEC09CANSAFEXP-001) declares Rules 11 and 12. Phase 14a's validation-checklist structure is the skill-side enforcement where the judgment layer lives. Phase 13a is where the CF authoring operationalizes the conditional-mandate. Both phases are FOUNDATIONS-aligned by design.
5. **HARD-GATE / canon-write ordering surface touched**: canon-addition's HARD-GATE (lines 15-23 of SKILL.md) gates `submit_patch_plan` calls. This ticket adds skill-side Tests 11 and 12 to the Phase 14a checklist that the HARD-GATE clause (c) references — clause (c) currently names "skill-side Tests 9, 10". Update clause (c) to name "skill-side Tests 9, 10, 11, 12" so the HARD-GATE precondition keeps pace with the new tests.
6. **Schema extension consumer**: canon-addition Phase 13a populates the new blocks. Reference the exported `requiresEpistemicProfile` / `requiresExceptionGovernance` helpers in `tools/validators/src/structural/record-schema-compliance.ts` (per `archive/tickets/SPEC09CANSAFEXP-002.md`) as the authoritative taxonomy at skill prose level; this is a source-module reference, not a package `exports` subpath. If a block doesn't apply, emit the n_a-with-fact-type-rationale form; if ambiguous, surface the ambiguity to the user rather than defaulting to n_a.

## Architecture Check

1. Appending Tests 11 and 12 to the existing contiguous test block (Tests 1-10) at Phase 14a preserves the skill's single-checklist structure. The alternative — a separate "SPEC-09 tests" subsection — would split the validation surface and make HARD-GATE clause (c) need to reference two locations. Single-block extension is cleaner.
2. Phase 13a (patch plan assembly) is the natural site for block population because that's where `create_cf_record` ops are constructed. Populating earlier (Phase 12a) would require speculative authoring before the verdict is known; populating later (Phase 14a) would require modifying the patch plan after validation — fighting the engine's append-only contract.
3. No backwards-compatibility shims introduced. Phase 14a's test numbering is preserved (1-10 unchanged; 11 and 12 appended). HARD-GATE clause (c) is amended to match.
4. Reference-doc extension lands at the existing SPEC-09-anticipating anchor in `counterfactual-and-verdict.md`, not as a new reference file. Per /reassess-spec M8: the natural location is the existing reference doc that already houses Tests 1-10 detail.

## Verification Layers

1. Phase 14a contains 12 contiguous tests post-edit — codebase grep-proof (`grep -nE "^   [0-9]+\.|Test 11|Test 12" .claude/skills/canon-addition/SKILL.md` returns the new entries adjacent to existing Tests 1-10).
2. HARD-GATE clause (c) references Tests 9, 10, 11, 12 — codebase grep-proof.
3. Phase 13a documents block population — codebase grep-proof for `epistemic_profile` and `exception_governance` in the SKILL.md Phase 13a body.
4. `references/counterfactual-and-verdict.md` extension lands at the existing SPEC-09 anchor — codebase grep-proof + manual review of the anchor's surrounding context to confirm Tests 11/12 detail blocks slot correctly.
5. canon-addition skill dry-run on a synthetic capability-type CF — skill dry-run: skill emits `create_cf_record` op with `exception_governance` populated; validate_patch_plan succeeds; Phase 14a Tests 11/12 PASS with one-line rationales naming the leverage-in-mechanism justification.

## What to Change

### 1. `.claude/skills/canon-addition/SKILL.md` Phase 14a — append Tests 11 and 12

Locate the existing contiguous test block ending with Test 10 (greppable anchor: `10. **No specialness inflation (Rule 3)** — judgment only`). Append Tests 11 and 12 in the same shape:

```markdown
   11. **Action-Space Integrity (Rule 11)** — judgment-layer: (a) identify whether the CF introduces or depends on exceptional capability; if not, PASS trivially with rationale. (b) If yes, name ≥3 distinct forms of leverage remaining to ordinary or mid-tier actors from the permissible-forms enum (locality, secrecy, legitimacy, bureaucracy, numbers, ritual authority, domain expertise, access, timing, social trust, deniability, infrastructural control), each tied to a concrete in-world mechanism. The structural mechanizable layer (≥3 entries from the enum, each non-empty) is enforced by `validator-rule-11-action-space` at validate_patch_plan; this skill-side judgment layer ensures each entry references an in-world mechanism rather than a generic gesture.
   12. **Redundancy (Rule 12)** — judgment-layer: (a) classify CF status; if not hard-canon core truth, PASS trivially with rationale. (b) If hard-canon core truth, name ≥2 distinct trace registers (law, ritual, architecture, slang, ledgers, funerary practice, landscape, bodily scars, supply chains, songs, maps, educational customs, bureaucratic forms) and the concrete in-world form each trace takes. (c) Hidden-truth carve-out: if the truth is intentionally hidden, cite the M-NNNN Mystery Reserve entry that canonizes the hiding mechanism. The structural mechanizable layer (≥2 distinct registers, world-index cross-referenced) is enforced by `validator-rule-12-redundancy` at validate_patch_plan.
```

### 2. `.claude/skills/canon-addition/SKILL.md` HARD-GATE clause (c) — extend named tests

Locate the HARD-GATE block at the head of `canon-addition/SKILL.md` (greppable anchor: `<HARD-GATE>` opening tag). Clause (c) currently names "skill-side Tests 9, 10 + judgment layers of Tests 3, 6, 8". Update to "skill-side Tests 9, 10, 11, 12 + judgment layers of Tests 3, 6, 8" so the gate precondition matches the new test set.

### 3. `.claude/skills/canon-addition/SKILL.md` Phase 13a — block population guidance

In the Phase 13a body (greppable anchor: `**Phase 13a: Patch plan assembly.**`), add a paragraph after the existing patch plan assembly description:

> **Block population (per SPEC-09)**: For each `create_cf_record` op in the assembled plan, populate `epistemic_profile` and `exception_governance` (or set each to `n_a`-with-fact-type-rationale form per FOUNDATIONS §Canon Fact Record Schema). Use the structural validator's exported `requiresEpistemicProfile(cf.type)` and `requiresExceptionGovernance(cf.type)` helpers in `tools/validators/src/structural/record-schema-compliance.ts` as the source-of-truth taxonomy for the conditional-presence decision. If a block applies, populate it from the proposal's diffusion analysis (Phase 5) and counterfactual-pressure findings (Phase 7). If a block does not apply, emit the n_a form with a rationale containing a fact-type keyword from FOUNDATIONS §Ontology Categories. If the skill cannot determine whether a block applies, surface the ambiguity to the user rather than defaulting to `n_a`.

### 4. `.claude/skills/canon-addition/references/counterfactual-and-verdict.md` — Tests 11/12 detailed criteria

Locate the existing SPEC-09 anchor (greppable substring: `SPEC-09 will append Tests 11/12 here`). Replace the placeholder line with detailed criteria blocks for Tests 11 and 12 following the format of the existing Tests 1-10 detail blocks (PASS criteria, FAIL examples, rationale-quality requirements, edge cases). Match the depth of existing entries — neither shorter nor longer than Tests 8 and 9, which are the closest peers in form.

### 5. Phase 14a Validation Checklist count

The Phase 14a opening paragraph currently says "Record all 10 tests below as PASS or FAIL with a one-line rationale". Update to "Record all 12 tests below as PASS or FAIL with a one-line rationale". Cascade: the SPEC-09 anticipation comment in the same paragraph says "preserve the numbering" — preserve Tests 1-10 numbering and append 11, 12 (no renumbering of existing tests).

## Files to Touch

- `.claude/skills/canon-addition/SKILL.md` (modify) — Phase 14a test block extension, HARD-GATE clause (c) update, Phase 13a block-population paragraph, Phase 14a "all 10 tests" → "all 12 tests" count update
- `.claude/skills/canon-addition/references/counterfactual-and-verdict.md` (modify) — Tests 11/12 detailed criteria at the existing SPEC-09 anchor

## Out of Scope

- Validator implementation of Rules 11/12 (delivered by SPEC09CANSAFEXP-003)
- Structural-schema enforcement of block presence (delivered by `archive/tickets/SPEC09CANSAFEXP-002.md`)
- continuity-audit silent-area canonization check (delivered by SPEC09CANSAFEXP-005)
- diegetic-artifact-generation template cleanup (delivered by SPEC09CANSAFEXP-006)
- create-base-world genesis enforcement (delivered by SPEC09CANSAFEXP-007)
- Rule 3 mechanization (remains judgment-only per archived SPEC-04 §Risks)

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "^   11\. \*\*Action-Space Integrity|^   12\. \*\*Redundancy" .claude/skills/canon-addition/SKILL.md` returns 2 matches at the Phase 14a contiguous block.
2. `grep -n "Tests 9, 10, 11, 12" .claude/skills/canon-addition/SKILL.md` returns ≥1 match in the HARD-GATE clause (c).
3. `grep -n "all 12 tests" .claude/skills/canon-addition/SKILL.md` returns ≥1 match in Phase 14a's introductory description (replacing the prior "all 10 tests" wording).
4. `grep -n "epistemic_profile\|exception_governance" .claude/skills/canon-addition/SKILL.md` returns ≥2 matches in the Phase 13a block-population paragraph.
5. `grep -n "Test 11\|Test 12" .claude/skills/canon-addition/references/counterfactual-and-verdict.md` returns matches at the detailed-criteria blocks (replacing the prior placeholder anchor).
6. canon-addition skill dry-run on a synthetic capability-type CF (proposal authored externally for this verification) succeeds end-to-end: Phase 13a populates `exception_governance`; Phase 14a Tests 1-12 all record PASS with rationale; HARD-GATE deliverable summary includes the new tests.

### Invariants

1. Phase 14a's "preserve the numbering" directive is honored: Tests 1-10 retain their original numbers and bodies; Tests 11 and 12 are net-new appends.
2. HARD-GATE clause (c) names every Phase 14a test that has a skill-side judgment surface (currently 9, 10, 11, 12).
3. Phase 13a block population is gated by the structural validator's exported helpers — no inline duplication of the type taxonomy in canon-addition skill prose.
4. References/counterfactual-and-verdict.md extension matches the format and depth of existing Tests 1-10 entries; no ad-hoc shortening.

## Test Plan

### New/Modified Tests

`None — documentation-only ticket; verification is command-based and existing pipeline coverage (validators tests + canon-addition skill dry-run) is named in Assumption Reassessment.`

### Commands

1. `grep -nE "Test 11|Test 12|Tests 9, 10, 11, 12|all 12 tests|epistemic_profile|exception_governance" .claude/skills/canon-addition/SKILL.md` — comprehensive grep that all post-edit content is present.
2. `grep -nE "Test 11|Test 12" .claude/skills/canon-addition/references/counterfactual-and-verdict.md` — reference-doc detail blocks present.
3. canon-addition skill dry-run on a synthetic capability-type CF proposal — manual review against the new Phase 14a checklist (12 tests with rationale).
