---
name: mcp-integration-audit
description: "Use after a sibling skill (e.g., branching-story-bootstrap, branching-story-health-audit, canon-addition) was exercised in the current Claude session and you want to audit how the world-index DB / MCP retrieval / validator / hook / patch-engine pipeline served that work. Identifies undisclosed pipeline-fallback patterns and emits implementation tickets at tickets/<NAMESPACE>-<NNN>.md. Mutates: only tickets/ (never .claude/skills/, docs/FOUNDATIONS.md, specs/, or worlds/<slug>/)."
user-invocable: true
arguments:
  - name: target_skill_path
    description: "Path to the just-exercised skill's directory (e.g., .claude/skills/branching-story-bootstrap). The skill must exist and have been exercised in the current session — Pre-flight verifies both."
    required: true
  - name: namespace_overrides
    description: "Optional comma-separated finding-id-to-namespace overrides for cases where the auto-routed namespace is wrong (e.g., 'F1=VALENH,F3=PEENH'). Rare; the default routing per audit category is usually correct."
    required: false
---

# MCP Integration Audit

Audit how the world-index DB / MCP retrieval / validator / hook / patch-engine pipeline served a just-exercised sibling skill in the current Claude session, and emit implementation tickets for every undisclosed pipeline-fallback pattern that surfaced.

<HARD-GATE>
Do NOT Write any ticket file at `tickets/<NAMESPACE>-<NNN>.md` until ALL of the following hold:

(a) Pre-flight has verified `docs/FOUNDATIONS.md`, `tickets/_TEMPLATE.md`, `tickets/README.md`, and the `target_skill_path` directory's `SKILL.md` are all readable; if any is missing the skill aborts before Phase 1.

(b) Pre-flight has verified the target skill was actually exercised in the current Claude session — at least one assistant tool call this session names the target skill, OR a `Skill` tool invocation this session resolved to the target skill, OR the user explicitly states in this session that the target skill was just used. If session evidence is absent, the skill aborts before Phase 1 with a clear "no session evidence — re-invoke after exercising <target_skill_path>" message.

(c) Phase 5 (Codebase verification) has completed for every finding, and every finding's claimed missing capability has been re-verified absent at HEAD via grep against the relevant `tools/<package>/src/` tree (or the relevant doc file for a docs-drift finding); findings whose claimed gap is present at HEAD are reclassified as false-positives and dropped before Phase 6.

(d) Phase 6 has emitted the triage summary table in chat (numbered findings with ID, Category, Namespace, Severity, Session-evidence one-liner, Codebase-verification one-liner, Auto-routed-namespace columns) AND every finding has an explicit user disposition — file-as-ticket, defer-with-rationale, or reject-as-false-positive — OR the auto-mode auto-approval condition has fired (auto mode active AND (zero findings remain after Phase 4's known-deferred-debt drop OR every surviving finding is severity LOW or MEDIUM with no FOUNDATIONS-amendment routing)).

(e) Every finding tagged for filing has a namespace allocated by Phase 7's pre-write scan of `tickets/` + `archive/tickets/` for the next free integer in the chosen namespace; collisions abort with a specific-id error before any Write.

This gate is authoritative under Auto Mode or any other autonomous-execution context — invoking this skill does not constitute approval of the ticket batch. The skill may only proceed to Phase 7 (batched ticket writes) once every gate condition above holds simultaneously.
</HARD-GATE>

## Process Flow

```
Pre-flight: Verify required reads (FOUNDATIONS.md, tickets/_TEMPLATE.md,
            tickets/README.md, target_skill_path/SKILL.md); verify session
            evidence of target skill exercised this session.
       |
       v
Phase 1: Mandatory reads (target SKILL.md + references/ + templates/,
         tickets/_TEMPLATE.md, tickets/README.md, docs/FOUNDATIONS.md if
         not already in context).
       |
       v
Phase 2: Session reflection — scan assistant turns for pipeline-fallback
         patterns across six categories (MCP retrieval, world-index schema,
         validator coverage, hook coverage, patch-engine ops, FOUNDATIONS
         contract, plus docs-drift sub-category).
       |
       v
Phase 3: Categorize findings — auto-route each to its namespace per the
         category-to-namespace map (MCPENH / VALENH / HOOK / PEENH /
         FOUNDATIONS); apply namespace_overrides if provided.
       |
       v
Phase 4: Severity-tag (CRITICAL/HIGH/MEDIUM/LOW); cross-check against the
         target skill's Guardrails for known-deferred-debt disclosures and
         drop matches as already-disclosed-not-a-finding.
       |
       v
Phase 5: Codebase verification — grep current state of tools/world-mcp/src/,
         tools/world-index/src/, tools/validators/src/, tools/hooks/,
         tools/patch-engine/src/ (or relevant docs file for docs-drift) to
         confirm each surviving finding's gap is genuinely absent at HEAD;
         reclassify findings whose gap is present as false-positives and
         drop them.
       |
       v
Phase 6: Present triage summary table in chat; await per-finding disposition
         (file / defer-with-rationale / reject-as-false-positive) OR auto-mode
         auto-approval when conditions hold.
       |
       +-- [HARD-GATE fires here — see top of skill]
       |
       v
Phase 7: Allocate ticket IDs per namespace (scan tickets/ + archive/tickets/
         for next free integer); batched parallel ticket writes (one Write
         tool call per filed finding at tickets/<NAMESPACE>-<NNN>.md).
       |
       v
Phase 8: Final summary — ticket paths, namespace distribution, dependency
         graph (if any cross-ticket Deps were declared), suggested
         implementation order, sibling-handoff to /skill-audit for
         skill-prose findings (per Shape B). Do NOT commit.
```

## Inputs

**Required:**
- `target_skill_path` — path to the just-exercised skill's directory (e.g., `.claude/skills/branching-story-bootstrap`). Must exist as a directory containing `SKILL.md` at Pre-flight; the skill must have been exercised in the current session per the HARD-GATE condition (b).

**Optional:**
- `namespace_overrides` — comma-separated finding-id-to-namespace overrides for cases where the auto-routed namespace is wrong (e.g., `F1=VALENH,F3=PEENH`). Format: `<finding-id>=<namespace>` pairs separated by commas. Overrides are applied at Phase 3 after the auto-routing rule runs. Rare; the default category-to-namespace map is usually correct.

## Output

| Class | File path | Created when |
|---|---|---|
| Implementation ticket | `tickets/<NAMESPACE>-<NNN>.md` | Per finding tagged `file` at Phase 6 disposition |
| Triage summary table | (chat only — emitted at Phase 6 before any Write) | Always |
| Final summary | (chat only — emitted at Phase 8 after all Writes) | Always |

The skill emits no Canon Fact Records, no Change Log Entries, no adjudication records, and no YAML structured output. Tickets are markdown documents following `tickets/_TEMPLATE.md` exactly. The triage table and final summary are conversational outputs (parallel to spec-to-tickets's Step 4 and Step 6 surfaces).

Per-namespace ticket count is not bounded in advance — most invocations produce 0-5 tickets; large pipeline-touching skill sessions (e.g., a full `branching-story-bootstrap` run that exercised every story-bundle ID class) may produce 8-12. The skill makes no claim about the "right" count; the proposal explicitly says the goal is "as robust as possible", which means filing every legitimate gap surfaced by session evidence.

## World-State Prerequisites

Before this skill acts, it MUST read (per FOUNDATIONS.md §Tooling Recommendation):

- `<target_skill_path>/SKILL.md` — the just-exercised skill's full SKILL.md content. Read at Phase 1. The audit needs the skill's declared phase prose, World-State Prerequisites block, Pre-flight Check, Validation Rules upheld, FOUNDATIONS Alignment table, and Guardrails section (especially the known-deferred-debt disclosures referenced at Phase 4).
- `<target_skill_path>/references/*.md` — every reference document the target skill loads. Read at Phase 1 when present (some skills have no `references/` subdirectory). Reference docs frequently carry the load-bearing implementation prose for phases the SKILL.md proper only summarizes.
- `<target_skill_path>/templates/*.{yaml,md}` — every template the target skill emits or consumes. Read at Phase 1 when present. Templates carry the parse-time field schema that downstream consumers depend on; gaps in template coverage frequently route to MCPENH (when the schema needs MCP-side support) or VALENH (when a validator should enforce the schema).
- `tickets/_TEMPLATE.md` — the canonical ticket structure; every ticket produced at Phase 7 must follow this template exactly. Read at Phase 1.
- `tickets/README.md` — the ticket authoring contract; defines required sections and mandatory pre-implementation checks. Read at Phase 1.
- `docs/FOUNDATIONS.md` — the non-negotiable design contract. Skip if read earlier in this session and unmodified. **When skipping the FOUNDATIONS read** because content was loaded earlier in the session, NAME the load mechanism explicitly in the user-facing skip announcement (e.g., *"FOUNDATIONS already in context via direct Read at <Nth-message-or-tool-call>"* / *"via `<skill-name>`'s pre-flight at message N which executed the Read"* / *"via system-reminder injection at message N reproducing the document verbatim"*). A bare *"already loaded"* claim without naming the mechanism makes skip-eligibility unverifiable from the audit trail and risks Phase 5 codebase-verification passes that needed FOUNDATIONS content silently degrading when only CLAUDE.md was in context. CLAUDE.md system-reminder content does NOT satisfy the criterion unless it reproduces FOUNDATIONS.md verbatim, since references to FOUNDATIONS principles in CLAUDE.md are operator-summary, not the document itself. Parallel to `.claude/skills/skill-audit/SKILL.md` Step 2's same rule. The meta-tooling-target carve-out at skill-audit's Step 2 ("alignment will be N/A per Step 4") still applies when this skill itself is being audited — but the FOUNDATIONS skip on THIS skill's invocation (where the audit target is some OTHER skill) follows the load-mechanism-naming rule above because Phase 5 verification can require FOUNDATIONS content for `FOUNDATIONS-NNN` findings.
- `docs/HARD-GATE-DISCIPLINE.md` — the HARD-GATE execution pattern reference. Read on demand at Phase 2 when session evidence shows the target skill executed canon-mutating writes (the audit must verify the HARD-GATE was actually fired before the writes, not bypassed). Skip otherwise.
- `docs/MACHINE-FACING-LAYER.md` and `docs/CONTEXT-PACKET-CONTRACT.md` — pipeline-level contracts that the audit checks for drift against actual MCP behavior. Read on demand at Phase 2 when a finding implicates packet-shape behavior or retrieval-tool-scope claims.

**Pipeline scope, not world scope.** This skill operates at **pipeline scope** (meta-tooling). It reads under `tools/`, `.claude/skills/`, `docs/`, `tickets/`, and `archive/tickets/`. It does **not** read world-level canon (`worlds/<slug>/`) — the audit's evidence axes are session reflection (assistant tool calls in the prior turns) and codebase state (current `tools/` and `.claude/skills/` content), neither of which lives under `worlds/`. If a future audit-target skill genuinely required world-canon context to evaluate (e.g., "did the validator catch this CF's Rule 5 violation?"), that would route through `continuity-audit` not this skill.

**No `mcp__worldloom__get_context_packet` use.** The skill does not call the context-packet retrieval surface; its reads are direct file reads of pipeline-level files. This is the standard meta-tooling read pattern (matching `spec-to-tickets`, `skill-audit`, and the brainstorm skill). The audit *evaluates* `get_context_packet` behavior from session evidence — it does not consume the packet itself.

**Codebase verification reads at Phase 5** are scoped to:
- `tools/world-mcp/src/**/*.ts` for MCP retrieval gaps
- `tools/world-index/src/**/*.ts` for world-index schema gaps
- `tools/validators/src/**/*.ts` for validator coverage gaps
- `tools/hooks/**/*` and `.claude/settings.json` for hook coverage gaps
- `tools/patch-engine/src/**/*.ts` for patch-engine op gaps
- `docs/FOUNDATIONS.md` (re-read targeted sections only) for FOUNDATIONS contract gaps
- `docs/MACHINE-FACING-LAYER.md`, `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/HARD-GATE-DISCIPLINE.md`, and the per-package README at `tools/<package>/README.md` (e.g., `tools/world-mcp/README.md`, `tools/world-index/README.md`, `tools/patch-engine/README.md`, `tools/validators/README.md`) for docs-drift findings — per-package READMEs document the same MCP / world-index / patch-engine / validator API surfaces parallel to the `docs/*.md` files and are read by skill operators consulting tool behavior

These reads use `Grep`/`Glob`/`Read` directly — no MCP retrieval involved at any audit phase.

## Pre-flight Check

Before Phase 1, verify all of:

1. `docs/FOUNDATIONS.md` exists and is readable.
2. `tickets/_TEMPLATE.md` exists and is readable.
3. `tickets/README.md` exists and is readable.
4. `<target_skill_path>` resolves to an existing directory containing a readable `SKILL.md` file. If `<target_skill_path>` was given without the `.claude/skills/` prefix, normalize.
5. **Session evidence of target-skill exercise**: scan the prior conversation context for at least one of (a) an assistant tool call this session whose arguments name the target skill (e.g., a `Read` of `.claude/skills/<target>/SKILL.md` followed by Phase-execution tool calls); (b) a `Skill` tool invocation this session whose `skill` argument resolved to the target skill; (c) an explicit user statement in this session that the target skill was just used. If zero prongs match, abort with `"No session evidence found for <target_skill_path> — re-invoke after exercising the skill, or ensure the prior session is in the conversation context."`
6. If `namespace_overrides` is provided, parse it as `<finding-id>=<namespace>` pairs and validate each namespace against the known set `{MCPENH, VALENH, HOOK, PEENH, FOUNDATIONS}`. Unknown namespaces abort.
7. If a worktree root is active, all paths resolve from the worktree root, not the main repo root.

If any check fails, abort with a clear message before Phase 1.

## Phase 1: Mandatory Reads

Read in this order (skip any already in context this session):

1. `<target_skill_path>/SKILL.md` — entire file.
2. `<target_skill_path>/references/*.md` — every reference doc when present (use `Glob` first to enumerate). Reference docs frequently carry phase-execution prose the SKILL.md only summarizes.
3. `<target_skill_path>/templates/*.{yaml,md}` — every parse-time-schema-bearing template when present (skip templates that ship prompt content rather than field schemas, e.g., a `content-policy.txt` block prepended to LLM prompts OR a recommended-but-non-binding open-vocabulary tag/term dictionary inlined into LLM prompts as authorial guidance — these carry no parse-time field schema; their absence from audit context produces no MCPENH / VALENH signal). The §World-State Prerequisites rationale narrows the intent: templates are read for the parse-time field-schema surface that downstream MCPENH / VALENH findings hinge on; templates that carry only LLM-prompt content add no audit-relevant signal.
4. `tickets/_TEMPLATE.md` — the canonical ticket structure.
5. `tickets/README.md` — the ticket authoring contract.
6. `docs/FOUNDATIONS.md` — skip if read earlier in this session and unmodified. When skipping, NAME the load mechanism per the §World-State Prerequisites elaboration above — bare "already loaded" claims are insufficient.

Parse the target SKILL.md and identify: declared World-State Prerequisites, declared Pre-flight Check shape, Validation Rules upheld, FOUNDATIONS Alignment N/A rows, Guardrails section's known-deferred-debt disclosures (lines naming `<NAMESPACE>-NNN` ticket references for surfaces the skill works around). The Guardrails disclosures are the Phase 4 known-deferred-debt drop list.

## Phase 2: Session Reflection

Scan the prior conversation context for assistant tool-use evidence of pipeline-fallback patterns. The six audit categories (plus docs-drift sub-category) and their detection patterns:

1. **MCP retrieval gap** — the assistant made a direct `Read` / `Grep` / `Glob` call against `_source/<subdir>/`, `worlds/<slug>/stories/<story>/_source/`, or any pipeline-managed surface where an `mcp__worldloom__*` tool exists for the same data. Detection prong: tool-call patterns like `Read` of `worlds/.../canon/CF-NNNN.yaml` (when `get_record` exists); `Glob` of `worlds/.../mystery-reserve/*.yaml` followed by per-file `Read` (when `list_records(record_type='mystery_reserve', include_full_body=true)` exists); manual context-packet construction via multiple `Read` calls (when `get_context_packet(task_type=<X>)` registration would deliver the same in one call); or direct `Read` of `tools/validators/src/schemas/<class>.schema.json` (when `get_record_schema(node_type=<X>)` doesn't accept the record class — for example, when story-bundle record types are absent from the schema-discovery enum). Sub-category: docs-drift in `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, `docs/HARD-GATE-DISCIPLINE.md`, or any per-package README at `tools/<package>/README.md` when the docs claim a behavior, schema, or contract the actual MCP / patch-engine / world-index pipeline doesn't deliver, OR omit a behavior the pipeline silently requires (e.g., CLI cwd anchoring). The Phase 5 §Codebase Verification scope below enumerates the same docs-drift surfaces — the prong list and the verification scope are kept aligned so a finding discoverable at one phase is also discoverable at the other.
2. **World-index schema gap** — the assistant fell back to file scans because the world-index doesn't expose a node type / edge type / projection field the skill needed. Detection prong: tool-call patterns like manual ID-class scans of a directory (when the world-index would surface the same via a typed query) or repeated targeted `Grep` patterns that mirror what an indexed-edge lookup would deliver atomically; OR world-index `unexpected_path` warnings on legitimate world-or-story-bundle files (when `tools/world-index/src/enumerate.ts`'s `isIndexablePath` enumeration omits documented file shapes — e.g., the storylet-pool-authoring session on 2026-05-04 surfaced 7 false-positive `unexpected_path` warnings for `stories/<slug>/STORY_KERNEL.md`, `pages-prose/*.md`, and `storylet-batches/*.md` paths that FOUNDATIONS §Story Bundles documents as canonical, routing to MCPENH-037).
3. **Validator coverage gap** — the assistant authored an inline structural / Rule-N invariant check that a `tools/validators/src/` validator should catch automatically. Detection prong: assistant prose stating "verify X invariant" followed by inline grep evidence rather than a `world-validate` invocation; a Phase-N-of-target-skill instruction to manually check field completeness, schema conformance, or Rule-N compliance that the validator framework already covers structurally.
4. **Hook coverage gap** — a defensive guard the target skill authored inline because a Claude Code hook (`.claude/settings.json`) doesn't enforce the surface; OR a hook that fired noisily on legitimate skill behavior (false-positive blocks). Detection prong: inline "do not Edit/Write X" prose in target SKILL.md without a corresponding hook entry; tool-call evidence of a hook block on a legitimate write that the skill had to work around.
5. **Patch-engine op gap** — the assistant used direct `Write` / `Edit` for canon-mutating writes because no `mcp__worldloom__submit_patch_plan` op exists for the mutation. Detection prong: tool-call patterns like direct `Write` of `worlds/<slug>/_source/<class>/<ID>.yaml` without an engine-routed patch plan (note: Hook 3 should structurally block this — failure of Hook 3 to block IS a HOOK-NNN finding; legitimate pre-engine direct writes during bootstrap-style genesis are an EXISTING pattern, not a finding).
6. **FOUNDATIONS contract gap** — the audit reveals `docs/FOUNDATIONS.md` is silent on a surface the skill needs governed (storage form for a new record class, read/write discipline for a new directory, validation-rule scope for a new sub-pipeline, per-class enumeration in §Mandatory World Files, contract-level commitment that's silently ambiguous). Detection prong: target-skill prose that improvises a discipline FOUNDATIONS doesn't yet codify, or a session moment where the assistant had to make a contract-level judgment call without textual support.

For each candidate finding, record: (i) the session-evidence one-liner (what specifically the assistant did this session); (ii) the auto-routed audit category; (iii) the candidate severity (initial guess; finalized at Phase 4).

## Phase 3: Categorize and Auto-Route

Map each candidate finding to its namespace per the category-to-namespace table:

| Category | Namespace | Notes |
|---|---|---|
| MCP retrieval gap | `MCPENH` | Index-schema gaps that pair with retrieval gaps also route here (the index and retrieval surface co-evolve; MCPENH-025/026 precedent). CHARGENMCP is the archived character-generation-specific early namespace; MCPENH is the live successor. |
| World-index schema gap (no MCP coupling) | `MCPENH` | Same namespace; index-only changes are rare without paired MCP work. |
| Validator coverage gap | `VALENH` |  |
| Hook coverage gap | `HOOK` |  |
| Patch-engine op gap | `PEENH` | PATCHENG is the archived early-phase namespace; PEENH is the live successor. |
| FOUNDATIONS contract gap | `FOUNDATIONS` |  |

Apply `namespace_overrides` arguments after auto-routing if the operator provided any.

## Phase 4: Severity-Tag and Known-Deferred-Debt Drop

For each candidate finding, assign severity per the rubric:
- **CRITICAL** — gap caused the target skill to silently produce incorrect output, corrupt state, or violate a FOUNDATIONS principle. Rare.
- **HIGH** — the skill had to author a defensive workaround that a future non-vigilant operator would miss; OR the gap is a plausibly near-term failure mode on the next use of the target skill.
- **MEDIUM** — friction that cost non-trivial improvisation; the skill still produced correct output, but the path was not smooth.
- **LOW** — coverage gap or polish; did not block progress and a competent operator could work past it.

Then cross-check each finding against the target skill's Guardrails for known-deferred-debt disclosures, plus three additional drop categories that don't fit the known-deferred-debt shape (design-intent, archive-grep-confirmed, and pipeline-component-design-intent):

- **Known-deferred-debt — prose-linked**: a disclosure of the form `"<surface> via <tool>; <NAMESPACE>-NNN lands the support — see Guardrails §Known integration debt"` matches a finding when the surface and the routed namespace+ID align. Status string: `dropped (disclosed via <NAMESPACE>-NNN)`.
- **Known-deferred-debt — fallback-named**: a disclosure of the form `"until <NAMESPACE>-NNN lands; manual scan as fallback"` matches when the candidate finding's session-evidence one-liner cites that same fallback. Status string: `dropped (disclosed via <NAMESPACE>-NNN)`.
- **Design-intent / skill-internal discipline**: a finding whose nature is the target skill's design-intent skill-internal discipline (rather than a fallback for missing pipeline support) is dropped. Detection: the target skill's FOUNDATIONS Alignment table or Validation Rules section explicitly names a skill-internal mechanism (e.g., "Phase N gate K backstop") as the enforcement surface AND no `<NAMESPACE>-NNN` ticket is referenced. Distinguishing from known-deferred-debt: known-deferred-debt has a planned remediation in flight; design-intent has no planned pipeline support because the skill-internal mechanism IS the intended permanent state. Status string: `dropped (design-intent — skill owns the discipline by design, not by fallback)`.
- **Archive-grep-confirmed completed work without prose link**: a finding whose claimed gap is genuinely absent at HEAD (Phase 5 verification confirms) AND whose `<NAMESPACE>-NNN` audit-grep against `archive/tickets/<NAMESPACE>-*.md` returns a COMPLETED ticket whose Outcome explicitly resolves the same gap — even when the target skill prose does not link the completed ticket. Status string: `dropped (completed via archive/tickets/<NAMESPACE>-NNN, target skill prose not yet linked)`. The trailing "target skill prose not yet linked" clause is operationally significant: it surfaces that the cross-skill prose update (linking the completed ticket from the target's known-deferred-debt section) is a separate skill-prose drift to be filed via `/skill-audit <target_skill_path>`, not via this audit. Distinguishing from known-deferred-debt: known-deferred-debt has the link in target skill prose; archive-grep-confirmed has the work done but the link missing.
- **Pipeline-component-design-intent with target-skill documented fallback**: a finding whose nature is intentional behavior of a pipeline component (MCP retrieval surface, world-index profile, validator scope, hook coverage, patch-engine op, packet ranker / sizer) that the target skill's prose explicitly names as the operator-recovery path AND no `<NAMESPACE>-NNN` ticket is referenced. Detection: the pipeline component's source confirms the behavior is intentional (e.g., a registered profile with documented priority semantics like `invariants: "reserve"`, a documented scope decision, a deliberate validator-coverage boundary, an intentional persist-on-overflow / persisted_with_summary delivery mode) AND the target skill's §World-State Prerequisites or Phase prose names the fallback the operator should use to work around the intentional behavior (e.g., a packet-too-large fallback bullet naming `get_persisted_packet_slice` and whole-class `list_records` as the documented escape paths). Status string: `dropped (pipeline-design-intent — <pipeline component> intentionally <intentional behavior, citing the source location>; target skill names the documented fallback at <target-skill section>)`. Distinguishing from design-intent (category 3): category 3 covers target-skill-internal mechanisms (the skill OWNS the discipline — e.g., "Phase 9 gate 7 backstop"); this category covers pipeline-component-internal mechanisms (the pipeline component OWNS the discipline; the target skill OWNS only the fallback-invocation prose). Distinguishing from known-deferred-debt: known-deferred-debt has a planned remediation in flight (`<NAMESPACE>-NNN` ticket); pipeline-component-design-intent has no planned remediation because the pipeline behavior is the intended permanent state and the target-skill fallback is the intended permanent operator-recovery path. Worked precedent: skill-audit on mcp-integration-audit (this session) — Improvement 1's session evidence cited `get_context_packet(task_type='story_bootstrap', token_budget=18000)` returning `delivery_status='persisted_with_summary'` with empty inline node lists; the gap was classified under category 3 (design-intent) with extended rationale because this fifth slot didn't exist; with this slot in place, the drop status reads `dropped (pipeline-design-intent — story_bootstrap packet profile intentionally reserves invariants and mystery_reserve to separate list_records calls per tools/world-mcp/src/context-packet/shared.ts:219; target skill names the persisted_with_summary fallback at branching-story-bootstrap §World-State Prerequisites)` — the source-location citation in the status string is the verifiability guarantee parallel to category 4's `archive/tickets/<NAMESPACE>-NNN` citation.
**Per-finding archive content-grep — required for every surviving candidate**: after applying the known-deferred-debt prose-link / fallback-name match against the target skill's Guardrails, run an archive content-grep — `grep -niE '<terminology naming the gap>' archive/tickets/<NAMESPACE>-*.md` — to evaluate the `archive-grep-confirmed` drop condition explicitly per finding. If any archived ticket's Outcome explicitly resolves the same gap, drop the candidate with the `dropped (completed via archive/tickets/<NAMESPACE>-NNN, target skill prose not yet linked)` status string. The grep is a per-finding step parallel to §Phase 5's per-finding `tools/<package>/src/` verification — evaluating the drop implicitly from session memory risks filing duplicate tickets when an archived duplicate exists, because the archive's body content (Problem statement, What to Change, Outcome) is not in session context the way Phase 5 codebase greps make `tools/<package>/src/` content explicitly verifiable. The integer-highest scan run at §Phase 7 for ID allocation is NOT a substitute for this content-grep: §Phase 7's scan determines the next free ID; this Phase 4 grep determines whether an archived ticket already resolves the gap.

**Concept-overlap vs semantic-match**: archived tickets at adjacent architectural surfaces frequently mention the same artifact-directory names, file-path shapes, or domain terminology as the candidate finding without actually resolving its specific gap. Worked precedent: an inventory-gap finding (world-index emits `unexpected_path` warnings on legitimate story-bundle markdown files) greps `(unexpected_path|story_kernel|pages-prose|storylet-batches)` against `archive/tickets/MCPENH-*.md` and returns hits in MCPENH-010 / 014 / 015 / 018 (STORY / SLB / SAU / SP allocator tickets that scan those same directories in their allocator code paths) — but the allocator scope is distinct from the inventory-enumeration scope, and none of those tickets resolves the inventory gap. The drop criterion is the archived ticket's Outcome explicitly addressing THIS finding's specific gap (in this case: `isIndexablePath` enumeration in `tools/world-index/src/enumerate.ts`), not the ticket's mere mention of overlapping terminology. When the grep returns hits at adjacent surfaces, read each hit's Outcome before dropping — concept-overlap is an artifact of well-organized ticket history, not evidence that the gap is resolved.

- **All five matched categories are dropped as already-disclosed-not-a-finding** — they appear in the Phase 6 summary table with the corresponding status string so the audit trail records the disclosure (or design-intent, or archive-grep, or pipeline-design-intent) was honored.

The drop set is the WHOLE point of Shape B's "undisclosed" framing: a known fallback the skill openly named is not the audit's concern; an unnamed fallback is.

## Phase 5: Codebase Verification

For every surviving finding, grep current state at HEAD to confirm the claimed missing capability is genuinely absent. Scope per category:
- MCPENH findings → `tools/world-mcp/src/**/*.ts` (and `tools/world-index/src/**/*.ts` for paired index-schema findings).
- VALENH findings → `tools/validators/src/**/*.ts`.
- HOOK findings → `tools/hooks/**/*` and `.claude/settings.json`.
- PEENH findings → `tools/patch-engine/src/**/*.ts`.
- FOUNDATIONS findings → targeted re-read of `docs/FOUNDATIONS.md` sections cited by the finding.
- Docs-drift sub-category findings → the relevant docs file (`docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, `docs/HARD-GATE-DISCIPLINE.md`) AND the per-package README at `tools/<package>/README.md` (e.g., `tools/world-mcp/README.md`, `tools/world-index/README.md`, `tools/patch-engine/README.md`, `tools/validators/README.md`) when the docs-drift concerns the same package's API documentation.

**Working-tree vs HEAD disambiguation.** Run `git status --porcelain` at Phase 5 start. If any file within a surviving finding's grep scope shows modifications, the working-tree grep does NOT reflect HEAD. Either run `git show HEAD:<path>` (or `git diff HEAD -- <path>`) for HEAD-only verification, OR explicitly note any in-session changes in the eventual ticket's Assumption Reassessment item 1 (e.g., *"An uncommitted in-session edit to `<path>` partially addresses this gap by `<delta summary>`; the landed version should `<expected scope>`."*). The uncommitted state is audit-trail-significant — silently treating working-tree-as-HEAD risks (a) filing a ticket whose Phase 5 verification reflects the operator's in-session patch rather than committed state, leading the user-reviewer to think work was missed when it actually exists in the diff, OR (b) reclassifying the finding as a false-positive when the gap is genuinely present at HEAD and only the working tree has the fix. Symmetric to the existing rule below that catches user-landed-in-parallel-branch state change: that rule handles external state change between target-skill-invocation and audit; this paragraph handles internal state change WITHIN the audit session.

For each finding, record: (i) the exact greps run; (ii) the result (zero matches → gap confirmed absent; non-zero matches that contradict the gap claim → reclassify as false-positive). Findings reclassified as false-positives are dropped from the surviving set with a one-line rationale shown in the Phase 6 table.

This catches the failure mode where the assistant remembered a gap from earlier session work but the user landed the fix in a parallel branch / commit between the target skill's invocation and this audit. Without Phase 5, the audit would file a ticket for already-shipped work.

## Phase 6: Triage Summary and Per-Finding Disposition

Emit a numbered summary table in chat:

| # | Finding ID | Category | Namespace | Severity | Session Evidence | Codebase Verification | Status |
|---|------------|----------|-----------|----------|------------------|----------------------|--------|
| 1 | F1 | MCP retrieval gap | MCPENH | HIGH | <one-line> | <one-line> | candidate |
| 2 | F2 | Validator coverage gap | VALENH | MEDIUM | <one-line> | <one-line> | candidate |
| 3 | F3 | (any) | (any) | (any) | <one-line> | (n/a) | dropped — disclosed via MCPENH-018 |

For each `candidate` row, obtain an explicit disposition:
- **file** — write a ticket at Phase 7.
- **defer-with-rationale** — record the deferral in Phase 8's final summary; do not write a ticket. Used when the user judges the gap is real but should wait (e.g., needs a paired upstream landing first).
- **reject-as-false-positive** — drop the finding; record the rejection rationale in Phase 8's final summary.

**Inclusive-phrasing dispositions** (synonyms for "file every surviving candidate"): `proceed`, `file all`, `approve`, `implement all`, and any similar inclusive phrasing the user supplies in response to the disposition request — phrasing that does not name specific finding numbers AND does not use one of the three explicit dispositions above — are synonymous with filing every surviving candidate. Per-finding overrides (e.g., `file 1, defer 2, reject 3`) take precedence when the user names them explicitly. The auto-mode auto-approval condition below still gates whether the audit auto-passes WITHOUT a prompt; the inclusive-phrasing rule here governs how to interpret the user's explicit answer when the gate IS shown — HIGH/CRITICAL findings under inclusive phrasing still file (the auto-approval rule and the inclusive-phrasing rule are independent surfaces).

**Auto-mode auto-approval condition** (per HARD-GATE condition (d)): when auto mode is active AND (zero candidate rows survive Phase 4's known-deferred-debt drop OR every surviving candidate is severity LOW or MEDIUM with no FOUNDATIONS-amendment routing), auto-approve all candidates as `file` and proceed to Phase 7. Otherwise wait for explicit per-finding disposition.

## Phase 7: Allocate IDs and Batched Ticket Writes

For each finding tagged `file`:

1. **Allocate the next free ID in the chosen namespace**: scan `tickets/<NAMESPACE>-*.md` and `archive/tickets/<NAMESPACE>-*.md` for the highest existing integer; allocate `highest + 1`. Allocation is in-process — if multiple findings share a namespace in the same audit, increment for each. Pad to 3 digits (`MCPENH-028`, `VALENH-002`, etc.).
2. **Compose the ticket body** following `tickets/_TEMPLATE.md` exactly. Every ticket must include: Status (PENDING), Priority (CRITICAL/HIGH/MEDIUM/LOW per Phase 4 severity), Effort (Small/Medium/Large per implementation surface size), Engine Changes (which `tools/<package>/` or `.claude/skills/<skill>/` is touched), Deps (other tickets in this batch or pre-existing tickets/specs).
3. **Assumption Reassessment** must include items 1-3 from `tickets/_TEMPLATE.md` always-required (codebase reassessment, doc reassessment, shared-boundary identification when cross-skill) plus any of items 4-9 that match the ticket's scope. The Phase 5 codebase verification output is the source for items 1-2; the Phase 2 session reflection is the source for the user-facing problem framing. **Use the Select → Rewrite → Verify sequence** from spec-to-tickets Step 5: select the matching menu items, rewrite each surviving item's number to its position in the surviving list starting at 4, verify the final list reads `1, 2, 3, 4, 5, …` with no gaps. **Worked example**: a ticket that selects template items 1, 2, 3 (always required) plus item 6 (schema extension) and item 7 (Rule-6 retcon attribution) writes them as `1, 2, 3, 4, 5` — items 6 and 7 are rewritten to `4` and `5` because they are the 4th and 5th surviving items in this ticket's list. Lists like `1, 2, 3, 4, 6, 7` or `1, 2, 3, 4, 6, 7, 8` are malformed output — they signal that step (2) was skipped, with selected items still wearing their menu labels. Catching gaps via the Select → Rewrite → Verify sequence at composition time is cheaper than fixing them via the post-Write numbering-continuity check below.
4. **Architecture Check** — name why the proposed implementation is cleaner than alternatives; explicitly state no backwards-compatibility shims.
5. **Verification Layers** — map each invariant to its proof surface (codebase grep, schema validation, skill dry-run, FOUNDATIONS alignment check). The Phase 5 verification command set is the starting point.
6. **What to Change** — numbered sections with specific implementation details, derived from the session-evidence one-liner expanded into the implementation surface the gap requires.
7. **Files to Touch** — exact paths from the Phase 5 grep scope; mark as `(new)` or `(modify)`.
8. **Out of Scope** — explicit non-goals; what this ticket must NOT change.
9. **Acceptance Criteria** with Tests-That-Must-Pass and Invariants per the template.
10. **Test Plan** with New/Modified Tests and Commands per the template.

**Pre-Write Deps-path verification**: for every `Deps:` ticket reference cited in a composed ticket body, run `test -f <path>` against `tickets/` and `archive/tickets/` BEFORE the batched Write call. Any unresolved path means either (a) a typo in the cited filename — correct in the composition buffer before Write, OR (b) the cited dep no longer exists at the cited path — re-evaluate whether the dep relationship is still load-bearing or whether the dep was renamed / archived to a different filename. Resolve all mismatches in the composition buffer before the batched Write call below. The Phase 8 sub-step 3 `test -f` check remains the structural backstop for auto-archival that happens mid-flow between composition and submit; this Phase 7 pre-Write check is the prevention pattern that keeps the backstop from being the primary detection mechanism for the simpler typo / outdated-filename cases (e.g., citing `archive/tickets/<NAMESPACE>-NNN-descriptive-suffix.md` when the actual archived filename is the bare `<NAMESPACE>-NNN.md` form). Catching at Phase 7 saves a post-Write Edit cycle.

**Rule 6 (No Silent Retcons) discipline**: every ticket modifying existing pipeline code must cite retcon justification in its Assumption Reassessment — what existing behavior changes, what the new behavior is, why the change is warranted. The session evidence captured at Phase 2 IS the retcon justification (the target skill's silent fallback IS the existing behavior; the proposed engine support IS the new behavior; the audit's emergence IS the warrant).

**Batch all Write calls in one assistant message** with N parallel `Write` tool calls (one per filed finding). For typical mcp-integration-audit invocations (1-5 tickets), a single batched message is the norm. For 6+ findings, 2-3 batched messages keep individual messages legible. Compose every ticket's full content first, then emit all Write calls in a single tool-use block.

After the parallel batch returns, verify every ticket file was created. If any Write call failed (typo in path, permission error), retry that ticket with the corrected argument before Phase 8 — do not advance to Phase 8 until all ticket files exist at their intended paths.

**Numbering-continuity check after every Write**: for each ticket file at `tickets/<NAMESPACE>-NNN.md`, run `awk '/^## Assumption Reassessment/,/^## Architecture Check/' tickets/<NAMESPACE>-NNN.md | grep -oE '^[0-9]+'` (numbers extracted by grep alone — no awk field-split needed; this avoids the harness-substitution risk that affects `$1`-style references in skill body text when a positional namespace argument is bound) and verify the output is a strictly sequential integer sequence (`1 2 3 ...`). Any gap (e.g., `1 2 3 4 6 7` or `1 2 3 4 6 7 8`) is malformed — the Step 3 Select → Rewrite → Verify sequence's step (2) was not applied. Fix the offending ticket via Edit before advancing to Phase 8. This post-Write check is the structural backstop parallel to spec-to-tickets Step 6.2(b); the composition-time worked example at Step 3 is the prevention.

## Phase 8: Final Summary

After all writes succeed:

1. **List every ticket file created** (paths, with namespace + severity).
2. **Namespace distribution** — e.g., "3 MCPENH, 1 VALENH, 1 HOOK, 0 PEENH, 0 FOUNDATIONS". The distribution is informational; large skewing toward one namespace surfaces signal about the target skill's primary integration surface.
3. **Cross-ticket dependency graph** — when emitted tickets share Deps relationships (rare but real for paired index-schema + retrieval findings, parallel to MCPENH-025/026/027), name them. Use `test -f` (or equivalent path-existence check) on every Deps path to capture any auto-archival that happened mid-flow.
4. **Suggested implementation order** — typically by severity (CRITICAL → HIGH → MEDIUM → LOW) within each namespace, then by Deps dependency where present.
5. **Deferred findings** (per `defer-with-rationale` dispositions at Phase 6) and **rejected findings** (per `reject-as-false-positive`) — listed with their rationale so the audit trail is complete.
6. **Sibling-handoff to `/skill-audit`** — when Phase 2 surfaced any candidate finding whose nature is "skill prose unclear / step ordering wrong / instruction missing" (i.e., a Shape-B-out-of-scope concern), explicitly recommend `/skill-audit <target_skill_path>` as the follow-up so the operator can route those findings through the right skill. This sibling-handoff is the closeout-menu's conditional out-of-scope option.

Do NOT commit. Leave files for user review.

## Validation Rules This Skill Upholds

- **Rule 6: No Silent Retcons** — enforced at Phase 7 (ticket writes). Every ticket modifying existing pipeline code (skills, tools, hooks, validators, schemas, FOUNDATIONS clauses) must cite retcon justification in its Assumption Reassessment section — what existing behavior is changing, what the new behavior is, and why the change is warranted. The Phase 2 session-evidence one-liner IS the retcon justification: the target skill's silent fallback IS the existing behavior, the proposed engine support IS the new behavior, the audit's emergence IS the warrant. Silent "update X to Y" tickets without retcon attribution fail this rule.

Rules 1, 2, 3, 4, 5, 7 are N/A for this skill. See FOUNDATIONS Alignment table below for the per-rule handoff to the sibling skill that DOES enforce each.

## Record Schemas

N/A — this skill does not emit structured YAML records. Output is markdown ticket files following `tickets/_TEMPLATE.md` exactly. The template's per-section structure (Status / Priority / Effort / Engine Changes / Deps / Problem / Assumption Reassessment / Architecture Check / Verification Layers / What to Change / Files to Touch / Out of Scope / Acceptance Criteria / Test Plan) is the only "schema" this skill emits against — it is enforced by reference, not by re-stating the structure inline.

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|-----------|-------|-----------|
| Tooling Recommendation (§"non-negotiable") | Pre-flight + Phase 1 | `docs/FOUNDATIONS.md`, `tickets/_TEMPLATE.md`, `tickets/README.md`, and `<target_skill_path>/SKILL.md` are required mandatory reads; the skill refuses to audit without them. The audit *evaluates* the MCP retrieval surface (per §Tooling Recommendation's documented context-packet + targeted-retrieval pattern) from session evidence — gaps in that surface fire as findings routed to MCPENH. |
| Rule 1: No Floating Facts | N/A | Not applicable — meta-tooling skill does not emit Canon Fact Records; output tickets enforce Rule 1 *transitively* by requiring `tickets/_TEMPLATE.md` fidelity (Acceptance Criteria, Invariants, Files to Touch are all required ticket sections that prevent floating-fact-shaped tickets). Handoff to `canon-addition` for CF-level Rule 1 enforcement. |
| Rule 2: No Pure Cosmetics | N/A | Not applicable — meta-tooling skill does not introduce world-level content. Handoff to `canon-addition` for canon-fact cosmetic-vs-substantive review. |
| Rule 3: No Specialness Inflation | N/A | Not applicable — meta-tooling skill does not add exceptional world elements. Handoff to `canon-addition` for specialness-inflation guard on canon additions. |
| Rule 4: No Globalization by Accident | N/A | Not applicable — meta-tooling operates at pipeline scope; there is no per-fact scope to inflate. Handoff to `canon-addition` for per-fact scope detection. |
| Rule 5: No Consequence Evasion | N/A | Not applicable — this skill does not emit canon facts; second-order effects of pipeline gaps are tracked as Deps relationships across emitted tickets (informational, not an enforcement gate). Handoff to `canon-addition` for per-fact consequence propagation. |
| Rule 6: No Silent Retcons | Phase 7 | Every emitted ticket modifying existing pipeline code must cite retcon justification in its Assumption Reassessment. Session-evidence one-liner from Phase 2 IS the retcon justification. Silent "update X to Y" tickets fail this rule. |
| Rule 7: Preserve Mystery Deliberately | N/A | Not applicable — meta-tooling skill does not write canon and does not carry in-world content; the audit's reads are pipeline-level files (`tools/`, `.claude/skills/`, `docs/`) which contain no Mystery Reserve material. Handoff to the audit-target skill's Canon Safety Check (when applicable) for MR firewall enforcement on canon-touching writes; handoff to `continuity-audit` for MR-corruption auditing across worlds. |
| Canon Layering | N/A | Not applicable — meta-tooling skill does not write canon. Handoff to `canon-addition` for layer-assignment discipline. |
| Change Control Policy | N/A | Not applicable — meta-tooling skill does not emit Change Log Entries. Handoff to `canon-addition` for world-level canon changes. Ticket-level change attribution is covered by Phase 7's Assumption Reassessment discipline. |
| Canon Fact Record Schema | N/A | Not applicable — this skill does not emit CF Records; output is markdown tickets, not structured canon records. Handoff to `canon-addition` for CF emission. |
| Multi-world directory discipline | Pre-flight | Pipeline-scope (`meta` per the world-scope vocabulary) — the skill reads `tools/`, `.claude/skills/`, `docs/`, `tickets/` and does NOT read `worlds/<slug>/`. The world-scope declaration is `meta` because the audit's evidence axes are session reflection (session context) and codebase state (`tools/` / `.claude/skills/`), neither of which is per-world. |

## Guardrails

- **Tickets propose changes; they don't apply changes**: this skill emits ticket files at `tickets/<NAMESPACE>-<NNN>.md` for the user to land in a separate session. It does NOT modify `tools/`, `.claude/skills/`, `docs/`, `worlds/<slug>/`, or any pipeline file beyond the new ticket files themselves. Implementation of any filed ticket is a downstream activity outside this skill's scope.
- **Shape B audit boundary**: this skill audits the world-index DB / MCP retrieval / validator / hook / patch-engine pipeline as it served the target skill. It does NOT audit skill-prose issues (unclear instructions, misordered steps, missing examples) — those route to `/skill-audit <target_skill_path>`. Phase 8's final summary explicitly recommends the sibling handoff when Phase 2 surfaced any skill-prose-shaped concern. Mixing the two scopes inside one audit was rejected at the gap-filler step's Q1 in favor of explicit sibling handoff.
- **Session-evidence required**: every finding must cite specific assistant tool-use evidence from the prior conversation (per Phase 2's detection-prong discipline). Findings based purely on hypothetical concerns ("what if the MCP doesn't support X?") without observed tool-use evidence are NOT filed — they are out of scope for this skill, which is a *post-session reflection* tool. Speculative pipeline gaps belong in user-authored brainstorming/* docs and route through `brainstorm` + `skill-creator`, not through this audit.
- **Twofold evidence per finding**: every filed ticket must present both (i) Phase 2 session evidence and (ii) Phase 5 codebase verification confirming the gap is genuinely absent at HEAD. Tickets missing either layer are malformed and the audit must regenerate them.
- **Known-deferred-debt is not a finding**: when the target skill's Guardrails already disclose a fallback with a `<NAMESPACE>-NNN` reference (e.g., "manual scan until MCPENH-015 lands"), Phase 4 drops the matching candidate as `dropped — disclosed via <NAMESPACE>-NNN`. This is the load-bearing Shape-B "undisclosed" framing — a known fallback the skill openly named is not the audit's concern.
- **FOUNDATIONS amendment decision rule**: emit `FOUNDATIONS-NNN` tickets ONLY when the gap is a contract-level commitment (storage form, read/write discipline, validation-rule scope, per-class enumeration in §Mandatory World Files, contract-level commitment that's silently ambiguous). Implementation-level gaps route to `MCPENH/VALENH/HOOK/PEENH`. Misrouting an implementation gap to `FOUNDATIONS-NNN` produces contract bloat; misrouting a contract gap to an implementation namespace produces stable code that's still violating an unwritten contract. The decision is "is the FOUNDATIONS document silent on this discipline, or is the implementation merely missing support for an already-codified discipline?"
- **No FOUNDATIONS edits**: this skill NEVER edits `docs/FOUNDATIONS.md`. FOUNDATIONS amendments are described in `FOUNDATIONS-NNN` tickets the user lands in a separate session. Editing FOUNDATIONS is outside this skill's authority — same prohibition as `skill-creator` per its Guardrails.
- **No skill-prose edits**: this skill NEVER edits the target skill's `SKILL.md` or its references/templates. Skill-prose corrections route through `skill-audit`'s follow-up implementation flow, not this skill.
- **No canon writes**: this skill never writes to `worlds/<slug>/` files, `_source/<subdir>/*.yaml` records, or any world-level canon surface. Tickets are pipeline-level artifacts. If a finding's implementation would touch canon, that work happens in `canon-addition` once the ticket lands.
- **Codebase truth at Phase 5**: file paths, MCP tool names, validator names, and schema references in Phase 5 grep targets must be validated against the current `tools/` and `.claude/skills/` content, not assumed from session evidence alone. Stale grep targets propagated from session memory through Phase 5 are a skill failure.
- **Auto-mode gate still applies**: auto mode does not bypass the HARD-GATE. Auto-mode auto-approval at Phase 6 fires only when (zero candidate findings survive Phase 4's known-deferred-debt drop) OR (every survivor is severity LOW or MEDIUM with no FOUNDATIONS-amendment routing). CRITICAL/HIGH findings, FOUNDATIONS-amendment routings, or non-empty disposition queues all require explicit user approval even under auto mode.
- **Per-namespace ID allocation discipline**: scan `tickets/<NAMESPACE>-*.md` and `archive/tickets/<NAMESPACE>-*.md` at Phase 7 for the highest existing integer; allocate `highest + 1`; pad to 3 digits. Multiple findings sharing a namespace in the same audit increment in-process (audit-internal monotonic). Collisions abort with a specific-id error before any Write.
- **Worktree discipline**: if invoked inside a git worktree, all paths — reads, writes, globs, greps — resolve from the worktree root, not the main repo root.
- **Do not `git commit` from inside this skill**: Phase 8 explicitly states no commit. Writes land in the working tree; the user reviews the ticket diff and commits.

## Final Rule

An audit is not complete until every undisclosed pipeline-fallback pattern surfaced by session evidence has been verified absent at HEAD, routed to its correct namespace, dispositioned by the user (or auto-approved under the strict auto-mode condition), and either filed as a ticket with the Phase 2 session evidence cited as Rule 6 retcon justification OR explicitly deferred / rejected with rationale recorded in the final summary.
