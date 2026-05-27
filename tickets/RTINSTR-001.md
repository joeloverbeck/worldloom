# RTINSTR-001: Realign render-time-instruction.md with current schema and plan structure

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `docs/prose-renderer-contract/render-time-instruction.md` canonical-source rewrite; migration of existing `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1..PG-6.md` §19 sections via `tools/world-mcp/dist/src/cli/inline-canonical-prose-sections.js`.
**Deps**: None

## Problem

`docs/prose-renderer-contract/render-time-instruction.md` is the canonical source for §19 inlined byte-for-byte into every page-prose-plan authored by `branching-story-bootstrap` (Phase 8) and `branching-story-turn-cycle` (Phase 7). It is positioned at the end of every plan and operationally weighted as the final instruction the external prose renderer reads. Its body references six field-shaped names that either tension FOUNDATIONS §Story Bundles §5a or are phantom / mis-shaped against the actual plan body the renderer consumes:

1. `stop_policy.normal_exits[]` — forbidden by FOUNDATIONS §Story Bundles §5a as a legacy v2 SLT schema field; the greenfield SLT schema has no `stop_policy` field (FOUNDATIONS line 718). Substance for the renderer lives in plan §12 Stopping Point + §8 Required Beats.
2. `content_intensity_baseline` — phantom field name. The actual field is `content_intensity` (`tame | mature | explicit`) per `.claude/skills/branching-story-bootstrap/SKILL.md:114` and `.../references/phase-1-2-state-seed-and-stchar-distillation.md:14`. Surfaces in the plan as `Content intensity: <value>` in §1 Story Kernel Excerpt and §15 Plan Frontmatter.
3. `prohibited_actions` — phantom field. Appears nowhere in the codebase except in this file. Substance is distributed across plan §16a STCHAR packets ("Prose must not imply / Anti-generic warnings") and §18 Anti-Pathology Checklist.
4. `execution_envelope` — forbidden by FOUNDATIONS §Story Bundles §5a as a legacy v2 scene-commitment-arc field; deliberately rejected in the schema rebuild recorded at `docs/triage/2026-05-07-scene-commitment-arc-triage.md`. No analog in current schema.
5. `forbidden_resolutions` — field-shape mismatch. The actual schema field is `mystery_policy.forbidden_resolutions: [M-<integer>]` on `SLT` records (`.claude/skills/_shared-templates/story-record-schemas.md:353`). In the plan body, the load-bearing content for the renderer lives in §11 Forbidden Mystery Resolutions (prose paragraphs per forbidden M-id); §15 Plan Frontmatter carries only the bare M-id list. The instruction currently points the renderer at "the plan's forbidden_resolutions list", which does not exist as a top-level structure in the plan body.
6. `mysteries_in_play[]` — field is real in `STORY_KERNEL.md` frontmatter (per `.claude/skills/branching-story-bootstrap/references/story-kernel-contract.md:20`) and in the context-packet contract (`tools/world-mcp/src/context-packet/shared.ts:311`), but is **not** in the per-page plan body. The external renderer reads only the plan; this is a dangling cross-artifact pointer.

Additionally, the body restates Prose Craft Contract Rules 1, 7, and 11 in paragraphs that duplicate substance already inlined verbatim into the same plan at §3. The redundant restatements add bytes without adding instruction.

The downstream consequence: every newly-authored page plan ships §19 vocabulary that the renderer cannot resolve against the plan body it is given. The risk surface is renderer confusion when the LLM searches for fields the plan does not contain, and structural drift between FOUNDATIONS §Story Bundles §5a (forbidden legacy vocabulary) and the canonical surface inlined into every story-bundle page plan.

## Assumption Reassessment (2026-05-27)

1. `docs/prose-renderer-contract/render-time-instruction.md` is the canonical source for page-plan §19 inlined by `branching-story-bootstrap` Phase 8 and `branching-story-turn-cycle` Phase 7 (confirmed: file header line 3; `docs/prose-renderer-contract/README.md` lines 7–9).
2. FOUNDATIONS §Story Bundles §5a (line 652) explicitly forbids `arc_contract`, `dramatic_unit`, `execution_envelope`, nested `effect_model`, `stop_policy`, `record_version` discriminators above `1`, and `shape:` discriminators in SLT records. FOUNDATIONS line 718 reinforces: "The greenfield SLT schema (per `.claude/skills/_shared-templates/story-state-contract.md` §4.4) has no `stop_policy` field; no engine-side `max_words` ceiling exists anywhere in the story-pipeline surface."
3. **Shared boundary under audit**: the byte-equality contract between `docs/prose-renderer-contract/render-time-instruction.md` and §19 of every `worlds/<slug>/stories/<slug>/pages-prose-plans/PG-<integer>.md` enforced by `page_plan_verbatim_section_integrity` (`tools/validators/src/structural/page-plan-verbatim-section-integrity.ts`). The validator runs in `full-world`, `pre-apply` (on `create_pg_record`), and `incremental` (on touched files) modes — any canonical-source change breaks byte-equality with existing on-disk plans and must be paired with a plan-migration pass via the existing CLI at `tools/world-mcp/dist/src/cli/inline-canonical-prose-sections.js` (per `tools/world-mcp/README.md:94`).
4. **FOUNDATIONS principle restatement under audit**: FOUNDATIONS §Story Bundles §5a (Commitment Blocks Are Causal Moves) — SLT records and any surface referencing them must not carry the forbidden v2 vocabulary listed in §5a. The page-plan §19 surface inlined into every page plan currently violates this principle by inlining `stop_policy.normal_exits[]` and `execution_envelope` references.
5. **Mystery firewall preserved**: this ticket does not weaken FOUNDATIONS §Rule 7 (Preserve Mystery Deliberately). Plan §11 Forbidden Mystery Resolutions contains the prose content the renderer needs (verified in PG-6 §11 — full paragraphs per forbidden M-id); `branching-story-prose-attach` Phase 3 check 3 (`forbidden_mystery_resolution`) reads plan §11 `forbidden_resolutions[]` and / or retrieves firewall content via `mcp__worldloom__get_firewall_content` (`branching-story-prose-attach/SKILL.md:197`). The render-time-instruction rewrite re-points the renderer's attention to §11 by section number; it neither removes the firewall surface nor changes Phase 3 validator behavior.
6. **No schema extension**: this ticket changes prose in one canonical-source file plus the inlined §19 of six existing page plans (PG-1..PG-6 in `worlds/erotica-world/stories/red-bunny/pages-prose-plans/`). No record schema, validator interface, or hook surface is added, removed, or altered.
7. **Blast radius scan** for the forbidden field references the rewrite removes (confirmed via grep across `tools/`, `.claude/skills/`, `docs/`):
   - `stop_policy` appears in legacy contexts: tests at `tools/validators/.../spec85-multi-actor-collision-confrontation.test.ts` (asserts the field is **forbidden**, not allowed); historical design plan `docs/plans/2026-05-10-prose-rendering-out-of-skill-design.md` (pre-schema-rebuild); FOUNDATIONS §5a forbid clause; commitment-block-authoring forbid clauses. None require update — the rewrite aligns the canonical source with the prevailing forbid stance.
   - `execution_envelope` — same shape; appears only in forbid clauses and historical design plans. None require update.
   - `content_intensity_baseline` — appears only in `render-time-instruction.md`; not referenced elsewhere. No blast radius beyond the rewrite itself.
   - `prohibited_actions` — appears only in `render-time-instruction.md`. No blast radius.
   - `mysteries_in_play[]` — real field in STORY_KERNEL.md / context-packet shape; the rewrite removes the **cross-artifact reference** from the renderer-facing instruction but does not touch the field itself anywhere it legitimately exists.
   - `forbidden_resolutions` — real field at `SLT.mystery_policy.forbidden_resolutions` and in plan §11 / §15 frontmatter shapes. The rewrite changes the renderer-facing wording to point at §11 by section number; it does not rename or remove the field.
8. **Adjacent contradiction discovered during reassessment**: `docs/plans/2026-05-10-prose-rendering-out-of-skill-design.md` is the pre-schema-rebuild design plan that introduced this vocabulary. It is historical and dated 2026-05-10, predating the 2026-05-13 schema rebuild (per `spec-to-tickets/SKILL.md` SPEC-23 worked precedent). It is not edited by this ticket — historical design plans are not maintained against current schema. Classified as: separate historical artifact, no action required by this ticket.

## Architecture Check

1. **Why this approach is cleaner than alternatives.** The rewrite re-grounds §19 in the **section structure** of the plan body the renderer actually receives (§4 POV, §3 Prose Craft Contract, §11 Forbidden Mystery Resolutions, §12 Stopping Point, §15 Plan Frontmatter, §16a STCHAR packets, §18 Anti-Pathology Checklist) rather than schema field names that exist at the record level but not in the plan body. Section-number anchoring is robust: as long as the plan-authoring skills produce the documented 19-section structure (per `.claude/skills/_shared-templates/story-state-contract.md` §8), the renderer's instruction resolves to existing content. Schema-field anchoring is fragile: it depends on the plan body containing structured fields that the current plan body does not contain, and it tensions FOUNDATIONS §5a when the field names are forbidden v2 vocabulary.
2. **No backwards-compatibility aliasing/shims introduced.** Existing PG-1..PG-6 plans are rewritten in place via the existing CLI to maintain byte-equality with the new canonical source. No alias paths, no legacy-vocabulary preservation, no "old-name accepted" fallback in the validator. The forbidden-by-FOUNDATIONS vocabulary is removed cleanly.

## Verification Layers

1. **FOUNDATIONS alignment** — §Story Bundles §5a (Commitment Blocks Are Causal Moves) and §Story Bundles §9 (Prose Length Discipline At Story Scope) confirmed against the rewritten canonical source: no occurrence of `stop_policy`, `execution_envelope`, `arc_contract`, `dramatic_unit`, `effect_model`, `record_version > 1`, or `shape:` discriminator vocabulary in §19; no word-count quotas added.
2. **Codebase grep-proof** — `grep -rn "stop_policy\|content_intensity_baseline\|prohibited_actions\|execution_envelope\|mysteries_in_play" docs/prose-renderer-contract/render-time-instruction.md` returns zero matches after the rewrite. `grep -rn "forbidden_resolutions" docs/prose-renderer-contract/render-time-instruction.md` returns zero matches OR matches only the renumbered section-anchored reference, depending on the chosen rewrite shape.
3. **Schema validation** — `page_plan_verbatim_section_integrity` passes against PG-1..PG-6 in red-bunny after the CLI-driven migration. Validator binary: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js --world-root /home/joeloverbeck/projects/worldloom <plan-path>` (per `tools/world-mcp/README.md:75`).
4. **Skill dry-run** — `branching-story-prose-attach` Phase 3 check 3 (`forbidden_mystery_resolution`) verified against an existing PG-6 prose receipt (or a representative test fixture) to confirm the firewall check still resolves §11 content correctly. The check reads plan §11 `forbidden_resolutions[]` or retrieves via `mcp__worldloom__get_firewall_content`; section-anchored wording in the new render-time-instruction does not alter the validator's read surface.
5. **Manual review** — confirm the rewritten §19 reads as a coherent end-of-plan instruction: each paragraph anchors to a section the plan actually contains; no forbidden-by-FOUNDATIONS vocabulary; the Prose-Craft-Contract restatement (items 1, 7, 11) is tightened to brief deferrals to §3 rather than full restatements; output-format constraints (continuous prose only, no markdown headers, no engine vocabulary) remain explicit.

## What to Change

### 1. Rewrite `docs/prose-renderer-contract/render-time-instruction.md`

Rewrite the INSTRUCTION block (lines 9–60 of the current file, inside the code fence; framing prose at lines 1–7 unchanged) to:

- Remove all references to forbidden v2 SLT vocabulary: `stop_policy.normal_exits[]`, `execution_envelope`.
- Remove all references to phantom fields: `content_intensity_baseline`, `prohibited_actions`, `mysteries_in_play[]`.
- Re-anchor the arc-close instruction to plan §12 Stopping Point + §8 Required Beats. Wording must remain renderer-facing prose (not engine vocabulary); reference §12 / §8 by section number so the renderer resolves them in the same plan body.
- Re-anchor the content-intensity instruction to "Content intensity declared in §15 Plan Frontmatter" (or equivalent — verify the actual plan-rendering uses §15 frontmatter or §1 inline; current PG-1..PG-6 carry it in both).
- Replace the `prohibited_actions` / `execution_envelope` paragraph with a brief reference to "the Prose must not imply / Anti-generic warnings declared in §16a STCHAR packets" and "the Anti-Pathology Checklist at §18". These are the substantive locations of action-prohibition content in the actual plan body.
- Re-anchor the forbidden-mystery instruction to plan §11 Forbidden Mystery Resolutions. The renderer must not resolve any mystery declared forbidden in §11; the prose content per forbidden M-id lives in that section.
- Tighten the three Prose-Craft-restating paragraphs (POV / length / modality) to brief reminders that defer to §3 (Prose Craft Contract Rules 1, 7, 11) rather than restating the rules in full. Keep the substantively unique content: root-vs-subsequent-page rendering distinction, output-format constraints (continuous prose only, no markdown headers, no engine vocabulary, no record-id vocabulary).

The framing prose at the top of the file (lines 1–7) — explaining what the file is and the "do not edit lightly" caveat — does not change. The validator's `stripFramingHeader` step removes lines above the `---` separator before byte comparison (per `tools/validators/src/structural/page-plan-verbatim-section-integrity.ts:10`), so framing edits do not affect existing-plan validity.

### 2. Migrate existing PG-1..PG-6 plans in `worlds/erotica-world/stories/red-bunny/pages-prose-plans/`

Run the existing rewrite CLI to replace §19 in each existing plan with the new canonical content:

```
node tools/world-mcp/dist/src/cli/inline-canonical-prose-sections.js \
  --world-root /home/joeloverbeck/projects/worldloom \
  worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md
```

Repeat for PG-2.md, PG-3.md, PG-4.md, PG-5.md, PG-6.md. The CLI defaults to in-place rewrite and replaces only the existing `## 2. ...`, `## 3. ...`, and `## 19. ...` sections (per `tools/world-mcp/README.md:94`). In this ticket only §19 changes substantively (§2 and §3 are not touched in this scope); the CLI replaces all three but §2 / §3 are idempotent re-writes since their canonical sources are unchanged.

After migration, re-run `page_plan_verbatim_section_integrity` against each migrated plan to confirm byte-equality. The rendered prose at `pages-prose/PG-<integer>.md` is unaffected — only the plan body's §19 is rewritten.

## Files to Touch

- `docs/prose-renderer-contract/render-time-instruction.md` (modify)
- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md` (modify — §19 only via CLI)
- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-2.md` (modify — §19 only via CLI)
- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-3.md` (modify — §19 only via CLI)
- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-4.md` (modify — §19 only via CLI)
- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-5.md` (modify — §19 only via CLI)
- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-6.md` (modify — §19 only via CLI)

## Out of Scope

- Editing already-rendered prose at `worlds/erotica-world/stories/red-bunny/pages-prose/PG-<integer>.md`. Rendered prose is not re-rendered; this ticket changes only the instruction the next render reads.
- Editing `docs/plans/2026-05-10-prose-rendering-out-of-skill-design.md` or other historical design plans that reference the legacy vocabulary. Historical design plans are not maintained against current schema.
- Adding new fields to any record schema. The substance for each removed reference already exists in the current plan body at named sections.
- Changing the `branching-story-bootstrap` or `branching-story-turn-cycle` skill prose. The skills already inline `render-time-instruction.md` byte-for-byte; once the canonical source is updated, newly-authored plans pick up the new §19 automatically.
- Changing the `page_plan_verbatim_section_integrity` validator behavior or the `branching-story-prose-attach` Phase 3 check 3 implementation. Both continue to operate against the same surfaces; only the canonical source bytes change.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "stop_policy|content_intensity_baseline|prohibited_actions|execution_envelope|mysteries_in_play" docs/prose-renderer-contract/render-time-instruction.md` returns zero matches.
2. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js --world-root /home/joeloverbeck/projects/worldloom <plan-path>` returns no `page_plan_verbatim_section_integrity` verdicts for each of PG-1..PG-6 after CLI-driven migration.
3. `cd tools/validators && npm test -- structural/page-plan-verbatim-section-integrity` passes (existing tests at `tools/validators/tests/structural/page-plan-verbatim-section-integrity.test.ts`).

### Invariants

1. `docs/prose-renderer-contract/render-time-instruction.md` contains no field references that FOUNDATIONS §Story Bundles §5a forbids (`stop_policy`, `execution_envelope`, `arc_contract`, `dramatic_unit`, `effect_model`, `record_version > 1`, `shape:`).
2. Every paragraph in the rewritten §19 that directs the renderer to a piece of plan content references either a Prose Craft Contract rule by number (which exists at §3) or a plan section by section number (which exists in the documented 19-section structure per `.claude/skills/_shared-templates/story-state-contract.md` §8). No reference points at a schema field name that does not appear in the plan body.
3. `page_plan_verbatim_section_integrity` passes against all 6 migrated plans (`full-world` audit mode).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.` The existing `page_plan_verbatim_section_integrity` test suite at `tools/validators/tests/structural/page-plan-verbatim-section-integrity.test.ts` already covers byte-equality drift; no new test cases are needed.

### Commands

1. **Targeted (grep) — confirm forbidden vocabulary is removed:**
   `grep -nE "stop_policy|content_intensity_baseline|prohibited_actions|execution_envelope|mysteries_in_play" docs/prose-renderer-contract/render-time-instruction.md`
2. **Targeted (validator unit tests):**
   `cd tools/validators && npm test -- structural/page-plan-verbatim-section-integrity`
3. **Targeted (per-plan byte-equality):**
   `node tools/world-mcp/dist/src/cli/validate-patch-plan.js --world-root /home/joeloverbeck/projects/worldloom worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md` (repeat for PG-2..PG-6).
4. **Full-pipeline (validator suite):**
   `cd tools/validators && npm test` and `cd tools/world-mcp && npm test`.
5. **Manual review (renderer instruction coherence):** read the rewritten §19 in `docs/prose-renderer-contract/render-time-instruction.md` end-to-end; confirm every directive resolves against the documented plan section structure; confirm no engine vocabulary or forbidden v2 SLT vocabulary remains.
