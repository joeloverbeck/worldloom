---
name: spec-to-tickets
description: "Use when decomposing a worldloom spec into actionable implementation tickets aligned with FOUNDATIONS.md. Produces: ticket files at tickets/<NAMESPACE>-<NNN>.md, one per reviewable diff. Mutates: only tickets/ (never specs/, .claude/skills/, docs/, or worlds/<slug>/)."
user-invocable: true
arguments:
  - name: spec_path
    description: "Path to the spec file (e.g., specs/SPEC-03-patch-engine.md)"
    required: true
  - name: namespace
    description: "Ticket namespace prefix, used as <NAMESPACE>-<NNN>.md (e.g., SPEC03PATENG). If omitted, the skill proposes one derived from the spec number and title and asks the user to confirm."
    required: false
---

# Spec to Tickets

Break a worldloom spec into a series of small, actionable implementation tickets that a human reviewer can merge one at a time, validated against the current codebase and aligned with FOUNDATIONS.md.

<HARD-GATE>
Do NOT Write any ticket file at `tickets/<NAMESPACE>-<NNN>.md` until ALL of the following hold:

(a) Pre-flight has verified `docs/FOUNDATIONS.md`, `tickets/_TEMPLATE.md`, `tickets/README.md`, and `<spec_path>` are all readable; if any is missing the skill aborts before Step 1.

(b) Step 2 (Codebase Validation) has completed, and every surfaced Issue (missing file, renamed type, stale skill reference, broken Deps chain, FOUNDATIONS-violating assumption) has an explicit user disposition — fix before decomposition, defer to a follow-up ticket with a named dependency, or reject with rationale.

(c) Step 4 has emitted the decomposition summary table in chat (numbered tickets with Title, Scope, Effort, Deps, FND, Notes columns) AND the user has explicitly approved it, OR the auto-mode auto-approval condition has fired (auto mode active AND Step 2 surfaced no Issues AND no reassessment findings were deferred).

(d) Every `Deps` reference in the proposed decomposition resolves to a ticket that will actually be produced in this run, or to a pre-existing ticket/spec path that Pre-flight confirmed is readable.

This gate is authoritative under Auto Mode or any other autonomous-execution context — invoking this skill does not constitute approval of the decomposition. The skill may only proceed to Step 5 (batched ticket writes) once every gate condition above holds simultaneously.
</HARD-GATE>

## Process Flow

```
Pre-flight: Verify required files readable (FOUNDATIONS.md, tickets/_TEMPLATE.md,
            tickets/README.md, <spec_path>); derive+confirm <namespace> if omitted.
       |
       v
Step 1: Mandatory reads (spec file, tickets/_TEMPLATE.md, tickets/README.md,
        docs/FOUNDATIONS.md)
       |
       v
Step 2: Codebase validation (full OR abbreviated spot-check when /reassess-spec
        ran in-session). Surface Issues; await per-Issue disposition.
       |
       v
Step 3: Decompose the spec (reviewable-diff sizing, dependency mapping,
        priority ordering, deliverable-coverage enforcement)
       |
       v
Step 4: Present decomposition summary table in chat; await user approval
        (or auto-mode auto-approval when Step 2 was clean)
       |
       +-- [HARD-GATE fires here — see top of skill]
       |
       v
Step 5: Batched ticket writes (one or a few assistant messages, N Write tool
        calls in parallel, one per ticket at tickets/<NAMESPACE>-<NNN>.md)
       |
       v
Step 6: Final summary (cross-ticket dependency verification, deliverable
        coverage mapping, dependency graph, suggested implementation order).
        Do NOT commit.
```

## Inputs

**Required:**
- `spec_path` — path to the spec file (e.g., `specs/SPEC-03-patch-engine.md`). Must exist and be readable at Pre-flight.

**Optional:**
- `namespace` — ticket namespace prefix (e.g., `SPEC03PATENG`). If omitted, the skill proposes one derived from the spec ID and abbreviated title and asks the user to confirm or override before Step 1.

## Output

- **Ticket files at `tickets/<NAMESPACE>-<NNN>.md`** — one per reviewable diff, each following the exact structure in `tickets/_TEMPLATE.md` (Status, Priority, Effort, Engine Changes, Deps, Problem, Assumption Reassessment, Architecture Check, Verification Layers, What to Change, Files to Touch, Out of Scope, Acceptance Criteria, Test Plan).
- **Decomposition summary table** — emitted in chat at Step 4 before any Write.
- **Final summary** — emitted in chat at Step 6 (cross-ticket dependency verification, deliverable coverage mapping, dependency graph, suggested implementation order).

This skill does **not** emit Canon Fact Records, Change Log Entries, adjudication records, or any YAML structured output. Tickets are markdown documents for human review.

## World-State Prerequisites

Before this skill acts, it MUST read (per FOUNDATIONS.md §Tooling Recommendation):

- `<spec_path>` — the target spec file, entire contents. Read at Step 1.
- `tickets/_TEMPLATE.md` — the canonical ticket structure; every ticket produced in Step 5 must follow this template exactly. Read at Step 1.
- `tickets/README.md` — the ticket authoring contract; defines required sections and mandatory pre-implementation checks. Read at Step 1.
- `docs/FOUNDATIONS.md` — the non-negotiable design contract. Skip if read earlier in this session and unmodified.
- `docs/HARD-GATE-DISCIPLINE.md` — read on demand at Step 2 when a spec deliverable touches skill HARD-GATE semantics or canon-write ordering.
- Every file path, skill directory, tool reference, and spec reference extracted from the target spec — read on demand at Step 2 as part of codebase validation.

This skill operates at **pipeline scope** (meta-tooling). It reads any file under `specs/`, `archive/specs/`, `.claude/skills/`, `tools/`, `docs/`, and `tickets/`. It does **not** read world-level canon (`worlds/<slug>/`) — specs describe pipeline/tooling work, not world-canon work. If a future spec genuinely requires world-canon context to validate, that's a classification-shift signal, not a prerequisite-list gap.

## Pre-flight Check

Before Step 1, verify:
1. `docs/FOUNDATIONS.md` exists and is readable.
2. `tickets/_TEMPLATE.md` exists and is readable.
3. `tickets/README.md` exists and is readable.
4. `<spec_path>` (from argument 1) exists and is readable.
5. `<namespace>` (from argument 2) is provided, OR if omitted, derive one from the spec ID and abbreviated title (e.g., `specs/SPEC-03-patch-engine.md` → `SPEC03PATENG`) and ask the user to confirm or override before Step 1.
6. If a worktree root is active, all paths resolve from the worktree root, not the main repo root.

If any of checks 1–4 fails, abort with a clear missing-file error before Step 1. If check 5 is ambiguous (spec ID parsing fails), ask the user for the namespace directly.

## Step 1: Mandatory Reads

Read ALL of these before any analysis:

1. **The spec file** (from `spec_path`) — entire file.
2. **`tickets/_TEMPLATE.md`** — the canonical ticket structure; every ticket produced must follow this template exactly.
3. **`tickets/README.md`** — the ticket authoring contract; understand the required sections and pre-implementation checks.
4. **`docs/FOUNDATIONS.md`** — skip if read earlier in this session and unmodified.

Parse the spec's metadata: Phase, Status, Dependencies, Blocks, Problem Statement / Approach / Deliverables / FOUNDATIONS Alignment / Verification / Out of Scope / Risks, and all deliverable sections. **Non-numbered deliverables**: if the spec uses named sections instead of numbered deliverables (e.g., `SPEC-05 Hooks Discipline` — Part A / Part B / Part C), treat each distinct implementation section as a deliverable for decomposition purposes.

## Step 2: Codebase Validation

Before decomposing, validate the spec's assumptions against the actual worldloom codebase.

### Full Validation Path (default)

- **Grep/Glob** for every file path referenced in the spec — confirm it exists at the stated path. Targets: spec files (`specs/*`), skill files (`.claude/skills/*/SKILL.md` and references under `references/`), doc files (`docs/*`), tool files (`tools/*`), hook scripts, and world files only if the spec explicitly references world-level paths.
- **Grep** for every skill name, tool name, MCP tool name, hook name, validator name, and YAML schema key referenced in the spec — confirm they are real and current.
- **Grep** for every FOUNDATIONS principle, Validation Rule, or Canon Fact Record field the spec cites — confirm the section/rule still exists in `docs/FOUNDATIONS.md` with the claimed semantics.
- **Check** cross-spec dependencies (`Dependencies` / `Blocks` fields) resolve to real spec paths under `specs/` or `archive/specs/`.
- **Command-surface verification**: grep the relevant `package.json` / Makefile / justfile for every script/command name referenced in the spec's Verification section OR likely to land in tickets' Commands sections (e.g., `pnpm --filter <pkg> test`, `npm run typecheck`, `cargo test`). Flag non-existent scripts before ticket drafting so Commands sections don't reference vaporware.
- **Flag** any stale reference, missing file, renamed entity, non-existent script, or FOUNDATIONS-violating assumption as an **Issue**.
- Present Issues to the user before proceeding to Step 3. For each Issue, obtain an explicit disposition: fix-before-decomposition, defer-to-follow-up-ticket (with a named dependency), or reject-with-rationale.

### Abbreviated Spot-Check Path (when `/reassess-spec` ran in-session)

If `/reassess-spec` was run on this spec in the current session and all findings were resolved, Step 2 validation may be abbreviated to a targeted spot-check. 3–5 greps is sufficient. Spot-checks must verify at least:

- **(a) Primary references**: the spec's primary skill/tool/type references still exist at the stated paths.
- **(b) Schema version**: if the spec modifies a structured output schema (Canon Fact Record fields, Change Log Entry fields, proposal card schema), verify the schema hasn't drifted since reassessment.
- **(c) Sibling specs**: no new specs added under `specs/` reference the same skills or tools.
- **(d) Additive extension check**: for specs extending an existing output schema, consumers of that schema have been updated, or the extension is additive-only (new optional field with a default).
- **(e) Rename/removal blast radius**: for tickets renaming/removing a skill, tool, hook, validator, or schema field, grep pipeline-wide (`tools/`, `.claude/skills/`, `docs/`, `specs/`) for every symbol being renamed/removed. If any area has >0 matches but is not in the ticket's Files to Touch, either (i) add it to Files to Touch, or (ii) split those sites into a follow-up ticket with an explicit dependency.
- **(f) Command-surface verification**: grep the relevant `package.json` / Makefile / justfile for every script/command name referenced in the spec's Verification section OR likely to land in tickets' Commands sections (e.g., `pnpm --filter <pkg> test`, `npm run typecheck`, `cargo test`). Flag non-existent scripts before ticket drafting so Commands sections don't reference vaporware. Example failure this catches: a spec lists `pnpm --filter @worldloom/world-mcp typecheck` as a verification command, but the package's `scripts` block defines only `build`, `test`, `clean` — the `typecheck` reference would silently survive decomposition and surface only when an implementer tries to run the ticket's Commands section.

After spot-checks, render the exercised sub-checks as a compact inline list before moving to Step 3 (e.g., `Spot-checks: (a) ✓, (b) ✓, (c) skipped — no new sibling specs, (d) ✓, (e) N/A — no renames, (f) ✓`). This proves each applicable sub-check ran and surfaces N/A cases explicitly.

If `/reassess-spec` was run but some findings were **deferred** by the user, treat deferred items as out-of-scope for ticket decomposition. Note them in the Step 6 final summary as "deferred reassessment findings that may warrant separate tickets." Do not silently incorporate deferred findings into ticket scope.

## Step 3: Decompose the Spec

Analyze the spec and identify discrete work units:

- Each ticket must represent a **reviewable diff** — small enough for comfortable manual review.
- Map **dependencies** between tickets (which must be done before which). Name them in each ticket's `Deps` field.
- Determine **priority ordering** — what to implement first, based on dependency graph and criticality.
- Ensure **every spec deliverable is covered** — no silent skipping. If a deliverable seems wrong or unnecessary, flag it using the 1-problem / 3-options / 1-recommendation format rather than omitting it. Deliverables that explicitly state no changes are needed (e.g., "No new skill", "No new hook") do not require tickets; note their existence in the Step 4 summary if non-obvious.
- Use the spec's **"Out of Scope"** or equivalent non-goals section to populate each ticket's Out of Scope field — these are pre-validated non-goals.
- When multiple spec deliverables share the same file set and cannot be implemented independently, merge them into a single ticket. Note merged deliverables in the Step 4 summary table Notes column.
- When all deliverables modify the **same file** OR land under the **same new package/directory**, decompose by logical section or module, not by file or directory boundary. Each ticket targeting a different section/module is a valid reviewable diff. Note the shared file or package in the Step 4 summary rather than repeating it per-ticket.
- When tests or end-to-end validation exercise multiple deliverables simultaneously and cannot be split per-deliverable, a single validation ticket depending on all implementation tickets is a valid decomposition. When a serial dependency DAG allows such a validation ticket to depend on the transitive-head ticket that composes all upstream work (e.g., a CLI ticket that wires every parser and CRUD module), listing just that transitive head as the validation ticket's sole `Deps` is acceptable and recommended over enumerating every upstream ticket — the DAG structure is already reconcilable from the upstream tickets' own `Deps` fields. Note the multi-dependency (or transitive-head dependency) in the Step 4 summary. See §Spec-Integration Ticket Shape below for the structural pattern this case instantiates.

### Spec-Integration Ticket Shape

Phase-level integration tickets — whose scope IS the spec's §Verification section, exercising every prior implementation ticket end-to-end — are a recurring worldloom pattern (one capstone per spec across the SPEC-01..SPEC-08 bundle; analogous capstones for SPEC-09 and future specs). Name the shape explicitly when decomposing:

- **What it is**: a single trailing ticket whose acceptance criteria enumerate the spec's §Verification bullets as test sub-cases. It introduces no new production code; it exercises the pipeline composed by the earlier tickets.
- **What it must contain**:
  - A fixture-world copy strategy that keeps the real `worlds/<slug>/` tree untouched (e.g., `fs.cpSync` to a temp root) so the test never mutates canon.
  - Re-enumerated expected counts (not hardcoded), computed from the fixture at test start. Hardcoded counts become stale as canon grows; re-enumeration stays valid over time.
  - One assertion per spec §Verification bullet (counts, determinism, incremental, drift, schema stability — whichever the spec names). Treat the spec's bullets as the capstone ticket's test matrix.
  - A wall-clock perf assertion when the spec names a performance gate (e.g., SPEC-08 Phase 1's <30s threshold); leave the spec's aspirational target as a dev-loop expectation rather than a CI gate.
- **How `Deps` resolves**: prefer the transitive-head convention above (single `Deps: <transitive-head-ticket>`) over enumerating every upstream ticket. The DAG already records the full chain.

## Step 4: Present Summary for Approval

**Before writing any ticket files**, present a numbered summary table in chat:

| # | Ticket ID | Title | Scope | Effort | Deps | FND | Notes |
|---|-----------|-------|-------|--------|------|-----|-------|
| 1 | <NS>-001  | ...   | <5-10 word scope> | Small  | None | — | — |
| 2 | <NS>-002  | ...   | <5-10 word scope> | Medium | 001  | Rule 5 | shared file set |

Column roles:
- **Title** — human-readable ticket name (matches the first-line `# <NAMESPACE>-<NNN>: <title>` to be written).
- **Scope** — deliverable mapping (e.g., "D1+D6") or acceptance surface (e.g., "adds skill X, emits record Y"). Title and Scope must NOT duplicate each other.
- **Effort** — Small / Medium / Large.
- **Deps** — other tickets in this batch or pre-existing tickets/specs. If all tickets are independent, state this once rather than repeating `None`.
- **FND** — populate only for tickets with notable FOUNDATIONS concerns (e.g., Rule 5 consequence propagation, Rule 7 Mystery Reserve firewall). Use `—` otherwise.
- **Notes** — merged deliverables, shared file sets or shared package/directory, multi-dependency (or transitive-head) validation tickets, or other decomposition-relevant details.

**Wait for user approval or adjustments.** Do not write files until the user confirms.

**Auto-mode interaction**: When auto mode is active AND Step 2 validation surfaced no Issues AND no `/reassess-spec` findings were deferred, auto-approve the summary table and proceed to Step 5. Announce the auto-approval inline (e.g., "Auto mode: no Issues surfaced in Step 2, proceeding to Step 5"). If Step 2 surfaced any Issue OR any reassessment finding was deferred, the wait-for-user gate applies even in auto mode.

## Step 5: Batched Ticket Writes

For each approved ticket, compose its full content following `tickets/_TEMPLATE.md` exactly. Every ticket MUST include:

- **Status**: PENDING
- **Priority**: HIGH / MEDIUM / LOW (based on dependency order and criticality)
- **Effort**: Small / Medium / Large
- **Engine Changes**: None or a list of affected or newly-introduced areas (for worldloom: which skills, tools, hooks, packages, or docs are touched or added). For tickets that introduce (rather than modify) a pipeline piece, still populate `Engine Changes: Yes` with the introduced piece named; follow with "no impact on existing <X>" when the new piece lives in isolation.
- **Deps**: Other tickets or specs this depends on
- **Problem**: What user-facing or architecture problem this solves
- **Assumption Reassessment** (with today's date): items 1–3 always required; items 4+ from `tickets/_TEMPLATE.md` are a menu — select only those matching the ticket's scope and **renumber surviving items sequentially starting from 4**. Lists like `1, 2, 3, 14` are malformed output. Before emitting each ticket's Write call, verify its Assumption Reassessment numbering is strictly sequential starting at 1 — the template-menu rule only lets you SELECT items from the menu, not SKIP numbers in the final output. The Step 6.2(b) check catches gaps after the fact, but fixing them requires one Edit per malformed ticket; catching them at Step 5 is cheaper.
- **Architecture Check**: why this approach is clean, how it preserves skill/pipeline boundaries
- **Verification Layers**: map each invariant to its proof surface (codebase grep, schema validation, skill dry-run, FOUNDATIONS alignment check, etc.). For single-layer tickets, state why additional mapping is not applicable.
- **What to Change**: numbered sections with specific implementation details
- **Files to Touch**: exact paths validated against the codebase (new or modify)
- **Out of Scope**: explicit non-goals — what this ticket must NOT change
- **Acceptance Criteria**:
  - **Tests That Must Pass**: specific behavior tests or validation commands (for worldloom, typically skill dry-runs, schema validation, or grep-proofs rather than cargo test invocations)
  - **Invariants**: must-always-hold architectural and data-contract invariants
- **Test Plan**:
  - **New/Modified Tests**: paths with rationale, or `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.` when no tests change
  - **Commands**: targeted verification commands and full-pipeline verification

### Batch All Write Calls in One Message

Send **a small number of assistant messages containing parallel Write tool calls (one per ticket)**, not N sequential one-Write-per-message sends. For typical spec sizes (4-8 tickets), a single batched message is the target; for 10+ tickets, 2-3 batched messages are acceptable so long as no per-ticket round-trip occurs. Each ticket file write is independent because each creates a new file, so they can run concurrently. A single batched message with N Write calls costs one round-trip; N sequential one-Write-per-message sends cost N round-trips — the ban is on per-ticket sequential messaging, not on any multi-batch approach. Compose every ticket's full content first, then emit all Write calls in batched messages.

After the parallel batch returns, verify every ticket file was created. If any Write call failed (typo in path, permissions error, or other I/O failure), retry that ticket with the corrected argument immediately — do not proceed to Step 6 until all ticket files exist at their intended paths. If a system-reminder or external tool indicates that a ticket file was modified between your Write call and Step 6 (e.g., by a linter hook, a user keystroke, or a parallel editor save), treat the external edits as authoritative — do not revert them. Step 6's cross-ticket dependency verification must run against the edited content, and any sibling ticket whose path, symbol, or count references the externally-edited ticket may need follow-up adjustment before the final summary is emitted. The follow-up adjustment also applies when the external edit corrects a stale codebase assumption (missing file, non-existent script, renamed symbol) that sibling tickets independently share — not just when siblings lexically reference the edited ticket. The trigger is "does the corrected assumption affect the sibling's truthfulness?", not "does the sibling mention the edited ticket by name?". Record the parallel-stale-assumption correction in the Step 6 final summary under a dedicated line alongside the external-edit note so the audit trail captures both the triggering edit and the proactive sibling cleanup.

## Step 6: Final Summary

After writing all files:

1. **Verify cross-ticket dependency consistency**: For each `Deps` reference, confirm the depended-on ticket actually produces what the dependent ticket needs (types, skills, modules, files). If a dependency is broken (e.g., ticket 005 depends on a skill output from 003 but 003's scope doesn't define it), flag the inconsistency.

2. **Template fidelity check**: for each written ticket, confirm (a) every required section from `tickets/_TEMPLATE.md` is present (Status, Priority, Effort, Engine Changes, Deps, Problem, Assumption Reassessment, Architecture Check, Verification Layers, What to Change, Files to Touch, Out of Scope, Acceptance Criteria, Test Plan), and (b) the Assumption Reassessment section uses sequential numbering starting at 1. Grep: `awk '/^## Assumption Reassessment/,/^## Architecture Check/' tickets/<NAMESPACE>-NNN.md | grep -oE '^[0-9]+\.' | awk -F. '{print $1}'` should produce a strictly sequential integer sequence `1 2 3 ...`. Any gap (e.g., `1 2 3 6`) is a malformed Assumption Reassessment — the Step 5 template-menu rule ("renumber surviving items sequentially starting from 4") was not applied. Fix the offending ticket's numbering before emitting the final summary.

3. **Deliverable coverage mapping**: List each spec deliverable and the ticket that covers it (e.g., `D1→001, D2→001, D3→002`). Verify all spec deliverables are accounted for. If any deliverable is missing, flag it. If the spec uses phases or named sections instead of numbered deliverables (e.g., `Phase 2a`, `Part B`), adapt the mapping to use the spec's organizational scheme — for named sections, use section names directly (e.g., `§Package location → 001, §SQLite schema → 002`).

4. List:
   - All ticket files created (paths).
   - The dependency graph (which tickets block which).
   - Suggested implementation order.
   - **Deferred `/reassess-spec` findings**, if any, noted as "may warrant separate tickets" (findings the user explicitly chose to defer at reassessment time).
   - **Cross-spec follow-ups**, if any, surfaced by the spec's Risks section or discovered during decomposition — concerns requiring action in other specs or artifacts, not in this batch. The two categories are distinct: deferred findings may become tickets after user disposition; cross-spec follow-ups require one of three routing patterns:
     - **(a)** `/reassess-spec` on an existing active or archived spec, when the follow-up shifts that spec's scope or recommendations.
     - **(b)** **Draft a NEW spec file** to lift dormant amendment commitments (common worldloom pattern: amendments living inside a sibling spec's §C clauses + `specs/IMPLEMENTATION-ORDER.md` Phase-tier scheduling that never got their own decomposable spec), then route through `/reassess-spec` + `/spec-to-tickets` on the new spec in a subsequent session. Surface this in the Step 6 summary as "cross-spec follow-up requires drafting `<proposed-path.md>` first" so the user sees the multi-step path at decomposition time rather than discovering it via follow-up question. Also note any implied load-bearing cross-ticket dependency: when the new spec's future tickets must be added as `Deps` entries on tickets produced in THIS batch, name the specific tickets (by their `<NAMESPACE>-NNN` IDs) so the directive can be embedded in the new spec's prose when it is drafted.
     - **(c)** Separate skill invocation or documentation edit outside the spec-to-ticket pipeline (e.g., `/skill-consolidate`, direct `docs/` edits, `specs/IMPLEMENTATION-ORDER.md` status-row maintenance for newly-created specs).

Do NOT commit. Leave files for user review.

## Validation Rules This Skill Upholds

- **Rule 1: No Floating Facts** — enforced at Step 2 (codebase validation). When a spec's deliverables introduce canon-impacting mechanisms (new CF Record fields, new Change Log Entry shapes, new validator thresholds, new canon-safety checks), the skill flags missing scope / prerequisites / limits / consequences as Issues before decomposition. Most Rule 1 enforcement is inherited from upstream `reassess-spec`; this skill's contribution is catching Rule 1 drift introduced *between* reassessment and ticket decomposition.
- **Rule 5: No Consequence Evasion** — enforced at Step 3 (decomposition). Second-order effects of a spec deliverable that the spec didn't address become either (a) additional tickets in the decomposition, or (b) explicit Out-of-Scope entries with a named follow-up ticket or spec dependency. The decomposition must not leave a second-order effect unaddressed and unacknowledged.
- **Rule 6: No Silent Retcons** — enforced at Step 5 (ticket writes). Every ticket that modifies existing pipeline code (skills, tools, hooks, validators, schemas) must cite the retcon justification in its Assumption Reassessment section — what existing behavior is changing, what the new behavior is, and why the change is warranted. Silent "update X to Y" tickets without retcon attribution fail this rule.
- **Rule 7: Preserve Mystery Deliberately** — enforced at Step 2 (codebase validation) for any spec deliverable touching validators, hooks, canon-safety check surfaces, or Mystery Reserve firewall logic. A spec that would silently resolve a Mystery Reserve entry or weaken the MR firewall triggers a CRITICAL Issue that blocks decomposition until the user dispositions it.

## Record Schemas

N/A — this skill does not emit structured YAML records. Output is markdown ticket files following `tickets/_TEMPLATE.md`.

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|-----------|-------|-----------|
| Tooling Recommendation (§"non-negotiable") | Pre-flight + Step 1 | FOUNDATIONS.md, tickets/_TEMPLATE.md, tickets/README.md, and spec_path are required mandatory reads; the skill refuses to decompose without them. |
| Rule 1: No Floating Facts | Step 2 | Codebase validation flags canon-impacting deliverables lacking scope / prerequisites / limits / consequences as Issues before decomposition. |
| Rule 2: No Pure Cosmetics | N/A | Not applicable — meta-tooling skill does not introduce world-level content; handoff to `canon-addition` for canon-fact cosmetic-vs-substantive review. |
| Rule 3: No Specialness Inflation | N/A | Not applicable — meta-tooling skill does not add exceptional world elements; handoff to `canon-addition` for specialness-inflation guard on canon additions. |
| Rule 4: No Globalization by Accident | N/A | Not applicable — meta-tooling operates at pipeline scope, not world scope; there is no per-fact scope to inflate. Handoff to `canon-addition` for per-fact scope detection. |
| Rule 5: No Consequence Evasion | Step 3 | Decomposition must cover second-order effects of each deliverable as additional tickets or explicit Out-of-Scope entries with a named follow-up. |
| Rule 6: No Silent Retcons | Step 5 | Every ticket modifying existing pipeline code must cite retcon justification in its Assumption Reassessment. Silent `update X to Y` tickets fail this rule. |
| Rule 7: Preserve Mystery Deliberately | Step 2 | Deliverables touching validators, hooks, canon-safety surfaces, or Mystery Reserve firewall logic trigger CRITICAL Issues if they would silently resolve MR entries or weaken the firewall. |
| Canon Layering | N/A | Not applicable — meta-tooling does not write canon; handoff to `canon-addition` for layer-assignment discipline. |
| Change Control Policy | N/A | Not applicable — meta-tooling does not emit Change Log Entries; handoff to `canon-addition` for world-level canon changes. Ticket-level change control (spec-to-ticket attribution) is covered by Step 5's Assumption Reassessment discipline and Step 6's deliverable coverage mapping. |
| Canon Fact Record Schema | N/A | Not applicable — this skill does not emit CF Records; output is markdown tickets, not structured canon records. Handoff to `canon-addition` for CF emission. |

## Guardrails

- **FOUNDATIONS alignment is mandatory**: Never approve a ticket decomposition that violates a FOUNDATIONS principle, even if requested — flag the conflict as a CRITICAL Issue at Step 2 and wait for user disposition.
- **Template fidelity**: Every ticket must use `tickets/_TEMPLATE.md` exactly — no ad-hoc sections, no missing required fields, no "simplified" variants. If the template needs to evolve, that is a separate spec, not an inline improvisation.
- **Ticket fidelity**: Never silently skip a spec deliverable. If a deliverable seems wrong, use the 1-problem / 3-options / 1-recommendation format and ask the user — do not omit it.
- **Codebase truth**: File paths, skill names, tool names, and schema references in tickets must be validated against the actual codebase, not assumed from the spec. Stale references propagated from a spec through a ticket are a skill failure.
- **Reviewable size**: Each ticket should be small enough to review as a single diff. When in doubt, split further. A 15-file change touching 4 skills is not a reviewable diff.
- **Explicit dependencies**: Use the `Deps` field to declare inter-ticket dependencies; never leave implicit ordering. Every `Deps` entry must resolve to either a ticket produced in this run or a pre-existing ticket/spec path confirmed at Pre-flight.
- **No canon writes**: This skill never writes to `worlds/<slug>/` files, `CANON_LEDGER.md`, `INVARIANTS.md`, or any world-level canon file. Tickets are pipeline-level artifacts. If a ticket's implementation would touch canon, that work happens in `canon-addition`, not here.
- **No spec edits**: This skill never edits the source spec file. Spec refinement is `reassess-spec`'s job. If decomposition reveals a spec defect, flag it as an Issue at Step 2 and route the fix back through `reassess-spec`.
- **Auto-mode gate still applies**: Auto mode does not bypass the HARD-GATE. Auto-mode may auto-approve the Step 4 summary only when Step 2 surfaced no Issues AND no reassessment findings were deferred.
- **Worktree discipline**: If invoked inside a git worktree, all paths — reads, writes, globs, greps — resolve from the worktree root, not the main repo root.
- **Do not `git commit` from inside this skill**: Writes land in the working tree; the user reviews the diff and commits.

## Final Rule

A ticket decomposition is not complete until every spec deliverable maps to a ticket (or to an explicit non-goal), every ticket's Deps resolve to a real target, every ticket's Files to Touch matches the current codebase, and every FOUNDATIONS-impacting deliverable has been validated against FOUNDATIONS.md before the ticket was written.
