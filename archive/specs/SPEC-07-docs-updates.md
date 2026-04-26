<!-- spec-drafting-rules.md not present; using default structure: Problem Statement, Approach, Deliverables, FOUNDATIONS Alignment, Verification, Out of Scope, Risks & Open Questions. -->

# SPEC-07: FOUNDATIONS.md, CLAUDE.md, and Pipeline Docs Updates

**Phase**: Part A in Phase 1 (foundational additions, **complete 2026-04-23**); Part B in Phase 2 (edit-side updates, **complete 2026-04-26**); ~~Part C in Phase 3~~ **— Part C retired per SPEC-13**
**Depends on**: SPEC-01 through SPEC-06, **SPEC-13 (atomic-source contract — SPEC-13 handles its own FOUNDATIONS revision directly)**
**Blocks**: SPEC-08 Phase 1 acceptance (contract must be updated before skills reference new mechanisms)

## Status (2026-04-26)

All landable parts implemented:
- **Part A** — shipped 2026-04-23 against `docs/FOUNDATIONS.md`, `CLAUDE.md`, `docs/HARD-GATE-DISCIPLINE.md`, `docs/WORKFLOWS.md`, plus the two new docs `docs/MACHINE-FACING-LAYER.md` and `docs/CONTEXT-PACKET-CONTRACT.md`.
- **Part B** — shipped 2026-04-26: `docs/HARD-GATE-DISCIPLINE.md` §Why write order matters rewritten for the post-SPEC-13 3-tier engine ordering (create-all → update-all → adjudication; two-phase commit; per-world write lock) and §Execution pattern step 6 de-hedged for the now-Phase-2-complete engine path; `CLAUDE.md` §Non-Negotiables refined to acknowledge structural enforcement of HARD-GATE via Hook 3 + approval-token discipline (with the prose non-negotiable retained for cases where mechanism is absent), and the `_source/` engine-only surface bullet refined to distinguish Hook-3-blocked `.yaml` records from prescriptively-engine-routed hybrid artifacts.
- **Part C** — retired per SPEC-13 §D; FOUNDATIONS.md atomic-source revision was authored directly by SPEC-13 Stream A.

The "Why write order matters" example block in §Part B below preserves the pre-SPEC-13-amendment draft prose (with the monolithic-ledger sub-sequence `(a)/(b)/(c)`) for traceability of what changed; the as-shipped text in `docs/HARD-GATE-DISCIPLINE.md` reflects the SPEC-13 amendment summary's 3-tier ordering. Read the as-shipped doc for current truth, not this spec's literal example.

## SPEC-13 amendment summary

- **Part C retired.** The pre-SPEC-13 Part C covered FOUNDATIONS.md schema updates for Phase 3 compiled-ledger-from-atomic-source (`worlds/<slug>/_source/canon/CF-NNNN.yaml` paired with compiled `CANON_LEDGER.md`). SPEC-13 supersedes this: FOUNDATIONS.md revision for atomic-source storage (§Mandatory World Files reclassification, new §Canonical Storage Layer, §Canon Fact Record Schema storage note) is authored directly by SPEC-13 Stream A, not by a future Part C.
- **Part B content updated.** The `HARD-GATE-DISCIPLINE.md` write-order rewrite targets the **post-SPEC-13 3-tier engine ordering** (create-all → update-all → adjudication), not the pre-SPEC-13 monolithic-ledger sub-sequence. CLAUDE.md Non-Negotiables Hook 3 phrasing refinement covers `_source/` discipline, not compiled-file protection.
- **Part A already landed.** The §Machine-Facing Layer addition, §Mandatory World Files initial note (which SPEC-13 replaces), §Tooling Recommendation upgrade, CLAUDE.md repository-layout and non-negotiables updates, HARD-GATE-DISCIPLINE.md approval-token discipline, WORKFLOWS.md CLI section, and the two new docs (`docs/MACHINE-FACING-LAYER.md`, `docs/CONTEXT-PACKET-CONTRACT.md`) all shipped on 2026-04-23.

## Problem Statement

`docs/FOUNDATIONS.md` is the project's "non-negotiable design contract" (per `CLAUDE.md` §Authoritative Source of Truth). Today it describes a prose-and-YAML pipeline in terms of principles (Canon Layers, Validation Rules, Change Control Policy, Tooling Recommendation). After SPEC-01 through SPEC-06 land, the contract describes a prose-and-YAML pipeline **with a machine-facing layer** where the non-negotiables (gate discipline, append-only ledger, Rule 6 audit trail) are **structurally enforced rather than prose-asserted**. The contract must reflect that or skills and code drift apart.

`CLAUDE.md` is the Claude Code project-instructions file. Its non-negotiables currently include "never bypass a HARD-GATE" and "never skip FOUNDATIONS.md" — both become structurally enforced by SPEC-03 + SPEC-05. The guidance must be updated to describe the new mechanism (and retain the prose non-negotiable for any case where mechanism is bypassed or absent).

`docs/HARD-GATE-DISCIPLINE.md` describes write-order discipline as a skill-side responsibility. After SPEC-03, order is engine-enforced; the doc must reflect that.

`docs/WORKFLOWS.md` is the user-facing quick-reference for invoking skills. Post-migration, users have new CLI commands (`world-index`, `world-validate`) to know about.

## Approach

Concrete edits to four existing docs; two new docs. Changes split into three parts aligned to migration phases.

## Deliverables

### Part A — Phase 1 updates (ship with SPEC-01/02/05-read-side/06-pilot)

#### `docs/FOUNDATIONS.md`

**New section** inserted after existing §Tooling Recommendation (currently the last section):

```markdown
---

## Machine-Facing Layer

The "LLM agents should never operate on prose alone" commitment (§Tooling Recommendation) is realized by a machine-facing layer beside the human-facing markdown. Layers (from bottom up):

1. **World Index** (`worlds/<slug>/_index/world.db`) — SQLite + FTS5; parsed nodes, typed edges, entity mentions, anchor checksums. Derived, deterministic, regenerable from markdown.
2. **Retrieval MCP Server** (`mcp__worldloom__*` tools) — structured read API; returns 5-layer context packets instead of raw files.
3. **Patch Engine** (`mcp__worldloom__submit_patch_plan`) — deterministic applier with 13 typed ops, anchor-hash anchoring, two-phase commit, engine-auto-stamped attribution. Append-only vocabulary (no `replace_cf_record`, no `delete_*`).
4. **Validator Framework** (`world-validate` CLI; engine pre-apply gate; Hook 5 post-apply) — executable enforcement of Rules 1–7 and structural invariants (id uniqueness, anchor integrity, attribution compliance, modification_history retrofit).
5. **Hooks** (`.claude/settings.json`) — PreToolUse Read guards; PreToolUse Edit/Write guards; UserPromptSubmit context preface; SubagentStart localization bootstrap; PostToolUse auto-validate.

Every "skills should always receive X" item in §Tooling Recommendation is now delivered by `mcp__worldloom__get_context_packet(task_type, seed_nodes, token_budget)`. The packet's five layers (task header, nucleus, envelope, constraints, suggested impact surfaces) are documented in `docs/CONTEXT-PACKET-CONTRACT.md`.

For operational details see `docs/MACHINE-FACING-LAYER.md`.
```

**§Mandatory World Files** — add note at end of list:

```markdown
> **Derived artifacts**: `worlds/<slug>/_index/world.db` is a derived, gitignored artifact produced by `world-index build`. `worlds/<slug>/_source/` is reserved for Phase 3 atomic source files (CF-NNNN.yaml, CH-NNNN.yaml). Neither is a mandatory world file in the human-facing sense; both are machine-facing infrastructure.
```

**§Tooling Recommendation** — upgrade closing paragraph:

```markdown
This is non-negotiable. The context-packet API (§Machine-Facing Layer, `mcp__worldloom__get_context_packet`) is how skills receive these inputs — a raw-file-read approach is insufficient because it cannot enforce the list's completeness.
```

#### `CLAUDE.md`

**§Repository Layout** — add:

```
tools/                           ← machine-facing layer (gitignored dist/; sources tracked)
  ├── world-index/               ← SQLite-backed index builder (SPEC-01)
  ├── world-mcp/                 ← MCP retrieval server (SPEC-02)
  ├── patch-engine/              ← deterministic patch applier (SPEC-03)
  ├── validators/                ← executable Rule 1-7 + structural validators (SPEC-04)
  └── hooks/                     ← Claude Code hooks (SPEC-05)
.claude/settings.json            ← hook configuration
worlds/<world-slug>/
  ├── _index/world.db            ← derived index artifact (gitignored)
  └── _source/                   ← reserved for Phase 3 atomic source
```

**§Skill Architecture** — add subsection at end:

```markdown
### Machine-facing layer integration

Post-Phase-2, all canon-mutating and canon-reading skills integrate with the machine-facing layer:
- **Pre-flight**: `mcp__worldloom__allocate_next_id` (replaces grep+scan) and `mcp__worldloom__get_context_packet` (replaces eager multi-file load)
- **Localization**: `mcp__worldloom__search_nodes`, `get_node`, `get_neighbors`, `find_named_entities`, `find_impacted_fragments`
- **Mutations**: `mcp__worldloom__submit_patch_plan` (replaces direct Edit/Write)
- **Validation**: Rules 1–7 enforced by `tools/validators/`; skills call `validate_patch_plan` at Phase 14a-equivalent

The three skill categories (canon-mutating / canon-reading / meta) remain load-bearing. Meta skills (`brainstorm`, `skill-creator`, etc.) do not use the machine-facing layer.
```

**§Non-Negotiables** — add two new items:

```markdown
- **Never bypass the patch engine for world-level edits.** `worlds/<slug>/` mandatory files + `characters/` + `diegetic-artifacts/` + `adjudications/` are engine-only surfaces (Hook 3 blocks direct Edit/Write). The only way to mutate them is `mcp__worldloom__submit_patch_plan` with a valid `approval_token`.
- **Never Read world-level files past the size threshold.** Hook 2 blocks full reads of `CANON_LEDGER.md` (always) and other protected files when >300 lines. Use `mcp__worldloom__get_context_packet` or `mcp__worldloom__get_node` instead. The `ALLOW_FULL_READ` override exists for human-driven review, not for skill convenience.
```

**§ID Allocation Conventions** — update:

```markdown
IDs are append-only, allocated at pre-flight via `mcp__worldloom__allocate_next_id(world_slug, id_class)`, which scans the world index's existing nodes for the highest id of that class and returns the next. Never reuse or overwrite an ID; if an allocation would collide (concurrent run), the patch engine's pre-apply validation detects and aborts.
```

#### `docs/HARD-GATE-DISCIPLINE.md`

**§Execution pattern** — revise step 6 and 7:

```markdown
6. **Write via patch engine** — HARD-GATE user approval produces an `approval_token`; the skill assembles a patch plan and submits via `mcp__worldloom__submit_patch_plan(plan, approval_token)`. The engine enforces write order internally (domain files → adjudication record → ledger in strict sub-order) — skills no longer need to sequence Write/Edit calls by hand.
7. **Never `git commit` from inside a skill** — engine writes land in the working tree; the user reviews the diff and commits.
```

**New subsection** §Approval token discipline, inserted before §Auto Mode does not relax gates:

```markdown
## Approval token discipline

At HARD-GATE approval, the MCP server issues an `approval_token` tied to the exact bytes of the presented patch plan. The token is:
- Single-use (recorded in `approval_tokens_consumed` after consumption)
- Expiry-bound (5 minutes from issuance)
- Signature-bound (HMAC over plan hashes; tamper → rejection)

A skill cannot submit a different plan than the one the user approved. If the plan changes between approval and submit, the skill must re-present and obtain a fresh token.
```

#### `docs/WORKFLOWS.md`

**Add new section** §Machine-facing layer CLI at end:

```markdown
## Machine-facing layer CLI

- **Build or refresh a world's index**: `world-index build <world-slug>` (full rebuild) or `world-index sync <world-slug>` (incremental). Required before any skill can use the index.
- **Inspect index state**: `world-index stats <world-slug>` for node counts; `world-index inspect <node-id>` for a single node.
- **Validate a world's state**: `world-validate <world-slug>` runs all validators; `--structural` for structural only; `--rules=1,6` for a subset.
- **MCP server**: started automatically by Claude Code per `.mcp.json`. Multi-world — one server serves all worlds. If a skill reports stale-index errors, run `world-index sync <world-slug>`.
```

### Part B — Phase 2 updates (ship with SPEC-03/04/05-edit-side/06-full-migration)

#### `docs/HARD-GATE-DISCIPLINE.md` — further updates

Partial-failure semantics section must be rewritten to describe engine atomicity:

```markdown
## Why write order matters (engine-enforced)

The engine enforces a write order internally:
1. All domain-file ops
2. `append_adjudication_record` (PA-NNNN file)
3. `CANON_LEDGER.md` in strict sub-order: (a) in-place CF qualifications, (b) new CF records, (c) Change Log Entry

Because the engine applies all ops atomically (two-phase commit with temp-file-rename), intermediate states never hit disk. The ordering is a recovery guarantee for the index-sync step: if sync is interrupted after engine commit, the ledger's append-last structure makes re-sync converge cleanly. Skills no longer need the inter-step structural-integrity grep checkpoints that lived in earlier `canon-addition` reference material — the engine's atomicity makes partial-apply structurally impossible.
```

#### `CLAUDE.md` — Non-Negotiables finalization

Once Hook 3 is live, the prose non-negotiable "Never bypass a HARD-GATE" is still important (as a principle that applies even where hooks aren't active, e.g., during skill development), but it's no longer the primary enforcement. Revise phrasing to acknowledge both:

```markdown
- **Never bypass a HARD-GATE.** Structurally enforced by Hook 3 + approval_token discipline for all canon-mutating skills. The prose non-negotiable remains authoritative for any case where mechanism is absent (new skills in development, worlds without an index, repos without hooks configured).
```

### Part C — RETIRED per SPEC-13

Part C previously covered FOUNDATIONS.md schema updates for a Phase 3 world in which `CANON_LEDGER.md` would be a compiled artifact derived from `_source/canon/` and `_source/change-log/`. SPEC-13 supersedes this design: compiled views don't exist post-migration — `_source/` is the sole canonical form for canon, change log, invariants, mystery reserve, open questions, entities, and prose sections. Rather than landing Part C later as originally planned, SPEC-13 Stream A authors the FOUNDATIONS.md revision directly (§Mandatory World Files reclassification, new §Canonical Storage Layer subsection, §Canon Fact Record Schema storage note). See SPEC-13 §D.

### New docs

#### `docs/MACHINE-FACING-LAYER.md` (Phase 1)

Architectural explainer covering:
- What each of the five layers does (referencing respective specs)
- How they compose (data flow diagram from SPEC-01)
- When to reach for which layer (troubleshooting table)
- Where to find implementation details (pointers to tools/)
- Rollback posture (remove `_index/`, hooks pass through; engine unused; system gracefully degrades to current behavior)

Target length: ≤150 lines. High-level, not a re-spec.

#### `docs/CONTEXT-PACKET-CONTRACT.md` (Phase 1)

Formal 5-layer contract:
- Task header schema
- Nucleus semantics (nodes unquestionably relevant)
- Envelope semantics (minimal surrounding context)
- Constraints semantics (active validator rules, prohibited surfaces, output schema, budget)
- Suggested impact surfaces semantics

Includes examples of packets for canon-addition, character-generation, continuity-audit. Stable across worldloom versions — any change requires a major version bump.

Target length: ≤200 lines.

### Docs update summary table

| Doc | Part A (Phase 1, COMPLETE 2026-04-23) | Part B (Phase 2, COMPLETE 2026-04-26) | Part C (RETIRED per SPEC-13) |
|---|---|---|---|
| `docs/FOUNDATIONS.md` | New §Machine-Facing Layer; §Mandatory World Files initial note; §Tooling Recommendation upgrade | — | Retired — superseded by SPEC-13 §D (§Mandatory World Files reclassification, new §Canonical Storage Layer, §Canon Fact Record Schema storage note) |
| `CLAUDE.md` | §Repository Layout tools/ tree; §Skill Architecture machine-layer subsection; §Non-Negotiables two new items; §ID Allocation update | §Non-Negotiables HARD-GATE bullet refined (Hook 3 + approval-token structural enforcement; prose retained for absent-mechanism cases); `_source/` engine-only-surfaces bullet refined (distinguish Hook-3-blocked `_source/<subdir>/*.yaml` from prescriptively-engine-routed hybrid artifacts) | Retired |
| `docs/HARD-GATE-DISCIPLINE.md` | §Execution pattern step 6/7 revision; new §Approval token discipline | §Execution pattern step 6 de-hedged (engine path is now the active mutation path post-Phase-2); §Why write order matters rewrite for post-SPEC-13 3-tier engine ordering (create-all → update-all → adjudication), two-phase commit semantics, per-world write lock, and explicit deletion of phase-15a inter-step grep checkpoints | Retired |
| `docs/WORKFLOWS.md` | New §Machine-facing layer CLI section | — | Retired |
| `docs/MACHINE-FACING-LAYER.md` | **New doc** (shipped 2026-04-23) | — | Retired |
| `docs/CONTEXT-PACKET-CONTRACT.md` | **New doc** (shipped 2026-04-23) | — | Retired |

## FOUNDATIONS Alignment

This spec *is* the FOUNDATIONS update. Alignment table applies reflexively: every claim the code makes must be mirrored in FOUNDATIONS (so skills can still cite FOUNDATIONS as authoritative). Specifically:
- §Tooling Recommendation remains authoritative; upgrade is clarification, not replacement
- §Change Control Policy is unchanged semantically; patch plans are a new implementation of the same commitment
- Rules 1–7 are unchanged; validators are their executable form
- §Mandatory World Files count (13) is unchanged Phase 1–2; Phase 3 adds `_source/` as machine-facing infrastructure but the 13 human-facing files are preserved

## Verification

- **Part A acceptance** — **MET 2026-04-23**. CLAUDE.md's non-negotiables describe machine-facing enforcement; FOUNDATIONS's §Machine-Facing Layer cross-references SPEC-01 through SPEC-05.
- **Part B acceptance** — **MET 2026-04-26**. `docs/HARD-GATE-DISCIPLINE.md` no longer instructs skills to sequence Phase 15a writes by hand: §Execution pattern step 6 routes through `mcp__worldloom__submit_patch_plan(plan, approval_token)`; §Why write order matters describes the engine's 3-tier ordering, two-phase commit, per-world write lock, and explicitly notes that the phase-15a inter-step structural-integrity grep checkpoints are deleted because engine atomicity makes partial-apply structurally impossible. `CLAUDE.md` §Non-Negotiables HARD-GATE bullet acknowledges Hook 3 + approval-token structural enforcement while retaining the prose non-negotiable for absent-mechanism cases; the `_source/` engine-only-surfaces bullet truthfully distinguishes Hook-3-blocked `_source/<subdir>/*.yaml` from prescriptively-engine-routed hybrid artifacts.
- **Part C acceptance** — **RETIRED per SPEC-13**. FOUNDATIONS.md atomic-source revision (§Mandatory World Files reclassification, new §Canonical Storage Layer, §Canon Fact Record Schema storage note) was authored directly by SPEC-13 Stream A.
- **Doc consistency check** — run a manual `grep` for references to deprecated patterns (phase-15a-checkpoint grep; Large-file method prose; "always Read WORLD_KERNEL.md") — any hit must have an updated replacement or an explicit deprecation note. Closed via SPEC-06 static-audit capstone (`docs/triage/2026-04-26-spec06-phase2-static-acceptance.md`) which verified zero retired-monolith references in the eight rewritten skills' prose.
- **New doc review** — MACHINE-FACING-LAYER.md and CONTEXT-PACKET-CONTRACT.md reviewed against SPEC-01 through SPEC-05 for technical accuracy as part of Part A landing.

## Out of Scope

- Doc translation (docs are English-only)
- Diagram tooling (ASCII diagrams are sufficient)
- API reference generation (MCP tool schemas live in SPEC-02; no separate auto-generated reference needed)
- Historical doc archival beyond git history

## Risks & Open Questions

- **Part A must land before skill rewrites**: a rewritten skill citing `mcp__worldloom__get_context_packet` against a FOUNDATIONS that doesn't mention it creates a consistency gap. Mitigation: SPEC-08 sequences Part A first in Phase 1.
- **CLAUDE.md length**: additions push the file past existing size. Mitigation: compress existing non-negotiables if crowded; use subsection links to this spec's sibling specs.
- **Doc drift over time**: new specs in Phase 3+ may require more edits. Mitigation: this spec is versioned alongside code; revise with each architectural phase.
- **Machine-facing layer doc vs SPEC-08**: MACHINE-FACING-LAYER.md overlaps with SPEC-08's rollout narrative. Mitigation: MACHINE-FACING-LAYER.md is the steady-state operational guide; SPEC-08 is the transition plan; cross-reference.
