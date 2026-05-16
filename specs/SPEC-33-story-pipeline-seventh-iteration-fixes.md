<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-33 — Story Pipeline Seventh-Iteration Fixes

**Status**: ACTIVE
**Date**: 2026-05-16
**Supersedes**: none
**Companion triage**: `docs/triage/2026-05-16-story-related-improvements-seventh-iteration-triage.md`

## Problem Statement

`reports/story-related-improvements-seventh-iteration.md` is the seventh external review (ChatGPT-Pro, no codebase access — only `docs/FOUNDATIONS.md`, the four shared contract docs at `docs/CONTEXT-PACKET-CONTRACT.md` / `docs/HARD-GATE-DISCIPLINE.md` / `docs/MACHINE-FACING-LAYER.md` / the shared story-state contract under `.claude/skills/_shared-templates/`, and the seven story-pipeline SKILL.md files). It evaluated 11 numbered findings (6 P1, 5 P2, 0 P0) plus 10 proposed amendments (A1–A10), a multi-tier validator/test plan (§11), a research-synthesis section (§12), and an anti-recommendations list (§13). The auditor's executive verdict is that the architecture is sound and the remaining work is wording, propagation, and persisted-summary recovery discipline — no new fields, no new managers.

Codebase verification (seven parallel Explore agents — one per finding cluster plus one machine-facing-layer survey) confirms nine of the eleven findings hold up verbatim against current source. Two are routed differently: WL-S7-P2-008 (hash CLI path drift) is REJECTED — the TS source path and dist JS path coexist by design (one is canonical reference, one is runtime invocation); WL-S7-P2-010 (health-audit accretion policy schema discovery) is ALREADY-RESOLVED — SPEC-31 D10 / SPEC-31 STOCONHAR-009 already converted the wording at `branching-story-health-audit/SKILL.md` Phase 2e to the conditional form the auditor's A10 proposed. Both are noted in the companion triage with no spec action.

The remaining nine findings reach this spec as D1–D9. Verification also surfaced one out-of-report finding: four audit-named validators (`branch_isolation`, `observer_firewall`, `lie_promoted_silently`, `canon_baseline_drift` as standalone) are not implemented in `tools/validators/`. This is a pre-existing gap orthogonal to this audit's scope; routed to §Risks & Open Questions for a follow-up validator-hardening spec.

Production-readiness window: zero active `_source/` story bundles depend on the surfaces this spec touches; pilot-tier story bundles remain pending (per the most recent `archive/specs/IMPLEMENTATION-ORDER-2026-05-09.md`). The blast radius (mapped via the machine-layer survey) is overwhelmingly skill-prose plus one new shared template and one new structural validator file; no patch-engine op additions are required (`create_ststat_record` is already implemented at `tools/patch-engine/src/envelope/schema.ts:76`), and no MCP retrieval-surface additions are required (`get_persisted_packet_slice` is already implemented at `tools/world-mcp/src/tools/get-persisted-packet-slice.ts` and registered in `tools/world-mcp/src/server.ts`).

### Key design decisions

- **Considered adding per-skill persisted-summary recovery paragraphs (A6 as drafted, seven verbatim inlines); chose a single shared template at `.claude/skills/_shared-templates/persisted-packet-recovery.md` cross-referenced from each consuming skill, because the seven consuming skills (`branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`, `commitment-block-authoring`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, `story-promotion-closeout`) share an identical recovery surface and the existing precedent in `.claude/skills/_shared-templates/story-state-contract.md` already establishes the shared-template pattern for cross-skill discipline.** Seven verbatim inlines would diverge under future amendment; a shared file with cross-references stays canonical.

- **Considered adding `describe_capabilities` / `describe_envelope_schema` capability calls to every consuming skill's Pre-flight per A11 as drafted; chose a `(pragmatic)` softening where "now landed" claims must link to a specific archived ticket path (e.g., `archive/tickets/PEENH-007-…md`) or a test path, because adding runtime capability calls to seven skill pre-flights is structurally cleaner but disproportionate to the actual problem — opaque provenance, not stale-capability risk.** The archived-ticket-link form is the lower-cost audit-trail backstop. Under no-trust-deficit conditions (a future audit grants the codebase trust the seventh iteration did not), the link form is sufficient. Under stronger drift constraints (e.g., a future MCP-server major version where deployed capability and skill prose can diverge silently), the full capability-check discipline likely wins.

- **Considered limiting A2 to the literal wording the auditor proposed (replace both line 134 and line 213 in `branching-story-prose-attach/SKILL.md`); chose to limit the fix to line 213 only, because verification revealed line 134 is already correct.** Line 134 reads `SE.promotion_claims[]` (no `PG.SE.` prefix) — the auditor's drafted A2 would have re-corrected it unnecessarily and introduced its own drift. Line 213 has the actual path bug.

- **Considered including a new structural validator for shared write-order discipline (Phase 6 write order in prose-attach being the trigger case); chose to scope a single new validator at `tools/validators/src/structural/validation-trace-shape-compliance.ts` to enforce the §4.2 flat-mapping shape on `PG.validation_trace`, because shared-write-order discipline is largely a skill-prose responsibility (the patch engine already enforces atomic commits via its envelope schema), but `validation_trace` shape drift is the kind of drift a future skill author would re-introduce without a structural gate.** A write-order validator would need to model the cross-tool sequence (patch-engine submit + direct write + INDEX update) which is currently expressed only as prose discipline; a `validation_trace` shape validator is purely structural and matches the existing validator surface.

- **Considered deferring WL-S7-P2-008 to a footnote-only mention rather than rejecting it outright; chose to reject in the companion triage with explicit `confirms-existing-position` verdict, because the TS/JS path coexistence is inherent to the tooling pattern** (TypeScript source compiles to dist JS for runtime invocation — both paths are correct in their respective contexts; the contract at §4.2a names the source, skills name the runtime). A1.5-style "spell out both paths for clarity" is a low-cost contract clarification but not a defect; rolled into D7 as a one-line note rather than a standalone deliverable.

- **Considered folding the missing audit-named validators (`branch_isolation`, `observer_firewall`, `lie_promoted_silently`, `canon_baseline_drift`) into this spec; chose to defer to a follow-up validator-hardening spec, `(pragmatic)` because each implementation is a multi-file undertaking** (validator + fixtures + registry update + test file per validator × 4) and would roughly double this spec's blast radius. Under no-scope-doubling-constraint conditions, the validators are structurally needed and should join this spec; the deferral is cost-driven and routed to §Risks & Open Questions.

---

## Approach

Each deliverable targets a single named contradiction, drift, or missing-shared-discipline gap. The nine deliverables fall into three architectural concerns:

- **Skill-prose drift fixes** (D1, D2, D3, D4, D5, D7, D8, D9): five-of-seven skills carry a small number of stale field names, stale retrieval claims, stale write-order steps, or stale debt-note provenance. Each is a discrete prose change verifiable by grep + skill re-read.
- **Cross-skill shared discipline** (D6): persisted-summary recovery is documented at the contract level but missing from every consuming skill; a single shared template plus seven cross-reference inserts closes the gap.
- **Contract amendment + optional preventive validator** (D7 + new validator): the `PG.validation_trace.gates[]` wording in `_shared-templates/story-state-contract.md` §7 contradicts the flat-mapping schema at §4.2; the contract gets the prose fix and a new structural validator forecloses the same drift re-emerging.

Cross-iteration discipline: D6 is structurally aligned with SPEC-31 D14's pattern (server-side mechanism landed earlier; this spec lands the consuming-skill discipline). D5's STSTAT closeout propagation follows SPEC-32 D2's pattern (skill-prose follow-on to a tool surface that already exists — `create_ststat_record` is already implemented in the patch engine).

No schema field is added. No patch-engine op is added. No MCP retrieval surface is added. No `_source/` migration of existing records is required. The blast radius is one new shared-template file, one new validator file, two contract-file edits, and five skill-file edits.

---

## Deliverables

Deliverables grouped by severity (P1 → P2). Each is self-contained and can land as its own ticket.

### D1 — Replace turn-cycle seed derivation with schema-backed fields (P1, intake WL-S7-P1-001 / A1)

**Problem**: `.claude/skills/branching-story-turn-cycle/SKILL.md:147` derives world-scope `seed_nodes` via `STENT.bound_char_id` (when bound to a character) **or `STENT.bound_ent_id` (when bound to a non-character named entity)** and `STLOC.bound_ent` **or `STLOC.governing_section_id`**. The shared story-state contract at `.claude/skills/_shared-templates/story-state-contract.md` §4.5.1 (STENT) defines only `bound_char_id`. §4.5.8 (STLOC) defines only `bound_ent`. Neither `STENT.bound_ent_id` nor `STLOC.governing_section_id` exists in any schema.

The skill's seed-derivation prose is therefore un-executable as written. The MCP server has a defensive guard at `tools/world-mcp/src/tools/get-context-packet.ts` (the `STORY_LOCAL_SEED_NODE_PATTERN` regex and the `story_local_seed_nodes_ignored` warning per SPEC-31 D14), which would catch any story-local ID accidentally passed, but the skill prose remains the misleading source of truth for skill authors and future audits.

**Change**:

1. **Skill prose** (`.claude/skills/branching-story-turn-cycle/SKILL.md` §World-State Prerequisites): replace the seed-derivation paragraph with the auditor's A1 wording, adjusted to match the live skill style:

   ```
   Derive world-scope `seed_nodes` only from schema-backed anchors per the
   shared story-state contract §4 schemas:

   - active `STENT.bound_char_id` values when non-null;
   - active `STLOC.bound_ent` values when non-null;
   - parent `PG.state_snapshot.unresolved_mystery_claims[].mystery_id`;
   - parent `CF-<integer>` ids named by active mirrored `SF.derived_from[]`;
   - active-period `CH-<integer>` / `SEC-*` / `CF-<integer>` / `ENT-<integer>`
     anchors when already known from loaded world-canon context.

   Do not derive seeds from story-local ids or from fields not defined in the
   shared story-state contract. In particular, do not pass `STENT`, `STLOC`,
   `STSTAT`, `SF`, `BEL`, `PG`, `SE`, `CHC`, `SLT`, `OBL`, `CNSQ`, `THR`, `SREL`,
   `STINT`, `STOBJ`, `BR`, `SLB`, `SAU`, `SP`, or `RSP` ids as context-packet
   `seed_nodes`; story-local records are loaded through `story_slug` +
   `story_bundle_context`, `mcp__worldloom__get_records(record_ids=...,
   story_slug=<story_slug>)`, or `mcp__worldloom__list_records(record_type=...,
   story_slug=<story_slug>)`. The MCP server-side `story_local_seed_nodes_ignored`
   warning is a defensive backstop, not a substitute for this discipline.
   ```

2. **Verification step in skill prose**: a one-line note at the foot of the §World-State Prerequisites section: "Seed derivation conforms to story-state contract §4.5.1 (STENT) and §4.5.8 (STLOC); deviation requires contract amendment first."

**FOUNDATIONS alignment**: §5 Validation Rules at Story Scope (Rule 1 — No Floating Facts grounds the schema-backed-fields-only discipline); §3 Read Discipline (story-local records load through `story_slug`-scoped tools).

**Acceptance criteria**:
- Grep `.claude/skills/branching-story-turn-cycle/SKILL.md` for `bound_ent_id` returns zero matches.
- Grep the same file for `governing_section_id` returns zero matches.
- The replaced paragraph cites only fields defined in story-state contract §4.

**Test artifact**: optional fixture-driven test `story_turn_cycle_seed_derivation_uses_only_schema_backed_world_anchors` per audit §11.2.

---

### D2 — Fix prose-attach invalid `PG.SE.promotion_claims[]` path (P1, intake WL-S7-P1-002 / A2)

**Problem**: `.claude/skills/branching-story-prose-attach/SKILL.md:213` (Phase 3 deterministic check 8 — `canon_claim_without_authority`) reads:

> Any such assertion without corresponding `PG.SE.promotion_claims[]` evidence is `FAIL`...

The PG schema at `.claude/skills/_shared-templates/story-state-contract.md` §4.2 does not nest SE. The link from PG to its resolving event is `input.resolved_event_id: SE-<integer>*`. The `promotion_claims[]` field lives on the SE record itself (§4.3 lines 236–238). The path `PG.SE.promotion_claims[]` is not resolvable.

(Line 134 of the same skill — `including plan.plan_hash, state_hash, and SE.promotion_claims[] if any` — is already correct and not in scope for this deliverable. Verified against the auditor's A2 over-correction.)

**Change**:

1. **Skill prose** (`.claude/skills/branching-story-prose-attach/SKILL.md:213`): replace

   ```
   Any such assertion without corresponding `PG.SE.promotion_claims[]` evidence
   ```

   with

   ```
   Any such assertion without corresponding `SE.promotion_claims[]` evidence on
   the resolving event (loaded via `PG.input.resolved_event_id`)
   ```

**FOUNDATIONS alignment**: §5 Validation Rules at Story Scope (Rule 1 — No Floating Facts: skill prose must name real schema paths).

**Acceptance criteria**:
- Grep the skill for `PG.SE.promotion_claims` returns zero matches.
- The replaced sentence cites `PG.input.resolved_event_id` as the resolution path.

**Test artifact**: fixture test `prose_attach_canon_claim_uses_resolved_event_promotion_claims` per audit §11.2.

---

### D3 — Reorder prose-attach Phase 6 to submit patch before direct artifacts (P1, intake WL-S7-P1-003 / A3)

**Problem**: `.claude/skills/branching-story-prose-attach/SKILL.md` Phase 6 currently steps (when `emit_attach_event: true`):

1. Write `pages-prose-receipts/<page_id>.yaml`.
2. Update bundle `INDEX.md`.
3. (Conditionally) build single-op `create_se_record` envelope and submit.

The shared write order at `.claude/skills/_shared-templates/story-state-contract.md` §10 requires: build patch plan (1) → dry-run validate (2) → obtain approval token (3) → submit patch plan (4) → write direct-markdown artifacts (5) → post-write plan-hash verification (5a) → update bundle `INDEX.md` last (6) → update per-world `stories/INDEX.md` (7). Patch submit precedes direct artifacts and INDEX; the current Phase 6 violates this when `emit_attach_event: true`.

The audit-only SE event (`event_kind: prose_attach`, per story-state contract §4.3a) has no replay-delta, but ordering still matters: a filesystem failure between INDEX write and patch submit would leave INDEX reporting prose attached while the audit ledger entry never committed.

**Change**:

1. **Skill prose** (`.claude/skills/branching-story-prose-attach/SKILL.md` §Phase 6 step 4, replace the on-approval block with):

   ```
   4. On approval:
      a. If `emit_attach_event: true`: build a single-op patch envelope with
         `create_se_record` for `event_kind: prose_attach` conforming to
         story-state contract §4.3a (audit-only SE events). Dry-run validate via
         `mcp__worldloom__validate_patch_plan`, obtain the approval token, and
         submit via `mcp__worldloom__submit_patch_plan`. If this optional patch
         fails, abort: write no receipt and no INDEX update for this invocation;
         surface the patch failure and allow the user to re-run with
         `emit_attach_event=false` or repair the patch shape.
      b. Write `pages-prose-receipts/<page_id>.yaml` (direct write, not
         patch-engine routed — the receipt is not a `_source/` record).
      c. Update bundle `INDEX.md` to reflect prose status + receipt verdict.
   ```

**FOUNDATIONS alignment**: §4 Write Discipline (atomic commit ordering); story-state contract §10 (shared write order).

**Acceptance criteria**:
- Phase 6 step 4 sub-step (a) names patch submission and precedes (b) receipt and (c) INDEX writes.
- The skill's failure-behavior block confirms that a patch failure aborts the receipt/INDEX writes.

**Test artifact**: integration test `prose_attach_emit_event_submits_patch_before_receipt_index` per audit §11.2.

---

### D4 — Fix closeout proposal-package field paths (P1, intake WL-S7-P1-004 / A4)

**Problem**: `.claude/skills/story-promotion-closeout/SKILL.md` references the proposal package fields `source_records[]` and `branch_path` as top-level (e.g., line 138: "source of truth for the promotion's `source_records` / `source_kind` / `branch_path` / `contradiction_preference` / `downstream_impact_report`"; line 155: "Load all source records from the proposal package's `source_records[]`"; line 230: Phase 3 gate 6 disposition completeness check; the ledger template under `templates/`).

The proposal package produced by `.claude/skills/story-fact-promotion-to-canon/SKILL.md` Phase 6 (lines 285–288) nests these fields under `proposal_evidence`:

```yaml
proposal_evidence:
  story_branch: BR-<integer>
  source_kind: <source_kind>
  source_records: [<source record ids>]
```

Closeout would fail to find `source_records[]` at the top level and silently mark disposition completeness on an empty set.

**Implementation note (2026-05-16, SPEC33STOPIPSEV-004)**: live reassessment corrected this deliverable's field list before implementation. The producer skill and `.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` nest `story_branch`, `source_kind`, and `source_records[]` under `proposal_evidence`, but keep `downstream_impact_report` and `contradiction_preference` as top-level proposal-package fields. The D4 implementation preserves those two top-level paths; remaining `proposal_evidence.contradiction_preference` / `proposal_evidence.downstream_impact_report` wording below is historical intake context, not the landed contract.

**Change**:

1. **Skill prose** (`.claude/skills/story-promotion-closeout/SKILL.md`, all occurrences): replace top-level references to `source_records[]`, `branch_path`, `source_kind`, `contradiction_preference`, `downstream_impact_report` with their nested forms:
   - `source_records[]` → `proposal_evidence.source_records[]`
   - `branch_path` → `proposal_evidence.story_branch`
   - `source_kind` → `proposal_evidence.source_kind`
   - `contradiction_preference` → `proposal_evidence.contradiction_preference`
   - `downstream_impact_report` → `proposal_evidence.downstream_impact_report`

   Touch sites confirmed by verification: lines 138, 154–155, ~230 (Phase 3 gate 6), and the SP ledger template at `.claude/skills/story-promotion-closeout/templates/story-promotion-ledger.md` (if present — verify and amend on implementation).

2. **Phase 3 gate 6 disposition completeness wording**: the `source_record_dispositions:` key set MUST exactly equal `proposal_evidence.source_records[]`.

3. **Cross-file legacy-string sweep**: grep `.claude/skills/story-promotion-closeout/` for `source_records` and confirm every occurrence is preceded by `proposal_evidence.` (or names the closeout's own local disposition map). Apply the same sweep for `branch_path`, `source_kind`, `contradiction_preference`, `downstream_impact_report`.

**FOUNDATIONS alignment**: §5 Validation Rules at Story Scope (Rule 1 — schema-named field paths must resolve).

**Acceptance criteria**:
- Grep closeout for `source_records[]` that is NOT preceded by `proposal_evidence.` returns zero matches (except the local `source_record_dispositions:` key, which is a closeout-internal disposition map, not the proposal-package field).
- Grep closeout for `branch_path` that is NOT preceded by `proposal_evidence.story_branch` returns zero matches.

**Test artifact**: fixture test `closeout_reads_proposal_evidence_source_records_and_story_branch` per audit §11.2.

---

### D5 — Propagate STSTAT closeout support across prerequisites, Phase 2, and Phase 5 op list (P1, intake WL-S7-P1-005 / A5)

**Problem**: `.claude/skills/story-promotion-closeout/SKILL.md` output table (line 122) lists STSTAT supersession as a closeout output kind ("IF a source STSTAT in the promotion's source-record set needs an amended-schema update after becoming canon-linked, such as character-outcome supersession-chain evidence"). But:

- **World-State Prerequisites** (line ~137) lists "SF, BEL, STENT, SREL, DA, SE" as closeout output classes; STSTAT is omitted.
- **Phase 2 character_outcome subsection** (line ~181) says "For `source_kind: character_outcome`, supersede `STENT` only if a §4.5.1 field changes"; no mention of STSTAT supersession.
- **Phase 5 operation list** (line ~297) lists `create_sf_record`, `create_bel_record`, `create_stent_record`, `create_srel_record`, `append_story_diegetic_artifact_record`; `create_ststat_record` is omitted.

The patch engine already implements `create_ststat_record` (verified at `tools/patch-engine/src/envelope/schema.ts:76` in `OPERATION_KINDS`, and the dispatch in `tools/patch-engine/src/ops/create-story-record.ts`). The gap is purely skill-prose propagation.

**Implementation note (2026-05-16, archive/tickets/SPEC33STOPIPSEV-005.md)**: landed in `.claude/skills/story-promotion-closeout/SKILL.md`. Closeout now lists STSTAT in World-State Prerequisites, adds the character-outcome STSTAT supersession condition, includes `STSTAT-<integer>` in the closeout ledger disposition template, and enumerates `create_ststat_record` in Phase 5 when a source STSTAT in `proposal_evidence.source_records[]` needs amended-schema supersession. The patch-engine implementation remained unchanged.

**Change**:

1. **World-State Prerequisites** (add STSTAT to the schema-list line):

   ```
   `.claude/skills/_shared-templates/story-state-contract.md` — §4 record
   schemas (SF, BEL, STENT, STSTAT, SREL, DA, SE — closeout output classes for
   superseded or audit-emitted records); §4.3a (audit-only SE events); §10
   (shared write order); §4.5.13 (STSTAT — character-outcome supersession-chain
   evidence).
   ```

2. **Phase 2 `character_outcome` subsection**: add an STSTAT clause adjacent to the existing STENT clause:

   ```
   For `source_kind: character_outcome`, supersede `STENT` only if a §4.5.1
   field changes; supersede `STSTAT` only if a source STSTAT in
   `proposal_evidence.source_records[]` needs an amended-schema update after
   the canon-addition verdict (e.g., character-outcome status evidence becoming
   canon-linked, or explicitly retained as branch-local after rejection).
   ```

3. **Phase 3 disposition map template**: add STSTAT to the disposition value set:

   ```yaml
   STSTAT-<integer>: superseded | ledger_only | unchanged_no_schema_field_changed
   ```

4. **Phase 5 operation list**: add `create_ststat_record` to the enumerated ops, with the same conditional STSTAT-source-record clause that already governs STENT.

**FOUNDATIONS alignment**: §4 Write Discipline (canon-addition outputs must be reflected in story-local records via the closeout's patch plan); §5 Validation Rules at Story Scope (STSTAT carries `entity_status` derivation per §5).

**Acceptance criteria**:
- Closeout Prerequisites schema-list line names STSTAT.
- Closeout Phase 2 character_outcome subsection mentions STSTAT alongside STENT.
- Closeout Phase 5 op list contains `create_ststat_record`.
- Closeout disposition map template covers STSTAT.

**Test artifact**: fixture test `closeout_ststat_source_record_disposition_requires_create_ststat_record_when_superseded` per audit §11.2.

---

### D6 — Add shared persisted-summary recovery template + cross-reference from seven consuming skills (P1, intake WL-S7-P1-006 / A6)

**Problem**: `docs/CONTEXT-PACKET-CONTRACT.md` §Fast-Summary Inline Delivery (lines ~206–221) and `docs/MACHINE-FACING-LAYER.md` §Retrieval Tool Scope (line ~85) define the persisted-summary recovery contract: when `get_context_packet`, `get_records`, or `describe_envelope_schema` returns `delivery_status: persisted_with_summary`, the consuming workflow must retrieve required slices via `mcp__worldloom__get_persisted_packet_slice(persisted_path, slice_path)` before validation. The MCP side implements the recovery API (`tools/world-mcp/src/tools/get-persisted-packet-slice.ts`, registered in `tools/world-mcp/src/server.ts`; assembler emits `delivery_status` and `fallback_advice` at `tools/world-mcp/src/context-packet/assemble.ts`).

None of the seven consuming story-pipeline skills documents recovery wording. Verified per-skill (every skill calls `get_context_packet` or `get_records` in Pre-flight; none mentions `get_persisted_packet_slice` or `persisted_with_summary`):

- `branching-story-bootstrap`: Pre-flight calls `get_context_packet`; no recovery wording.
- `branching-story-turn-cycle`: Pre-flight calls `get_context_packet`; no recovery wording.
- `branching-story-prose-attach`: no `get_context_packet` (downstream validator); reads plan-inlined canon. Recovery still applies if a future change re-introduces context calls.
- `branching-story-health-audit`: Pre-flight calls `get_context_packet`; no recovery wording.
- `commitment-block-authoring`: Pre-flight calls `get_context_packet`; no recovery wording.
- `story-fact-promotion-to-canon`: Pre-flight calls `get_context_packet` and `get_records`; no recovery wording.
- `story-promotion-closeout`: Pre-flight calls `get_records` (linked CF/CH/PA via MCP retrieval per SPEC-31 D10); no recovery wording.

Under large bundles or wide CH windows, a skill could validate against a summary-only packet and miss governing records.

**Change**:

1. **New file** `.claude/skills/_shared-templates/persisted-packet-recovery.md`:

   ```markdown
   # Persisted-Packet Recovery — Shared Discipline

   This shared discipline applies to every story-pipeline skill whose Pre-flight
   invokes `mcp__worldloom__get_context_packet`,
   `mcp__worldloom__get_records`, or
   `mcp__worldloom__describe_envelope_schema`. The contracts at
   `docs/CONTEXT-PACKET-CONTRACT.md` §Fast-Summary Inline Delivery and
   `docs/MACHINE-FACING-LAYER.md` §Retrieval Tool Scope are authoritative; this
   file is the skill-facing discipline that operationalizes them.

   ## When Recovery Fires

   If `get_context_packet`, `get_records`, or `describe_envelope_schema` returns
   `task_header.delivery_status: persisted_with_summary` (or the equivalent
   envelope field on `get_records` / `describe_envelope_schema`), the inline
   response is a recovery summary, not the full payload. The full packet lives
   at `task_header.persisted_output_path`. Validation rationales may cite only
   retrieved records, fields, packet layers, slices, or validator results —
   never summary metadata alone.

   ## Recovery Action

   Retrieve every load-bearing omitted slice before continuing analysis:

   - For oversized `get_context_packet`: call
     `mcp__worldloom__get_persisted_packet_slice(persisted_path=<persisted_output_path>,
     slice_path=<dot-path>)` for each required layer or node id (e.g.,
     `governing_world_context.nodes` for governing records, or
     `local_authority.nodes[id=<seed_id>]` for a specific seed).
   - For oversized `get_records`: retrieve
     `records[<N>].record.record` (or equivalent slice path) for every required
     id.
   - For oversized `describe_envelope_schema`: either re-invoke with the
     specific `op_kind` argument, or slice `op_schemas.<op_kind>` from the
     persisted file.

   The inline `governing_summary` is an index, not a substitute. Use it to
   identify which slices to retrieve, then retrieve.

   ## Abort Condition

   If a required slice cannot be retrieved (e.g., the persisted file is
   inaccessible or the slice path is malformed), abort the workflow and surface
   the persisted-path to the user for post-session analysis. Do not validate
   from summary-only context.
   ```

2. **Cross-reference insert in each consuming skill's Pre-flight section** — one line, after the relevant retrieval call:

   ```
   Persisted-summary recovery: see
   `.claude/skills/_shared-templates/persisted-packet-recovery.md`. If
   `get_context_packet` (or `get_records` / `describe_envelope_schema`) returns
   `delivery_status: persisted_with_summary`, retrieve required slices via
   `mcp__worldloom__get_persisted_packet_slice` before continuing.
   ```

   Insert sites:
   - `branching-story-bootstrap/SKILL.md` Pre-flight (after the `get_context_packet` call at ~line 45).
   - `branching-story-turn-cycle/SKILL.md` Pre-flight (after the `get_context_packet` call at ~line 39).
   - `branching-story-prose-attach/SKILL.md` Pre-flight (one short note covering the conditional `get_firewall_content` path; full recovery wording optional since prose-attach's standard path is plan-inlined).
   - `branching-story-health-audit/SKILL.md` Pre-flight (after the `get_context_packet` call at ~line 33).
   - `commitment-block-authoring/SKILL.md` Pre-flight (after the `get_context_packet` call at ~line 36).
   - `story-fact-promotion-to-canon/SKILL.md` Pre-flight (after the `get_context_packet` / `get_records` calls).
   - `story-promotion-closeout/SKILL.md` Pre-flight (after the `get_records` call at ~line 154 for linked CF/CH/PA retrieval).

**FOUNDATIONS alignment**: §3 Read Discipline (story-pipeline retrieval via targeted MCP tools); §5 Validation Rules at Story Scope (validation rationales must cite real records, not summary metadata).

**Acceptance criteria**:
- The shared template file exists at `.claude/skills/_shared-templates/persisted-packet-recovery.md` and matches the contract terminology.
- Each of the seven consuming skills contains a cross-reference to the shared template in its Pre-flight section.
- Grep `.claude/skills/` for `persisted_with_summary` returns matches in the shared template plus each consuming skill's Pre-flight.

**Test artifact**: integration tests `story_turn_cycle_persisted_context_recovery` and `oversized_get_records_persisted_summary_recovery_closeout` per audit §11.2.

---

### D7 — Fix `PG.validation_trace.gates[]` wording + add structural validator (P2, intake WL-S7-P2-007 / A7)

**Problem**: `.claude/skills/_shared-templates/story-state-contract.md` §7 (Eight Shared Hard Gates) says gate results are recorded in `PG.validation_trace.gates[]`. The PG schema at §4.2 uses a flat mapping (`input_legality`, `parent_snapshot_compatibility`, `mystery_invariant_firewall`, `branch_isolation`, `append_only_delta`, `consequence_or_terminal`, `plan_grounding`, `canon_promotion_hold` — eight keys, each holding a per-gate result object). No `.gates[]` array exists in the schema.

A skill author or future validator could implement an array shape rejected by `record_schema_compliance`, or accept two competing shapes silently.

**Change**:

1. **Contract prose** (`.claude/skills/_shared-templates/story-state-contract.md` §7):

   Replace any sentence containing `PG.validation_trace.gates[]` with:

   ```
   Gate results are recorded in the flat `PG.validation_trace` mapping using
   the eight schema keys defined in §4.2 (one entry per gate, keyed by the
   gate name).
   ```

2. **Contract prose** (`.claude/skills/_shared-templates/story-state-contract.md` §10 / §4.2a — CLI runtime path clarification, rolled in from rejected WL-S7-P2-008 as a low-cost note):

   Add a one-line note at §4.2a clarifying both paths:

   ```
   Implementation source: `tools/world-mcp/src/cli/compute-pg-hashes.ts`.
   Runtime invocation after build: `node
   tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan <plan-md-path> --pg
   <pg-record-path>`. The TS source path is the canonical reference; the dist
   JS path is the runtime invocation. Both are correct in their respective
   contexts.
   ```

3. **New structural validator** `tools/validators/src/structural/validation-trace-shape-compliance.ts`: enforce that every PG record's `validation_trace` is a flat object whose keys are the eight enumerated gate names; reject the presence of a `gates` array key under `validation_trace`. Register in `tools/validators/src/public/registry.ts`. Add a test fixture under `tools/validators/tests/structural/` exercising:
   - PG with flat mapping and all eight keys → PASS.
   - PG with `validation_trace.gates: [...]` array → FAIL with `validation_trace_shape_compliance` diagnostic.
   - PG with flat mapping but extraneous keys → FAIL.
   - PG with flat mapping missing one gate key → FAIL.

**FOUNDATIONS alignment**: §5 Validation Rules at Story Scope (Rule 1 — schema shape must match prose); §Canonical Storage Layer (record-schema-compliance gate).

**Acceptance criteria**:
- Grep `.claude/skills/_shared-templates/story-state-contract.md` for `validation_trace.gates` returns zero matches.
- The new validator file exists and is registered.
- The validator passes its four test fixtures.
- The contract §4.2a note enumerates both `.ts` source and `.js` dist paths.

**Test artifact**: validator-fixture test `validation_trace_flat_mapping_only` per audit §11.4.

---

### D8 — Correct prose-attach retrieval wording (P2, intake WL-S7-P2-009 / A9)

**Problem**: `.claude/skills/branching-story-prose-attach/SKILL.md:114` and the parallel FOUNDATIONS Alignment / Tooling Recommendation row at ~line 326 read:

> No world-canon retrieval needed — the plan body inlines all load-bearing canon excerpts.

But Phase 3 deterministic check 3 (`forbidden_mystery_resolution`, lines 185–189, after SPEC-32 D1's amendment) retrieves firewall fields via `mcp__worldloom__get_firewall_content(world_slug, m_ids=<plan §11 ids>)` **unless the page plan already inlines the same fields**. The unconditional "no retrieval needed" claim contradicts the conditional retrieval path that runs in standard operation when plan §11 names mysteries that aren't fully inlined.

**Change**:

1. **Skill prose** (`.claude/skills/branching-story-prose-attach/SKILL.md` both line 114 and the FOUNDATIONS Alignment / Tooling Recommendation row at ~line 326): replace the "No world-canon retrieval needed" sentence with:

   ```
   No context-packet retrieval is normally needed because the plan body inlines
   the load-bearing canon. Targeted `mcp__worldloom__get_firewall_content`
   retrieval is required when plan §11 does not inline the Mystery Reserve
   firewall fields used by the `forbidden_mystery_resolution` check (Phase 3
   check 3). Persisted-summary recovery still applies if either retrieval
   returns `delivery_status: persisted_with_summary` (see
   `.claude/skills/_shared-templates/persisted-packet-recovery.md`).
   ```

**FOUNDATIONS alignment**: §3 Read Discipline (skill must accurately document its retrieval calls).

**Acceptance criteria**:
- Grep prose-attach for `No world-canon retrieval needed` returns zero matches.
- The replacement sentence names `get_firewall_content` and the conditional firing on plan §11 inlining.

**Test artifact**: fixture test `prose_attach_firewall_targeted_retrieval_required_when_plan_lacks_fields` per audit §11.4.

---

### D9 — Adjudicate "now landed" integration-debt claims with archived-ticket provenance (P2, intake WL-S7-P2-011)

**Problem**: Multiple skills cite ticket IDs (PEENH-007, MCPENH-040, MCPENH-041, PEENH-008, VALENH-011, etc.) as "now landed" without linking to a verification artifact. A future audit cannot validate the landed claim without external research, and a future drift (e.g., a tool re-rolled under a different name) would not be flagged.

Touch sites confirmed by verification:
- `.claude/skills/story-promotion-closeout/SKILL.md:297`: "`create_bel_record` (via PEENH-007 inheritance — now landed)".
- `.claude/skills/commitment-block-authoring/SKILL.md:36`: "MCPENH-041 landed the task_type rename".
- Additional "now landed" / "Now landed" claims in `branching-story-health-audit`, `story-fact-promotion-to-canon`, and elsewhere — exhaustive site list to be enumerated at ticket-authoring time per FOUNDATIONS shared-discipline §Cross-Skill (the auditor's per-ID adjudication shape from SPEC-32 D6 is the precedent).

**Change**:

1. **Per-skill audit + adjudication**: for every skill that contains "now landed" or "Now landed" language tied to a specific ticket ID, replace the claim with one of:

   a. **If the ticket is archived** (e.g., `archive/tickets/PEENH-007-…md` exists): link to the archived ticket path:

   ```
   `create_bel_record` (per `archive/tickets/PEENH-007-belief-record-create-op.md`)
   ```

   b. **If the ticket landed but isn't archived as a single file** (e.g., it landed via a spec): link to the archived spec section:

   ```
   `create_bel_record` (per `archive/specs/SPEC-XX-…md` D-Y)
   ```

   c. **If the claim references a runtime capability that should be verified at session time** (rare; reserved for skills whose pre-flight legitimately depends on capability currency): replace with a `describe_capabilities` check in the skill's Pre-flight rather than a static prose claim.

2. **Cross-skill enumeration**: at ticket-authoring time, grep `.claude/skills/` for `now landed` and `Now landed` to enumerate every site; produce a `Files to Touch` list covering all sites in one pass per the multi-file triage implementation discipline.

**FOUNDATIONS alignment**: §Canonical Storage Layer (audit-trail discipline — claims must link to verification artifacts).

**Acceptance criteria**:
- Grep `.claude/skills/` for `now landed` and `Now landed` returns matches only where each match is immediately followed by an archived-ticket or archived-spec path (or replaced by a `describe_capabilities` Pre-flight call).
- A site list covering every match is included in the ticket's `Files to Touch`.

**Test artifact**: docs-lint check `known_integration_debt_runtime_verification` per audit §11.4 (pattern: `now landed` not followed by `archive/`).

---

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §3 Read Discipline (story-bundle retrieval via targeted MCP tools + persisted-summary recovery) | aligns | D6 closes the consuming-skill discipline gap that the contract already documents; D1 reinforces story-local-records-via-`story_slug` over seed-node misuse; D8 corrects retrieval-call documentation. |
| §4 Write Discipline + §10 shared write order | aligns | D3 reorders prose-attach Phase 6 to honor the shared write order (patch → direct artifacts → INDEX); D5 routes STSTAT closeout supersession through the established patch-engine surface. |
| §5 Validation Rules at Story Scope (Rule 1 — No Floating Facts) | aligns | D1, D2, D4, D7 all replace skill-prose references to non-existent schema fields/paths with schema-backed forms. D7 also lands a structural validator preventing the same drift class. |
| §5b Schema-Minimalism | aligns | No new schema fields added. D7's optional validator and D6's shared template strengthen discipline without expanding the schema surface. |
| §Canonical Storage Layer (audit-trail discipline) | aligns | D9 grounds "now landed" claims in archived-ticket / archived-spec links so the audit trail survives skill-prose evolution. |
| §Story Bundles §4a Plan-Authority Boundary | N/A | No deliverable affects PG vs. prose authority. |
| §Story Bundles §5c Present Causal State, Not Narrative Shape | N/A | No deliverable introduces narrative-shape semantics. |

---

## Verification

After all deliverables land, the following acceptance evidence is required:

1. **D1**: `grep -rn 'bound_ent_id\|governing_section_id' .claude/skills/branching-story-turn-cycle/` returns zero matches.
2. **D2**: `grep -rn 'PG\.SE\.promotion_claims' .claude/skills/branching-story-prose-attach/` returns zero matches.
3. **D3**: Phase 6 step 4 in prose-attach names patch submission before receipt and INDEX writes; the skill's failure block confirms the abort behavior.
4. **D4**: `grep -rn 'source_records\[' .claude/skills/story-promotion-closeout/` returns only matches preceded by `proposal_evidence.` (or naming the closeout's local disposition map).
5. **D5**: closeout's Prerequisites, Phase 2 character_outcome subsection, Phase 3 disposition map, and Phase 5 op list all mention STSTAT alongside STENT.
6. **D6**: `.claude/skills/_shared-templates/persisted-packet-recovery.md` exists; each of the seven consuming skills' Pre-flight cross-references it.
7. **D7**: `grep -rn 'validation_trace\.gates' .claude/skills/_shared-templates/` returns zero matches; the new validator file is registered and passes four fixtures.
8. **D8**: `grep -rn 'No world-canon retrieval needed' .claude/skills/branching-story-prose-attach/` returns zero matches.
9. **D9**: `grep -rn 'now landed\|Now landed' .claude/skills/` returns matches that are each immediately followed by an `archive/` path or replaced by a `describe_capabilities` call.

---

## Out of Scope

- **Missing audit-named validators** (`branch_isolation`, `observer_firewall`, `lie_promoted_silently`, `canon_baseline_drift` as standalone): each is a multi-file validator + fixture + registry undertaking and would roughly double this spec's blast radius. Routed to §Risks & Open Questions for a follow-up validator-hardening spec.
- **MCP retrieval-surface changes**: zero. `get_persisted_packet_slice` is already implemented and registered.
- **Patch-engine op additions**: zero. `create_ststat_record` already exists at `tools/patch-engine/src/envelope/schema.ts:76`.
- **`_source/` schema field additions**: forbidden by FOUNDATIONS §5b without prior contract amendment; no deliverable proposes one.
- **Story-bundle migration of existing records**: not required. Pilot-tier story bundles remain pending per `archive/specs/IMPLEMENTATION-ORDER-2026-05-09.md`; no committed `_source/` story records depend on the surfaces this spec touches.
- **Iteration-§12 research-synthesis adoptions** (storylets/salience tests, social-practice affordance tests, plot-graph mutual-exclusion tests): each is either already-implemented-in-spirit (per audit §12) or judgment-assisted and routed to the follow-up testing-hardening spec.
- **Iteration-§13 anti-recommendations** (act structure, global drama manager, word-count targets, prose-as-state, etc.): confirms-existing-position with FOUNDATIONS §Story Bundles §4a / §5c / §9; no action required.

---

## Risks & Open Questions

- **Missing audit-named validators** `(pragmatic)`: four standalone validators named in skill prose and audit §11.2 are not implemented in `tools/validators/`. The closest current coverage is `tools/validators/src/structural/canon-drift-classification-evidence.ts` (partial coverage for canon-baseline-drift). A follow-up spec should implement each as a structural validator + fixture set + registry update. Pre-existing gap; deferral is cost-driven, not structurally permanent. Under stronger production-readiness constraints (e.g., production story-bundle authorization), implementing these is on the critical path.
- **`describe_capabilities` static-claim mismatch** `(pragmatic)`: D9 substitutes archived-ticket links for runtime capability checks. If a future MCP-server major version changes deployed capabilities without updating skill prose, the skill's "now landed" link could become stale (the ticket landed, but the capability was later removed or renamed). A follow-up enhancement could add `describe_capabilities` pre-flight checks to skills whose execution depends on capability currency; this spec defers the heavier discipline.
- **Shared-template proliferation**: D6 adds a sixth file under `.claude/skills/_shared-templates/` (joining story-state-contract.md, clothing-consistency-vocabulary.md, and others). If the shared-template directory grows further, a brief README enumerating template scope and consumers may help. Out of scope for this spec.
- **D9 site enumeration**: the exhaustive list of "now landed" occurrences was not enumerated at spec-authoring time (deferred to ticket-authoring per FOUNDATIONS shared-discipline cross-skill grep). Ticket authoring must produce the site list before the multi-file edit pass; the §Authoring-time site enumeration discipline in the brainstorm skill's Multi-file triage rules applies.
