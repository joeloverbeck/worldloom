# Phase 15a Checkpoint Grep Reference

Canonical grep commands for Phase 15a write-phase progress discipline checkpoints (SKILL.md Procedure step 5 §Phase 15a write-phase progress discipline) and post-write structural-integrity verification (`accept-path.md` §Phase 15a sub-step 4). Load at Phase 15a for **large-delivery accepts** (≥6 `required_world_updates` files OR ≥4 `modification_history` entries OR ≥3 new Mystery Reserve entries); for small-delivery invocations the ad hoc inline grep-composition remains acceptable without this reference.

All commands are shaped for `worlds/<world-slug>/` paths; substitute the actual world slug plus the session's new CF ids, new CH id, and new PA id. Placeholders used below: `<slug>` (world directory slug), `<NEW-CF-ID>` (a single new CF, e.g., `CF-0046`), `<NEW-CH-ID>` (the session's new CH, e.g., `CH-0018`), `<NEW-PA-ID>` (the session's new PA id with verdict suffix, e.g., `PA-0017-accept_with_required_updates`).

---

## Part A — Inter-Step Write-Phase Checkpoints

Run after each macro-phase transition during Phase 15a sub-step application. Any checkpoint failure halts the write sequence at that checkpoint and requires repair before advancing.

### Checkpoint A.1 — after all domain-file patches complete

```bash
# Per-file attribution count — expect N matches where N = patches applied to that file
for f in WORLD_KERNEL INVARIANTS ONTOLOGY GEOGRAPHY PEOPLES_AND_SPECIES INSTITUTIONS \
         ECONOMY_AND_RESOURCES EVERYDAY_LIFE OPEN_QUESTIONS MYSTERY_RESERVE TIMELINE; do
  cf=$(grep -c "added by <NEW-CF-ID>" worlds/<slug>/$f.md 2>/dev/null || echo 0)
  echo "$f.md: <NEW-CF-ID>=$cf"
done

# Section-heading contiguity where new sections were inserted (visual spot-check)
grep -n "^## \|^### " worlds/<slug>/<affected-file>.md
```

Substitute `added by <NEW-CF-ID>` with `clarified by <NEW-CH-ID>` for clarificatory-retcon accepts per `accept-path.md` §Clarificatory-Retcon Variant (attribution form changes; the grep shape does not).

### Checkpoint A.2 — after sub-step 3.i CF qualifications complete

```bash
# CF id count — expect UNCHANGED from pre-write (sub-step 3.i does NOT add new CFs)
grep -c "^id: CF-" worlds/<slug>/CANON_LEDGER.md

# Notes-field modification trace count — expect incremented by the number of qualified CFs
grep -c "by <NEW-CH-ID> (<NEW-CF-ID>)" worlds/<slug>/CANON_LEDGER.md

# modification_history array entries with new change_id — expect one per qualified CF
# (on clarificatory retcons, substitute the retcon's CH id and sentinel originating_cf)
grep -c "change_id: <NEW-CH-ID>" worlds/<slug>/CANON_LEDGER.md
```

### Checkpoint A.3 — after sub-step 3.ii new CF append complete

```bash
# CF id count — expect incremented by exactly the number of new CFs
# (new-fact accepts: +1 or +N where N is the number of new CFs; clarificatory-retcon: +0)
grep -c "^id: CF-" worlds/<slug>/CANON_LEDGER.md

# Confirm new CF appears at expected id position (should be at tail of CFs section)
grep "^id: CF-" worlds/<slug>/CANON_LEDGER.md | tail -3

# YAML fence-boundary preservation — openers and closers should be balanced
grep -c "^\`\`\`yaml" worlds/<slug>/CANON_LEDGER.md
grep -c "^\`\`\`$" worlds/<slug>/CANON_LEDGER.md
```

Sub-step 3.ii is **skipped** for clarificatory-retcon accepts (no new CF appended); checkpoint A.3 is N/A in that variant.

### Checkpoint A.4 — after sub-step 3.iii Change Log Entry append complete

```bash
# CH id count — expect incremented by exactly 1
grep -c "^change_id: CH-" worlds/<slug>/CANON_LEDGER.md

# Confirm new CH-NNNN appears at TAIL of change log section (newest entry last)
grep "^change_id: CH-" worlds/<slug>/CANON_LEDGER.md | tail -3
```

---

## Part B — Post-Write Structural-Integrity Verification (end-state)

Run after all Phase 15a writes complete, before reporting completion. These correspond to the seven checks in `accept-path.md` §Phase 15a sub-step 4.

### B.1 — YAML block-fence integrity

```bash
# Count yaml openers and closers; should be balanced
opener_count=$(grep -c "^\`\`\`yaml" worlds/<slug>/CANON_LEDGER.md)
closer_count=$(grep -c "^\`\`\`$" worlds/<slug>/CANON_LEDGER.md)
echo "openers=$opener_count closers=$closer_count (expect equal)"
```

### B.2 — CF id enumeration contiguity

```bash
# Count + check for duplicates + enumerate tail
cf_count=$(grep -c "^id: CF-" worlds/<slug>/CANON_LEDGER.md)
cf_unique=$(grep "^id: CF-" worlds/<slug>/CANON_LEDGER.md | sort -u | wc -l)
echo "CF count=$cf_count unique=$cf_unique (expect equal; no duplicates)"
grep "^id: CF-" worlds/<slug>/CANON_LEDGER.md | tail -3
```

### B.3 — CH id enumeration contiguity

```bash
# Count + enumerate tail; newest CH should be the new <NEW-CH-ID>
ch_count=$(grep -c "^change_id: CH-" worlds/<slug>/CANON_LEDGER.md)
ch_unique=$(grep "^change_id: CH-" worlds/<slug>/CANON_LEDGER.md | sort -u | wc -l)
echo "CH count=$ch_count unique=$ch_unique (expect equal; no duplicates)"
grep "^change_id: CH-" worlds/<slug>/CANON_LEDGER.md | tail -3
```

### B.4 — new-CF approval flag

```bash
# For new-fact accepts: confirm direct_user_approval: true on each new CF
# Uses awk to scope search within each new CF's YAML block
awk '/^id: <NEW-CF-ID>/{flag=1;next}/^modification_history:/{flag=0}
     flag && /direct_user_approval: true/{print "<NEW-CF-ID>: "$0}' \
  worlds/<slug>/CANON_LEDGER.md

# Expected output: the literal line "  direct_user_approval: true" one time per new CF
```

Skip B.4 for clarificatory-retcon accepts (no new CF to check).

### B.5 — modification_history trace completeness

```bash
# Expect BOTH notes-field trace AND mod_history array entry on every CF identified by Phase 12a scan
# Count all CH-0018-tagged occurrences in the ledger (includes both notes-field lines and mod_history array entries, PLUS the top-level CH header — total = 2 × number of qualified CFs + 1)
total_ch_occurrences=$(grep -c "<NEW-CH-ID>" worlds/<slug>/CANON_LEDGER.md)
expected=$(( 2 * NUM_QUALIFIED_CFS + 1 ))
echo "total <NEW-CH-ID> occurrences=$total_ch_occurrences (expect $expected = 2×qualified-CFs + 1 header)"

# Optional: enumerate each qualified CF's notes-field trace and mod_history array entry
# Substitute the specific CF ids per the Phase 12a scan
for cf in CF-NNNN CF-NNNN CF-NNNN; do
  notes=$(awk -v cf="$cf" '$0~"^id: "cf{flag=1;next}/^modification_history:/{flag=0}
                            flag && /Modified.*by <NEW-CH-ID>/{print}' worlds/<slug>/CANON_LEDGER.md | wc -l)
  mod_arr=$(awk -v cf="$cf" '$0~"^id: "cf{flag=1;next}/^```/{flag=0}
                              flag && /change_id: <NEW-CH-ID>/{print}' worlds/<slug>/CANON_LEDGER.md | wc -l)
  echo "$cf: notes-field-trace=$notes mod_history-entry=$mod_arr (expect 1 each)"
done
```

### B.6 — attribution comment integrity in domain-file patches

```bash
# Per-file attribution count — should match the number of patches applied per file
# Substitute attribution form per accept-path.md §Phase 13a artifact 4:
#   "added by <NEW-CF-ID>" for new-fact accepts
#   "clarified by <NEW-CH-ID>" for clarificatory retcons
for f in WORLD_KERNEL INVARIANTS ONTOLOGY GEOGRAPHY PEOPLES_AND_SPECIES INSTITUTIONS \
         ECONOMY_AND_RESOURCES EVERYDAY_LIFE OPEN_QUESTIONS MYSTERY_RESERVE TIMELINE; do
  out="$f.md:"
  for cf in <NEW-CF-ID-1> <NEW-CF-ID-2>; do
    c=$(grep -c "added by $cf" worlds/<slug>/$f.md 2>/dev/null || echo 0)
    out="$out $cf=$c"
  done
  echo "$out"
done
```

### B.7 — adjudication record Discovery-section canonical fields

```bash
# Confirm all five canonical fields present with literal names
for field in mystery_reserve_touched invariants_touched cf_records_touched \
             open_questions_touched change_id; do
  count=$(grep -c "$field" worlds/<slug>/adjudications/<NEW-PA-ID>.md)
  echo "$field: $count occurrences (expect ≥1)"
done
```

Ad-hoc field-name substitution (e.g., `New CF` instead of `cf_records_touched`) breaks grep-discoverability for future audits. If any field returns 0, fix the adjudication record before reporting completion.

---

## Compound One-Liner (all-in-one end-state verification)

For large-delivery accepts where all seven B-checks need to run after the writes complete, this compound bash block runs all checks with labeled output. Substitute the session's values at the top of the block.

```bash
SLUG="<world-slug>"
NEW_CF_IDS="CF-NNNN CF-NNNN"           # space-separated list; set empty for clarificatory retcons
NEW_CH_ID="CH-NNNN"
NEW_PA_ID="PA-NNNN-<verdict>"
LEDGER="worlds/$SLUG/CANON_LEDGER.md"
PA="worlds/$SLUG/adjudications/${NEW_PA_ID}.md"

echo "=== FINAL POST-WRITE VERIFICATION ==="

echo "--- B.1 YAML block-fence integrity ---"
echo "openers: $(grep -c '^\`\`\`yaml' $LEDGER) closers: $(grep -c '^\`\`\`$' $LEDGER) (expect equal)"

echo "--- B.2 CF id enumeration ---"
echo "CF count: $(grep -c '^id: CF-' $LEDGER)"
grep "^id: CF-" $LEDGER | tail -3

echo "--- B.3 CH id enumeration ---"
echo "CH count: $(grep -c '^change_id: CH-' $LEDGER)"
grep "^change_id: CH-" $LEDGER | tail -3

echo "--- B.4 new-CF approval flags ---"
for cf in $NEW_CF_IDS; do
  awk -v cf="$cf" '$0~"^id: "cf{flag=1;next}/^modification_history:/{flag=0}
                    flag && /direct_user_approval: true/{print cf": "$0}' $LEDGER
done

echo "--- B.5 mod_history trace completeness ---"
echo "$NEW_CH_ID occurrences: $(grep -c "$NEW_CH_ID" $LEDGER)"

echo "--- B.6 attribution comment integrity (domain files) ---"
for f in WORLD_KERNEL INVARIANTS ONTOLOGY GEOGRAPHY PEOPLES_AND_SPECIES INSTITUTIONS \
         ECONOMY_AND_RESOURCES EVERYDAY_LIFE OPEN_QUESTIONS MYSTERY_RESERVE TIMELINE; do
  out="$f.md:"
  for cf in $NEW_CF_IDS; do
    c=$(grep -c "added by $cf" worlds/$SLUG/$f.md 2>/dev/null || echo 0)
    out="$out $cf=$c"
  done
  echo "$out"
done

echo "--- B.7 adjudication Discovery-section canonical fields ---"
for field in mystery_reserve_touched invariants_touched cf_records_touched \
             open_questions_touched change_id; do
  echo "$field: $(grep -c "$field" $PA) occurrences"
done
```

---

## Variant Adaptations

### Clarificatory-retcon accepts (`change_type: clarification`, `retcon_type: A`)

- **Checkpoint A.3** (new CF append) — **SKIPPED** (no new CF; sub-step 3.ii does not run).
- **B.2 CF id count** — expected UNCHANGED from pre-write (no new CFs added).
- **B.4 new-CF approval flag** — **SKIPPED** (no new CF to check).
- **B.6 attribution form** — `clarified by <NEW-CH-ID>` (not `added by <NEW-CF-ID>`). See `accept-path.md` §Placement convention for the richer form `<!-- clarified by <NEW-CH-ID> (inherited from <EARLIER-CH-ID> drift) -->` when correcting inherited drift.
- **B.5 mod_history array `originating_cf`** — expect sentinel value `originating_cf: none_clarification_retcon` per `accept-path.md` §Clarificatory-Retcon Variant Artifact 2. Grep adaptation: `grep "originating_cf: none_clarification_retcon" $LEDGER` should return one occurrence per qualified CF.

### Accept-without-required-updates (`ACCEPT` verdict, rare)

- **B.6 attribution comment integrity** — N/A (no domain-file patches applied); entire B.6 block skipped.
- **A.1 inter-step checkpoint** — also N/A for the same reason.

### Large-delivery scale thresholds

Load this reference when the delivery crosses any of:

- ≥6 files in `required_world_updates`
- ≥4 CFs receiving `modification_history` entries
- ≥3 new Mystery Reserve entries (full M-N sections or cross-application extensions)

Below these thresholds, the inline ad hoc grep approach is preferable — the reference is additive canonicalization for complex deliveries, not a replacement for the general principle "run the checkpoint, name the check, verify the count."

---

## Cross-references

- SKILL.md Procedure step 5 §Phase 15a write-phase progress discipline — authoritative description of the four inter-step checkpoints (Part A above).
- `references/accept-path.md` §Phase 15a sub-step 4 — authoritative description of the seven post-write structural-integrity checks (Part B above).
- `references/accept-path.md` §Clarificatory-Retcon Variant — authoritative description of the variant adaptations above.
- `templates/adjudication-report.md` — authoritative definition of the five Discovery-section canonical field names used in B.7.
