# Storylet Pool Authoring - Current Workflow Report

This report is self-contained. It inlines the important workflow, schema, predicate, validation, template, and handoff details so a reviewer does not need repository access.

## Purpose

`storylet-pool-authoring` creates or expands the scene-commitment-arc reservoir for a branching story. It can run as a direct batch workflow or as a no-write sub-routine for bootstrap and page-cycle.

Current modes:

- `seed`: broad initial or top-up pool.
- `focus`: 10-15 storylets in a specified focus area.
- `audit`: consumes RSP cards from health audit.
- `jit`: creates one branch-scoped runtime storylet for page-cycle; direct invocation is refused.

## Embedded Source Details

The underlying skill is split across one orchestration document, phase write-ups, schema templates, a Predicate DSL, an arc-archetype library, and tag dictionaries. The important embedded details are:

- Storylets are scene-commitment arcs, not prose passages and not single beats. The current record shape uses `record_version: 2` and `shape: scene_commitment_arc`.
- Required SLT fields include id, story id, title, content intensity, hard and soft preconditions, cast and location requirements, obligation interactions, fact effects, relationship effects, tone/theme tags, tension delta, aftermath weight, mystery safety, provenance, visibility, arc contract, dramatic unit, beat plan, execution envelope, stop policy, effect model, and exit portfolio.
- `choice_templates` are retired/forbidden on modern SLT records. Runtime choice scaffolding lives in `exit_portfolio.native_seeds`.
- Predicate DSL is closed. Core predicates include fact truth/matching, entity state, relationship axis checks, consequence pending, obligation open, location, epistemic class, and boolean `not`/`all`/`any`. Stop predicates add normal-exit, interrupt-before, and safety-valve checks. Free-form prose predicates are invalid.
- Visibility is structural: global author-pool storylets cannot depend on branch-local records. Branch-scoped JIT storylets must carry `visibility.scope: branch_scoped`, `provenance.origin: runtime_jit`, and a caller-provided `created_at_page`.
- Audit-mode RSP cards must bind to audit findings and provide at least one target among obligation, thread, consequence, relationship, commitment family/class/detail, or arc archetype. The resulting storylet must honor the RSP's proposed visibility.
- The arc-archetype library provides reusable shapes such as fragile offer, bounded question, confession received, refusal and aftercare, practical aid attempt, withdrawal, confrontation, concealment, third-party intervention, investigation followup, aftermath processing, route change, public commitment, private betrayal, intimacy negotiation, boundary setting, restitution, silent witness, forced disclosure, and pressure release.
- The batch manifest records approved storylets, diversity summary, rejected candidates, dropped-at-hardgate ids, validation verdicts, authoring warnings, and notes.
- Body-language and clothing discipline matters: cast-agnostic storylet notes should use character-agnostic gestural language; cast-locked clothing detail requires Material Reality verification.
- Direct batches run patch-plan pre-validation before the user hard gate. Parent-skill sub-routines skip direct pre-validation and return a validation packet for the parent to include in its own gate.

## Current End-to-End Workflow

1. Pre-flight resolves the story bundle, validates RSP cards in audit mode, refuses direct JIT mode, allocates `SLB` and `SLT` ids for direct batches, determines mode, loads `STORY_KERNEL.md`, current storylet pool, open obligations, active threads, recent rendered pages along the longest branch path, world canon context, whole-class Mystery Reserve and Invariant records, and content policy.
2. Coverage diagnosis scans current pool and open state for thinness by obligations, threads, content-intensity bands, commitment families/classes, arc archetypes, mysteries in play, and recent repetition. Audit mode uses RSP card target fields. JIT mode reduces diagnosis to one continuation-failure row from page-cycle state.
3. Generation seeds produce candidate arc briefs. Seed and focus produce `target_pool_size + 30%` candidates. Audit mode seeds from RSP cards. JIT mode produces exactly one seed.
4. Structured drafting assembles prompts with content policy, story kernel, state context, Predicate DSL, selected arc archetype excerpt, tone/theme vocabulary, and SLT scaffold. The LLM proposes structured arcs; engine wrapping normalizes schema fields, predicates, obligation/fact machinery, visibility, and `exit_portfolio.native_seeds`.
5. Per-storylet validation runs 14 gates: mystery firewall, resolution authority, invariant compatibility, consequence capacity, deduplication, content-intensity coherence, predicate parsing, branch contamination, schema completeness, arc envelope conformance, stop-policy parsing, effect-model legality, exit-portfolio completeness, and Rule 11 spectator-caste leverage. Rejections are replaced or retried.
6. Batch diversity audit checks commitment-family/class spread, arc archetype distribution, tone/theme balance, content intensity, obligation engagement, cast usage, dramatic-unit coverage, and branch-contamination. Audit and JIT have narrower rules.
7. Direct invocation runs engine pre-validation by building a draft patch plan, validating it, and folding the result into the Phase 6 approval summary. Sub-routine invocation skips this and lets the parent skill own write validation.
8. Direct invocation presents the batch summary for user approval. The user can accept, accept selections, revise diversity, revise focus, or reject. Dropped ids become permanent gaps.
9. Parent-skill invocation returns an internal validation packet and approved SLT records without writing. Bootstrap writes seed SLTs as part of its Phase 11. Page-cycle writes JIT SLTs as part of its Phase 11.
10. Direct Phase 7 submits `create_slt_record` ops through the patch engine, writes `SLB-NNNN.md`, and edits bundle `INDEX.md` last.

## Write Surface

Direct invocation writes:

- `_source/storylets/SLT-NNNN.yaml` through patch-engine ops.
- `storylet-batches/SLB-NNNN.md` directly.
- bundle `INDEX.md` directly, last.

Sub-routine invocation writes nothing.

## Primary Contracts And Handoffs

- Provides bootstrap seed storylets.
- Provides page-cycle JIT storylets.
- Consumes health-audit RSP cards in audit mode.
- Supplies SLT schema consumed by page-cycle selection.
- Uses the same engine-envelope convention as bootstrap for submit operations.

## Hard Gates And Safety Boundaries

Direct invocation has an absolute hard gate before writing any storylet YAML, batch manifest, or index edit. Parent-skill invocation is no-write and does not show its own user-facing gate.

Author-pool storylets may not carry `canon_candidate` mystery authority. Runtime JIT storylets may carry canon-candidate authority only when branch-scoped and promotion is left to page-cycle plus story-fact-promotion-to-canon.

## Current Complexity Hotspots

- One skill covers direct authoring, bootstrap seeding, audit remediation, and runtime JIT.
- The SLT schema is rich: Predicate DSL, stop predicates, arc contract, dramatic unit, beat plan, execution envelope, effect model, exit portfolio, visibility, provenance, and mystery safety.
- The validation gate list is large and duplicated in summary prose, phase write-ups, and manifest expectations.
- Mode-specific rules are interleaved throughout the file.
- The skill has both creative generation duties and patch-engine submission duties.

## Streamlining Questions For Review

- Should JIT mode be a separate minimal sub-skill or pure page-cycle helper contract?
- Should audit-mode RSP consumption be separated from general storylet authoring?
- Should direct submit/write behavior be separated from in-memory storylet generation?
- Should the 14 validation gates be a shared validator contract consumed by page-cycle and health audit?
