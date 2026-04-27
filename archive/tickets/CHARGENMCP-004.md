# CHARGENMCP-004: Align character-generation skill default `token_budget` with engine's required-classes minimum

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None — documentation/skill-prose alignment only
**Deps**: archive/tickets/CHARGENMCP-001.md

## Problem

At intake, during the Namahan character-generation run (2026-04-27), the first context-packet call used the skill-documented default `token_budget=10000` (per `.claude/skills/character-generation/SKILL.md:92` and `.claude/skills/character-generation/references/world-state-prerequisites.md:13`). The engine returned `packet_incomplete_required_classes` with `requested_budget: 12000` (after the first attempt) and `minimum_required_budget: 12132` for a 12-seed call against `worlds/animalia/`. The documented default and the engine's actual floor diverged: a fresh skill invocation that followed the prerequisites verbatim hit a packet-insufficiency error and had to retry with a manually-raised budget.

This is a small but real friction point. The skill's documented default should be at or above the engine's minimum-required floor for the typical call shape (12 seed nodes against a mature world), so that "follow the prerequisites verbatim" produces a successful packet on first call. The engine's insufficiency error path remains the correct safety net for unusually large seed sets.

## Assumption Reassessment (2026-04-27)

1. At intake, `.claude/skills/character-generation/SKILL.md:92` and `.claude/skills/character-generation/references/world-state-prerequisites.md:13` documented `token_budget=10000` as the default for `mcp__worldloom__get_context_packet(task_type='character_generation', …)`. Same-family CHARGENMCP-001 fallout had already moved those references to `16000`, but live proof showed that value was still below the current floor for the intended 12-seed shape.
2. A direct compiled-handler probe against `worlds/animalia/` with a representative Namahan 12-seed set (`NCP-0007`, drylands/verse/well-keeper CFs, and relevant SEC nodes) returned `packet_incomplete_required_classes` at `token_budget=16000` with `minimum_required_budget: 32102`. The measured floor is therefore materially higher than both the original `10000` and the interim `16000`.
3. The same representative probe succeeds at `token_budget=33000`, with `requested: 33000`, `allocated: 32997`, 12 local-authority nodes, 135 scoped-local-context nodes, and 54 governing-world-context nodes. The documented default is set to `33000`, rounded up from the measured 32102 floor with a small headroom buffer.
4. `archive/tickets/CHARGENMCP-001.md` increased the `character_generation` packet's governing payload (all invariants full body + all M records' firewall fields ≈ 44KB additional). This ticket measured the post-CHARGENMCP-001 floor so the final default reflects the landed packet shape, not the pre-CHARGENMCP-001 floor or the interim same-family `16000` edit.
5. Cross-skill / cross-artifact boundary under audit: the prose contract between the character-generation skill and the context-packet API. The skill's example budget is a default users follow verbatim under Auto Mode; misalignment with the engine's floor is a workflow defect.
6. FOUNDATIONS principle under audit: §Tooling Recommendation's completeness guarantee. The packet's required-classes floor exists precisely to enforce completeness; the skill default must respect it.
7. HARD-GATE / canon-write ordering: not touched. This is a skill-prose change.
8. Schema extension: none.
9. Adjacent contradictions exposed by reassessment:
   - Other task-typed skills (`canon-addition`, `continuity-audit`, `propose-new-canon-facts`) may have similar default-budget misalignments. This ticket is scoped to `character-generation`; a parallel sweep over the other skills' documented defaults belongs in a follow-up ticket if a future audit confirms the same divergence.
   - The `packet_incomplete_required_classes` error's `minimum_required_budget` field is informative — skills could compute the right budget on first call by issuing a deliberately-small probe and reading the floor from the error. That is an over-engineered workaround for what should be a documented honest default.

## Architecture Check

1. Aligning the documented default with the engine's measured floor is the simplest fix. The alternative (lower the engine's floor) would weaken the locality-first packet's completeness guarantee — the floor exists for a reason.
2. No backwards-compatibility aliasing/shims introduced. This is a documentation/prose change.

## Verification Layers

1. The skill prose's example default budget is at or above the engine's minimum-required floor for a typical 12-seed call against `worlds/animalia/` after `archive/tickets/CHARGENMCP-001.md` — direct compiled-handler probe against the measured floor.
2. A context-packet call with the new default budget against a representative Namahan seed set succeeds without hitting `packet_incomplete_required_classes` — targeted tool command substitute for a full skill dry-run.
3. FOUNDATIONS alignment — preserves §Tooling Recommendation completeness guarantee while removing the documented-default-vs-engine-floor mismatch — FOUNDATIONS alignment check.

## What to Change

### 1. Measure the post-CHARGENMCP-001 floor

Measure the post-CHARGENMCP-001 `minimum_required_budget` for a `character_generation` packet against `worlds/animalia/` with a representative seed set (~10–12 seeds drawn from a real character proposal such as NCP-0007). Round up to the nearest 1000 with a small headroom buffer.

### 2. Update skill prose to use the measured default

Edit `.claude/skills/character-generation/SKILL.md` at the `token_budget` reference (line 92) and `.claude/skills/character-generation/references/world-state-prerequisites.md` at the example call (line 13) to use the measured value `33000`.

### 3. Document the floor-divergence error path

In `.claude/skills/character-generation/references/world-state-prerequisites.md`, add a one-line note: "If the packet returns `packet_incomplete_required_classes`, retry with `token_budget` set to the response's `minimum_required_budget` field. The default above is calibrated for a typical 12-seed call shape; unusually large seed sets may exceed it."

## Files to Touch

- `.claude/skills/character-generation/SKILL.md` (modify — line 92)
- `.claude/skills/character-generation/references/world-state-prerequisites.md` (modify — line 13 + new note)

## Out of Scope

- Changes to the engine's required-classes floor (`tools/world-mcp/src/context-packet/`).
- Changes to other task-typed skills' default budgets (`canon-addition`, `continuity-audit`, `propose-new-canon-facts`, etc.) — covered by a future audit if needed.
- Changes to the `packet_incomplete_required_classes` error shape (the error's `minimum_required_budget` field is already authoritative; this ticket relies on it).

## Acceptance Criteria

### Tests That Must Pass

1. Targeted compiled-handler probe: invoking `getContextPacket({ task_type: "character_generation", world_slug: "animalia", seed_nodes: [representative NCP-0007 12-seed set], token_budget: 33000 })` succeeds at the first context-packet call without retry. (Prerequisite: `archive/tickets/CHARGENMCP-001.md`.)
2. Grep-proof: `grep "token_budget=10000" .claude/skills/character-generation/` returns no matches.
3. Grep-proof: `grep "token_budget=" .claude/skills/character-generation/` returns `33000` at both citation sites.

### Invariants

1. Documented default budget ≥ engine minimum-required floor for the typical call shape on `worlds/animalia/`.
2. The skill prose still references `packet_incomplete_required_classes` as the safety net for unusually large seed sets.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -rn "token_budget" .claude/skills/character-generation/`
2. `node -e 'const {getContextPacket}=require("./tools/world-mcp/dist/src/tools/get-context-packet.js"); (async()=>{const seeds=["NCP-0007","CF-0044","CF-0046","CF-0047","CF-0037","CF-0017","CF-0024","SEC-GEO-014","SEC-GEO-004","SEC-ELF-004","SEC-PAS-002","SEC-INS-010"]; const r=await getContextPacket({task_type:"character_generation",world_slug:"animalia",seed_nodes:seeds,token_budget:33000}); if ("code" in r) throw new Error(JSON.stringify(r)); console.log(JSON.stringify({requested:r.task_header.token_budget.requested,allocated:r.task_header.token_budget.allocated,local:r.local_authority.nodes.length,scoped:r.scoped_local_context.nodes.length,governing:r.governing_world_context.nodes.length}));})()'`

## Outcome

Completion date: 2026-04-27.

Implemented. The character-generation skill now documents `token_budget=33000` in both the top-level prerequisite line and the detailed world-state prerequisites reference. The prerequisites reference keeps the `packet_incomplete_required_classes` retry instruction and clarifies that the default is calibrated for a typical 12-seed mature-world call.

No engine default was changed; `tools/world-mcp/src/tools/get-context-packet.ts` still keeps `character_generation: 8000` as the API fallback, and this ticket only aligns the skill's explicit call budget.

## Verification Result

Passed:

1. `grep -R "token_budget=10000" .claude/skills/character-generation/` — no matches.
2. `grep -R "token_budget=" .claude/skills/character-generation/` — returns `token_budget=33000` in `.claude/skills/character-generation/SKILL.md` and `.claude/skills/character-generation/references/world-state-prerequisites.md`.
3. Direct compiled-handler probe at `token_budget=16000` with the representative NCP-0007 12-seed set returned `packet_incomplete_required_classes` with `minimum_required_budget: 32102`, confirming the interim same-family value was still too low.
4. Direct compiled-handler probe at `token_budget=33000` with the same seed set succeeded: `requested: 33000`, `allocated: 32997`, `local: 12`, `scoped: 135`, `governing: 54`.
5. `git diff --check`.

Manual full `Skill character-generation` dry-run was not run; the accepted proof is the targeted context-packet call that exercises the ticket-owned default-budget invariant without creating or mutating character content.

## Deviations

- Reassessment found that CHARGENMCP-001 same-family fallout had already changed the documented budget from `10000` to `16000`, but live measurement proved `16000` still failed for the representative 12-seed shape. This ticket therefore lands `33000`, not the drafted expected `16000–20000` range.
- The proof surface is a direct compiled `getContextPacket` handler probe rather than a full character-generation skill dry-run, because the ticket only owns the first packet-call budget and the full skill would create or mutate character workflow artifacts outside this documentation-only seam.
