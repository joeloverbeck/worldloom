# MCPENH-069: `get_context_packet` tool description omits `persisted_with_summary` delivery mode's `story_bundle_context: null` + `governing_summary.story_bundle_context_summary` behavior

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/server.ts` `get_context_packet` tool description docstring; ticket closeout only.
**Deps**: archive/tickets/MCPENH-020-document-persisted-with-summary-fallback-and-batch-retrieval.md (sibling skill-prose treatment, now archived), archive/tickets/MCPENH-022-document-persisted-with-summary-fallback-in-canon-addition-retrieval-tool-tree.md (sibling skill-prose treatment, now archived).

## Problem

At intake, the `get_context_packet` MCP tool description at `tools/world-mcp/src/server.ts` (operator-facing capability docstring surfaced through `list_tools` / `describe_capabilities`) promised an asymmetry between `story_bootstrap` (always returns `story_bundle_context: null`) and other story-pipeline task types (populate `story_bundle_context` from indexed bundle records). The docstring carried no caveat for the `delivery_status: persisted_with_summary` overflow mode, which collapses `story_bundle_context` to `null` and emits the bundle context as `governing_summary.story_bundle_context_summary` instead — regardless of task type.

This had drifted from the runtime behavior documented in `docs/CONTEXT-PACKET-CONTRACT.md` §Budget Enforcement / §Fast-Summary Inline Delivery (`story-pipeline summaries include governing_summary.story_bundle_context_summary`). An operator who read the MCP tool docstring at capability-discovery time got a misleading promise; the recovery path (`get_persisted_packet_slice`, `get_records`, or whole-class `list_records`) was reachable via `truncation_summary.fallback_advice` in the actual response, but the docstring's bootstrap-vs-non-bootstrap framing pre-conditioned the operator to expect populated context.

Worked session evidence (2026-05-26): a `commitment-block-authoring` invocation against `worlds/erotica-world/stories/red-bunny/` called `get_context_packet(world_slug='erotica-world', story_slug='red-bunny', task_type='commitment_block_authoring', parent_page_id='PG-2', seed_nodes=[<21 ids: M-1..M-7, ONT/CAU/DIS/SOC/AES invariants, CF-0001/0005/0006/0007>], token_budget=18000)`. The response carried `delivery_status: persisted_with_summary`, `token_budget.allocated: 3517`, `story_bundle_context: null`, every per-layer `nodes` array empty, and `governing_summary.story_bundle_context_summary` populated with `storylet_total: 12`, active intention/status/belief/relationship/clock/secret/question ids, etc. The operator's mental model based on the docstring (which says `commitment_block_authoring` populates `story_bundle_context`) was incorrect; the actual recovery path required reading `delivery_status` + `governing_summary.story_bundle_context_summary` per the contract doc. In this session the operator had alternative sources (bundle `INDEX.md` direct-read + targeted `get_records` for specific SLT ids), so no `get_persisted_packet_slice` call was needed — but an operator without the alternative source would have followed the docstring and missed the populated summary.

## Assumption Reassessment (2026-05-26)

1. **Intake codebase verification**: before this ticket's source edit, `tools/world-mcp/src/server.ts` carried the `get_context_packet` registration with the docstring text *"Story-pipeline task types require story_slug. story_bootstrap treats it as the target bundle slug and returns story_bundle_context: null; other story-pipeline task types populate story_bundle_context from indexed story-bundle records plus STORY_KERNEL.md frontmatter, including active_intentions, active_statuses, active_beliefs_by_holder, active_relationships_by_participant, active_locations_in_scope, active_objects_in_scope, active_story_diegetic_artifacts, active_story_characters, active_actor_plans, active_emotional_states, and a projection-only selection_shortlist when parent_page_id is supplied or a PG seed is present. World-canon task types return story_bundle_context: null."* The string had zero mention of `persisted_with_summary`, `governing_summary.story_bundle_context_summary`, or the null behavior in overflow mode. Runtime behavior at `tools/world-mcp/src/context-packet/assemble.ts:201–219` confirmed the persistence path sets `summary.story_bundle_context = null` and assigns `summary.story_bundle_context_summary = summarizeStoryBundleContext(packet.story_bundle_context)`. The drift between docstring and runtime was real at intake.

2. **Docs reassessment**: `docs/CONTEXT-PACKET-CONTRACT.md:191` already documents the runtime behavior verbatim ("story-pipeline summaries include `governing_summary.story_bundle_context_summary`"). `docs/CONTEXT-PACKET-CONTRACT.md:224` documents the `task_header.delivery_status === 'persisted_with_summary'` recovery shape. The contract doc is correct; the docstring is the drifted surface. No edit to the contract doc is required. Cross-referenced precedents: archived MCPENH-020 + MCPENH-022 addressed the parallel drift in skill prose (`storylet-pool-authoring` / now `commitment-block-authoring`, canon-addition, canon-facts-from-diegetic-artifacts) by documenting the recovery path inline in `references/preflight-and-prerequisites.md` and `references/retrieval-tool-tree.md` files — but explicitly did NOT update the MCP tool description. The drift at the docstring surface is a separate, previously-unaddressed seam.

3. **Cross-skill / cross-artifact boundary**: the shared boundary is the **MCP capability docstring as the operator-facing contract** for the retrieval surface. Operators reading the docstring at capability-discovery time (via `list_tools` / `describe_capabilities`) must be able to rely on its promises; when the docstring's promise narrows the actual runtime behavior, the recovery path is unreachable from the discovery surface alone. The contract boundary is between `tools/world-mcp/src/server.ts` tool-registration docstrings and `docs/CONTEXT-PACKET-CONTRACT.md` prose; both must agree on the runtime contract, and the docstring is the surface a tool consumer reads first.

4. **FOUNDATIONS §Tooling Recommendation restated**: the contract says LLM agents "should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel, current Invariants, relevant canon fact records, affected domain files, unresolved contradictions list, mystery reserve entries touching the same domain." The "directly or via the documented context-packet + targeted-retrieval pattern" clause is load-bearing: the discovery surface (MCP tool docstring) must accurately disclose when the context-packet path returns a summary requiring follow-up retrieval, so the operator can route to the targeted-retrieval pattern (`get_persisted_packet_slice` / `get_records` / `list_records`) without first encountering the silent runtime divergence. The docstring's current shape is technically truthful for the inline-delivery case but misleading for the overflow case it never mentions, and the overflow case is the one where the targeted-retrieval pattern is most necessary.

5. **Adjacent contradiction surfaced during reassessment**: the docstring's bootstrap-vs-non-bootstrap asymmetry treated `story_bundle_context: null` as a by-design `story_bootstrap` feature (the bundle does not yet exist) vs. a by-design populated state for non-bootstrap task types. Under `persisted_with_summary`, both task-type families return `story_bundle_context: null` for entirely different reasons (bootstrap: bundle doesn't exist; overflow: bundle exists but context was too large for inline). A consumer treating null as a uniform signal (e.g., "the bundle is absent") could silently misinterpret the overflow case as a bootstrap case. The landed edit preserves the bootstrap-asymmetry framing while disambiguating the overflow case as an environmental (budget) condition rather than a structural (task-type) condition.

6. **Pre-edit baseline (2026-05-26)**: `npm test` from `tools/world-mcp` passed before the docstring edit (`472` passing assertions across `468` reported subtests, exit 0). The package already had ignored artifacts before verification: `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/`.

7. **Package public-surface parity checked**: `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` already document `get_context_packet` overflow as `delivery_status: 'persisted_with_summary'` with `governing_summary.story_bundle_context_summary` and `task_header.persisted_output_path` / targeted-retrieval recovery. No README or repo-doc edit was needed; the missing same-seam surface was the registered capability description in `tools/world-mcp/src/server.ts`.

## Architecture Check

1. **Why a docstring edit is cleaner than alternatives**:
   - **Alternative A** — extend the runtime to never return `story_bundle_context: null` in overflow mode (e.g., return a truncated populated form): rejected because the persistence design is the right runtime behavior for over-budget cases (preserves full content in a recoverable persisted file rather than silently truncating in-flight) per the MCPENH-022 §What to Change Alternative A precedent. The friction is the docstring's incomplete disclosure, not the runtime decision.
   - **Alternative B** — extend the runtime to always include `governing_summary.story_bundle_context_summary` even in inline mode (so consumers can rely on a single populated field): rejected because the inline-vs-summary distinction is operationally useful (consumers can branch on `delivery_status` and use the heavier `story_bundle_context` directly when inline). Collapsing the distinction would force every consumer to walk the summary path even in the common inline case.
   - **Chosen approach** — add a sentence at the end of the existing docstring naming the overflow case explicitly and cross-referencing `docs/CONTEXT-PACKET-CONTRACT.md` for the recovery shape. Parallel to the MCPENH-020 / MCPENH-022 precedent (which cross-referenced the contract doc rather than redocumenting the recovery shape inline in skill prose); this ticket applies the same pattern at the tool-description surface.

2. **No backwards-compatibility aliasing/shims**: this is a docstring-only change in `tools/world-mcp/src/server.ts`. The registered tool name, input schema, output shape, and runtime behavior are unchanged. No callers of the tool are affected; the only consumers of the docstring text are humans (operators) and any LLM-side capability-introspection consumer that reads `list_tools` / `describe_capabilities` output. The docstring expansion is additive (new sentence at the end of the existing string); no existing prose is removed or contradicted.

## Verification Layers

1. **Docstring discloses the overflow case** → codebase grep-proof: `grep -nE "persisted_with_summary|story_bundle_context_summary" tools/world-mcp/src/server.ts` post-edit returns ≥1 hit inside the `get_context_packet` registration string literal.
2. **Build catches any syntax breakage in the docstring edit** → build verification: `(cd tools/world-mcp && npm run build)` passed after the edit.
3. **No collateral drift introduced in unrelated tool descriptions** → grep-proof: `grep -nE "persisted_with_summary" tools/world-mcp/src/server.ts` post-edit shows hits ONLY in tool descriptions where the documentation is intentionally added (the `get_context_packet` registration; sibling tool registrations that already document the same behavior — `get_records`, `describe_envelope_schema` — should be inspected for consistency parity, and any divergent phrasing surfaced as a same-PR follow-up edit).
4. **Cross-reference target exists** → manual review: the added sentence cites `docs/CONTEXT-PACKET-CONTRACT.md` §Fast-Summary Inline Delivery; the section exists at lines 191–239 per the Phase 5 grep at `tools/world-mcp/src/server.ts` audit time.

## Landed Changes

### 1. Added overflow-mode disclosure to the `get_context_packet` tool description

Edited `tools/world-mcp/src/server.ts` at the `get_context_packet` `registerToolWithCapability` call to append a sentence at the end of the existing description string:

```
... World-canon task types return story_bundle_context: null. Unresolvable seed_nodes are skipped and surfaced in task_header.warnings; all-unresolved seed sets still return seed-independent context with an aggregate warning. Over-budget responses return task_header.delivery_status='persisted_with_summary' with story_bundle_context: null and governing_summary.story_bundle_context_summary populated for story-pipeline packets; the full packet is persisted to task_header.persisted_output_path for recovery via get_persisted_packet_slice(persisted_path, slice_path), get_records(record_ids, story_slug?), or list_records(record_type, story_slug?). See docs/CONTEXT-PACKET-CONTRACT.md §Fast-Summary Inline Delivery for the complete recovery shape.
```

The landed sentence explicitly names `persisted_with_summary` as a delivery state, names `story_bundle_context: null` + `governing_summary.story_bundle_context_summary` as the overflow shape, names the recovery tools (`get_persisted_packet_slice`, `get_records`, `list_records`), and cross-references `docs/CONTEXT-PACKET-CONTRACT.md` for the contract-level treatment.

### 2. Inspected sibling tool descriptions and package docs for consistency parity

`get_records`, `get_persisted_packet_slice`, and `describe_envelope_schema` already mention `persisted_with_summary` in their registered descriptions. `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` already had the same recovery contract for `get_context_packet`, so no same-seam public docs edit was required.

## Files to Touch

- `tools/world-mcp/src/server.ts` (modify)

## Out of Scope

- Edits to `docs/CONTEXT-PACKET-CONTRACT.md` — the contract doc already documents the overflow shape correctly per Assumption Reassessment item 2; no edit needed.
- Skill prose updates in `.claude/skills/commitment-block-authoring/SKILL.md` — the skill already cites `persisted-packet-recovery.md` per its §Persisted-summary recovery paragraph; no skill-prose edit needed.
- Runtime behavior changes — `get_context_packet` continues to return `persisted_with_summary` for over-budget deliveries; the assembly logic at `tools/world-mcp/src/context-packet/assemble.ts:201–219` is unchanged.
- New tests for tool-description content — the codebase grep is the structural verification; introducing a test that asserts specific docstring wording would couple the test to prose that may legitimately rephrase over time.
- The MCPENH-020 / MCPENH-022 sibling treatment in skill prose is already complete; this ticket does not revisit it.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "persisted_with_summary|story_bundle_context_summary" tools/world-mcp/src/server.ts` — returns ≥1 hit inside the `get_context_packet` description string literal post-edit.
2. `(cd tools/world-mcp && npm run build)` — completes with exit code 0, confirming the docstring edit did not break TypeScript parsing.
3. `(cd tools/world-mcp && npm test)` — full package test suite continues to pass post-edit (no test asserts the specific docstring text at HEAD, so this is a regression-guard rather than a specific assertion).
4. Manual review: read the post-edit docstring end-to-end and confirm the bootstrap-vs-non-bootstrap asymmetry framing is preserved while the overflow case is now disambiguated as an environmental condition.

### Invariants

1. The MCP tool description for `get_context_packet` must disclose every documented delivery state that affects the shape of returned content — inline, persisted_with_summary, and the per-task-type `story_bundle_context` shape — so an operator reading the discovery surface alone can reason about response handling without consulting `docs/CONTEXT-PACKET-CONTRACT.md`.
2. The docstring and `docs/CONTEXT-PACKET-CONTRACT.md` must agree on the runtime contract; when one is the canonical source (per current convention, the contract doc), the other must cross-reference it rather than independently restate.
3. The bootstrap-vs-non-bootstrap structural asymmetry in `story_bundle_context` shape must remain disambiguated from the environmental overflow case; both can produce `story_bundle_context: null` but for distinct reasons, and the docstring must distinguish them.

## Test Plan

### New/Modified Tests

1. None — tool-description-only ticket; verification is command-based and existing package coverage is named in Assumption Reassessment.

### Commands

1. `grep -nE "persisted_with_summary|story_bundle_context_summary" tools/world-mcp/src/server.ts` — targeted docstring verification.
2. `(cd tools/world-mcp && npm run build)` — TypeScript compilation regression guard.
3. `(cd tools/world-mcp && npm test)` — full package regression sweep; passed after the edit.

## Outcome

Completed: 2026-05-26.

Completed as a registered MCP capability-description correction. The `get_context_packet` description now preserves the bootstrap-vs-non-bootstrap `story_bundle_context` framing while explicitly disclosing that over-budget `persisted_with_summary` responses return `story_bundle_context: null` and move bundle detail into `governing_summary.story_bundle_context_summary`. The sentence also names `task_header.persisted_output_path` and the recovery tools (`get_persisted_packet_slice`, `get_records`, `list_records`). Runtime behavior, schemas, validation, HARD-GATE behavior, approval-token flow, and canon-write semantics are unchanged.

## Verification Result

1. Pre-edit baseline: `npm test` from `tools/world-mcp` — passed before source edits (`472` pass, `0` fail).
2. `grep -nE "persisted_with_summary|story_bundle_context_summary" tools/world-mcp/src/server.ts` — passed; the `get_context_packet` registered description now includes both terms, while existing sibling descriptions for `get_records`, `get_persisted_packet_slice`, and `describe_envelope_schema` retain their legitimate `persisted_with_summary` mentions.
3. `npm run build` from `tools/world-mcp` — passed after the source edit.
4. Manual review of `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, and `docs/CONTEXT-PACKET-CONTRACT.md` — passed; those surfaces already documented the same overflow / persisted-summary recovery contract, so no same-seam doc edit was needed.
5. Final broad verification: `npm test` from `tools/world-mcp` — passed after source and ticket closeout edits (`472` pass, `0` fail).

## Deviations

- `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` were inspected as same-seam public surfaces but left unchanged because they already documented the intended recovery behavior.
- `docs/CONTEXT-PACKET-CONTRACT.md` was left unchanged because it is the already-correct contract authority for `persisted_with_summary`.
