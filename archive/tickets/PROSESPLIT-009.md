# PROSESPLIT-009: Documentation cascade — CLAUDE.md, WORKFLOWS.md, FOUNDATIONS.md, HARD-GATE-DISCIPLINE.md, hooks/README.md

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None — documentation only.
**Deps**: PROSESPLIT-002 through PROSESPLIT-008 should land first (or land together) so the documentation reflects the actual post-rework pipeline. Doc-only ticket; no behavioral change.

## Problem

The plan-and-finalize rework changes the visible pipeline shape: bootstrap and page-cycle become plan producers, prose generation moves outside Claude Code, a new finalize skill converges plan + prose, and the authoring loop serializes (plan → render externally → finalize → next plan). Several authoritative documentation surfaces describe the old pipeline shape and need synchronized updates:

- **`CLAUDE.md`** §Skill Architecture, §Repository Layout, §ID Allocation Conventions, §Non-Negotiables, §Common Workflows.
- **`docs/WORKFLOWS.md`** — the canonical "how to invoke each skill" doc lacks a finalize entry and lacks the serialized-authoring-loop diagram.
- **`docs/FOUNDATIONS.md`** §Story Bundles, Rule 1 (No Cosmetic Output), Rule 7 (Mystery Reserve Preservation).
- **`docs/HARD-GATE-DISCIPLINE.md`** — finalize is a new HARD-GATE-bearing skill in the story-bundle family.
- **`tools/hooks/README.md`** Row 3 — `pages-prose-plans/` is a new direct-write story-bundle markdown surface.

This ticket consolidates all documentation updates into one ticket so the docs land coherently. Splitting them would produce intermediate states where docs disagree with each other.

## Assumption Reassessment (2026-05-10)

1. `CLAUDE.md` at repo root (verified). §Skill Architecture lists three categories (Canon-mutating, Canon-reading, Meta) and enumerates skills per category. §Repository Layout shows the worlds/<world-slug>/stories/<story-slug>/ subtree. §ID Allocation Conventions table lists every ID class. §Non-Negotiables enumerates "never bypass" rules.
2. `docs/WORKFLOWS.md` (verified) is the canonical "how to invoke each skill with arguments and expected outputs" reference. Per CLAUDE.md §Common Workflows: "See `docs/WORKFLOWS.md` for how to invoke each skill with arguments and expected outputs."
3. `docs/FOUNDATIONS.md` is the authoritative design contract (per CLAUDE.md §Authoritative Source of Truth). §Story Bundles section defines story-bundle scoping rules. Rules 1-7 are core validation discipline.
4. `docs/HARD-GATE-DISCIPLINE.md` (verified) describes the HARD-GATE execution pattern. Per CLAUDE.md §HARD-GATE Discipline: "Every canon-mutating or content-generating skill begins with a `<HARD-GATE>` block. Gates are absolute under Auto Mode."
5. `tools/hooks/README.md` Row 3 (verified per the earlier grep): "Block direct mutation of world-canon and story-bundle `_source/*.yaml` records; redirect to `submit_patch_plan`. Allow primary-authored markdown, `_source/<subdir>/README.md`, hybrid artifacts (`characters/`, `diegetic-artifacts/`, `adjudications/`, `proposals/`, `audits/`), and story-bundle markdown surfaces such as `INDEX.md`, `pages-prose/`, `storylet-batches/`, and `story-promotions/`." Adding `pages-prose-plans/` to this list is a one-string append.
6. Cross-skill / cross-artifact boundary under audit: every authoritative documentation surface that mentions story-bundle prose pipeline must converge on the post-rework shape. Mismatched docs (one says "Phase 7 renders prose", another says "plan + finalize") cause downstream skill confusion.
7. FOUNDATIONS principles under audit: Rule 1 (No Cosmetic Output) — clarify that plans are load-bearing. Rule 7 (Mystery Reserve Preservation) — clarify the plan-time vs finalize-time firewall split.
8. Schema extension classification: not applicable — this ticket is documentation-only.
9. HARD-GATE semantics: documenting finalize as a new HARD-GATE-bearing skill is descriptive, not prescriptive (PROSESPLIT-005 implements the gate; this ticket documents it).
10. Adjacent contradictions: NONE expected — this is a synchronization ticket. If implementation reveals drift between this ticket's narrative and the actual implementations, correct the narrative; never weaken the implementation to match a stale doc.

## Architecture Check

1. Single ticket consolidates all documentation cascade so cross-doc consistency is reviewable in one diff.
2. No backwards-compatibility shims. The old pipeline narrative is replaced; no "legacy" or "deprecated" sections needed since the rework is the new contract.
3. Alternative considered: split into 5 separate doc-only tickets (one per surface). Rejected because (a) cross-doc consistency is the load-bearing property, (b) review burden is lower with one PR than five, (c) the writing surface is small enough to absorb in one focused pass.

## Verification Layers

1. CLAUDE.md mentions `branching-story-page-prose-finalize` in §Skill Architecture canon-reading list → grep-proof.
2. CLAUDE.md §Repository Layout includes `pages-prose-plans/` in the stories/<slug>/ subtree → grep-proof.
3. CLAUDE.md §Non-Negotiables includes a "prose pages are author-supplied" entry → grep-proof.
4. WORKFLOWS.md has a section for `branching-story-page-prose-finalize` with arguments and example invocation → grep-proof.
5. WORKFLOWS.md includes the serialized-authoring-loop diagram → manual review (ASCII diagram or equivalent).
6. FOUNDATIONS.md §Story Bundles mentions plan/finalize separation → grep-proof.
7. FOUNDATIONS.md Rule 1 clarification of "plans are load-bearing engine output" → grep-proof.
8. FOUNDATIONS.md Rule 7 clarification of firewall split (plan-time + finalize-time) → grep-proof.
9. HARD-GATE-DISCIPLINE.md mentions finalize as HARD-GATE-bearing → grep-proof.
10. tools/hooks/README.md Row 3 includes `pages-prose-plans/` in the allowed list → grep-proof.

## What to Change

### 1. `CLAUDE.md` updates

#### 1a. §Skill Architecture

Add a new bullet under "Canon-reading" skills:
```
- `branching-story-page-prose-finalize` — converges a `pages-prose-plans/PG-NNNN.md` plan and a user-supplied `pages-prose/PG-NNNN.md` rendered prose file. Runs deferred prose-coupled validators (prose_ledger_consistency, arc_trace_evidence_alignment, prose_critic_8_axis), extracts ARC_TRACE if the page has a selected arc, updates the PG record's `prose_status` to `rendered`, emits a `prose_finalized` SE event, and emits ARCTRACE-NNNN if applicable. Does NOT write `pages-prose/PG-NNNN.md` (user supplies it).
```

Update the existing `branching-story-bootstrap` and `branching-story-page-cycle` bullets to reflect plan production:
- bootstrap: change "rendered root page (PG-0001) and its first 4-6 generated choices" → "comprehensive prose plan for PG-0001 and its first 4-6 generated choices (rendered prose is supplied externally and merged via `branching-story-page-prose-finalize`)".
- page-cycle: change "renders the next page" → "authors the comprehensive prose plan for the next page (rendered prose is supplied externally and merged via `branching-story-page-prose-finalize`)".

#### 1b. §Repository Layout

Update the `worlds/<world-slug>/stories/<story-slug>/` subtree:
```
worlds/<world-slug>/stories/<story-slug>/
├── STORY_KERNEL.md
├── _source/
│   └── ... (15 atomic-record subdirs unchanged)
├── pages-prose/             ← rendered prose; populated by user (manual or external LLM); empty .gitkeep until first finalize
├── pages-prose-plans/       ← comprehensive prose plans; written by bootstrap/page-cycle Phase 11
├── audits/                  ← health-audit reports
└── INDEX.md
```

#### 1c. §ID Allocation Conventions

No new ID class. Verify the existing list still matches; no edits required unless the implementation surfaces a missed allocator.

#### 1d. §Non-Negotiables

Add a new bullet:
```
- **Prose pages are author-supplied.** `branching-story-bootstrap` and `branching-story-page-cycle` produce comprehensive plans at `pages-prose-plans/PG-NNNN.md`; rendered prose at `pages-prose/PG-NNNN.md` is supplied externally (manual or OpenRouter LLM) and merged via `branching-story-page-prose-finalize`. Page-cycle pre-flight aborts when the parent page's `prose_status != "rendered"` to ensure plan §14 (Recent prose continuity) can inline rendered context. Authoring becomes serialized: bootstrap-plan → finalize → page-cycle-plan → finalize → ...
```

#### 1e. §Common Workflows

The existing pointer to `docs/WORKFLOWS.md` is unchanged; WORKFLOWS.md updates are in §2 below.

### 2. `docs/WORKFLOWS.md` updates

#### 2a. Add a section for `branching-story-page-prose-finalize`

Document arguments (`world_slug`, `story_slug`, `page_id`, `execution_mode`, `accept_plan_drift`), required pre-state (PG record with `prose_status: pending`; `pages-prose/PG-NNNN.md` exists; `pages-prose-plans/PG-NNNN.md` exists), and example invocation:
```
/branching-story-page-prose-finalize world_slug=<slug> story_slug=<slug> page_id=PG-NNNN
```

Note the per-execution-mode HARD-GATE visibility (`authoring` shows; `interactive_runtime` and `batch_generation` auto-commit after gates pass).

#### 2b. Add the serialized-authoring-loop diagram

A new section "Authoring loop after the prose-rendering split":
```
bootstrap-plan PG-0001 → external prose render → finalize PG-0001
                                                ↓
     page-cycle-plan PG-0002 ← (only after PG-0001.prose_status == rendered)
                            ↓
     external prose render → finalize PG-0002
                            ↓
     page-cycle-plan PG-0003 ← ...
```

Note that branching is unaffected — any rendered page can be a fork parent. Forking from `pending`-status pages is blocked by the §14 hard pre-flight check.

#### 2c. Update the existing bootstrap and page-cycle entries

Bootstrap's "expected outputs" list: change "PG-0001.md (rendered prose)" → "PG-0001.md (comprehensive plan at pages-prose-plans/)". Page-cycle: same shape.

### 3. `docs/FOUNDATIONS.md` updates

#### 3a. §Story Bundles

Add a paragraph (after the existing scoping discussion, before the Rule 7 firewall discussion):
```
**Pipeline shape: plan + finalize.** The story-bundle pipeline produces a comprehensive prose plan at bundle commit (`pages-prose-plans/PG-NNNN.md`); rendered prose is supplied externally and merged via `branching-story-page-prose-finalize`. The plan is engine-readable and validation-bearing — its frontmatter declares affordances, intended beats, stop conditions, and forbidden_resolutions; its body inlines all canonical context the external renderer needs. Rendered prose is the authorial artifact; finalize is the convergence point that runs prose-coupled validators (`prose_ledger_consistency`, `arc_trace_evidence_alignment`, `prose_critic_8_axis`) and emits the ARC_TRACE record. World-canon mutation remains exclusive to `story-fact-promotion-to-canon`; finalize does not promote.
```

#### 3b. Rule 1 (No Cosmetic Output) clarification

Add to the existing Rule 1 discussion:
```
A plan IS load-bearing engine output. It is consumed by Phase 7.5 declared-affordance validation, Phase 9 plan_completeness_check, Phase 9.5 plan_self_containment, and finalize Phase 1 plan/prose pairing. Producing a plan without yet-rendered prose satisfies Rule 1.
```

#### 3c. Rule 7 (Mystery Reserve Preservation) clarification

Add to the existing Rule 7 discussion:
```
**Firewall split for the plan + finalize pipeline.** Mystery firewall enforcement now runs at two times:
- Plan-time: deterministic check that no plan section asserts a forbidden_resolution (the plan's frontmatter `forbidden_resolutions[]` enumerates which M-NNNN must NOT be resolved by the rendered prose).
- Finalize-time: deterministic regex over rendered prose for forbidden-mystery-resolution patterns + LLM critic (Phase 3) for prose-level firewall breaches.

Both gates remain mandatory. Forbidden-status M is NEVER resolved at either gate.
```

### 4. `docs/HARD-GATE-DISCIPLINE.md` updates

Add `branching-story-page-prose-finalize` to the list of HARD-GATE-bearing skills in the story-bundle family. Note that finalize's gate is per-execution-mode liftable (same shape as page-cycle's Phase 10); the Phase 4.5 canon-promotion handoff is NOT triggered by finalize (finalize does not promote).

### 5. `tools/hooks/README.md` Row 3 update

Append `pages-prose-plans/` to the list of allowed direct-write story-bundle markdown surfaces:
```
| 3 | `PreToolUse:Edit\|Write` | Block direct mutation of world-canon and story-bundle `_source/*.yaml` records; redirect to `submit_patch_plan`. Allow primary-authored markdown, `_source/<subdir>/README.md`, hybrid artifacts (`characters/`, `diegetic-artifacts/`, `adjudications/`, `proposals/`, `audits/`), and story-bundle markdown surfaces such as `INDEX.md`, `pages-prose/`, `pages-prose-plans/`, `storylet-batches/`, and `story-promotions/`. | 2 |
```

### 6. NO change to FOUNDATIONS.md §Default Reality

The `Default Reality` posture is unchanged: world-canon mutation requires explicit user act; story-bundles never bypass.

### 7. NO change to existing canon-pipeline brainstorming proposals at `archive/brainstorming/`

Those are historical records. The plan-and-finalize rework does not retroactively edit them.

## Files to Touch

- `CLAUDE.md` (modify)
- `docs/WORKFLOWS.md` (modify)
- `docs/FOUNDATIONS.md` (modify)
- `docs/HARD-GATE-DISCIPLINE.md` (modify)
- `tools/hooks/README.md` (modify — Row 3 only)

## Out of Scope

- Skill-level changes. Covered in PROSESPLIT-005 / PROSESPLIT-006 / PROSESPLIT-007 / PROSESPLIT-008.
- Validator-level changes. Covered in PROSESPLIT-004.
- Schema-level changes. Covered in PROSESPLIT-002.
- Updating archived brainstorming proposals or specs at `archive/`.
- Adding a NEW §Plan-and-Finalize Pipeline section to FOUNDATIONS.md (decision deferred per design doc Open Decisions §3 — the recommended approach is minimal clarifications to existing rules + one §Story Bundles paragraph). If user prefers an explicit new section, expand at implementation time.
- Updating `docs/MACHINE-FACING-LAYER.md` or `docs/CONTEXT-PACKET-CONTRACT.md` unless implementation reveals an explicit reference site that drifts.
- Updating skill-internal-coherence skill audit rules (those would be a separate ticket if the rework changes audit semantics).

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n "branching-story-page-prose-finalize" CLAUDE.md` matches in §Skill Architecture.
2. `rg -n "pages-prose-plans" CLAUDE.md docs/WORKFLOWS.md docs/FOUNDATIONS.md tools/hooks/README.md` matches each file.
3. `rg -n "Authoring loop after the prose-rendering split|bootstrap-plan PG-0001|finalize PG-0001" docs/WORKFLOWS.md` matches.
4. `rg -n "plan + finalize|Pipeline shape: plan|firewall split" docs/FOUNDATIONS.md` matches.
5. `rg -n "branching-story-page-prose-finalize" docs/HARD-GATE-DISCIPLINE.md` matches.
6. `rg -n "pages-prose-plans/" tools/hooks/README.md` matches in the Row 3 list.
7. Manual review: cross-doc consistency — every doc surface describes the same plan-and-finalize pipeline shape; no doc claims "Phase 7 renders prose" anywhere.

### Invariants

1. CLAUDE.md, WORKFLOWS.md, FOUNDATIONS.md, HARD-GATE-DISCIPLINE.md, hooks/README.md all describe the same pipeline shape post-rework.
2. The serialized-authoring-loop diagram is in WORKFLOWS.md (the canonical workflow doc).
3. FOUNDATIONS.md's Rule 7 firewall-split clarification mentions BOTH plan-time AND finalize-time gates as mandatory.
4. Hook 3's allowed-surfaces list (in tools/hooks/README.md) is a strict superset of the previous list — no surface is removed.
5. No archived files are edited.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is grep + manual cross-doc consistency review.

### Commands

1. `rg -n "branching-story-page-prose-finalize" CLAUDE.md docs/ tools/hooks/README.md`
2. `rg -n "pages-prose-plans" CLAUDE.md docs/ tools/hooks/README.md`
3. `rg -n "Authoring loop|serialized authoring|bootstrap-plan PG-0001" docs/WORKFLOWS.md`
4. `rg -n "Pipeline shape: plan|firewall split|plan-time vs finalize-time" docs/FOUNDATIONS.md`
5. Manual review: read CLAUDE.md, WORKFLOWS.md, FOUNDATIONS.md, HARD-GATE-DISCIPLINE.md, hooks/README.md end-to-end after edits; confirm no doc claims "Phase 7 renders prose" or "page-cycle emits ARC_TRACE at plan-commit."
