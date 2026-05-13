# Branching Story Page Prose Finalize - Current Workflow Report

This report is self-contained. It inlines the important workflow, validation, ARC_TRACE, hard-gate, and submit details so a reviewer does not need repository access.

## Purpose

`branching-story-page-prose-finalize` is the convergence workflow between plan-authoring and rendered prose. Bootstrap and page-cycle create page plans and pending PG records. The user or an external renderer writes `pages-prose/PG-NNNN.md`. Finalize then validates that prose against the plan and state, emits finalize audit records, updates the PG fields from pending to rendered, and updates the story index.

It never writes the prose file itself.

## Embedded Source Details

The underlying skill is split across one orchestration document and per-phase write-ups. The important embedded details are:

- Finalize requires both a plan file and rendered prose file before it starts. The PG record must still be pending; already-rendered pages are not finalized again.
- Plan/prose pairing compares `state_hash_at_plan_time` and `canon_revision_at_plan_time` against the PG record. Drift aborts by default; explicit drift acceptance records the mismatch in the finalize event.
- Deterministic pre-critic checks three things before any LLM-style criticism: engine vocabulary leaking into prose, forbidden mystery resolution, and REQUIRED TURN miss. These checks halt without an internal rewrite loop because the prose is supplied externally.
- The 8-axis prose critic returns PASS, SOFT_FAIL, or HARD_FAIL with cited instances. The critic uses content policy, prose-craft contract, rendered prose, and prior branch prose for tic detection. SOFT_FAIL can proceed only if the user explicitly accepts as-is.
- ARC_TRACE extraction runs only for pages with a selected scene-commitment arc. Bootstrap root pages with no selected arc skip ARC_TRACE. The trace captures realized beats, evidence spans, stop condition, effect evidence, possible violations, and conformance to the selected arc/effect variant.
- Deferred gate resolution owns three page-cycle/bootstrap placeholders: prose-ledger consistency, arc-trace evidence alignment, and prose critic verdict. Each must be written as PASS or FAIL with a rationale.
- The approval summary includes page id, critic verdict, deferred gate verdicts, ARC_TRACE summary, target PG field updates, new event/trace records, and index edit.
- Engine submit updates the existing PG record through field updates, creates the finalize event, optionally creates the ARC_TRACE record, then edits story index last.
- Partial failure semantics are asymmetric: if engine submit fails, no index edit occurs; if index edit fails after submit, YAML state is authoritative and the index must be repaired separately.

## Current End-to-End Workflow

1. Pre-flight resolves the bundle, requires both the plan file and rendered prose file, reads the PG record, requires `prose_status == pending`, pre-allocates an `SE` id and conditionally an `ARCTRACE` id, resolves execution mode, loads `docs/FOUNDATIONS.md`, and loads the content-policy block.
2. Plan/prose pairing compares plan frontmatter hashes and canon revision against the PG record. Drift aborts unless `accept_plan_drift=true`, in which case the drift is recorded in the finalize SE event.
3. Deterministic pre-critic scans rendered prose for engine-vocabulary leakage, forbidden-mystery resolution, and REQUIRED TURN misses. Failure halts; the user revises prose externally and reruns.
4. The 8-axis prose critic checks craft and conformance using content policy, prose-craft contract, rendered prose, and prior 1-2 rendered pages along the branch. It returns PASS, SOFT_FAIL, or HARD_FAIL.
5. ARC_TRACE extraction runs for pages that realized a scene-commitment arc. Bootstrap root pages with no selected arc skip this phase. Layer 2 extracts the trace from prose; Layer 3 semantically checks it against the arc and plan.
6. Deferred gate resolution updates the three gates that page-cycle/bootstrap left pending: `prose_ledger_consistency`, `arc_trace_evidence_alignment`, and `prose_critic_8_axis`. Each must carry a rationale.
7. Phase 6 approval is shown in authoring mode, hidden in interactive runtime after validation passes, and hidden in batch generation until checkpoint or failure. SOFT_FAIL can be accepted as-is only by explicit approval.
8. Phase 7 submits a patch envelope that updates the existing PG record fields, creates an `SE` record with `action: prose_finalized`, creates an `ARCTRACE` record when applicable, then edits bundle `INDEX.md` last.

## Write Surface

Finalize writes through patch-engine operations:

- `update_record_field` on the existing PG record.
- `create_se_record` for the finalize event.
- `create_arc_trace_record` when applicable.

It also directly edits bundle `INDEX.md` after successful submit. It does not create a new PG record and does not supersede PG identity.

## Primary Contracts And Handoffs

- Consumes page plans from bootstrap and page-cycle.
- Consumes user/external rendered prose.
- Produces rendered-state PG records that unblock further page-cycle ticks.
- Produces ARC_TRACE records used by health audit.
- Does not trigger story-fact promotion; canon promotion remains page-cycle plus promotion-skill territory.

## Hard Gates And Safety Boundaries

The gate requires rendered prose, pending PG state, plan/prose hash compatibility or explicit drift acceptance, deterministic pre-critic pass, prose critic pass or explicit soft-fail acceptance, valid ARC_TRACE when applicable, deferred-gate verdicts, and mode-appropriate approval.

Critical hard rules:

- Never write `pages-prose/PG-NNNN.md`.
- Never mutate world canon.
- Never promote story facts.
- Preserve PG identity.
- Use an SE event as the audit trail for `pending -> rendered`.
- Edit `INDEX.md` last.

## Current Complexity Hotspots

- Finalize inherits deferred responsibilities from both bootstrap and page-cycle, so it must understand plan frontmatter, state hashes, rendered prose, prose craft, arc trace, and patch-engine updates.
- It has both deterministic validation and LLM-style criticism.
- The drift option is powerful but requires careful audit wording.
- It is simpler than page-cycle but tightly coupled to pending-prose fields and ARC_TRACE shape.

## Streamlining Questions For Review

- Should page-plan frontmatter have a smaller machine contract specifically for finalize?
- Should prose criticism and ARC_TRACE extraction be separable subcommands?
- Should finalize provide a dry-run report mode that performs all validation without writing?
- Should the "external renderer writes prose" boundary be represented in a shared story-page lifecycle document?
