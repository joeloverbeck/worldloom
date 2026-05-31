# ID Allocation

IDs are **append-only** and use the FOUNDATIONS-002 unpadded natural-integer suffix convention: `M-1`, not `M-0001` (see `docs/FOUNDATIONS.md` §Canonical Storage Layer for the format contract). Filenames match the `id` field exactly, except where a hybrid markdown artifact appends a slug/date suffix after the ID (e.g. `SAU-1-2026-05-13.md`, `RSP-1-payoff.md`).

## Allocation discipline

On machine-layer-enabled workflows, allocate at pre-flight via `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug?, audit_id?)`, which scans the indexed world state or the class-specific filesystem surface for the highest id of that class and returns the next. Bootstrap or reservation workflows that need multiple classes in one round trip may use `mcp__worldloom__allocate_many_ids(world_slug, allocations=[{id_class, story_slug?, audit_id?}, ...])`; each entry follows the same scope rules, the response preserves request order, and repeated entries for the same scope increment monotonically inside the batch. Allocation is per-class-directory post-SPEC-13 (one file = one record = trivial scan). Story-bundle-scoped classes require `story_slug`; sub-audit-scoped classes require `story_slug` plus `audit_id`.

Never reuse or overwrite an ID. If allocation would collide (concurrent plan), the patch engine's pre-apply validation or the workflow's final filename-collision check detects and aborts.

## Per-class registry

### World-scoped

- `CF-<integer>` — Canon Fact Records (`worlds/<slug>/_source/canon/CF-<integer>.yaml`)
- `CH-<integer>` — Change Log Entries (`worlds/<slug>/_source/change-log/CH-<integer>.yaml`; `CH-1` is always the genesis entry)
- `<INV-ID>` — Invariants (`worlds/<slug>/_source/invariants/<ID>.yaml`); IDs follow category convention: `ONT-<integer>` (ontological), `CAU-<integer>` (causal), `DIS-<integer>` (distribution), `SOC-<integer>` (social), `AES-<integer>` (aesthetic/thematic). New worlds use category-prefix + 1-based counter per category.
- `M-<integer>` — Mystery Reserve entries (`worlds/<slug>/_source/mystery-reserve/M-<integer>.yaml`)
- `OQ-<integer>` — Open Questions (`worlds/<slug>/_source/open-questions/OQ-<integer>.yaml`)
- `ENT-<integer>` — Named Entities (`worlds/<slug>/_source/entities/ENT-<integer>.yaml`)
- `SEC-<PREFIX>-<integer>` — Prose Sections (`worlds/<slug>/_source/<file-subdir>/SEC-<PREFIX>-<integer>.yaml`); prefix per file class: `ELF` (everyday life), `INS` (institutions), `MTS` (magic or tech systems), `GEO` (geography), `ECR` (economy and resources), `PAS` (peoples and species), `TML` (timeline)

### World-scoped hybrid / pipeline artifacts

- `PA-<integer>` — adjudication records (`worlds/<slug>/adjudications/`)
- `CHAR-<integer>` — character dossiers (stored in the dossier's frontmatter `character_id`; filenames use kebab-case slugs)
- `DA-<integer>` — diegetic artifacts (same pattern as characters)
- `PR-<integer>` — proposal cards (`worlds/<slug>/proposals/`)
- `BATCH-<integer>` — proposal batch manifests (`worlds/<slug>/proposals/batches/`)
- `EPE-<integer>` — pressure-event cards and their `EPE-*.proposal.md` sidecars (`worlds/<slug>/pressure-events/`)
- `NCP-<integer>` — character proposal cards (`worlds/<slug>/character-proposals/`)
- `NCB-<integer>` — character proposal batch manifests (`worlds/<slug>/character-proposals/batches/`)
- `AU-<integer>` — audit reports (`worlds/<slug>/audits/`)
- `RP-<integer>` — retcon-proposal cards (emitted by `continuity-audit` under its audit sub-directory)
- `NWP-<integer>` — world-proposal cards (root-scoped pre-world artifacts under root-level `world-proposals/`, not under `worlds/<slug>/`)
- `NWB-<integer>` — world-proposal batch manifests (root-scoped pre-world artifacts under root-level `world-proposals/batches/`, not under `worlds/<slug>/`)

### Story-bundle-scoped (allocate with `story_slug`)

- `SAU-<integer>` — story-bundle health audit reports (`worlds/<slug>/stories/<story-slug>/audits/SAU-<integer>-<date>.md`)
- `SP-<integer>` — story promotion ledgers and proposal-package sidecars (`worlds/<slug>/stories/<story-slug>/story-promotions/SP-<integer>.md` and `SP-<integer>-proposal-package.yaml`)
- `RSP-<integer>` — remediation-storylet proposal cards (`worlds/<slug>/stories/<story-slug>/audits/SAU-<integer>/remediation-storylet-proposals/RSP-<integer>-<slug>.md`; allocate with `story_slug` and `audit_id: SAU-<integer>`)

For the full set of story-bundle `_source/` record classes (STENT, SF, BEL, SE, etc.), see `.claude/skills/_shared-templates/story-state-contract.md` §4.

### Manual-story-scoped

Manual Story Studio (per SPEC-100 / SPEC-101 / SPEC-102 / SPEC-103) maintains a separate non-canon authoring surface at `worlds/<slug>/manual-stories/<slug>/`. Its record IDs use a **lowercase `m`-prefix** family deliberately segregated from world-canon and story-bundle uppercase classes — engine patterns at `tools/world-index/src/parse/story-directories.ts` (`^STENT-[0-9]+$`, `^STCHAR-[0-9]+$`, etc.) cannot match any lowercase `m`-prefix by case discipline. Manual-story IDs are NOT allocated via the `mcp__worldloom__allocate_*` family; allocation is performed by the Manual Studio backend (`tools/manual-story-studio/src/write/id-allocator.ts`) which scans the class directory and assigns `max(existing_numeric_suffix) + 1`. Gaps from hard-delete are preserved (the allocator does not reuse deleted IDs).

Records live at `worlds/<slug>/manual-stories/<manual-story-slug>/records/<class>/<prefix>-<integer>.yaml`, one file per record per class:

- `mchar-<integer>` — cast / characters (Manual Character Profile body; `cast/`)
- `ment-<integer>` — non-character entities (`entities/`)
- `mstat-<integer>` — statuses (`statuses/`)
- `mloc-<integer>` — locations (`locations/`)
- `mobj-<integer>` — objects (`objects/`)
- `mfact-<integer>` — branch-local facts (`facts/`)
- `mbel-<integer>` — beliefs (`beliefs/`)
- `mint-<integer>` — intentions (`intentions/`)
- `mplan-<integer>` — plans (`plans/`)
- `memo-<integer>` — emotions (`emotions/`)
- `mrel-<integer>` — relationships (`relationships/`)
- `mthr-<integer>` — threads (`threads/`)
- `mobl-<integer>` — obligations (`obligations/`)
- `mcnsq-<integer>` — consequences (`consequences/`)
- `mclock-<integer>` — clocks (`clocks/`)
- `msecret-<integer>` — secrets (`secrets/`)
- `mq-<integer>` — open questions (`questions/`)
- `martifact-<integer>` — artifacts (`artifacts/`)
- `mtemplate-<integer>` — beat templates (`beat-templates/`; schema landed in SPEC-104)
- `SEG-<integer>` — segments (`segments/SEG-<integer>.md` prose body + `segments/SEG-<integer>.yaml` sidecar; allocated by `tools/manual-story-studio/src/write/segment-id-allocator.ts`; per-manual-story append-only; gaps from hard-delete preserved). Format follows the FOUNDATIONS-002 unpadded natural-integer convention.
- `PROMPT-<integer>` — saved prompt artifacts (`prompts/PROMPT-<integer>.md` body + `prompt-runs/PROMPT-<integer>.yaml` sidecar; allocated by `tools/manual-story-studio/src/write/prompts.ts`; per-manual-story append-only; gaps from hard-delete preserved). Format follows the FOUNDATIONS-002 unpadded natural-integer convention.

The manual-story `manual-story.yaml` metadata file is not an ID-bearing record (it is a per-manual-story control file; one per manual-story slug).
