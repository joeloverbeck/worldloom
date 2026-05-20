# Implementation Order

Specs in the order they must be implemented. Later specs depend on surfaces landed by earlier ones.

## STCHAR — Story-Local Character Authority (2026-05-20)

Derived from `reports/stchar-implementation-first-iteration.md` (ChatGPT-Pro), accepted-with-
modification. Both specs **supersede** the lean-fix decision in
`docs/triage/2026-05-20-story-character-dossier-retrieval-triage.md`.

1. **SPEC-56 — STCHAR Machine-Facing Foundation** — FOUNDATIONS + shared-contract amendments,
   `story-character-authority.schema.json` + dependent schema edits, structural validators,
   patch-engine ops, world-index node/edges, MCP retrieval + `story_bundle_context`, fixtures.
   *No dependencies.*

2. **SPEC-57 — STCHAR Pipeline Integration** — new `story-character-profile` skill, bootstrap
   distillation, turn-cycle consumption + block-and-route, prose-attach voice-fidelity receipt,
   health-audit phase 2m + source-drift mode, promotion-evidence handling, mandatory page-plan
   voice packet, integration tests.
   *Depends on SPEC-56 (must land first — skills consume the schema/validator/MCP/patch surfaces
   SPEC-56 builds).*

**Rationale for the split:** the layering is real — the story skills cannot produce or consume
`STCHAR` until it is storable (patch-engine), retrievable (MCP), indexable (world-index), and
validatable (schema + structural validators). SPEC-56 is the foundation; SPEC-57 is the
consumption layer. Each is independently reviewable and testable.
