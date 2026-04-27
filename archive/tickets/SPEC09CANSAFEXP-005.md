# SPEC09CANSAFEXP-005: continuity-audit Silent-Area Canonization check

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/continuity-audit/SKILL.md` adds a new audit check (Silent-Area Canonization) under the existing audit-check structure; `.claude/skills/continuity-audit/references/audit-categories.md` and `.claude/skills/continuity-audit/references/retrieval-tool-tree.md` mirror the new 4k check; `specs/IMPLEMENTATION-ORDER.md` marks the SPEC-09 continuity-audit slice complete.
**Deps**: `archive/tickets/SPEC09CANSAFEXP-001.md`

## Problem

SPEC-09 Move 3 adds a "Default Reality" principle paragraph to FOUNDATIONS.md §Core Principle (delivered by `archive/tickets/SPEC09CANSAFEXP-001.md`) restating Rule 6 (No Silent Retcons) with finer teeth: silence is not license to invent later; previously-unmodeled areas must be acknowledged as such when first canonized. The principle paragraph alone is documentation; the operational enforcement comes from a continuity-audit check that flags new CFs canonizing previously-silent domains without acknowledgment. Without this ticket, the Default Reality principle has no detection mechanism — it stays a documentation-side aspiration.

## Assumption Reassessment (2026-04-27)

1. `.claude/skills/continuity-audit/SKILL.md` exists. The skill emits audit reports at `worlds/<slug>/audits/AU-NNNN-<date>.md` and optional retcon-proposal cards at `worlds/<slug>/audits/AU-NNNN/retcon-proposals/RP-NNNN-<slug>.md`. The skill's role is canon-reading + audit-only; it never mutates `_source/` records.
2. **Cross-skill / cross-artifact boundary under audit**: this ticket extends continuity-audit's check inventory by one. The detection input mechanism reads CF records via the world-index retrieval surface (`mcp__worldloom__search_nodes`, `mcp__worldloom__get_record`) — no schema changes, no patch-engine changes. Output is a retcon-proposal card directly consumable by canon-addition's `proposal_path` argument.
3. **FOUNDATIONS principle motivating this ticket**: FOUNDATIONS Rule 6 (No Silent Retcons) — extended via the Default Reality paragraph delivered by SPEC09CANSAFEXP-001. The new check operationalizes Rule 6 at the moment a previously-silent domain is first canonized.
4. **HARD-GATE / canon-write ordering surface touched**: continuity-audit's existing HARD-GATE (specific to its retcon-proposal emission) is preserved. The new check does NOT change the gate semantics — it adds an additional detection-and-emit pass before the existing gate fires.
5. **Output shape per Q1=(a)**: retcon-proposal candidate, never hard-fail. This matches the rest of continuity-audit's posture (audits surface findings as proposals; only canon-addition can decide whether to accept the retcon). Hard-failing on missing acknowledgment would leak audit-side authority into canon-mutating territory.
6. **Mystery Reserve firewall**: the new check reads CF records' `domains_affected` arrays only — it never reads or writes Mystery Reserve entries. No firewall weakening.
7. **Reference-doc fallout**: `SKILL.md` delegates Phase 4 enumeration to `references/audit-categories.md` and `references/retrieval-tool-tree.md`, so the check inventory is not truthfully changed by editing `SKILL.md` alone. Those same-seam references are owned by this ticket.
8. **Verification-scope correction**: the drafted synthetic continuity-audit dry-run is an end-to-end SPEC-09 scenario already owned by active capstone ticket `tickets/SPEC09CANSAFEXP-008.md` (§Verification 8). This ticket is the skill-prose landing; its truthful proof surface is grep/manual review of the new 4k check, reference-doc alignment, and SPEC-09 implementation-order truthing.

## Architecture Check

1. Adding the check as one entry in continuity-audit's existing check inventory keeps the audit surface uniform. The alternative — a separate "default-reality-audit" sub-skill — would fragment the audit pipeline without semantic gain. Single skill, single check inventory, single output channel.
2. The retcon-proposal output channel already exists; this check feeds into it without a new output type.
3. Detection algorithm: scan all CF records under `_source/canon/`, compute the union of `domains_affected` across all CFs OTHER than the candidate, then for each candidate CF check whether any element of `cf.domains_affected` is absent from the union (i.e., the CF introduces the domain). If yes AND `cf.notes` and `cf.source_basis` lack acknowledgment of the silent-area canonization, emit a retcon-proposal candidate. Acknowledgment patterns (matched case-insensitively): "previously unmodeled", "previously silent", "first canonization of <domain>", "silent area", "default reality".
4. No backwards-compatibility shims introduced. The new check is additive to the existing audit inventory.

## Verification Layers

1. New check section exists in continuity-audit/SKILL.md — codebase grep-proof (`grep -n "Silent-Area Canonization\|Default Reality" .claude/skills/continuity-audit/SKILL.md`).
2. Detection input mechanism is documented — codebase grep-proof for `domains_affected` reference in the new check block.
3. Acknowledgment-pattern match list is documented — codebase grep-proof for the pattern strings.
4. Retcon-proposal output shape — codebase grep-proof for "retcon-proposal candidate" / "never hard-fail" in the new check block.
5. Reference docs mirror the new 4k check — codebase grep-proof for `Silent-Area Canonization` in `.claude/skills/continuity-audit/references/audit-categories.md` and `.claude/skills/continuity-audit/references/retrieval-tool-tree.md`.
6. SPEC-09 implementation-order row marks the continuity-audit skill update complete — codebase grep-proof in `specs/IMPLEMENTATION-ORDER.md`.

## What to Change

### 1. `.claude/skills/continuity-audit/SKILL.md` — add Silent-Area Canonization audit check

Locate continuity-audit's audit-check inventory. Add a new check section in the same shape as existing audit checks (typically a `### N. <Check Name>` heading with detection inputs, output shape, and rationale paragraphs).

Example structure:

```markdown
### N. Silent-Area Canonization

**Trigger**: any CF added since the previous audit cycle (or all CFs in the world for full-history audits) whose `domains_affected` introduces at least one domain not previously covered by any other CF.

**Detection inputs**:
- Enumerate CF records via `mcp__worldloom__search_nodes(node_types=['canon_fact_record'])`.
- Use `mcp__worldloom__get_record(CF-NNNN)` when `notes` or `source_basis` are not fully present in the search result.
- For each candidate CF, compute the union of `domains_affected` across all CFs OTHER than the candidate.
- Mark a domain as **previously silent** if it appears in the candidate's `domains_affected` but is absent from that union.

**Acknowledgment surface**: a one-line entry in `cf.notes` OR `cf.source_basis` annotation matching any of:
- `"previously unmodeled"`
- `"previously silent"`
- `"first canonization of <domain>"` (case-insensitive)
- `"silent area"`
- `"default reality"`

**Output**: when acknowledgment is missing for a previously-silent domain canonization, emit a **retcon-proposal candidate** at `audits/AU-NNNN/retcon-proposals/RP-NNNN-<slug>.md`. The candidate body cites the CF, names the silent domain, and proposes adding an acknowledgment line to `cf.notes` or `source_basis` (the Default Reality posture). **Never hard-fail** — the check surfaces findings; only canon-addition can apply the retcon (matching Rules 11/12 retcon-proposal posture per SPEC-09 §Risks).

**Why**: SPEC-09 Move 3 + FOUNDATIONS §Default Reality. Silence is not license to invent later; previously-unmodeled areas must be acknowledged as such when first canonized. This check is the operational arm of Rule 6 (No Silent Retcons) at the moment a domain becomes canon for the first time.
```

Adapt the heading number `N.` to fit continuity-audit's existing check numbering. If the skill uses named subsections rather than numbered, use a named heading like `### Silent-Area Canonization`.

### 2. `.claude/skills/continuity-audit/references/*.md` — update Phase 4 check references

Update `references/audit-categories.md` and `references/retrieval-tool-tree.md` so the Phase 4 4a-4j inventory becomes 4a-4k and the Silent-Area Canonization enumeration/judgment surface is visible where the skill already sends operators for Phase 4 details.

### 3. `specs/IMPLEMENTATION-ORDER.md` — mark SPEC-09 continuity-audit slice complete

Update the SPEC-09 Phase 2.5 ordered list so the now-landed continuity-audit skill update is not left pending.

## Files to Touch

- `.claude/skills/continuity-audit/SKILL.md` (modify) — add Silent-Area Canonization audit check section + update inventory list if present
- `.claude/skills/continuity-audit/references/audit-categories.md` (modify) — add 4k reasoning details
- `.claude/skills/continuity-audit/references/retrieval-tool-tree.md` (modify) — add 4k retrieval tool mapping
- `specs/IMPLEMENTATION-ORDER.md` (modify) — mark continuity-audit skill update complete
- `archive/tickets/SPEC09CANSAFEXP-005.md` (modify) — closeout and verification truthing

## Out of Scope

- FOUNDATIONS.md Default Reality paragraph (delivered by SPEC09CANSAFEXP-001)
- Hard-fail enforcement of silent-area acknowledgment (explicitly rejected per Q1=(a); retcon-proposal posture only)
- Per-fact tagging of "default reality" status (rejected at SPEC-09 design time as too heavy a retrofit)
- Retroactive sweep of historical animalia CFs (deferred to user-choice continuity-audit cycle per SPEC-09 §Out of Scope; not auto-triggered)
- canon-addition skill changes for accepting silent-area retcon-proposals (canon-addition already accepts retcon proposals via `proposal_path`; no change needed)

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "Silent-Area Canonization" .claude/skills/continuity-audit/SKILL.md` returns ≥1 match at the new check section.
2. `grep -n "previously unmodeled\|previously silent\|first canonization of\|silent area\|default reality" .claude/skills/continuity-audit/SKILL.md` returns matches at the acknowledgment-pattern list.
3. `grep -n "retcon-proposal candidate" .claude/skills/continuity-audit/SKILL.md` returns ≥1 match (the new check uses the existing retcon-proposal output channel).
4. `grep -n "never hard-fail\|Never hard-fail" .claude/skills/continuity-audit/SKILL.md` returns ≥1 match enforcing the Q1=(a) posture.
5. `grep -n "Silent-Area Canonization" .claude/skills/continuity-audit/references/audit-categories.md .claude/skills/continuity-audit/references/retrieval-tool-tree.md` returns matches at the new 4k reference entries.
6. `grep -n "continuity-audit skill updates.*completed via.*SPEC09CANSAFEXP-005" specs/IMPLEMENTATION-ORDER.md` returns the SPEC-09 Phase 2.5 completion row.

### Invariants

1. continuity-audit's existing audit checks (contradiction detection, capability creep, dangling consequences, etc.) remain unchanged. The new check is additive to the inventory.
2. continuity-audit never mutates `_source/` records. The new check only emits proposals at `audits/AU-NNNN/retcon-proposals/`.
3. Mystery Reserve firewall is preserved — the new check reads `domains_affected` only, never Mystery Reserve entries.
4. Retcon-proposal output shape matches the existing retcon-proposal cards; no new schema fields introduced.

## Test Plan

### New/Modified Tests

`None — skill-prose/reference-doc ticket; verification is command-based and manual-review based. The end-to-end synthetic continuity-audit dry-run is owned by SPEC09CANSAFEXP-008.`

### Commands

1. `grep -nE "Silent-Area Canonization|previously unmodeled|previously silent|first canonization of|silent area|default reality|retcon-proposal candidate|Never hard-fail|never-hard-fail" .claude/skills/continuity-audit/SKILL.md` — all new content greppable.
2. `grep -n "Silent-Area Canonization" .claude/skills/continuity-audit/references/audit-categories.md .claude/skills/continuity-audit/references/retrieval-tool-tree.md` — Phase 4 reference docs mirror the check.
3. `grep -n "continuity-audit skill updates.*completed via.*SPEC09CANSAFEXP-005" specs/IMPLEMENTATION-ORDER.md` — SPEC-09 implementation order is current.
4. `git diff --check` — patch hygiene.

## Outcome

Completion date: 2026-04-27.

Completed the continuity-audit Silent-Area Canonization landing for SPEC-09:

- Added Phase 4k to `continuity-audit/SKILL.md`, including trigger, `domains_affected` union comparison, acknowledgment patterns, retcon-proposal candidate output, never-hard-fail posture, and Mystery Reserve firewall note.
- Updated continuity-audit Phase 4 reference docs so the operator-facing category/retrieval details include the new check.
- Marked the SPEC-09 implementation-order row for the continuity-audit skill update complete.

## Verification Result

- `grep -nE "Silent-Area Canonization|previously unmodeled|previously silent|first canonization of|silent area|default reality|retcon-proposal candidate|Never hard-fail|never-hard-fail" .claude/skills/continuity-audit/SKILL.md` — passed.
- `grep -n "Silent-Area Canonization" .claude/skills/continuity-audit/references/audit-categories.md .claude/skills/continuity-audit/references/retrieval-tool-tree.md` — passed.
- `grep -n "continuity-audit skill updates.*completed via.*SPEC09CANSAFEXP-005" specs/IMPLEMENTATION-ORDER.md` — passed.
- `git diff --check` — passed.

## Deviations

- The drafted synthetic continuity-audit dry-run was not executed in this ticket. Active capstone ticket `tickets/SPEC09CANSAFEXP-008.md` owns SPEC-09 §Verification 8 end-to-end; this ticket closes on skill-prose/reference-doc proof.
