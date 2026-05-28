# Phase 7: State-Only Choice Authoring

Turn-cycle no longer authors a page-level render plan. Phase 7 is the state-side choice emission step that follows the finalized `SE` and planless `PG` snapshot.

Use the parent `PG.state_snapshot.active_records`, the full parent-active records retrieved during pre-flight, the selected or JIT `SLT`, and the just-drafted state delta to emit the next `CHC` records. Do not read or derive from prior prose, legacy render plans, or any renderer-facing markdown artifact when computing the causal state delta or choice set.

Carry render-relevant pressure in records:

- Active plans and emotions belong in `STPLAN` / `STEMO` records, `SE.state_relations[]`, and emitted `CHC.grounded_in.records[]`.
- Active clocks, secrets, and story questions belong in `CLK` / `STSEC` / `STQ` records and may ground choices directly when they shape player-facing options.
- Character authority comes from active `STCHAR` records retrieved by targeted story-scoped reads, plus current story-state records; do not cite world `CHAR-*` as runtime authority.

After Phase 7, the only new authoring artifacts are story-bundle `_source` records and the bundle `INDEX.md` update after patch success. Scene planning and rendered prose are separate scene-layer workflows.
