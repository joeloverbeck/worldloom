# Pre-flight and World-State Prerequisites

Before this skill acts, it MUST load (per FOUNDATIONS §Tooling Recommendation — non-negotiable):

## Reading mature world files

As worlds mature, any world file can cross the Read tool's token limit — `CANON_LEDGER.md` is the first to do so (it accumulates one entry per accepted CF), but `INSTITUTIONS.md`, `MYSTERY_RESERVE.md`, `EVERYDAY_LIFE.md`, and later `TIMELINE.md` and `GEOGRAPHY.md` follow the same trajectory as modification-history annotations accumulate. **Character dossiers (`worlds/<slug>/characters/<char-slug>.md`) follow the same trajectory** — established protagonist-tier dossiers accumulate narrative-cross-reference annotations, multi-role rotation notes, detailed Epistemic Position sections, and canon-safety-check trace blocks that push them past the Read tool's limit in active worlds. Treat oversized character dossiers identically to oversized world files.

When a prescribed Read returns a token-limit error, use this pattern:
1. **Grep for structural anchors** to enumerate the file's section layout — `^##[^#]` for top-level sections; `^### ` for subsections; `^id:` for CF entries in `CANON_LEDGER.md`; `^## M-` for Mystery Reserve entries; `^character_id:` and `^## ` for character dossiers (frontmatter anchor + Material Reality / Institutional Embedding / Epistemic Position / Voice and Perception / Goals and Pressures / Contradictions and Tensions / Capabilities / Canon Safety Check Trace section heads); filename-appropriate patterns otherwise.
2. **Read targeted ranges** with `offset`/`limit` for the sections most relevant to the artifact's claims, the author's capabilities, and the audience's epistemic surface — the CFs whose distribution blocks bear on the author's canonical-status claims; the INSTITUTIONS axes that embed the author's profession and institutional posture; the Mystery Reserve entries whose `what is unknown` blocks plausibly touch the artifact's claim_map; for character dossiers, the Epistemic Position + Voice and Perception sections (which feed Phase 1 dossier-transfer directly) and whichever Institutional Embedding axes bear on the artifact's audience and taboo register.
3. **Do not attempt a single full Read** when the size warning triggers — selective reading is the expected mode once enough canon accumulates, and the audit trail (what sections were read, why) is as load-bearing as any other Phase 7 record.

This pattern applies uniformly across every file in this section, INCLUDING character dossiers supplied via `character_path`. The CANON_LEDGER.md entry below cross-references it but does not repeat the mechanism.

## Mandatory — always loaded at Pre-flight
- `docs/FOUNDATIONS.md` — cited throughout (Canon Layers at Phase 3 claim-status tagging; Rule 2 at Phase 4 texture; Rule 4 at Phase 7c; Rule 7 at Phases 1, 3, 7b; Canon Fact Record Schema at Phase 3 canon_status binding).
- `worlds/<world-slug>/WORLD_KERNEL.md` — Phase 2 genre-convention calibration against world tonal contract; Phase 6 voice register; Phase 7e truth-discipline.
- `worlds/<world-slug>/INVARIANTS.md` — Phase 7a invariant conformance (every claim in artifact body and claim_map tested; author's asserted capabilities and knowledge tested).
- `worlds/<world-slug>/ONTOLOGY.md` — Phase 3 claim classification; Phase 7a invariant-type mapping.
- `worlds/<world-slug>/PEOPLES_AND_SPECIES.md` — Phase 0 author species binding; Phase 6 species-inflected voice; Phase 2 species-specific genre conventions.
- `worlds/<world-slug>/GEOGRAPHY.md` — Phase 0 place binding; Phase 4 local texture; Phase 1 what the author could plausibly have travelled to and witnessed.
- `worlds/<world-slug>/INSTITUTIONS.md` — Phase 0 author institutional embedding; Phase 2 institutional-authorship conventions; Phase 5 "institution the author must flatter or fear"; Phase 7d diegetic-safety institutional-claim conformance.
- `worlds/<world-slug>/ECONOMY_AND_RESOURCES.md` — Phase 0 author material dependencies; Phase 4 texture (prices, commodities, scarcity diction); Phase 1 livelihood-exposed knowledge.
- `worlds/<world-slug>/EVERYDAY_LIFE.md` — Phase 1 author's epistemic surface; Phase 4 texture; Phase 3 common-knowledge baseline.
- `worlds/<world-slug>/TIMELINE.md` — Phase 0 date binding; Phase 1 lifetime-vs-inherited-tradition split; Phase 3 present-vs-historical-vs-legendary; Phase 7e narrator-truth chronology check.
- `worlds/<world-slug>/CANON_LEDGER.md` — Phase 3 claim_map canon_status tagging; Phase 7c distribution/scope conformance. Large mature ledgers exceed the Read tool's token limit; use the selective-reading pattern in §Reading mature world files above, grepping `^id:` to enumerate CF IDs and then reading by line-range for the CFs relevant to the artifact's claims and the author's capabilities.
- `worlds/<world-slug>/MYSTERY_RESERVE.md` — Phase 1 author `impossible_knowledge` derivation; Phase 7b firewall (non-negotiable — each entry's `disallowed cheap answers` and `what is unknown` blocks are the literal test material against artifact body, claim_map, and `wrongly_believed`).
- `worlds/<world-slug>/OPEN_QUESTIONS.md` — Phase 1 (artifact does not "know" things the world has deliberately not yet decided); Phase 7d check that artifact does not silently resolve an open question by assertion.

## Selectively loaded
- `worlds/<world-slug>/MAGIC_OR_TECH_SYSTEMS.md` — Phase 0, loaded only if the brief's `artifact_type` is magic-or-tech-adjacent (grimoire fragment, relic manual, alchemical treatise, ward-inscription commentary, technical specification) OR the author's profession/institution touches magical or technological systems OR the audience does OR claim selection at Phase 3 produces claims in those domains. Skipped otherwise to avoid context bloat on ordinary-register artifacts.

## Pre-flight inputs
- `worlds/<world-slug>/diegetic-artifacts/` directory listing — for `DA-NNNN` allocation and slug-collision check. Read `INDEX.md` if present. Directory created at Phase 9 commit time if absent.
- `brief_path` contents — read once at Phase 0.
- `character_path` contents (if provided) — read once at Phase 0. Path must resolve inside `worlds/<world-slug>/characters/`; cross-world or out-of-tree paths are rejected.

## Abort conditions
- `worlds/<world-slug>/` missing → abort: "World directory not found. Run `create-base-world` first, or supply a valid `world_slug`."
- Any of the 13 mandatory files missing or unreadable → abort naming the specific file.
- `brief_path` missing or unreadable → abort naming the path.
- `character_path` provided but outside `worlds/<world-slug>/characters/` → abort: "character_path must resolve inside the same world. Cross-world author references are rejected to prevent canon leakage."
- `character_path` provided but target dossier does not exist → abort naming the path.
- `worlds/<world-slug>/diegetic-artifacts/<da-slug>.md` already exists → abort: "Artifact slug collision — supply a different title. This skill never overwrites an existing artifact."

## Pre-flight Check (9 steps)

1. Verify `worlds/<world-slug>/` exists. If absent, abort.
2. Verify all 13 mandatory files (docs/FOUNDATIONS.md + 12 world files) readable. If any missing or unreadable, abort naming the specific file.
3. Load `docs/FOUNDATIONS.md` and `.claude/skills/diegetic-artifact-generation/templates/diegetic-artifact.md` into working context. The template is the authoritative frontmatter schema — every field name and shape in the Phase 9 write MUST match it exactly. Reading the template here prevents schema drift at Phase 9.
4. Load the 12 mandatory world files.
5. Verify `brief_path` exists and is readable. Abort naming the path if not.
6. If `character_path` provided: verify it resolves inside `worlds/<world-slug>/characters/` AND the target dossier exists. Abort per the cross-world / missing-dossier rules. **If the dossier exceeds the Read tool's token limit at load, apply the selective-read pattern from §Reading mature world files above** — grep structural anchors (`^## `, `^### `, `^character_id:`, `^## Epistemic Position`, `^## Voice and Perception`, `^## Institutional Embedding`) to enumerate sections, then read by line-range. This is the expected mode for established protagonist-tier dossiers; it is not an error.
7. Scan `worlds/<world-slug>/diegetic-artifacts/` for the highest existing `DA-NNNN` by grepping `^artifact_id:` across artifact frontmatters. Allocate `next_artifact_id = highest + 1`. If directory does not exist or contains no artifacts, `next_artifact_id = DA-0001`.
8. Parse `brief_path` for the artifact title. Derive `<da-slug>` (kebab-case, lowercase, punctuation-stripped). If title is not yet known from the brief, defer slug derivation to end of Phase 0.
9. If `worlds/<world-slug>/diegetic-artifacts/<da-slug>.md` already exists, abort: "Artifact slug collision — supply a different title."
