# Phase 8-9: Root Page Plan and First Choices

Covers original §Phase 8 (Author the root page plan) and §Phase 9 (Generate first choices).

## Phase 8: Author the root page plan

Draft `worlds/<world_slug>/stories/<story_slug>/pages-prose-plans/PG-1.md` per shared contract §8 — the 19 numbered sections plus optional per-page §9b / §9c / §10b sections when relevant active story-state records exist.

The drafted plan bytes are the future direct-write artifact. Keep the complete UTF-8 bytes stable in working memory AND persist them to a temporary path (e.g., `/tmp/PG-1.md.draft`) at the validation phase so the `compute-pg-hashes.js` CLI can hash them via `--plan <temp-path>`. Do NOT write to the bundle path `pages-prose-plans/PG-1.md` until the post-patch-success write order confirms submission; the catch-22 between this byte-stability requirement and the post-success bundle-write order is bridged by the `/tmp/` scratch file.

**§2 (Content Policy), §3 (Prose Craft Contract), and §19 (Render-Time Instruction Template) are inlined verbatim from `docs/prose-renderer-contract/content-policy.md`, `docs/prose-renderer-contract/prose-craft-contract.md`, and `docs/prose-renderer-contract/render-time-instruction.md` respectively.** This is operationally load-bearing — the external prose renderer has no cross-plan state, so every page render is cold context. Compacting these sections would defeat the self-contained-plan contract.

Before computing the root `plan_hash`, run `node tools/world-mcp/dist/src/cli/inline-canonical-prose-sections.js --plan <temp-plan-path>` against the draft plan bytes to splice the canonical §2 / §3 / §19 bodies into the same temp file that `compute-pg-hashes.js --plan` will read. This prevents copy-paste drift from prior pages or examples; the byte-equality validator remains the enforcement surface.

Bootstrap-specific section content: §1 inlines a short `STORY_KERNEL.md` excerpt; §4 inlines world-canon excerpts directly relevant to the opening (faction stances, taboos, hazards constraining opening choices); §5 enumerates active cast and entity statuses; §6 names the initial location and the grounded affordances available there; §7 dramatizes the `story_start` event without inventing structural facts; §8 names the required opening beats (typically: establish situation, surface the pressure, set up the first hinge); §9 names the load-bearing relationships and beliefs at play; optional §9b renders active `STPLAN` records and this page's initial state-relation posture; optional §9c renders active `STEMO` records and affective-transition constraints; §10 lists open obligations / consequences / threads with `urgency`; optional §10b renders active CLK / STSEC / STQ state when relevant; §11 names forbidden mystery resolutions; §12 names the intended stopping point (the first commitment hinge); §13 previews the emitted choices; §16a emits STCHAR-derived character authority packets for every viewpoint character, speaker, major actor, direct target, emotionally salient character, or any character whose behavior, voice, appraisal, relationship conduct, perception, embodiment, or agency materially shapes the root page. For an active offstage character whose activity causally bears on the root page, emit the shared-contract reduced `offstage_causal` packet; for an offstage character with no causal bearing on this page, omit the packet as background-only without asking prose to infer persona from an id.

**§7 state-delta body translation.** The §7 body is prose direction for the external renderer, not an engine ledger dump. Write it as what changed in the opening situation or actor interior this page. Engine state-delta arrays, first-introduction triggers, state-relation verbs, non-propagation facts, and record-id-dense rationale move to §15 frontmatter and the underlying `SE` record, where validators can still read them. Do not emit `state_delta.create`, `state_delta.supersede`, `state_delta.close`, `record_introductions[]`, `state_relations[]`, `non_propagation_facts[]`, or raw YAML fragments in the renderer-facing §7 body.

Use this shape when the opening creates renderable state:

```markdown
What changed in <actor>'s interior this page:
- <The actor's initial intent, appraisal, or pressure in story terms.>
- <The observation, belief, obligation, clock, or consequence that becomes visible as behavior or situation.>
- <What the prose may show or must not imply because of witness limits, secrecy, or non-propagation.>
```

For `story_start`, translate genesis state into the scene's opening pressures and renderable constraints. If there is no turn driver yet, omit §7a; do not invent a driver to satisfy the template.

**§7a turn-driver and active-pressure prose.** When §7a exists, keep the fixed driver rows and the `| Record | Disposition | Reason / expiry |` table shape from the shared contract. The `active_pressure_handling_discipline` validator still owns the closed `selected | deferred | rejected` disposition vocabulary and the `Reason / expiry` connective / `PG-<integer>` requirement. Inside that shape, prefer prose anchors for the reason rather than bare record-id rationale where possible.

**§9 / §9b / §9c / §10b body translation.** These sections are renderer-facing prose direction, not a second copy of the state ledger. Record ids, raw state-relation verbs, numeric clock fields, and enum-style pressure labels stay in §15 frontmatter or in §16a `Current-state grounding records:` when they ground a character packet.

Use §9 to state relationship and belief context in human terms:

```markdown
Jon and Ane have no prior shared history; she has still not noticed him. Jon privately believes she has been on the bench for hours, and Ane believes she is alone in the park.
```

When §9b is present, preserve the shared-contract heading and labels (`STPLAN-<integer> — Holder: STENT-<integer>`, `Objective:`, `Root intention:`, `Current step:`, `Belief basis:`, `Resources/leverage:`, `Blockers:`, `Fallbacks currently available:`, `This page's plan movement:`, `Prose must show:`, `Prose must not imply:`). Write the contents as plan pressure the prose can render: what an actor is trying now, why they think it can work, what blocks them, and how this page advances, tests, revises, fulfills, abandons, or ignores the plan.

When §9c is present, preserve the shared-contract heading and labels (`STEMO-<integer> — Holder: STENT-<integer>`, `Affect (kind + intensity):`, `Trigger event:`, `Appraisal basis:`, `Behavioral pressure:`, `Transition this page (if any):`, `Prose must render:`, `Prose must avoid:`). Translate enum pressure into behavior prose: "the actor pulls toward staying out of notice and toward physical stillness" instead of `conceal, freeze`.

When §10b is present, describe clocks, secrets, and story questions as renderable pressure or setup/payoff movement. Numeric details such as clock `value` / `max`, thresholds, salience, hidden status, holder lists, clue-carrier counts, and answer/payoff record links remain in §15. The body should say, for example, "the pressure has reached the point where the next noticeable shift is a third party entering the scene's privacy," not `CLK-1 value: 2/4, salience: high, threshold at 3`.

Root §16a is the first page-local projection of STCHAR + active opening state. It may mention current fear, bruises, exhaustion, location, tactical blockage, current distrust, page-specific voice fracture, or any other current-state modulation only when grounded in active `STEMO`, `BEL`, `STPLAN`, `STSTAT`, `STOBJ`, `SREL`, `THR`, `OBL`, `CNSQ`, `CLK`, `STSEC`, `STQ`, `SE`, or `PG` records. Do not repair missing state by copying temporal prose into STCHAR. Create the state record or omit the claim.

Each full present-character §16a packet cites the bound `STENT-*` / `STCHAR-*` / display name, the required-because reason, stable STCHAR seed used, `Current-state grounding records:` (`none; stable STCHAR authority only` when no active current-state record is needed), page-local projection, prose must-show / must-not-imply, and anti-generic warnings. A reduced `offstage_causal` packet still cites the bound `STENT-*` / `STCHAR-*` / display name, `Required because: offstage_causal`, story-facing identity, relevant appraisal rules, relevant pressure behavior when applicable, `Offstage causal relevance:`, prose must-not-imply, and anti-generic warnings; it omits the voice/dialogue authority and on-page rendering lines because the character is not rendered on the page. Do not cite world `CHAR-*` as runtime voice authority in the page plan.

No word-count target anywhere in the plan. Engine jargon (record ids, gate names) is confined to §15 frontmatter and the §16a `Current-state grounding records:` field; renderer-facing bodies translate it into prose direction.

## Phase 9: Generate first choices

When emitting first-page CHCs, follow §11a "Character-Fit Selection Contract" in `.claude/skills/_shared-templates/story-state-contract.md`. Each CHC grounds in at least one active record class — stable STCHAR is lawful but bare-STCHAR grounding is usually weak; pair STCHAR with one or more of `STEMO` / `STPLAN` / `BEL` / `SREL` / `OBL` / `CLK` / `STSEC` / `STQ` / `DA` to give the choice operational specificity. Bootstrap's "first three options that differ only by verb" failure mode is exactly what §11a's CHC quality discipline targets.

Emit 3-5 `CHC` records representing different commitments — not variants of the same wording. Sample different axes: action vs restraint, truth vs deception, intimacy vs distance, risk vs safety, public vs private, duty vs desire (at authorial discretion within the opening's plausibility envelope).

Do not emit a placeholder "write-in" CHC. Bootstrap takes no manual-action input — it materializes PG-1 from scratch. Downstream `branching-story-turn-cycle` exposes player write-in as a first-class skill input (`manual_action_text` + `action_source_mode: resolve_write_in`, parsed against `STORY_KERNEL.md` `## Player Agency Contract`) that is orthogonal to `chosen_choice_id` and the CHC pool. A placeholder CHC saying "the player supplies the action" is structurally unselectable at turn-cycle (a write-in invocation bypasses the CHC pool entirely) and pollutes PG-1's choice pool with a non-actionable record. Emit only concrete, selectable choices materially grounded in active records.

Each `CHC` carries the shared contract §4.5.12 shape: `id`, `story_id`, `created_at_page`, `supersedes`, `surface_label`, `player_visible_intent`, `target_or_action_families` (a non-empty list using the §4.4a `action_family` taxonomy), `likely_state_pressure`, `grounded_in`, and optional `success_policy` when a later `SE.outcome_route` resolves the choice through `attempt`. CHCs do not name a specific SLT; selection happens at turn-cycle resolution time against the live pool filtered by `grounded_in.records`, `target_or_action_families`, and parent PG active records.

Populate `grounded_in.records` with active record ids from the drafted `PG-1.state_snapshot.active_records`; the active-record union allowed by `story-choice.schema.json` is the authoritative list. When the choice directly exposes one or more visible affordances, also populate `grounded_in.affordance_ordinals` with the corresponding `PG-1.state_snapshot.visible_affordances[].ordinal` values. Do not use `target_or_action_families` alone as grounding evidence.
