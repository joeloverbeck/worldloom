# Branching Story Health Audit - Current Workflow Report

This report is self-contained. It inlines the important workflow, report schema, remediation-card schema, severity rules, and handoff details so a reviewer does not need repository access.

## Purpose

`branching-story-health-audit` is a read-only diagnostic workflow for an existing branching story bundle. It checks structural branch health, replay integrity, mystery safety, prose/state consistency, obligation and thread coverage, choice quality, arc conformance, repetition, storylet scope leakage, terminal branch health, and related narrative-debt signals.

It does not fix the story. It writes audit artifacts only:

- `audits/SAU-NNNN-<date>.md`
- optional remediation storylet proposal cards under `audits/SAU-NNNN/remediation-storylet-proposals/`
- `audits/INDEX.md`

## Embedded Source Details

The underlying skill is one workflow with report/card templates and an example mixed-severity audit. The important embedded details are:

- The audit report is a hybrid frontmatter/markdown document. Frontmatter tracks audit id, world/story, date, focus, threshold, audited branches, page counts, rendered/pending page counts, kernel sketch/discipline status, severity counts, flagged pages, high-JIT branches, RSP ids, dropped finding/card ids, prior audits referenced, cross-story scope, and user approval.
- Report body sections include summary, coverage, flagged pages, high-JIT branches, out-of-scope due to focus, findings grouped as errors/warnings/info, remediation proposals index, manual intervention flags, prior-audit delta, choice cadence, arc conformance, commitment-route coverage, health snapshot, and notes.
- Pending prose pages are not severity-bearing by themselves. They are inventoried, excluded from prose-coupled checks, and may produce an informational `pending_prose_count`.
- Findings must carry id, category, severity, severity rationale, branch, pages affected, records affected, description, evidence, and proposed remediation. Bare severity without rationale fails the self-check.
- Severity floors are structural: branch-isolation violations, snapshot replay failures, forbidden mystery leakage, ARC_TRACE evidence-alignment failures, and high-severity arc envelope violations are errors.
- RSP remediation cards are hybrid frontmatter/markdown documents consumed by storylet authoring. Their frontmatter includes RSP id, audit id, story id, finding ids, target obligation/thread/consequence/relationship, target commitment family/class/detail, target arc archetype, proposed intensity, target branch, proposed visibility, sketch, and rationale.
- RSP cards cannot propose resolving a forbidden mystery. Failed RSP validation downgrades to a manual-intervention flag rather than an emitted card.
- Drop-list discipline is explicit: dropped findings remain in the report as dropped; dropped cards are listed as dropped and not written. Surviving ids are not renumbered.
- The example mixed-severity audit demonstrates concrete error/warning/info structure, including branch-isolation leakage, uncovered high-salience obligations, absent cast in prose, overused storylets, debt drift, content-intensity drift, thread closure gaps, and pool under-utilization.

## Current End-to-End Workflow

1. Pre-flight resolves the story bundle, allocates `SAU-NNNN`, loads `docs/FOUNDATIONS.md`, loads `STORY_KERNEL.md`, reads relevant story `_source` records for in-scope branches, loads whole-class ARC_TRACE records for the story, loads whole-class Mystery Reserve and Invariant records, loads a task-specific context packet, reads prior audits, inventories flagged pages and JIT pages, and resolves the branch filter.
2. Branch scope resolution builds the branch tree from page records, identifies leaves, and validates any `branch_path_filter`.
3. Per-branch state assembly walks each scoped branch from root to leaf, constructing an evolution timeline. The workflow repeatedly states that sibling-branch pages must not be read during state assembly.
4. Coverage analysis checks obligation payoff routes, thread escalation and closure, character motivation, mystery firewall integrity, bootstrap sketch integrity, bootstrap discipline trace integrity, prose-ledger consistency, consequence coverage, choice cadence, arc conformance, commitment-route coverage, relationship continuity, storylet-scope leakage, terminal health, and optional cross-story conflicts.
5. Drift detection checks snapshot replay equality, state-hash continuity, canon-baseline drift, recursive cross-branch reference leakage, and content-intensity drift.
6. Repetition and thinness analysis checks storylet reuse, similar-scene clustering, and narrative-debt evolution.
7. Cross-branch consistency compares branch pairs by longest common prefix structurally, without content-cross-reading.
8. Findings consolidation groups findings by severity and runs per-finding self-checks. Structural floors classify branch-isolation, snapshot-drift, forbidden-M leakage, ARC_TRACE alignment failures, and high-severity envelope violations as errors.
9. Optional remediation proposal generation emits RSP cards for findings that can be fixed by additional storylets. Manual-intervention flags are used for findings that need page-cycle, promotion, archival, or human repair.
10. Phase 9 presents the full report and every proposed RSP card to the user. The user may accept, accept with a drop list, revise scope/focus, or reject.
11. Sequenced direct writes persist cards first, then the SAU report, then `audits/INDEX.md`. Dropped ids remain visible gaps.

## Inputs And Outputs

Required inputs are `world_slug` and `story_slug`. Optional controls include branch filters, audit focus, severity threshold, remediation-card emission, and bounded cross-story scope.

The output report is a hybrid frontmatter/markdown audit. RSP cards are intentionally shaped as direct inputs for `storylet-pool-authoring mode=audit`.

## Primary Contracts And Handoffs

- Consumes outputs from bootstrap, page-cycle, finalize, and storylet-pool-authoring.
- Produces RSP cards for `storylet-pool-authoring`.
- Produces manual handoff findings for page-cycle, story-fact promotion, or branch archival.
- Reads ARC_TRACE records generated by finalize.

## Hard Gates And Safety Boundaries

The skill is read-only against story state and world canon. Its writes are confined to `audits/`. The hard gate requires complete findings with severity rationales, valid RSP cards, per-finding self-checks, per-card validation, and explicit user approval.

Drop-list discipline is load-bearing: dropped findings remain recorded as dropped, and dropped RSP ids are not reused.

## Current Complexity Hotspots

- The skill has a very broad diagnostic surface: structural integrity, prose consistency, story health, choice quality, arc conformance, bootstrap trace verification, and remediation card generation.
- It mixes deterministic checks, LLM-like semantic judgments, historical prior-audit delta logic, and RSP producer logic.
- It has several "never read sibling branches" constraints that may be difficult for an agent to apply consistently while also doing cross-branch checks.
- The hard gate is unusually detailed for a read-only audit because audit outputs themselves are treated as durable epistemic artifacts.

## Streamlining Questions For Review

- Should this be split into structural audit, prose/arc audit, and remediation-card drafting?
- Should RSP generation be a separate follow-up skill, leaving health audit as report-only?
- Should cross-story conflict scanning be moved to a separate opt-in workflow?
- Should a common audit-report schema be shared with continuity-style audits?
