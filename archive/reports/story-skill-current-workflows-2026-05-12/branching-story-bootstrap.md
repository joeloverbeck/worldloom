# Branching Story Bootstrap - Current Workflow Report

This report is self-contained. It inlines the important workflow, template, validator, and handoff details so a reviewer does not need repository access.

## Purpose

`branching-story-bootstrap` starts a new branching story bundle inside an existing world. In its current form it no longer renders opening prose directly. It creates the story's causal state, the root page record, the root page prose plan, initial choices, and a seed storylet pool. Actual prose is supplied later and merged by `branching-story-page-prose-finalize`.

Its write scope is deliberately narrow:

- It may create `worlds/<world-slug>/stories/<story-slug>/`.
- It may write direct markdown surfaces such as `STORY_KERNEL.md`, `pages-prose-plans/PG-0001.md`, bundle `INDEX.md`, and the per-world `stories/INDEX.md`.
- It must route story-bundle `_source/**/*.yaml` records through the patch engine.
- It must not mutate world-level canon files or rendered prose.

## Embedded Source Details

The underlying skill is split across one orchestration document, phase write-ups, and templates. The important embedded details are:

- The content policy is an NC-21 adult-storytelling prompt block. It is embedded in the story kernel and every planning/generation prompt. `content_intensity` is treated as a routing tag (`tame`, `mature`, `explicit`), not a censor.
- The story kernel captures story id, premise, content policy, designing principle, tone, POV, central dramatic question, cadence/menu policy, cast, mysteries in play, invariants acknowledged, initial threads/obligations, storylet pool summary, validation trace, and discipline validation trace.
- The story-record template defines story-scoped atomic records: `STENT` entities, `STINT` intentions, `SF` facts, `SE` events, `OBL` obligations, `CNSQ` consequences, `THR` threads, `SREL` relationships, `SLT` storylets, `STLOC` locations, `STOBJ` objects, story-local `DA` artifacts, `BR` branches, `PG` pages, and `CHC` choices.
- New story records are story-scoped and append-only. All non-page emergent records carry `created_at_page`; author-pool storylets use `created_at_page: null`.
- Bootstrap is now plan-first. It writes `pages-prose-plans/PG-0001.md`, leaves `pages-prose/PG-0001.md` absent, and marks the page as pending prose.
- The root page plan must be self-contained enough for an external prose renderer: it inlines relevant record bodies or prose-direction translations, declares visible affordances, declares forbidden mystery resolutions, and records deferred prose validation.
- Storylet seeding is delegated in-memory. Bootstrap computes a target pool size, pre-allocates SLT ids, receives validated storylet records, and writes them only as part of the final bootstrap transaction.
- Patch-engine envelopes use a placeholder approval token during construction, are dry-run validated, then signed by a CLI token issuer. Large envelopes should use a CLI submit path rather than inline MCP submission. `_source` YAML writes must use story-bundle patch ops; direct markdown writes remain allowed for story kernel, plans, and indexes.
- Partial failure is handled by writing `_source` records before markdown surfaces that advertise them, and by writing per-world `stories/INDEX.md` last.

## Current End-to-End Workflow

1. Pre-flight resolves the world directory, allocates `STORY-NNNN` through `allocate_next_id`, rejects story slug collisions, validates the requested cast against the world character index, loads `docs/FOUNDATIONS.md`, loads whole-class Mystery Reserve and Invariant context, and loads the content-policy block.
2. Premise normalization turns the user premise into a story design brief: designing principle, central dramatic question, POV, content intensity, implied tensions, initial locations, and cadence/menu policy.
3. Cast binding mirrors selected world characters into story-local `STENT` records and initial `STINT` intention records. The live convention is bare-numeric `STINT-NNNN`, not older suffixed ids.
4. World-fact import mirrors relevant world CFs into story-local `SF` records with `derived_from_cf`, `certainty`, `known_by`, and `epistemic_class`. Premise-specific facts use `canon_relation: not_applicable`.
5. Mystery firewall and invariant audit reject forbidden Mystery Reserve resolution and unresolvable invariant tensions before any story files are written.
6. Initial threads and obligations create 2-5 `THR` records and paired `OBL` records. Obligations must carry salience, urgency, and at least two payoff modes.
7. Storylet pool seeding delegates to `storylet-pool-authoring` in `mode=seed`, `focus_area=bootstrap_mix`, and `parent_skill_invocation=true`. Bootstrap pre-allocates `target_slt_ids[]`; the storylet skill returns validated SLT records in memory.
8. Root page plan authoring populates the shared page-plan template for `PG-0001`. This is a comprehensive plan, not rendered prose. It embeds content policy and prose-craft guidance, inlines referenced state records, declares visible affordances, records deferred prose validators, emits working-buffer `PG-0001`, `BR-0001`, and `SE-0001`, and performs plan-completeness checks.
9. Declared-affordance validation checks that every affordance in plan frontmatter maps to an actual state object or record. Ungrounded affordances route back to Phase 7.
10. Initial choice generation delegates to page-cycle Phase 8 in the PG-0001 special case. It creates 4-6 scene-commitment choices plus the write-in slot.
11. Validation gates run 20 checks. The prose-coupled gate is deferred until finalize. Root-specific arc trace gates auto-pass where no arc exists.
12. Bootstrap discipline validation runs 11 additional checks, including `plan_self_containment`.
13. Phase 10 presents the proposed bundle to the user. Explicit user approval is required before writing, even in Auto Mode.
14. Phase 11 creates directories, writes markdown surfaces, validates/signs/submits a patch-engine envelope for `_source` YAML records, writes the plan file, writes bundle index, then updates per-world `stories/INDEX.md` last.

## Primary Contracts And Handoffs

- Consumes world canon and selected world characters.
- Delegates storylet creation to `storylet-pool-authoring`.
- Delegates root choices to `branching-story-page-cycle` Phase 8.
- Produces a pending rendered-prose state for `branching-story-page-prose-finalize`.
- Defines the shared patch-envelope convention used by multiple story skills: placeholder token, dry-run validation, signed approval token, size-based submit path, expected id allocations, and receipt-based file reporting.

## Hard Gates And Safety Boundaries

The skill's main hard gate prevents writes until pre-flight, mystery/invariant checks, validation gates, discipline checks, and explicit user approval all pass. It explicitly forbids direct writes to story-bundle `_source` YAML and world-level canon. It also forbids writing `pages-prose/PG-0001.md`.

## Current Complexity Hotspots

- The main orchestration document duplicates substantial phase detail that also lives in supporting phase write-ups.
- Bootstrap owns orchestration but imports detailed page-cycle and storylet contracts, which makes the skill large and fragile when sibling schemas change.
- Phase 9 and Phase 9.5 create two separate validation taxonomies that are easy to confuse.
- It relies on several cross-skill invariants: page-cycle is the schema authority for runtime PG/SE/CHC behavior, and storylet-pool-authoring is the SLT schema authority.
- The commit path mixes direct markdown writes, engine YAML submit, `.gitkeep` setup, per-bundle index edits, and per-world index edits.

## Streamlining Questions For Review

- Should bootstrap keep only orchestration plus short canonical phase summaries, instead of repeating phase internals?
- Should Phase 9 and Phase 9.5 be consolidated into one validation-trace concept with separate categories?
- Should root choice generation and visible-affordance validation live in page-cycle only, with bootstrap calling a smaller stable interface?
- Should engine envelope construction move into a shared story-bundle submit contract used by all story skills?
