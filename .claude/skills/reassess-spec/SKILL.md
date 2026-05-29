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

**Glob/wildcard argument resolution**: If the argument contains glob wildcards (`*`, `?`, etc.), resolve via `ls`/`find` and proceed if exactly one match resolves (noting the resolution inline, e.g., *"Resolved `specs/SPEC-34*` to `specs/SPEC-34-story-validator-hardening.md`"*). If multiple matches resolve, list them and ask the user to disambiguate. If zero matches resolve, stop with an error. This mirrors the sibling pipeline convention in `spec-to-tickets/SKILL.md` Pre-flight check 4 (same Category 2 canon-pipeline-adjacent surface, same `spec_path` argument shape); the broader path-resolution discipline pattern is also documented in `skill-audit/references/audit-execution-discipline.md` §Path resolution.

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
Step 3: Codebase validation (14 substeps — load references/codebase-validation.md first)
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

## Reference-Load Checklist

This skill uses four reference files, each loaded with the Read tool at a specific step before the corresponding work begins. Each load requires a content-tied acknowledgment after the Read call (e.g., `Loaded <file> — opens with "<heading>"`); a bare `Loaded: <file>` is treated as a skipped load. Track all four through the full reassessment:

- **Step 3** — `references/codebase-validation.md` (substep selection per classification, agent-delegation guidance, specialized sub-checks)
- **Step 4** — `references/foundations-alignment.md` (FOUNDATIONS principle alignment classification)
- **Steps 5-6** — `references/findings-and-questions.md` (finding classification, presentation template, question handling)
- **Step 7** — `references/spec-writing-rules.md` (pre-apply verification, edit ordering, post-apply confirmation)

Plan-mode invocations also load `references/plan-mode.md` at entry (see §Plan Mode Awareness). Steps 1, 2, and 8 use no reference file — their procedure is self-contained in this SKILL.md.

**Load-shape decision tree** — three valid load shapes for the reference files. Choose ONE before reading the elaboration paragraphs below:

- **(a) Parallel batch** (default at session start): all four reference files (five with plan mode) loaded in one parallel Read batch immediately after Step 1's mandatory reads; one combined acknowledgment in the assistant turn that follows names each file with its content-tied opening.
- **(b) Sequential**: one Read per assistant turn across multiple turns; each Read MUST be followed by its own content-tied acknowledgment in the immediately-next assistant turn that contains that Read's tool result. A combined acknowledgment emitted AFTER N sequential Reads is treated as N skipped loads.
- **(c) On-demand at each step**: each Read deferred until its step fires (Step 3 for `codebase-validation.md`, Step 4 for `foundations-alignment.md`, etc.); each Read still requires its own content-tied acknowledgment in the immediately-next assistant turn per (b)'s per-Read rule. Choose only when there is a specific reason to defer (e.g., the re-reassessment shortcut per §Pre-Process where Steps 2-3 are scoped to a single triggering reference and only one reference file is needed).

The per-Read acknowledgment rule applies to ALL three shapes; only shape (a) collapses N acknowledgments into one combined acknowledgment because the parallel-batch syntactic constraint forces it (the batch produces all tool results in one assistant turn, leaving no syntactic place for per-file acknowledgments between the Reads). Shapes (b) and (c) provide N distinct assistant turns where per-Read acknowledgments must land; missing an acknowledgment at any of those turns is treated as a skipped load. The elaboration paragraphs below document each shape in detail.

**Default at session start: load all four reference files in a single parallel Read batch, immediately after Step 1's mandatory reads.** Load `codebase-validation.md`, `foundations-alignment.md`, `findings-and-questions.md`, and `spec-writing-rules.md` together with one combined acknowledgment per the §Parallel-batched reads rule below. The per-step *"Read this now"* commands in Steps 3-7 then act as in-step verification triggers — not first-load triggers — eliminating the backtrack pattern where an operator runs Step 3 validation greps before realizing the codebase-validation.md discipline applies and has to load the references mid-flow. Plan-mode invocations additionally load `references/plan-mode.md` per §Plan Mode Awareness — load five files in the parallel batch when plan mode is active.

Sequential on-demand loading (one Read per step, deferred until each step fires) is permitted ONLY when each Read is followed by its own content-tied acknowledgment in the next assistant turn that contains that Read's tool result (per §Parallel-batched reads rule below). Emitting a single combined acknowledgment AFTER N sequential Reads is treated as N skipped loads — the combined-acknowledgment shape is reserved for the parallel-batch case where the syntactic constraint forces it. The Default-batch path eliminates this failure mode by construction: one parallel batch + one combined acknowledgment satisfies the per-Read rule for all four files at once. Choose sequential only if you have a specific reason to defer loading (e.g., a re-reassessment shortcut per §Pre-Process where Steps 2-3 are scoped to a single triggering reference and only one reference file is needed).

**Parallel-batched reads.** When two or more reference files are loaded in the same parallel tool-call batch (whether batched with each other, with verification Bash/grep calls, or with Step 1 mandatory reads — including the spec file and FOUNDATIONS.md when those are loaded in the same parallel batch as the four reference files per the §Default at session start rule), emit a single combined acknowledgment in the assistant turn that follows the batch — naming each file individually with its content-tied opening (e.g., `Loaded foundations-alignment.md — opens with "4.0 Internal Contradictions". Loaded findings-and-questions.md — opens with "Step 5: Classify Findings".`). A combined acknowledgment satisfies the per-Read rule for each file individually as long as every file in the batch is named with its content-tied opening; a bare combined acknowledgment ("Loaded foundations-alignment.md and findings-and-questions.md.") is treated as N skipped loads, parallel to how a bare per-Read acknowledgment is treated as a skipped load. Combined acknowledgment is acceptable specifically because the parallel batch produces all results in the same tool-result turn — there is no syntactic place for per-file acknowledgments between the Reads. When reads are sequential rather than parallel-batched, each Read MUST be followed by its own content-tied acknowledgment in the next assistant turn that contains the Read's tool result; emitting a combined acknowledgment after sequential Reads is treated as N skipped loads, parallel to a bare per-Read acknowledgment. The combined-acknowledgment shape is reserved for the parallel-batch case where the syntactic constraint above forces it; sequential Reads provide per-Read syntactic places for per-Read acknowledgments and the rule applies at each Read's tool-result turn.

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

- **(a) New component** — introduces a new tool/package (new `tools/<name>/` directory), a new skill (new `.claude/skills/<name>/`), a new hook, or a new validator. Full Step 3 checklist (3.0-3.13) applies. A pre-existing placeholder at the deliverable's target path — a scaffold `README.md`, an empty `src/` tree, a type-stub file, or a Phase-0 directory scaffold — does NOT shift the classification toward (d). Phase-0 scaffolding is (a)-compatible; classification shifts to (d) only when the substantive deliverables (parser, CLI, migrations, schema) verify as implemented in code, per the (d) gate below.
- **(b) Extension** — extends an existing tool, skill, validator, or hook without introducing a new one. Steps 3.1-3.8, 3.11, 3.12, and 3.13 apply. 3.5 (skill-structure validation) applies only when the deliverable modifies a SKILL.md **structurally** (frontmatter, HARD-GATE block, Phase / Step definitions, World-State Prerequisites, Validation Rules listing, Output declarations); content-only edits to SKILL.md (rewording examples, prose updates, illustrative-YAML swaps) are 3.5 N/A — see `references/codebase-validation.md` §3.5 preamble for the gating rule. 3.9 (FOUNDATIONS-contract fidelity) applies only when the deliverable touches canon-pipeline semantics (patch-engine write paths, validator thresholds, hook enforcement, canon-safety checks). 3.10 (project-convention drift) applies only when the deliverable introduces new ID conventions or project-level conventions. 3.12 (source-document completeness check) applies only when the spec cites an external source document; self-originating specs skip 3.12. **Removal/teardown-dominant specs** (whose deliverable is *deleting* an existing field, validator, CLI, op, or symbol rather than extending it) classify as (b); 3.6 downstream-consumer analysis is the load-bearing substep — enumerate every consumer of each removed symbol, since an un-removed consumer is a correctness break (not mere drift), especially a write/stamp site that would emit a now-forbidden field under a schema's `additionalProperties: false`.
- **(c) Refactor** — structural restructuring with no behavioral change (re-exports, module splits, SKILL.md consolidation without rule changes, docs reorganization). Steps 3.0-3.4 apply. Skip 3.5 unless the refactor moves content between SKILL.md files; skip 3.7 unless package boundaries shift; skip 3.9; skip 3.10; skip 3.11 (no new deliverables in a refactor — consumer-existence is a given for code being restructured); skip 3.12 (refactors typically have no external source document); skip 3.13 (refactors don't introduce new deliverables, so spec-side structural completeness is moot). Focus on symbol existence, count accuracy, blast radius.
- **(d) Retroactive reassessment** — validation concludes (via Step 3 evidence) that all deliverables already landed through downstream commits or sibling specs. **Not pre-selected** — activates only when every deliverable verifies as implemented in code. The user hint "I suspect this already landed" is a soft signal, not a classification by itself; only Step 3 evidence can confirm (d).
  - Steps 3.1-3.4 apply rigorously to prove landing; cite file paths + line numbers as evidence. Skip Steps 3.5-3.9, 3.11, and 3.13 (ripple/consumer/structural-completeness substeps) — the work has already shipped, consumers exist by definition or the code would be visibly dead, and a retroactive spec's structural-completeness lives in its Outcome section (per Step 7 retroactive branch), not in §3.13. 3.10 (project-convention drift) applies only when the landed work introduced new ID conventions or project-level conventions that may need documenting in CLAUDE.md. 3.12 (source-document completeness check) applies in its stronger retroactive variant: verify each "accepted" claim in the spec's §Approach actually landed (cross-reference §3.1-§3.4's rigorous-landing posture); unredeemed accept claims are HIGH Issues per Rule 6 No Silent Retcons.
  - **Step 7 output shape switches to Outcome population + archival**, not deliverable refinement.
  - **Step 8 switches to archival flow** — move spec to `archive/specs/`, reconcile `specs/IMPLEMENTATION-ORDER.md`.
  - Classification shift from (a)/(b)/(c) → (d) is a legitimate and common outcome when a spec is reassessed after downstream work ships. Name the shift explicitly in Step 8.

**ID-uniqueness pre-check**: Confirm the spec's integer ID is unique across the `specs/` + `archive/specs/` union — run `ls specs/SPEC-<N>-*.md archive/specs/SPEC-<N>-*.md 2>/dev/null | wc -l`. A count >1 indicates a parallel-session race condition that left an ID collision (the brainstorm skill assigns IDs via its §System spec rule's "scan `specs/` + `archive/specs/` together for the next free integer" scan, but a parallel session can land an archived spec with the same ID between assignment-time and reassessment-time). When a collision is detected, surface as a CRITICAL Issue at Step 5 and a Question at Step 6 offering renumber to the next free integer (per the brainstorm skill's §System spec rule in `.claude/skills/brainstorm/references/deliverable-classification.md` §System spec). The check is cheap (one `ls` call) and deterministically catches collisions that §3.8's content-overlap grep can miss for cross-domain races where the two specs share no vocabulary.

**Deliverable removal**: If validation reveals a deliverable should be removed entirely, skip remaining Step 3 substeps for that deliverable and record the removal as a finding. If only part of a deliverable should be removed (sub-items, table rows, field list entries), record the partial removal as a finding but continue substep validation for the surviving parts.

**Per-deliverable already-landed (partial landing)**: Distinct from whole-spec **(d) retroactive** (where *every* deliverable landed) and from §Deliverable removal (a reassessment decision to drop a deliverable): when Step 3 evidence shows a *single* deliverable already shipped — typically via a sibling or archived spec in the same bundle, or a prior commit — while other deliverables remain pending, the spec's classification stays (a)/(b)/(c). Reframe that one deliverable as historical/no-op: record it as already-landed in §Approach / §Deliverables and cite the delivering commit or sibling spec (Rule 6 No Silent Retcons — the landing must be attributed, not silently dropped), and route any residual sub-task the landed work did not cover (e.g., a still-pending doc-block removal) to a deferred note. Do NOT flip the whole spec to (d); only the landed deliverable becomes historical. Worked precedent: SPEC-95 reassessment (2026-05-29) — D4's `prose-receipt.schema.json` removal had already landed via sibling SPEC-93, so D4 was reframed documentation-only (file-removal no-op, delivering sibling cited) while D1/D2/D3 stayed pending under the (a)+(b) classification.

**Hybrid specs**: Apply the union of applicable substeps — use the most rigorous classification's checklist for shared substeps. Common hybrids:
- **(a)+(b)**: new component with migration of existing types — full (a) checklist, plus 3.6 cross-package consumer analysis on every migrating symbol.
- **(a)+(b) variant — new component(s) + a thin schema-field-requirement tightening on an existing schema file (no type migration)**: full (a) checklist (or the (a) variant below when the new components register via a shared array/registry edit) for the new components, plus 3.2 schema-fidelity validation on the edited schema file; 3.6 is N/A (nothing migrates across packages). Worked example: a spec adding N new validators (registry-append (a) variant) plus moving an existing optional field into a schema's `required` array — the new validators follow the (a)-variant checklist, the `required`-array edit is validated at 3.2 against the live schema, and no cross-package consumer analysis runs.
- **(a)+(b) variant — new component(s) + substantial schema-shape change on an existing schema file (enum collapse, new required object field, enum extension, but no cross-package type migration)**: full (a)-variant checklist for the new components, plus 3.2 schema-fidelity validation on every changed shape, plus 3.6 cross-package consumer analysis on retired / changed enum values OR retired / repurposed required-field consumers (per §3.6's broadened scope covering new / retired / changed values). No inter-package type migration means no 3.7 boundary-crossing work, but the consumer-count of retired enum values can be high. Worked example: a spec adding 4 new structural validators + collapsing two enum values into a new combined value on an existing schema's required field (e.g., an `event_kind` enum-collapse plus a new top-level required object on the same schema) — the new validators follow the (a)-variant checklist; the enum change is validated at 3.2 against the live schema; 3.6 enumerates every consumer of each retired enum value across `tools/*`, `.claude/skills/`, and test fixtures.
- **(b)+(c)**: extension with incidental restructuring — full (b) checklist; (c) applies only to the restructuring parts.
- **(a) variant — new components registered in an existing framework via a single shared array/registry edit**: pure (a) classification with 3.6 cross-package consumer analysis SKIPPED (no migrating symbols cross packages); 3.7 package-boundary validation applies ONLY to the shared registry/manifest edit surface itself, not to the new component implementations. Worked example: a spec adding N new validators each registering in `tools/validators/src/public/registry.ts` — pure (a) per validator + per-validator registry append; the registry append is checked at 3.7 to confirm the validator package boundary is respected, but no cross-package consumer analysis runs because no existing consumers are affected. This shape generalizes to any "new sibling implementation + N tiny shared-registry-file appends" pattern common in mature frameworks (other examples — new hooks registered in `.claude/settings.json` patterns, new MCP tools registered in `tools/world-mcp/`'s tool-registration surface — should be verified against the actual registration site at audit time before being claimed as instances).
- **(a)-extending-archived-sibling — new component primarily, but the spec also declares deliverables that touch code landed by an archived/COMPLETED sibling spec**: pure (a) classification with the additional posture that deliverables modifying landed code from a sibling spec are legitimate when (i) the sibling spec is COMPLETED+archived (or otherwise marks itself as done in `specs/IMPLEMENTATION-ORDER.md` or its own Status frontmatter), (ii) the deliverable is declared as NEW work in the primary spec, not framed as a sibling amendment, and (iii) the deliverable's framing explicitly notes the landed-code touch with a phrase like "extends landed SPEC-NN backend code as new SPEC-MM work — not a SPEC-NN amendment, since SPEC-NN is COMPLETED+archived". The deliverables run the full (a) checklist for the new component, plus 3.7 package-boundary validation on every landed-code-touching deliverable (the touch must respect the fenced sibling's package boundaries — e.g., adding a `@fastify/static` dependency to a fenced backend is allowed since static-serve is read-only and preserves the fence; adding a `@worldloom/patch-engine` dependency would NOT be allowed) and 3.1 file-paths check on every landed file the spec proposes to modify. Worked example: a frontend spec (the new component) adding deliverables to modify the sibling backend spec's landed `tools/<pkg>/package.json` scripts (chain web build) and `tools/<pkg>/src/server/http.ts` (register static-serve middleware) — pure (a) per the new frontend, plus per-touch 3.7+3.1 validation on the backend modifications. Worked precedent: SPEC-88 reassessment (2026-05-26) — Q1=(a) authorized two SPEC-87-landed-code-touching deliverables (backend `package.json` script chaining + `@fastify/static` registration in `src/server/http.ts`); the spec edits explicitly framed both as "extends landed SPEC-87 backend code as new SPEC-88 work — not a SPEC-87 amendment, since SPEC-87 is COMPLETED+archived". Distinct from §Guardrails "No scope creep" prohibition (which addresses sibling SPEC FILE edits, not landed CODE edits — see the §Guardrails carve-out cross-reference).

**Emergent migration at Step 7**: If Step 7 edits introduce cross-package migration not part of the original spec (typically surfaced by the pre-apply verification table), re-promote the classification to `(a)+(b)` and run 3.6 cross-package consumer analysis on the migrating symbol before finalizing edits. Record the scope extension in the pre-apply table per the scope-extending tier.

**Re-reassessment shortcut**: If the same spec was reassessed earlier in this session and not externally modified, Steps 2-3 may scope to only references affected by the triggering change. Step 1 still applies.

**Same-session sibling-verification reuse**: When references in the spec were already validated against the codebase earlier in this session by a sibling operation — Explore-agent verification passes, a prior `/brainstorm` triage that authored the spec, a prior audit — those references need not be re-grepped from scratch, provided the underlying files are unchanged since that verification (any in-session edit or external modification to a file voids reuse for that file's references, parallel to the `not externally modified` clause above). Cite the prior-verification provenance in the Step 7 pre-apply verification table's Result column (e.g., `prior-session Explore verification, file unchanged — confirms <claim>`) rather than re-running the check. Step 3 still freshly validates every reference NOT covered by a prior same-session verification, and any reference whose file changed since that verification is re-validated. **Reuse covers only references *named in the spec*.** Substeps 3.6 (downstream-consumer discovery) and 3.11 (new-deliverable consumer verification) ALWAYS run fresh regardless of same-session reuse, because a prior verification that *authored* the spec is structurally incapable of having discovered consumers the spec failed to name — reusing it there would propagate the spec's own blind spots into the reassessment. (Sibling precedent: the **Brainstorm-produced specs** clause in `spec-to-tickets/SKILL.md` likewise treats brainstorm's in-context exploration as reusable evidence yet still runs fresh greps for what brainstorm did not explicitly verify — notably schema-field validation.) This does not relax the Final Rule's completeness requirement — it recognizes that validation performed earlier in the same session is still validation. The fresh-validation count (gross references minus those covered here), not the gross count, drives the Step 2 `>15` TaskCreate/tracking threshold — see §Reference-count checkpoint.

## Step 1: Mandatory Reads

Read ALL of these before any analysis:

1. **The spec file** (from `spec_path`) — entire file.
2. **`docs/FOUNDATIONS.md`** — skip if read earlier in this session and unmodified.
3. **`docs/HARD-GATE-DISCIPLINE.md`** — only if Pre-Process classification surfaced a deliverable that modifies skill HARD-GATE semantics or canon-write ordering. Skip otherwise.

Parse the spec's metadata: Phase, Status, `Depends on:` / `Predecessors:` / `Blocks:` / `Related:`, Problem Statement / Approach / Deliverables / FOUNDATIONS Alignment / Verification / Out of Scope / Risks, and all deliverable sections.

**Non-numbered deliverables**: If the spec uses sections instead of numbered deliverables (common for multi-part specs like SPEC-05 Hooks or SPEC-07 Docs Updates), or numbered items under a `§Scope` / `§In scope` list (e.g., SPEC-96's §2 In scope items 1–7), treat each distinct implementation section (or numbered in-scope item) as a deliverable for validation purposes. Adapt references to "deliverable numbers" throughout this skill to the spec's actual organizational scheme (section headers, part labels).

## Step 2: Extract References

Extract every concrete codebase reference from the spec:

- **File paths** (both existing — `docs/FOUNDATIONS.md`, `.claude/skills/canon-addition/SKILL.md` — and proposed — `tools/world-index/src/parse/semantic.ts`)
- **Type names, interface names, SQL column names** (e.g., `CanonFactRecord`, `edge_type`, `PatchPlan`)
- **Function / CLI command / MCP tool names** (e.g., `world-index build`, `submit_patch_plan`, `validatePrereqs`)
- **Package / skill / hook names**
- **Spec or skill dependencies** — referenced at `Depends on:`, `Predecessors:`, `Blocks:`, `Related:` headers, or in prose. All four are valid dependency-declaration surfaces in worldloom spec conventions.
- **Source documents** — for specs that cite an external source document (audit reports under `reports/`, brainstorm outputs under `docs/plans/`, deep-research reports, or any other artifact the spec names as the origin of its findings) in their Problem Statement, Motivating Evidence, or Approach sections, extract the document path AND enumerate its claims / recommendations at Step 2 itself — read the source document (using section-targeted reads with **permissive grep anchoring** for oversized docs, e.g., `grep -n '6\.13'` over the full file or `grep -nE '^#+ .*6\.13'` rather than strict heading-depth patterns like `^### 6.13` — source reports may use bold-wrapped headings (`### **6.13 ...**`), alternate heading depths, or non-heading anchors that strict-anchored greps miss), enumerate the document's actionable claim-set (numbered findings, P-tier items, surgical-hole lists, "deterministic validators to strengthen" tables, or any other actionable claim-set the document presents), and tag each claim's adjudication status (accept / reject / defer / unadjudicated — a claim a *shared-bundle* source document routes to a sibling spec, cited in §Out of Scope as "→ SPEC-NN", tags as a named-surface defer/reject variant, **not** unadjudicated, per §3.12) by scanning the spec's §Approach + §Deliverables + §Out of Scope sections. The per-document counts feed directly into the §Source-document engagement-evidence checkpoint emission below. Step 3.12 (Source-Document Completeness Check) consumes the Step-2-enumerated claim list and runs the verification + surfacing work — the identification + enumeration is done here at Step 2 so the checkpoint emission has real integers to report before Step 3 begins. **Narrative-prose source sections** (sub-headed architecture recommendations, nested-bullet discussion with no atomically-numbered claim units — common in deep-research and architecture reports, as distinct from the numbered-findings / P-tier / table forms above) are enumerated at the granularity of their distinct recommendation units: one per sub-heading or per load-bearing bullet group. Name the chosen granularity in the §Source-document engagement-evidence checkpoint emission (e.g., `16 recommendation units across §6/§8/§9, counted per sub-area`) rather than emitting a bare or approximate count — this applies the §Enumerable-group counting reproducibility discipline to claims as it governs references, so a future reviewer re-extracting the claim-set reproduces the same integer.
- **Code examples** (inline TypeScript, SQL, YAML, JSON schema snippets, JSONSchema blocks) — extract for fidelity checking
- **Hook, validator, or MCP tool configuration** referenced by the spec — extract threshold values, severity mappings, exit codes
- **Package dependencies** — for specs that introduce a new `tools/<name>/` package or modify an existing one, also extract the dependency list from the accompanying `tools/<name>/README.md` (and `tools/<name>/package.json` if present). README-declared deps often name concrete packages (`better-sqlite3`, `remark-gfm`) where the spec's prose only names umbrella frameworks (`SQLite`, `remark`); Step 3.4 compares the two surfaces for drift.
- **Structured-ID prefixes** — every canon-record or skill-output prefix the spec uses (`CF`, `CH`, `INV`, `M`, `OQ`, `ENT`, `SEC`, `PA`, `CHAR`, `DA`, `PR`, `BATCH`, `NCP`, `NCB`, `AU`, `RP`, or any new spec-introduced canon-record / skill-output prefix). Step 3.10 compares these against `CLAUDE.md` §ID Allocation Conventions. Spec-decomposition ticket prefixes (`SPEC<NN><FAM>-NNN`) are NOT extracted under this bullet — they are governed by the spec's own §Risks / open-question section, not by §ID Allocation Conventions, and 3.10 does not apply to them. Story-bundle ID classes (`STENT`, `STSTAT`, `STINT`, `BEL`, `SE`, `OBL`, `CNSQ`, `THR`, `SREL`, `STLOC`, `STOBJ`, `STSEC`, `CLK`, `STQ`, `BR`, `PG`, `CHC`, `SLT`, story-local `DA`, plus any new spec-introduced story-bundle-scoped class) are documented in `docs/FOUNDATIONS.md` §Story Bundles §6 (Story-Bundle ID Classes), not in `CLAUDE.md` §ID Allocation Conventions; Step 3.10 compares story-bundle prefixes against FOUNDATIONS §6 instead of CLAUDE.md.

Build a validation checklist. For specs with >15 references, consider `TaskCreate` to track validation systematically; per-reference granularity (one task per reference, marked `validated | drifted | missing` via `TaskUpdate`) is appropriate when references span multiple unrelated subsystems, while a single tracking task with mental per-reference status is acceptable when references cluster tightly (e.g., all in two skills + one source report). Auditor judgment based on reference complexity. **When Step 3 validation is delegated to parallel Explore agents** (per `references/codebase-validation.md` §Agent Delegation), the agents' consolidated structured returns satisfy the systematic-tracking intent — per-reference `TaskCreate` is then optional even above the >15 threshold; record the delegation in the §Reference-count checkpoint note instead (e.g., `Reference count: 77 — validated via 3 Explore agents; mental tracking sufficient`). **The same TaskCreate-optional latitude applies when Step 3 validation runs as direct parallel `grep` batches against a tightly-clustered reference set** (all references concentrated in a small, known set of files — e.g., two skills plus one source report): the batched greps give systematic per-reference coverage equivalent to the agent-delegation case, so mental tracking is sufficient even above >15; record it in the checkpoint note (e.g., `Reference count: 40 — validated via direct parallel-grep batches over ~12 clustered files; mental tracking sufficient`). **Extension for removal/rename specs**: classification-(b) removal/teardown-dominant or validator/symbol-rename specs (per §Pre-Process) inherently spread their references across many consumer packages — that spread is exactly what §3.6 downstream-consumer analysis hunts — so a *tightly-clustered* reference set is not the test for these specs. Direct parallel-`grep` batches remain the right tool regardless of clustering, because exact-symbol consumer enumeration is what §3.6 demands and Explore-agent delegation is strictly worse at exact-symbol counting; the TaskCreate-optional latitude therefore applies to a deliberately-spread removal/rename reference set on the strength of the exact-symbol-match need, not clustering. Record it in the checkpoint note naming the driver (e.g., `Reference count: 51 — validated via direct parallel-grep batches across 5 packages; spread is §3.6-inherent for a removal/rename spec, mental tracking sufficient`). For specs with ≤15 references, mental tracking is acceptable.

Prioritize references most likely to have drifted: import paths, function signatures, types the spec extends, sibling-spec Dependency paths. Stable references (FOUNDATIONS.md principle names, Canon Fact Record field names) can be spot-checked.

**Reference-count checkpoint**: Before starting Step 3, emit the extracted reference count as a one-line user-facing note naming the threshold-decision explicitly — e.g., `Reference count: 28 — TaskCreate recommended per Step 2 threshold` or `Reference count: 9 — mental tracking sufficient`. The note makes the >15 threshold-decision auditable and prompts actual TaskCreate invocation when warranted; auditors who skip the note tend to default to mental tracking regardless of count. Use the exact integer count (e.g., `28`, `9`); do not use ranges (`30+`) or approximations (`~30`) — the threshold-decision is reproducible only when a future reviewer can compare the extracted count against the >15 threshold directly. **Composition with §Same-session sibling-verification reuse**: when prior-session verification covers part of the reference set (per the Pre-Process clause), the `>15` TaskCreate/tracking threshold keys off the count of references **needing fresh validation** (gross minus reused), not the gross total — tracking 90 references when 82 are pre-validated and 8 need checking is ceremony. Report both in the checkpoint note so the override is auditable, e.g., `Reference count: 90 total, 82 reused (prior-session verification, files unchanged), 8 fresh — mental tracking sufficient`. The exact-integer rule applies to the gross total and the fresh count; the reused-count may be an estimate (it reflects prior coverage, not the threshold-decision count).

**Common over-approximation pitfall**: a spec with 8 sibling-spec dependencies + 12 file paths + 15 schema field references + 4 ID classes counts as 39 references (the literal sum), NOT *"~40"* or *"40+"*. Resist rounding when categories cluster — the threshold-decision against >15 only reproduces when the integer is exact. If categories cluster tightly, optionally list per-category counts in the threshold-decision note (e.g., `Reference count: 8 spec deps + 12 paths + 15 schema fields + 4 IDs = 39 — TaskCreate recommended`). The per-category breakdown surfaces which references the validation will need to spend the most time on (typically schema fields and sibling-spec deliverables drift fastest) and prevents the "looks roughly like 40" mental-rounding pattern.

**Symmetric pitfall — per-category-with-approximations**: `Reference count: ~17 file paths + ~25 type/field references + ~8 sibling-skill cross-references = ~50` is a violation of the exact-integer rule even though the per-category structure shows semantic decomposition. The tildes (~) defeat the reproducibility the integer rule was designed to preserve — a future reviewer comparing `~50` against the >15 threshold cannot tell whether the actual count was 47 or 53, and a reproducibility-checking re-extraction of the references could disagree with any of those numbers without the disagreement being detectable. Use exact integers in every component AND the sum: `Reference count: 17 file paths + 25 type/field references + 8 sibling-skill cross-references = 50 — TaskCreate recommended`. The per-category breakdown is optional polish; the exact-integer rule is non-negotiable and applies to every component as well as the total.

**Enumerable-group counting**: a fixed, closed set validated by a single presence/shape check — the 13 required H2 sections confirmed present in one grep, an N-value closed enum checked as a unit — counts as **1** reference, not N, because one check covers the whole set and a re-extraction reproduces the same single check. Count members individually only when each is independently grepped or validated and can drift independently (the `15 schema field references` in the §Common over-approximation pitfall example above are individually-validated fields, hence 15). When the grouping decision is not obvious, state it inline in the checkpoint note (e.g., `Reference count: ... + 1 H2-section-set (13 sections, single presence check) = N`) so the integer stays reproducible — the exact-integer rule's reproducibility goal is defeated if a re-extraction could legitimately count the same group as either 1 or N.

**Source-document engagement-evidence checkpoint** (applies when source documents are cited): when the spec cites one or more external source documents (per the §Source documents bullet above), emit a one-line user-facing note before Step 3 begins naming each source document and the per-document claim adjudication counts from the Step 2 enumeration — format: `Source-document engagement: <doc-path>: N claims enumerated, M adjudicated (accept / reject / defer / route-to-sibling), (N-M) unadjudicated flagged as Step 5-6 findings.` For a **shared-bundle source document** (one triage report spawning an additive + subtractive spec pair), report sibling-owned claims with a `route→<sibling-spec> [landed]` disposition rather than counting them unadjudicated (per §3.12 step-1's Routed-to-a-paired/sibling-spec bucket) — e.g., `20 claims enumerated, 20 adjudicated (7 accept→SPEC-93; 10 route→SPEC-92 [landed]; 3 defer→<surface>); 0 unadjudicated`. When §3.12 is skip-eligible (refactor classification, or no external source document cited per §3.12's Skip conditions), emit `Source-document engagement: N/A — <reason>` instead. The checkpoint makes Step 2's claim enumeration auditable from the user-facing emission, parallel to §Reference-count checkpoint above and §Redesign-count checkpoint at Step 5-6; without an explicit emission, the enumeration can be silently truncated to a "trust the source flow" judgment skip even when source documents are cited and the substep is not skip-eligible. Use the literal `Source-document engagement:` label for grep-searchability parallel to the other two checkpoint labels. The `accept` count covers refined/partial accepts as well: when the spec adopts a claim's intent but deliberately diverges from the source's specifics (per §3.12 step-1's Accepted bullet), count it under `accept` and name the divergence in the per-claim mapping rather than coining an out-of-vocabulary status label. When the source's claims were enumerated at recommendation-unit granularity (per the §Source documents narrative-prose rule above, for sources with no atomically-numbered claims), name that granularity in the `N claims enumerated` term (e.g., `16 recommendation units (counted per sub-area) enumerated`) so the count stays reproducible rather than reading as a bare or approximate integer.

## Step 3: Codebase Validation

**Read `references/codebase-validation.md` now, with the Read tool, before classification-driven substep selection.** Surface validation (listing directories, reading sibling specs, confirming referenced paths exist) may run in the same tool-call batch as the Read, but the Read must complete before classification-sensitive work begins (which substeps apply per (a)/(b)/(c)/(d), specialized sub-checks per substep, agent-delegation guidance). Surface validation does NOT substitute for the load — listing directories without consulting the reference's substep guidance is a skipped load. Emit a content-tied acknowledgment immediately after the Read call — e.g., `Loaded codebase-validation.md — top section is "3.0 Cross-Package Scope Establishment"`. A bare "Loaded: codebase-validation.md" is treated as a skipped load.

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

**In-conversation no-stopping directives**: when the user provides an in-session instruction like *"work without stopping"* or *"don't ask clarifying questions"* via prose or system-reminder (distinct from formal auto-mode), apply the same auto-mode carve-out rule: proceed directly to Step 7 ONLY when no Issues (CRITICAL/HIGH) and no Questions. The presence of any Issue or open Question still triggers the wait-for-user gate per the HARD-GATE clause — the no-stopping directive does NOT override the gate's narrow scope. Cite the directive verbatim in Step 6 if proceeding directly (e.g., *"User directive: 'work without stopping' — applied; no Issues / no Questions, proceeding to Step 7"*); cite it inline if the gate still holds (e.g., *"User directive: 'work without stopping' — applied where possible, but CRITICAL Issue I1 + open Questions Q1-Q3 trigger the wait-gate per HARD-GATE clause"*).

**Recommended-disposition path**: when EVERY Issue (CRITICAL/HIGH) has an explicit recommended resolution surfaced inline AND every Question has a recommended answer with rationale AND the user's directive is no-stopping, the operator MAY proceed to Step 7 by applying the named resolutions/answers, citing each in user-facing prose before the Step 7 write. **This carve-out is scoped to in-conversation no-stopping directives only; under formal auto-mode (per `## Auto Mode Active` system reminder), the `Auto-mode interaction` rule's wait-gate posture controls and the carve-out does NOT apply** — the trigger phrasing *"the user's directive is no-stopping"* refers to in-conversation prose directives, not to formal auto-mode, because the two have distinct audit-trail semantics (in-conversation directives are inline-citable per the rule above; formal auto-mode has no inline citation to anchor the carve-out's "Cite the directive verbatim" requirement). The resolutions/answers are auditable-and-redirectable — the user can challenge any before/after the write. This carve-out applies ONLY when every Issue/Question has an explicit named resolution; if any Issue is surfaced without a recommended resolution (because the operator could not determine the right routing) or any Question is left open for genuine user input, the wait-for-user gate still holds per the HARD-GATE clause. Cite the directive verbatim when applying the carve-out (e.g., *"User directive: 'work without stopping' — applying named resolutions inline; user can redirect"*). This resolves the friction between strict-gate enforcement and user-directive autonomy when the operator has explicit named resolutions. Parallel to spec-to-tickets's §In-conversation no-stopping directives §Recommended-disposition path; the two skills' no-stopping handling stays symmetric.

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

**User-answered rows**: when the user explicitly answers a Step 6 Question with an option label, put the answer in the Check column (format: `User answer Q<N> = (<option>): <one-line paraphrase of the chosen option>`); put the resulting spec edit in the Result column (format: `Apply as: <concise edit description>`). Judgment-prefix is not required — the Question + answer IS the check. This row shape is parallel to command-backed and `Judgment — …` rows, not a subset of either; see `references/spec-writing-rules.md` §Pre-Apply Verification for the row-shape taxonomy. When the user delegates resolution to the reassessor's reasoning ("you decide based on FOUNDATIONS") rather than answering with an option label, use the `Judgment — …; Q<N> delegated` shape shown in the M3 example instead. When the answer confirms content the spec already contains and no edit follows, the Result reads `no edit — confirms existing §<section>` — see `references/spec-writing-rules.md` §Pre-Apply Verification for the no-op variant.

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
- **Scope expansion within classification**: if reassessment expanded the spec's deliverable surface to touch packages, files, or sibling skills not named in the original spec (without shifting the classification itself — see `Classification shift note` below for the cross-classification case), list the surfaces and the surfacing substep (typically §3.6 cross-package consumer analysis, §3.1 file-paths check, or §3.4 active-sibling named-list drift). Distinct from two existing slots that operate at different granularity: (a) the §Pre-Apply Verification scope-extending mismatch tier (`references/spec-writing-rules.md`) — per-finding, fires when an approved recommendation requires a deliverable / package boundary change not discussed at question time; (b) the §Guardrails "Cross-spec scope extension" line — fires when a user-directed Q-response authorizes a sibling-spec edit. The bullet here is collection-level — multiple findings (e.g., I1-I7) all surface from the same Step 3 consumer-discovery activity and collectively expand the spec's deliverable surface, without any individual finding being a pre-apply mismatch or any Q-response authorizing a sibling edit. Omit if no spec-level scope expansion occurred.
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
| Rule 2: No Pure Cosmetics | N/A | Not applicable — this canon-pipeline-adjacent (Category 2) skill produces specs, not world-level content; handoff to `canon-addition` for canon-fact additions and to `character-generation` / `diegetic-artifact-generation` for in-world content authored against existing canon. |
| Rule 3: No Specialness Inflation | N/A | Not applicable — this canon-pipeline-adjacent (Category 2) skill does not add exceptional world elements (its output is a spec, not world canon); handoff to `canon-addition` for specialness-inflation guard on canon additions. |
| Rule 4: No Globalization by Accident | N/A | Not applicable — this canon-pipeline-adjacent (Category 2) skill operates at pipeline scope, not world scope; there is no scope-of-a-fact to inflate. Handoff to `canon-addition` for per-fact scope detection. |
| Rule 5: No Consequence Evasion | Steps 3.6, 4 | Findings flag second-order effects the spec missed — downstream consumer analysis across `tools/*`, `.claude/skills/`, and `docs/`. |
| Rule 6: No Silent Retcons | Steps 7 (retroactive branch), 8 (classification-shift note) | Retroactive reassessments produce explicit Outcome sections; classification shifts are named in the final summary. |
| Rule 7: Preserve Mystery Deliberately | Step 3.9 | For deliverables touching validators, hooks, or canon-safety surfaces, findings flag proposals that would silently resolve Mystery Reserve entries or weaken the MR firewall. |
| Canon Layering | N/A | Not applicable — this Category 2 skill does not write canon (it produces specs); handoff to `canon-addition` for layer-assignment discipline. |
| Change Control Policy | N/A | Not applicable — this Category 2 skill does not emit Change Log Entries; handoff to `canon-addition` for world-level canon changes. The spec's own change control for edits to the spec file itself is covered by Step 8's post-apply confirmation + git commit discipline (deferred to user). |

## Guardrails

- **FOUNDATIONS alignment is mandatory**: Never approve a spec change that violates a FOUNDATIONS principle, even if requested — flag the conflict as a CRITICAL Issue instead.
- **Codebase truth**: All references in the updated spec must be validated. Never propagate stale paths, renamed types, or removed functions through Step 7 edits.
- **No scope creep**: The deliverable is the updated spec file. Do not write design docs, create tickets, start implementation, or edit sibling spec files. (Note: this prohibition addresses sibling SPEC FILES, not landed CODE from those specs. Adding deliverables to the primary spec that touch landed sibling code is governed by the §Pre-Process "(a)-extending-archived-sibling" clause — allowed and common when extending an already-shipped foundation, provided the (i)/(ii)/(iii) conditions there are met.) **User-directed authorization carve-out**: a Step 6 question response that explicitly directs a sibling-spec edit (e.g., *"add the note to SPEC-X"* in answer to a Q3-style question about cross-spec dependency handling) extends the deliverable scope to the named sibling spec for the content the user explicitly authorized. Record the cross-spec edit in Step 8's summary under a dedicated *"Cross-spec scope extension"* line — parallel to the existing scope-extending tier in `references/spec-writing-rules.md` §Pre-Apply Verification. The carve-out is bounded — only files the user explicitly named are in scope, and only the content the user authorized; speculative cross-spec edits and content-expansion beyond the user's authorization remain forbidden.
- **No approach proposals**: Validate and refine the existing design, not greenfield alternatives. Exception: when the approach violates a package boundary, FOUNDATIONS principle, or HARD-GATE discipline — or conflicts with the established architectural / framework model of the package or system the deliverable builds on (e.g., the validator-framework flat registry + run-loop contract, the patch-engine typed-op vocabulary, the world-index parse/index surface) — propose minimum viable alternatives as part of the Issue finding.
- **No world-canon reads**: This skill does not read `worlds/<slug>/` files. Specs describe pipeline/tooling work; if a future spec genuinely requires world-canon context to validate, that's a classification-shift signal, not a prerequisite-list gap.
- **Substantial redesign flag**: If reassessment changes >50% of deliverables' approach, flag at Step 6: "This reassessment proposes substantial redesign of N/M deliverables. Goals preserved but implementation path changes significantly."
- **Worktree discipline**: If invoked inside a git worktree, all paths — reads, writes, globs, greps — resolve from the worktree root, not the main repo root.
- **Plan mode discipline**: If plan mode is active, load `references/plan-mode.md` at entry; write the plan file per its rules; call ExitPlanMode; then execute Steps 7-8 after user approval.
- **Do not `git commit` from inside this skill**: Writes land in the working tree; the user reviews the diff and commits.

## Final Rule

A reassessment is not complete until every reference in the updated spec is validated against current codebase and FOUNDATIONS.md, every approved finding has a pre-apply verification row proving the fix landed, and every eliminated or renamed reference has a post-apply grep-proof that it is gone.
