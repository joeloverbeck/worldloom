---
name: reassess-spec
description: "Use when preparing a worldloom spec for ticket decomposition. Reassesses a spec at specs/<NAME>.md against the codebase (tools/, .claude/skills/, docs/) and FOUNDATIONS.md; identifies issues/improvements/additions, presents findings for approval, then writes the updated spec. Produces: findings report + updated spec file. Mutates: the target spec file on user approval."
user-invocable: true
arguments:
  - name: spec_path
    description: "Path to the spec file (e.g., specs/SPEC-03-patch-engine.md)"
    required: true
---

# Reassess Spec

Reassess a worldloom spec against the codebase and FOUNDATIONS.md. Validates assumptions, identifies issues / improvements / additions, presents findings for approval, then writes the updated spec.

<HARD-GATE>
Do NOT Write or Edit the spec file until:
(a) Step 6 findings have been presented to the user, the user has responded, and either (i) explicit approval / per-finding disposition (fix / defer / reject) has been received for every Issue, Improvement, and Addition, OR (ii) no explicit objection to a finding was raised in the user's response (per `references/findings-and-questions.md` §Question Handling — silence on a finding while answering Questions counts as approval; an explicit objection re-opens that finding's disposition and requires re-presenting the corrected recommendation before Step 7);
(b) Step 7's pre-apply verification table has been emitted in chat, with a check + result row per finding, and any detected mismatch has been reclassified (evidence-refining / recommendation-changing / scope-extending) and — for recommendation-changing mismatches — re-presented to the user for fresh approval;
(c) any open Questions surfaced in Step 6 have been answered by the user;
(d) bundled-answer consistency has been verified when a single user reply resolved multiple interdependent questions.

This gate is authoritative under Auto Mode or any other autonomous-execution context — invoking this skill does not constitute approval of the deliverable summary. Auto-mode's only carve-out: when Step 6 findings contain no Issues (CRITICAL/HIGH severity or FOUNDATIONS violations) and no open Questions, Step 7 may proceed without a fresh user approval, but the pre-apply verification table MUST still be emitted in chat before any Write/Edit call.
</HARD-GATE>

## Invocation

```
/reassess-spec <spec-path> [inline user hint]
```

**Arguments** (required, positional):
- `<spec-path>` — path to the spec file (e.g., `specs/SPEC-03-patch-engine.md`)

If the argument is missing, ask the user to provide it before proceeding.

**Inline user hint (optional, audit-lens)**: If the user provides additional text alongside the path — parenthetical note, post-dash hint, or a follow-on message (e.g., `specs/SPEC-04-validator-framework.md (Note: I'm concerned some validators may be too brittle.)`) — treat it as an audit-lens constraint. A hint shapes severity assignment during Step 5 classification and may force restructuring of §Questions to surface the hint's implications; it does NOT constitute a second argument to validate for path existence, and it does NOT override FOUNDATIONS alignment or approved recommendations (per §Guardrails). When a hint materially shaped finding classification, cite it verbatim in the Step 6 presentation — typically in the Classification line or in the framing of the first Issue whose severity it affected — so the user sees how the hint was applied. A hint that would force a FOUNDATIONS violation is flagged as a CRITICAL Issue rather than applied.

## Process Flow

```
Pre-Process: Spec classification (4 classes) + hybrid detection
       |
       v
Step 1: Mandatory reads (spec file + FOUNDATIONS.md)
       |
       v
Step 2: Extract references (file paths, types, functions, deps, code examples)
       |
       v
Step 3: Codebase validation (12 substeps — load references/codebase-validation.md first)
       |
       v
Step 4: FOUNDATIONS alignment check (load references/foundations-alignment.md first)
       |
       v
Steps 5-6: Classify findings + present to user (load references/findings-and-questions.md first)
       |
       v
        [user approval gate — HARD-GATE fires here]
       |
       v
Step 7: Pre-apply verification table -> write updated spec (load references/spec-writing-rules.md first)
       |            |
       |            +--(classification d retroactive)--> Populate Outcome + flip Status
       |
       v
Step 8: Final summary + suggested next step
              |
              +--(classification a/b/c)--> handoff to ticket decomposition
              +--(classification d)------> archive spec + reconcile IMPLEMENTATION-ORDER.md
```

## Inputs

**Required:**
- `spec_path` — path to the spec file (e.g., `specs/SPEC-03-patch-engine.md`)

**Optional:**
- (none) — hybrid classification, plan-mode detection, and worktree-root resolution are auto-detected, not arguments.

**Auxiliary (non-argument)**:
- **Inline user hint** — parenthetical, dash-prefixed, or follow-on text accompanying the invocation that shapes audit lens (severity assignment during Step 5, question framing at Step 6). Not an input in the argument-validation sense (no path or shape to validate); see §Invocation for parsing and application rules.

## Output

- **Findings report** — presented in chat at Step 6 using the template in `references/findings-and-questions.md` (Issues / Improvements / Additions, severity-ranked; open Questions; optional Substantial Redesign Flag).
- **Pre-apply verification table** — emitted in chat at Step 7 before any Write/Edit call.
- **Updated spec file at `<spec_path>`** — edited in place on user approval. For classification (d) retroactive, additionally: Status flipped to `COMPLETED`, Outcome section populated, Motivating Evidence annotated as historical.
- **Post-apply confirmation** — emitted in chat at Step 8 (grep-proofs that eliminated references are gone and corrected references resolve).
- **For classification (d) retroactive only**: file move `specs/<ID>.md` → `archive/specs/<ID>.md` + reconciled `specs/IMPLEMENTATION-ORDER.md` entry.

## World-State Prerequisites

Before this skill acts, it MUST read (per FOUNDATIONS.md §Tooling Recommendation):

- `<spec_path>` — the target spec file, entire contents.
- `docs/FOUNDATIONS.md` — the non-negotiable design contract. Skip if read earlier in this session and unmodified.
- `docs/HARD-GATE-DISCIPLINE.md` — when a deliverable touches skill HARD-GATE semantics or canon-write ordering. Loaded on demand at Step 3.5 (skill-structure validation).
- `CLAUDE.md` (repository-root instructions) — when the spec references structured-ID conventions (CF, CH, PA, CHAR, DA, PR, BATCH, NCP, NCB, AU, RP, etc.), HARD-GATE semantics, worktree discipline, or any other project-level convention that CLAUDE.md documents. Loaded on demand at Step 3.10 (project-convention drift). Skip if read earlier in this session and unmodified.
- Every file path, skill directory, spec reference, and package.json extracted at Step 2 — read as part of Step 3 validation.
- `specs/IMPLEMENTATION-ORDER.md` — read at Step 2 (for dependency context) and re-read at Step 8 only when classification (d) retroactive triggers reconciliation.

This skill operates at pipeline scope: it reads any file under `specs/`, `archive/specs/`, `.claude/skills/`, `tools/`, `docs/`, and the `package.json` files that sit under `tools/*/`. It does **not** read world-level canon (`worlds/<slug>/`) — no spec reassessment in worldloom examines world canon, because specs describe pipeline/tooling work, not world-canon work. If a future spec genuinely requires world-canon context to validate, that's a classification-shift signal, not a prerequisite-list gap.

## Worktree Awareness

If working inside a worktree (e.g., `.claude/worktrees/<name>/`), ALL file paths — reads, writes, globs, greps — must use the worktree root as the base path.

## Plan Mode Awareness

If plan mode is active, load `references/plan-mode.md`.

## Pre-Process: Spec Classification

Before beginning Steps 2-3, classify the spec into exactly one of four classes. Classification drives which Step 3 substeps apply.

- **(a) New component** — introduces a new tool/package (new `tools/<name>/` directory), a new skill (new `.claude/skills/<name>/`), a new hook, or a new validator. Full Step 3 checklist (3.0-3.11) applies. A pre-existing placeholder at the deliverable's target path — a scaffold `README.md`, an empty `src/` tree, a type-stub file, or a Phase-0 directory scaffold — does NOT shift the classification toward (d). Phase-0 scaffolding is (a)-compatible; classification shifts to (d) only when the substantive deliverables (parser, CLI, migrations, schema) verify as implemented in code, per the (d) gate below.
- **(b) Extension** — extends an existing tool, skill, validator, or hook without introducing a new one. Steps 3.1-3.8 and 3.11 apply. 3.5 (skill-structure validation) applies only when the deliverable modifies a SKILL.md. 3.9 (FOUNDATIONS-contract fidelity) applies only when the deliverable touches canon-pipeline semantics (patch-engine write paths, validator thresholds, hook enforcement, canon-safety checks). 3.10 (project-convention drift) applies only when the deliverable introduces new ID conventions or project-level conventions.
- **(c) Refactor** — structural restructuring with no behavioral change (re-exports, module splits, SKILL.md consolidation without rule changes, docs reorganization). Steps 3.0-3.4 apply. Skip 3.5 unless the refactor moves content between SKILL.md files; skip 3.7 unless package boundaries shift; skip 3.9; skip 3.10; skip 3.11 (no new deliverables in a refactor — consumer-existence is a given for code being restructured). Focus on symbol existence, count accuracy, blast radius.
- **(d) Retroactive reassessment** — validation concludes (via Step 3 evidence) that all deliverables already landed through downstream commits or sibling specs. **Not pre-selected** — activates only when every deliverable verifies as implemented in code. The user hint "I suspect this already landed" is a soft signal, not a classification by itself; only Step 3 evidence can confirm (d).
  - Steps 3.1-3.4 apply rigorously to prove landing; cite file paths + line numbers as evidence. Skip Steps 3.5-3.9 and 3.11 (ripple/consumer substeps) — the work has already shipped, and consumers exist by definition or the code would be visibly dead. 3.10 (project-convention drift) applies only when the landed work introduced new ID conventions or project-level conventions that may need documenting in CLAUDE.md.
  - **Step 7 output shape switches to Outcome population + archival**, not deliverable refinement.
  - **Step 8 switches to archival flow** — move spec to `archive/specs/`, reconcile `specs/IMPLEMENTATION-ORDER.md`.
  - Classification shift from (a)/(b)/(c) → (d) is a legitimate and common outcome when a spec is reassessed after downstream work ships. Name the shift explicitly in Step 8.

**Deliverable removal**: If validation reveals a deliverable should be removed entirely, skip remaining Step 3 substeps for that deliverable and record the removal as a finding. If only part of a deliverable should be removed (sub-items, table rows, field list entries), record the partial removal as a finding but continue substep validation for the surviving parts.

**Hybrid specs**: Apply the union of applicable substeps — use the most rigorous classification's checklist for shared substeps. Common hybrids:
- **(a)+(b)**: new component with migration of existing types — full (a) checklist, plus 3.6 cross-package consumer analysis on every migrating symbol.
- **(b)+(c)**: extension with incidental restructuring — full (b) checklist; (c) applies only to the restructuring parts.

**Emergent migration at Step 7**: If Step 7 edits introduce cross-package migration not part of the original spec (typically surfaced by the pre-apply verification table), re-promote the classification to `(a)+(b)` and run 3.6 cross-package consumer analysis on the migrating symbol before finalizing edits. Record the scope extension in the pre-apply table per the scope-extending tier.

**Re-reassessment shortcut**: If the same spec was reassessed earlier in this session and not externally modified, Steps 2-3 may scope to only references affected by the triggering change. Step 1 still applies.

## Step 1: Mandatory Reads

Read ALL of these before any analysis:

1. **The spec file** (from `spec_path`) — entire file.
2. **`docs/FOUNDATIONS.md`** — skip if read earlier in this session and unmodified.
3. **`docs/HARD-GATE-DISCIPLINE.md`** — only if Pre-Process classification surfaced a deliverable that modifies skill HARD-GATE semantics or canon-write ordering. Skip otherwise.

Parse the spec's metadata: Phase, Status, Dependencies, Blocks, Problem Statement / Approach / Deliverables / FOUNDATIONS Alignment / Verification / Out of Scope / Risks, and all deliverable sections.

**Non-numbered deliverables**: If the spec uses sections instead of numbered deliverables (common for multi-part specs like SPEC-05 Hooks or SPEC-07 Docs Updates), treat each distinct implementation section as a deliverable for validation purposes. Adapt references to "deliverable numbers" throughout this skill to the spec's actual organizational scheme (section headers, part labels).

## Step 2: Extract References

Extract every concrete codebase reference from the spec:

- **File paths** (both existing — `docs/FOUNDATIONS.md`, `.claude/skills/canon-addition/SKILL.md` — and proposed — `tools/world-index/src/parse/semantic.ts`)
- **Type names, interface names, SQL column names** (e.g., `CanonFactRecord`, `edge_type`, `PatchPlan`)
- **Function / CLI command / MCP tool names** (e.g., `world-index build`, `submit_patch_plan`, `validatePrereqs`)
- **Package / skill / hook names**
- **Spec or skill dependencies** — referenced at Dependencies, Blocks, or in prose
- **Code examples** (inline TypeScript, SQL, YAML, JSON schema snippets, JSONSchema blocks) — extract for fidelity checking
- **Hook, validator, or MCP tool configuration** referenced by the spec — extract threshold values, severity mappings, exit codes
- **Package dependencies** — for specs that introduce a new `tools/<name>/` package or modify an existing one, also extract the dependency list from the accompanying `tools/<name>/README.md` (and `tools/<name>/package.json` if present). README-declared deps often name concrete packages (`better-sqlite3`, `remark-gfm`) where the spec's prose only names umbrella frameworks (`SQLite`, `remark`); Step 3.4 compares the two surfaces for drift.
- **Structured-ID prefixes** — every canon-record or skill-output prefix the spec uses (`CF`, `CH`, `INV`, `M`, `OQ`, `ENT`, `SEC`, `PA`, `CHAR`, `DA`, `PR`, `BATCH`, `NCP`, `NCB`, `AU`, `RP`, or any new spec-introduced canon-record / skill-output prefix). Step 3.10 compares these against `CLAUDE.md` §ID Allocation Conventions. Spec-decomposition ticket prefixes (`SPEC<NN><FAM>-NNN`) are NOT extracted under this bullet — they are governed by the spec's own §Risks / open-question section, not by §ID Allocation Conventions, and 3.10 does not apply to them.

Build a validation checklist. For specs with >15 references, use `TaskCreate` to add a checklist item per reference and `TaskUpdate` to mark each `validated | drifted | missing`. For specs with ≤15 references, mental tracking is acceptable.

Prioritize references most likely to have drifted: import paths, function signatures, types the spec extends, sibling-spec Dependency paths. Stable references (FOUNDATIONS.md principle names, Canon Fact Record field names) can be spot-checked.

## Step 3: Codebase Validation

**Read `references/codebase-validation.md` now, with the Read tool, before classification-driven substep selection.** Surface validation (listing directories, reading sibling specs, confirming referenced paths exist) may proceed in parallel with this load; the reference is required before the classification-sensitive work begins (which substeps apply per (a)/(b)/(c)/(d), specialized sub-checks per substep, agent-delegation guidance). Emit a content-tied acknowledgment immediately after the Read call — e.g., `Loaded codebase-validation.md — top section is "3.0 Cross-Package Scope Establishment"`. A bare "Loaded: codebase-validation.md" is treated as a skipped load.

Then validate every reference from Step 2, applying the substep subset determined by the Pre-Process classification (a/b/c/d + hybrids).

Do not present findings yet. Collect everything for Step 4.

## Step 4: FOUNDATIONS.md Alignment Check

**Read `references/foundations-alignment.md` now, with the Read tool, before alignment classification begins.** Emit a content-tied acknowledgment immediately after the Read call — e.g., `Loaded foundations-alignment.md — opens with "4.0 Internal Contradictions"`. A bare "Loaded: foundations-alignment.md" is treated as a skipped load.

Then check spec alignment against all applicable FOUNDATIONS principles (Canon Layers, 7 Validation Rules, Canon Fact Record Schema, Change Control Policy, Tooling Recommendation).

## Steps 5-6: Classify and Present Findings

**Read `references/findings-and-questions.md` now, with the Read tool, before findings classification begins.** Emit a content-tied acknowledgment immediately after the Read call — e.g., `Loaded findings-and-questions.md — opens with "Step 5: Classify Findings"`. A bare "Loaded: findings-and-questions.md" is treated as a skipped load.

Classify all findings from Steps 3-4 into Issues (CRITICAL / HIGH / MEDIUM / LOW severity), Improvements, Additions, and Questions. Present to the user using the template in `references/findings-and-questions.md`.

**Redesign-count checkpoint**: Before presenting, count deliverables whose approach materially changed (eliminated, replaced with a different mechanism, or restructured such that the implementation path is not a refinement of the original) versus total deliverables. A deliverable whose text is reworded but whose approach remains a refinement does not count. If the ratio exceeds 50%, the `### Substantial Redesign Flag` section is mandatory in the Step 6 output, placed immediately above `### Questions`. Emit the N/total counts in pre-draft notes even when the ratio is below 50%. When a deliverable's redesign status depends on pending question resolution, emit the range (e.g., `2-3/6`) and name which deliverable(s) are conditional. **Denominator**: `total` is the **pre-reassessment** deliverable count — dropped deliverables stay in the denominator; added deliverables increase it; the same denominator is used through every emission of the ratio in a single reassessment. Full rationale lives in `references/findings-and-questions.md` §Redesign-count checkpoint.

**Wait for user response before proceeding to Step 7.** In plan mode: after question resolution, write the plan file per `references/plan-mode.md`, then call ExitPlanMode. Steps 7-8 execute after approval.

**Auto-mode interaction**: When auto mode is active AND the findings contain no Issues (CRITICAL/HIGH severity or FOUNDATIONS violations) AND no open Questions, proceed directly to Step 7. Report the auto-mode auto-approval inline in the Step 6 presentation (e.g., "Auto mode: no Issues, proceeding to Step 7"). If any Issue is present or any Question is open, the wait-for-user gate still applies even in auto mode.

## Step 7: Write the Updated Spec

### Pre-Apply Verification Table

Before editing, build a per-finding verification mini-table **and emit it in chat before calling Write/Edit**. For each finding (by its Step 6 key — `I1`, `I2`, `M1`, `A1`, etc.), run a targeted check (grep, count, path existence, file-read) and record both the command and the result. The table is the gate — a vague "I checked the findings" is not sufficient and will be treated as no verification.

Example:

| Finding | Check | Result |
|---------|-------|--------|
| I1 | `grep -n "submit_patch_plan" tools/world-mcp/src/tools/` | 3 matches in `tools/world-mcp/src/tools/submit-patch-plan.ts` — confirms tool surface exists |
| I2 | `test -f specs/SPEC-04-validator-framework.md` | file exists — dependency path valid |
| M3 | Judgment — FND-§Change Control Policy + FND-§Rule 6 reasoning; Q2 delegated (no codebase symbol to grep) | selected option (a): spec's Outcome section must cite delivering-commit IDs — Rule 6 No Silent Retcons requires the attribution chain |
| I4 | User answer Q1 = (a): drop v1 wholesale; v2 replaces | Apply as: D6 Migration Posture section states v1 removed outright, no backcompat shim, CONTEXT-PACKET-CONTRACT.md regenerated |

**User-answered rows**: when the user explicitly answers a Step 6 Question with an option label, put the answer in the Check column (format: `User answer Q<N> = (<option>): <one-line paraphrase of the chosen option>`); put the resulting spec edit in the Result column (format: `Apply as: <concise edit description>`). Judgment-prefix is not required — the Question + answer IS the check. This row shape is parallel to command-backed and `Judgment — …` rows, not a subset of either; see `references/spec-writing-rules.md` §Pre-Apply Verification for the row-shape taxonomy. When the user delegates resolution to the reassessor's reasoning ("you decide based on FOUNDATIONS") rather than answering with an option label, use the `Judgment — …; Q<N> delegated` shape shown in the M3 example instead.

**Mismatch classification** — if a check reveals a finding/codebase mismatch:

- **Recommendation-changing mismatch**: the pre-apply check invalidates the finding's *recommendation* — the approved fix no longer applies, the target has moved, or a different fix is now warranted. Re-present the corrected finding to the user and wait for confirmation before applying any edit **for that finding**. Pure retractions (no substitute fix) require transparent `retracted: <reason>` notation in the table but do not require fresh re-approval.
- **Evidence-refining mismatch**: the pre-apply check refines *supporting evidence* but the recommendation still holds unchanged. Note the refinement inline in the Result column (e.g., "partial invalidation: symbol exists at `tools/world-index/src/parse/semantic.ts:412`, not at spec-claimed location — recommendation unchanged") and proceed.
- **Scope-extending mismatch**: the approved recommendation still applies, but fulfilling it requires a new deliverable, migration, or package-boundary change not discussed at question time. Note the scope extension inline in the Result column (e.g., "scope-extending: requires new D4 to relocate `NodeType` from world-index to a shared schema package so world-mcp can import it — recommendation unchanged") and proceed. Additionally, surface the scope extension in the Step 8 summary under a dedicated line. If a Step 6 Question's option description explicitly named the scope-extending consequence (e.g., "requires follow-up edit to SPEC-X"), the user's approval of that option carries scope acknowledgement — cite the question in the Result column (e.g., `scope-extending: pre-declared in Q2`) rather than framing the extension as freshly discovered; the Step 8 dedicated line still applies. If the scope extension constitutes a cross-package type migration, also apply the Pre-Process "Emergent migration at Step 7" guidance and run 3.6 cross-package consumer analysis before finalizing edits.

The `Finding` column tier tag (`evidence-refining`, `recommendation-changing`, `scope-extending`) is required only when the pre-apply check detects a mismatch. Rows that confirm the finding exactly as written may use the compact descriptive form shown in the first example.

**Bundled-answer consistency check**: When a single user response resolves multiple interdependent questions (e.g., "1) a, 2) b, 3) a" in one message), verify before building the verification table that the combined answers are internally consistent — no contradictory routing (the same symbol referenced by two answers is routed to the same destination), no dangling type references (a type referenced in one answer is defined by another), no split-brain conditions (a decision in one answer does not leave a remnant addressed by a different answer). Flag any detected contradiction as a recommendation-changing mismatch and re-present for a follow-up round before proceeding.

**Read `references/spec-writing-rules.md` now, with the Read tool, before writing begins.** Emit a content-tied acknowledgment immediately after the Read call — e.g., `Loaded spec-writing-rules.md — opens with "Pre-Apply Verification"`. A bare "Loaded: spec-writing-rules.md" is treated as a skipped load. Then apply all approved changes.

### Retroactive Branch (classification (d))

If Step 3 validation concluded all deliverables already landed, Step 7's output shape is **not** deliverable refinement. Instead:

1. Flip the spec's **Status** to `✅ COMPLETED`.
2. Populate the **Outcome** section with: completion date; landed changes (cite file paths + line numbers); delivering commit(s) or sibling spec(s); deviations from original plan (especially work absorbed by downstream work); verification commands **re-run at reassessment time**, and their pass/fail status. Do not copy verification from memory — rerun each command now to catch post-delivery regressions.
3. Mark historical **Motivating Evidence** (or **Problem Statement** if the spec has no Motivating Evidence section) as such — add a short parenthetical noting the drift described was resolved by the landed implementation.
4. Cross-reference any downstream specs or skills that extended or absorbed original-spec scope.
5. Do **not** apply structural refinements to deliverables that already shipped — the spec file is now a historical record, and editing deliverable sections to match current code would confuse the causal narrative.

After Step 7 completes for (d), Step 8 drives archival + `specs/IMPLEMENTATION-ORDER.md` reconciliation rather than suggesting ticket decomposition.

## Step 8: Final Summary

Present:

- Number of issues fixed, improvements applied, additions incorporated.
- Change inventory: all changes grouped by finding type (mirroring Step 6 structure).
- **Post-Apply Confirmation results**: for every finding that eliminated or renamed a reference, grep-prove it is gone and that corrected references resolve — e.g., "Verified: zero matches for eliminated references, N matches for corrected references". For retroactive reassessments (classification (d)), additionally grep every concrete artifact named in the spec's Motivating Evidence (symbols, paths, thresholds, type names) and prove its absence or corrected form in the current codebase.
- Deferred items the user chose not to address.
- Items excluded by reassessment-driven scope changes (distinct from user-deferred) — note why. Omit if none.
- 1-3 sections that changed most substantially, with a note to review before proceeding.
- **Classification shift note**: If reassessment caused the spec's effective classification to shift, name the shift explicitly. Examples:
  - "(a) new component collapsed into (b) extension after deliverable removal"
  - "(b) extension shifted to (d) retroactive after Step 3 verified full landing"
  - "(c) refactor promoted to (a)+(b) after a new package proved necessary at Step 7"

  Omit if classification is unchanged.
- **Suggested next step**:
  - **Default path** (classifications (a), (b), (c)): "Review the updated spec, then either (a) decompose into tickets by hand, or (b) invoke `spec-to-tickets` to decompose the spec into implementation tickets aligned with FOUNDATIONS.md. reassess-spec prepares specs for decomposition but does not perform it."
  - **Retroactive path** (classification (d)): archival flow:
    1. Move the spec: `git mv specs/<ID>.md archive/specs/<ID>.md` (if tracked) or plain `mv` fallback (if untracked). Detect via `git ls-files --error-unmatch specs/<ID>.md`; non-zero exit → untracked → use plain `mv`. Create `archive/specs/` with `mkdir -p` if it doesn't exist.
    2. **Reconcile `specs/IMPLEMENTATION-ORDER.md`**: find the spec's roadmap entry, verify it doesn't already say `✅ COMPLETED`, and rewrite it using the canonical format: `- **<ID>**: ✅ COMPLETED — archived at [archive/specs/<file>.md](...). <1–2 line summary of landed artifacts>.` Include delivering commit IDs or sibling-spec IDs and note any scope absorbed by downstream work.
    3. **Grep `specs/`, `archive/specs/`, and `.claude/skills/`** for paths of the form `specs/<ID>-…` and rewrite them to `archive/specs/<ID>-…`. Include archive directories explicitly — prior archived specs often forward-reference the just-archived spec.

Do NOT commit. Leave the file for user review.

## Validation Rules This Skill Upholds

- **Rule 1: No Floating Facts** — enforced at Step 4 (FOUNDATIONS alignment) and Step 6 (findings presentation). When a spec's new-system deliverables introduce canon-impacting mechanisms (validators, patch-engine write paths, canon-safety expansions), the skill flags missing scope / prerequisites / limits / consequences as Issues.
- **Rule 5: No Consequence Evasion** — enforced at Step 3.6 (downstream consumers) and Step 4. Second-order effects of a proposed change that the spec didn't address become Improvement findings.
- **Rule 6: No Silent Retcons** — enforced at Step 7 (retroactive branch requires explicit Outcome section citing delivering commits/specs) and Step 8 (classification-shift note makes retcons visible).
- **Rule 7: Preserve Mystery Deliberately** — enforced at Step 3.9 (FOUNDATIONS-contract fidelity) for any deliverable touching validators, hooks, or canon-safety surfaces. A proposal that would silently resolve a Mystery Reserve entry or weaken the MR firewall becomes a CRITICAL Issue.

## Record Schemas

N/A — this skill does not emit structured YAML records. Its output is an edited markdown spec file plus chat-presented findings and tables.

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|-----------|-------|-----------|
| Tooling Recommendation (§"non-negotiable") | Step 1 (mandatory reads) | FOUNDATIONS.md is a required read before any analysis; the skill refuses to classify or validate without it. |
| Rule 1: No Floating Facts | Steps 4, 6 | Findings flag canon-impacting deliverables lacking scope / prerequisites / limits / consequences. |
| Rule 2: No Pure Cosmetics | N/A | Not applicable — meta-tooling skill does not introduce world-level content; handoff to `canon-addition` for canon-fact additions and to `character-generation` / `diegetic-artifact-generation` for in-world content authored against existing canon. |
| Rule 3: No Specialness Inflation | N/A | Not applicable — meta-tooling skill does not add exceptional world elements; handoff to `canon-addition` for specialness-inflation guard on canon additions. |
| Rule 4: No Globalization by Accident | N/A | Not applicable — meta-tooling skill operates at pipeline scope, not world scope; there is no scope-of-a-fact to inflate. Handoff to `canon-addition` for per-fact scope detection. |
| Rule 5: No Consequence Evasion | Steps 3.6, 4 | Findings flag second-order effects the spec missed — downstream consumer analysis across `tools/*`, `.claude/skills/`, and `docs/`. |
| Rule 6: No Silent Retcons | Steps 7 (retroactive branch), 8 (classification-shift note) | Retroactive reassessments produce explicit Outcome sections; classification shifts are named in the final summary. |
| Rule 7: Preserve Mystery Deliberately | Step 3.9 | For deliverables touching validators, hooks, or canon-safety surfaces, findings flag proposals that would silently resolve Mystery Reserve entries or weaken the MR firewall. |
| Canon Layering | N/A | Not applicable — meta-tooling does not write canon; handoff to `canon-addition` for layer-assignment discipline. |
| Change Control Policy | N/A | Not applicable — meta-tooling does not emit Change Log Entries; handoff to `canon-addition` for world-level canon changes. The spec's own change control for edits to the spec file itself is covered by Step 8's post-apply confirmation + git commit discipline (deferred to user). |

## Guardrails

- **FOUNDATIONS alignment is mandatory**: Never approve a spec change that violates a FOUNDATIONS principle, even if requested — flag the conflict as a CRITICAL Issue instead.
- **Codebase truth**: All references in the updated spec must be validated. Never propagate stale paths, renamed types, or removed functions through Step 7 edits.
- **No scope creep**: The deliverable is the updated spec file. Do not write design docs, create tickets, start implementation, or edit sibling specs.
- **No approach proposals**: Validate and refine the existing design, not greenfield alternatives. Exception: when the approach violates a package boundary, FOUNDATIONS principle, or HARD-GATE discipline, propose minimum viable alternatives as part of the Issue finding.
- **No world-canon reads**: This skill does not read `worlds/<slug>/` files. Specs describe pipeline/tooling work; if a future spec genuinely requires world-canon context to validate, that's a classification-shift signal, not a prerequisite-list gap.
- **Substantial redesign flag**: If reassessment changes >50% of deliverables' approach, flag at Step 6: "This reassessment proposes substantial redesign of N/M deliverables. Goals preserved but implementation path changes significantly."
- **Worktree discipline**: If invoked inside a git worktree, all paths — reads, writes, globs, greps — resolve from the worktree root, not the main repo root.
- **Plan mode discipline**: If plan mode is active, load `references/plan-mode.md` at entry; write the plan file per its rules; call ExitPlanMode; then execute Steps 7-8 after user approval.
- **Do not `git commit` from inside this skill**: Writes land in the working tree; the user reviews the diff and commits.

## Final Rule

A reassessment is not complete until every reference in the updated spec is validated against current codebase and FOUNDATIONS.md, every approved finding has a pre-apply verification row proving the fix landed, and every eliminated or renamed reference has a post-apply grep-proof that it is gone.
