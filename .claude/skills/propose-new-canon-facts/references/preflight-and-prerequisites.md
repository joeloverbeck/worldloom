# Pre-flight and World-State Prerequisites

Before this skill acts, it MUST load (per FOUNDATIONS §Tooling Recommendation — non-negotiable):

## Reading mature world files

As worlds mature, any world file can cross the Read tool's token limit — `CANON_LEDGER.md` is the first to do so (it accumulates one entry per accepted CF), but `INSTITUTIONS.md`, `MYSTERY_RESERVE.md`, `EVERYDAY_LIFE.md`, and later `TIMELINE.md` and `GEOGRAPHY.md` follow the same trajectory as modification-history annotations accumulate.

When a prescribed Read returns a token-limit error, use this pattern:
1. **Grep for structural anchors** to enumerate the file's section layout — `^##[^#]` for top-level sections; `^### ` for subsections; `^id:` for CF entries in `CANON_LEDGER.md`; `^## M-` for Mystery Reserve entries; filename-appropriate patterns otherwise.
2. **Read targeted ranges** with `offset`/`limit` for the sections most relevant to the current batch's thinness scan and redundancy filter — the CFs in the domains the batch targets; the INSTITUTIONS / EVERYDAY_LIFE / MYSTERY_RESERVE sections whose material bears on the specific proposal families being generated.
3. **Do not attempt a single full Read** when the size warning triggers — selective reading is the expected mode once enough canon accumulates, and the audit trail (what sections were read, why) is as load-bearing as any other record.

This pattern applies uniformly across every file in this section. The CANON_LEDGER.md entry below cross-references it but does not repeat the mechanism.

## Mandatory — always loaded at Pre-flight
- `docs/FOUNDATIONS.md` — cited throughout (Canon Layers; Rules 2/3/4/5/7; Canon Fact Record Schema; Proposal Families alignment).
- `worlds/<world-slug>/WORLD_KERNEL.md` — Phase 1 diagnosis (tonal/genre contract for coherence filter); Phase 6 diversification (Core Pressures guide slot priorities).
- `worlds/<world-slug>/INVARIANTS.md` — Phase 7a invariant conformance for every card.
- `worlds/<world-slug>/ONTOLOGY.md` — Phase 2 enrichment targeting (each category maps to ontology categories).
- `worlds/<world-slug>/PEOPLES_AND_SPECIES.md` — Phase 1 thinness scan (species-without-material-consequence); Phase 3 species-adaptation seeds.
- `worlds/<world-slug>/GEOGRAPHY.md` — Phase 1 thinness scan (geography-without-trade-implications); Phase 3 travel-texture and region-differentiation seeds.
- `worlds/<world-slug>/INSTITUTIONS.md` — Phase 1 thinness scan (frictionless institutions, undermodeled classes); Phase 3 institutional-response and law-coupling seeds; structural anchor for Proposal Families 2, 5, 9.
- `worlds/<world-slug>/ECONOMY_AND_RESOURCES.md` — Phase 1 thinness scan (scarcity without black market, war without logistics); Phase 3 Scarcity and Hidden-Cost family seeds.
- `worlds/<world-slug>/MAGIC_OR_TECH_SYSTEMS.md` — Phase 1 thinness scan (magic-without-institutional-response); Phase 3 Cost-Deepening and Boundary family seeds. **Loaded unconditionally here** (unlike `character-generation`'s conditional load) because the diagnosis phase must detect magical/technological thinness across any world.
- `worlds/<world-slug>/EVERYDAY_LIFE.md` — Phase 1 thinness scan (missing daily-life texture); Phase 3 Local Practice and Material Culture seeds (Families 4, 10).
- `worlds/<world-slug>/TIMELINE.md` — Phase 1 thinness scan (catastrophe with weak residue); Phase 3 Residue Facts seeds (Family 3).
- `worlds/<world-slug>/CANON_LEDGER.md` — Phase 5 redundancy filter; Phase 7c distribution discipline. Large mature ledgers exceed the Read tool's token limit; use the selective-reading pattern in §Reading mature world files above, grepping `^id:` to enumerate CF IDs and then reading by line-range for CFs in the domains targeted by the current batch.
- `worlds/<world-slug>/OPEN_QUESTIONS.md` — Phase 1 thinness scan (what is already listed as open, so proposals do not duplicate); Phase 3 Mystery Seeding (new questions complement existing).
- `worlds/<world-slug>/MYSTERY_RESERVE.md` — Phase 7b firewall (non-negotiable — each entry's `disallowed cheap answers` and `what is unknown` blocks are the literal test material); Phase 3 Mystery Seeding (open new bounded unknowns without closing these).

## Pre-flight inputs
- `worlds/<world-slug>/proposals/` directory listing — for `BATCH-NNNN` and `PR-NNNN` allocation and slug-collision checks. Read existing `INDEX.md` if present. Directory created at Phase 9 commit time if absent.
- `parameters_path` contents (if provided) — read once at Phase 0.
- `upstream_audit_path` contents (if provided via `parameters_path`) — read once at Phase 1 to short-circuit the thinness scan for domains it covers.

## Abort conditions
- `worlds/<world-slug>/` missing → abort: "World directory not found. Run `create-base-world` first, or supply a valid `world_slug`."
- Any of the 13 mandatory files missing or unreadable → abort naming the specific file.
- `parameters_path` or `upstream_audit_path` provided but unreadable → abort naming the file.

## Pre-flight Check (6 steps)

1. Verify `worlds/<world-slug>/` exists. If absent, abort: "World directory not found. Run `create-base-world` first, or supply a valid `world_slug`."
2. Verify all 13 mandatory files (docs/FOUNDATIONS.md + 12 world files) are readable. If any is missing or unreadable, abort naming the specific file.
3. Load `docs/FOUNDATIONS.md` into working context.
4. Load the 12 mandatory world files (with the `CANON_LEDGER.md` selective-read pattern if size warning triggers).
5. Scan `worlds/<world-slug>/proposals/` for highest existing `BATCH-NNNN` by grepping `^batch_id:` across `batches/*.md` frontmatters, and highest existing `PR-NNNN` by grepping `^proposal_id:` across card frontmatters. Allocate `next_batch_id = highest_batch + 1`; `next_pr_id = highest_pr + 1`. If the directory does not exist or contains no cards, `next_batch_id = BATCH-0001` and `next_pr_id = PR-0001`.
6. Read existing `worlds/<world-slug>/proposals/INDEX.md` if present.
