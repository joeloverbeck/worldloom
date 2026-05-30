# SPEC102PROCOMREN-001: Author Manual Studio prose-craft contract doc

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — introduces `docs/manual-story-studio/prose-craft-contract.md`. No impact on existing branching-pipeline contracts.
**Deps**: None

## Problem

The compose pipeline (SPEC-102 §Scope item 2 stage 7, §Scope item 3 §13) reads `docs/manual-story-studio/prose-craft-contract.md` at compose time and inlines its body verbatim into §13 of every external prompt. The file does not exist yet; without it, the compose pipeline cannot run and §13 emits nothing. The file is the Manual Studio variant of the canonical `docs/prose-renderer-contract/prose-craft-contract.md`, scoped to the 2-5-beat-cluster manual-writing surface rather than the branching-pipeline scene-plan surface.

## Assumption Reassessment (2026-05-30)

1. Verified `docs/manual-story-studio/` exists with only `README.md` inside (no `prose-craft-contract.md` yet). The canonical precedent `docs/prose-renderer-contract/prose-craft-contract.md` exists; the canonical `docs/prose-renderer-contract/content-policy.md` and `docs/prose-renderer-contract/render-time-instruction.md` are also confirmed present and not modified by this spec (per §4 "No modification to").
2. SPEC-102 §5 enumerates the four authorial differences from the canonical contract: borrow POV / free-indirect / filter-word / sensory / no-ledger-jargon / length-follows-content principles; remove scene-plan diagnostic verdict vocabulary; remove prior-page / scene-range / page-render integration language; add Manual Studio framings (2-5 beat cluster, manual directive primacy, prose-as-manuscript-not-state, "author updates records manually after pasting prose").
3. Cross-artifact shared boundary: this contract is consumed at compose time by the §13 emitter in ticket 006 (read from disk) and the §13 read stage in ticket 007 (load file then hand body to emitter). Bundling at build time is rejected per SPEC-102 §3 Key Decisions ("Content policy is read at composer time, not bundled at build time"); the same discipline applies to the Manual Studio prose-craft contract.
4. FOUNDATIONS principle restated: §9 Prose Length Discipline At Story Scope mandates "Story-pipeline LLM-facing surfaces must not impose word-count targets, floors, ceilings, ranges, or budgets on rendered prose. Pacing is expressed structurally through the selected commitment block's `SLT.beats` list... and the natural close-where-the-next-commitment-becomes-available — never as a per-page or per-arc word quota. Length follows content." The Manual Studio variant inherits this discipline by stating beats-not-word-counts and stop-at-first-materially-new-response-point as the pacing mechanism.

## Architecture Check

1. A sibling document is cleaner than forking the canonical file: drift between the branching pipeline's needs (scene-plan diagnostics, scene-range stopping points) and Manual Studio's needs (2-5-beat cluster, paste-back manuscript) is expected and acceptable per SPEC-102 §3 Key Decisions and §8 Risks ("Drift between them is expected and acceptable"). No shared maintenance burden, no diff-merging across forks.
2. No backwards-compatibility aliasing introduced — `docs/manual-story-studio/prose-craft-contract.md` is greenfield; the canonical `docs/prose-renderer-contract/prose-craft-contract.md` is unchanged.

## Verification Layers

1. File presence — codebase grep-proof (`test -f docs/manual-story-studio/prose-craft-contract.md`).
2. Scene-plan diagnostic vocabulary absent — codebase grep-proof (`grep -nE '\b(PG|SE|SCN|SLT|STCHAR|page_plan_stchar_packet_integrity)\b' docs/manual-story-studio/prose-craft-contract.md` returns no matches).
3. FOUNDATIONS §9 alignment — manual review (no word-count quotas; pacing expressed via beats and stop rule).

## What to Change

### 1. Author the contract body

Create `docs/manual-story-studio/prose-craft-contract.md` with the following sections, each containing 1-3 paragraphs of authorial prose. Borrow principles from `docs/prose-renderer-contract/prose-craft-contract.md`, rewriting in Manual-Studio voice:

1. **POV Discipline** — Manual Studio prose runs at a single POV per prompt; free indirect discourse (FID) is preferred over filtered interiority ("she saw / he felt") except where filtering is the point.
2. **Filter-Word Cuts** — strip "she saw / he felt / he noticed / she heard" except where the filtering itself is the point being dramatized.
3. **Concrete Sensory Grounding** — specific objects, textures, sounds, smells, body postures; never generic "atmosphere" or "mood" abstractions.
4. **No Ledger Jargon** — never use Worldloom record-class names ("PG", "SE", "SLT", "STCHAR", "BEL", "CF") in narrator voice. The prompt body translates record content into novelist-facing prose; the contract restates that ledger-jargon ban as a craft rule.
5. **Length Follows Content** — pages may be 200 words or 1500; the right length is what the beats and the cast's reactions require, not a quota. Do not extend a scene to "reach a length" or compress one to "fit a length".
6. **2-5 Beat Cluster Framing** — the LLM is rendering a small chunk of forward motion, not an arc, scene, act, or chapter. Begin from the current situation, follow the manual moment directive, stop at the first materially new response point.
7. **Manual Directive Primacy** — the author's directive (§4 of the prompt) is the highest-priority instruction. Cast voice, beliefs, secrets, and stop rule are supporting context; directive overrides them in conflict.
8. **Prose as Manuscript, Not State** — the LLM writes prose; the author updates Manual Studio records manually after pasting the prose into the manuscript. The prose does not "change state" — the author's record edits do.

Do NOT include any of the following (the canonical file's scene-plan-specific scope that does not apply to Manual Studio):
- Scene-plan diagnostic verdict vocabulary (e.g., `page_plan_stchar_packet_integrity`, scene-range stopping points).
- Prior-page reading or scene-range continuation framing.
- Page-render / scene-render integration language.
- Branching-pipeline causal-state mechanics or `PG`/`SE`/`SCN`/`SLT` record references.

## Files to Touch

- `docs/manual-story-studio/prose-craft-contract.md` (new)

## Out of Scope

- Modifying `docs/prose-renderer-contract/prose-craft-contract.md` (precedent only; remains the canonical source for branching-pipeline scene plans).
- Authoring `docs/manual-story-studio/manual-render-instruction.md` — per SPEC-102 §4 "No modification to", the render-time guidance is inlined into §5 / §14 / §15 fixed strings of the prompt rather than a separate file.
- Wiring the contract into the compose pipeline — ticket 007 reads the file at stage 7; ticket 006 §13 emitter inlines its body into the composed prompt.

## Acceptance Criteria

### Tests That Must Pass

1. `test -f docs/manual-story-studio/prose-craft-contract.md` returns success.
2. `grep -c '^## ' docs/manual-story-studio/prose-craft-contract.md` returns ≥8 (one `##` heading per authorial section above).
3. `grep -nE '\b(PG|SE|SCN|SLT|STCHAR|page_plan_stchar_packet_integrity)\b' docs/manual-story-studio/prose-craft-contract.md` returns no matches.
4. `grep -niE '\b[0-9]+\s*(words?|word-count)\b' docs/manual-story-studio/prose-craft-contract.md` returns no matches (no word-count quotas per FOUNDATIONS §9).

### Invariants

1. The contract is the canonical source for §13 of the composed prompt; it is read fresh at compose time per file system disk, never bundled at build.
2. Drift from the canonical `docs/prose-renderer-contract/prose-craft-contract.md` is permitted and expected; the two files are siblings, not forks.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment. Ticket 007's compose pipeline test will integration-verify the file is read at stage 7 and inlined into §13.

### Commands

1. `test -f docs/manual-story-studio/prose-craft-contract.md`
2. `grep -nE '\b(PG|SE|SCN|SLT|STCHAR|page_plan_stchar_packet_integrity)\b' docs/manual-story-studio/prose-craft-contract.md` — must return no matches.
3. `grep -niE '\b[0-9]+\s*(words?|word-count)\b' docs/manual-story-studio/prose-craft-contract.md` — must return no matches.
