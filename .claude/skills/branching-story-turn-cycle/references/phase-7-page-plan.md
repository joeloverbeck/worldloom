# Phase 7: Author the page plan

Write `worlds/<world_slug>/stories/<story_slug>/pages-prose-plans/PG-<integer>.md` per shared contract §8 — 19 sections.

The drafted plan bytes are the future direct-write artifact. Keep the complete UTF-8 bytes stable in working memory AND persist them to a temporary path (e.g., `/tmp/PG-<integer>.md.draft`) at Phase 9 step 2 so the `compute-pg-hashes.js` CLI can hash them via `--plan <temp-path>`. Do NOT write to the bundle path `pages-prose-plans/PG-<integer>.md` until Phase 10 step 6 confirms patch success; the catch-22 between this byte-stability requirement and the post-success bundle-write order is bridged by the `/tmp/` scratch file.

**§2 (Content Policy), §3 (Prose Craft Contract), and §19 (Render-Time Instruction Template) are inlined verbatim from `reports/prose-quality-instructions.md`.** Operationally load-bearing — external prose renderer has no cross-plan state; every page render is cold context. Compacting these sections would defeat the self-contained-plan contract.

Turn-cycle-specific section content: §1 inlines a short `STORY_KERNEL.md` excerpt; §4 inlines world-canon excerpts directly relevant to this turn's action; §5 enumerates active cast and entity statuses **as of this turn** (including any deaths, captures, or status changes from Phase 3); §6 names current location and grounded affordances; §7 dramatizes the resolved event as prose-facing scene, pressure, outcome, and state-change direction; §8 names the required beats from the selected or JIT commitment block; §9 names load-bearing relationships and beliefs AFTER Phase 4 updates; §10 lists open `OBL` / `CNSQ` / `THR` with `urgency` so debts that must be honored are visible to the prose renderer; §10b optionally lists active CLK / STSEC / STQ records after Phase 4; §11 names forbidden mystery resolutions; §12 names the intended stopping point; §13 previews emitted choices (or marks terminal); §14 (optional) inlines recent rendered prose continuity from `pages-prose/<recent>.md` when available.

**§7 state-delta body translation.** The §7 body is the renderer-facing explanation of the selected event and state movement: what changed in the actor, scene, or pressure field this page. It may name the chosen CHC or write-in interpretation, `outcome_route`, `world_logic_rationale`, and `resolution.player_visible_feedback` in prose, but it must not dump the engine ledger. Engine state-delta arrays, `record_introductions[]`, `state_relations[]`, `non_propagation_facts[]`, lifecycle bookkeeping, and record-id-heavy rationale move to §15 frontmatter and the underlying `SE` record.

Use a prose packet like:

```markdown
What changed in <actor>'s interior this page:
- <How the selected event narrows, redirects, or intensifies the actor's intent.>
- <What new belief, pressure, obligation, clock, consequence, or relationship fact becomes renderable.>
- <What the prose must show as behavior, perception, access limit, or outcome rather than as schema fields.>
```

For non-accept routes, render `resolution.player_visible_feedback` as the player-legible story consequence. For accept routes, render the selected event, route, rationale, and state delta as scene movement without a `resolution` block.

**§7a Active-pressure disposition table — closed-set Reason / expiry form.** Every high-urgency active record on the parent `PG.state_snapshot` MUST appear in exactly one `| Record | Disposition | Reason / expiry |` row (per shared contract §7a). The `active_pressure_handling_discipline` validator enforces the cell shape:
- `disposition` is exactly one of `selected`, `deferred`, `rejected`. Any other token fails (`active_pressure_disposition_unknown`).
- For `deferred` rows, the `Reason / expiry` cell MUST contain either (a) a literal `PG-<integer>` reference (e.g., "remains active at PG-<N>", "expires after PG-<N>", "until PG-<N>") OR (b) at least one of the conditional connectives `after | before | if | once | until | when`. Freeform prose with neither (e.g., "continues to load on her", "remains active offstage") fails as `active_pressure_deferred_without_expiry`.
- For `rejected` rows, the `Reason / expiry` cell MUST be non-empty.

Recommended forms: `expires after PG-<N>`, `until PG-<N>`, `remains active at PG-<N+1>` (the new page itself), `once <condition>`, `if <condition>`, `when <condition>`. When the record genuinely stays active across the new page without a known horizon, prefer `remains active at PG-<N+1>` over freeform prose — naming the new page satisfies the rule and accurately states the state. Within the required cell shape, write the reason as prose-facing pressure or scene logic rather than bare record-id rationale where possible.

§16a is mandatory when any viewpoint character, speaker, major actor, direct target, emotionally salient character, behavior-shaping character, or offstage-causal character is present. Per-character packets project stable STCHAR authority through active current state; they do not store current state inside STCHAR. For each such present character, include the shared-contract full packet: `STENT` / `STCHAR` / display name; multi-token `Required because:` using the SPEC-73 vocabulary; `Stable STCHAR seed used`; `Current-state grounding records:` naming active STEMO/BEL/STPLAN/SREL/STSTAT/STOBJ/STLOC/THR/OBL/CNSQ/CLK/STSEC/STQ/SE/PG ids when page-local modulation depends on them, or `none; stable STCHAR authority only`; `Page-local projection`; `Prose must-show`; `Prose must-not-imply`; and `Anti-generic warnings`.

For an active offstage character whose activity causally bears on this page, include the shared-contract reduced `offstage_causal` packet: `STENT` / `STCHAR` / display name; `Required because: offstage_causal`; `Stable STCHAR seed used`; `Current-state grounding records:` naming grounding records for the offstage causal projection, or `none; stable STCHAR authority only`; `Page-local projection`; `Offstage causal relevance:`; `Prose must-not-imply`; and `Anti-generic warnings`. Omit on-page voice/dialogue rendering lines for the reduced packet because the character is not rendered on the page. An offstage character with no causal bearing on this page may be omitted as background-only, but the omission must not ask prose to infer persona from an id. The packet carries human-renderable authority, not ids as shorthand.

Use the active STCHAR profile as stable authority. Use active story-state records for current state. Do not cite world `CHAR-*` as operational page-plan characterization authority. Do not imply that current state lives inside STCHAR. `STCHAR.source_char_id` may remain provenance inside STCHAR, but page plans consume STCHAR packets and story-local temporal state. §16a does not replace §5 entity status, §9 relationships/beliefs, §9b plans, §9c emotions, §16 cast material reality, or §17 style/register notes.

**§16a record-id token discipline (load-bearing).** Per shared contract §16a, any `PG-<integer>`, `SE-<integer>`, `STEMO-<integer>`, `BEL-<integer>`, `STPLAN-<integer>`, `SREL-<integer>`, `STSTAT-<integer>`, `STOBJ-<integer>`, `STLOC-<integer>`, `THR-<integer>`, `OBL-<integer>`, `CNSQ-<integer>`, `CLK-<integer>`, `STSEC-<integer>`, or `STQ-<integer>` token that appears inside a §16a packet — in any field OTHER than `Current-state grounding records:` — is treated by `page_plan_stchar_packet_integrity` as an operational current-state citation. The validator enforces three rules on those tokens:
- A `PG-<integer>` token is legal only when it is the current page's own id; cite the parent page or any earlier page as history through prose ("the prior observation beat", "the parent-page action", "the previous page's opener"), not by literal id.
- An `SE-<integer>` token is legal only when it is the current page's resolved event id (`PG.input.resolved_event_id`).
- Every other listed class id must be present in the new page's `state_snapshot.active_records.<class>`. A record superseded this turn (e.g., a STEMO-N that was replaced by STEMO-M) is no longer active and must NOT appear as a packet citation — name its successor instead, or remove the cite.

Common ways authors trip the rule: differential-discipline language like "unchanged from PG-3", "different from PG-3's anchors", "as PG-3", "Limits as PG-3"; carrying a prior page's grounding cite forward verbatim; referencing the just-superseded record (STEMO-N) when only its successor (STEMO-M) is active. Rewrite each such phrase in prose, drop the literal id, or replace it with the active successor id. The `Current-state grounding records:` field is the ONE exception — it is parsed as a comma-separated id list, never as prose.

Use §10b "Open Setups, Active Clocks, Hidden Secrets" only when at least one post-delta active CLK, STSEC, or STQ record is relevant to the page render. It is per-page computed from the current `PG.state_snapshot.active_records`, not inlined verbatim from the shared contract and not copied from a prior page.

- Active clocks: name each relevant `CLK` with current `value` / `max`, nearest threshold or resolution pressure, `salience`, `visibility`, and any tick or threshold effect from this `SE`.
- Hidden or revealed secrets: name each relevant `STSEC` with `status`, holders / discoverers that may affect prose perspective, clue-carrier discovery count or decisive carrier, and whether this page revealed the secret.
- Open setups / story questions: name each relevant `STQ` with `status`, `salience`, `audience_visibility`, source or payoff record, and whether this page answered, paid off, abandoned, or complicated it.

When this turn creates or activates any `CLK`, `STSEC`, or `STQ`, §10b must
distinguish newly introduced records from records that were already active:

- Newly introduced clocks: name the new `CLK`, its `value` / `max`, nearest
  threshold, salience, visibility, and a one-line note explaining the new
  pressure driver the renderer may dramatize.
- Newly introduced story secrets: name the new `STSEC`, its `secret_kind`, what
  the renderer may show as the observable surface, and what remains hidden
  behind the secret claim, truth anchor, and holders' knowledge state.
- Newly introduced story questions: name the new `STQ`, its `setup_kind`, the
  concrete setup or affordance introduced, audience visibility, and which
  choices in the page plan are grounded in the new question.

Omit empty subsections. If no CLK, STSEC, or STQ is active or relevant, omit §10b entirely rather than emitting a placeholder.

The plan must not expose engine jargon to prose. Engine terms confined to §15 frontmatter only. No word-count targets (per FOUNDATIONS §Story Bundles §9).
