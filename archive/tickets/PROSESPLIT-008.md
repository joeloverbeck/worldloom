# PROSESPLIT-008: prose_status awareness in sibling skills (health-audit, story-fact-promotion-to-canon, storylet-pool-authoring)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — three sibling skills' SKILL.md and selected references updated. No new patch-engine ops, no schema changes, no validator changes.
**Deps**: PROSESPLIT-002 (PG schema field `prose_status` must exist), PROSESPLIT-006 + PROSESPLIT-007 (the rework that introduces `prose_status: pending` PG records — sibling skills can land their awareness changes after the producers, since pre-rework PG records have no `prose_status` and grandfather as if rendered).

## Problem

Three sibling skills currently read `pages-prose/PG-*.md` as a primary input, assuming every PG record has rendered prose:

1. **`branching-story-health-audit`** — reads all in-scope `pages-prose/PG-*.md` for prose-ledger-consistency, mystery-firewall-vs-prose, repetition / similar-scene clustering, and content-intensity drift checks. Under the rework, pages with `prose_status: pending` have no rendered prose; audit's prose-coupled findings would fail with confusing missing-file errors.
2. **`story-fact-promotion-to-canon`** — reads `pages-prose/PG-*.md` for supporting evidence excerpts in the proposal package. Canon promotion legitimately requires prose evidence; under the rework, citing a `pending` page as evidence is invalid.
3. **`storylet-pool-authoring`** — pre-flight reads "last ~10 `pages-prose/PG-NNNN.md` along the longest active branch_path" for context when authoring new storylets. Under the rework, pages with `prose_status: pending` cannot contribute prose context.

Each skill needs a `prose_status` filter. The three skills have different correct postures:

- **health-audit**: graceful degradation — filter to rendered, exclude pending from prose-coupled checks, surface a `pending_prose_count` informational finding.
- **story-fact-promotion-to-canon**: HARD block — abort if any cited evidence page has `prose_status != "rendered"`.
- **storylet-pool-authoring**: graceful degradation — read what's rendered, fall back to STORY_KERNEL alone when zero rendered pages exist.

This ticket updates all three skills with their correct prose_status posture.

## Assumption Reassessment (2026-05-10)

1. `branching-story-health-audit` SKILL.md at `.claude/skills/branching-story-health-audit/SKILL.md` (verified). Reads `pages-prose/PG-*.md` per SKILL.md line 180: "for every in-scope page — direct Read. Used by Phase 5 repetition + similar-scene clustering, by Phase 3 mystery-firewall-vs-prose and prose-ledger consistency checks, and by Phase 4 content-intensity drift signals."
2. `branching-story-health-audit/templates/story-audit-report.md` line 93 documents the `prose_ledger_consistency` finding shape including "page id, short prose excerpt, missing or violated state anchor, and recommended remediation". Under the rework, this finding type only fires on rendered pages.
3. `story-fact-promotion-to-canon` SKILL.md at `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (verified). Reads `pages-prose/PG-*.md` per SKILL.md line 249: "Capture supporting prose excerpts from `worlds/<world-slug>/stories/<story-slug>/pages-prose/PG-*.md`" and line 271: "Load `pages-prose/PG-<source_page_id>.md`; this prose is the proposal_package's supporting excerpt." `templates/proposal-package.yaml` line 83 includes `<quoted snippet from pages-prose/PG-0007.md establishing the source>`.
4. `storylet-pool-authoring` references `pages-prose/` per `references/pre-flight-and-prerequisites.md` line 72: "Direct Read of last ~10 `pages-prose/PG-NNNN.md` files along the longest active branch_path (in branch_path order; most-recent last)." This is the only reference site in storylet-pool-authoring that consumes rendered prose.
5. `storylet-pool-authoring/templates/storylet-record.yaml` line 201 mentions "execution_envelope: # what governs prose render under this commitment" and line 210 mentions "style_directives: # prose-craft hints; non-validator-bound" — these are storylet-record schema fields, not consumers of rendered prose. NO change needed in this ticket.
6. `storylet-pool-authoring/templates/predicate-dsl.md` line 232 mentions `forbidden_mystery_resolution_risk` and line 243 mentions `max_words_reached` — predicate DSL semantics, not consumers of rendered prose. NO change needed.
7. PG.prose_status field is added by PROSESPLIT-002. Sibling skills read it via direct YAML parse of the PG record's frontmatter, or via the world-index query layer if available. Verified the world-mcp `get_record` tool returns full record bodies — sibling skills can use it to read prose_status.
8. Cross-skill / cross-artifact boundary under audit: the three skills' boundary is `pages-prose/PG-*.md` consumption. The boundary contract changes: a page may now legitimately have NO prose file (pending status). Each skill's posture (degrade-gracefully vs hard-block) reflects whether prose is structurally required for that skill's output.
9. FOUNDATIONS principles under audit:
   - Rule 6 (No Silent Retcons) — relevant to story-fact-promotion-to-canon: promoting a story-fact to world canon REQUIRES prose evidence per FOUNDATIONS §Default Reality. Hard-blocking when evidence pages are pending preserves Rule 6.
   - Rule 1 (No Cosmetic Output) — relevant to health-audit: producing audit findings against missing prose would be cosmetic noise. Filtering out pending pages keeps audit findings load-bearing.
10. Schema extension classification: not applicable — this ticket consumes the PG schema field added in PROSESPLIT-002 but does not modify the schema.
11. HARD-GATE semantics: story-fact-promotion-to-canon's existing HARD-GATE for canon promotion is preserved; the new pre-flight `prose_status` check tightens (not relaxes) the gate's preconditions. health-audit and storylet-pool-authoring HARD-GATE semantics unchanged.
12. Adjacent contradictions: health-audit currently emits a `prose_ledger_consistency` finding type with severity-bearing classification. Under the rework, this finding only fires on rendered pages — pending pages produce a NEW informational finding type `pending_prose_count` (not severity-bearing). This is additive: no existing finding behavior changes for rendered pages.

## Architecture Check

1. Three different postures (degrade vs hard-block vs degrade) map cleanly to the three skills' structural needs. Health-audit's job is auditing what exists; pending pages legitimately don't yet exist as prose. Story-fact-promotion's job is citing rendered evidence for canon promotion; pending evidence is not evidence. Storylet-pool-authoring's job is informing future storylet authoring with continuity context; partial continuity is better than none.
2. `pending_prose_count` as an informational finding (not severity-bearing) gives audit reports visibility into how many pages are in plan-only state without polluting the severity histogram.
3. Hard-blocking story-fact-promotion-to-canon when evidence is pending forces the user to finalize first. This preserves the FOUNDATIONS contract: world-canon mutation requires prose evidence.
4. No backwards-compatibility shims. Pre-rework bundles' PG records lack `prose_status`; sibling skills treat missing field as `"rendered"` to preserve grandfathered behavior.
5. Alternative considered: emit an audit finding with severity LOW when prose-ledger-consistency cannot run because prose is pending. Rejected because severity-bearing implies "something might be wrong" — pending prose is not wrong, it's the expected post-rework state of every page that hasn't been finalized yet.

## Verification Layers

1. health-audit pre-flight filters in-scope `pages-prose/PG-*.md` to `prose_status: rendered` → grep-proof in SKILL.md / pre-flight reference; skill dry-run shows audit report's prose_ledger_consistency findings only on rendered pages.
2. health-audit emits `pending_prose_count` informational finding → grep-proof in templates/story-audit-report.md or SKILL.md; skill dry-run shows the finding when ≥1 in-scope page is pending.
3. story-fact-promotion-to-canon pre-flight aborts when ≥1 cited evidence page has `prose_status != "rendered"` → grep-proof in SKILL.md / pre-flight reference; skill dry-run with a pending page in evidence list aborts with the directive message.
4. storylet-pool-authoring pre-flight filters its 10-page read set to rendered → grep-proof in `references/pre-flight-and-prerequisites.md`; skill dry-run on a fresh post-rework bundle (zero rendered pages) succeeds with STORY_KERNEL-only fallback and warning recorded in batch provenance.
5. Pre-rework bundles (no `prose_status` field on PG records) continue to work in all three skills as-if `rendered` → manual review of grandfathering logic; skill dry-run on a pre-rework fixture succeeds without changes in behavior.
6. FOUNDATIONS Rule 6 alignment → manual review: story-fact-promotion-to-canon's hard-block preserves "world-canon mutation requires prose evidence."

## What to Change

### 1. Update `branching-story-health-audit` SKILL.md and references

#### 1a. SKILL.md changes

- Pre-flight section (where `pages-prose/PG-*.md` is read): add filter clause "filter to PG records with `prose_status: rendered` (treat missing field as rendered for pre-rework grandfathered bundles); pages with `prose_status: pending` are tracked separately and excluded from prose-coupled checks."
- Phase 3 (mystery firewall vs prose): note "operates only on rendered pages."
- Phase 5 (repetition + similar-scene clustering): note "operates only on rendered pages."
- Phase 4 (content-intensity drift): note "operates only on rendered pages."
- Add new finding type `pending_prose_count` to the audit report shape — informational, not severity-bearing. Reports the count of pending pages and lists their PG-NNNN ids.

#### 1b. `templates/story-audit-report.md` changes

- Add a "Coverage" section that documents:
  - Total pages in scope
  - Rendered pages count
  - Pending pages count (with PG-NNNN list)
- The `pending_prose_count` finding format: short, informational, no severity tier.
- `prose_ledger_consistency` findings now appear ONLY for rendered pages; this is documented in the finding format prose.

#### 1c. `examples/sau-mixed-severity.md` (if relevant)

- Optional: add a worked example of the `pending_prose_count` finding. Implementation discretion.

### 2. Update `story-fact-promotion-to-canon` SKILL.md and references

#### 2a. SKILL.md changes

- Pre-flight section: add hard-block check:
  ```
  For every PG-NNNN cited as supporting evidence in the proposal package
  (proposal_package.supporting_evidence[]):
    Read PG record from worlds/<world-slug>/stories/<story-slug>/_source/pages/PG-NNNN.yaml.
    If PG.prose_status != "rendered" (and the field is present):
      ABORT with message:
        "Cannot promote SF-NNNN to canon — supporting evidence page <PG-NNNN>
        has prose_status=<status>. Run branching-story-page-prose-finalize on
        the pending page(s) before re-running canon promotion."
  ```
- Note Rule 6 alignment in the existing FOUNDATIONS Alignment table.

#### 2b. `templates/proposal-package.yaml` changes

- No structural change. The existing `<quoted snippet from pages-prose/PG-0007.md establishing the source>` placeholder remains valid; the pre-flight check ensures the cited page is rendered before this template field is populated.

#### 2c. `examples/sf-promotion-example.md` changes

- Optional: update example narrative to reference rendered pages explicitly, or add a note about the pre-flight check. Implementation discretion.

### 3. Update `storylet-pool-authoring` references

#### 3a. `references/pre-flight-and-prerequisites.md` line 72 changes

- Update the "Direct Read of last ~10 `pages-prose/PG-NNNN.md` files" instruction to:
  ```
  Direct Read of last ~10 `pages-prose/PG-NNNN.md` files along the longest
  active branch_path, FILTERED to pages with `prose_status: rendered`
  (treat missing field as rendered for pre-rework grandfathered bundles).
  If fewer than 10 rendered pages exist along the branch, read what's
  available. If zero rendered pages exist (a freshly bootstrapped bundle
  whose PG-0001 has not been finalized yet), fall back to STORY_KERNEL.md
  context alone, with a warning recorded in the storylet batch's provenance:
    "storylet_pool_authoring_warning: zero rendered pages available;
    falling back to STORY_KERNEL.md only. Authored storylets may benefit
    from re-evaluation once early pages are finalized."
  ```

#### 3b. SKILL.md changes (if needed)

- Implementation discretion: if SKILL.md describes the pre-flight read set in narrative form, update to match the reference.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/templates/story-audit-report.md` (modify)
- `.claude/skills/branching-story-health-audit/examples/sau-mixed-severity.md` (modify — optional)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify)
- `.claude/skills/story-fact-promotion-to-canon/examples/sf-promotion-example.md` (modify — optional)
- `.claude/skills/storylet-pool-authoring/references/pre-flight-and-prerequisites.md` (modify)
- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify — only if pre-flight read set is described in SKILL.md narrative)

## Out of Scope

- Bootstrap and page-cycle changes. Covered in PROSESPLIT-006 / PROSESPLIT-007.
- Finalize skill. Covered in PROSESPLIT-005.
- Documentation cascade (CLAUDE.md, WORKFLOWS.md, etc.). Covered in PROSESPLIT-009.
- Validator changes. Covered in PROSESPLIT-004.
- Adding `prose_status` filtering to `branching-story-bootstrap` or `branching-story-page-cycle` themselves (those skills produce, they don't audit-consume).
- Touching `storylet-pool-authoring/templates/storylet-record.yaml` or `templates/predicate-dsl.md` (no rendered-prose consumption there).
- Adding a new audit finding-tier semantic for "incomplete bundle" (the informational `pending_prose_count` finding is sufficient).

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n "prose_status: rendered|prose_status == .rendered.|filter to .* rendered" .claude/skills/branching-story-health-audit/` matches.
2. `rg -n "pending_prose_count" .claude/skills/branching-story-health-audit/` matches in SKILL.md and templates/story-audit-report.md.
3. `rg -n "prose_status != .rendered.|Cannot promote.*pending" .claude/skills/story-fact-promotion-to-canon/SKILL.md` matches.
4. `rg -n "FILTERED to pages with .prose_status: rendered.|zero rendered pages|fall back to STORY_KERNEL" .claude/skills/storylet-pool-authoring/references/pre-flight-and-prerequisites.md` matches.
5. health-audit dry-run on a fixture bundle with 3 pages (1 rendered, 2 pending): audit report includes `pending_prose_count: 2` finding; `prose_ledger_consistency` findings only fire on the rendered page.
6. story-fact-promotion-to-canon dry-run on a fixture bundle citing a pending page as evidence: pre-flight aborts with the directive message.
7. storylet-pool-authoring dry-run on a fresh fixture bundle (zero rendered pages): pre-flight succeeds with STORY_KERNEL-only fallback and provenance warning.
8. Pre-rework fixture (PG records lacking `prose_status`) — all three skills behave identically to current production behavior (grandfathered as rendered).

### Invariants

1. health-audit `prose_ledger_consistency` findings never fire on `prose_status: pending` pages.
2. health-audit's `pending_prose_count` is informational, not severity-bearing.
3. story-fact-promotion-to-canon refuses to promote when ≥1 cited evidence page is pending.
4. storylet-pool-authoring NEVER aborts on missing rendered prose; it always degrades gracefully.
5. All three skills treat missing `prose_status` field (pre-rework grandfathered case) as `"rendered"` to preserve historical behavior.
6. The audit-finding tier definitions in health-audit are not changed; the new finding is in a separate informational tier.

## Test Plan

### New/Modified Tests

1. None — skill-prose-only ticket; verification is grep + skill dry-run + manual review.

### Commands

1. `rg -n "prose_status" .claude/skills/branching-story-health-audit/ .claude/skills/story-fact-promotion-to-canon/ .claude/skills/storylet-pool-authoring/`
2. `rg -n "pending_prose_count" .claude/skills/branching-story-health-audit/`
3. `rg -n "Cannot promote.*pending|prose_status != .rendered." .claude/skills/story-fact-promotion-to-canon/`
4. `rg -n "fall back to STORY_KERNEL|zero rendered pages" .claude/skills/storylet-pool-authoring/`
5. Skill dry-runs against test fixtures (exact commands verified at implementation time).
