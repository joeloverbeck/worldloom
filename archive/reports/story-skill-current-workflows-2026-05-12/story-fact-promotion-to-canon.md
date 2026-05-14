# Story Fact Promotion To Canon - Current Workflow Report

This report is self-contained. It inlines the important workflow, source-kind branches, proposal schema, ledger schema, canon handoff, and post-adjudication behavior so a reviewer does not need repository access.

## Purpose

`story-fact-promotion-to-canon` is the explicit bridge from story-local state to world-level canon. It can promote a story fact, mystery resolution, character arc outcome, story-local diegetic artifact, or selected scene-commitment arc effect. It assembles a proposal package for `canon-addition`, records a story-side promotion ledger, and on accepted downstream adjudication writes story-local superseding records that point to the new world-canon output.

It is the only lawful story-to-world-canon promotion path described by the story skills.

## Embedded Source Details

The underlying skill is one large workflow with proposal and ledger templates. The important embedded details are:

- The promotion package contains promotion id, source kind, source record, promotion branch path, CF candidate, provenance, source reader-visibility context when relevant, scope-inflation check, mystery firewall, downstream impact, Rule 12 two-trace check, contradiction handling preference, execution mode, content policy, and critic reports.
- The CF candidate follows world-canon shape: title, status, type, statement, scope, truth scope, domains affected, prerequisites, distribution, costs and limits, visible consequences, required world updates, source basis, contradiction risk, notes, epistemic profile, exception governance, and prefiguring CFs.
- Promotion provenance intentionally does not overload `source_basis.derived_from`. The branch is evidence, not authority. Durable provenance is carried redundantly through the story promotion ledger, downstream change-log reason/notes, and adjudication body.
- The promotion ledger records SP id, source kind, source id, branch path, proposal summary, user decision, canon-addition outcome, linked CF/CH/PA ids when accepted, contradiction handling, story-local supersession ids, and notes. Rejections still get ledger entries.
- The change-log template is not emitted directly by this skill; it is included because the proposal must provide enough information for downstream canon-addition to produce a world change log.
- Supporting evidence pages must already be rendered. Pending prose blocks promotion before SP allocation because world-canon mutation requires stable prose evidence.
- `arc_effect_promotion` promotes the story-local record produced by an applied arc effect, not the reusable SLT template. Mystery progress effects are rejected from this source kind and must use mystery-resolution promotion.
- Accepted artifact canonization can produce both a world-level diegetic artifact and a story-local artifact superseder linking to it.
- Branch contradiction handling can flag or archive same-story branches through new superseding branch records. Cross-story contradictions are flag-only.
- The workflow is non-chaining: it writes the proposal package and tells the user to invoke canon-addition separately. Post-adjudication closeout assumes canon-addition has returned a verdict.

## Current Source Kinds

- `story_fact`
- `mystery_resolution`
- `character_arc_outcome`
- `artifact_canonization`
- `arc_effect_promotion`

Each source kind has a different required input set and different source-record handling.

## Current End-to-End Workflow

1. Pre-flight resolves world and story, validates the source kind and source ids, validates the promotion branch path, requires all supporting evidence pages to be rendered, allocates `SP-NNNN`, loads a `story_fact_promotion_to_canon` context packet, loads whole-class Mystery Reserve records, and loads content policy.
2. Source extraction loads the story-local or world mystery source, walks branch provenance, captures supporting prose excerpts, and for arc-effect promotion loads the arc, page, variant, effect, applied event, optional ARC_TRACE, and produced story-local record.
3. CF candidate translation applies the laundering firewall: the branch is evidence, not authority. The CF candidate uses world-canon schema, while story provenance flows through SP ledger, CH reason/notes, and PA adjudication body rather than overloading `source_basis.derived_from`.
4. Distribution and scope-inflation checks prevent story-local facts from silently becoming global. Widening is possible only with explicit user-provided evidence and later canon-addition adjudication.
5. Mystery firewall hard-rejects forbidden mysteries, non-`canon_candidate` mystery resolution authority, accidental mystery resolution, and arc-effect promotions that should instead use the mystery-resolution path.
6. Downstream-impact analysis scans other branches in the same story and optionally other stories for contradictions. It recommends flag, leave, or archive behavior for same-story branches; cross-story impacts are flag-only.
7. Proposal package assembly records source kind, source ids, CF candidate, provenance, scope check, mystery firewall, downstream impact, Rule 12 trace check, contradiction preference, execution mode, and content policy.
8. Mandatory critics check provenance, scope inflation, mystery firewall, downstream impact, and Rule 12 two-trace evidence when proposing hard canon. Bare PASS without rationale is treated as failure.
9. Phase 8 presents the promotion proposal to the user. This gate is absolute in every execution mode.
10. On user accept, the skill writes the proposal package and instructs the user to invoke `canon-addition` separately. Worldloom skills are non-chaining here.
11. After canon-addition adjudication, Phase 10 writes the SP ledger and, on accept-flavored outcomes, submits superseding story-local source records that add promotion links. It may also supersede branch records to flag or archive contradictions.
12. Phase 11 updates story and possibly per-world story indexes so accepted and rejected promotions are visible.

## Write Surface

Direct markdown/YAML writes:

- `story-promotions/SP-NNNN.md`
- `story-promotions/SP-NNNN-proposal-package.yaml`
- story bundle index updates
- possibly per-world `stories/INDEX.md`

Patch-engine story-bundle writes:

- superseding `SF`, `STENT`, `SREL`, story-local `DA`, or `BR` records as needed.

Transitively through `canon-addition`:

- world CF and CH records
- PA adjudication records
- world-level diegetic artifact records for artifact canonization
- touched-by-CF / extension / modification-history appends

## Primary Contracts And Handoffs

- Receives canon-candidate handoffs from page-cycle.
- Receives unauthorized-promotion warnings from health audit as manual intervention.
- Hands proposal packages to `canon-addition`.
- Uses rendered prose evidence produced by finalize.
- Leaves existing story state append-only and records promotion links through supersession.

## Hard Gates And Safety Boundaries

The promotion gate is absolute in all execution modes. It requires valid source provenance, rendered evidence pages, mystery firewall pass, critic pass, explicit user approval, and then a separate downstream canon-addition gate.

The skill explicitly avoids silent canon mutation, avoids chaining into canon-addition automatically, and refuses multi-source batch promotion.

## Current Complexity Hotspots

- This skill has the largest frontmatter argument surface among the story skills.
- It owns five distinct source-kind flows and multiple post-adjudication side effects.
- Its process model includes both pre-canon proposal generation and post-canon closeout, but canon-addition is invoked separately between phases.
- It straddles story-bundle patch operations and world-canon patch operations, even though it does not own world-canon mutation directly.
- The output table and process describe several conditional writes that are easy to mis-sequence.

## Streamlining Questions For Review

- Should each source kind be a separate smaller entrypoint that produces one common proposal package?
- Should post-adjudication closeout be a separate skill invoked after canon-addition returns?
- Should the handoff to canon-addition be represented as a stable file contract, with this skill ending after package creation?
- Should branch contradiction handling be split into a branch-maintenance workflow?
