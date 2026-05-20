# Phase 7: Author the page plan

Write `worlds/<world_slug>/stories/<story_slug>/pages-prose-plans/PG-<integer>.md` per shared contract §8 — 19 sections.

The drafted plan bytes are the future direct-write artifact. Keep the complete UTF-8 bytes stable in working memory so Phase 9 can compute `PG-<integer>.plan.plan_hash` over exactly the bytes that will be written after patch submission.

**§2 (Content Policy), §3 (Prose Craft Contract), and §19 (Render-Time Instruction Template) are inlined verbatim from `reports/prose-quality-instructions.md`.** Operationally load-bearing — external prose renderer has no cross-plan state; every page render is cold context. Compacting these sections would defeat the self-contained-plan contract.

Turn-cycle-specific section content: §1 inlines a short `STORY_KERNEL.md` excerpt; §4 inlines world-canon excerpts directly relevant to this turn's action; §5 enumerates active cast and entity statuses **as of this turn** (including any deaths, captures, or status changes from Phase 3); §6 names current location and grounded affordances; §7 dramatizes the resolved event (the chosen CHC or write-in interpretation + the `outcome_route` + the `world_logic_rationale` + `resolution.player_visible_feedback` for non-accept routes); §8 names the required beats from the selected or JIT commitment block; §9 names load-bearing relationships and beliefs AFTER Phase 4 updates; §10 lists open `OBL` / `CNSQ` / `THR` with `urgency` so debts that must be honored are visible to the prose renderer; §10b optionally lists active CLK / STSEC / STQ records after Phase 4; §11 names forbidden mystery resolutions; §12 names the intended stopping point; §13 previews emitted choices (or marks terminal); §14 (optional) inlines recent rendered prose continuity from `pages-prose/<recent>.md` when available.

§16a is mandatory when any viewpoint character, speaker, major actor, direct target, emotionally salient character, or character whose behavior/voice/appraisal/relationship conduct/perception/embodiment/agency materially shapes the page is present. For each such character, include the shared-contract packet: `STENT` / `STCHAR` / display name; required-because reason; `profile_hash`, `voice_block_hash`, and `page_packet_hash`; story-facing identity for this page; voice/dialogue authority projected from the STCHAR Page-Plan Voice Block; relevant appraisal rules; relevant pressure behavior; relationship-specific conduct; perception and embodiment constraints; agency and planning tendency; prose must-show; prose must-not-imply; and anti-generic warnings. The packet carries human renderable authority, not ids as shorthand.

Use the active STCHAR profile as the authority for persona, voice, pressure behavior, and stable conduct. Do not cite world `CHAR-*` as operational page-plan characterization authority. `STCHAR.source_char_id` may remain provenance inside STCHAR, but page plans consume STCHAR packets and story-local temporal state. §16a does not replace §5 entity status, §9 relationships/beliefs, §9b plans, §9c emotions, §16 cast material reality, or §17 style/register notes.

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
