# SPEC62FOUANDDOC-003: propose-new-worlds-from-preferences — relax forbidden-mystery mandate to bounded + rationale

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/propose-new-worlds-from-preferences/SKILL.md` (Phase 11b mandate + restatement sites) and `templates/proposal-card.md` (new optional field); no code, validator, or world-data change.
**Deps**: archive/tickets/SPEC62FOUANDDOC-002.md

## Problem

`propose-new-worlds-from-preferences/SKILL.md:244` requires **every** card to declare at least one `forbidden` mystery (Phase 11b enforces it). FOUNDATIONS Rule 7 mandates deliberate, bounded unknowns — not a permanently-unresolvable mystery in every world — and discovery-driven worlds (an explicit target posture) are crippled by an absolute forbidden mandate. SPEC-62 §2.4 relaxes the per-card mandate to "at least one **bounded** mystery; forbidden strongly recommended; when omitted, populate `forbidden_mystery_absence_rationale`," consistent with the FOUNDATIONS relaxation landed in `archive/tickets/SPEC62FOUANDDOC-002.md`.

## Assumption Reassessment (2026-05-21)

1. The forbidden-mandate is restated across multiple sites in `propose-new-worlds-from-preferences/SKILL.md` (verified this session — 13 "forbidden" hits; the mandate-bearing ones): HARD-GATE gate-list (≈line 19, "11b per-card forbidden-mystery presence"), Phase 10 materialization rule (≈line 244, "every card MUST declare at least one `forbidden` mystery"), Phase 11b heading + body (≈lines 255–256), FOUNDATIONS-Alignment Rule-7 row (≈line 343), Final Rule (≈line 394); plus `templates/proposal-card.md` — `mystery_reserve_seeds.forbidden` comment (≈line 117, "MANDATORY at least one"), `forbidden_mystery_presence` block (≈lines 135–137), body checklist (≈line 297), validation checklist (≈line 340). ALL must change consistently or the skill is internally contradictory (relaxed Phase 11b vs HARD-GATE/Final Rule still demanding an absolute). Line numbers are informational — re-grep `forbidden` at implementation time and update every mandate-bearing site.
2. SPEC-62 §2.4 (lines 77–113) is the source deliverable; it depends on the FOUNDATIONS relaxation sentence landed by `archive/tickets/SPEC62FOUANDDOC-002.md` (the skill must not relax its mandate before FOUNDATIONS sanctions it — Rule 6 / consistency). Triage A4 routes it here with `resolution_intent` dropped.
3. Cross-artifact boundary under audit: the SKILL.md ↔ `templates/proposal-card.md` pair — the Phase 11b check (SKILL) and the `mystery_reserve_seeds` / `forbidden_mystery_presence` blocks (template) are paired surfaces; both must move together. The new `forbidden_mystery_absence_rationale` field is consumed by the relaxed Phase 11b check.
4. FOUNDATIONS principle restated: Rule 7 (Preserve Mystery Deliberately) — bounded, tracked unknowns. The relaxation keeps "at least one **bounded** mystery" mandatory (Rule 7 satisfied) and requires an explicit `forbidden_mystery_absence_rationale` when forbidden is omitted (so the omission is deliberate and tracked, not weak design memory).
5. Canon Safety surface named: the skill's Phase 11 Canon Safety Check, specifically Phase 11a (cross-world Mystery Reserve laundering firewall) and Phase 11b (per-card forbidden-mystery presence). **Only Phase 11b (presence) relaxes; Phase 11a (the load-bearing Rule-7 laundering firewall, SKILL.md ≈line 387) is preserved unchanged** — no card may transcribe/answer another world's forbidden `M` `unknowns`, before or after this change. Confirmed: the firewall is not weakened and no forbidden `M` becomes resolvable.
6. Existing output schema extended: the proposal-card frontmatter schema (`templates/proposal-card.md`) gains `forbidden_mystery_absence_rationale` (and the `forbidden_mystery_presence.has_forbidden_mystery` semantics shift from MUST-be-true to recommended). Consumers: the skill's Phase 11b check and Phase 14 deliverable summary. The extension is **additive-only** — `forbidden_mystery_absence_rationale` is a new optional field populated only when no forbidden mystery is seeded; existing cards that declare a forbidden mystery remain valid.

## Architecture Check

1. Enumerating every mandate restatement site (rather than editing only Phase 11b) keeps the skill internally consistent — a relaxed Phase 11b alongside a still-absolute HARD-GATE/Final Rule would be a self-contradicting skill. Preserving Phase 11a untouched keeps the load-bearing cross-world firewall intact while relaxing only the per-card presence mandate.
2. No backwards-compatibility aliasing/shims — the absolute mandate is replaced outright; `forbidden_mystery_absence_rationale` is a new optional field, not a compatibility alias.

## Verification Layers

1. No SKILL.md site still demands an absolute forbidden mystery → codebase grep-proof (`grep -n "MUST declare at least one .forbidden" .claude/skills/propose-new-worlds-from-preferences/SKILL.md` returns zero; the relaxed "bounded" wording is present at the former mandate sites).
2. `forbidden_mystery_absence_rationale` is present in the template and referenced by the relaxed Phase 11b → codebase grep-proof across SKILL.md + `templates/proposal-card.md`.
3. Phase 11a cross-world laundering firewall text (≈line 387) is byte-unchanged → codebase grep-proof / manual diff of the Phase 11a region.
4. The relaxation matches the FOUNDATIONS authority → FOUNDATIONS alignment check against the `archive/tickets/SPEC62FOUANDDOC-002.md` §Mystery Reserve relaxation sentence.

## What to Change

### 1. Relax the per-card forbidden-mystery mandate across all SKILL.md sites

Change "every card MUST declare at least one `forbidden` mystery" to: every card MUST declare at least one **bounded** mystery; a `forbidden` mystery is strongly recommended, and when omitted the card MUST populate `forbidden_mystery_absence_rationale` explaining why discovery / eventual-revelation is structurally necessary. Apply consistently at: the HARD-GATE gate-list (≈line 19), Phase 10 materialization rule (≈line 244), Phase 11b heading + body (≈lines 255–256), FOUNDATIONS-Alignment Rule-7 row (≈line 343), and the Final Rule (≈line 394).

### 2. Update the proposal-card template

In `templates/proposal-card.md`: relax the `mystery_reserve_seeds.forbidden` "MANDATORY at least one" comment (≈line 117) to "recommended; if omitted, populate `forbidden_mystery_absence_rationale`"; update the `forbidden_mystery_presence` block (≈lines 135–137) so `has_forbidden_mystery` is no longer MUST-be-true and add the `forbidden_mystery_absence_rationale` field; update the body checklist (≈line 297) and validation checklist (≈line 340) accordingly.

### 3. Preserve Phase 11a

Leave the Phase 11a cross-world Mystery Reserve laundering firewall (≈line 387) and all "do not transcribe forbidden M `unknowns`" discipline byte-unchanged.

## Files to Touch

- `.claude/skills/propose-new-worlds-from-preferences/SKILL.md` (modify)
- `.claude/skills/propose-new-worlds-from-preferences/templates/proposal-card.md` (modify)

## Out of Scope

- `create-base-world` — unchanged; its symmetric "at least one of each" genesis seeding is not the reported defect.
- The `resolution_intent` enum + `mystery_policy_validator` — dropped (YAGNI).
- Phase 11a (cross-world laundering firewall) — explicitly preserved, not modified.
- Any FOUNDATIONS edit (that is `archive/tickets/SPEC62FOUANDDOC-002.md`, this ticket's dependency).
- Any validator or `canonical-vocabularies.ts` change.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "MUST declare at least one .forbidden\|MANDATORY at least one" .claude/skills/propose-new-worlds-from-preferences/` returns zero matches (the absolute mandate is gone from every site).
2. `grep -rn "forbidden_mystery_absence_rationale\|at least one .*bounded. mystery" .claude/skills/propose-new-worlds-from-preferences/` returns matches in both SKILL.md and the template (the relaxed mandate + new field are present).
3. The Phase 11a laundering-firewall paragraph (≈line 387) still reads "Phase 11a is the only firewall protecting against forbidden-mystery laundering across worlds" — `grep -n "laundering across worlds" .claude/skills/propose-new-worlds-from-preferences/SKILL.md` returns one unchanged match.

### Invariants

1. Phase 11a (cross-world laundering firewall) is byte-unchanged — only Phase 11b (per-card presence) relaxes.
2. The proposal-card schema extension is additive-only: cards declaring a forbidden mystery remain valid; `forbidden_mystery_absence_rationale` is required only when forbidden is omitted.

## Test Plan

### New/Modified Tests

1. `None — documentation-only (skill prose + template) ticket; verification is grep-based and the skill's own Phase 11/12 self-validation covers behavior at invocation time.`

### Commands

1. `grep -rn "forbidden" .claude/skills/propose-new-worlds-from-preferences/SKILL.md` — review every hit to confirm each mandate-bearing site relaxed and Phase 11a untouched.
2. `grep -n "forbidden_mystery_absence_rationale\|forbidden_mystery_presence\|mystery_reserve_seeds" .claude/skills/propose-new-worlds-from-preferences/templates/proposal-card.md`
3. Narrower-command rationale: this is a skill-prose + template edit with no executable test surface; grep-proof of mandate-site relaxation + new-field presence + Phase 11a invariance is the correct verification boundary (a skill dry-run would additionally require a representative preference document, deferred to implementation review).
