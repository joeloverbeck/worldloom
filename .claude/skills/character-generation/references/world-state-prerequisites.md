# World-State Prerequisites

Before this skill acts, it MUST load (per FOUNDATIONS §Tooling Recommendation — non-negotiable):

## Reading mature world files

As worlds mature, any world file can cross the Read tool's token limit — `CANON_LEDGER.md` is the first to do so (it accumulates one entry per accepted CF), but `INSTITUTIONS.md`, `MYSTERY_RESERVE.md`, `EVERYDAY_LIFE.md`, and later `TIMELINE.md` and `GEOGRAPHY.md` follow the same trajectory as modification-history annotations accumulate from each accepted CF.

When a prescribed Read returns a token-limit error, use this pattern:
1. **Grep for structural anchors** to enumerate the file's section layout — `^##[^#]` for top-level sections; `^### ` for subsections; `^id:` for CF entries in `CANON_LEDGER.md`; `^## M-` for Mystery Reserve entries; filename-appropriate patterns otherwise.
2. **Read targeted ranges** with `offset`/`limit` for the sections most relevant to the character's brief — the CFs whose `who_can_do_it` distributions bear on the character's capabilities; the INSTITUTIONS axes that embed the character's profession, law-exposure, and religion; the Mystery Reserve entries whose `what is unknown` blocks plausibly touch the character's epistemic surface.
3. **Do not attempt a single full Read** when the size warning triggers — selective reading is the expected mode once enough canon accumulates, and the audit trail (what sections were read, why) is as load-bearing as any other Phase 7 record.

This pattern applies uniformly across every file in §World-State Prerequisites. The CANON_LEDGER.md entry below cross-references it but does not repeat the mechanism.

## Mandatory — always loaded at Pre-flight
- `docs/FOUNDATIONS.md` — cited throughout (Rule 2 at Phases 1/2/5; Rule 3 at Phase 5; Rule 4 at Phase 7c; Rule 7 at Phase 7b; Canon Layers at Phase 7; Ontology Categories at Phase 5).
- `worlds/<world-slug>/WORLD_KERNEL.md` — genre/tonal/chronotope contract (Phase 0 input validation against world identity; Phase 6 voice register calibration).
- `worlds/<world-slug>/INVARIANTS.md` — Phase 7a invariant conformance (every capability, belief, and knowledge claim tested).
- `worlds/<world-slug>/ONTOLOGY.md` — Phase 5 capability classification (each skill attaches to declared ontology categories).
- `worlds/<world-slug>/PEOPLES_AND_SPECIES.md` — Phase 1 embodiment (body plan, diet, senses, vulnerability, lifespan, social density) + Phase 6 species/body perception effects.
- `worlds/<world-slug>/GEOGRAPHY.md` — Phase 1 material reality (terrain, climate, choke points, disease ecologies, food baselines → body, food, mobility, injury profile).
- `worlds/<world-slug>/INSTITUTIONS.md` — Phase 2 institutional embedding (family, law, religion, employer, military, guild, landholding, education, recordkeeping — the proposal's structural anchor).
- `worlds/<world-slug>/ECONOMY_AND_RESOURCES.md` — Phase 1 (food, possessions, access restrictions, debts) + Phase 2 (employer/guild/lord relations).
- `worlds/<world-slug>/EVERYDAY_LIFE.md` — Phase 1 + Phase 3 (the ordinary-life backdrop this character inhabits or departs from; vocabulary/categories available to ordinary people in this region/class/species cluster).
- `worlds/<world-slug>/TIMELINE.md` — Phase 3 (what history the character lived through or learned about; what residues remain in their region).
- `worlds/<world-slug>/CANON_LEDGER.md` — Phase 5 (capability facts and their `distribution` blocks) + Phase 7c (distribution/scope conformance check). Large mature ledgers exceed the Read tool's token limit; use the selective-reading pattern in §Reading mature world files above, grepping `^id:` to enumerate CF IDs and then reading by line-range for the CFs relevant to the character's capabilities and brief.
- `worlds/<world-slug>/MYSTERY_RESERVE.md` — Phase 7b firewall (non-negotiable — each entry's `disallowed cheap answers` and `what is unknown` blocks are the literal test material).
- `worlds/<world-slug>/OPEN_QUESTIONS.md` — Phase 3 (so the character does not "know" things the world has deliberately not yet decided).

## Selectively loaded
- `worlds/<world-slug>/MAGIC_OR_TECH_SYSTEMS.md` — Phase 5, loaded only if Phase 0 detects the character's inputs or generated capabilities touch magical or technological systems. Skipped otherwise to avoid context bloat on ordinary-laborer characters.

## Pre-flight
- `worlds/<world-slug>/characters/` directory listing — for `CHAR-NNNN` allocation and slug-collision check. Read `INDEX.md` if present. Directory created at Phase 9 commit time if absent.
- `character_brief_path` contents (if provided) — read once at Phase 0.

## Abort conditions

Enforced by Pre-flight Check (canonical abort messages live in the thin SKILL.md):
- `worlds/<world-slug>/` missing
- Any of the 13 mandatory files missing or unreadable — the abort names the specific file
- `worlds/<world-slug>/characters/<char-slug>.md` already exists (slug collision; this skill never overwrites a dossier)
