# Implementation Order — Structure-Aware Retrieval & Surgical Edits

This document sequences the active spec bundle (`SPEC-01` through `SPEC-12`, plus `SPEC-08` / `SPEC-09`) for implementation. It is distinct from the **read order** (in which a reviewer encounters the specs) and follows the phased rollout defined in `SPEC-08`.

## Design read order (for reviewers)

`SPEC-01` → `SPEC-10` → `SPEC-11` → `SPEC-02` → `SPEC-12` → `SPEC-03` → `SPEC-04` → `SPEC-05` → `SPEC-06` → `SPEC-07` → `SPEC-08` → `SPEC-09`

This order builds conceptual understanding for the structure-aware retrieval bundle: foundation (index), then the entity-surface remediation that corrects the index's precision model, then the authority-surface remediation that makes canonical-entity completeness explicit and machine-readable, then the read surface (MCP), then the retrieval-reliability remediation that adds scoped references, structured cross-record locality, and packet-completeness discipline for downstream skills, then write surface (engine + validators), then enforcement (hooks), then consumption (skill rewrites), then contract updates (docs), then sequencing (migration plan). SPEC-09 is read last as an independent canon-safety expansion that depends on the bundle's validator framework and canon-addition rewrite but is not part of the retrieval bundle's architectural arc.

## Implementation order (for builders)

### Phase 0 — Prep (Completed 2026-04-22)

1. Land this spec bundle in `specs/` (completed)
2. Create `tools/` directory tree scaffold (completed)
3. Update `.gitignore` (completed):
   - `worlds/*/_index/`
   - `worlds/*/_source/`
   - `tools/*/dist/`
   - `tools/*/node_modules/`
   - `tools/world-mcp/.secret`
   - `tools/hooks/logs/`
4. Create `.claude/settings.json.example` (completed)

**Completion gate**: Passed on 2026-04-22 via Phase 0 structural acceptance check:
- `specs/` bundle present, including `IMPLEMENTATION-ORDER.md` and `SPEC-08`
- `tools/` scaffold present with `world-index`, `world-mcp`, `patch-engine`, `validators`, and `hooks`
- `.claude/settings.json.example` present
- `.gitignore` contains all Phase 0 machine-layer ignore entries

### Phase 1 — Read Path + canon-addition Pilot

Parallelizable order (within each tier, items may proceed in parallel):

**Tier 1 (no dependencies)**:
- `SPEC-01` World Index — completed 2026-04-22; implementation landed at `tools/world-index/`, spec archived at `archive/specs/SPEC-01-world-index.md`
- `SPEC-07 Part A` docs updates — completed 2026-04-23; implementation landed at `docs/FOUNDATIONS.md`, `CLAUDE.md`, `docs/HARD-GATE-DISCIPLINE.md`, `docs/WORKFLOWS.md`, `docs/MACHINE-FACING-LAYER.md`, and `docs/CONTEXT-PACKET-CONTRACT.md`

**Tier 1.5 (depends on SPEC-01)**:
- `SPEC-10` Entity Surface Redesign — completed 2026-04-23; implementation landed via `archive/tickets/SPEC10ENTSUR-001.md`, `archive/tickets/SPEC10ENTSUR-007.md`, and `archive/tickets/SPEC10ENTSUR-008.md`; spec archived at `archive/specs/SPEC-10-entity-surface-redesign.md`

**Tier 1.75 (depends on Tier 1.5)**:
- `SPEC-11` Canonical Entity Authority Surfaces — completed 2026-04-23; implementation landed via `archive/tickets/SPEC11CANENT-001.md`, `archive/tickets/SPEC11CANENT-002.md`, `archive/tickets/SPEC11CANENT-003.md`, and `archive/tickets/SPEC11CANENT-004.md`; spec archived at `archive/specs/SPEC-11-canonical-entity-authority-surfaces.md`

**Tier 2 (depends on Tier 1.5)**:
- `SPEC-02` MCP Retrieval Server — completed 2026-04-24; implementation landed at `tools/world-mcp/`, with `submit_patch_plan` intentionally stubbed per the Phase 1 contract; spec archived at `archive/specs/SPEC-02-retrieval-mcp-server.md`
- `SPEC-05 Part A` Hooks 1, 2, 4 (read-side + subagent) — completed 2026-04-24; implementation landed at `tools/hooks/` and `.claude/settings.json.example`; Hooks 3 and 5 remain Phase 2 work

**Tier 2.25 (depends on Tier 2)**:
- `SPEC-12` Skill-Reliable Retrieval — proposed; must land before downstream skills treat the current MCP surface as production-ready. Scope: scoped references, structured cross-record edges, trust-tier-aware ranking, and packet-v2 completeness discipline.

**Tier 3 (depends on Tier 2.25)**:
- `SPEC-06 Part A` canon-addition read-side rewrite

**Phase 1 completion gate**: `SPEC-08 Phase 1 acceptance criteria` pass. Specifically:
- `world-index build animalia` succeeds
- `world-validate animalia --structural` reports zero fails
- Sample canon-addition run on animalia: ≥50% token reduction vs baseline
- Hook 2 blocks ≥1 raw `Read CANON_LEDGER.md` during the test run
- Sibling skills continue to work unchanged

### Phase 2 — Write Path + All-Skill Migration

Parallelizable order:

**Tier 1 (no new dependencies beyond Phase 1)**:
- `SPEC-04` Validator Framework — shippable as CLI first, integrated into engine after
- `SPEC-07 Part B` docs updates (HARD-GATE-DISCIPLINE.md write-order rewrite; CLAUDE.md phrasing refinement)

**Tier 2 (depends on Tier 1)**:
- `SPEC-03` Patch Engine — requires SPEC-04 for pre-apply gate
- `SPEC-02` update: enable `submit_patch_plan` (previously stubbed); wire through to `SPEC-03`

**Tier 3 (depends on Tier 2)**:
- `SPEC-05 Part B` Hooks 3, 5 (edit-side + auto-validate)
- `SPEC-06 Part B` canon-addition write-side completion

**Tier 4 (depends on Tier 3)**:
- `SPEC-06 Part B continued` — remaining 7 skill rewrites:
  - Suggested sub-order (may parallelize within):
    1. `create-base-world` (lightest; good second pilot)
    2. `character-generation` + `diegetic-artifact-generation` (similar pattern)
    3. `propose-new-canon-facts` + `canon-facts-from-diegetic-artifacts` (similar pattern)
    4. `propose-new-characters` (biggest; best done last once pattern is proven)
    5. `continuity-audit` (complex reasoning; done last for main-orchestrator side)

**Phase 2 completion gate**: `SPEC-08 Phase 2 acceptance criteria` pass. Specifically:
- All 8 skills end-to-end via engine
- Canon-addition large delivery: zero raw Edit; Hook 3 denies 100% of raw attempts on protected surfaces
- `world-validate animalia --all` reports zero Rule 1–7 fails
- ≥70% token reduction vs Phase 0 baseline
- Atomicity injection tests pass
- Concurrency test passes

### Phase 2.5 — Canon-Safety Expansion (independent track, SPEC-09)

Lands after Phase 2 completes, or in parallel with Phase 3 if pursued. Independent of the structure-aware retrieval bundle's read-path / write-path sequencing; depends only on SPEC-04 (validator framework) and SPEC-06 (canon-addition rewrite) from the bundle.

Order (single tier; internal parallelization minimal):

1. **FOUNDATIONS.md edits** (Rules 11 & 12, two conditionally-mandatory CF schema blocks, six new relation types, Default Reality paragraph, genesis-world clause)
2. **canon-addition skill updates** (Tests 11 & 12, template extension, Phase 12 block-authoring)
3. **continuity-audit skill updates** (Silent-Area Canonization check)
4. **diegetic-artifact-generation template cleanup** (`statement_of_existence`, explicit `world_relation` block)
5. **SPEC-04 validator additions** (`validator-rule-11-action-space`, `validator-rule-12-redundancy`)
6. **docs/WORKFLOWS.md pointer** for the new tests

**Phase 2.5 completion gate**: `SPEC-09 Verification` checks 1–12 pass. Specifically:
- `world-validate animalia --all` reports zero new failures on historical CFs (grandfather clause holds structurally)
- Synthetic capability CF without `exception_governance` FAILS Test 12
- Synthetic geography CF with `exception_governance: { n_a: "..." }` PASSES
- Bare `n_a: "not applicable"` FAILS regex-and-taxonomy check
- `create-base-world` genesis test world emits CF-0001 with both blocks correctly populated or N/A'd per fact-type

### Phase 3 — Optional: Atomic Source for CF/CH Records (conditional)

Only ship after Phase 2 stable ≥4 weeks AND user separate approval.

1. Build atomization tooling at `tools/source-migration/`
2. Implement engine's `compile_ledger` post-step
3. One-time animalia migration script
4. `SPEC-07 Part C` FOUNDATIONS.md schema updates
5. Verify byte-identical round-trip on animalia

**Phase 3 completion gate**: `SPEC-08 Phase 3 acceptance criteria` pass.

### Phase 4 — Deferred: High-Churn Prose Fragmentization

Separate spec (not in this bundle). Ship only if Phase 3 proven AND user separate approval.

## Cross-phase dependency tree

```
Phase 0 (Prep)
  │
  ├── tools/ scaffold ─────────┐
  ├── .gitignore updates       │
  └── specs/ bundle            │
                               ▼
Phase 1 (Read Path)
  │
  ├── SPEC-01 World Index ─────────┐
  │                                ▼
  ├── SPEC-10 Entity Surface Redesign ─┤
  │                                ▼
  ├── SPEC-11 Canonical Entity Authority Surfaces ─┤
  │                                ▼
  ├── SPEC-02 MCP Server ──────────┤
  │                                ▼
  ├── SPEC-12 Skill-Reliable Retrieval ─┤
  │                                ▼
  ├── SPEC-05 Hooks 1,2,4 ─────────┤
  │                                ▼
  ├── SPEC-07 Part A (docs) ──────┤
  │                                ▼
  └── SPEC-06 Part A (canon-addition read) ─┐
                                             ▼
Phase 2 (Write Path)
  │
  ├── SPEC-04 Validators ──────────┐
  │                                ▼
  ├── SPEC-03 Patch Engine ────────┤
  │                                ▼
  ├── SPEC-02 submit_patch_plan ───┤
  │                                ▼
  ├── SPEC-05 Hooks 3,5 ───────────┤
  │                                ▼
  ├── SPEC-07 Part B (docs) ──────┤
  │                                ▼
  └── SPEC-06 Part B (7 skills + canon-addition writes) ─┐
                                                         ▼
Phase 2.5 (Canon-Safety Expansion, SPEC-09) — independent; depends on SPEC-04 + SPEC-06
  │
  ├── FOUNDATIONS.md edits (Rules 11/12, schema blocks, relations, default-reality paragraph)
  ├── canon-addition skill updates (Tests 11/12, template, Phase 12 block authoring)
  ├── continuity-audit skill update (silent-area-canonization check)
  ├── diegetic-artifact-generation template cleanup
  ├── SPEC-04 validator additions (validator-rule-11-action-space, validator-rule-12-redundancy)
  └── docs/WORKFLOWS.md pointer

                                                         ▼
Phase 3 (Optional: Atomic Source) — separate approval
  │
  ├── Atomization tooling
  ├── Engine compile_ledger step
  ├── Animalia migration
  └── SPEC-07 Part C (docs)  ← rebases onto SPEC-09's extended schema

Phase 4 (Deferred: Prose Fragmentization) — separate spec + approval
```

## Expected calendar

Estimates assume a single builder working at ~half-time; scale accordingly.

- **Phase 0**: 1 session (spec bundle landed; gitignore; scaffold)
- **Phase 1**: 5–7 sessions
  - SPEC-01 (index + parser + CLI): 2 sessions
  - SPEC-10 (entity-surface remediation): 0.5–1 session
  - SPEC-02 (MCP server + tools): 1 session
  - SPEC-12 (retrieval reliability + packet-v2): 1–2 sessions
  - SPEC-05 Part A (3 hooks): 1 session
  - SPEC-06 Part A (canon-addition read-side): 1 session
  - SPEC-07 Part A (docs): completed 2026-04-23 in parallel with Phase 1 code work
  - Animalia bootstrap + measurement: 0.5 session
- **Phase 2**: 6–10 sessions
  - SPEC-04 (14 validators): 2 sessions
  - SPEC-03 (patch engine + 13 ops): 2 sessions
  - SPEC-05 Part B (2 hooks): 0.5 session
  - SPEC-06 Part B (7 skills + canon-addition writes): 3–4 sessions
  - SPEC-07 Part B: 0.5 session
  - Animalia re-validation + cleanup: 1 session
- **Phase 3** (if pursued): 2–3 sessions
- **Phase 4** (deferred): TBD

## Measurement baseline

Before Phase 1 begins, capture baseline measurements on animalia:
- Tool-input tokens for a representative canon-addition run (narrow proposal + large delivery; average)
- Elapsed time per phase
- Number of Edit tool calls per delivery
- Maximum context-window usage in a large delivery

These baseline numbers anchor the ≥50% (Phase 1) and ≥70% (Phase 2) reduction targets.

## Risk-adjusted re-sequencing options

If Phase 1 reveals that Hook 2 is too aggressive (false-positives on legitimate reads), SPEC-05 Part A may tighten thresholds before proceeding to Phase 2.

If SPEC-06 Phase 2 skill rewrites reveal systematic reasoning gaps (judgment being lost), pause Phase 2 and revisit SPEC-06's "what stays in each skill" table.

If Phase 2 acceptance criteria fall short of ≥70%, investigate whether further token-reduction wins live in the context-packet budget tuning (SPEC-02) rather than in deeper mechanism moves.

## Deliverable status

| Spec | Status |
|---|---|
| SPEC-01 World Index | ✓ implemented 2026-04-22; archived at `archive/specs/SPEC-01-world-index.md` |
| SPEC-02 Retrieval MCP Server | ✓ implemented 2026-04-24; archived at `archive/specs/SPEC-02-retrieval-mcp-server.md` |
| SPEC-03 Patch Engine | ✓ specified |
| SPEC-04 Validator Framework | ✓ specified |
| SPEC-05 Hooks Discipline | Part A implemented 2026-04-24 at `tools/hooks/` and `.claude/settings.json.example`; Part B remains specified |
| SPEC-06 Skill Rewrite Patterns | ✓ specified |
| SPEC-07 Docs Updates | Part A implemented 2026-04-23 at `docs/FOUNDATIONS.md`, `CLAUDE.md`, `docs/HARD-GATE-DISCIPLINE.md`, `docs/WORKFLOWS.md`, `docs/MACHINE-FACING-LAYER.md`, and `docs/CONTEXT-PACKET-CONTRACT.md`; Parts B and C remain specified |
| SPEC-08 Migration & Phasing | ✓ specified |
| SPEC-09 Canon-Safety Expansion | ✓ specified (independent; depends on SPEC-04, SPEC-06) |
| SPEC-10 Entity Surface Redesign | ✓ implemented 2026-04-23; archived at `archive/specs/SPEC-10-entity-surface-redesign.md` |
| SPEC-11 Canonical Entity Authority Surfaces | ✓ implemented 2026-04-23; archived at `archive/specs/SPEC-11-canonical-entity-authority-surfaces.md` |
| SPEC-12 Skill-Reliable Retrieval | proposed; active at `specs/SPEC-12-skill-reliable-retrieval.md` |
| IMPLEMENTATION-ORDER.md (this file) | ✓ delivered |

SPEC-01 through SPEC-08 are the Phase 0 deliverable of the brainstorm session captured in `brainstorming/structure-aware-retrieval.md`. SPEC-09 is the deliverable of a separate triage brainstorm over `brainstorming/foundational-improvements.md` (external worldbuilding review), sequenced as Phase 2.5 above. SPEC-10, SPEC-11, and SPEC-12 are later architectural remediations of the original read-path contract: first the broad heuristic entity surface was narrowed, then canonical authority surfaces were made explicit, and now downstream-skill retrieval reliability is being formalized as a separate scoped-reference and packet-completeness layer.
