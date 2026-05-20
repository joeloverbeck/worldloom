# Red Bunny — manual edits to apply after STEMOACC-001 lands

**Scope:** what, if anything, I would have authored differently in the `red-bunny` bootstrap had `stemo_orientation_records_exist` not had the accessibility defect captured in `tickets/STEMOACC-001.md`, and the exact manual change to bring the committed bundle to that better state once the ticket lands.

**Bottom line:** exactly **one** record — `STEMO-1.yaml` — would I have authored differently. Its `orientation.toward_records` was routed through `SREL-1`/`BEL-1` *only because* a bare `STENT` target fails the current validator. Once STEMOACC-001 makes direct-observation entity orientation lawful, the correct, more direct modeling is to orient Jon's desire at **Ane herself (`STENT-2`)**. Nothing else in the 54-record bundle, the page plan, `STORY_KERNEL.md`, or the `INDEX.md` files needs to change. The current bundle is valid today and stays valid even if you never apply this edit; the edit is a modeling refinement, not a correctness repair.

---

## 1. Why only STEMO-1

`STEMO-1` is Jon's desire. Its natural orientation target — per FOUNDATIONS §6b, where **direct observation** is an enumerated access route — is the person the desire is *about*: Ane (`STENT-2`), whom Jon can plainly see. At bootstrap I could not write that: the current `isRecordAccessibleToHolder` (`tools/validators/src/structural/stemo-utils.ts:183`) has no path for a bare `STENT`, so orienting at `STENT-2` raised `stemo_orientation_records_active.inaccessible_target`. I routed through `SREL-1` (the Jon→Ane desire relation, accessible via `participants`) and `BEL-1` (Jon's belief, accessible via `holder`) instead. That passes, but it is indirect: the emotion's `emotion_oriented_toward` graph edge (`docs/MACHINE-FACING-LAYER.md`) points at a relation and a belief rather than at the person, which is weaker for retrieval and health-audit traversal.

**`STEMO-2` stays exactly as-is.** Ane's grief is oriented at her situation — the danger (`SF-3`), her resentment of her mother (`SREL-3`), her dread of home (`BEL-6`). Its only entity-shaped candidate target, Marisa (`STENT-3`), is **offstage** (`STSTAT-3.location: offstage`), so Ane is *not* co-located with her. Under STEMOACC-001's direct-observation rule, orienting Ane's emotion at offstage Marisa would (correctly) still fail — Ane cannot perceive her. The existing `SF-3`/`SREL-3`/`BEL-6` orientation is the right modeling both now and after the ticket, and all three remain accessible (the ticket only *adds* the entity route; it removes none of the fact/relationship/belief routes). **No change.**

Co-location is confirmed in the committed records:
- `STSTAT-1` (Jon) `location: STLOC-1`; `STSTAT-2` (Ane) `location: STLOC-1` → co-located → entity orientation lawful post-ticket.
- `STSTAT-3` (Marisa) `location: offstage` → not co-located with Ane → entity orientation correctly remains unavailable.

---

## 2. The exact edit (apply only after STEMOACC-001 lands)

File: `worlds/erotica-world/stories/red-bunny/_source/emotions/STEMO-1.yaml`

**Before:**
```yaml
orientation:
  toward_records:
    - SREL-1
    - BEL-1
```

**After:**
```yaml
orientation:
  toward_records:
    - STENT-2
```

That is the entire change. Rationale for dropping `SREL-1`/`BEL-1` rather than appending `STENT-2` to them: per FOUNDATIONS §5b (schema-minimalism at story scope), `orientation` should name the *target of the feeling* — the person — not re-list the relationship/belief that already exist as their own records (`SREL-1` is independently active; `BEL-1`/`BEL-2` already sit in `appraisal_basis`). If you prefer to preserve the relation edge as well, `toward_records: [STENT-2, SREL-1]` is also valid post-ticket (both `STENT-2` via co-location and `SREL-1` via participant); I recommend the single-target form.

No other field of `STEMO-1.yaml` changes. `STEMO-2.yaml` is untouched.

---

## 3. Preconditions and timing — do not apply early

- **Apply strictly after `STEMOACC-001` is merged.** Until the validator models the direct-observation route, the edited record fails `stemo_orientation_records_active.inaccessible_target`. Applying it before the ticket lands breaks bundle validation.
- The edit assumes STEMOACC-001 lands as specified: entity orientation accepted iff holder and target are both active at the emotion's `created_at_page` and co-located by active `STSTAT.location`. `STEMO-1` satisfies that (both at `STLOC-1`, both active at `PG-1`).

---

## 4. Why the edit is hash-safe (no page rewrite, no re-bootstrap)

The change touches only `STEMO-1.yaml`'s body. It does **not** invalidate any committed hash:

- **`PG-1.state_hash`** covers the `PG-1` record, whose `state_snapshot.active_records.STEMO` lists the *id* `STEMO-1`, never the record body. Editing the orientation list does not change a single byte of `PG-1.yaml`. State hash unchanged.
- **`PG-1.plan.plan_hash`** covers the bytes of `pages-prose-plans/PG-1.md`. That plan's §9c renders the emotions by affect/trigger/appraisal/pressure and deliberately carries **no** record ids (`grep` for `orientation`/`SREL-1`/`STENT-2` in the plan returns 0). Plan hash unchanged.
- No `SE`, `BR`, `CHC`, `SLT`, or other record references `STEMO-1`'s orientation, so nothing else needs re-touching.

So a single-line in-place edit is fully self-contained.

---

## 5. How to apply it (mechanism)

- **While the bundle is uncommitted in the working tree (current state):** edit `STEMO-1.yaml` in place by hand. `_source/*.yaml` is Hook-3-protected against *engine-routed* skill writes, but a human editing the working-tree file directly is outside that path; this is the minimal, correct move for a pre-publication bundle whose record was authored sub-optimally due to a tool bug.
- **If by then the bundle has been git-committed and append-only discipline is being enforced:** do not edit in place. Instead supersede via a repair turn — `create_stemo_record` for a new `STEMO-3` with `supersedes: STEMO-1` and the corrected `orientation`, swapped into the page's active set on a repair `PG`/`SE`. This is heavier (it rewrites a page snapshot and its hashes) and is only warranted if in-place editing is foreclosed by your commit/index policy.

---

## 6. Verification after applying

```bash
# 1. The edited record passes the (fixed) orientation validator and schema:
node tools/validators/dist/src/cli/world-validate.js erotica-world --structural \
  --file worlds/erotica-world/stories/red-bunny/_source/emotions/STEMO-1.yaml --json
# expect: stemo_orientation_records_exist PASS (no inaccessible_target); record_schema_compliance PASS

# 2. The whole bundle still validates structurally:
node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --json

# 3. Page hashes are unchanged (orientation is not a hash input):
node tools/world-mcp/dist/src/cli/compute-pg-hashes.js \
  --plan worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md \
  --pg   worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml
# expect: plan_hash 57b9eac357ede4f1310c6bc8fe2165848d7e868452f113636e3c1ade743b66ea
#         state_hash 2dd3001142c559b622bd72eb8e933539ffa14160b1b4d6b51fa6f97efed5c958  (both unchanged)
```

---

## 7. Everything that does NOT change

For the record, none of the following are affected by STEMOACC-001 and require no edit: all 3 `STENT`, 3 `STSTAT`, `STLOC-1`, `STOBJ-1`, 5 `SF`, 7 `BEL`, 3 `STINT`, `CNSQ-1`, 3 `THR`, 3 `SREL`, `CLK-1`, `STSEC-1` (its `holders: [STENT-2]` is correct; no STEMO orients toward it, so the `holders`-plural bug never bit this bundle), `STQ-1`, `STEMO-2`, `BR-1`, `SE-1`, `PG-1`, the 4 `CHC`, the 12 `SLT`, `STORY_KERNEL.md`, `pages-prose-plans/PG-1.md`, the bundle `INDEX.md`, and the per-world `stories/INDEX.md`. The `INDEX.md` "Active Emotions" table records affect/intensity only and needs no update either way.
