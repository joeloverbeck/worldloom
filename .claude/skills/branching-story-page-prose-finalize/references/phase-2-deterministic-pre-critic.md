# Phase 2: Deterministic Pre-Critic

Phase 2 runs three deterministic checks over the rendered prose before any LLM-driven critic spends tokens. The checks are designed to fail fast on the failure modes that don't need semantic judgment to detect: regex-grade engine-vocabulary leakage, keyword-grade forbidden-mystery resolution, and keyword-grade REQUIRED TURN miss. Each check FAILS with citations; there is no re-prompt loop in this skill (the user revises the prose externally and re-runs).

## Inputs

- Rendered prose body (loaded at pre-flight).
- Plan frontmatter: `forbidden_engine_vocabulary[]`, `forbidden_resolutions[]`.
- Plan §18 body: `REQUIRED TURN` line.
- Whole-class Mystery Reserve load (loaded at pre-flight) — for status-aware forbidden-M cross-check.

## Check 1: Engine-Vocabulary Leakage

Run a literal-token regex over the rendered prose for every token in `plan.forbidden_engine_vocabulary[]`. The plan's frozen list (verbatim from page-plan.md template's frontmatter) includes:

```
CF-NNNN, CH-NNNN, CHAR-NNNN, DA-NNNN, SF-NNNN, OBL-NNNN, THR-NNNN, SREL-NNNN,
STINT-NNNN, SE-NNNN, SLT-NNNN, CHC-NNNN, PG-NNNN, BR-NNNN, STLOC-NNNN, STOBJ-NNNN,
STENT-NNNN, ARCTRACE-NNNN, INV-N, ONT-N, CAU-N, SOC-N, AES-N, DIS-N, M-NNNN,
OQ-NNNN, ENT-NNNN, SEC-*
```

The regex for each token is the literal id pattern with digits expanded — e.g., `CF-\d{4}`, `INV-\d+`, `SEC-(ELF|INS|MTS|GEO|ECR|PAS|TML)-\d{3}`. Match case-insensitively (`/i` flag) to catch deliberate or accidental case variants like "cf-0001" or "Cf-0001".

Also catch hyphenated-compound usage where the token is embedded in a longer word — e.g., "the CAU-2 register" or "the M-3 substrate" (per Prose Craft Contract Rule 9). The regex `\b(CF|CH|CHAR|DA|SF|OBL|THR|SREL|STINT|SE|SLT|CHC|PG|BR|STLOC|STOBJ|STENT|ARCTRACE|M|OQ|ENT)-\d+` and `\b(INV|ONT|CAU|SOC|AES|DIS)-\d+` and `\bSEC-(ELF|INS|MTS|GEO|ECR|PAS|TML)-\d+` together cover the surface area.

**On match:** abort Phase 2 with citation:

```
engine_vocabulary_leakage: rendered prose contains forbidden token(s):
  - "<matched-token>" at offset <N> ("<surrounding context, ~80 chars>")
  - ...
The rendered prose may not contain engine vocabulary (record ids, invariant codes,
mystery codes, section codes). The character does not know they live inside a ledger.
Revise the prose externally and re-run finalize.
```

## Check 2: Forbidden-Mystery Resolution Scan

For each `M-NNNN` in `plan.forbidden_resolutions[]`, run a keyword scan against the rendered prose for the mystery's `resolution_signal_keywords[]` (loaded from the M record itself via the pre-flight whole-class Mystery Reserve load).

**Note:** the plan's `forbidden_resolutions[]` is a frozen-at-plan-time snapshot. Phase 2 ALSO cross-checks the live Mystery Reserve — any M with `status: forbidden` at finalize time (whether or not it was on the plan's frozen list) is checked. If a new M was added to `forbidden` status between plan-commit and finalize, this catches it.

Two sub-checks per forbidden M:

| Sub-check | Method | Failure |
|---|---|---|
| Direct keyword resolution | Token presence of M's `resolution_signal_keywords[]` in proximity (≤200 chars) to M's `subject_keywords[]` | FAIL with cited offsets |
| Negation-pattern leak | "_not_ X", "never X", "X is impossible" patterns over M's subject — these can be a backdoor resolution (asserting non-X is also a resolution) | FAIL with cited offsets |

**On match:** abort Phase 2 with citation:

```
forbidden_mystery_resolution: rendered prose appears to resolve mystery M-NNNN ("<title>"):
  - direct keyword match at offset <N> ("<context>")
  - or negation pattern at offset <N> ("<context>")
M-NNNN is in forbidden status. Mysteries with forbidden status MUST NOT be resolved in any
form (direct, negated, dismissed, or made impossible). Revise the prose externally and re-run
finalize. If the resolution is intentional, route through the mystery-status-change canon-addition
flow first to unlock resolution.
```

## Check 3: REQUIRED TURN Heuristic

The plan's §18 contains a `REQUIRED TURN: <one-sentence binding outcome>` line — the scene's contract. Phase 2 runs a keyword-presence heuristic to detect whether the rendered prose plausibly achieves the REQUIRED TURN.

**Procedure:**

1. Parse §18's REQUIRED TURN line. Example: `REQUIRED TURN: Iker takes the envelope but does not open it`.
2. Extract content words (filter out stopwords): `["Iker", "takes", "envelope", "does", "not", "open"]`.
3. Verify that all content words (≥80% by count, rounded down) appear somewhere in the rendered prose. Synonyms are NOT auto-resolved at this stage — the heuristic is a coarse keyword presence check, not a semantic match.

**Heuristic limits:** the keyword check can produce false negatives (the prose uses synonyms; e.g., "envelope" → "letter") and false positives (the words appear but in a different action arrangement; e.g., "Iker does not take the envelope" — Phase 3's LLM critic catches this semantic miss, not Phase 2).

**On miss (<80% keyword match):** route as a soft warning, NOT a hard abort. Record:

```
required_turn_heuristic_warning: REQUIRED TURN line "<line>" has low keyword presence (<N>/<M> content words matched) in rendered prose.
The deterministic heuristic cannot confirm the REQUIRED TURN was met. Phase 3's LLM critic will
make the final determination via the prose-craft-contract's `padding_or_truncation` and the
scene-coherence axes. Phase 5's `prose_ledger_consistency` gate will also catch a state-delta
mismatch if the REQUIRED TURN was missed.
```

The warning is surfaced in Phase 6's deliverable summary but does NOT halt the skill. Phase 3 and Phase 5 are the load-bearing gates for REQUIRED TURN compliance.

## Check Ordering and Cost

Run the checks in this order — fail-fast halts on the cheapest signal first:

1. Engine-vocabulary leakage (single-pass regex over prose, ≪1ms).
2. Forbidden-mystery resolution (small regex set × small M-forbidden set).
3. REQUIRED TURN heuristic (one keyword check).

If Check 1 fails, do NOT run Check 2 or Check 3 — engine-vocabulary leakage is unambiguously a HARD fail and the user has clear revision direction already.

If Check 2 fails, do NOT run Check 3 — Check 3 is heuristic-only and adds no signal when a hard-fail check has already fired.

## Phase 2 Output

- All three checks PASS: proceed to Phase 3.
- Check 1 FAIL: halt. No Phase 3, no Phase 4, no Phase 5, no engine writes.
- Check 2 FAIL: halt. Same.
- Check 3 WARN: proceed to Phase 3 with the warning recorded for Phase 6 surfacing.

Cite every offset in failure messages — the goal is to give the user actionable revision targets, not vague "prose has a problem" feedback.
