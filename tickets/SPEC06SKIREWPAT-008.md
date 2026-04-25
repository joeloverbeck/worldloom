# SPEC06SKIREWPAT-008: continuity-audit — engine-routed retrieval

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/continuity-audit/SKILL.md` rewritten; ledger-scan replaced with `search_nodes` + `get_neighbors` queries against atomic records; audit records and retcon-proposal cards remain direct-Edit on hybrid files
**Deps**: None — SPEC-01..SPEC-05 Part B + SPEC-13 + SPEC-14 archived. Independent of sibling tickets (different skill, different file set). Recommend landing after SPEC06SKIREWPAT-001 (canon-addition pattern proven).

## Problem

`continuity-audit/SKILL.md` (486 lines) is the largest sibling skill; it currently runs eight audit categories (contradictions, scope drift, capability creep, dangling consequences, thematic erosion, hidden retcons, mystery corruption, diegetic leakage) by enumerating canon ledger entries via grep-and-targeted-read patterns against the retired monolithic markdown files. Per SPEC-13, the ledger is now atomic YAML under `worlds/<slug>/_source/canon/CF-NNNN.yaml`; per SPEC-06 §Migration plan continuity-audit subsection (lines 153–157), enumeration moves to `mcp__worldloom__search_nodes` + `get_neighbors` queries. Audit records (`audits/AU-NNNN-<date>.md`) and retcon-proposal cards (`audits/AU-NNNN/retcon-proposals/RP-NNNN-*.md`) remain direct-Edit because they are hybrid YAML-frontmatter-plus-markdown per-file artifacts that Hook 3 explicitly allows per SPEC-05 Part B (the hybrid-file allowlist includes `audits`).

Target: SKILL.md ~150 lines (vs current 486); ~69% reduction. No new patch-engine op required.

## Assumption Reassessment (2026-04-26)

1. Current `.claude/skills/continuity-audit/SKILL.md` (486 lines) references retired monolithic files (`CANON_LEDGER.md`, `INVARIANTS.md`, etc.) and uses the "Large-file method" pattern inherited from canon-addition (per canon-addition/SKILL.md line 157 cross-reference). These files are gone post-SPEC-13.
2. SPEC-06 §Migration plan continuity-audit subsection (lines 153–157) prescribes: replace ledger scan for audit categories with `search_nodes` + `get_neighbors` queries; writes to `audits/AU-NNNN-*.md` remain direct-Edit (hybrid file). SPEC-06 §Out of Scope explicitly defers any new patch-engine op for audit records (per /reassess-spec Question Q2 resolution: "audits remain direct-Edit").
3. Cross-skill / cross-artifact boundary: continuity-audit produces retcon-proposal cards consumed by canon-addition via `proposal_path`. The card schema is the contract surface; per `archive/specs/SPEC-14-pa-contract-and-vocabulary-reconciliation.md` it has `retcon_type: A | B | C | D`, `target_cf_ids`, `severity_before_fix`, `severity_after_fix`, `audit_origin`, `finding_id` frontmatter. Boundary preserved by this rewrite — only the ENUMERATION mechanism changes (atomic-record queries instead of monolithic grep), not the card-emission shape.
4. FOUNDATIONS principles under audit:
   - **Rule 6 (No Silent Retcons)**: continuity-audit's primary purpose is detecting silent retcons across the canon ledger. Atomic-record retrieval makes retcon detection more precise (per-record `modification_history[]` is now a structured field, not prose to grep).
   - **Rule 7 (Preserve Mystery Deliberately)**: Mystery corruption audit category (one of the eight) checks whether prior commitments have eroded Mystery Reserve firewalls. `rule7_mystery_reserve_preservation` validator catches mechanical violations; semantic erosion stays in skill.
5. HARD-GATE semantics: gate fires at user-approval step before writing the consolidated audit report (`audits/AU-NNNN-<date>.md`); auto-Mode does not bypass.

## Architecture Check

1. Thin-orchestrator pattern: pre-flight allocates `AU-NNNN` (and per-finding `RP-NNNN` if retcon proposals are emitted) via `mcp__worldloom__allocate_next_id`; `get_context_packet(task_type='continuity-audit', seed_nodes=<world-overview>, token_budget=20000)` provides world-state context; per-category audit reasoning uses `search_nodes` (lexical / typed queries against the atomic-record corpus) and `get_neighbors` (typed-edge traversal); audit findings classified into one of the 8 categories; retcon-proposal cards composed where appropriate; HARD-GATE before write. Cleaner than monolithic-grep approach because typed queries return structured results (node IDs, edge traversals) instead of grep-line lists requiring secondary parsing.
2. Audit record write stays direct-Edit because it is a hybrid file (Hook 3 allowlist); retcon-proposal cards stay direct-Edit for the same reason. No new engine op required — keeps SPEC-06 scope minimal per /reassess-spec Question Q2 resolution.

## Verification Layers

1. Enumeration uses MCP queries → grep-proof: skill text contains zero raw `Read` of `_source/` paths; uses `mcp__worldloom__search_nodes` + `get_neighbors` for canon-fact enumeration
2. Audit categories complete → manual review: each of the 8 categories (contradictions, scope drift, capability creep, dangling consequences, thematic erosion, hidden retcons, mystery corruption, diegetic leakage) is exercised on a sample audit run
3. Retcon-proposal cards consumable by canon-addition → schema validation: emitted RP-NNNN-*.md cards have correct frontmatter per SPEC-14 (`retcon_type`, `target_cf_ids`, `severity_before_fix`, `severity_after_fix`, `audit_origin`, `finding_id`); `cd tools/validators && node dist/src/cli/world-validate.js animalia --json` passes on cards
4. Audit record hybrid-file integrity → Hook 3 trace: direct-Edit on `audits/AU-NNNN-*.md` succeeds (Hook 3 allows hybrid files); direct-Edit on `_source/*.yaml` denied (Hook 3 blocks)
5. Mystery corruption audit preserves Rule 7 → manual review: any audit finding flagging Mystery Reserve erosion produces a retcon-proposal card that, if consumed by canon-addition, restores the firewall (does not silently resolve)

## What to Change

### 1. Rewrite SKILL.md as thin orchestrator (target ~150 lines)

Replace pre-flight ledger scan (the inherited "Large-file method" block) with `mcp__worldloom__allocate_next_id` for `AU-NNNN` allocation and `get_context_packet(task_type='continuity-audit', ...)` for world-state context. Drop §World-State Prerequisites file enumeration referencing retired monolithic files. Replace per-category enumeration prose (the eight audit categories' grep patterns) with MCP query patterns: `search_nodes` for lexical / typed queries; `get_neighbors` for typed-edge traversal; `find_impacted_fragments` and `find_sections_touched_by` for cross-record locality.

### 2. Per-category audit reasoning patterns

For each of the 8 audit categories, document the MCP query pattern that surfaces candidate findings:
- **Contradictions**: `search_nodes` with logical-conflict heuristics; cross-CF comparison via `get_neighbors` on shared `domains_affected`.
- **Scope drift**: enumerate CFs whose `scope.geographic` or `scope.social` evolved across `modification_history[]`; check vs original `scope` in CF body.
- **Capability creep**: enumerate `type: capability` CFs; check whether `distribution.who_can_do_it` expanded over time without corresponding `costs_and_limits` extension.
- **Dangling consequences**: `find_impacted_fragments` on each CF; flag CFs whose `required_world_updates` includes SECs not actually patched (cross-check via `find_sections_touched_by`).
- **Thematic erosion**: enumerate AES-N invariants; flag CFs that softened or reframed away from invariant statements.
- **Hidden retcons**: enumerate CFs with `modification_history[]` entries lacking corresponding CH-NNNN attribution.
- **Mystery corruption**: enumerate M-NNNN entries; flag any CF that resolves a `status: forbidden` mystery, or that softens a firewall extension.
- **Diegetic leakage**: enumerate DA-NNNN diegetic artifacts whose narrator-voice claims have been silently elevated to world-level CFs without `source_basis.derived_from` attribution to the DA.

### 3. Audit record write (direct-Edit, hybrid file)

Compose the consolidated audit report at `worlds/<slug>/audits/AU-NNNN-<date>.md` with frontmatter (`au_id`, `audit_date`, `world_slug`, `categories_examined: [...]`, `findings_count_by_category: {...}`, `retcon_proposals_emitted: [...]`) plus body sections per category. Write via direct-Edit (Hook 3 hybrid-file allowlist permits). Update `audits/INDEX.md` direct-Edit.

### 4. Retcon-proposal cards (direct-Edit, hybrid file)

For each finding warranting a retcon proposal, compose `audits/AU-NNNN/retcon-proposals/RP-NNNN-<slug>.md` with SPEC-14 frontmatter (`rp_id`, `retcon_type: A | B | C | D`, `target_cf_ids: [...]`, `severity_before_fix`, `severity_after_fix`, `audit_origin: AU-NNNN`, `finding_id`). Body markdown documents the retcon rationale, proposed change, and Mystery Reserve impact. These cards are directly consumable as canon-addition's `proposal_path`.

### 5. HARD-GATE → audit report write

Present the audit findings summary to user; user issues approval; skill writes `audits/AU-NNNN-<date>.md` + retcon-proposal cards + updates `audits/INDEX.md`. Auto-Mode does not bypass.

### 6. Audit reasoning preservation

The eight audit-category reasoning prose (semantic judgment about what counts as "scope drift" vs legitimate canon evolution; what counts as "capability creep" vs CF refinement; etc.) STAYS in-skill. Only the enumeration mechanism changes.

## Files to Touch

- `.claude/skills/continuity-audit/SKILL.md` (modify — rewrite ~486 → ~150 lines)
- `.claude/skills/continuity-audit/references/` (modify — refresh any reference files to atomic-source query patterns; delete mechanism-only files; survive judgment-only files)
- `.claude/skills/continuity-audit/templates/retcon-proposal-card.md` (modify — refresh frontmatter to SPEC-14 schema if needed)
- `.claude/skills/continuity-audit/templates/audit-report.md` (modify — refresh frontmatter shape)

## Out of Scope

- Migration of OTHER skills (covered by sibling tickets)
- New `append_audit_record` op (deferred per SPEC-06 §Out of Scope; audits stay direct-Edit on hybrid file)
- New `append_retcon_proposal` op (same reasoning; retcon proposals stay direct-Edit)
- Validator framework changes for audit records (SPEC-04 owns)
- Token-reduction measurement (covered by SPEC06SKIREWPAT-009 capstone)

## Acceptance Criteria

### Tests That Must Pass

1. Skill dry-run on animalia: pre-flight uses `allocate_next_id` for `AU-NNNN`; `get_context_packet` provides world-state context; zero raw `Read` of `_source/canon/`.
2. Per-category audit reasoning surfaces ≥1 finding per applicable category (categories with no findings produce explicit "no findings" entries; never silently skipped).
3. Retcon-proposal cards (if emitted) pass `record_schema_compliance` validation with SPEC-14 frontmatter shape.
4. Audit record write succeeds via direct-Edit on `audits/AU-NNNN-<date>.md`; Hook 3 trace shows hybrid-file allowance.
5. Direct-Edit attempt on `_source/*.yaml` from within continuity-audit (synthetic test) is denied by Hook 3.

### Invariants

1. HARD-GATE absoluteness: skill cannot write audit report without user approval.
2. Eight categories complete: every audit run examines all eight categories; categories with no findings produce explicit "no findings" entries (no silent skipping).
3. Mystery Reserve firewall preserved: any "Mystery corruption" finding produces a retcon-proposal card that, if consumed, restores the firewall — does not silently resolve M-N entries.
4. Retcon-proposal card schema fidelity: emitted RP-NNNN-*.md cards satisfy SPEC-14 frontmatter shape end-to-end.

## Test Plan

### New/Modified Tests

1. `None — skill rewrite; verification is skill-dry-run + world-validate command-based; engine, validator, and MCP coverage exists per SPEC-03/SPEC-04/SPEC-02-PHASE2.`

### Commands

1. `cd tools/world-mcp && npm test` — confirm `search_nodes` / `get_neighbors` / `find_impacted_fragments` / `find_sections_touched_by` surface unchanged
2. `cd tools/validators && node dist/src/cli/world-validate.js animalia --json` — post-skill-rewrite world state passes all validators (audit records added but conform to schema)
3. Manual skill dry-run on animalia exercising all 8 audit categories. Manual review is the correct boundary because audit-category reasoning is semantic judgment, not a structural property.
