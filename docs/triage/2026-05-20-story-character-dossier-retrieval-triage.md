# Triage: Story Character Dossier Retrieval

> **OBSOLETE — superseded by STCHAR (SPEC-56/57).** This file is retained as a historical decision record. Do not use its `STENT.bound_char_id`, turn-cycle CHAR-seeding, or Option-D detector guidance as current implementation authority; current story runtime authority uses STCHAR records.

Date: 2026-05-20
Source report: `reports/story-character-dossier-retrieval-concerns.md`
Classification: story-canon-related (analysis / triage)
Status: **SUPERSEDED** (2026-05-20) by `archive/specs/SPEC-56-stchar-machine-foundation.md` + `archive/specs/SPEC-57-stchar-pipeline-integration.md`.

> **Superseded.** This triage chose a lean fix (Option A targeted CHAR retrieval + Option D drift audit + a single `bound_char_content_hash` field on `STENT`) and **rejected** a new `STCHAR` record class on FOUNDATIONS §5b grounds. A later reassessment of `archive/reports/stchar-implementation-first-iteration.md` reversed that rejection: §5b governs the per-field token cost of *atomic state records*, but `STCHAR` is a **hybrid on-demand authority artifact** (CHAR/DA precedent), and the temporal records (`BEL`/`STINT`/`SREL`/`STEMO`) structurally cannot carry stable voice/persona/pressure-behavior — so faithful temporal-state retrieval cannot fix the character downgrade. This triage's accepted items are **subsumed** by the STCHAR specs (targeted retrieval → STCHAR distillation; `bound_char_content_hash` → `STCHAR.source_char_hash`; drift audit → health-audit source-drift mode). Retained below as the historical decision record.

## Concern

Worldloom character dossiers (`worlds/<slug>/characters/CHAR-*.md`, 70k–120k chars after the SPEC-52 protagonist-grade upgrade) may not be meaningfully exploited by the branching-story skills. The worry: dossiers are read once into story-local state at bootstrap and never refreshed, and the MCP context-packet layer never delivers their bodies to story tasks — so runtime turns drift away from current character authority and lose characterization.

## Verification outcome

Every technical claim in the source report was verified against the codebase (two parallel Explore passes). All CONFIRMED, no refutations:

| Claim | Verdict | Evidence |
|---|---|---|
| `character_record` absent from all story-task full-body rules | CONFIRMED | `tools/world-mcp/src/context-packet/full-body-delivery.ts` 68–93 |
| `body_preview` default 280 chars | CONFIRMED | `tools/world-mcp/src/context-packet/shared.ts:418` |
| Story ranking priorities: bootstrap 1.15 / turn_cycle 0.95 / commitment 1.0 | CONFIRMED | `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` 125/151/176 |
| No character-body delivery for story tasks (`cast_bind_list` carries IDs only) | CONFIRMED | `story-bundle-context.ts` `buildCastBindList`; no `bound_character_context` field exists |
| Bootstrap mandates no per-`CHAR` deep retrieval before authoring | CONFIRMED | `branching-story-bootstrap` SKILL.md — targeted-retrieval discipline covers only STPLAN/STEMO/STSEC/STQ/CLK |
| Turn-cycle mandates no targeted dossier retrieval | CONFIRMED | `branching-story-turn-cycle` pre-flight derives world-scope seeds incl. `STENT.bound_char_id` but never retrieves dossier bodies |
| `STENT` stores only pointer + role, no character payload | CONFIRMED | story-state contract §4.5.1 (7 fields; `notes` explicitly forbidden) |
| Health-audit has no dossier-drift check | CONFIRMED | 5 modes / 12 structural sub-phases; none covers CHAR-dossier currency |
| `get_record` supports section-path projection + oversize handling for hybrid CHAR | CONFIRMED | `tools/world-mcp/src/tools/get-record.ts` 422–498, 674–688, 698–709 |

## Reframe

The story engine is deliberately a **present-causal-state machine** (FOUNDATIONS §5c): it runs on story-local records (`BEL`/`STINT`/`SREL`/`STEMO`/`STPLAN`), not on re-reading the dossier each turn. So "turn-cycle doesn't re-read the dossier" is mostly **correct by design**. The real failures are narrower:

1. **The bootstrap projection is the load-bearing moment and is under-specified.** Bootstrap is where the rich dossier should be distilled into story-local records, but neither skill mandates a deep dossier read before authoring them. A thin projection at genesis is where characterization is actually lost.
2. **No dossier-drift mechanism exists.** FOUNDATIONS §4b already established the exact pattern for *world-canon* drift (`PG.state_snapshot.canon_revision` + mandatory drift classification + health-audit routing) — but it covers CF/CH/INV/M/SEC only, **not** the `CHAR-*` layer (dossiers live in `characters/`, not `_source/`). The gap is real and uncovered.

The fix is therefore: make the bootstrap projection faithful, read the dossier on-demand only when a character is introduced/deepened, and add §4b-style drift detection for the CHAR layer — **not** force full dossiers into every turn packet (fights both the token budget and §5c).

## Option verdicts

### ACCEPT

- **Option A — Skill-only targeted retrieval (core fix).** Mandate a deep dossier read at bootstrap before authoring `STENT`/`BEL`/`STINT`/`SREL`/`STEMO`/`SF`/`SE.world_logic_rationale`/page-plan, and a **bounded** dossier read at turn-cycle *only when a character is newly introduced (new `STENT`) or the turn deepens an actor's voice/pressure-behavior*. Use `get_record` section-path projection to stay within budget. Aligns with §5c, zero schema/tool risk, reuses the existing targeted-retrieval prose pattern.
- **Option D — Dossier-drift mode in health-audit (durable detector).** Check active `STENT.bound_char_id`: resolves to current dossier; compares stored source hash against current; emits `character_projection_stale` / `_missing` / `_contradiction`. Direct analogue of §4b, which does not extend to the CHAR layer.

### ACCEPT-WITH-MODIFICATION

- **Option C — Character projection record/snapshot.** Modification scope: do NOT add a new `STCHAR`/`character_projection` record class (tensions with §5b Schema-Minimalism). Capture only the drift-detection primitive — store the source dossier `content_hash` (already returned by `get_record`) at bind time, as one nullable field on `STENT` (`bound_char_content_hash`) or in `STORY_KERNEL.md.cast_bind_list`. Dossier *substance* is already projected into `BEL`/`STINT`/`SREL`/`STEMO` (Option A makes that faithful); only the hash is missing. Adding a field to `STENT` requires amending the story-state contract first (§630).

### REJECT

- **Option B — MCP full-body/projection delivery for story tasks.** Alternative path: Option A's targeted `get_record`. Full dossiers (70–120k × cast) blow context budgets; auto-delivery every turn fights §5c. Skill-side targeted retrieval is cheaper and more controllable.
- **Option E — Dedicated character-sync/compatibility workflow.** Alternative path: Option D's drift mode + the audit's existing `remediation` mode (RSP cards → `commitment-block-authoring`). A standalone eighth story-pipeline skill is redundant and, per the report, doesn't prevent shallow runtime retrieval without A/B.

## Recommended shape (two layers)

- **Layer 1 (skill + contract):** Option A retrieval mandates in `branching-story-bootstrap` and `branching-story-turn-cycle` + the modified Option C single `content_hash` field (contract amendment first, then `STENT` schema + bind logic).
- **Layer 2 (audit):** Option D dossier-drift check in `branching-story-health-audit` (new sub-phase under `structural`, or folded into `compatibility` mode), keyed on the stored hash.

Preserves branch-local append-only semantics: the bootstrap hash is the grandfathering anchor — old branches stay valid; drift is surfaced, not silently applied.

## Named assumptions (the report's 7 open questions, as decided here)

1. **Snapshot vs always-latest:** branches snapshot at bootstrap (hash-anchored), preferring branch-local stability — consistent with §4b.
2. **Post-upgrade old branch:** grandfathered by default; drift surfaced by Layer-2 audit; repair opt-in (never automatic).
3. **Required sections at runtime:** `dramatic_core`, `major_local_pressures`, `world_consistency`, plus voice/goals/fears body sections; `profession` / `current_location` / `kinship_situation` as needed.
4. **`STENT` stays minimal + one hash field** (no new record class), per §5b.
5. **No automatic `bound_character_context`** in context packets (Option B rejected).
6. **Drift-finding severity:** `warning` for stale/missing hash; `error` only for detected story-local-vs-dossier contradiction.
7. **Prose-validation voice check:** deferred — page-plan §3 Prose Craft Contract already governs voice; a dossier-voice check in `branching-story-prose-attach` is a separable follow-up.

## FOUNDATIONS alignment

| Principle | Stance | Rationale |
|---|---|---|
| §5c Present Causal State, Not Narrative Shape | aligns | Dossier read feeds the bootstrap projection and on-demand introduction, not a per-turn re-derivation; runtime still advances from story-local state. |
| §4b Canon Baseline Drift | aligns (extends) | Layer-2 drift check is the CHAR-layer analogue of the world-canon `canon_revision` drift mechanism, which §4b does not cover. |
| §5b Schema-Minimalism At Story Scope | aligns | Modified Option C adds exactly one load-bearing field (`content_hash`, consumed by the Layer-2 audit) rather than a new record class. |
| §4 Write Discipline / §2 Storage Form | aligns | `STENT` schema change routes through a story-state-contract amendment (§630) then the patch engine; no direct `_source/` writes. |
| §8 Story Bundle As Derived Per-World Layer | aligns | Branch-local append-only preserved; bootstrap hash grandfathers existing branches. |

## Next steps (open)

No spec or tickets written. When ready, the recommended deliverable is a system spec (`specs/<spec>.md`) covering Layer 1 + Layer 2, decomposable via `spec-to-tickets`. Re-invoke `/brainstorm` on this triage file to produce it, or adjust any named assumption first.
