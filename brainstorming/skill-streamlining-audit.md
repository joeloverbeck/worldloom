# Skill Streamlining Audit (per-skill triage)

## Purpose

Audit one specific worldloom skill directory (target skill = `SKILL.md` + `references/*.md` + `templates/*`) for content that is redundant, contradictory, stale, or detrimental to the skill's current function — and produce a report telling the user what should be stripped, fixed, or consolidated.

The motivating use case: a skill underwent rework (phase additions, responsibility shifts, prose-render strip, schema renames) by editing in place rather than authoring from zero. The likely-but-not-certain residue is silent drift between the SKILL.md / references / templates, dead paragraphs left over from removed responsibilities, and parallel enumerations of content that now lives in a shared canonical source. The skill answers the user's question: *"In this one skill — what is genuinely load-bearing, what is dead weight, and what is actively wrong?"*

This pipeline does NOT ask:
- "Is the skill internally coherent across the whole family?" — that is `story-skill-internal-coherence`'s job (cross-family vocabulary / shared-schema drift / phase numbering across siblings).
- "Does the skill follow worldloom skill-authoring conventions?" — that is `skill-audit`'s job (skill quality, gaps, improvements against templates).
- "Is the skill too long?" — that is `skill-consolidate`'s job (regroup fragmented topics, improve readability).
- "Should this content move to references/?" — that is `skill-extract-references`'s job.

This pipeline DOES ask, **for one named skill at a time**:
- What content in this skill is genuinely required by the skill's current job?
- What content is cited from sibling skills (load-bearing externally and must not be removed)?
- What content is contradictory to itself, or to the SKILL.md's stated current contract?
- What content is a stale leftover from a removed responsibility?
- What content is duplicated within the skill (template + SKILL.md + reference) and could be single-sourced?
- What content is a janitorial nit (typos, vestigial annotations, opaque internal ticket refs)?

The deliverable is a **report**, not edits. The user reads the report and chooses whether to commission ticket creation as a separate step.

---

## Input

Required:
- `target_skill_path` — directory path of the target skill (e.g., `.claude/skills/branching-story-page-cycle/`). Pre-flight aborts if missing.

Optional:
- `sibling_skill_paths` — comma-separated list of sibling skill directories to cross-check for load-bearing citations. When omitted, the skill auto-detects sibling candidates from the target's `description` and SKILL.md "Consumes / Produces inputs for" Guardrails block, plus the explicit family list when the target's slug starts with a known family prefix (e.g., `branching-story-*` → page-cycle / bootstrap / page-prose-finalize / health-audit / storylet-pool-authoring / story-fact-promotion-to-canon).
- `rework_motivation` — free-form note from the user describing what rework the skill recently underwent (e.g., "post-prose-strip", "post-SPEC-13 atomic-source migration", "newly-added arc-trace extraction phase"). When present, the audit prioritizes drift patterns characteristic of that rework. When absent, the audit runs the full pattern catalog.
- `produce_tickets_on_approval` — boolean, default `false`. When `true`, after the user approves the report, the skill also drafts ticket files at `tickets/<PREFIX>-NNN.md` per finding tier and (when ticket count ≥3) a triage manifest at `docs/triage/YYYY-MM-DD-<target-slug>-audit-triage.md`. When `false` (default), the audit ends at the report and ticket creation is a separate user step.

---

## Output

The primary deliverable is the **audit report**, presented inline in the conversation (not a persisted file). Structure:

- **Scope of the audit** — files read by path, byte/line counts.
- **What is genuinely load-bearing (do NOT touch)** — a table mapping each "looks suspicious but isn't" file/section to its external citation site(s). Surfaces this BEFORE the findings list so the user can calibrate trust.
- **Findings, ordered by severity** — HIGH / MEDIUM / LOW with per-finding citations (file path + line number).
- **Things that are NOT redundant or detrimental** — explicitly enumerate things the audit checked and rejected, so the user knows the audit considered them.
- **Recommendations, ordered to bias toward least-risky-first** — the list the user can pick from.
- **Bottom-line** — one paragraph summarizing whether the skill is structurally sound and where the actual cleanup sites are.

When `produce_tickets_on_approval` is `true` and the user approves the report, additional outputs:
- `tickets/<PREFIX>-NNN.md` — one ticket per logical scope (HIGH findings each get their own; MEDIUM each get their own; LOW bundled as a single janitorial-sweep ticket). `<PREFIX>` is the skill's established ticket prefix when one exists in `archive/tickets/` (e.g., `BSBOOT` for branching-story-bootstrap, `BSPAGE` for page-cycle), else a new prefix derived from the skill slug.
- `docs/triage/YYYY-MM-DD-<target-slug>-audit-triage.md` — when ticket count ≥3, a manifest summarizing accepted/dismissed items, dismissal rationale, follow-up considerations, and tier-based implementation order.

---

## Phase 0: Pre-flight + Surface-Area Mapping

Establish what the audit is reading before any reading happens, so the operator can budget context.

### Resolve the target

- Normalize `target_skill_path`. Verify the directory exists and contains a `SKILL.md`. Abort if missing.
- Read the target's `SKILL.md` frontmatter `description` field to capture the skill's stated contract — used in Phase 4 to detect content that contradicts the description.

### Enumerate every file in the target

- List every file under `target_skill_path/` recursively. Record path, byte size, and (for `.md` files) the H1/H2 outline.
- Classify into: `SKILL.md` (single file), `references/*.md`, `templates/*` (any extension), and anything else (rare — flag if found).

### Resolve siblings

- When `sibling_skill_paths` is supplied, validate each exists.
- When not supplied, auto-detect:
  - parse the target's SKILL.md `## Guardrails` (or `governance-and-foundations.md` if extracted) for "Consumes / Produces inputs for" / "Sibling interop" rows.
  - if the target's slug starts with `branching-story-` OR is in {`storylet-pool-authoring`, `story-fact-promotion-to-canon`}, include the whole branching-story family as default siblings.
- Surface the resolved sibling set to the user as a sentence (e.g., `"Auto-detected siblings: page-cycle, bootstrap, finalize, health-audit, storylet-pool-authoring, story-fact-promotion-to-canon"`) so the user can correct before reading begins.

### Output: a single user-facing surface-area summary

Before any deep reading, emit:
```
Auditing: <target_skill_path>
Files in target: SKILL.md (N lines) + M reference files + K template files = total Y bytes
Resolved siblings: <list>
Rework context: <rework_motivation if supplied, else "none supplied">
```

This is the operator's anchor for the budget of the audit. Do NOT enter Phase 1 until this summary is emitted.

---

## Phase 1: Read Every File in the Target

The single most common reason an audit misses a finding is having read only `SKILL.md` and skipped a reference or template.

### Read discipline

- Read every file enumerated in Phase 0. Use parallel reads for batches of references/templates.
- For files larger than the Read tool's per-call limit, chunk via `offset` + `limit` until full coverage. Record the chunking in the per-file note so the audit trail reflects complete coverage.
- For each file, capture a short working note: what the file is, what claims/contracts it makes, what other files it explicitly cross-references.

### NEVER skip

- The SKILL.md HARD-GATE block (always load-bearing).
- The SKILL.md "Final Rule" / closing prose (often paraphrases the HARD-GATE — Phase 4 will judge whether the paraphrase adds value).
- Every `references/*.md` regardless of name (even short utility refs).
- Every `templates/*` regardless of extension (yaml, md, txt).

---

## Phase 2: Cross-Skill Load-Bearing Check

For each file/section in the target, determine whether anything OUTSIDE the target skill cites it by name. Externally-cited content is load-bearing across the pipeline and **must not** be recommended for removal even if it looks specific to this one skill.

### Greps to run

For each non-trivial file in the target:

```
grep -rn "<target-skill-slug>/<relative-path>" .claude/skills/ docs/ specs/
```

Also run a target-skill-wide citation sweep:

```
grep -rn "<target-skill-slug>" .claude/skills/ docs/ specs/ | grep -v "^<target-skill-path>"
```

Filter out matches from the target skill itself (citation in its own SKILL.md doesn't count). Catalog every external citation as a tuple `(citing_file, citing_line, cited_path_or_concept, reason_for_citation)`.

### Categories of load-bearing-by-citation

For each cited target-skill file, classify the citation:

1. **Schema authority** — citing skill declares the target's template/reference as the source of truth for a record class (e.g., `branching-story-bootstrap/templates/story-records.yaml` is cited as schema authority for shared classes from `branching-story-page-cycle/references/record-schemas.md`). **NEVER recommend removal**.
2. **Sub-routine contract** — citing skill invokes the target as a delegated sub-routine and the cited file defines the interface (e.g., bootstrap's `phase-6-storylet-pool-seed.md` is cited by storylet-pool-authoring as the source of `target_pool_size`). **NEVER recommend removal**.
3. **Cross-pipeline canonical reference** — citing skill defers to the cited file for a contract shared by multiple sibling skills (e.g., bootstrap's `engine-envelope-shape.md` is cited by storylet-pool-authoring AND page-cycle as the envelope-shape authority). **NEVER recommend removal** — but DO consider flagging the architecture (is the file located in the right skill?).
4. **Analogue reference** — citing skill names the target's file as the analogue for a parallel case (e.g., page-cycle's `phase-7-5-visible-affordance-extraction.md` cites bootstrap's same-named ref as the root-case analogue). **DO NOT recommend removal** — bidirectional citation indicates both files are load-bearing.
5. **By-design duplicate** — citing skill explicitly documents that the target's copy is deliberately maintained as a sibling (e.g., `content-policy.txt` copies across bootstrap / page-cycle / storylet-pool-authoring per `storylet-pool-authoring/references/governance-and-foundations.md`'s explicit "copied, not symlinked" rule). **DO NOT recommend removal**.

### Output of Phase 2

A table the audit report will lead with — "What is genuinely load-bearing (do NOT touch)" — with one row per externally-cited target-skill file and the citation evidence.

---

## Phase 3: Internal-Consistency Drift Scan

Identify contradictions within the target skill itself. Drift between SKILL.md / references / templates is the highest-severity finding class — it produces silent-failure runs.

### Drift patterns to scan for

1. **Numeric drift** — the SKILL.md HARD-GATE names N gates / N checks / N phases; references and templates enumerate fewer/more. Common in skills that gained gates or checks via incremental tickets where the templates were not updated. Cite the SKILL.md claim AND the drifted enumeration.

2. **Name drift** — the SKILL.md / references rename a key or gate (e.g., `state_snapshot_completeness` → `state_snapshot_integrity`); templates retain the stale name. Cite both names with file paths.

3. **Path drift after rework** — references mention a file path the skill no longer writes (e.g., post-prose-strip skills referring to `pages-prose/PG-NNNN.md` instead of `pages-prose-plans/PG-NNNN.md`). Cite the path against the SKILL.md's current write contract.

4. **Off-by-N enumeration** — a section says "N fields" then lists N+1 (or N-1). Common in `§18 Scene direction — AUTHOR-WRITTEN five fields:` followed by 6 items. Cite the count claim AND the actual count.

5. **Stale ticket refs / "(NEW)" markers** — content tagged `(NEW)` or `(post-<TICKET>-NNN)` from a prior implementation ticket that has since merged. These convey nothing to a reader of the current contract and risk implying the content is in draft.

6. **Phase-number drift** — references claim Phase X does something the SKILL.md Procedure section doesn't enumerate, or vice versa. Cite both.

### Output of Phase 3

Findings classified HIGH (numeric / name / path drift — concrete contradictions producing wrong behavior) or LOW (off-by-N / "(NEW)" / opaque ticket refs).

---

## Phase 4: Within-Skill Duplication Scan

Identify content duplicated across the target skill's own files (template + SKILL.md + reference, or reference + reference, or SKILL.md prose + Procedure section). Within-skill duplication is the second most common finding — usually MEDIUM severity, no correctness risk but creates future drift hazards and bloats the reader's attention budget.

### Duplication patterns to scan for

1. **Triple-documented yaml/policy block** — a yaml literal (e.g., `cadence_policy`) lives in `templates/<X>.md`, the same yaml plus its rationale appears in `SKILL.md` Phase N, AND the same yaml plus tone-derivation rules appears in `references/<Y>.md`. Cite all three sites.

2. **Parallel enumeration of shared-template content** — a reference re-describes the full body of a shared template (e.g., `_shared-templates/page-plan.md`) when it should describe only the delta over the shared template for this skill's specific case. Cite the shared template path AND the re-enumeration site.

3. **Process Flow diagram restating Procedure section** — SKILL.md ASCII process diagrams often re-describe the Procedure section's step-by-step list at a different level of detail. Not always actionable but worth flagging when the diagram exceeds N% of the SKILL.md's line count (suggested threshold: ~30%).

4. **Final Rule / closing-prose paraphrase of HARD-GATE** — closing sections that rhetorically restate the HARD-GATE conditions. Easy to read past, but a maintenance liability if the HARD-GATE conditions change.

5. **Same justification paragraph in multiple files** — a single rationale (e.g., "no word-count fields because commit b28aead...") restated verbatim in template comments + SKILL.md prose + reference text. Cite all instances.

### Output of Phase 4

Findings classified MEDIUM with per-finding citations and a single-source recommendation (which of the duplicated sites should be the canonical home).

---

## Phase 5: Anti-Pattern Negative Catalog

Explicitly check items that **look** like candidates for removal but typically are not. Surfacing the negative catalog in the report tells the user the audit considered these and rejected them — building user trust in the positive findings.

### Standard negative catalog (apply to every audit)

- **`templates/content-policy.txt`** (or equivalent NC-21 block). Deliberately copied across sibling skills. **Keep.**
- **HARD-GATE block in SKILL.md.** Load-bearing per skill discipline. **Keep.**
- **`templates/<X>-records.yaml`** schema-authority templates cited by sibling references. **Keep.**
- **Engine envelope / patch plan reference files** cited by ≥2 sibling skills. **Keep.** (Architecture question of location is separate from removal.)
- **Phase reference files that look bulky** but encode load-bearing operational discipline (e.g., per-class validator gate tables). **Keep** — verbosity is a feature when it prevents silent failures.

### Output of Phase 5

A short "Things that are NOT redundant or detrimental" block in the report enumerating items the audit considered and judged load-bearing. One line per item with the reason.

---

## Phase 6: Severity-Classify Findings

Apply the HIGH / MEDIUM / LOW taxonomy.

### HIGH — correctness / contradiction / drift

- Numeric drift (gate counts, check counts, field counts that disagree across the skill).
- Name drift (gates / fields / paths renamed in one place but not another).
- Path drift after rework (stale paths to files the skill no longer writes).
- Anything else that would cause a faithful implementation of the current SKILL.md to fail because a template or reference contradicts it.

### MEDIUM — redundancy / duplication

- Triple-documented policy blocks (template + SKILL.md + reference).
- Parallel enumerations of shared-template content.
- Same justification appearing verbatim in multiple files.

### LOW — nits / polish

- Off-by-N enumeration counts ("five fields" then 6).
- Vestigial "(NEW)" / "(post-<TICKET>-NNN)" annotations.
- Opaque internal ticket references with no semantic content.
- Stylistic inconsistencies in templates (e.g., yaml-vs-prose mid-value syntax).
- Minor arithmetic mismatches in approximate-count statements.

### Output of Phase 6

The report's ordered findings list. HIGH first, MEDIUM second, LOW last. Per finding: file path, line number(s), the contradiction or duplication, citation of the canonical source.

---

## Phase 7: Recommendations + Bottom-Line

Translate findings into a recommendation list ordered to bias toward least-risky-first.

### Recommendation order convention

1. HIGH findings first — they're correctness fixes, smallest blast radius.
2. MEDIUM findings second — restructure / single-source. Larger edits but no contract change.
3. LOW findings last — bundle as one janitorial sweep.

### Bottom-line paragraph

One paragraph telling the user whether the skill is structurally sound. Anchor on:
- "Nothing should be deleted wholesale" vs "Wholesale rework recommended" — the user's biggest decision.
- Where the actual cleanup sites are concentrated (templates vs references vs SKILL.md).
- Whether the post-rework state has cosmetic vs concrete drift.

---

## Phase 8: HARD-GATE Approval

Present the report to the user. Wait for explicit approval before any further action.

- The audit report is a chat-only deliverable; nothing is written to disk at Phase 7 output.
- User options:
  - **ACCEPT-and-create-tickets** → proceed to Phase 9 (requires `produce_tickets_on_approval: true` to have been set, or explicit reconfirmation).
  - **ACCEPT-report-only** → end the run. User will commission specific edits later via separate steps.
  - **REVISE-narrow** → user directs the audit to re-scan a specific area or to relax a severity classification. Loop back to the relevant phase.
  - **REJECT** → end the run with no further action.

The HARD-GATE is absolute under Auto Mode — invoking the skill is not approval of the report.

---

## Phase 9 (Conditional): Ticket Generation

Only runs when `produce_tickets_on_approval: true` AND the user explicitly chose ACCEPT-and-create-tickets.

### Per-finding-tier ticket allocation

- Each HIGH finding → its own ticket (correctness fixes are independently mergeable).
- Each MEDIUM finding → its own ticket (different files, different reviewers).
- All LOW findings → bundled into one janitorial-sweep ticket.

### Ticket prefix resolution

- Check `archive/tickets/` and `tickets/` for an existing prefix associated with the target skill (e.g., `BSBOOT-` for branching-story-bootstrap, `BSPAG-` / `BSPAGE-` for page-cycle, `STPOOL-` for storylet-pool-authoring).
- Allocate the next number after the highest existing number (active + archived).
- When no existing prefix is found, derive one from the skill slug (uppercase letters of slug words, ≤8 chars) and start at `001`.

### Ticket content discipline

Every generated ticket must follow `tickets/_TEMPLATE.md` and include:
- Problem statement citing the audit finding by severity and the canonical source.
- Assumption Reassessment with exact file paths + line numbers from the audit.
- Architecture Check — usually one paragraph confirming the fix is a correctness sync or single-source consolidation, not a contract change.
- Files to Touch — exact paths.
- Acceptance Criteria with grep-proof commands when the finding is amenable to grep verification (most HIGH findings are).
- Test Plan with the verification commands the audit recommends.

### Triage manifest (when N ≥ 3)

Write `docs/triage/YYYY-MM-DD-<target-slug>-audit-triage.md` with:
- Source (which audit, which target skill).
- Decision summary (one paragraph).
- Accepted items table with ticket links and severity.
- Dismissed items table when applicable (audit findings the user explicitly chose not to action).
- Follow-up considerations (parallel work in sibling skills, deferred architecture questions).
- Implementation order recommendation by tier.

### Output of Phase 9

- N ticket files at `tickets/<PREFIX>-NNN.md`.
- Optionally one triage manifest at `docs/triage/`.

---

## Validation

Per audit run, record PASS with a one-line rationale for each gate. A bare PASS without rationale is treated as FAIL per worldloom skill discipline.

1. **Surface-area completeness** — every file under `target_skill_path/` is in the Phase 1 read log.
2. **Sibling cross-check completeness** — every non-trivial target-skill file appears in the Phase 2 citation catalog with either an external citation cataloged or an explicit "no external citations found" note.
3. **Drift scan completeness** — Phase 3 ran every pattern in the catalog and either reported a finding or stated "no occurrences".
4. **Duplication scan completeness** — Phase 4 ran every pattern in the catalog likewise.
5. **Negative catalog applied** — Phase 5 explicitly listed standard negative-catalog items and judged each.
6. **Severity-classify discipline** — every finding has a HIGH / MEDIUM / LOW tag and the report orders findings by tier.
7. **Citation discipline** — every finding cites at least one file path and line number (or "around line X" when the finding spans a block).
8. **No edits without approval** — no file write occurred before the user explicitly accepted in Phase 8. Mandatory check; FAIL halts.

---

## Notes

### Why a report-first, tickets-second deliverable

The session that motivated this skill produced a clear pattern: the user wanted to understand the audit BEFORE deciding what to fix. Auditing and fixing are different cognitive acts. A skill that goes straight to edits forces the user to either trust the audit blindly (risky for HIGH-severity gate-count changes) or reverse-engineer the audit from the edits.

The report-first surface gives the user a calibration moment. The optional `produce_tickets_on_approval` flag lets the user opt in to ticket generation in the same run when they want it.

### Why severity-classify rather than just listing findings

The HIGH / MEDIUM / LOW taxonomy maps cleanly to:
- Ticket priority.
- Implementation order (correctness first, polish last).
- User decision-making — HIGH items are usually accepted on sight; MEDIUM items get reviewed; LOW items are picked up as drive-by sweeps.

A flat findings list forces the user to do this triage themselves.

### Why the negative catalog matters

In the session that motivated this skill, three reference files (`engine-envelope-shape.md`, `templates/story-records.yaml`, `references/phase-6-storylet-pool-seed.md`) initially looked like obvious removal candidates — each is large, each is "labelled bootstrap-specific". A naive audit would have recommended stripping them. The Phase 2 cross-skill citation sweep revealed they're cited by name from storylet-pool-authoring and page-cycle as canonical authorities. Removing them would have broken the pipeline.

Surfacing the negative catalog in the report tells the user the audit checked and rejected those candidates — building trust in the positive findings AND preventing the user from reflexively asking "did you check X?".

### Family scope

The first batch of intended targets is the branching-story family: `branching-story-page-cycle`, `branching-story-page-prose-finalize`, `branching-story-health-audit`, `storylet-pool-authoring`, `story-fact-promotion-to-canon`. The skill is parameterized on `target_skill_path` so it generalizes to any worldloom skill, but the auto-sibling-detection logic and the negative catalog are tuned for the story family. Targets outside the story family (e.g., `canon-addition`, `create-base-world`) work but will need user-supplied `sibling_skill_paths`.

### Relationship to existing meta-skills

- `skill-audit` — different question (skill quality vs streamlining). Compatible: run skill-audit first to find gaps, then this skill to find dead weight.
- `skill-consolidate` — different action (regroup vs strip). Compatible: this skill identifies what to strip; skill-consolidate then regroups what remains.
- `skill-extract-references` — different action (extract bloated content into references/). Compatible: run this skill first to verify the content is worth keeping at all; if yes, then skill-extract-references for layout.
- `story-skill-internal-coherence` — different scope (cross-family vs per-skill). Compatible: this skill catches single-skill drift; that skill catches drift across the family. Run both for a full pass.

### Worktree discipline

If invoked inside a git worktree, all file paths resolve from the worktree root. The skill writes only to `tickets/` and `docs/triage/` during Phase 9 — never to `worlds/<slug>/`, `_source/`, the target skill directory, or any sibling skill directory. Edits to the audited skill are the USER's job after the audit, via the tickets the audit generates.

### Do NOT commit to git

Phase 9 writes land in the working tree only. The user reviews the diff and commits.
