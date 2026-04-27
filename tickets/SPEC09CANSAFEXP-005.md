# SPEC09CANSAFEXP-005: continuity-audit Silent-Area Canonization check

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/continuity-audit/SKILL.md` adds a new audit check (Silent-Area Canonization) under the existing audit-check structure; surfaces detection inputs (per-CF `domains_affected` comparison against the prior union), acknowledgment surface (notes / source_basis annotation), and output shape (retcon-proposal candidate, never hard-fail).
**Deps**: `archive/tickets/SPEC09CANSAFEXP-001.md`

## Problem

SPEC-09 Move 3 adds a "Default Reality" principle paragraph to FOUNDATIONS.md §Core Principle (delivered by `archive/tickets/SPEC09CANSAFEXP-001.md`) restating Rule 6 (No Silent Retcons) with finer teeth: silence is not license to invent later; previously-unmodeled areas must be acknowledged as such when first canonized. The principle paragraph alone is documentation; the operational enforcement comes from a continuity-audit check that flags new CFs canonizing previously-silent domains without acknowledgment. Without this ticket, the Default Reality principle has no detection mechanism — it stays a documentation-side aspiration.

## Assumption Reassessment (2026-04-27)

1. `.claude/skills/continuity-audit/SKILL.md` exists. The skill emits audit reports at `worlds/<slug>/audits/AU-NNNN-<date>.md` and optional retcon-proposal cards at `worlds/<slug>/audits/AU-NNNN/retcon-proposals/RP-NNNN-<slug>.md` (per CLAUDE.md §Repository Layout). The skill's role is canon-reading + audit-only; it never mutates `_source/` records.
2. **Cross-skill / cross-artifact boundary under audit**: this ticket extends continuity-audit's check inventory by one. The detection input mechanism reads CF records via the world-index retrieval surface (`mcp__worldloom__search_nodes`, `mcp__worldloom__get_record`) — no schema changes, no patch-engine changes. Output is a retcon-proposal card directly consumable by canon-addition's `proposal_path` argument.
3. **FOUNDATIONS principle motivating this ticket**: FOUNDATIONS Rule 6 (No Silent Retcons) — extended via the Default Reality paragraph delivered by SPEC09CANSAFEXP-001. The new check operationalizes Rule 6 at the moment a previously-silent domain is first canonized.
4. **HARD-GATE / canon-write ordering surface touched**: continuity-audit's existing HARD-GATE (specific to its retcon-proposal emission) is preserved. The new check does NOT change the gate semantics — it adds an additional detection-and-emit pass before the existing gate fires.
5. **Output shape per Q1=(a)**: retcon-proposal candidate, never hard-fail. This matches the rest of continuity-audit's posture (audits surface findings as proposals; only canon-addition can decide whether to accept the retcon). Hard-failing on missing acknowledgment would leak audit-side authority into canon-mutating territory.
6. **Mystery Reserve firewall**: the new check reads CF records' `domains_affected` arrays only — it never reads or writes Mystery Reserve entries. No firewall weakening.

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
5. continuity-audit skill dry-run on a synthetic world: world has 3 CFs covering domains {economy, law}; new candidate CF declares `domains_affected: [magic]` with no acknowledgment in notes/source_basis → audit emits a retcon-proposal candidate. Repeat with the candidate CF including `notes: "First canonization of the magic domain (previously unmodeled)..."` → audit does NOT emit the candidate.

## What to Change

### 1. `.claude/skills/continuity-audit/SKILL.md` — add Silent-Area Canonization audit check

Locate continuity-audit's audit-check inventory. Add a new check section in the same shape as existing audit checks (typically a `### N. <Check Name>` heading with detection inputs, output shape, and rationale paragraphs).

Example structure:

```markdown
### N. Silent-Area Canonization

**Trigger**: any CF added since the previous audit cycle (or all CFs in the world for full-history audits) whose `domains_affected` introduces at least one domain not previously covered by any other CF.

**Detection inputs**:
- Read all CF records under `worlds/<slug>/_source/canon/` via `mcp__worldloom__search_nodes(node_type='canon_fact')`.
- For each candidate CF, compute the union of `domains_affected` across all CFs OTHER than the candidate.
- Mark a domain as **previously silent** if it appears in the candidate's `domains_affected` but is absent from that union.

**Acknowledgment surface**: a one-line entry in `cf.notes` OR `cf.source_basis` annotation matching any of:
- `"previously unmodeled"`
- `"previously silent"`
- `"first canonization of <domain>"` (case-insensitive)
- `"silent area"`
- `"default reality"`

**Output**: when acknowledgment is missing for a previously-silent domain canonization, emit a **retcon-proposal candidate** at `audits/AU-NNNN/retcon-proposals/RP-NNNN-<slug>.md`. The candidate's `body_markdown` cites the CF, names the silent domain, and proposes adding an acknowledgment line to `cf.notes` (the Default Reality posture). **Never hard-fail** — the check surfaces findings; only canon-addition can apply the retcon (matching Rules 11/12 retcon-proposal posture per SPEC-09 §Risks).

**Why**: SPEC-09 Move 3 + FOUNDATIONS §Default Reality. Silence is not license to invent later; previously-unmodeled areas must be acknowledged as such when first canonized. This check is the operational arm of Rule 6 (No Silent Retcons) at the moment a domain becomes canon for the first time.
```

Adapt the heading number `N.` to fit continuity-audit's existing check numbering. If the skill uses named subsections rather than numbered, use a named heading like `### Silent-Area Canonization`.

### 2. `.claude/skills/continuity-audit/SKILL.md` — update audit-check inventory header

If the skill has a top-level "audit checks performed" inventory list (typical worldloom skill convention), add an entry referencing the new check so the inventory mirrors the body.

## Files to Touch

- `.claude/skills/continuity-audit/SKILL.md` (modify) — add Silent-Area Canonization audit check section + update inventory list if present

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
5. continuity-audit skill dry-run on a synthetic world (created externally for this verification): world has CFs covering domains {economy, law}; candidate CF declares `domains_affected: [magic]` with no acknowledgment → audit emits a retcon-proposal candidate at `audits/AU-NNNN/retcon-proposals/RP-NNNN-<slug>.md`. Repeat with `cf.notes` containing "first canonization of magic (previously unmodeled)" → audit does NOT emit the candidate.

### Invariants

1. continuity-audit's existing audit checks (contradiction detection, capability creep, dangling consequences, etc.) remain unchanged. The new check is additive to the inventory.
2. continuity-audit never mutates `_source/` records. The new check only emits proposals at `audits/AU-NNNN/retcon-proposals/`.
3. Mystery Reserve firewall is preserved — the new check reads `domains_affected` only, never Mystery Reserve entries.
4. Retcon-proposal output shape matches the existing retcon-proposal cards; no new schema fields introduced.

## Test Plan

### New/Modified Tests

`None — documentation-only ticket; verification is command-based and existing pipeline coverage is the continuity-audit skill dry-run mechanism named in Assumption Reassessment.`

### Commands

1. `grep -nE "Silent-Area Canonization|previously unmodeled|previously silent|first canonization of|silent area|default reality|retcon-proposal candidate|never hard-fail" .claude/skills/continuity-audit/SKILL.md` — all new content greppable.
2. continuity-audit skill dry-run on a synthetic world (manual review against the new check section's expected output shape).
