### **1. Executive verdict**

Worldloom’s current story-related system is **basically sound but still test-deficient, partially implementation-drifted, runtime/deployed-unverified, and carrying two important eighth-iteration leftovers**. The core architecture should not be redesigned. The main remaining work is **validators and tests**, with smaller cleanup in **fixture currency, archive-reference hygiene, and deployment/capability currency checks**. This audit follows the uploaded ninth-iteration instructions as the task brief, but repo evidence outranks the uploaded prompt and prior audits.

**Repo-source confidence:** high for the inspected current non-archived GitHub files.  
 **Implementation confidence:** high for F1, F2, F3, F6, and F7; medium for broader story runtime guarantees because source was inspected but runtime was not invoked.  
 **Test confidence:** medium. Several targeted regression tests exist, but some current tests still use padded IDs.  
 **Runtime/deployed-capability confidence:** low. I inspected source only; I did not invoke a running MCP server.  
 **Research-transfer confidence:** medium-high. The useful external research maps cleanly to validators/replay/retrieval tests, not schema expansion.

Bluntly: **the eighth-iteration fixes landed where they mattered most, but `causal_dependency_threat_scan` is still not mechanized, witness coverage is only tag-shape validation, and padded test fixtures still normalize old contracts.**

---

### **2. Repository access and inspected-source inventory**

**Repository inspected:** `joeloverbeck/worldloom`  
 **Branch/ref inspected:** `main`, commit/ref `3b409581135b08f8bc99a61a426514cdc98b997d`, a merge commit for `spec-35-story-pipeline-fixes`.  
 **Access method:** connected GitHub/code-search integration plus GitHub file viewing through the available tool surface.  
 **Repo cloned:** no. The session did not explicitly authorize cloning, and connected GitHub/code search was available.  
 **Archive exclusion:** GitHub search did not expose a reliable hard `archive/` exclusion filter. I manually classified `archive/` hits as non-current and did not use them as current support.  
 **Runtime/deployed MCP invoked:** no. This was source-only. I do not claim deployed MCP behavior.

**Authority docs inspected, current non-archived:**

* `docs/FOUNDATIONS.md`  
* `.claude/skills/_shared-templates/story-state-contract.md`  
* `.claude/skills/_shared-templates/persisted-packet-recovery.md`  
* `docs/CONTEXT-PACKET-CONTRACT.md`  
* `docs/HARD-GATE-DISCIPLINE.md`  
* `docs/MACHINE-FACING-LAYER.md`

**Seven story-pipeline skills inspected, current non-archived:**

| Skill | Current path |
| ----- | ----- |
| `branching-story-bootstrap` | `.claude/skills/branching-story-bootstrap/SKILL.md` |
| `branching-story-turn-cycle` | `.claude/skills/branching-story-turn-cycle/SKILL.md` |
| `branching-story-prose-attach` | `.claude/skills/branching-story-prose-attach/SKILL.md` |
| `commitment-block-authoring` | `.claude/skills/commitment-block-authoring/SKILL.md` |
| `branching-story-health-audit` | `.claude/skills/branching-story-health-audit/SKILL.md` |
| `story-fact-promotion-to-canon` | `.claude/skills/story-fact-promotion-to-canon/SKILL.md` |
| `story-promotion-closeout` | `.claude/skills/story-promotion-closeout/SKILL.md` |

**Implementation surfaces inspected, current non-archived:**

* Validator inventory, registry, and registration: `tools/validators/README.md`, `tools/validators/src/public/registry.ts`, `tools/validators/tests/structural/registry.test.ts`  
* `observer_firewall`: source and tests  
* `branch_isolation`: source and tests  
* `non_propagation_tag_shape`: source and tests  
* `choice_set_noncollapse`: source  
* `canon_baseline_drift`: source  
* BEL schema: `tools/validators/src/schemas/story-belief.schema.json`  
* MCP context packet: `tools/world-mcp/src/tools/get-context-packet.ts`, story-pipeline tests  
* MCP capability/tool registration: `tools/world-mcp/src/server.ts`  
* MCP envelope schema discovery: `tools/world-mcp/src/tools/describe-envelope-schema.ts`, tests  
* MCP `validate_patch_plan` and `submit_patch_plan`: source  
* ID allocator: `tools/world-mcp/src/tools/allocate-next-id.ts`  
* Patch-engine write/approval/lock/temp-file/validator routing: `tools/patch-engine/src/apply.ts`  
* Package/config surface: `tools/world-index/package.json`

**Tests/fixtures inspected:**

* `tools/validators/tests/structural/observer-firewall.test.ts`  
* `tools/validators/tests/structural/branch-isolation.test.ts`  
* `tools/validators/tests/structural/non-propagation-tag-shape.test.ts`  
* `tools/validators/tests/structural/registry.test.ts`  
* `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts`  
* `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts`

**Not fully inspectable or not verified in this source-only pass:**

* Running/deployed MCP server capability surface.  
* Whether generated `dist/` artifacts are fresh relative to TypeScript source.  
* Full repository-wide grep with a true `archive/` exclusion. GitHub search was used, and archive hits were manually rejected.  
* Full fixture corpus. I inspected targeted validator/MCP tests and current search hits, not every YAML fixture in the repo.

---

### **3. Authority extraction**

Binding rules relevant to this ninth audit:

1. **Story state is authoritative at PG commit.** Rendered prose is a receipt and never mutates PG, SE, or story state. The page plan and PG hash discipline are the authority surface.  
2. **Story truth is not world canon.** Story-local truth stays separate unless routed through `story-fact-promotion-to-canon` → `canon-addition` → `story-promotion-closeout`.  
3. **Worldloom rejects plot rails.** No act structure, midpoint/climax tracking, global drama manager, fixed endings, automatic reconvergence, word-count targets, or prose-as-state.  
4. **IDs are unpadded.** Current story and canon IDs are natural integers such as `PG-1`, `CF-1`, not `PG-0001`, `CF-0001`.  
5. **BEL/SF/STSTAT separation is foundational.** BEL records belief/claims/knowledge/lies; SF records branch-local truth; STSTAT drives replayable life, agency, location, and derived `entity_status`.  
6. **Mystery Reserve is firewalled.** Direct resolution and cumulative narrowing are both protected; deterministic enforcement applies where schema-backed, with judgment-assisted audit where semantic narrowing exceeds schema.  
7. **Patch-engine routing is mandatory.** Story records are written via patch-engine ops after `validate_patch_plan`, approval-token validation, pre-apply validators, locking, temp staging, atomic rename, and index sync.  
8. **Schema minimalism wins.** Add validators, tests, retrieval checks, and harnesses before adding fields; any new field needs a named mechanical consumer.

---

### **4. Eighth-fix verification ledger**

| Eighth finding | Current status | Evidence | Remaining work | Regression risk |
| ----- | ----- | ----- | ----- | ----- |
| F1 — Observer firewall current-choice resolution | **Fixed** | `observer_firewall` resolves the child page by `PG.input.resolved_event_id === SE.id`, then reads that page’s `input.choice_id`; test proves child choice leak cannot be masked by parent choice. | None for the target bug. | Low. |
| F2 — Branch isolation unpadded root/genesis handling | **Fixed** | Root pages derive from `BR.root_page_id` and fallback `parent_page_id: null && turn_index: 0`; tests include unpadded `BR-1`, `PG-1`, bundle-genesis BEL referenced by global storylet. | Replace remaining padded mock IDs in old tests. | Medium fixture drift. |
| F3 — Story-local context-packet seeds ignored/rerouted | **Fixed** | Story-local seed IDs are filtered before assembly, and warning `story_local_seed_nodes_ignored` is appended after packet assembly; tests cover mixed and all-story-local seeds. | Add PG/BEL/SE seed variants if not already covered by fixture generator. | Low. |
| F4 — Expected witness coverage honest/useful | **Partially fixed** | Validator is renamed/implemented as `non_propagation_tag_shape`; source explicitly says full witness coverage is planned, not implemented; tests cover valid/malformed/missing tag syntax. | Add semantic witness/BEL coverage validator or keep explicitly judgment-assisted. | High in play. |
| F5 — `causal_dependency_threat_scan` implemented/registered/tested | **Still open** | Registry lacks it; skills say deterministic validator is deferred and checks are judgment-based. | Implement/register/test the four required subchecks. | High in play. |
| F6 — `allocate_next_id` capability wording unpadded | **Fixed** | Capability description says fresh story-bundle IDs return unpadded `<CLASS>-1`; allocator formats all classes with `zeroPad: false`. | Add snapshot test around `describe_capabilities` if not already present. | Low. |
| F7 — `describe_envelope_schema(create_bel_record)` full BEL schema | **Fixed** | `create_bel_record` now references `story-belief.schema.json`; test verifies BEL required fields are exposed through `referenced_schemas`. | None for target bug. | Low. |
| F8 — Retired fixture fields and padded IDs removed | **Partially fixed** | Current schemas/allocator use unpadded IDs, and new unpadded regression tests exist; however current validator tests still use `PG-0001`, `CHC-0001`, `BEL-0001`, etc. | Convert remaining padded test mocks unless intentionally testing legacy rejection. | Medium. |
| F9 — Archive-reference cleanup | **Partially fixed / still open** | Most current docs use archive historically or not at all, but `tools/validators/README.md` still cites `../../archive/specs/SPEC-04-validator-framework.md` as “Design” without caveat. | Replace with current authority or mark explicitly historical/non-authoritative. | Medium doc drift. |

---

### **5. Regression audit**

**Verified implementation drift**

* `causal_dependency_threat_scan` remains a skill/audit prose requirement, not a registered deterministic validator. That is not a new regression in behavior, but it is an unresolved F5 implementation gap.

**Doc-only drift**

* `tools/validators/README.md` cites an archived spec as design authority without caveat. That violates the current authority order.  
* `docs/MACHINE-FACING-LAYER.md` correctly warns that running MCP capability can be stale relative to source, but this audit did not verify deployed capability currency.

**Test-only drift**

* Current validator tests still use padded mock IDs. The validator regexes accept `d+`, so these tests may pass while still normalizing old `PG-0001` style IDs in developer habits.

**Fixture/migration drift**

* Targeted evidence shows residual padded test mocks. I did not find current non-archived support for `derived_from_cf`, `world_ent_id`, `storylet_realized`, or `arc_contract` as active schema fields; the shared contract explicitly rejects old arc/story-shape vocabulary in SLT.

**Generated/deployed drift**

* Unverified. Source shows the mechanism, not the deployed server. Treat runtime capability currency as a required tenth-iteration or CI check.

**Archived-source leakage**

* Active in `tools/validators/README.md`.

---

### **6. What should not change**

Do **not** introduce a drama manager, act structure, midpoint/climax tracking, target endings, automatic reconvergence, word-count goals, hidden LLM memory as state, prose-as-state, or global plot optimization. Those ideas would fight the system’s core strength: local salience, present-causal-state replay, and append-only state discipline.

Do **not** add fields for F4 or F5. Both can be improved using existing records: SE, PG, CHC, BEL, SF, STSTAT, SLT, OBL, CNSQ, THR, STLOC, STOBJ, and DA. The missing pieces are validator logic and tests, not schema.

Do **not** collapse BEL into SF. Public lies, rumors, mistakes, contested claims, and testimony need belief records precisely because they are not automatically branch-local truth.

Do **not** let story skills mutate world canon except through the existing promotion chain. The closeout skill correctly verifies linked CF/CH/PA outputs instead of fabricating canon outcomes.

---

### **7. Red-team support matrix**

| Failure mode | Current support classification | Exact mechanism |
| ----- | ----- | ----- |
| Player kills/incapacitates a major actor early | Handled but undertested | STSTAT drives life/agency/location; snapshot replay includes derived `entity_status`; missing causal-dependency validator weakens downstream debt/affordance checks. |
| Player refuses the premise | Handled | No fixed endings/rails; write-in and continuation discipline permit divergence. |
| Player abandons current thread | Handled but undertested | THR/OBL/CNSQ debt health and continuation audit. |
| Player lies publicly | Handled | BEL truth relation/mode; `lie_promoted_silently`; BEL/SF separation. |
| Player acts on unavailable information | Handled | `observer_firewall` checks selected child-page CHC grounding and BEL/SF access routes. |
| Player attempts something impossible | Handled but undertested | SE/write-in outcome routing and PG state authority; no prose mutation. |
| Player discovers protected mystery | Handled / judgment-assisted | Mystery Reserve firewall in foundations, promotion, prose attach, and health audit. |
| Cumulative mystery narrowing collapses mystery | Partially handled | Health audit tracks accretion; deterministic only where policy/schema-backed, otherwise judgment-assisted. |
| Player creates branch-local counterfactual | Handled | SF authority values and promotion scope checks. |
| Rendered prose invents structural fact | Handled / judgment-assisted | Prose attach receipt checks; prose never mutates PG. |
| Canon changes after pages committed | Handled | `canon_baseline_drift` uses full CH window and active SF `derived_from` traversal. |
| Story-local claim proposed for canon promotion | Handled | `story-fact-promotion-to-canon` proposal package; `story-promotion-closeout` linked-record verification. |
| Sibling branches contradict | Handled but undertested | Branch isolation and promotion downstream-impact same-story branch analysis. |
| Sibling story bundles contradict | Judgment-assisted | Health audit cross-story mode and promotion downstream-impact analysis. |
| Social consequences propagate through witnesses, rumors, institutions, artifacts, misunderstandings | Partially handled | BEL schema plus non-propagation tag shape; full witness/BEL coverage missing. |
| Expected social propagation does not occur | Partially handled | Skill-level expected witness completeness; deterministic implementation missing. |
| Branch-local records leak into global author-pool storylets | Handled | `branch_isolation` rejects global storylet branch-local static references, permits bundle genesis. |
| Storylet alias binding fails or binds wrong record | Handled but undertested | Observer firewall resolves alias-holder belief predicates; storylet predicate DSL validator registered. |
| Page snapshot replay diverges from SE deltas | Handled | `snapshot_replay_equality` registered; health audit replay phase. |
| Terminal branch leaves unresolved debts without proof | Handled but undertested | Health audit terminal proof/orphan debt checks. |
| Accepted choices are cosmetic | Handled | `choice_set_noncollapse` and health-audit replay choice consequence integrity. |
| Non-terminal leaf becomes unactionable | Handled but undertested | Health audit `unactionable_leaf`. |
| Prose receipt fails but turn-cycle continues from PG state | Handled | Prose attach isolates prose receipts from PG mutation. |
| Promotion closeout fakes canon-addition outputs | Handled | Closeout pre-flight verifies linked CF/CH/PA via MCP retrieval and aborts missing links. |
| Context packet omits governing records or story context | Handled but undertested | Story-pipeline packets require `story_slug`, story-local seeds are ignored, `story_bundle_context` populated. |
| Patch-engine schemas permit records docs forbid or reject records docs require | Mostly handled | Envelope schema references validator JSON schemas; record_schema_compliance registered. |
| Persisted context packet or `get_records` summary returned but consuming skill fails to retrieve slices | Handled by instruction, not runtime-enforced | Persisted packet recovery shared template requires slice retrieval before validation. |
| Schema discovery or deployed MCP capability surface is stale relative to source | Unverifiable / known risk | Machine-facing layer warns deployed capability may be stale; source inspected only. |
| Validator bundle in running MCP server stale relative to rebuilt source | Unverifiable / known risk | Runtime not invoked; source says capability metadata cannot fully prove validator currency. |
| Page-plan direct write succeeds but bytes no longer match `PG.plan.plan_hash` | Handled if skill followed; undertested | Shared write order requires post-write hash verification before INDEX. |
| Audit-only SE events accidentally enter page replay | Handled | Audit-only SE shapes and replay no-op treatment. |
| BEL/SF separation collapses | Handled but undertested | BEL schema, SF authority, `lie_promoted_silently`. |
| STSTAT-derived `entity_status` diverges | Handled but undertested | STSTAT source of replayable life/agency/location; snapshot replay includes projection. |
| Non-propagation tags malformed or accepted without evidence | Partially handled | Syntax and record-ID shape handled; evidence/group semantic match missing. |
| Canon-baseline drift uses only latest CH | Handled | Validator computes full intervening CH window and active mirrored SF traversal. |
| Current docs/skills/tests cite archived files as current authority | Not fully handled | `tools/validators/README.md` cites archive spec as design. |
| Generated `dist/` or deployed capability docs stale | Unverifiable | Source/config inspected; no runtime/dist execution. |

---

### **8. Findings**

#### **WL-N9-P1-001 — `causal_dependency_threat_scan` remains prose-only**

**Severity:** P1  
 **Affected files:** `.claude/skills/branching-story-turn-cycle/SKILL.md`, `.claude/skills/branching-story-health-audit/SKILL.md`, `tools/validators/src/public/registry.ts`, `tools/validators/tests/structural/registry.test.ts`  
 **Evidence type:** doc-level, code-level, test-level  
 **Problem:** The required validator does not exist as a registered current validator. The skills describe causal dependency checks, but the turn-cycle and health-audit skill text say deterministic implementation is deferred/judgment-based. The registry list does not include `causal_dependency_threat_scan`.  
 **Why it matters:** If a turn kills, moves, closes, or supersedes the record that a visible choice, affordance, obligation, or SLT precondition depends on, a player can be offered impossible or incoherent continuation options.  
 **Issue type:** missing validation; validator registration drift; implementation/test gap  
 **Recommendation:** Add `tools/validators/src/structural/causal-dependency-threat-scan.ts`, register it, and add fixture tests for the four named failures.  
 **Mechanical consumer:** `validate_patch_plan`, `submit_patch_plan`, health-audit replay, turn-cycle pre-commit gate.  
 **Schema change required:** no.  
 **Validator/test change required:** yes.  
 **MCP/patch-engine/hook change required:** no new MCP tool; validator will be consumed by existing validation entry points.  
 **Migration/fixture change required:** add fixtures/tests only.  
 **Deterministic vs judgment-assisted:** deterministic for the four named subchecks.  
 **Confidence:** high that it is not registered; medium on exact implementation scope because runtime was not invoked.

#### **WL-N9-P1-002 — Expected witness coverage is still tag-shape-only**

**Severity:** P1  
 **Affected files:** `tools/validators/src/structural/non-propagation-tag-shape.ts`, `tools/validators/tests/structural/non-propagation-tag-shape.test.ts`, story skills that rely on witness discipline  
 **Evidence type:** code-level, test-level, doc-level  
 **Problem:** The current validator checks only tag syntax, closed reasons, and record-ID shape. It explicitly says full witness coverage is planned, not implemented. Tests cover tag syntax, not direct/indirect witness computation, missing BEL, wrong group label, or evidence adequacy.  
 **Why it matters:** Social consequence propagation is one of the easiest places for branching stories to go fake. A public betrayal, violence, institutional action, or visible artifact trace can fail to create BEL records and still pass if the text has a syntactically valid non-propagation tag.  
 **Issue type:** missing validation; implementation/test gap  
 **Recommendation:** Keep `non_propagation_tag_shape` as syntax validator, but add `expected_witness_coverage` as a semantic structural validator. Use existing SE, BEL, STENT, STSTAT, STLOC, STOBJ, DA, and SREL records.  
 **Mechanical consumer:** `validate_patch_plan`, `submit_patch_plan`, health-audit Phase 2d.  
 **Schema change required:** no.  
 **Validator/test change required:** yes.  
 **MCP/patch-engine/hook change required:** no.  
 **Migration/fixture change required:** add adversarial story fixtures.  
 **Deterministic vs judgment-assisted:** deterministic for computed direct/indirect groups; judgment-assisted only for ambiguous semantic event classification.  
 **Confidence:** high.

#### **WL-N9-P2-003 — Current validator tests still normalize padded story IDs**

**Severity:** P2  
 **Affected files:** `tools/validators/tests/structural/observer-firewall.test.ts`, `tools/validators/tests/structural/branch-isolation.test.ts`  
 **Evidence type:** test-level, fixture-level  
 **Problem:** Current tests still use `PG-0001`, `CHC-0001`, `BEL-0001`, `SF-0001`, etc., even though FOUNDATIONS and allocator now use unpadded IDs. New unpadded regression tests exist, but old padded mock IDs remain.  
 **Why it matters:** Tests should train contributors into the current contract. Padded mocks keep legacy shapes alive and can hide schema drift.  
 **Issue type:** fixture/test drift  
 **Recommendation:** Replace padded mock IDs with unpadded IDs except in explicit legacy-rejection tests. Add a record-schema compliance test that padded story IDs fail if current schemas are meant to reject them.  
 **Mechanical consumer:** validator tests and schema compliance tests.  
 **Schema change required:** no if schemas already reject padded through convention; otherwise clarify whether `^PG-[0-9]+$` intentionally accepts leading zeros despite unpadded convention.  
 **Validator/test change required:** yes.  
 **MCP/patch-engine/hook change required:** no.  
 **Migration/fixture change required:** test fixture cleanup.  
 **Deterministic vs judgment-assisted:** deterministic.  
 **Confidence:** high.

#### **WL-N9-P2-004 — Current validator README cites archive as design authority**

**Severity:** P2  
 **Affected file:** `tools/validators/README.md`  
 **Evidence type:** doc-level  
 **Problem:** The README says `Design: ../../archive/specs/SPEC-04-validator-framework.md` without marking it historical or non-authoritative.  
 **Why it matters:** The ninth-iteration authority order says archived files never outrank current non-archived source. Current docs pointing to archive as design authority can resurrect stale specs.  
 **Issue type:** archived-source leakage; stale wording  
 **Recommendation:** Replace the line with current authority references plus a historical caveat.  
 **Mechanical consumer:** human implementers, audit skills, future triage.  
 **Schema change required:** no.  
 **Validator/test change required:** add archive-reference hygiene test if feasible.  
 **MCP/patch-engine/hook change required:** no.  
 **Migration/fixture change required:** no.  
 **Deterministic vs judgment-assisted:** deterministic doc lint possible.  
 **Confidence:** high.

#### **WL-N9-P2-005 — Runtime/deployed capability currency remains unverified**

**Severity:** P2  
 **Affected files:** `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/src/server.ts`, package build/config surfaces  
 **Evidence type:** doc-level, code-level, runtime/deployed-capability-level unavailable  
 **Problem:** Source defines the expected tool surface, but the running MCP server was not invoked. The machine-facing doc itself warns that source, generated artifacts, and runtime capability can drift.  
 **Why it matters:** A fix can land in TypeScript source while the deployed MCP server still exposes old schemas, old descriptions, or an old validator bundle.  
 **Issue type:** generated/deployed-capability drift; rollout/capability risk  
 **Recommendation:** Add a CI/runtime parity check that compares `describe_capabilities`, `describe_envelope_schema`, validator registry, and package build metadata after rebuild/restart.  
 **Mechanical consumer:** CI, deployment script, tenth-iteration audit.  
 **Schema change required:** no.  
 **Validator/test change required:** yes, capability parity test.  
 **MCP/patch-engine/hook change required:** maybe CI only; no new tool needed if existing tools are available.  
 **Migration/fixture change required:** no.  
 **Deterministic vs judgment-assisted:** deterministic.  
 **Confidence:** medium.

---

### **9. Exact proposed amendments**

#### **Amendment A — Add `causal_dependency_threat_scan`**

**File:** `tools/validators/src/structural/causal-dependency-threat-scan.ts`  
 **Operation:** add  
 **Code-shape description:** Implement a structural validator with name `causal_dependency_threat_scan`, `severity_mode: "fail"`, applying to full-world and `create_se_record | create_pg_record | create_chc_record | create_slt_record` patch plans.

It should emit:

* `choice_dependency_clobbered`: a visible/emitted `CHC.grounded_in.records[]` record is closed, superseded, moved, or invalidated by the resolving SE while the CHC remains visible.  
* `affordance_dependency_clobbered`: a visible affordance remains after its grounding STLOC/STOBJ/STENT is inactive, inaccessible, or moved.  
* `obligation_counterparty_unavailable_without_transfer`: an OBL counterparty becomes dead/incapacitated/captive/offstage/unavailable per active STSTAT without OBL close or transfer.  
* `slt_precondition_clobbered`: a high-salience debt had an eligible SLT before the turn; the turn destroys that precondition without closing/transferring/replacing the debt.

**Downstream docs/skills affected:** turn-cycle Phase 9, health-audit Phase 2g, validators README.  
 **Validators to add/change:** add validator; add registry entry.  
 **Tests to add/change:** add structural test file and update registry test.  
 **MCP/retrieval changes:** none.  
 **Patch-engine changes:** none; existing `validate_patch_plan` consumes validators.  
 **Hook changes:** none.  
 **Migration impact:** none.  
 **Fixture impact:** add adversarial fixtures.  
 **Generated/dist impact:** rebuild validator package and MCP server.  
 **Deployed capability impact:** restart deployed MCP and verify registry/capability parity.  
 **Pre-fix expected failure:** no validator verdict emitted for clobbered dependencies.  
 **Post-fix expected pass condition:** invalid patch plans fail before apply; valid close/transfer/replacement plans pass.

#### **Amendment B — Add semantic `expected_witness_coverage`**

**File:** `tools/validators/src/structural/expected-witness-coverage.ts`  
 **Operation:** add  
 **Code-shape description:** Keep `non_propagation_tag_shape` as syntax-only. Add a second validator that computes direct/indirect/excluded witness groups for SE records involving secrecy, betrayal, deception, violence, sex, law, status, public ritual, or visible public consequences.

Use existing fields:

* `SE.actor`, `SE.targets`, `SE.world_logic_rationale`, `SE.state_delta`  
* `BEL.basis.source_event`, `BEL.holder`, `BEL.visibility`, `BEL.truth_relation`  
* `STSTAT.location`, `STSTAT.life`, `STSTAT.agency`  
* `DA`, `STOBJ`, `STLOC`, `SREL`, OBL/CNSQ/THR where relevant

Accept either a BEL create/supersession for the computed group or a parseable `non_propagation:<reason>(group=<label>, records=[...])` tag whose group label matches a computed group and whose records exist.

**Downstream docs/skills affected:** story-state-contract witness section if wording needs clarification; turn-cycle Phase 9; health-audit Phase 2d.  
 **Validators to add/change:** add validator and registry entry; do not remove tag-shape validator.  
 **Tests to add/change:** missing witness BEL, malformed tag, wrong group label, valid non-propagation evidence, valid BEL propagation.  
 **MCP/retrieval changes:** none.  
 **Patch-engine changes:** none.  
 **Hook changes:** none.  
 **Migration impact:** none.  
 **Fixture impact:** add witness fixtures.  
 **Generated/dist impact:** rebuild validators and MCP.  
 **Deployed capability impact:** restart and verify validator registry parity.  
 **Pre-fix expected failure:** syntactically valid tag with wrong group can pass.  
 **Post-fix expected pass condition:** wrong group or missing BEL/tag fails; valid BEL or valid evidence-backed non-propagation passes.

#### **Amendment C — Clean padded test IDs**

**Files:** `tools/validators/tests/structural/observer-firewall.test.ts`, `tools/validators/tests/structural/branch-isolation.test.ts`, any sibling validator fixtures found by grep  
 **Operation:** replace  
 **Replacement shape:** Change mock IDs like `PG-0001`, `SE-0001`, `CHC-0001`, `BEL-0001`, `SF-0001`, `BR-0001`, `STENT-0001`, `SLT-0001` to `PG-1`, `SE-1`, `CHC-1`, `BEL-1`, `SF-1`, `BR-1`, `STENT-1`, `SLT-1`.

**Downstream docs/skills affected:** none.  
 **Validators to add/change:** optional schema test for padded legacy rejection.  
 **Tests to add/change:** update expected details.  
 **MCP/retrieval changes:** none.  
 **Patch-engine changes:** none.  
 **Hook changes:** none.  
 **Migration impact:** none.  
 **Fixture impact:** yes.  
 **Generated/dist impact:** no beyond normal test rebuild.  
 **Pre-fix expected failure:** tests pass while old padded IDs appear in current fixtures.  
 **Post-fix expected pass condition:** tests pass with unpadded IDs only, except explicit legacy-negative tests.

#### **Amendment D — Remove archive authority wording**

**File:** `tools/validators/README.md`  
 **Operation:** replace  
 **Exact replacement wording:**

Replace:

**Design**: `../../archive/specs/SPEC-04-validator-framework.md`

with:

**Current authority**: `docs/FOUNDATIONS.md`, `.claude/skills/_shared-templates/story-state-contract.md`, `docs/MACHINE-FACING-LAYER.md`, and the current non-archived validator source under `tools/validators/src/`.

Historical note: `archive/specs/SPEC-04-validator-framework.md` is archived prior art only. It is not current design authority.

**Downstream docs/skills affected:** validators README only.  
 **Validators to add/change:** optional doc-lint test: current docs must not cite `archive/` without `historical`, `archived`, or `not current authority`.  
 **Tests to add/change:** optional.  
 **MCP/retrieval changes:** none.  
 **Patch-engine changes:** none.  
 **Migration impact:** none.  
 **Pre-fix expected failure:** archive path appears as design authority.  
 **Post-fix expected pass condition:** archive reference is clearly historical.

#### **Amendment E — Add deployed capability parity check**

**File:** likely `tools/world-mcp/tests/server/capability-parity.test.ts` or CI script  
 **Operation:** add  
 **Code-shape description:** After build, instantiate server or invoke source-level capability builders and assert:

* `describe_capabilities` includes all expected tool names from `MCP_TOOL_ORDER`.  
* `describe_envelope_schema` op kinds equal `OPERATION_KINDS`.  
* `create_bel_record` still exposes `story-belief.schema.json`.  
* Validator registry contains expected structural/rule validators.  
* Build metadata/ref is present and recent enough for deployment check.

**Downstream docs/skills affected:** `docs/MACHINE-FACING-LAYER.md` can point to the parity test.  
 **Validator/test change required:** test only.  
 **Generated/dist impact:** yes; run after build.  
 **Deployed-capability impact:** yes; intended to catch stale runtime.  
 **Pre-fix expected failure:** stale runtime can go unnoticed.  
 **Post-fix expected pass condition:** CI or deployment fails if source and capability surface diverge.

---

### **10. Cross-skill / code propagation matrix**

| Accepted change | FOUNDATIONS | story-state-contract | persisted-packet | context contract | hard gate | machine layer | bootstrap | turn-cycle | prose attach | block authoring | health audit | promotion | closeout | MCP retrieval | patch schema | validators | schemas | hooks | tests | fixtures | migrations | dist/deploy |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| A. `causal_dependency_threat_scan` | — | clarify only if needed | — | — | — | maybe | — | update from deferred to validator-backed | — | maybe | update Phase 2g | — | — | — | — | add/register | — | — | add | add | — | rebuild/restart |
| B. `expected_witness_coverage` | — | clarify only if needed | — | — | — | maybe | — | update witness section | — | — | update Phase 2d | maybe evidence wording | — | — | — | add/register | — | — | add | add | — | rebuild/restart |
| C. Unpadded test IDs | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | maybe schema test | — | — | update | update | — | normal build |
| D. Archive README cleanup | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | README only | — | — | optional doc lint | — | — | — |
| E. Capability parity check | — | — | — | — | — | update | — | — | — | — | — | — | — | assert tools | assert op schemas | assert registry | — | — | add | — | — | deploy gate |

---

### **11. Validator and test plan**

**P0 blocking tests**

No new P0 findings were established from current source. The existing patch-engine path already fails closed when no pre-apply validator is supplied and requires approval-token verification before apply.

**P1 red-team tests**

1. `causal_dependency_threat_scan_rejects_choice_dependency_clobbered`  
    Purpose: visible CHC grounded in `STOBJ-1` remains emitted after SE closes/moves `STOBJ-1`.  
    Fixture shape: PG parent, CHC grounded in STOBJ, SE state_delta closes STOBJ, child PG still emits CHC.  
    Pre-fix: no causal validator verdict.  
    Post-fix: fail `choice_dependency_clobbered`.  
    Type: deterministic structural validator test.  
    File: `tools/validators/tests/structural/causal-dependency-threat-scan.test.ts`.  
2. `causal_dependency_threat_scan_rejects_affordance_dependency_clobbered`  
    Purpose: visible affordance survives after grounding location/object/entity invalidated.  
    Fixture: PG visible affordance tied to STLOC/STOBJ, SE closes/moves source.  
    Pre-fix: pass.  
    Post-fix: fail `affordance_dependency_clobbered`.  
    Type: deterministic.  
3. `causal_dependency_threat_scan_rejects_obligation_counterparty_unavailable_without_transfer`  
    Purpose: OBL remains open after counterparty STSTAT becomes dead/incapacitated/offstage.  
    Fixture: active OBL + STSTAT supersession.  
    Pre-fix: pass.  
    Post-fix: fail.  
    Type: deterministic.  
4. `causal_dependency_threat_scan_warns_slt_precondition_clobbered`  
    Purpose: high-salience debt had eligible SLT; SE destroys precondition without replacement.  
    Fixture: OBL + SLT precondition + SE closes prerequisite.  
    Pre-fix: pass.  
    Post-fix: warn/fail per final severity policy.  
    Type: deterministic.  
5. `expected_witness_coverage_rejects_missing_public_bel`  
    Purpose: public violence/status/law event creates no BEL and no non-propagation tag.  
    Fixture: SE at STLOC with active available witnesses by STSTAT.  
    Pre-fix: tag-shape validator sees nothing.  
    Post-fix: fail missing expected witness coverage.  
    Type: deterministic with fixture.  
6. `expected_witness_coverage_rejects_wrong_group_label`  
    Purpose: syntactically valid non-propagation tag names a group not computed.  
    Fixture: computed group `public`; tag says `group=guards`.  
    Pre-fix: pass tag shape.  
    Post-fix: fail semantic group mismatch.  
    Type: deterministic.  
7. `expected_witness_coverage_accepts_valid_non_propagation_evidence`  
    Purpose: valid tag with evidence records blocks propagation.  
    Fixture: offstage/concealed event; DA/STOBJ/BEL evidence cited.  
    Pre-fix: pass.  
    Post-fix: pass with semantic validator.  
    Type: deterministic.

**P2 production-hardening tests**

1. `record_schema_compliance_rejects_padded_story_ids`  
    Purpose: ensure `PG-0001` does not silently become normal current fixture style if policy is strict.  
    Fixture: PG/CHC/BEL mock with padded IDs.  
    Expected: fail if current contract demands unpadded.  
    Type: schema/fixture-golden.  
2. `current_docs_do_not_cite_archive_as_authority`  
    Purpose: scan current docs/README/skills for `archive/` references lacking historical caveat.  
    Fixture: docs corpus.  
    Expected: `tools/validators/README.md` fails pre-fix; passes after wording replacement.  
    Type: deterministic doc lint.  
3. `describe_capabilities_allocator_wording_unpadded_snapshot`  
    Purpose: lock F6.  
    Fixture: source-level server capability creation.  
    Expected: description contains `<CLASS>-1`, not `<CLASS>-0001`.  
    Type: snapshot/unit.  
4. `describe_envelope_schema_create_bel_record_full_schema_snapshot`  
    Purpose: lock F7.  
    Fixture: existing describe-envelope test.  
    Expected: referenced BEL schema required fields visible.  
    Type: fixture-golden.  
5. `get_context_packet_ignores_pg_bel_se_seed_nodes`  
    Purpose: expand F3 seed misuse tests beyond SF/STENT.  
    Fixture: seed nodes `PG-1`, `BEL-1`, `SE-1`.  
    Expected: warning and no local-authority world-scope contamination.  
    Type: integration.

**Optional research-inspired tests**

1. `replay_transcript_skein_pg_state_is_stable`  
    Purpose: verify PG/SE replay remains stable across prose attach failures.  
    Inspired by IF transcript regression testing.  
    Type: fixture-golden.  
2. `state_tracking_qa_retrieves_required_slices_before_answer`  
    Purpose: when `get_records` or context packet returns `persisted_with_summary`, consuming skill must retrieve required slices.  
    Type: integration/judgment-assisted.

---

### **12. Research synthesis**

| Source | What it suggests | Adopt/adapt/reject/note | Worldloom fit |
| ----- | ----- | ----- | ----- |
| Riedl & Young’s IPOCL narrative planning work emphasizes causal coherence and character intentionality in generated narratives. | Causal/intention coherence should be testable, not left to vibes. | **Adapt** | Implement `causal_dependency_threat_scan` as a validator over existing state. Reject global narrative planning or target endings. |
| SCORE models dynamic story state and uses retrieval/state tracking to reduce long-story inconsistency. | Long interactive stories need explicit state tracking and retrieval checks. | **Adapt** | Add retrieval/replay tests for persisted summaries and required slices. Fits PG/SE authority; does not make prose state. |
| Khatun & Brown argue fictional-world generation struggles with consistency, motivating explicit world/state representation. | Externalized world/story state beats hidden model memory. | **Already implemented / note** | Worldloom already externalizes canon, story state, BEL/SF/STSTAT, and forbids hidden LLM memory as state. |
| KG-assisted storytelling research reports gains from graph-structured narrative knowledge and user-controllable references. | Knowledge-graph retrieval is useful when it constrains generation and validation. | **Already implemented / adapt** | Worldloom already has indexed records and graph retrieval. Adapt only into tests proving context packets include governing records. |
| Storyteller/NEKG-style systems use structured event/action representations for story generation. | Event triples can help consistency checks. | **Note only / partial reject** | Do not add SVO plot-node schemas. If useful, derive temporary event signatures inside validators only. |
| Façade-style interactive drama uses a drama manager and dramatic progression controls. | Drama managers can shape interactive experience. | **Reject** | Violates Worldloom’s no global drama manager, no act structure, no fixed ending, and no plot rails. |
| Inform’s transcript/skein tradition supports replaying interactive paths and comparing expected output. | Regression transcripts are valuable for interactive fiction. | **Adapt** | Use PG/SE replay and prose receipts as test artifacts, but keep prose non-authoritative. |

Accepted research transfer is narrow: **validators, replay tests, retrieval-slice tests, and capability parity checks**. No new narrative-shape fields are justified.

---

### **13. Anti-recommendations**

* **Do not add a drama manager.** It would optimize global narrative shape instead of local causal state.  
* **Do not add act, midpoint, climax, or ending fields.** The current foundations explicitly reject them.  
* **Do not make prose authoritative.** Prose can be audited against state, but PG/SE/story records remain the source of truth.  
* **Do not add witness schema fields yet.** The witness gap can be closed by computing over existing SE/BEL/STSTAT/location/artifact records.  
* **Do not add causal-dependency fields yet.** The causal gap can be closed by a validator over existing dependencies.  
* **Do not auto-promote branch-local truth into world canon.** The existing promotion chain is correct.  
* **Do not use archive specs as current authority.** Archive can be prior art only.  
* **Do not solve fixture drift by making padded IDs acceptable.** Replace fixtures with unpadded IDs unless testing legacy rejection.

---

### **14. Tenth-iteration carryover, if any**

1. **Runtime/deployed MCP verification remains open.** I inspected source but did not invoke a running MCP server. The next audit should call `describe_capabilities`, `describe_envelope_schema(create_bel_record)`, and a validator-bearing `validate_patch_plan` against the actual deployed/runtime server.  
2. **Generated `dist/` freshness remains open.** I inspected TypeScript/source and package scripts but did not execute builds or compare generated artifacts.  
3. **Full repo-wide archive-excluded grep remains open.** GitHub search was used, but it cannot guarantee a true `archive/` exclusion. I manually rejected archive hits; a cloned local grep would give stronger negative evidence if explicitly authorized.  
4. **Full fixture corpus cleanup remains open.** Targeted current tests still contain padded mock IDs. A tenth pass should run a complete non-archived scan for `-[0]{2,}d+`, `derived_from_cf`, `world_ent_id`, `storylet_realized`, `chosen_choice_id`, `arc_contract`, `dramatic_unit`, `execution_envelope`, and `stop_policy`, then classify every hit.

