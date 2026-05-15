# SPEC32STOCONHAR-005: Replace `denial_patterns` with firewall-field-derived patterns in prose-attach

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: `branching-story-prose-attach` (skill prose) plus SPEC-32 implementation note
**Deps**: None

## Problem

At intake, `.claude/skills/branching-story-prose-attach/SKILL.md:185` (Phase 3 deterministic check 3, `forbidden_mystery_resolution`) said:

> 3. **`forbidden_mystery_resolution`** (`PASS | FAIL`) — regex-scan the prose for surface-level resolutions of any mystery in plan §11 `forbidden_resolutions[]`. Use deterministic patterns derived from each mystery's `denial_patterns` (per the world's Mystery Reserve record format). Any pattern match is `FAIL` and routes to `repair_recommendation: revise_prose`.

The `denial_patterns` field did not exist anywhere in the worldloom codebase:
- Mystery Reserve schema at `tools/validators/src/schemas/mystery-reserve.schema.json` defines `id`, `title`, `status`, `knowns`, `unknowns`, `common_interpretations`, `disallowed_cheap_answers`, `domains_touched`, `future_resolution_safety`, `extensions` — no `denial_patterns`.
- `tools/world-mcp/src/tools/get-firewall-content.ts` (the `FirewallContent` interface, lines 14–20) projects `title`, `status`, `unknowns`, `common_interpretations`, `disallowed_cheap_answers` — no `denial_patterns`.
- Existing M records (e.g., `worlds/animalia/_source/mystery-reserve/M-1.yaml`) carry no `denial_patterns` field.
- Repo-wide grep for `denial_patterns` returns matches only in this skill and the archived brainstorm `archive/brainstorming/branching-story-prose-attach.md` (historical record; not the live source).

Before this ticket, the deterministic `forbidden_mystery_resolution` check was un-implementable as written. The landed fix derives deterministic patterns from existing firewall fields exposed by `mcp__worldloom__get_firewall_content` — `disallowed_cheap_answers[]` (each entry is a forbidden resolution string; case-insensitive substring matching is well-defined) plus plan §11 `forbidden_resolutions[]` (each entry names a protected question whose surface-level resolution is forbidden). Cumulative semantic narrowing of `unknowns[]` is recorded as a judgment-assisted note rather than a deterministic FAIL (it routes to `branching-story-health-audit` mystery-accretion review per Phase 2e).

Adding a `denial_patterns` field to the Mystery Reserve schema is explicitly rejected — it would violate FOUNDATIONS §Story Bundles §5b Schema-Minimalism (line 628): *"Every field in every story-bundle record schema must be load-bearing — directly consumed by a validation gate, a replay primitive, a predicate, a fork operation, or recorded audit-trail discipline. Nice-to-have fields are dropped, because each field costs LLM tokens to author at every record and to read at every retrieval."* The `denial_patterns` field has no consumer beyond this single deterministic check; the existing firewall fields are sufficient.

## Assumption Reassessment (2026-05-16)

1. At reassessment before edits, prose-attach SKILL.md:185 was confirmed at the current path; the literal text *"Use deterministic patterns derived from each mystery's `denial_patterns`"* was still present. Mystery Reserve schema at `tools/validators/src/schemas/mystery-reserve.schema.json` confirmed to define `id / title / status / knowns / unknowns / common_interpretations / disallowed_cheap_answers / domains_touched / future_resolution_safety / extensions` — no `denial_patterns` field anywhere.
2. `get_firewall_content` MCP tool at `tools/world-mcp/src/tools/get-firewall-content.ts` confirmed to project `title / status / unknowns / common_interpretations / disallowed_cheap_answers` per the `FirewallContent` interface (lines 14–20). Before edits, repo-wide grep for `denial_patterns` returned matches only in this skill, the active ticket/spec/triage/report surfaces, and historical archive/proposal context; after edits, the live skill returns no matches.
3. Cross-skill / cross-artifact boundary: prose-attach Phase 3 deterministic checks consume firewall fields from the M record via either `get_firewall_content` or page-plan inlining. The shared boundary is the Mystery Reserve schema (whose fields are stable post-SPEC-13) and the page-plan §11 contract (which already names `forbidden_resolutions[]`). This ticket touches one skill's check definition; no schema change, no sibling skill change.
4. FOUNDATIONS §Story Bundles §5b Schema-Minimalism at line 628 governs this ticket: rather than adding a `denial_patterns` field whose only consumer would be this single deterministic check, the corrected wording derives patterns from existing firewall fields (`disallowed_cheap_answers[]` + `unknowns[]` + plan §11 `forbidden_resolutions[]`) that already have multiple consumers (skill-internal firewall use; health-audit cross-reference; page-plan §11 inlining). The principle "no fields without mechanical consumers" cited in SPEC-32 §Key design decisions D1 maps to §Schema-Minimalism here, NOT to Rule 5 (No Consequence Evasion), per Step 2 Issue 3 disposition.
5. This ticket touches the Mystery Reserve firewall enforcement surface — specifically `branching-story-prose-attach` Phase 3 deterministic check 3 (`forbidden_mystery_resolution`), which is a redundant downstream guard on rendered prose (consistent with FOUNDATIONS Rule 7 firewall paragraph + `archive/tickets/SPEC32STOCONHAR-001.md`'s sharpened wording). The proposed change rewrites the check's pattern-source (from undocumented `denial_patterns` to existing `disallowed_cheap_answers[]` + `unknowns[]` + plan §11) but preserves its semantic role: forbidden-status `M-<integer>` is NEVER resolved at this check site. The change strengthens the firewall (the check is now implementable; it was un-implementable as written) without elevating it to a second authoritative gate.
6. Final same-file review found the FOUNDATIONS Alignment table still describing this as "Phase 3 check 2" and a generic regex scan against plan §11. This was same-seam factual drift in the edited skill, so the Rule 7 and Mystery Reserve rows were updated to Phase 3 check 3 and to the same `get_firewall_content` / `disallowed_cheap_answers[]` / `unknowns[]` boundary as the landed check paragraph.
7. The originating spec received a dated D1 implementation note. Broadly rewriting the original proposal text would exceed this ticket; the new note marks the remaining fixture prose and old field-addition framing as historical intake context.

## Architecture Check

1. Cleaner than adding the `denial_patterns` field to the Mystery Reserve schema: existing firewall fields (`disallowed_cheap_answers[]`, `unknowns[]`) already have multiple consumers (the skill-internal firewall use here; health-audit mystery-accretion review at Phase 2e; the FOUNDATIONS §5b schema-minimalism principle). Reusing them keeps the schema lean and the check implementable from day one.
2. No backwards-compatibility shims. The change is a single check-paragraph prose replacement at line 185. Future page plans continue to receive `disallowed_cheap_answers[]` via `get_firewall_content` (or inlined into plan §11); no migration is needed.

## Verification Layers

1. Prose-attach SKILL.md:185 no longer references `denial_patterns` and now cites `disallowed_cheap_answers[]` + `unknowns[]` + plan §11 → codebase grep-proof (multiple grep commands enumerated in Acceptance Criteria).
2. The receipt output format (`forbidden_mystery_resolution: PASS | FAIL`) is unchanged → manual review against the contract §4.6 prose receipt schema.
3. Cumulative semantic narrowing handling routes to health-audit mystery-accretion review (Phase 2e) → cross-reference is preserved in the new wording; manual review confirms.
4. Single-layer ticket otherwise — verification is grep-proof + manual review; no validator fixture, no skill dry-run (the skill is not yet exercised on any production story bundle; the deterministic check's behavior will be confirmed at first real invocation against a real M record).

## Landed Changes

### 1. Replaced Phase 3 deterministic check 3 at line 185

Replaced the original check paragraph at `.claude/skills/branching-story-prose-attach/SKILL.md:185`:

```
3. **`forbidden_mystery_resolution`** (`PASS | FAIL`) — regex-scan the prose for surface-level resolutions of any mystery in plan §11 `forbidden_resolutions[]`. Use deterministic patterns derived from each mystery's `denial_patterns` (per the world's Mystery Reserve record format). Any pattern match is `FAIL` and routes to `repair_recommendation: revise_prose`.
```

with:

```
3. **`forbidden_mystery_resolution`** (`PASS | FAIL`) — retrieve firewall fields for every `M-<integer>` named in plan §11 via `mcp__worldloom__get_firewall_content(world_slug, m_ids=<plan §11 ids>)`, unless the page plan already inlines the same fields. Derive deterministic patterns from `disallowed_cheap_answers[]` (each entry is a forbidden resolution string and is compared by case-insensitive substring match) and from `unknowns[]` collapsed to plan §11 `forbidden_resolutions[]` (each entry names a protected question whose surface-level resolution is forbidden).

   Any direct assertion matching a `disallowed_cheap_answers[]` entry is `FAIL` and routes to `repair_recommendation: revise_prose`. Cumulative semantic narrowing of a protected `unknowns[]` entry that does not match a `disallowed_cheap_answers[]` string is recorded as a judgment-assisted note in `notes[]` and routed to `branching-story-health-audit` mystery-accretion review (see Phase 2e); do not fail the receipt for cumulative narrowing alone.

   Do not reference undocumented Mystery Reserve fields; the check uses only firewall fields exposed by `get_firewall_content` or already inlined into the page plan.
```

### 2. Kept the Rule 7 alignment row consistent

Updated the same skill's FOUNDATIONS Alignment Rule 7 and Mystery Reserve rows so they name Phase 3 check 3 and the firewall-field source. The detailed Rule 7 paragraph above the table records direct `disallowed_cheap_answers[]` failure behavior, cumulative-narrowing handoff to health audit, and the invariant that forbidden-status `M-<integer>` is not resolved here.

### 3. Added SPEC-32 implementation note

Added a D1 implementation note to `archive/specs/SPEC-32-story-contract-hardening-iv.md` documenting the landed narrow boundary and the accepted proof surface.

## Files to Touch

- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify — Phase 3 deterministic check 3 at line 185)
- `archive/specs/SPEC-32-story-contract-hardening-iv.md` (modify — D1 implementation note)

## Out of Scope

- Adding `denial_patterns` to the Mystery Reserve schema — explicitly rejected per FOUNDATIONS §Story Bundles §5b Schema-Minimalism (line 628; "no fields without mechanical consumers").
- `archive/brainstorming/branching-story-prose-attach.md` — historical record; the live skill is the canonical source.
- New validator-fixture directories under `tools/validators/tests/fixtures/branching-story-prose-attach/` — no per-skill subdirectory convention exists in `tools/validators/tests/fixtures/` (the directory is flat with 8 top-level files; no `branching-story-prose-attach/` subdirectory). The `forbidden_mystery_resolution` check is a skill-level deterministic check, not a structural validator. Per Step 2 Issue 2 disposition: verification is grep-proof; future dry-run on a real story bundle will confirm runtime behavior.
- Other Phase 3 deterministic checks (`hash_integrity`, `invented_structural_fact`, etc.) — only check 3 is rewritten.
- FOUNDATIONS.md edits — §Story Bundles §5b Schema-Minimalism already encodes the principle; `archive/tickets/SPEC32STOCONHAR-001.md` addresses the related Rule 7 firewall paragraph.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "denial_patterns" .claude/skills/branching-story-prose-attach/SKILL.md` returns no matches.
2. `grep -n "denial_patterns" .claude/skills/branching-story-prose-attach/` returns matches ONLY under `archive/` paths (none under the live `.claude/skills/branching-story-prose-attach/SKILL.md`).
3. `grep -n "get_firewall_content" .claude/skills/branching-story-prose-attach/SKILL.md` returns a match in the rewritten check 3.
4. `grep -n "disallowed_cheap_answers" .claude/skills/branching-story-prose-attach/SKILL.md` returns a match in the rewritten check 3.
5. `grep -nE "case-insensitive substring match" .claude/skills/branching-story-prose-attach/SKILL.md` returns a match (the precise matching semantics are documented).
6. `grep -n "branching-story-health-audit" .claude/skills/branching-story-prose-attach/SKILL.md` returns a match in the rewritten check 3 (cumulative-narrowing referral preserved).
7. `npm test` from `tools/validators/` (regression check; no validator test currently asserts the literal check-3 prose, so this is a pass-on-no-regression check).

### Invariants

1. Mystery Reserve schema is unchanged; `denial_patterns` is not added.
2. Receipt output format (`forbidden_mystery_resolution: PASS | FAIL` per contract §4.6) is unchanged.
3. Forbidden-status `M-<integer>` is NEVER resolved at this check site, consistent with FOUNDATIONS Rule 7 (firewall enforcement).
4. The deterministic check's authority is preserved as a redundant downstream guard on rendered prose, not a second authoritative state-transition gate (consistent with `archive/tickets/SPEC32STOCONHAR-001.md`'s sharpened wording for Rule 7).

## Test Plan

### New/Modified Tests

1. `None — skill-prose change; verification is grep-proof. Per Step 2 Issue 2 disposition, no new validator fixture is created; the check is skill-level and will be exercised when prose-attach first runs against a real story bundle with an M record. Future testing-hardening spec may add a fixture-driven test if a structural-validator integration point is introduced; SPEC-32 §Out of Scope defers the broader test plan from the audit's §8 (28-item validator/test plan).`

### Commands

1. `grep -n "denial_patterns" .claude/skills/branching-story-prose-attach/SKILL.md` (must return no matches)
2. `grep -n "get_firewall_content\\|disallowed_cheap_answers" .claude/skills/branching-story-prose-attach/SKILL.md` (must return matches in the rewritten check 3)
3. `grep -rn "denial_patterns" .claude/skills/branching-story-prose-attach/` (returns no matches — archived brainstorm not under this path)
4. `npm test` from `tools/validators/` (regression check)

## Outcome

Completed: 2026-05-16.

`branching-story-prose-attach` Phase 3 check 3 now derives `forbidden_mystery_resolution` patterns from fields that exist in the current Mystery Reserve / firewall retrieval contract: `get_firewall_content`, `disallowed_cheap_answers[]`, `unknowns[]`, and page-plan §11. Direct matches to `disallowed_cheap_answers[]` fail the receipt; cumulative semantic narrowing is recorded in `notes[]` and routed to `branching-story-health-audit` rather than being treated as a deterministic direct-answer match.

The same skill's Rule 7 and Mystery Reserve alignment rows now match the landed check paragraph, including the corrected Phase 3 check number. `archive/specs/SPEC-32-story-contract-hardening-iv.md` received a D1 implementation note so the remaining proposal text about validator fixtures is explicitly historical intake context.

No Mystery Reserve schema field was added, no receipt output field changed, and no validator fixture was created.

## Verification Result

1. `grep -n "denial_patterns" .claude/skills/branching-story-prose-attach/SKILL.md` — returned no matches, the expected no-hit proof.
2. `grep -n "get_firewall_content\\|disallowed_cheap_answers" .claude/skills/branching-story-prose-attach/SKILL.md` — passed at the rewritten check paragraph and the Rule 7 alignment row.
3. `grep -nE "case-insensitive substring match" .claude/skills/branching-story-prose-attach/SKILL.md` — passed at the rewritten check paragraph.
4. `grep -n "branching-story-health-audit" .claude/skills/branching-story-prose-attach/SKILL.md` — passed at the rewritten cumulative-narrowing handoff and the existing non-chaining guardrail.
5. `rg -n 'Phase 3 check 2|deterministic regex scan of rendered prose against plan §11' .claude/skills/branching-story-prose-attach/SKILL.md` — returned no matches, the expected no-hit proof that the same-file stale alignment rows were corrected.
6. `git diff --check -- .claude/skills/branching-story-prose-attach/SKILL.md archive/tickets/SPEC32STOCONHAR-005.md archive/specs/SPEC-32-story-contract-hardening-iv.md` — passed.
7. `npm test` from `tools/validators/` — passed, 269/269 tests before later prose-only closeout edits; the affected grep and hygiene checks were rerun after those prose edits.

## Deviations

- Updated the same skill's Rule 7 and Mystery Reserve alignment rows in addition to the drafted line-185 replacement because the rows were stale after the check paragraph changed.
- Added a narrow D1 implementation note to the originating spec rather than rewriting the whole proposal section. The remaining fixture/test-plan prose in SPEC-32 is historical intake context.
- Used `npm test` from the `tools/validators/` package cwd instead of the drafted root command `npm --prefix tools/validators test`, matching the package's existing CLI test path assumptions.
