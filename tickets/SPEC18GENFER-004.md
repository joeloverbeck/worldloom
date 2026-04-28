# SPEC18GENFER-004: canon-addition misrecognition probe end-to-end

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/canon-addition/SKILL.md` §Procedure step 2 (Phase 0) + §Procedure step 8 (Phase 14a) + §PA `body_markdown` Structure; `.claude/skills/canon-addition/references/proposal-normalization.md` (new §Misrecognition Probe section)
**Deps**: None

## Problem

`canon-addition/SKILL.md` Phase 0 normalizes the proposal and classifies fact type but does not actively probe the misrecognition layer. FOUNDATIONS §Acceptance Test #9 ("What do people falsely believe?") is currently exercised only at world creation — and even there, only partially. Proposers can canonize facts as `diegetic_status: objective` without ever being asked whether the fact has a public misrecognition layer, even when the in-world population's belief is materially divergent from the canonical truth.

This is not a schema gap (the CF Record Schema's `truth_scope.diegetic_status` enum, `epistemic_profile.distortion_vectors[]`, and `epistemic_profile.knowledge_exclusions[]` blocks already support misrecognition layering) — it is a flow-blindness gap. The misrecognition layer rides for free in the schema; the skill flow does not invite proposers to populate it.

The Phase 14a 12-test checklist has no Test 13 enforcing misrecognition-probe addressment, and the PA `body_markdown` Structure has no Phase 0 sub-heading carrying the probe outcome.

## Assumption Reassessment (2026-04-28)

1. Existing surfaces confirmed: Phase 0 reference at `.claude/skills/canon-addition/SKILL.md:83` (loads `references/proposal-normalization.md`); proposal-normalization.md (146 lines) covers fact-type classification, retcon-proposal inputs, place-type / polity composite handling, compound-brief CF-count rubric, and selective domain-file loading — no misrecognition probe currently exists. Phase 14a 12-test checklist at `canon-addition/SKILL.md:99-112` (Tests 11 + 12 introduced by SPEC-09 per the prose at line 99). PA `body_markdown` Structure at `canon-addition/SKILL.md:116-118` — `# Phase 0–11 Analysis` is one section; no Phase 0 sub-heading currently exists.
2. SPEC-18 §Approach Track B1/B2/B3 (lines 76-90); §Deliverables B1-B3 (lines 106-111). Track B1 explicitly permits the author to choose the landing surface (SKILL.md §Procedure step 2 OR `references/proposal-normalization.md`); the SKILL.md must reference whichever surface receives it. Decision: land the probe sub-step in `references/proposal-normalization.md` as a new §Misrecognition Probe section, since Phase 0 details already live in proposal-normalization.md per the existing SKILL.md Procedure step 2 reference. Update SKILL.md Procedure step 2 to reference the new sub-section so the discoverability path is preserved.
3. Cross-skill / schema boundary: existing CF schema fields `truth_scope.diegetic_status` (enum: `objective | believed | disputed | propagandistic | legendary`), `epistemic_profile.distortion_vectors[]`, `epistemic_profile.knowledge_exclusions[]` per FOUNDATIONS §Canon Fact Record Schema (`docs/FOUNDATIONS.md:271-345`) are confirmed present and unchanged. The probe consumes these existing fields additively; no schema modification.
4. FOUNDATIONS §Acceptance Tests #9, Rule 6 (No Silent Retcons via PA audit trail), and Rule 7 (No silent MR resolution — misrecognition is contested-canon, not mystery-reserve, per SPEC-18 §FOUNDATIONS Alignment Rule 7 entry) motivate this. The probe distinguishes "the population is wrong about a known canon fact" (contested-canon) from "the canon doesn't know either" (mystery-reserve) cleanly — Rule 7 firewall is preserved.

## Architecture Check

1. The probe consumes existing schema fields. No schema extension required — the schema-flow gap is closed by making the question mandatory at Phase 0. Cleaner than introducing new fields that would force migration of existing CFs (the spec explicitly rules out retroactive probes on previously-accepted CFs per §Out of Scope).
2. The Phase 0 sub-step lands in `references/proposal-normalization.md` (already loaded by SKILL.md Procedure step 2); the SKILL.md is updated to reference the new sub-section so the discoverability path is preserved. Authors can choose, per spec; this ticket commits to the proposal-normalization.md landing surface for symmetry with existing Phase 0 sub-sections.
3. Test 13 is judgment-only (no validator binding) — consistent with the SPEC-09-introduced Test 11 + 12 discipline at Phase 14a. The bare-absence-fails rule closes the bare-omission gap.
4. The PA `body_markdown` Phase 0 sub-heading carries the probe outcome in audit-trail prose, satisfying Rule 6 (No Silent Retcons) — every CF acceptance leaves a probe trace whether the layer is captured or explicitly NONE.
5. No backwards-compat shim — Test 13 only fires on PA records produced after SPEC-18 lands (per spec §Out of Scope: no retroactive misrecognition probes on previously-accepted CFs).

## Verification Layers

1. `references/proposal-normalization.md` contains the new §Misrecognition Probe section → codebase grep-proof
2. `canon-addition/SKILL.md` §Procedure step 2 references the new sub-section → codebase grep-proof
3. `canon-addition/SKILL.md` Phase 14a contains 13 tests (was 12) including Test 13 by name → codebase grep-proof
4. `canon-addition/SKILL.md` §PA `body_markdown` Structure references the Phase 0 sub-heading → codebase grep-proof
5. Skill dry-run: invoke canon-addition without misrecognition probe — Phase 14a Test 13 must FAIL with rationale → skill dry-run
6. Skill dry-run: invoke canon-addition with `misrecognition_probe: NONE` rationale — Test 13 must PASS → skill dry-run
7. CF schema fields used by the probe (`truth_scope.diegetic_status`, `epistemic_profile.distortion_vectors`, `epistemic_profile.knowledge_exclusions`) exist unchanged in FOUNDATIONS.md → FOUNDATIONS alignment check at `docs/FOUNDATIONS.md:271-345`

## What to Change

### 1. `references/proposal-normalization.md` — Add Misrecognition Probe section

After the existing §Template `type` Mapping section (or at an appropriate location preserving the current section flow), add a new section:

```markdown
## Misrecognition Probe

Ask: *Does this fact have a public misrecognition layer? What does the broader world believe vs. what is canon-true?* If yes, capture the layer in two surfaces: (a) set `truth_scope.diegetic_status` per the FOUNDATIONS enum (`objective | believed | disputed | propagandistic | legendary`); (b) populate `epistemic_profile.distortion_vectors[]` (named actors who systematically misrepresent the fact) and `epistemic_profile.knowledge_exclusions[]` (groups deliberately kept ignorant). If no, the proposal must record `misrecognition_probe: NONE` in the PA `body_markdown` Phase 0 sub-section with a one-line rationale (e.g., "this fact is a pure geographic distribution; no observation-perspective asymmetry").

The probe captures BOTH directions (presence and explicit absence-with-rationale) — the skill-flow gap is closed by making the question mandatory, not by requiring the answer to always be "yes." Many facts are symmetric across observation perspectives; the probe makes that symmetry an explicit decision rather than an unexamined default.

**FOUNDATIONS cross-ref**: §Acceptance Tests #9 ("What do people falsely believe?"); §Canon Fact Record Schema (`truth_scope.diegetic_status`, `epistemic_profile.distortion_vectors`, `epistemic_profile.knowledge_exclusions`).
```

### 2. `canon-addition/SKILL.md` §Procedure step 2 — Reference the misrecognition probe

Update step 2 prose to mention the misrecognition probe sub-step. Locate the line "Load `references/proposal-normalization.md`. Parse `proposal_path` if provided, otherwise interview." and append a brief reference: "Phase 0 includes a mandatory misrecognition probe per `references/proposal-normalization.md` §Misrecognition Probe — every proposal records either a misrecognition layer (with `truth_scope.diegetic_status` + at least one `epistemic_profile.distortion_vectors[]` or `knowledge_exclusions[]` entry) OR `misrecognition_probe: NONE` with a one-line rationale in the PA `body_markdown` Phase 0 sub-section."

### 3. `canon-addition/SKILL.md` §Procedure step 8 (Phase 14a) — Add Test 13

In the Phase 14a 12-test checklist at `canon-addition/SKILL.md:101-112`, append a 13th test after Test 12 (Redundancy / Rule 12):

> 13. **Misrecognition probe addressed (FOUNDATIONS §Acceptance Tests #9)** — judgment only. The PA `body_markdown` Phase 0 sub-section either declares a misrecognition layer (with `truth_scope.diegetic_status` and at minimum one `epistemic_profile.distortion_vectors[]` or `knowledge_exclusions[]` entry on the new CF) OR states `misrecognition_probe: NONE` with a one-line rationale. Bare absence fails.
>
> PASS rationale formats:
> - "Misrecognition layer captured: locals believe X, canon-true is Y; `diegetic_status: legendary`; `distortion_vectors: [Marleyan_propaganda_apparatus, Wall_Religion_clergy]`."
> - "Misrecognition probe NONE: this fact is a structural geographic distribution; no observation-perspective asymmetry."

Update the Phase 14a introductory prose at `canon-addition/SKILL.md:99` to reflect 13 tests instead of 12: "Record all 13 tests below as PASS or FAIL with a one-line rationale in the PA `body_markdown` 'Phase 14a Validation Checklist' section; bare PASS is FAIL. Tests 1-10 preserve the existing numbering; Tests 11 and 12 append the SPEC-09 action-space and redundancy judgment layers; Test 13 appends the SPEC-18 misrecognition-probe judgment layer."

Also update the HARD-GATE clause at `canon-addition/SKILL.md:19` if it enumerates the test numbers explicitly — it currently reads "skill-side Tests 9, 10, 11, 12 + judgment layers of Tests 3, 6, 8 record PASS with one-line rationale" — extend to include Test 13 in the skill-side judgment-only test list.

### 4. `canon-addition/SKILL.md` §PA `body_markdown` Structure — Require Phase 0 sub-heading

In the §PA `body_markdown` Structure prose at `canon-addition/SKILL.md:116-118`, update the description so within the existing `# Phase 0–11 Analysis` section, a `## Phase 0 — Proposal Normalization and Misrecognition Probe` sub-heading is required, carrying the `misrecognition_probe:` outcome (either layer-captured details OR `NONE` with one-line rationale). Add the sub-heading to the named-section enumeration so reviewers know the structural placement.

## Files to Touch

- `.claude/skills/canon-addition/SKILL.md` (modify)
- `.claude/skills/canon-addition/references/proposal-normalization.md` (modify)

## Out of Scope

- create-base-world Phase 4 / 8 / 9 (delivered by SPEC18GENFER-001 / 002 / 003)
- Schema modifications to PA frontmatter or CF Record fields — explicit non-goal per SPEC-18 §Approach (no schema changes; the probe consumes existing CF schema fields)
- Retroactive misrecognition probes on previously-accepted CFs — explicit non-goal per SPEC-18 §Out of Scope (PA records are append-only; no existing PA gains a Phase 0 misrecognition section after the fact)
- Promotion of Test 13 to a mechanical validator — explicit non-goal per SPEC-18 §Approach Track B2 (judgment only, no validator binding)
- Elevation of `misrecognition_probe` to PA frontmatter for query-typed retrieval — explicit future-improvement seed per SPEC-18 §Risks #5, deferred to a follow-up spec
- Conditional invocation of the probe (e.g., skip for `geography` / `language` / `physics` types) — flagged in SPEC-18 §Risks #1 as a possible future relaxation if post-landing observation shows >70% NONE rate; not an SPEC-18 deliverable

## Acceptance Criteria

### Tests That Must Pass

1. `grep -F "Misrecognition Probe" .claude/skills/canon-addition/references/proposal-normalization.md` returns 1+ match (the new section header)
2. `grep -F "misrecognition_probe: NONE" .claude/skills/canon-addition/references/proposal-normalization.md` returns 1+ match (the prose convention is documented)
3. `grep -F "Misrecognition probe addressed" .claude/skills/canon-addition/SKILL.md` returns 1 match (Test 13 row)
4. `grep -F "Phase 0 — Proposal Normalization and Misrecognition Probe" .claude/skills/canon-addition/SKILL.md` returns 1+ match (PA structure references the sub-heading)
5. `grep -F "13 tests" .claude/skills/canon-addition/SKILL.md` returns 1+ match (count updated from 12)
6. `grep -F "Misrecognition Probe" .claude/skills/canon-addition/SKILL.md` returns 1+ match (Procedure step 2 references the new sub-section)
7. Skill dry-run: invoke canon-addition with a proposal where the misrecognition probe is bypassed (no Phase 0 sub-heading content) — Phase 14a Test 13 must FAIL with rationale "bare absence"
8. Skill dry-run: invoke canon-addition with `misrecognition_probe: NONE` and rationale "geographic distribution; no observation-perspective asymmetry" — Test 13 must PASS

### Invariants

1. The probe outcome (layer-captured OR NONE-with-rationale) is mandatory in PA body — bare absence fails Test 13
2. CF schema is unchanged — no new fields; the probe consumes existing `truth_scope.diegetic_status`, `epistemic_profile.distortion_vectors`, `epistemic_profile.knowledge_exclusions` per FOUNDATIONS §Canon Fact Record Schema
3. The Mystery Reserve firewall is preserved — misrecognition is contested-canon, not mystery-reserve. Phase 5 mystery seeds (active / passive / forbidden) are unchanged. The probe distinguishes "the population is wrong about a known canon fact" from "the canon doesn't know either" cleanly per SPEC-18 §FOUNDATIONS Alignment Rule 7 entry
4. Test 13 is judgment-only — no validator binding; consistent with SPEC-09-introduced Test 11 + 12 discipline
5. Pre-SPEC-18 PAs are unaffected — the rule is forward-only

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage (the SKILL.md HARD-GATE clause enumerating skill-side judgment-only tests, the existing Phase 14a 12-test infrastructure, and the existing CF schema fields per FOUNDATIONS) is named in Assumption Reassessment.

### Commands

1. `grep -F "Misrecognition Probe" .claude/skills/canon-addition/references/proposal-normalization.md`
2. `grep -F "Misrecognition probe addressed" .claude/skills/canon-addition/SKILL.md`
3. `grep -F "Phase 0 — Proposal Normalization and Misrecognition Probe" .claude/skills/canon-addition/SKILL.md`
4. `grep -nE "13 tests|Test 13|Tests 9, 10, 11, 12, 13" .claude/skills/canon-addition/SKILL.md` (confirms count + HARD-GATE enumeration updated)
