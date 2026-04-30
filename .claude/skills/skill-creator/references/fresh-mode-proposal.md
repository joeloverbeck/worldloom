# Fresh Mode — Proposal Generation (Step 3)

Skip in compile mode (when `reference_path` is provided).

Run a discovery interview to produce a `brainstorming/<slug>.md` file matching the structural DNA of existing proposals. Required sections to elicit:

1. **Purpose** — one paragraph. What does this pipeline do and what does it explicitly NOT do?
2. **Inputs** — Required vs Optional. Type each input.
3. **Output** — specific artifacts. Include record schemas if applicable.
4. **Phase 0..N** — numbered phases with scoped subtasks.
5. **Rules** — invariants the pipeline must uphold (per phase where relevant).
6. **Validation / Rejection Tests** — end-stage checks.
7. **Final Rule** — one-sentence discipline.
8. **Mandatory LLM Roles** (optional) — specialized passes if the pipeline benefits from multiple critics.

Interview rules: one question per message, confidence block after each answer (see the gap-filler interview's protocol), target 90%+ for the proposal before writing. Write to `brainstorming/<slug>.md`. Show the user the written proposal and get explicit confirmation before advancing to the gap-filler interview.
