# SPEC102PROCOMREN-006: 15-section emitters

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — introduces `tools/manual-story-studio/src/prompt/sections/` with 15 section emitter modules plus a barrel. No impact on existing code paths; consumed by ticket 007 compose pipeline.
**Deps**: 002, 003, 004, 005

## Problem

The external prompt's 15-section structure is the load-bearing externalization of FOUNDATIONS §Tooling Recommendation across the process boundary to the third-party LLM. Each section body has a fixed responsibility, fixed heading (`## N. <Section Name>`), fixed ordering, and a per-section assembly contract derived from inputs (metadata, cast, records, moment directive, optional template, loaded content-policy and prose-craft-contract bodies, optional recent-segment fallback). The 15-section structure is the contract that makes prompts byte-deterministic per SPEC-102 §Acceptance criterion 1.

## Assumption Reassessment (2026-05-30)

1. Verified `tools/manual-story-studio/src/prompt/sections/` does not exist; the per-section emitter contract `SectionEmitterInput` ships in ticket 002. The translator registry from tickets 003/004/005 exposes `getTranslator(recordClass)` for the emitters consuming `cast` (§7) and the 17 record-class translators (§3 / §8 / §9 / §10 / §11). The canonical sources read at compose time are `docs/prose-renderer-contract/content-policy.md` (verbatim into §1) and `docs/manual-story-studio/prose-craft-contract.md` (verbatim into §13; created in ticket 001).
2. SPEC-102 §Scope item 3 enumerates every section's assembly rule: §1 verbatim content-policy; §2 author-facing rendering of story-contract YAML; §3 author-pinned records + optional recent-segment last paragraph (with no-segments-yet fallback omitting the paragraph); §4 verbatim moment directive; §5 fixed string parameterized by `prompt_policy.default_beat_count` (default `2-5` when unset); §6 always present, with `(none selected)` literal when no template is given; §7 all 9 Manual Character Profile fields per cast member; §8 / §9 / §10 / §11 / §12 per-class records; §13 verbatim prose-craft-contract; §14 / §15 fixed strings. Section count is exactly 15 in fixed order — no reordering, no omitting (except §6 keeps its heading with `(none selected)` body), no extending without a spec amendment.
3. Cross-artifact shared boundary: the `SectionEmitterInput` shape from ticket 002 is the contract; each emitter is `(input: SectionEmitterInput) => string` returning the section body (no `## N.` heading — the barrel adds heading + numbering at assembly time). §1 byte-equality with disk content-policy is the hard-fail lint surface (ticket 008 checks); the emitter still reads from input and must round-trip without modification.
4. FOUNDATIONS principles restated: §Tooling Recommendation ("LLM agents should never operate on prose alone... should always receive current World Kernel, current Invariants, relevant canon fact records, affected domain files, unresolved contradictions list, mystery reserve entries touching the same domain") — the 15-section format is the Manual Studio externalization of this packet across the process boundary. §Story Bundles §6b Information / Observer Firewall — §10 reveal-permission language and §12 forbidden-reveals/forbidden-inventions are the composer-scope firewall per SPEC-102 §5 FOUNDATIONS Alignment ("Firewall enforcement is at composer scope").

## Architecture Check

1. One file per section (`section-1-content-policy.ts` ... `section-15-output-instruction.ts`) plus a `sections/index.ts` barrel that exports `assembleSections(input: SectionEmitterInput): string` — orchestrates section ordering, heading injection, and the final Markdown concatenation. Per-file decomposition makes per-section behavior independently testable and obvious in code review (one section per diff line).
2. No backwards-compatibility aliasing — sections are greenfield; the §5 / §14 / §15 fixed strings replace any need for a `docs/manual-story-studio/manual-render-instruction.md` (explicitly not created per SPEC-102 §4 "No modification to").

## Verification Layers

1. All 15 sections appear in fixed order — schema validation (assembled prompt has 15 `## N.` headings with N=1..15 in order).
2. §1 byte-equality with `docs/prose-renderer-contract/content-policy.md` body — schema validation (assembled §1 body equals disk file body byte-for-byte).
3. §13 byte-equality with `docs/manual-story-studio/prose-craft-contract.md` body — schema validation (assembled §13 body equals disk file body byte-for-byte).
4. §6 present in all prompts (with `(none selected)` when no template) — codebase grep-proof on the assembled Markdown.
5. §5 parameterizes by `prompt_policy.default_beat_count` (default `2-5`) — schema validation across fixture metadata variants.
6. §10 reveal-permission language and §12 forbidden-reveals — manual review (firewall surface per FOUNDATIONS §Story Bundles §6b).

## What to Change

### 1. Create 15 per-section emitter files

Under `tools/manual-story-studio/src/prompt/sections/`, create:

- `section-1-content-policy.ts` — returns `input.content_policy_body` verbatim (no transformation).
- `section-2-story-contract.ts` — renders `input.metadata.story_contract` (title, tone, POV, tense, content_intensity, language_register, prose_preferences) as author-facing prose, NOT YAML.
- `section-3-current-situation.ts` — assembles a natural-language summary from `input.records` filtered by `importance: high | central` plus refs to involved cast; appends `input.recent_segment_last_paragraph` only when non-null (per SPEC-102 §Scope item 3 §3 "When no segments yet exist... the recent-segment fallback paragraph is omitted and §3 assembles only from author-pinned records").
- `section-4-manual-moment-directive.ts` — returns `input.moment_directive` verbatim.
- `section-5-required-beat-cluster.ts` — emits the SPEC-102 §Scope item 3 §5 fixed string parameterized by `input.metadata.prompt_policy.default_beat_count` (default `2-5` when null/empty).
- `section-6-optional-beat-template-guidance.ts` — emits `input.included_template_body` when non-null; emits the literal text `(none selected)` otherwise. Section is always present.
- `section-7-cast-and-voice.ts` — for each cast id in `input.cast`, invokes `getTranslator("cast")` to render the 9-field profile.
- `section-8-emotional-and-relationship-state.ts` — for each active `memo-*` / `mrel-*` record relevant to involved cast, invokes the per-class translator.
- `section-9-current-intentions-and-plans.ts` — for each active `mint-*` / `mplan-*` record for involved cast, invokes the per-class translator.
- `section-10-beliefs-secrets-questions.ts` — for each active `mbel-*` / `msecret-*` / `mq-*` record, invokes the per-class translator; the secrets and questions translators carry reveal-permission language inferred from `audience_visibility` and `must_not_resolve_unless`.
- `section-11-physical-continuity.ts` — assembles location (`mloc-*`), cast `body_and_presence` blocks, objects (`mobj-*`), and active facts (`mfact-*`) via per-class translators.
- `section-12-forbidden-inventions-and-reveals.ts` — assembles from `secret.forbidden_reveal_tags`, `prose_constraints.prose_must_not_imply`, `prose_constraints.forbidden_inventions`, and pinned cast member's prose constraints. Each constraint emitted as a `- Do not let the prose reveal/invent: <X>` line.
- `section-13-style-and-prose-craft.ts` — returns `input.prose_craft_contract_body` verbatim.
- `section-14-stop-rule.ts` — emits the SPEC-102 §Scope item 3 §14 fixed string.
- `section-15-output-instruction.ts` — emits the SPEC-102 §Scope item 3 §15 fixed string (including the narrative-structure language ban: no "page", "scene", "act", "arc", "midpoint", "climax").

### 2. Create `sections/index.ts` barrel

Export `assembleSections(input: SectionEmitterInput): string`. The barrel:
1. Calls each of the 15 emitters in fixed order.
2. Wraps each body with the heading `## <N>. <Section Name>\n\n`.
3. Joins sections with a blank line separator.
4. Returns the complete Markdown document.

### 3. Tests

`test/prompt-sections.test.ts` covers:
- Fixture compose → 15 `## N.` headings in order N=1..15.
- §1 byte-equality with `docs/prose-renderer-contract/content-policy.md` body.
- §13 byte-equality with `docs/manual-story-studio/prose-craft-contract.md` body.
- §6 present with `(none selected)` when no template; present with template body when template given.
- §5 parameterized — fixture with `default_beat_count: "3"` produces "Render only the next 3 beats"; default fixture produces "Render only the next 2-5 beats".
- §15 contains the narrative-structure language ban substring.

## Files to Touch

- `tools/manual-story-studio/src/prompt/sections/section-1-content-policy.ts` (new)
- `tools/manual-story-studio/src/prompt/sections/section-2-story-contract.ts` (new)
- `tools/manual-story-studio/src/prompt/sections/section-3-current-situation.ts` (new)
- `tools/manual-story-studio/src/prompt/sections/section-4-manual-moment-directive.ts` (new)
- `tools/manual-story-studio/src/prompt/sections/section-5-required-beat-cluster.ts` (new)
- `tools/manual-story-studio/src/prompt/sections/section-6-optional-beat-template-guidance.ts` (new)
- `tools/manual-story-studio/src/prompt/sections/section-7-cast-and-voice.ts` (new)
- `tools/manual-story-studio/src/prompt/sections/section-8-emotional-and-relationship-state.ts` (new)
- `tools/manual-story-studio/src/prompt/sections/section-9-current-intentions-and-plans.ts` (new)
- `tools/manual-story-studio/src/prompt/sections/section-10-beliefs-secrets-questions.ts` (new)
- `tools/manual-story-studio/src/prompt/sections/section-11-physical-continuity.ts` (new)
- `tools/manual-story-studio/src/prompt/sections/section-12-forbidden-inventions-and-reveals.ts` (new)
- `tools/manual-story-studio/src/prompt/sections/section-13-style-and-prose-craft.ts` (new)
- `tools/manual-story-studio/src/prompt/sections/section-14-stop-rule.ts` (new)
- `tools/manual-story-studio/src/prompt/sections/section-15-output-instruction.ts` (new)
- `tools/manual-story-studio/src/prompt/sections/index.ts` (new) — barrel + `assembleSections`
- `tools/manual-story-studio/test/prompt-sections.test.ts` (new)

## Out of Scope

- Loading content-policy / prose-craft-contract from disk — ticket 007 compose pipeline does the I/O; emitters consume `content_policy_body` / `prose_craft_contract_body` from input.
- Computing `recent_segment_last_paragraph` — ticket 007 reads the most recent segment (or null pre-SPEC-103) and hands the paragraph to §3 via input.
- Running prompt lint — ticket 008 is a separate post-assembly pass.
- Writing the assembled prompt to disk — ticket 009 owns the write layer.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` passes — `prompt-sections.test.ts` included.
2. Fixture assembled prompt contains exactly 15 `## N.` headings in order N=1..15 (regex `^## ([0-9]+)\. ` capture group → strict increasing sequence 1..15).
3. §1 body equals `docs/prose-renderer-contract/content-policy.md` body byte-for-byte (SPEC-102 §Acceptance criterion 2).
4. §13 body equals `docs/manual-story-studio/prose-craft-contract.md` body byte-for-byte (SPEC-102 §Acceptance criterion 6).
5. §6 fixture-test variants — `(none selected)` body when no template; template body when template given.
6. §5 fixture-test variants — `default_beat_count: null` → "2-5 beats"; `default_beat_count: "3"` → "3 beats".

### Invariants

1. The 15-section structure is fixed in order, heading, and count. No emitter may produce its own `## ` heading; the barrel owns heading injection.
2. §1 and §13 are byte-equal to their canonical sources read at compose time — never bundled, never edited.
3. §6 is always present; its body may be `(none selected)` but the heading remains.
4. §15 contains the narrative-structure language ban (forbids "page", "scene", "act", "arc", "midpoint", "climax" in LLM output) per FOUNDATIONS §Story Bundles §5c.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/prompt-sections.test.ts` — assembled prompt structural checks (15 headings in order, §1 / §13 byte-equality, §6 / §5 variants, §15 ban string).

### Commands

1. `cd tools/manual-story-studio && npm test`
