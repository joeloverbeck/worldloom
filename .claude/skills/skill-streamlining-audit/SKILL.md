---
name: skill-streamlining-audit
description: "Use when auditing one specific worldloom skill directory (target = SKILL.md + references/*.md + templates/*) for content that is redundant, contradictory, stale, or detrimental to the skill's current function — and producing a chat-only severity-classified report telling the user what should be stripped, fixed, or consolidated. Produces: a chat-only audit report (always), and on the ACCEPT-and-create-tickets path, ticket files at tickets/<PREFIX>-NNN-<slug>.md (one per HIGH finding, one per MEDIUM, one bundled janitorial-sweep for all LOW) plus, when ticket count ≥3, a triage manifest at docs/triage/YYYY-MM-DD-<target-slug>-audit-triage.md. Mutates: only tickets/ and docs/triage/ on user approval (never worlds/<slug>/, _source/, the target skill directory, sibling skill directories, docs/FOUNDATIONS.md, or tools/)."
user-invocable: true
arguments:
  - name: target_skill_path
    description: "Directory path of the target skill (e.g., `.claude/skills/branching-story-page-cycle`). The path is the audit entry point; Pre-flight aborts if the directory does not exist or does not contain a `SKILL.md`."
    required: true
  - name: sibling_skill_paths
    description: "Comma-separated list of sibling skill directories to cross-check for load-bearing citations. When omitted, the skill auto-detects sibling candidates from the target's frontmatter `description` and SKILL.md `Consumes / Produces inputs for` Guardrails block, plus the family-prefix default when the target's slug starts with `branching-story-` or matches the story-pipeline family."
    required: false
  - name: rework_motivation
    description: "Free-form note from the user describing what rework the skill recently underwent (e.g., `post-prose-strip`, `post-SPEC-13 atomic-source migration`, `newly-added arc-trace extraction phase`). When present, the audit prioritizes drift patterns characteristic of that rework. When absent, the audit runs the full pattern catalog uniformly."
    required: false
  - name: produce_tickets_on_approval
    description: "Boolean, default `false`. When `true`, after the user approves the report at Phase 8, the skill also drafts ticket files at `tickets/<PREFIX>-NNN-<slug>.md` per finding tier and (when ticket count ≥3) a triage manifest at `docs/triage/YYYY-MM-DD-<target-slug>-audit-triage.md`. When `false` (default), the audit ends at the report and ticket creation is a separate user step."
    required: false
---

# Skill Streamlining Audit

Audit one worldloom skill directory for redundant, contradictory, stale, or detrimental content; produce a chat-only severity-classified report with optional ticket emission on user approval.

<HARD-GATE>
Do NOT Edit / Write any file under `tickets/` or `docs/triage/` until ALL 5 of the following hold:

- **(a)** Pre-flight has loaded `docs/FOUNDATIONS.md`, validated `target_skill_path` resolves to a readable directory containing `SKILL.md`, enumerated every file under the target via `Glob`, and (when `produce_tickets_on_approval: true`) verified `tickets/_TEMPLATE.md` exists and is readable.

- **(b)** Phases 1-7 have completed:
  - Phase 1 reads every file in the target;
  - Phase 2 catalogs cross-skill load-bearing citations;
  - Phases 3-4 detect drift and within-skill duplication findings;
  - Phase 5 vets the negative catalog;
  - Phase 6 severity-classifies every finding (HIGH/MEDIUM/LOW with a one-line rationale per FOUNDATIONS skill discipline — bare severity is FAIL);
  - Phase 7 produces the report's recommendation list and bottom-line paragraph.

- **(c)** Phase 7 self-check passes for every finding:
  - severity carries a one-line rationale;
  - every finding cites at least one `file:line` anchor;
  - every load-bearing-by-citation item in the negative catalog is judged against Phase 2 citation evidence;
  - the report's "Things that are NOT redundant or detrimental" block enumerates considered-and-kept items so the user can verify the audit checked them.

- **(d)** Phase 8 has presented the chat-only audit report AND the user has explicitly chosen one of:
  - ACCEPT-and-create-tickets (requires `produce_tickets_on_approval: true` to have been set, or in-band reconfirmation);
  - ACCEPT-report-only;
  - REVISE-narrow (loops back to the relevant phase before re-entering Phase 8);
  - REJECT (ends the run).

- **(e)** On the ACCEPT-and-create-tickets path only: Phase 9 has:
  - resolved the ticket prefix via `archive/tickets/` + `tickets/archived/` + `tickets/` lookup;
  - allocated the next free `<PREFIX>-NNN` integer per-tier;
  - planned one ticket write per HIGH finding + one per MEDIUM finding + one bundled janitorial-sweep ticket for all LOW findings;
  - (when ticket count ≥3) planned the triage-manifest write.

This gate is authoritative under Auto Mode or any other autonomous-execution context — invoking this skill does not constitute approval of the report or the ticket batch. The skill may only proceed to Phase 9 (Ticket Generation) once every gate condition above holds simultaneously.
</HARD-GATE>

## Process Flow

```
Pre-flight Check (load docs/FOUNDATIONS.md; validate target_skill_path;
                  enumerate target files; verify supporting files when
                  produce_tickets_on_approval=true; abort on missing
                  target SKILL.md or unreadable supporting file)
      |
      v
Phase 0: Surface-Area Mapping       (read target SKILL.md frontmatter
                                     description; classify every file
                                     under target; resolve sibling
                                     candidates; emit surface-area summary)
      |
      v
Phase 1: Read Every File in Target  (parallel reads of all enumerated
                                     files; chunk via offset/limit on
                                     oversize; per-file working notes
                                     on claims/contracts/cross-refs;
                                     emits zero findings)
      |
      v
Phase 2: Cross-Skill Load-Bearing   (grep .claude/skills/, docs/, specs/
         Check                       for citations of target files;
                                     classify into Schema authority /
                                     Sub-routine contract / Cross-pipeline
                                     canonical reference / Analogue
                                     reference / By-design duplicate;
                                     emit negative-catalog protection list)
      |
      v
Phase 3: Internal-Consistency      (six patterns: Numeric drift / Name
         Drift Scan                  drift / Path drift / Off-by-N
                                     enumeration / Stale ticket refs /
                                     Phase-number drift — each emits a
                                     finding or "no occurrences")
      |
      v
Phase 4: Within-Skill Duplication  (five patterns: Triple-documented
         Scan                        blocks / Parallel shared-template
                                     enumeration / Process Flow restating
                                     Procedure / Final Rule paraphrasing
                                     HARD-GATE / Verbatim justification
                                     duplication)
      |
      v
Phase 5: Anti-Pattern Negative     (content-policy.txt / HARD-GATE block /
         Catalog                     schema-authority templates / engine
                                     envelope refs / verbose-but-load-
                                     bearing phase refs — judge each
                                     against Phase 2 citation evidence)
      |
      v
Phase 6: Severity-Classify         (allocate F-NN per finding; HIGH =
         Findings                    correctness/contradiction/drift;
                                     MEDIUM = redundancy/duplication;
                                     LOW = nits/polish; every finding
                                     carries a one-line severity rationale)
      |
      v
Phase 7: Recommendations +         (ordered list HIGH->MEDIUM->LOW for
         Bottom-Line                 least-risk-first sequencing; one-
                                     paragraph bottom-line; self-check
                                     enforces severity rationale, file:line
                                     anchoring, negative-catalog completeness)
      |
      v
Phase 8: HARD-GATE Presentation +  (emit chat-only audit report; user
         User Disposition            disposition: ACCEPT-and-create-tickets
                                     / ACCEPT-report-only / REVISE-narrow
                                     (loops back) / REJECT)
      |
      +-- [HARD-GATE fires here -- see top of skill]
      |
      v
Phase 9: Ticket Generation         (CONDITIONAL: only when produce_tickets_
         (Conditional)               on_approval=true AND user chose
                                     ACCEPT-and-create-tickets; resolve
                                     prefix; per-tier allocation; write
                                     tickets/<PREFIX>-NNN-<slug>.md; write
                                     docs/triage/<date>-<target-slug>-
                                     audit-triage.md when ticket count
                                     >=3; report paths written; do NOT
                                     git commit)
```

## Inputs

### Required
- `target_skill_path` — string — directory path of the target skill (e.g., `.claude/skills/branching-story-page-cycle`). Pre-flight aborts on missing directory or absent `SKILL.md`.

### Optional
- `sibling_skill_paths` — comma-separated string — explicit sibling skill directories to cross-check for load-bearing citations. When omitted, auto-detected per Phase 0.
- `rework_motivation` — string — free-form note describing the rework the skill recently underwent (e.g., `post-prose-strip`, `post-SPEC-13 atomic-source migration`). When present, drift-pattern weighting prioritizes patterns characteristic of that rework.
- `produce_tickets_on_approval` — boolean — default `false`. When `true`, gates Phase 9 ticket writes behind the user's Phase 8 disposition.

## Output

| Class | Surface | Created when |
|---|---|---|
| Audit report (Scope / Load-bearing-do-not-touch / Findings-by-tier / Things-not-redundant / Recommendations / Bottom-line / Summary) | (chat only — emitted at Phase 8 before HARD-GATE fires) | Always |
| Ticket file | `tickets/<PREFIX>-NNN-<slug>.md` against `tickets/_TEMPLATE.md` | IF `produce_tickets_on_approval=true` AND user chose ACCEPT-and-create-tickets — one per HIGH finding, one per MEDIUM finding, one bundled janitorial-sweep ticket for all LOW findings |
| Triage manifest | `docs/triage/YYYY-MM-DD-<target-slug>-audit-triage.md` | IF ticket count ≥3 on the ACCEPT-and-create-tickets path |

The skill emits no Canon Fact Records, no Change Log Entries, no adjudication records, no audit-report files on disk by default, no records under `worlds/<slug>/`, no edits to the target skill directory, and no edits to sibling skill directories. The git diff after Phase 9 (when reached) is the durable audit trail (the user reviews via `git diff` before commit).

## World-State Prerequisites

This skill operates at **pipeline scope, not world scope**. It reads under `.claude/skills/<target>/`, optionally under `.claude/skills/<sibling>/` directories for Phase 2 citation greps, and `docs/`; it does NOT read `worlds/<slug>/`, `tools/`, or any non-target / non-sibling subtree by default. Per FOUNDATIONS §Tooling Recommendation (the §"non-negotiable" mandatory-read clause as it applies to pipeline-level meta-tooling — parallel to `mcp-integration-audit` and `story-skill-internal-coherence`):

- `docs/FOUNDATIONS.md` — light read at Pre-flight; Validation Rule 6 (No Silent Retcons) governs the Phase 9 ticket-attribution discipline (each ticket explicitly names the audit finding by `F-NN` ID and canonical source — never a silent edit). Skip if already in context, **explicitly naming the load mechanism in the skip announcement** (e.g., *"FOUNDATIONS already in context via direct Read at message N"*, *"via `<sibling-skill>`'s pre-flight at message N which executed the Read"*, *"via system-reminder injection at message N reproducing the document verbatim"*). A bare *"already loaded"* claim is insufficient — CLAUDE.md system-reminder content does NOT satisfy the criterion unless it reproduces FOUNDATIONS.md verbatim.
- `target_skill_path/SKILL.md` plus every `references/*.md` (or `examples/*.md` when the skill ships examples instead of references) and every `templates/*` (any extension) discovered via `Glob`. Read at Phase 1.
- When `sibling_skill_paths` is supplied: each sibling's `SKILL.md`. Read at Phase 2 for the citation grep.
- When `sibling_skill_paths` is omitted: auto-detected sibling SKILL.md files per Phase 0's resolution logic.
- When `produce_tickets_on_approval=true`: `tickets/_TEMPLATE.md` (the per-ticket schema source); `archive/tickets/`, `tickets/archived/`, and `tickets/` (existing-prefix lookup for namespace allocation).

### Reads NOT performed

- No `mcp__worldloom__*` calls. The audit's evidence is direct file content under `.claude/skills/<target>/`, not indexed world-canon.
- No `worlds/<slug>/` reads. The target skill may reference world-canon contracts (e.g., FOUNDATIONS §Story Bundles §Validation Rules At Story Scope) but the audit verifies coherence inside the skill files themselves, not against any particular world's state.
- No `tools/` reads. Tool-package coherence is `mcp-integration-audit`'s domain, not this skill's.
- No git-history reads. Dating drift to a specific commit is out of scope.

## Pre-flight Check

Run before Phase 0; abort if any precondition fails.

1. Load `docs/FOUNDATIONS.md` into working context (light read; Validation Rule 6 governs Phase 9 ticket-attribution). Skip per the load-mechanism-naming rule in §World-State Prerequisites if already in context.
2. Normalize `target_skill_path` (strip trailing slash, leading `./`, resolve to absolute under worktree root). Abort with `"target_skill_path does not resolve to a readable skill directory: <path>"` if directory missing or `SKILL.md` absent.
3. Enumerate the target's files via `Glob`: `SKILL.md` (single file); `references/*.md` and/or `examples/*.md`; `templates/*` (any extension); flag any other files (rare) separately in the surface-area summary.
4. When `sibling_skill_paths` is supplied: verify each path exists and contains `SKILL.md`. Abort listing absent siblings on any miss.
5. When `produce_tickets_on_approval=true`: verify `tickets/_TEMPLATE.md` exists and is readable; abort with `"produce_tickets_on_approval=true but tickets/_TEMPLATE.md is missing — cannot resolve ticket schema"` on miss.
6. If a worktree root is active, ALL paths resolve from the worktree root, not the main repo root.
7. Commit to emitting the Phase 0 surface-area summary block as user-facing text before any Phase 1 reading begins (per §Phase 0 §Output). Failure to emit before Phase 1 reads is a Pre-flight-class violation that the audit must abort or loop back to Phase 0 to resolve — the surface-area summary is the operator's anchor for the audit's budget, and the pre-emission requirement is structurally part of Pre-flight's halt-gate discipline, not advisory prose downstream.

If any precondition fails, abort before Phase 0 with a clear user-facing message.

## Phase 0: Surface-Area Mapping

Establish what the audit is reading before any reading happens, so the operator can budget context.

### Resolve the target

- Read the target's `SKILL.md` frontmatter `description` field to capture the skill's stated contract — used in Phase 3 to detect content that contradicts the description.

### Classify enumerated files

- For each file enumerated at Pre-flight, record: path, byte size, and (for `.md` files) the H1/H2 outline.
- Classify into: `SKILL.md` (single file), `references/*.md` (or `examples/*.md`), `templates/*` (any extension), and anything else (rare — flag if found).

### Resolve siblings

- When `sibling_skill_paths` is supplied: validated already at Pre-flight; use that list.
- When omitted, auto-detect:
  - parse the target's SKILL.md `## Guardrails` (or `references/governance-and-foundations.md` if extracted) for "Consumes / Produces inputs for" / "Sibling interop" rows;
  - if the target's slug starts with `branching-story-` OR is in {`storylet-pool-authoring`, `story-fact-promotion-to-canon`}, include the whole branching-story family as default siblings.
- Surface the resolved sibling set to the user as a sentence (e.g., *"Auto-detected siblings: page-cycle, bootstrap, finalize, health-audit, storylet-pool-authoring, story-fact-promotion-to-canon"*) so the user can correct before reading begins.

### Output: a single user-facing surface-area summary

Before any Phase 1 reading, emit:

```
Auditing: <target_skill_path>
Files in target: SKILL.md (N lines) + M reference files + K template files = total Y bytes
Resolved siblings: <list>
Rework context: <rework_motivation if supplied, else "none supplied">
```

This is the operator's anchor for the audit's budget. Per §Pre-flight Check step 7, Phase 1 MUST NOT begin until this emission lands — failure to emit before Phase 1 is a Pre-flight-class violation that aborts or loops back to Phase 0 to resolve.

## Phase 1: Read Every File in Target

The single most common reason an audit misses a finding is having read only `SKILL.md` and skipped a reference or template.

### Read discipline

- Read every file enumerated at Phase 0. Use parallel reads for batches of references/templates where dependencies allow.
- For files larger than the Read tool's per-call limit, chunk via `offset` + `limit` until full coverage. Record the chunking in the per-file note so the audit trail reflects complete coverage.
- For each file, capture a short working note: what the file is, what claims/contracts it makes, what other files it explicitly cross-references.

### NEVER skip

- The SKILL.md HARD-GATE block (always load-bearing).
- The SKILL.md Final Rule / closing prose (often paraphrases the HARD-GATE — Phase 4 will judge whether the paraphrase adds value).
- Every `references/*.md` (or `examples/*.md`) regardless of name (even short utility refs).
- Every `templates/*` regardless of extension (yaml, md, txt).

**Rule**: Phase 1 emits zero findings. Detection is Phases 2-6's job.

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

**Oversized-grep handling.** The target-skill-wide sweep is wide-ranging on heavily-cited targets (e.g., a target whose `references/prose-craft-contract.md` is cited as schema authority by multiple sibling skills + the canonical shared template + FOUNDATIONS.md, or a target whose `references/record-schemas.md` is cited as runtime authority). The result may exceed the harness's stdout budget and be persisted to a file. Two valid recoveries: (i) narrow the grep to specific reference paths under investigation (e.g., `grep -rn "<target-skill-slug>/references/" .claude/skills/ docs/ specs/`) rather than the bare slug, surfacing per-file citation density before broadening; or (ii) read the persisted file via `Read` and apply the citation-categorization logic against its contents. Either path is auditable — the persisted file path itself is part of the audit trail. Prefer (i) when the audit only needs schema-authority and sub-routine-contract citations from `references/` and `templates/`; prefer (ii) when the audit needs the full citation surface including incidental docs/triage mentions. When path (i)'s narrowed grep also overflows (common on heavily-cited targets — when even per-`references/`-or-per-`templates/` greps exceed the budget), iterate further (additional path filters such as `| head -N`, `| grep -E '<critical-pattern>'`, or per-file-class iteration like one grep per major reference file); path (ii) remains the unconditional fallback when narrowing cannot reduce output below the budget.

### Categories of load-bearing-by-citation

For each cited target-skill file, classify the citation:

1. **Schema authority** — citing skill declares the target's template/reference as the source of truth for a record class (e.g., `branching-story-bootstrap/templates/story-records.yaml` is cited as schema authority for shared classes from `branching-story-page-cycle/references/record-schemas.md`). **NEVER recommend removal.**
2. **Sub-routine contract** — citing skill invokes the target as a delegated sub-routine and the cited file defines the interface (e.g., bootstrap's `phase-6-storylet-pool-seed.md` is cited by `storylet-pool-authoring` as the source of `target_pool_size`). **NEVER recommend removal.**
3. **Cross-pipeline canonical reference** — citing skill defers to the cited file for a contract shared by multiple sibling skills (e.g., bootstrap's `engine-envelope-shape.md` is cited by `storylet-pool-authoring` AND `branching-story-page-cycle` as the envelope-shape authority). **NEVER recommend removal** — but DO consider flagging the architecture (is the file located in the right skill?).
4. **Analogue reference** — citing skill names the target's file as the analogue for a parallel case (e.g., page-cycle's `phase-7-5-visible-affordance-extraction.md` cites bootstrap's same-named ref as the root-case analogue). **DO NOT recommend removal** — bidirectional citation indicates both files are load-bearing.
5. **By-design duplicate** — citing skill explicitly documents that the target's copy is deliberately maintained as a sibling (e.g., `content-policy.txt` copies across bootstrap / page-cycle / storylet-pool-authoring per `storylet-pool-authoring/references/governance-and-foundations.md`'s explicit "copied, not symlinked" rule). **DO NOT recommend removal.**

### Output of Phase 2

A table the Phase 8 audit report will lead with — "What is genuinely load-bearing (do NOT touch)" — with one row per externally-cited target-skill file and the citation evidence.

## Phase 3: Internal-Consistency Drift Scan

Identify contradictions within the target skill itself. Drift between SKILL.md / references / templates is the highest-severity finding class — it produces silent-failure runs.

### Drift patterns to scan for

1. **Numeric drift** — the SKILL.md HARD-GATE names N gates / N checks / N phases; references and templates enumerate fewer/more. Common in skills that gained gates or checks via incremental tickets where the templates were not updated. Cite the SKILL.md claim AND the drifted enumeration. Severity: **HIGH**.

2. **Name drift** — the SKILL.md / references rename a key or gate (e.g., `state_snapshot_completeness` → `state_snapshot_integrity`); templates retain the stale name. Cite both names with file paths. Severity: **HIGH**.

3. **Path drift after rework** — references mention a file path the skill no longer writes (e.g., post-prose-strip skills referring to `pages-prose/PG-<integer>.md` instead of `pages-prose-plans/PG-<integer>.md`). Cite the path against the SKILL.md's current write contract. Severity: **HIGH**.

4. **Off-by-N enumeration** — a section says "N fields" then lists N+1 (or N-1). Common in `§18 Scene direction — AUTHOR-WRITTEN five fields:` followed by 6 items. Cite the count claim AND the actual count. Severity: **LOW**.

5. **Stale ticket refs / "(NEW)" markers** — content tagged `(NEW)` or `(post-<TICKET>-NNN)` from a prior implementation ticket that has since merged. These convey nothing to a reader of the current contract and risk implying the content is in draft. Severity: **LOW**.

6. **Phase-number drift** — references claim Phase X does something the SKILL.md Procedure section doesn't enumerate, or vice versa. Cite both. Severity: **HIGH**.

### Output of Phase 3

Findings classified per the per-pattern severity rules above, with `file:line` anchors on every finding.

## Phase 4: Within-Skill Duplication Scan

Identify content duplicated across the target skill's own files (template + SKILL.md + reference, or reference + reference, or SKILL.md prose + Procedure section). Within-skill duplication is the second most common finding — usually MEDIUM severity, no correctness risk but creates future drift hazards and bloats the reader's attention budget.

### Duplication patterns to scan for

1. **Triple-documented yaml/policy block** — a yaml literal (e.g., `cadence_policy`) lives in `templates/<X>.md`, the same yaml plus its rationale appears in `SKILL.md` Phase N, AND the same yaml plus tone-derivation rules appears in `references/<Y>.md`. Cite all three sites.

2. **Parallel enumeration of shared-template content** — a reference re-describes the full body of a shared template (e.g., `_shared-templates/page-plan.md`) when it should describe only the delta over the shared template for this skill's specific case. Cite the shared template path AND the re-enumeration site.

3. **Process Flow diagram restating Procedure section** — SKILL.md ASCII process diagrams often re-describe the Procedure section's step-by-step list at a different level of detail. Not always actionable but worth flagging when the diagram exceeds ~30% of the SKILL.md's line count.

4. **Final Rule / closing-prose paraphrase of HARD-GATE** — closing sections that rhetorically restate the HARD-GATE conditions. Easy to read past, but a maintenance liability if the HARD-GATE conditions change.

5. **Same justification paragraph in multiple files** — a single rationale (e.g., "no word-count fields because commit b28aead...") restated verbatim in template comments + SKILL.md prose + reference text. Cite all instances.

### Output of Phase 4

Findings classified MEDIUM with per-finding citations and a single-source recommendation (which of the duplicated sites should be the canonical home).

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

## Phase 6: Severity-Classify Findings

Allocate an `F-NN` identifier to every Phase 3 / Phase 4 finding (per-audit-run namespace; first finding is `F-01`, second `F-02`, etc.; gaps are permanent if findings are dropped at Phase 8). Apply the HIGH / MEDIUM / LOW taxonomy with a one-line rationale per finding (bare severity is FAIL per FOUNDATIONS skill discipline).

### HIGH — correctness / contradiction / drift

- Numeric drift (gate counts, check counts, field counts that disagree across the skill).
- Name drift (gates / fields / paths renamed in one place but not another).
- Path drift after rework (stale paths to files the skill no longer writes).
- Phase-number drift (Procedure phase enumeration vs. references' phase claims).
- Anything else that would cause a faithful implementation of the current SKILL.md to fail because a template or reference contradicts it.

### MEDIUM — redundancy / duplication

- Triple-documented policy blocks (template + SKILL.md + reference).
- Parallel enumerations of shared-template content.
- Process Flow diagram restating Procedure section (when ≥30% of SKILL.md line count).
- Final Rule paraphrasing HARD-GATE.
- Same justification appearing verbatim in multiple files.

### LOW — nits / polish

- Off-by-N enumeration counts ("five fields" then 6).
- Vestigial "(NEW)" / "(post-<TICKET>-NNN)" annotations.
- Opaque internal ticket references with no semantic content.
- Stylistic inconsistencies in templates (e.g., yaml-vs-prose mid-value syntax).
- Minor arithmetic mismatches in approximate-count statements.

### Output of Phase 6

Per finding: `F-NN` ID, severity + one-line rationale, category (Phase 3 drift pattern / Phase 4 duplication pattern), file path(s), line number(s), the contradiction or duplication, citation of the canonical source.

## Phase 7: Recommendations + Bottom-Line

Translate findings into a recommendation list ordered to bias toward least-risky-first, and emit the bottom-line paragraph.

### Recommendation order convention

1. HIGH findings first — they're correctness fixes, smallest blast radius.
2. MEDIUM findings second — restructure / single-source. Larger edits but no contract change.
3. LOW findings last — bundle as one janitorial sweep.

### Bottom-line paragraph

One paragraph telling the user whether the skill is structurally sound. Anchor on:
- "Nothing should be deleted wholesale" vs "Wholesale rework recommended" — the user's biggest decision.
- Where the actual cleanup sites are concentrated (templates vs references vs SKILL.md).
- Whether the post-rework state has cosmetic vs concrete drift.

### Self-check (gates Phase 8 emission)

Before emitting the report at Phase 8, verify:

1. Every finding has an `F-NN` ID, a severity tag, AND a one-line severity rationale (bare severity is FAIL).
2. Every finding cites at least one `file:line` anchor (or "around line X" when the finding spans a block).
3. The negative-catalog block enumerates every item from Phase 5's standard catalog with an explicit "Keep" judgment and reason.
4. The recommendation list is ordered HIGH → MEDIUM → LOW.
5. The bottom-line paragraph is exactly one paragraph (not a list).
6. For each HIGH or MEDIUM finding whose Suggestion or finding-detail field contains an absence claim (phrasings like *"dangling reference"*, *"missing field"*, *"not documented"*, *"no fallback exists"*, *"no occurrences"*, *"undefined"*) or mis-cites a specific file/line, verify the claim by Read or grep of the cited file/section BEFORE finalizing the finding's wording. Pre-finalization verification at audit-time prevents implementation-phase retraction when the claim turns out to be wrong (the 30-second-per-finding cost catches premise-falsification before the user reads the report; absence claims arise most commonly from §Phase 3 pattern 3 — path drift producing "dangling reference" findings — and pattern 6 — phase-number drift producing claims about what a phase does or doesn't enumerate — plus general correctness findings outside the named drift/duplication patterns).

A self-check failure loops back to the relevant phase before Phase 8 emission.

## Phase 8: HARD-GATE Presentation + User Disposition

Emit the chat-only audit report. Then collect the user's explicit disposition. The HARD-GATE fires at the disposition step.

### Report structure

```markdown
# Skill Streamlining Audit: <target-slug>

**Target path**: <path>
**Audit date**: YYYY-MM-DD
**Rework context**: <rework_motivation or "none supplied">

## Scope of the audit
- Files read by path (count + byte/line counts)
- Siblings cross-checked

## What is genuinely load-bearing (do NOT touch)
[Phase 2 citation-evidence table — one row per externally-cited target file]

## Findings

### HIGH
- **F-NN** — [severity rationale] — `<file>:<line>` — <contradiction / duplication detail>
- ...

### MEDIUM
- **F-NN** — [severity rationale] — `<file>:<line>` — ...
- ...

### LOW
- **F-NN** — [severity rationale] — `<file>:<line>` — ...
- ...

## Things that are NOT redundant or detrimental
[Phase 5 negative-catalog enumerations the audit considered and rejected]

## Recommendations (least-risky-first)
[Phase 7 ordered list: HIGH fixes → MEDIUM consolidations → LOW janitorial sweep]

## Bottom-line
[Phase 7 one-paragraph summary]

## Summary
**Total**: N findings — N HIGH, N MEDIUM, N LOW.
```

### User disposition

After report emission, present the four-way menu:

- **ACCEPT-and-create-tickets** → proceed to Phase 9 (requires `produce_tickets_on_approval=true` to have been set OR in-band reconfirmation; if reconfirmation, surface the supporting-file readability check explicitly because Pre-flight may have skipped it).
- **ACCEPT-report-only** → end the run. The user will commission specific edits later via separate steps.
- **REVISE-narrow** → user names a specific area to re-scan (e.g., "re-check Phase 3 numeric drift with the gate table I just updated") or a severity to reclassify (e.g., "downgrade F-04 from HIGH to MEDIUM — the path is intentionally stale pending another ticket"). Loop back to the relevant phase (3, 4, 5, 6, or 7), then re-enter Phase 8.
- **REJECT** → end the run with no further action.

**Presentation mechanism.** In Claude Code, present the menu via `AskUserQuestion` with one question carrying the four options as a single-select; the question's `header` field should read `"Disposition"`. A second `AskUserQuestion` question carrying an optional revise-or-write-in slot is acceptable when the auditor wants to surface narrow-revise options preemptively (e.g., common reclassification candidates derived from Phase 6 severity boundaries). Plain-prose menus ("reply with one of: ...") are acceptable in environments without `AskUserQuestion` but lose the structured-disposition capture and force the operator to parse free-form responses.

The HARD-GATE fires here per the top-of-file gate block — invoking this skill is not approval of the report or the ticket batch.

## Phase 9 (Conditional): Ticket Generation

Runs only when `produce_tickets_on_approval=true` AND the user explicitly chose **ACCEPT-and-create-tickets** at Phase 8.

### Per-finding-tier ticket allocation

- Each HIGH finding → its own ticket (correctness fixes are independently mergeable).
- Each MEDIUM finding → its own ticket (different files, different reviewers).
- All LOW findings → bundled into one janitorial-sweep ticket.

### Ticket prefix resolution

- Check `archive/tickets/`, `tickets/archived/`, and `tickets/` for an existing prefix associated with the target skill (e.g., `BSBOOT-` for `branching-story-bootstrap`, `BSPAG-` / `BSPAGE-` for `branching-story-page-cycle`, `STPOOL-` for `storylet-pool-authoring`).
- Allocate the next number after the highest existing number (active + archived).
- **Multi-prefix tiebreaker** — when multiple legacy prefixes exist for the same target skill (e.g., `BSPAG-` and `BSPAGE-` both archive-resident for `branching-story-page-cycle`), prefer the most-recently-allocated prefix: the highest numbered ticket across both (by mtime if numbers don't disambiguate). When `docs/triage/` carries a recent audit triage for the same target whose accepted-items table names a specific prefix as the follow-up convention, that prefix WINS over the most-recently-allocated heuristic — the triage author already adjudicated the choice, and following it preserves continuity with the user's prior expectation. Surface the chosen prefix and the tiebreaker rationale in the user-facing Phase 9 ticket-paths report (e.g., *"Allocated under `BSPAGE-` per 2026-05-11 bootstrap-audit triage's stated follow-up convention; `BSPAG-` is the older alternate prefix"*) so the user can override before the Edit batch lands.
- When no existing prefix is found in `tickets/`, `tickets/archived/`, or `archive/tickets/`, derive one from the skill slug (uppercase letters of slug words, ≤8 chars) and start at `001`. **Legacy prefixes always win over derivation** — never auto-derive a third namespace when one or more legacy prefixes exist; the multi-prefix tiebreaker above governs which legacy prefix to extend.
- Collisions abort with a specific-id error per HARD-GATE clause (e). Dropped tickets (when a Phase 8 disposition narrows the accept set) leave permanent gaps in the namespace; numbers are never reused.

### Ticket content discipline

Every generated ticket follows `tickets/_TEMPLATE.md` and includes:

- **Problem** — cites the audit finding by `F-NN` ID and the canonical source location (file path + line number from Phase 6).
- **Assumption Reassessment** — exact file paths + line numbers from the audit, dated to the audit's date.
- **Architecture Check** — usually one paragraph confirming the fix is a correctness sync or single-source consolidation, not a contract change.
- **Files to Touch** — exact paths.
- **Acceptance Criteria** — grep-proof commands when the finding is amenable to grep verification (most HIGH findings are).
- **Test Plan** — verification commands the audit recommends.

### Triage manifest (when ticket count ≥3)

Write `docs/triage/YYYY-MM-DD-<target-slug>-audit-triage.md` with:

- **Source** — which audit (this skill name + target slug + audit date).
- **Decision summary** — one paragraph.
- **Accepted items table** — `F-NN` → ticket link → severity.
- **Dismissed items table** — when applicable (audit findings the user explicitly chose not to action).
- **Follow-up considerations** — parallel work in sibling skills, deferred architecture questions.
- **Implementation order recommendation** — by tier (HIGH → MEDIUM → LOW).

### Output of Phase 9

- N ticket files at `tickets/<PREFIX>-NNN-<slug>.md`.
- Optionally one triage manifest at `docs/triage/`.
- Chat report of paths written.

**Do NOT `git commit`.** Phase 9 writes land in the working tree only; the user reviews the diff and commits via separate steps.

## Validation

Per audit run, record PASS with a one-line rationale for each gate. A bare PASS without rationale is treated as FAIL per worldloom skill discipline.

1. **Surface-area completeness** — every file under `target_skill_path/` is in the Phase 1 read log.
2. **Sibling cross-check completeness** — every non-trivial target-skill file appears in the Phase 2 citation catalog with either an external citation cataloged or an explicit "no external citations found" note.
3. **Drift scan completeness** — Phase 3 ran every pattern in the catalog and either reported a finding or stated "no occurrences".
4. **Duplication scan completeness** — Phase 4 ran every pattern in the catalog likewise.
5. **Negative catalog applied** — Phase 5 explicitly listed standard negative-catalog items and judged each.
6. **Severity-classify discipline** — every finding has an `F-NN` ID, a HIGH / MEDIUM / LOW tag, AND a one-line rationale; the report orders findings by tier.
7. **Citation discipline** — every finding cites at least one file path and line number (or "around line X" when the finding spans a block).
8. **No edits without approval** — no file write occurred before the user explicitly accepted in Phase 8. **Mandatory check; FAIL halts.**

## Validation Rules This Skill Upholds

- **Rule 6: No Silent Retcons** — enforced at Phase 9 (Ticket Generation). Each emitted ticket cites the audit finding by `F-NN` ID and canonical source location (file path + line number from Phase 6), so any future edit to the target skill that lands via this audit's ticket batch carries an explicit attribution trail; no audit-driven edit is silent.

The other six FOUNDATIONS Validation Rules (1, 2, 3, 4, 5, 7) are N/A — meta-tooling skill produces no in-world content. See the FOUNDATIONS Alignment table below for the N/A row + sibling-handoff per rule.

## Record Schemas

- **Ticket files** → see `tickets/_TEMPLATE.md` (the canonical pipeline-level ticket template; no per-skill `templates/` copy — sub-class (d) of skill-creator's write-files step, parallel to `spec-to-tickets` and `mcp-integration-audit`).
- **Triage manifest** → free-form markdown following the convention of existing `docs/triage/YYYY-MM-DD-*.md` files (no schema enforcement; the manifest is a human-readable summary).
- **Audit report** → chat-only emission; structurally defined by the report template in Phase 8 prose. No persisted schema.

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|-----------|-------|-----------|
| Rule 1 (No Floating Facts) | N/A | Not applicable — meta-tooling skill emits no canon facts; world-level Rule 1 enforcement remains the canon-mutating-skill family's concern (`canon-addition`, `create-base-world`). |
| Rule 2 (No Pure Cosmetics) | N/A | Not applicable — no in-world content emitted. Handoff: `canon-addition`. |
| Rule 3 (No Specialness Inflation) | N/A | Not applicable — no in-world content emitted. Handoff: `canon-addition`. |
| Rule 4 (No Globalization by Accident) | N/A | Not applicable — no canon facts about local/global scope produced. Handoff: `canon-addition`. |
| Rule 5 (No Consequence Evasion) | N/A | Not applicable — meta-tooling audit skill produces findings, not in-world consequences. Handoff: `canon-addition`. |
| Rule 6 (No Silent Retcons) | Phase 9 | Each ticket cites the audit finding by `F-NN` ID + canonical source location; audit-to-edit attribution trail is explicit per ticket; edits landing via this audit's ticket batch are never silent. |
| Rule 7 (Preserve Mystery Deliberately) | N/A | Not applicable — no world-canon mystery surfaces touched. Handoff: `canon-addition`, `continuity-audit`. |
| Canon Layers (Hard / Derived / Soft / Contested / Mystery Reserve) | N/A | Not applicable — meta-tooling operates on pipeline structure; canon-layer assignment is the canon-mutating-skill family's concern. |
| Canon Fact Record Schema | N/A | Not applicable — no CF records emitted. Handoff: `canon-addition`. |
| Change Control Policy | N/A | Not applicable — skill emits no Change Log Entries. Each emitted ticket is its own change-control surface, governed by `tickets/_TEMPLATE.md`'s Assumption Reassessment / Architecture Check / Verification Layers / Acceptance Criteria sections. |
| Tooling Recommendation (context-packet pattern) | N/A | Not applicable — skill reads pipeline content under `.claude/skills/<target>/`, not world canon; the §Tooling Recommendation context-packet pattern applies to world-state reads only. |
| Acceptance Tests | N/A | Not applicable — Acceptance Tests govern world models; this skill audits pipeline content. |
| Rule 11 (No Spectator Castes by Accident) | N/A | Not applicable — no in-world capability surfaced. Handoff: `canon-addition` Phase 5 Diffusion Analysis. |
| Rule 12 (No Single-Trace Truths) | N/A | Not applicable — no in-world hard-canon truths produced. Handoff: `canon-addition`. |

## Guardrails

- **Report only at the audit phase** — Phases 0-8 NEVER edit any file. The audit report is chat-only. The HARD-GATE-conditional Phase 9 is the only write surface, and writes are confined to `tickets/<PREFIX>-NNN-<slug>.md` and `docs/triage/YYYY-MM-DD-<target-slug>-audit-triage.md`.

- **Never edit the target skill** — tickets propose changes; the user makes the edits via separate steps after the audit. The audit is read-only on `.claude/skills/<target>/`.

- **Never edit sibling skills** — the Phase 2 citation grep reads sibling SKILL.md files; the negative catalog protects sibling-cited target content from removal. The audit emits NO edits to sibling directories.

- **Family scope** — the first batch of intended targets is the branching-story family: `branching-story-page-cycle`, `branching-story-page-prose-finalize`, `branching-story-health-audit`, `storylet-pool-authoring`, `story-fact-promotion-to-canon`. The skill is parameterized on `target_skill_path` so it generalizes to any worldloom skill, but the auto-sibling-detection logic and the standard negative catalog are tuned for the story family. Targets outside the story family (e.g., `canon-addition`, `create-base-world`) work but will need user-supplied `sibling_skill_paths`.

- **Worktree discipline** — if invoked inside a git worktree, all paths resolve from the worktree root. The skill writes only to `tickets/` and `docs/triage/` during Phase 9 — never to `worlds/<slug>/`, `_source/`, the target skill directory, or any sibling skill directory.

- **No git commits** — Phase 9 writes land in the working tree only. The user reviews the diff and commits via separate steps.

- **Distinct from sibling meta-tooling skills** — different question and action from each:
  - `skill-audit` — quality / gaps / improvements vs. streamlining (this skill). Compatible: run skill-audit first to find gaps; then this skill to find dead weight.
  - `skill-consolidate` — regroup fragmented topics vs. strip dead weight (this skill). Compatible: this skill identifies what to strip; skill-consolidate regroups what remains.
  - `skill-extract-references` — extract bloated content into `references/` vs. judge whether content is worth keeping (this skill). Compatible: run this skill first; if content is worth keeping, then skill-extract-references for layout.
  - `story-skill-internal-coherence` — cross-family drift vs. per-skill streamlining (this skill). Compatible: run this skill on each family member; run that skill across the family.

## Final Rule

The audit asks one named skill at a time: what is genuinely load-bearing, what is dead weight, what is actively wrong — and emits the answer as a report the user can calibrate against before any edit lands.
