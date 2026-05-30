---
name: skill-retrospective
description: "Use immediately after a worldloom skill was exercised in the current Claude session, to run a structured retrospective on how that skill — and the code, architecture, and machine-pipeline behind it — performed. Turns validation failures, warnings, friction, and common-sense defects into FOUNDATIONS-aligned improvement tickets that make the next use smoother, more solid, more validated, and more deterministic. Produces: improvement tickets at tickets/<NAMESPACE>-<NNN>-<slug>.md (per-subsystem namespace for code / architecture / determinism / skill-procedure findings; fixed MCPENH / VALENH / HOOK / PEENH / STOEXP / FOUNDATIONS map for machine-pipeline findings) + a chat-only triage table and final summary. Mutates: only tickets/ (never .claude/skills/, docs/FOUNDATIONS.md, specs/, tools/, or worlds/<slug>/)."
user-invocable: true
arguments:
  - name: target_skill_path
    description: "Path to the just-exercised skill's directory (e.g., .claude/skills/branching-story-turn-cycle). The skill must exist and have been exercised in the current session — Pre-flight verifies both."
    required: true
  - name: namespace_overrides
    description: "Optional comma-separated finding-id-to-namespace overrides for cases where the auto-routed namespace is wrong (e.g., 'F2=VALENH,F4=BSBOOT'). Rare; the default per-finding routing is usually correct."
    required: false
---

# Skill Retrospective

Run a structured, session-grounded retrospective on a worldloom skill that was just exercised this session — diagnosing where the skill, its supporting code, its architecture, the machine pipeline (world-index / MCP retrieval / validator / hook / patch-engine / story-explorer), and FOUNDATIONS alignment caused validation failures, warnings, friction, or plainly-wrong behavior — and emit FOUNDATIONS-aligned improvement tickets so the next use is smoother, more solid, more validated, and more deterministic.

<HARD-GATE>
Do NOT Write any ticket file at `tickets/<NAMESPACE>-<NNN>-<slug>.md` until ALL of the following hold:

(a) Pre-flight has verified `docs/FOUNDATIONS.md`, `tickets/_TEMPLATE.md`, `tickets/README.md`, and the `target_skill_path` directory's `SKILL.md` are all readable; if any is missing the skill aborts before Phase 1.

(b) Pre-flight has verified the target skill was actually exercised in the current Claude session — at least one assistant tool call this session names the target skill, OR a `Skill` tool invocation this session resolved to the target skill, OR the user explicitly states in this session that the target skill was just used. If session evidence is absent, the skill aborts before Phase 1 with a clear "no session evidence — re-invoke after exercising <target_skill_path>" message.

(c) Phase 5 (Verification) has completed for every finding, and every finding's claimed defect has been re-confirmed at HEAD — code/pipeline findings re-verified by grep against the relevant `tools/<package>/src/` tree (or doc file for a docs-drift finding); skill-procedure / architecture / determinism findings re-confirmed against the current `target_skill_path` SKILL.md and references; any finding whose claimed defect is already resolved at HEAD is reclassified as a false-positive and dropped before Phase 6.

(d) Phase 6 has emitted the triage summary table in chat (numbered findings with ID, Lens, Category, Namespace, Severity, Session-evidence one-liner, Verification one-liner, Mistake/Defect columns) AND every finding has an explicit user disposition — file-as-ticket, defer-with-rationale, or reject-as-false-positive — OR the auto-mode auto-approval condition has fired (auto mode active AND (zero findings remain after Phase 4's known-deferred-debt drop OR every surviving finding is severity LOW or MEDIUM with no FOUNDATIONS-amendment routing)).

(e) Every finding tagged for filing has a namespace resolved and an ID allocated by Phase 7's pre-write scan of `tickets/` + `archive/tickets/` for the next free integer in the chosen namespace; a finding routed to a per-subsystem namespace with no prior ticket history uses a freshly-proposed prefix that the user confirmed at the Phase 6 triage; collisions abort with a specific-id error before any Write.

This gate is authoritative under Auto Mode or any other autonomous-execution context — invoking this skill does not constitute approval of the ticket batch. The skill may only proceed to Phase 7 (batched ticket writes) once every gate condition above holds simultaneously.
</HARD-GATE>

## Process Flow

```
Pre-flight: Verify required reads (FOUNDATIONS.md, tickets/_TEMPLATE.md,
            tickets/README.md, target_skill_path/SKILL.md); verify session
            evidence that the target skill was exercised this session.
       |
       v
Phase 1: Mandatory Reads — target SKILL.md + references/*.md + templates/*,
         tickets/_TEMPLATE.md, tickets/README.md, docs/FOUNDATIONS.md (skip if
         already in context this session, naming the load mechanism).
       |
       v
Phase 2: Session Reflection — Seven Lenses. Scan this session's assistant turns
         for everything that went wrong or rough: (1) validation failures &
         warnings; (2) skill-procedure defects; (3) code-correctness bugs;
         (4) architecture / design smells; (5) determinism gaps; (6) machine-
         pipeline fallbacks (MCP / world-index / validator / hook / patch-engine
         / story-explorer); (7) FOUNDATIONS-contract gaps. Record per-finding
         session evidence + mistake-vs-defect attribution.
       |
       v
Phase 3: Attribute and Route — for each finding decide operator-mistake (drop)
         vs genuine defect (keep); route each kept finding to a namespace: fixed
         map for pipeline/FOUNDATIONS findings (MCPENH / VALENH / HOOK / PEENH /
         STOEXP / FOUNDATIONS), per-subsystem prefix (scanned from tickets/ +
         archive/tickets/) for skill-procedure / code / architecture /
         determinism findings. Apply namespace_overrides if provided.
       |
       v
Phase 4: Severity-Tag and Known-Deferred-Debt Drop — CRITICAL/HIGH/MEDIUM/LOW;
         per-finding archive content-grep against archive/tickets/<NAMESPACE>-*.md;
         cross-check the target skill's Guardrails for known-deferred-debt
         disclosures and drop matches as already-disclosed-not-a-finding;
         for drops not covered by these two primary categories, apply
         mcp-integration-audit's broader drop-category taxonomy (design-intent /
         skill-internal discipline, archive-grep-confirmed, pipeline-component-
         design-intent, in-session-sibling-filed-work, stale-artifact /
         housekeeping).
       |
       v
Phase 5: Verification — re-confirm each surviving finding's defect is genuinely
         present at HEAD: grep tools/<package>/src (or doc file) for code/pipeline
         findings; re-read the current target SKILL.md / references for skill-
         procedure / architecture / determinism findings. Drop false-positives.
       |
       v
Phase 6: Triage Summary and Per-Finding Disposition — present the triage table in
         chat; await per-finding disposition (file / defer-with-rationale /
         reject-as-false-positive), confirming any freshly-proposed per-subsystem
         prefix; OR auto-mode auto-approval.
       |
       +-- [HARD-GATE fires here — see top of skill]
       |
       v
Phase 7: Allocate IDs and Batched Ticket Writes — allocate ticket IDs per namespace
         (scan tickets/ + archive/tickets/ for next free integer); batched parallel
         ticket writes (one Write per filed finding at
         tickets/<NAMESPACE>-<NNN>-<slug>.md, following _TEMPLATE.md).
       |
       v
Phase 8: Final Summary — ticket paths, namespace distribution, dependency graph
         (if any cross-ticket Deps), suggested implementation order, and Shape-B
         out-of-scope routing (skill-prose-only findings -> /skill-audit; shared-
         template / contract findings -> direct edit). Do NOT commit.
```

## Inputs

**Required:**
- `target_skill_path` — path to the just-exercised skill's directory (e.g., `.claude/skills/branching-story-turn-cycle`). Must exist as a directory containing `SKILL.md` at Pre-flight; the skill must have been exercised in the current session per HARD-GATE condition (b). If given without the `.claude/skills/` prefix, normalize.

**Optional:**
- `namespace_overrides` — comma-separated `<finding-id>=<namespace>` pairs (e.g., `F2=VALENH,F4=BSBOOT`). Applied at Phase 3 after auto-routing. A namespace in an override may be any existing prefix found in `tickets/` + `archive/tickets/` OR one of the fixed pipeline namespaces; an unknown prefix is treated as a fresh-prefix proposal and surfaced for confirmation at Phase 6. Rare; the default per-finding routing is usually correct.

## Output

| Class | File path | Created when |
|---|---|---|
| Improvement ticket | `tickets/<NAMESPACE>-<NNN>-<slug>.md` | Per finding tagged `file` at Phase 6 disposition |
| Triage summary table | (chat only — emitted at Phase 6 before any Write) | Always |
| Final summary | (chat only — emitted at Phase 8 after all Writes) | Always |

The skill emits no Canon Fact Records, no Change Log Entries, no adjudication records, and no YAML structured output. Tickets are markdown documents following `tickets/_TEMPLATE.md` exactly. The triage table and final summary are conversational outputs (parallel to `mcp-integration-audit` Phase 6 / Phase 8 and `spec-to-tickets` Step 4 / Step 6).

Per-invocation ticket count is not bounded in advance — most invocations produce 0-6 tickets; a session that exercised a large skill end-to-end (e.g., a full `branching-story-bootstrap` run with many validation cycles) may produce more. The skill makes no claim about the "right" count; the goal per the source proposal is to file every legitimate improvement the session evidence supports.

## World-State Prerequisites

This is a **pipeline-scope meta-tooling skill** (per FOUNDATIONS classification), not a world-scope skill. It reads under `tools/`, `.claude/skills/`, `docs/`, `tickets/`, and `archive/tickets/`. It does **NOT** read world-level canon (`worlds/<slug>/`) and does **NOT** call `mcp__worldloom__get_context_packet` — its evidence axes are (1) session reflection (this session's assistant tool calls) and (2) codebase state (current `tools/` and `.claude/skills/` content), neither of which lives under `worlds/`.

Before this skill acts, it MUST read (the §Tooling-Recommendation "never operate on prose alone" obligation is satisfied here by reading the skill's own source-of-truth artifacts and the codebase it audits, not world canon):

- `<target_skill_path>/SKILL.md` — the just-exercised skill's full SKILL.md. Read at Phase 1. The retrospective needs its declared phases, World-State Prerequisites, Pre-flight Check, Validation Rules upheld, FOUNDATIONS Alignment table, and Guardrails (especially known-deferred-debt disclosures used at Phase 4).
- `<target_skill_path>/references/*.md` — every reference doc the target loads, when present (some skills have none). Reference docs carry the load-bearing phase prose the SKILL.md only summarizes — frequently where skill-procedure / determinism defects live. **Selective-read clause**: when the target ships ≤3 reference files OR the session lightly exercised the target (one phase), Read all upfront. When the target ships 4+ reference files AND the session exercised the target end-to-end across multiple phases, Glob to enumerate then defer per-reference Reads to Phase 5 verification when that phase needs the content; record the deferred-list at Phase 1 close so the audit-trail names which references were read upfront vs. read-on-demand. The selectivity applies to the declarative prerequisite here in parallel with the Phase 1 step 2 procedural rule — both sites carry the same constraint to keep declarative and procedural registers consistent.
- `<target_skill_path>/templates/*.{yaml,md}` — every parse-time-schema-bearing template the target emits or consumes, when present.
- `tickets/_TEMPLATE.md` — the canonical ticket structure; every ticket written at Phase 7 must follow it exactly. Read at Phase 1.
- `tickets/README.md` — the ticket authoring contract (required sections + mandatory pre-implementation checks). Read at Phase 1.
- `docs/FOUNDATIONS.md` — the non-negotiable design contract. Skip only if read earlier this session and unmodified; when skipping, NAME the load mechanism explicitly (e.g., "already in context via direct Read at message N" / "via <skill>'s pre-flight at message N"). A bare "already loaded" claim is insufficient — Phase 5 verification of `FOUNDATIONS-NNN` findings can require FOUNDATIONS content. CLAUDE.md system-reminder content does NOT satisfy the criterion unless it reproduces FOUNDATIONS.md verbatim.

**Read on demand (Phase 2 / Phase 5, when a finding implicates the surface):**
- `docs/HARD-GATE-DISCIPLINE.md` — when session evidence shows the target executed canon-mutating writes (verify the HARD-GATE fired before the writes).
- `docs/MACHINE-FACING-LAYER.md`, `docs/CONTEXT-PACKET-CONTRACT.md` — when a finding implicates packet-shape or retrieval-tool-scope claims.
- `docs/REPOSITORY-MAP.md`, `docs/WORKFLOWS.md`, `docs/ID-ALLOCATION.md` — when a finding implicates repo layout, skill-invocation contract, or ID-allocation discipline.

**Codebase verification reads at Phase 5** are scoped to:
- `tools/world-mcp/src/**/*.ts` — MCP retrieval gaps
- `tools/world-index/src/**/*.ts` — world-index schema gaps
- `tools/validators/src/**/*.ts` AND `tools/validators/src/schemas/*.json` — validator coverage gaps
- `tools/hooks/**/*` and `.claude/settings.json` — hook coverage gaps
- `tools/patch-engine/src/**/*.ts` — patch-engine op gaps
- `tools/story-explorer/src/**/*.ts` (and `tools/story-explorer/web/`) — story-explorer read-model / view-model gaps surfaced when the target skill's session touched the Explorer's `scene_coverage` read surfaces
- `tools/<package>/tests/**/*.ts` — when a surviving finding's likely Files-to-Touch would propose new or modified tests (grep to cite the exact existing test path rather than a plausible-but-stale guess)
- `<target_skill_path>/SKILL.md` and `<target_skill_path>/references/*.md` re-read — skill-procedure / architecture / determinism findings
- `docs/FOUNDATIONS.md` (targeted sections re-read) — FOUNDATIONS contract gaps

These reads use `Grep` / `Glob` / `Read` directly — no MCP retrieval at any phase.

## Pre-flight Check

Before Phase 1, verify all of:

1. `docs/FOUNDATIONS.md` exists and is readable.
2. `tickets/_TEMPLATE.md` exists and is readable.
3. `tickets/README.md` exists and is readable.
4. `<target_skill_path>` resolves to an existing directory containing a readable `SKILL.md`. If given without the `.claude/skills/` prefix, normalize.
5. **Session evidence of target-skill exercise**: scan the prior conversation context for at least one of (a) an assistant tool call this session whose arguments name the target skill; (b) a `Skill` tool invocation this session that resolved to the target skill; (c) an explicit user statement this session that the target skill was just used. If zero prongs match, abort with: "No session evidence found for <target_skill_path> — re-invoke after exercising the skill, or ensure the prior session is in the conversation context."
6. If `namespace_overrides` is provided, parse it as `<finding-id>=<namespace>` pairs.
7. If a worktree root is active, all paths resolve from the worktree root.

Namespace allocation is DEFERRED to Phase 7 (per-finding ticket numbers are unknown until dispositions are collected at Phase 6); Pre-flight only confirms `tickets/` and `archive/tickets/` are scannable. If any check fails, abort before Phase 1.

## Phase 1: Mandatory Reads

Read in this order (skip any already in context this session, naming the load mechanism explicitly per step 6's rule — bare "already loaded" claims are insufficient because Phase 5 verification may require the cited content, and the audit trail benefits from explicit naming for every skipped read, not only the FOUNDATIONS-specific case):
1. `<target_skill_path>/SKILL.md` — entire file.
2. `<target_skill_path>/references/*.md` — `Glob` to enumerate what ships, then apply the selective-read rule: Read all of them when ≤3 reference files ship OR when the target was lightly exercised (one phase). When 4+ reference files ship AND the session exercised the target end-to-end across multiple phases, defer per-reference reading to Phase 5 verification when that phase needs the content; record the deferred-list at Phase 1 close (e.g., `Phase 1 reads: SKILL.md + references/<name>.md (Phase 5-relevant); deferred: references/<A>.md, references/<B>.md, …` naming which references were read upfront vs. read-on-demand) so the audit-trail names the selectivity decision. The upfront list should include any reference doc whose phase-prose is plausibly implicated by Phase 2 session evidence (lens 2 / 4 / 5 findings — skill-procedure, architecture, determinism); the deferred list covers the rest. This is the procedural register of the same selectivity rule documented declaratively at §World-State Prerequisites — both sites carry the same constraint.
3. `<target_skill_path>/templates/*.{yaml,md}` — `Glob` the directory first to enumerate what ships (skip the entire step when no `templates/` directory is present). For each template that ships, Read its frontmatter + first ~50 lines to classify as parse-time-schema-bearing (carries field-schema declarations Phase 5 will verify) vs pure-prompt-content (carries no schema). Read the full body only for the parse-time-schema-bearing ones — this sidesteps the chicken-and-egg of skipping based on a property the operator can only determine by reading.
4. `tickets/_TEMPLATE.md`.
5. `tickets/README.md`.
6. `docs/FOUNDATIONS.md` — skip if read earlier this session and unmodified, naming the load mechanism.

Parse the target SKILL.md and identify: declared World-State Prerequisites, Pre-flight shape, Validation Rules upheld, FOUNDATIONS Alignment N/A rows, and the Guardrails section's known-deferred-debt disclosures (lines naming `<NAMESPACE>-NNN` references for surfaces the skill knowingly works around). Those disclosures are the Phase 4 drop list.

## Phase 2: Session Reflection — Seven Lenses

Scan this session's assistant tool-use and prose for everything that went wrong or rough while the target skill ran. Apply SEVEN lenses; a single moment may surface findings under more than one.

1. **Validation failures & warnings** — every `validate-patch-plan` / `submit-patch-plan` rejection, validator FAIL, hook block, or warning the operator hit this session. Mine each distinct failure (per validator-name + verdict-code pair) with the four-way classification: (a) operator error — no finding; (b) docs-clarification gap — routes to Phase 8 Shape-B direct edit; (c) schema-discovery / runtime divergence — VALENH; (d) docs-drift — docs-drift sub-category.
2. **Skill-procedure defects** — phase prose that was ambiguous, under-specified, internally contradictory, or non-deterministic in a way that forced the operator to improvise or guess. Evidence: a moment the operator had to make a judgment call the SKILL.md did not cover, or two readings of a phase were both defensible.
3. **Code-correctness bugs** — a `tools/<package>` behavior that was observably wrong this session (crash, wrong output, silent mis-handling), distinct from a missing capability.
4. **Architecture / design smells** — a structural problem the session exposed: a surface doing the wrong job, a contract leaking across a boundary, duplicated transport paths for one fact, a missing abstraction the skill had to hand-roll.
5. **Determinism gaps** — a point where the same inputs could plausibly yield different skill output across runs, or where ordering / tie-breaking / selection was underspecified. (The source proposal's "more deterministic without breaking the purpose" goal lives here — improvements that tighten determinism WITHOUT removing legitimate authorial latitude.)
6. **Machine-pipeline fallbacks** — the six `mcp-integration-audit` detection patterns plus story-explorer: (i) MCP-retrieval gap (direct `Read`/`Grep` where an `mcp__worldloom__*` tool exists; retrieval tool erroring mid-flow); (ii) world-index schema gap (file scans / `unexpected_path` warnings where a typed query should serve; parser-registered-but-enumerator-omitted classes); (iii) validator coverage gap (inline Rule-N check a validator should catch; schema-discovery artifact misrepresenting the enforced runtime); (iv) hook coverage gap (inline defensive guard with no hook; false-positive hook block); (v) patch-engine op gap (direct `Write` of `_source/` because no engine op exists); (vi) story-explorer gap (a `scene_coverage` / view-model surface that returned wrong or missing data this session).
7. **FOUNDATIONS-contract gaps** — a surface FOUNDATIONS is silent on that the skill needed governed (storage form for a new record class, read/write discipline for a new directory, validation-rule scope for a new sub-pipeline, a contract-level judgment the operator had to make without textual support).

For each candidate finding record: (i) the session-evidence one-liner (what specifically happened this session); (ii) the lens(es) it falls under; (iii) a candidate severity (finalized at Phase 4).

## Phase 3: Attribute and Route

For each candidate finding, run TWO decisions in order:

**3a. Mistake-vs-defect attribution** (the source proposal's first question). Classify the root cause as exactly one of:
- **operator-mistake** — the operator misused a correct, well-documented contract; the skill/code/pipeline behaved as designed. DROP — not a finding.
- **genuine-defect** — the skill, code, architecture, determinism, pipeline, or FOUNDATIONS contract is what made the next use harder. KEEP.

Borderline cases (the contract was technically correct but so easy to misuse that the misuse is predictable) are KEPT as a skill-procedure or docs-clarification defect — a predictable-misuse surface is a defect, not an operator mistake.

**3b. Namespace routing** for each kept finding:
- **Pipeline / FOUNDATIONS findings** (lens 6 and lens 7, plus lens-1 sub-classes that resolve to a pipeline surface) use the FIXED map:

  | Surface | Namespace |
  |---|---|
  | MCP retrieval / world-index schema | `MCPENH` |
  | Validator coverage | `VALENH` |
  | Hook coverage | `HOOK` |
  | Patch-engine op | `PEENH` |
  | Story-explorer read-model | `STOEXP` (scan history; fall back to a confirmed fresh prefix) |
  | FOUNDATIONS contract | `FOUNDATIONS` |

- **Skill-procedure / code / architecture / determinism findings** (lenses 2–5) use the PER-SUBSYSTEM prefix: scan `tickets/` + `archive/tickets/` for the namespace prior tickets on this subsystem used (e.g., `BSBOOT` for branching-story-bootstrap, `STOTURNCYC` for branching-story-turn-cycle, `CBAUTH` / `STPOOL` for storylet / commitment work). If the subsystem has NO ticket history, propose a fresh kebab-derived prefix and flag it for user confirmation at Phase 6 — never auto-adopt an invented prefix silently.

Apply `namespace_overrides` after auto-routing if provided.

## Phase 4: Severity-Tag and Known-Deferred-Debt Drop

Assign severity per finding:
- **CRITICAL** — the defect caused the skill to silently produce incorrect output, corrupt state, or violate a FOUNDATIONS principle. Rare.
- **HIGH** — the skill had to author a defensive workaround a future non-vigilant operator would miss, OR the defect is a plausibly near-term failure on the next use.
- **MEDIUM** — friction that cost non-trivial improvisation; output was still correct.
- **LOW** — coverage gap or polish; did not block progress.

Then, for each candidate: (i) content-grep `archive/tickets/<NAMESPACE>-*.md` for an already-filed equivalent; (ii) cross-check the target skill's Guardrails known-deferred-debt disclosures. Drop any finding the skill ALREADY discloses as known deferred debt — a disclosed limitation is not a finding. Record the drop with its matched disclosure line.

For findings that fit a drop pattern not covered by (i) and (ii) — **design-intent / skill-internal discipline** (a named skill-internal mechanism IS the intended permanent state, not a fallback for missing pipeline support); **archive-grep-confirmed completed work without prose link** (an archived ticket's Outcome explicitly resolves the gap even though the target skill prose does not link it); **pipeline-component-design-intent** (the skill's pipeline component design intent declines the surface, often surfaced via an archived ticket's explicit scope-decline rationale); **in-session-sibling-filed-work** (a sibling skill's session already filed the same gap, so re-filing would duplicate); **stale-artifact / housekeeping** (the session surfaced a leftover, orphan, or debug-residue file — e.g., a `.patch-engine.DBG.tmp` file left behind from a prior debug run, an abandoned `.tmp` extension, a vestigial scratch path under an active source directory — that an existing alarm surface correctly flagged at session time, typically the world-index `unexpected_path` warning but also validator warnings, hook blocks, or compatibility-drift entries; no code change is required because the alarm IS the discovery and the cleanup IS the resolution; the file should be cleaned up by the operator via direct `rm` after explicit confirmation, and the candidate routes to Phase 8 housekeeping rather than file a ticket; status string `dropped (stale-artifact — <alarm-surface> correctly flagged; route to Phase 8 housekeeping)`) — apply `mcp-integration-audit`'s Phase 4 drop-category taxonomy as authoritative. The sibling carries the elaborated seven-category list plus same-surface ≠ same-invariant nuance, same-surface vs adjacent-surface ordering, and worked precedents; skill-retrospective shares architectural shape with `mcp-integration-audit` (per Guardrails §Relationship to `mcp-integration-audit`), and dropping under one of these categories requires the same evidence the sibling's prose names. Worked precedent: a commitment-block-authoring retrospective run — F5 (batch-diversity validator backstop) was dropped because CBAUTH-002 explicitly declined to add a validator for batch-property checks; CBAUTH-002's scope-decline rationale established the design-intent / skill-internal discipline pattern (Phase 4 batch-diversity is by-design a skill-procedure surface, not an engine-validator surface), and the drop was recorded with that precedent's rationale.

## Phase 5: Verification

Re-confirm every surviving finding's claimed defect is genuinely present at HEAD; this is the anti-hallucination gate. Per finding-class:
- **code / pipeline findings (lenses 3, 6)** — grep the relevant `tools/<package>/src/` tree (scope per §World-State Prerequisites Phase-5 list, including `tools/story-explorer/src/`); a claimed missing capability must be re-verified absent, a claimed bug re-verified present.
- **validator / schema findings** — grep `tools/validators/src/` + `schemas/*.json`.
- **docs-drift / FOUNDATIONS findings (lenses 1b, 7)** — re-read the cited doc section.
- **skill-procedure / architecture / determinism findings (lenses 2, 4, 5)** — re-read the current `<target_skill_path>/SKILL.md` and references; confirm the ambiguous / non-deterministic / smelly prose is still present at HEAD (not already fixed).
- **symbol-consumer enumeration** — when a finding's fix extends a named constant / regex / exported symbol / interface, grep the symbol and its derived uses across the package to enumerate EVERY consumer, so the ticket's Verification Layers + Files-to-Touch cover each consuming path.

Reclassify any finding whose defect is already resolved at HEAD as a false-positive and DROP it before Phase 6.

## Phase 6: Triage Summary and Per-Finding Disposition

Emit a numbered triage table for surviving findings in chat:

| ID | Lens | Category | Namespace | Severity | Session-evidence | Verification | Mistake/Defect |
|----|------|----------|-----------|----------|------------------|--------------|----------------|
| F1 | ...  | ...      | ...       | ...      | <one-liner>      | <one-liner>  | defect         |

Then emit a brief drops table covering every candidate dropped at Phase 4 (matched a drop category) or reclassified at Phase 5 (false-positive) — one row per dropped candidate naming the lens, the Phase 4 drop category or Phase 5 reclassification, and a brief rationale. The drops table is required for Rule 6 (No Silent Retcons) audit-trail completeness — it makes "honestly dropped" verifiable in chat rather than implicit in working memory. When zero candidates were dropped, emit a one-line `No candidates dropped at Phase 4 or Phase 5.` confirmation in place of the drops table so the absence is still recorded.

For any finding routed to a freshly-proposed per-subsystem prefix (Phase 3b), call the proposed prefix out explicitly in the survivors triage table and ask the user to confirm or rename it.

Collect a per-finding disposition: **file** / **defer-with-rationale** / **reject-as-false-positive**. The HARD-GATE (top of skill) fires at the end of this phase — OR the auto-mode auto-approval condition fires (auto mode active AND (zero findings remain after the Phase 4 drop OR every surviving finding is LOW/MEDIUM with no FOUNDATIONS-amendment routing)).

**Auto-mode auto-approval steering** (operationalizes HARD-GATE condition (d)): when auto mode is active AND (zero candidate rows survive Phase 4's drops OR every surviving candidate is severity LOW or MEDIUM with no FOUNDATIONS-amendment routing), auto-approve all candidates as `file` and proceed to Phase 7. Otherwise wait for explicit per-finding disposition. Pause for explicit disposition under Auto Mode only when the triage surfaces a freshly-proposed namespace prefix (Phase 3b path) or a finding whose mistake-vs-defect attribution is borderline. The HARD-GATE condition (d) definition above is the structural permission; this steering line is the operational default that parallels `mcp-integration-audit/SKILL.md` Phase 6 Auto-mode auto-approval condition's imperative form.

## Phase 7: Allocate IDs and Batched Ticket Writes

For each finding tagged **file**:
1. Allocate its ticket number by scanning `tickets/` + `archive/tickets/` for the next free integer in its namespace; padding follows existing per-namespace precedent (most live namespaces use 3-digit `<NNN>`). Collisions abort with a specific-id error before any Write.
2. Compose the ticket from `tickets/_TEMPLATE.md` — every required section (`Problem`, `Assumption Reassessment (<today>)` items 1-3 + scope-matched 4+, `Architecture Check`, `Verification Layers`, `What to Change`, `Files to Touch`, `Out of Scope`, `Acceptance Criteria`, `Test Plan`). Pre-Write Rehearsal: confirm every `Deps` path, `Files to Touch` path, and `Test Plan` command names a real current location (grep-verified at Phase 5), not a plausible-but-stale guess.
3. Batched parallel Writes — one `Write` per ticket at `tickets/<NAMESPACE>-<NNN>-<slug>.md`.

After writing, re-scan to confirm numbering continuity and that every conditional template item was completed.

## Phase 8: Final Summary

Emit a chat-only summary: ticket paths written, namespace distribution, any cross-ticket dependency graph (if `Deps` were declared), and a suggested implementation order (CRITICAL/HIGH first; pipeline prerequisites before the skill-prose changes that depend on them). Then route the **out-of-scope** residue:
- findings that are PURELY target-skill prose quality (not a ticketable code/contract change) → hand off to `/skill-audit <target_skill_path>` (the interactive skill-prose editor), since this skill never edits skill prose;
- findings on a shared template or pipeline contract that are a direct one-line edit → note the file for a direct edit by the user.

Do NOT `git commit`.

## Validation Rules This Skill Upholds

This is a meta-tooling skill: it produces improvement tickets, never world canon, so it does not itself enforce the world-content Validation Rules at emission. The Rules enter only as a *lens* the retrospective applies to the target skill's session (Phase 2 lens 1 mines validation failures; lens 7 mines FOUNDATIONS-contract gaps). The one Rule this skill structurally honors in its own operation:

- **Rule 6 (No Silent Retcons)** — enforced at Phase 7. Every improvement the retrospective acts on becomes a logged, justified `tickets/<NAMESPACE>-<NNN>-<slug>.md` artifact with an `Assumption Reassessment` audit trail; no skill/code/pipeline change is proposed off-record. The triage table (Phase 6) and final summary (Phase 8) leave a chat-level record of what was filed, deferred, and rejected.

All other FOUNDATIONS Validation Rules (1, 2, 3, 4, 5, 7, 11, 12) are properties of world-canon mutation and are N/A to a ticket-emitting meta-tooling skill — see the FOUNDATIONS Alignment table for the per-rule N/A accounting and handoff paths.

## Record Schemas

N/A — this skill emits no Canon Fact Records, Change Log Entries, or YAML structured records. Its only file output is markdown tickets following `tickets/_TEMPLATE.md` exactly (validated against `tickets/README.md`'s required-sections contract at Phase 7). No per-skill `templates/` directory is needed (the output template lives at repo root and is read at runtime).

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|-----------|-------|-----------|
| Tooling Recommendation (never operate on prose alone) | Pre-flight + Phase 1 + Phase 5 | Reads the target skill's own source artifacts (SKILL.md, references, templates), the ticket contract files, and the live `tools/` codebase as its evidence base; verification re-greps HEAD. Meta-tooling carve-out: evidence is session reflection + codebase state, not world canon, so no `get_context_packet` call. |
| Change Control Policy (every change gets a logged, justified record) | Phase 7 | Every acted-on improvement becomes a `tickets/<NAMESPACE>-<NNN>-<slug>.md` with an `Assumption Reassessment` justification, per `tickets/README.md`. |
| Rule 6 (No Silent Retcons) | Phase 7 | Findings are filed as logged tickets, never silently actioned; triage + summary leave a chat audit trail. |
| Per-class ID format conventions (FOUNDATIONS-002) | Phase 7 | Ticket IDs follow each namespace's existing `<NNN>` precedent, allocated by scanning `tickets/` + `archive/tickets/` for the next free integer. |
| Canon Fact Record Schema | N/A | Not applicable — emits no canon facts; world-canon facts are authored by `canon-addition` / `create-base-world`. |
| Canon Layers | N/A | Not applicable — produces no world-level truth at any layer; tickets are pipeline work artifacts. |
| Rule 1 (No Floating Facts) | N/A | Not applicable — no facts emitted; `canon-addition` enforces it on world canon. |
| Rule 2 (No Pure Cosmetics) | N/A | Not applicable — no world content added; `canon-addition` / `propose-new-canon-facts` enforce it. |
| Rule 3 (No Specialness Inflation) | N/A | Not applicable — no exceptional world elements added; `canon-addition` enforces it. |
| Rule 4 (No Globalization by Accident) | N/A | Not applicable — no capability scope claims; `canon-addition` enforces it. |
| Rule 5 (No Consequence Evasion) | N/A | Not applicable — no second-order world effects to integrate; `canon-addition` enforces it. |
| Rule 7 (Preserve Mystery Deliberately) | N/A | Not applicable — no Mystery Reserve mutation; `canon-addition` and the story-pipeline mystery firewall enforce it. A retrospective finding that the target skill RISKED a mystery violation is filed as a `FOUNDATIONS` / `VALENH` ticket, not enforced here. |
| Rule 11 (No Spectator Castes by Accident) | N/A | Not applicable — no capability facts emitted; `canon-addition` enforces it. |
| Rule 12 (No Single-Trace Truths) | N/A | Not applicable — no hard-canon truths emitted; `canon-addition` enforces it. |

## Guardrails

- **Tickets propose, they do not apply.** This skill files improvement tickets; it never implements the fix. Implementation is separate work the user schedules against the ticket.
- **Session evidence is required.** Every finding must trace to something that actually happened in THIS session's exercise of the target skill (HARD-GATE (b)). A finding the operator cannot ground in session evidence is dropped — this is a retrospective, not a cold static review. For static skill-prose quality review without session exercise, use `skill-streamlining-audit`.
- **Mistake-vs-defect honesty.** Operator mistakes are dropped at Phase 3a, not laundered into tickets. But a contract so easy to misuse that the misuse is predictable is a defect, not an operator mistake.
- **Codebase truth at Phase 5.** Every finding is re-verified against HEAD before filing; findings already resolved at HEAD are dropped as false-positives.
- **No skill-prose edits.** This skill never edits `.claude/skills/<target>/*` — pure skill-prose findings route to `/skill-audit` at Phase 8. (Boundary shared with `mcp-integration-audit`.)
- **No FOUNDATIONS edits, no canon writes, no tool edits.** Write authority is bounded to `tickets/`. FOUNDATIONS-contract gaps are filed as `FOUNDATIONS-NNN` tickets, never applied; `tools/` defects are filed, never patched here.
- **Namespace decision rule.** Pipeline / FOUNDATIONS findings use the fixed map (`MCPENH` / `VALENH` / `HOOK` / `PEENH` / `STOEXP` / `FOUNDATIONS`); skill-procedure / code / architecture / determinism findings use the audited subsystem's existing prefix, or a user-confirmed fresh prefix when the subsystem has no ticket history. Never invent a prefix silently.
- **Relationship to `mcp-integration-audit`.** That skill is the deep, pipeline-only retrospective (the six machine-pipeline categories). This skill is the broad retrospective that ALSO covers skill-procedure, code-correctness, architecture, and determinism. For a session whose only concern is machine-pipeline behavior, prefer `mcp-integration-audit`; for a full post-run reflection, use this skill — its Phase 2 lens 6 reproduces the sibling's pipeline detection so a finding is never lost, but for a deep pipeline-only pass the sibling carries more specialized detection prose.
- **Auto Mode does not override the HARD-GATE.** Invoking this skill is not approval of the ticket batch.
- **Worktree discipline.** If invoked inside a git worktree, all paths resolve from the worktree root.
- **Do not `git commit`.** Writes land in the working tree for the user to review.

## Final Rule

A skill retrospective is not done until every finding is either grounded in this session's evidence, re-verified against HEAD, and filed as a logged FOUNDATIONS-aligned ticket — or honestly dropped as an operator mistake or a false-positive. A retrospective that files an unverified finding, or that launders an operator mistake into a ticket, has failed its one job: making the next use of the skill genuinely smoother, not just busier.
