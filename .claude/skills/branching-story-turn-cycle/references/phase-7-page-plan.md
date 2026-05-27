# Phase 7: Author the page plan

Write `worlds/<world_slug>/stories/<story_slug>/pages-prose-plans/PG-<integer>.md` per shared contract §8 — 19 sections.

The drafted plan bytes are the future direct-write artifact. Keep the complete UTF-8 bytes stable in working memory AND persist them to a temporary path (e.g., `/tmp/PG-<integer>.md.draft`) at Phase 9 step 2 so the `compute-pg-hashes.js` CLI can hash them via `--plan <temp-path>`. Do NOT write to the bundle path `pages-prose-plans/PG-<integer>.md` until Phase 10 step 6 confirms patch success; the catch-22 between this byte-stability requirement and the post-success bundle-write order is bridged by the `/tmp/` scratch file.

**§2 (Content Policy), §3 (Prose Craft Contract), and §19 (Render-Time Instruction Template) are inlined verbatim from `docs/prose-renderer-contract/content-policy.md`, `docs/prose-renderer-contract/prose-craft-contract.md`, and `docs/prose-renderer-contract/render-time-instruction.md` respectively.** Operationally load-bearing — external prose renderer has no cross-plan state; every page render is cold context. Compacting these sections would defeat the self-contained-plan contract.

Turn-cycle-specific section content: §1 inlines a short `STORY_KERNEL.md` excerpt; §4 inlines world-canon excerpts directly relevant to this turn's action; §5 enumerates active cast and entity statuses **as of this turn** (including any deaths, captures, or status changes from Phase 3); §6 names current location and grounded affordances; §7 dramatizes the resolved event as prose-facing scene, pressure, outcome, and state-change direction; §8 names the required beats from the selected or JIT commitment block; §9 names load-bearing relationships and beliefs AFTER Phase 4 updates; §10 lists open `OBL` / `CNSQ` / `THR` with `urgency` so debts that must be honored are visible to the prose renderer; §10b optionally lists active CLK / STSEC / STQ records after Phase 4; §11 names forbidden mystery resolutions; §12 names the intended stopping point; §13 previews emitted choices (or marks terminal); §14 (optional) carries a structured continuity packet derived from parent rendered prose when `pages-prose/PG-<parent>.md` exists on disk.

**§7 state-delta body translation.** The §7 body is the renderer-facing explanation of the selected event and state movement: what changed in the actor, scene, or pressure field this page. It may name the chosen CHC or write-in interpretation, `outcome_route`, `world_logic_rationale`, `resolution.player_visible_feedback`, and load-bearing record IDs needed to ground state movement, but it must not dump the engine ledger. Engine state-delta arrays, `record_introductions[]`, `state_relations[]`, `non_propagation_facts[]`, lifecycle bookkeeping, and raw field arrays move to §15 frontmatter and the underlying `SE` record.

Use a prose packet like:

```markdown
What changed in <actor>'s interior this page:
- <How the selected event narrows, redirects, or intensifies the actor's intent.>
- <What new belief, pressure, obligation, clock, consequence, or relationship fact becomes renderable.>
- <What the prose must show as behavior, perception, access limit, or outcome rather than as schema fields.>
```

For non-accept routes, render `resolution.player_visible_feedback` as the player-legible story consequence. For accept routes, render the selected event, route, rationale, and state delta as scene movement without a `resolution` block.

**§14 Recent prose continuity.** §14 is omitted when the parent rendered-prose file is absent. When `pages-prose/PG-<parent>.md` exists on disk, read it for continuity but do not inline it as a full verbatim dump. Instead, author this structured packet:

```markdown
## 14. Recent prose continuity

### Where the previous page ended
- <Several concise continuity bullets: what happened, where the cast is, what is held.>

### Facts to preserve
- <Object, position, body, relationship, or state facts the next page must honor.>

### Do not reuse these exact prior phrases, anchors, or metaphor stocks
- <Prior phrase, sensory anchor, image, or metaphor stock to avoid repeating.>

### Fresh anchor opportunities
- <Concrete sensory, material, behavioral, dialogue, or subtext opportunity for this page.>
```

Verbatim prior-prose quotation is allowed only when an exact line must be answered in a mid-dialogue continuation, a clue phrase carries legal or social weight, or the renderer must preserve a precise lie, promise, accusation, or question. If one of those triggers applies, quote only 1-3 lines and say which trigger justifies the quote. The cap applies only to quoted parent prose; it is not a length target for the page or for §14's own bullet lists.

**§7a Active-pressure disposition table — closed-set Reason / expiry form.** Every high-urgency active record on the parent `PG.state_snapshot` MUST appear in exactly one `| Record | Disposition | Reason / expiry |` row (per shared contract §7a). The `active_pressure_handling_discipline` validator enforces the cell shape:
- `disposition` is exactly one of `selected`, `deferred`, `rejected`. Any other token fails (`active_pressure_disposition_unknown`).
- For `deferred` rows, the `Reason / expiry` cell MUST contain either (a) a literal `PG-<integer>` reference (e.g., "remains active at PG-<N>", "expires after PG-<N>", "until PG-<N>") OR (b) at least one of the conditional connectives `after | before | if | once | until | when`. Freeform prose with neither (e.g., "continues to load on her", "remains active offstage") fails as `active_pressure_deferred_without_expiry`.
- For `rejected` rows, the `Reason / expiry` cell MUST be non-empty.

Recommended forms: `expires after PG-<N>`, `until PG-<N>`, `remains active at PG-<N+1>` (the new page itself), `once <condition>`, `if <condition>`, `when <condition>`. When the record genuinely stays active across the new page without a known horizon, prefer `remains active at PG-<N+1>` over freeform prose — naming the new page satisfies the rule and accurately states the state. Within the required cell shape, write the reason as prose-facing pressure or scene logic rather than bare record-id rationale where possible.

**§9 / §9b / §9c body translation.** These sections should tell the external renderer what relationship, knowledge, agency, and emotion mean in the scene. Do not make the body read like active-record inventory. Record IDs may appear when they disambiguate load-bearing state, while raw machine fields remain in §15 frontmatter or in §16a `Current-state grounding records:` when they ground character authority.

§9 should render active relationship and belief state as prose, for example:

```markdown
Jon and Ane have no prior shared history; she has still not noticed him. Jon privately believes she has been on the bench for hours, and Ane believes she is alone in the park.
```

When §9b is present, keep the shared-contract heading and labels for each active plan (`STPLAN-<integer> — Holder: STENT-<integer>`, `Objective:`, `Root intention:`, `Current step:`, `Belief basis:`, `Resources/leverage:`, `Blockers:`, `Fallbacks currently available:`, `This page's plan movement:`, `Prose must show:`, `Prose must not imply:`). Fill those labels with prose-facing content: what an actor is trying now, what leverage or obstacle matters, and how this page advances, tests, blocks, revises, fulfills, abandons, or ignores that plan. Do not expose `action_family`, `target_records`, or `SE.state_relations[]` as body wording.

When §9c is present, keep the shared-contract heading and labels for each active emotion (`STEMO-<integer> — Holder: STENT-<integer>`, `Affect (kind + intensity):`, `Trigger event:`, `Appraisal basis:`, `Behavioral pressure:`, `Transition this page (if any):`, `Prose must render:`, `Prose must avoid:`). Translate affect and pressure values into behavior and appraisal prose: "an extreme moral dread" and "the actor pulls toward staying out of notice and toward physical stillness," not bare enum strings such as `dread, extreme` or `conceal, freeze`.

§16a is mandatory when any viewpoint character, speaker, major actor, direct target, emotionally salient character, behavior-shaping character, or offstage-causal character is present. Per-character packets project stable STCHAR authority through active current state; they do not store current state inside STCHAR. For each such present character, include the shared-contract full packet: `STENT` / `STCHAR` / display name; multi-token `Required because:` using the SPEC-73 vocabulary; `Stable STCHAR seed used`; `Current-state grounding records:` naming active STEMO/BEL/STPLAN/SREL/STSTAT/STOBJ/STLOC/THR/OBL/CNSQ/CLK/STSEC/STQ/SE/PG ids when page-local modulation depends on them, or `none; stable STCHAR authority only`; `Page-local projection`; `Prose must-show`; `Prose must-not-imply`; and `Anti-generic warnings`.

For an active offstage character whose activity causally bears on this page, include the shared-contract reduced `offstage_causal` packet: `STENT` / `STCHAR` / display name; `Required because: offstage_causal`; `Stable STCHAR seed used`; `Current-state grounding records:` naming grounding records for the offstage causal projection, or `none; stable STCHAR authority only`; `Page-local projection`; `Offstage causal relevance:`; `Prose must-not-imply`; and `Anti-generic warnings`. Omit on-page voice/dialogue rendering lines for the reduced packet because the character is not rendered on the page. An offstage character with no causal bearing on this page may be omitted as background-only, but the omission must not ask prose to infer persona from an id. The packet carries human-renderable authority, not ids as shorthand.

Use the active STCHAR profile as stable authority. Use active story-state records for current state. Do not cite world `CHAR-*` as operational page-plan characterization authority. Do not imply that current state lives inside STCHAR. `STCHAR.source_char_id` may remain provenance inside STCHAR, but page plans consume STCHAR packets and story-local temporal state. §16a does not replace §5 entity status, §9 relationships/beliefs, §9b plans, §9c emotions, §16 cast material reality, or §17 style/register notes.

**§16a record-id token discipline (load-bearing).** Per shared contract §16a, any `PG-<integer>`, `SE-<integer>`, `STEMO-<integer>`, `BEL-<integer>`, `STPLAN-<integer>`, `SREL-<integer>`, `STSTAT-<integer>`, `STOBJ-<integer>`, `STLOC-<integer>`, `THR-<integer>`, `OBL-<integer>`, `CNSQ-<integer>`, `CLK-<integer>`, `STSEC-<integer>`, or `STQ-<integer>` token that appears inside a §16a packet — in any field OTHER than `Current-state grounding records:` — is treated by `page_plan_stchar_packet_integrity` as an operational current-state citation. The validator enforces three rules on those tokens:
- A `PG-<integer>` token is legal only when it is the current page's own id; cite the parent page or any earlier page as history through prose ("the prior observation beat", "the parent-page action", "the previous page's opener"), not by literal id.
- An `SE-<integer>` token is legal only when it is the current page's resolved event id (`PG.input.resolved_event_id`).
- Every other listed class id must be present in the new page's `state_snapshot.active_records.<class>`. A record superseded this turn (e.g., a STEMO-N that was replaced by STEMO-M) is no longer active and must NOT appear as a packet citation — name its successor instead, or remove the cite.

Common ways authors trip the rule: differential-discipline language like "unchanged from PG-3", "different from PG-3's anchors", "as PG-3", "Limits as PG-3"; carrying a prior page's grounding cite forward verbatim; referencing the just-superseded record (STEMO-N) when only its successor (STEMO-M) is active. Rewrite each such phrase in prose, drop the literal id, or replace it with the active successor id. The `Current-state grounding records:` field is the ONE exception — it is parsed as a comma-separated id list, never as prose.

Use §10b "Open Setups, Active Clocks, Hidden Secrets" only when at least one post-delta active CLK, STSEC, or STQ record is relevant to the page render. It is per-page computed from the current `PG.state_snapshot.active_records`, not inlined verbatim from the shared contract and not copied from a prior page.

- Active clocks: describe the clock as renderable pressure, horizon, and next noticeable shift. Keep current `value` / `max`, thresholds, salience, visibility, and tick effects in §15 frontmatter for validator readback.
- Hidden or revealed secrets: describe what the prose may show, what remains hidden, who may act differently because of the secret, and whether this page revealed or sharpened it. Keep status, holder / discoverer lists, and clue-carrier counts in §15.
- Open setups / story questions: describe the setup or question as a story pressure, visible affordance, or payoff movement. Keep status, salience, audience visibility, source/payoff record links, and answer records in §15.

When this turn creates or activates any `CLK`, `STSEC`, or `STQ`, §10b must
distinguish newly introduced records from records that were already active:

- Newly introduced clocks: explain the new pressure driver the renderer may
  dramatize and the story-visible horizon it creates; keep the numeric fields in
  §15.
- Newly introduced story secrets: explain the observable surface and what remains
  hidden behind the secret claim, truth anchor, and holders' knowledge state;
  keep the secret kind and holder fields in §15.
- Newly introduced story questions: explain the concrete setup, affordance, or
  uncertainty introduced and how it can affect choices; keep setup kind,
  audience visibility, and choice-grounding links in §15.

Omit empty subsections. If no CLK, STSEC, or STQ is active or relevant, omit §10b entirely rather than emitting a placeholder.

The plan must not expose engine jargon to prose-facing sections. Record IDs and schema-field vocabulary may appear in engine-output body sections (§5, §6, §7, §7a, §8, §9, §9b, §9c, §10, §10b, §13, §14) when they are load-bearing grounding; predicate DSL terms remain prohibited outside excluded verbatim/frontmatter sections. No word-count targets (per FOUNDATIONS §Story Bundles §9).
