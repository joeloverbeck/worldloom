# VALENH-045: Relax §16a parser over-strictness on section heading case and voice-block bullet shape

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/` (relaxes regex strictness in 4 structural validators that parse the §16a STCHAR packet section, plus regression tests)
**Deps**: None

## Problem

At intake, during a `branching-story-prose-attach` run on `worlds/erotica-world/stories/red-bunny/` PG-1, the Phase 6 step 4d structural smoke (`world-validate --structural --file pages-prose-receipts/PG-1.yaml`) surfaced 5 FAIL verdicts on a structurally-correct page plan:

- 2× `page_plan_stchar_packet_integrity.missing_packet` (STENT-1 / STCHAR-1, STENT-3 / STCHAR-3). STCHAR-2 / Marisa was offstage so the validator silently skipped her per the existing offstage-suppression branch, which made the failure pattern asymmetric and harder to diagnose (only 2 of 3 active STCHARs surfaced).
- 1× `page_plan_stchar_packet_integrity.missing_voice_block` for STCHAR-3 (the viewpoint character; the only one of the three packets to carry voice-requiring labels).
- 3× `prose_receipt_stchar_integrity.extra_stchar_authority_entry` (one per `stchar_authority[]` entry in the receipt) cascading from the parser returning zero packets.

Both upstream failures share the same root cause — the §16a packet parser is stricter than the contract specifies — in two distinct ways:

1. **Section-heading regex is case-sensitive without semantic justification.** The plan emitted by `branching-story-bootstrap` for red-bunny PG-1 uses Title-Case `## 16a. STCHAR-Derived Character Authority Packets`. The validator's `STCHAR_SECTION_HEADING` constant at `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts:22` is `/^##\s+16a\.\s+STCHAR-derived character authority packets\s*$/m` — the `/m` flag without `/i` makes the heading text lowercase-strict. Three sibling validators carry the same lowercase-strict regex: `prose-receipt-stchar-integrity.ts:189` (receipt-side parser), `turn-driver-pov-observer-firewall.ts:233` (driver-firewall scope determination), and `forbidden-stchar-tamper-hash-fields.ts:63` (hash-tamper detection). A markdown heading is a parser anchor, not a hash basis; case-sensitivity here adds no semantic protection but produces false-positive failures on every plan emitted with any case variant.

2. **Voice-block regex requires a dedicated bullet, stricter than the contract specifies.** The validator's `hasVoiceBlock` check at `page-plan-stchar-packet-integrity.ts:242` is `/^[^\S\r\n]*- Voice\/dialogue authority:[^\S\r\n]*\S/m` — it requires a literal `- Voice/dialogue authority:` bullet line with non-whitespace content. The plan's STCHAR-3 packet documents voice authority inline within the existing `- Stable STCHAR seed used:` bullet (`...STCHAR-3 Voice Bible / Dialogue Authority (the four pressure registers; the cosmopolitan-non-local-textured interior substrate drawing on programming, weightlifting, manga, and pornography-barely-legal-erotica registers; the explicit no-cuadrilla-register / no-Catholic-liturgical / no-fisherman-environmental anti-generic warnings; the interior-density-honored-in-first-person rule)`). The contract at `.claude/skills/_shared-templates/story-state-contract.md:543` says voice authority must be present *"in the stable seed and page-local projection"* — i.e., in existing fields — not in a dedicated bullet. The validator picked the stricter syntactic interpretation; the relaxation aligns with the contract's actual semantic intent.

Both gaps caused legitimate plans to be rejected and forced the operator to edit validator source code to recognize structurally-correct content. A non-vigilant operator hitting the same plan structure on a future prose-attach invocation would likely either (a) revise the page plan body (changing `plan_hash` → advisory drift per SPEC-72 + Hook 6 notices + unnecessary engine work) or (b) bypass the smoke entirely (leaving a receipt with hidden structural concerns and undermining Phase 6 step 4d as a trust anchor). Both paths are worse than the validator relaxation.

## Assumption Reassessment (2026-05-25)

1. **Codebase at intake (in-session working-tree edits noted per Working-tree-vs-HEAD disambiguation)**: at HEAD the four validator files still carried the strict regex patterns — verified via `git show HEAD:tools/validators/src/structural/page-plan-stchar-packet-integrity.ts | grep -n "STCHAR_SECTION_HEADING\|hasVoiceBlock"` which returned line 22 with `/m` (no `/i`) and line 242 with the dedicated-bullet `hasVoiceBlock` regex. Sibling files `prose-receipt-stchar-integrity.ts:189`, `turn-driver-pov-observer-firewall.ts:233`, `forbidden-stchar-tamper-hash-fields.ts:63` carried the same case-sensitive heading regex at HEAD. **An uncommitted in-session edit in the working tree partially addressed this gap before this run**: the 5 regex sites had already been relaxed to `/mi` (heading, in all four files) and `hasVoiceBlock` accepted the dedicated bullet `/mi` OR `/\bvoice\s+bible\b/i` as an alternative voice-authority signal. This run preserved that source shape and extended `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` with regression coverage for Title-Case heading and inline-voice-block phrasing. The final full suite at `cd tools/validators && npm test` is 1033/1033 green.

2. **Docs/skills at intake**: `.claude/skills/_shared-templates/story-state-contract.md` shows the §16a packet template with the lowercase heading `## 16a. STCHAR-derived character authority packets` and a full-packet bullet list that does NOT enumerate `Voice/dialogue authority:` as a required field. The validator requirement is framed as voice authority being "in the stable seed and page-local projection" (no dedicated bullet). The reduced `offstage_causal` packet description references "the `Voice/dialogue authority:` block" with backticks (implying a dedicated bullet IS canonical for full packets). The three contract surfaces have competing implications. Validator-test fixtures use the dedicated-bullet form (`- Voice/dialogue authority: clipped STCHAR voice block.`) and lowercase heading, so the regex relaxations are a strict superset of every existing test fixture; no existing tests break.

3. **Shared boundary under audit**: the §16a STCHAR packet parser — shared between `branching-story-bootstrap` and `branching-story-turn-cycle`'s page-plan emitters, `branching-story-prose-attach`'s receipt-side structural smoke, and four structural validators (`page_plan_stchar_packet_integrity`, `prose_receipt_stchar_integrity`, `turn_driver_pov_observer_firewall`, `forbidden_stchar_tamper_hash_fields`) that parse the §16a section to enforce STCHAR authority discipline. The relaxation changes ONLY the parser's syntactic acceptance shape; STCHAR-authority semantics (required-because label vocabulary, voice-requiring labels, packet integrity, current-state grounding, stale-reference detection) remain unchanged.

4. **FOUNDATIONS principle**: §Story Bundles §6.1 (Story-Local Character Authority) makes the §16a packet the runtime character authority surface. The validator's job is to confirm voice-requiring characters (`speaker`, `viewpoint`, `voice_shapes_page` labels) have voice/dialogue authority documented in the packet — NOT to enforce one specific bullet name. The contract at `story-state-contract.md:543` frames the requirement as "voice authority in the stable seed and page-local projection". The validator's narrower syntactic check (a dedicated `- Voice/dialogue authority:` bullet with non-whitespace content) is stricter than the contract specifies. The relaxation realigns the validator with the contract's actual semantic intent without weakening the §6.1 STCHAR-as-runtime-authority guarantee — voice-requiring labels without ANY voice-authority signal still fail.

5. **Adjacent contradictions surfaced during reassessment**: classify as **future cleanup that must become its own routing**. The contract template at `.claude/skills/_shared-templates/story-state-contract.md` carries three competing voice-block descriptions: (a) lines 511-528's 14-field full-packet bullet enumeration that omits `Voice/dialogue authority:`; (b) line 543 framing the validator requirement as voice authority being "in the stable seed and page-local projection" (no dedicated bullet); (c) line 563 (reduced offstage_causal packet) referencing "the `Voice/dialogue authority:` block" with backticks (implying the dedicated bullet IS canonical for full packets). The validator's relaxation lands the lenient (a)+(b) interpretation. The contract template's voice-block status across (a)/(b)/(c) is itself ambiguous and would benefit from a clarifying edit at line 511-528 + 543 + 563 making explicit whether the dedicated bullet is canonical-required vs canonical-recommended-but-equivalent-with-inline-Stable-STCHAR-seed-used phrasing. Routed as Phase 8 path (b) direct-edit recommendation: `Routing-path-b direct-edit recommendation: .claude/skills/_shared-templates/story-state-contract.md/§8 page plan minimum contract — shared-template is not a skill directory so /skill-audit cannot route it; clarify at lines 511-528 + 543 + 563 whether a dedicated '- Voice/dialogue authority:' bullet is canonical-required vs canonical-recommended-but-equivalent-with-inline-Stable-STCHAR-seed-used phrasing.`

## Architecture Check

1. **Why this approach is cleaner than alternatives**:
   - Alternative A — fix the page plan to use lowercase heading + dedicated bullet. Rejected because (i) it changes `plan_hash` against the committed PG record's stamped value, triggering SPEC-72 advisory drift + Hook 6 notices, and (ii) it doesn't fix the underlying validator/contract divergence — future plans emitted by an updated bootstrap skill would still need to match exactly one syntactic form, and the contract at line 543 ALREADY documents the lenient interpretation as acceptable.
   - Alternative B — leave the validator strict, file a separate ticket for bootstrap to emit canonical lowercase + dedicated-bullet form. Rejected because (i) widening the validator is a one-time fix vs. updating every emitter site to match the strictest reading; (ii) the bootstrap-emitted Title-Case + inline-voice-bible form is contract-conformant per line 543 — the validator should accept it.
   - Alternative C — chosen: relax the validator regex to recognize the contract's actual semantic intent. Section-heading regex becomes case-insensitive (no semantic load on heading case); voice-block check accepts the canonical dedicated bullet OR substantive in-bullet `Voice Bible` phrasing (the natural alternative term the bootstrap template uses).

2. **No backwards-compatibility shims**: the relaxation is a strict superset of the prior strict regex. Every page plan that previously passed (lowercase heading + dedicated bullet, used in all test fixtures) still passes. No conditional acceptance based on plan-version flags, no migration path, no deprecation cycle. The case-insensitive flag and the `Voice Bible` alternative are unconditional widenings of the parser's acceptance shape.

## Verification Layers

1. **Section-heading case-insensitivity does not change the parsed-section contents** → codebase grep-proof: `grep -nE "STCHAR-derived character authority packets" tools/validators/src/structural/*.ts` returns 4 hits, all with `/mi` (or equivalent `/mis`) flags after the landed change; existing lowercase-heading fixture coverage remains green.
2. **Voice-block detection accepts inline `Voice Bible` phrasing in addition to the dedicated bullet** → schema/regex validation via new unit test: a §16a packet with voice-requiring labels (`viewpoint, speaker, voice_shapes_page`) AND voice authority documented within `Stable STCHAR seed used: ...STCHAR-X Voice Bible / Dialogue Authority...` (no dedicated bullet) → expected zero verdicts. Plus negative regression: voice-requiring labels + no voice-authority signal anywhere → expected `page_plan_stchar_packet_integrity.missing_voice_block` FAIL preserved.
3. **The four-file consistency invariant** → codebase grep-proof: all four validators (`page-plan-stchar-packet-integrity.ts`, `prose-receipt-stchar-integrity.ts`, `turn-driver-pov-observer-firewall.ts`, `forbidden-stchar-tamper-hash-fields.ts`) carry identical case-insensitive section-heading regex; verified via `grep -nE "STCHAR-derived character authority packets" tools/validators/src/structural/*.ts`.
4. **FOUNDATIONS alignment** → re-read `story-state-contract.md:543` during ticket implementation to confirm the relaxation aligns with the contract's "voice authority in the stable seed and page-local projection" wording; cited line is the contract surface the relaxation targets.
5. **End-to-end pipeline coverage on the red-bunny receipt that surfaced the gap** → skill dry-run: `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --file worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-1.yaml --json` returns `fail_count: 0` after the landed code (matches the working-tree behavior already observed this session).

## Landed Changes

### 1. Case-insensitive §16a section-heading regex in four validators

In each of the four files below, the `i` flag (`/m` → `/mi`, `/ms` → `/mis`) was added to the `## 16a. STCHAR-derived character authority packets` section-heading regex:

- `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts:22` — `STCHAR_SECTION_HEADING` module constant.
- `tools/validators/src/structural/prose-receipt-stchar-integrity.ts:189` — `parsePackets()` `content.search()` call.
- `tools/validators/src/structural/turn-driver-pov-observer-firewall.ts:233` — `offstageDriverText()` `content.match()` call (uses `/ms` flags; becomes `/mis`).
- `tools/validators/src/structural/forbidden-stchar-tamper-hash-fields.ts:63` — `pagePlanVerdicts()` `content.search()` call.

The heading text remains a parser anchor; case-insensitivity here is gratuitous-strictness removal with no semantic load. The relaxation is a strict superset — every existing test fixture (lowercase heading) continues to pass.

### 2. Voice-block check accepts the canonical dedicated bullet OR substantive inline `Voice Bible` phrasing

In `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts:242`, change the `hasVoiceBlock` definition from:

```ts
hasVoiceBlock: /^[^\S\r\n]*- Voice\/dialogue authority:[^\S\r\n]*\S/m.test(packetText),
```

to:

```ts
hasVoiceBlock:
  /^[^\S\r\n]*- Voice\/dialogue authority:[^\S\r\n]*\S/mi.test(packetText)
  || /\bvoice\s+bible\b/i.test(packetText),
```

The first regex (dedicated bullet, case-insensitive) preserves existing positive test coverage and existing negative test coverage (empty `voiceLine` still fails per current test expectations at lines 95/111/133). The second regex (`/\bvoice\s+bible\b/i`) matches the canonical alternative term the bootstrap template uses to label voice authority within `Stable STCHAR seed used:` — e.g., `STCHAR-3 Voice Bible / Dialogue Authority (...)`. The `\b` word boundaries prevent false-positive matches on adjacent tokens like the test-fixture `voice_block_hash` value at line 420 (underscore + "block", not whitespace + "bible") and the test-fixture `clipped STCHAR voice block.` text at line 422 (whitespace but "block", not "bible"). The alternative phrasing is contract-aligned per `story-state-contract.md:543`'s "voice authority in the stable seed and page-local projection" wording.

### 3. Regression tests for both relaxations

`tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` now includes:

- A test that passes a plan with Title-Case heading (`## 16a. STCHAR-Derived Character Authority Packets`) — expected the section parser locates the packets (verdict list does NOT contain any `page_plan_stchar_packet_integrity.missing_packet` for active STCHARs).
- A test that passes a packet with voice-requiring labels (`requiredBecause: "viewpoint, speaker, voice_shapes_page"`) AND voice authority documented via the alternative inline form (e.g., place `STCHAR-X Voice Bible / Dialogue Authority (the four pressure registers; ...)` inside a `- Stable STCHAR seed used:` bullet, no dedicated `- Voice/dialogue authority:` line) — expected zero `missing_voice_block` verdicts.

Sibling test files (`prose-receipt-stchar-integrity.test.ts`, `turn-driver-pov-observer-firewall.test.ts`, `forbidden-stchar-tamper-hash-fields.test.ts`) do not require new tests — their existing fixtures use lowercase heading and continue to pass under the case-insensitive flag, and their case-insensitivity is verified transitively by the section-parser regression test above plus the full-suite green-pass acceptance criterion.

## Files to Touch

- `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` (modify) — section-heading regex case-insensitive at line 22; voice-block check accepts dedicated bullet OR `Voice Bible` alternative at lines 242-244.
- `tools/validators/src/structural/prose-receipt-stchar-integrity.ts` (modify) — section-heading regex case-insensitive at line 189.
- `tools/validators/src/structural/turn-driver-pov-observer-firewall.ts` (modify) — section-heading regex case-insensitive at line 233.
- `tools/validators/src/structural/forbidden-stchar-tamper-hash-fields.ts` (modify) — section-heading regex case-insensitive at line 63.
- `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` (modify) — add Title-Case heading + inline-Voice-Bible regression tests.

## Out of Scope

- Bootstrap skill emitting canonical lowercase heading + dedicated voice bullet. The bootstrap-emitted shape is contract-conformant under the relaxed validator (per `story-state-contract.md:543`); an emitter-side standardization is OPTIONAL polish, not required. If pursued separately, route via `/skill-audit .claude/skills/branching-story-bootstrap`.
- Page-plan §16a contract-template clarification at `.claude/skills/_shared-templates/story-state-contract.md` lines 511-528 / 543 / 563. Post-review found a same-seam working-tree template edit that partially resolves the ambiguity but overstates the landed validator acceptance shape by documenting inline `Voice/Dialogue Authority` as accepted; the validator implemented by this ticket accepts inline `Voice Bible` only. That doc/parser parity concern is tracked separately by `tickets/VALENH-046.md`, not absorbed into this ticket.
- Restamping the red-bunny PG-1 `plan_hash` or `PG.plan.plan_hash`. The committed PG record's `state_hash` is authoritative; plan-file edits would trigger SPEC-72 advisory drift + Hook 6 notices and would also conflict with the ENGINESYNC-005 patch-engine block on the red-bunny bundle's first post-bootstrap patch.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — full validator package suite (1033 tests, all green).
2. `cd tools/validators && npm run build` — type-check passes; no TypeScript errors introduced by the regex changes.
3. `cd /home/joeloverbeck/projects/worldloom && node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --file worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-1.yaml --json` returns `fail_count: 0` (the receipt-specific structural smoke from the prose-attach session must continue to pass under the landed code).

### Invariants

1. The §16a section-heading regex matches the canonical lowercase form AND every case variant of the same heading text (Title-Case, UPPERCASE, mixed-case) across all four validators that parse the §16a section. No semantic change to the parsed-section contents — only the heading anchor's acceptance shape widens.
2. The voice-block check accepts (a) a dedicated `- Voice/dialogue authority:` bullet with non-whitespace content (existing canonical form, case-insensitive) OR (b) substantive `Voice Bible` phrasing anywhere in the packet text (contract-conformant alternative per `story-state-contract.md:543`). Voice-requiring labels (`viewpoint`, `speaker`, `voice_shapes_page`) without ANY voice-authority signal still fail.
3. No backwards-compatibility flag, no conditional acceptance based on plan-version markers, no migration path. The relaxation is a strict superset of the prior strict regex — every input that previously passed continues to pass.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` — add Title-Case section heading regression test + inline-`Voice Bible` voice-block regression test. Existing tests (lowercase heading + dedicated voice bullet positive cases, empty voiceLine + missing voice-block negative cases) continue to pass as the lenient cases of the relaxed regex.

### Commands

1. `cd tools/validators && npm test` — full validator package suite (build + 1033 tests).
2. `cd tools/validators && node --test dist/tests/structural/page-plan-stchar-packet-integrity.test.js dist/tests/structural/prose-receipt-stchar-integrity.test.js dist/tests/structural/turn-driver-pov-observer-firewall.test.js dist/tests/structural/forbidden-stchar-tamper-hash-fields.test.js` — targeted run of the four touched validators' test files.
3. `cd /home/joeloverbeck/projects/worldloom && node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --file worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-1.yaml --json` — receipt-specific structural smoke; must return `fail_count: 0`. This is the integration test that demonstrates the end-to-end fix on the red-bunny PG-1 receipt that surfaced the gap.

## Outcome

Completed. The four §16a parser anchors now accept the heading case-insensitively, and `page_plan_stchar_packet_integrity` accepts either a non-empty dedicated `Voice/dialogue authority:` bullet or substantive inline `Voice Bible` phrasing for voice-requiring packets. This run added the missing regression coverage for Title-Case §16a headings and inline `Voice Bible / Dialogue Authority` in `Stable STCHAR seed used:`.

Package README/docs/examples were inspected for same-seam public-surface drift; no package user-facing command or inventory text needed updates for this parser-only relaxation.

## Verification Result

1. `cd tools/validators && npm run build` — PASS.
2. `cd tools/validators && node --test dist/tests/structural/page-plan-stchar-packet-integrity.test.js dist/tests/structural/prose-receipt-stchar-integrity.test.js dist/tests/structural/turn-driver-pov-observer-firewall.test.js dist/tests/structural/forbidden-stchar-tamper-hash-fields.test.js` — PASS, 41/41 tests.
3. `cd tools/validators && npm test` — PASS, 1033/1033 tests.
4. `cd /home/joeloverbeck/projects/worldloom && node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --file worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-1.yaml --json` — PASS, exit 0 with `summary.fail_count: 0`, `warn_count: 0`, and 4 compatibility `info` verdicts for optional absent story-bundle directories.
5. `grep -nE "STCHAR-derived character authority packets" tools/validators/src/structural/*.ts` — PASS; all four §16a parser regexes carry case-insensitive flags (`/mi` or `/mis`).

## Deviations

- The four source-file regex relaxations were already present as pre-existing same-seam worktree edits at implementation intake; this run added the missing regression tests, reran the package proof, and closed the ticket truthfully.
- Post-review found a same-seam working-tree edit in `.claude/skills/_shared-templates/story-state-contract.md` that partially clarifies the dedicated-bullet ambiguity but introduces an over-broad inline synonym claim (`Voice/Dialogue Authority`) that the landed validator does not currently accept. This remains out of scope for `VALENH-045`; follow-up `tickets/VALENH-046.md` owns aligning the template prose and validator/test contract.
