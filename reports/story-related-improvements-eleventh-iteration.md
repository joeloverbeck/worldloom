### **1. Executive verdict**

Worldloom’s current story-related system is **basically sound**, **not architecturally broken**, and **much stronger than the tenth-iteration baseline**. The three post-tenth fixes I could verify in current non-archived source are real: proposal-package shape validation landed, expected-witness coverage now has real direct-witness plus public/factional DA indirect-propagation checks, and MCP capability/build fingerprinting is source/test-backed. The remaining problems are narrower: **validator severity discipline, indirect social-propagation edge coverage, direct-write markdown/hash enforcement, and deployed/runtime capability verification**.

Blunt verdict by axis:

| Axis | Verdict |
| ----- | ----- |
| Architecture | Basically sound. Do not redesign it. |
| Schemas | Mostly right; avoid adding fields. |
| Validators | Stronger, but still has two material hardening gaps. |
| Tests | Good on recent tickets; adversarial breadth still thin. |
| Skill wording | Mostly aligned with FOUNDATIONS. |
| Retrieval/MCP | Strong source design; deployed behavior unverified. |
| Patch-engine | Sound in inspected source. |
| Hooks | Good for `_source/*.yaml`; markdown/hash surfaces need tighter guardrails. |
| Deployment/capability currency | Source/test-backed, **runtime/deployed-unverified**. |
| Generated/dist discipline | Not verifiable from current repo artifacts. |
| Research alignment | Good: research supports tests/retrieval/validators, not schema bloat. |

Confidence:

| Area | Confidence |
| ----- | ----- |
| Repo-source confidence | **High** for inspected current non-archived files. |
| Implementation confidence | **High** for validators/MCP/patch-engine source inspected. |
| Test confidence | **Medium-high** for recent fixes; **medium** for wider red-team fixtures. |
| Runtime/deployed-capability confidence | **Low** because no deployed MCP server was invoked. |
| Research-transfer confidence | **Medium-high**: the safe transfer path is test/evaluation/retrieval hardening. |

The audit brief came from the uploaded prompt.

---

### **2. Repository access and inspected-source inventory**

Repository inspected: **`joeloverbeck/worldloom`**.

Branch/ref/commit inspected: **`main` at `2298be50e1331db5c80454f53764bdff78c1768e`**.

Access method: **connected GitHub/code-search integration** through the available GitHub tool. I did **not** clone the repo.

Clone status: **No clone**. Reason: connected GitHub/code-search and targeted file fetches worked, and the prompt explicitly preferred connected GitHub/code-search access.

Runtime/deployed MCP tools invoked: **No**. This audit inspected source/tests/docs only. I do **not** claim deployed MCP behavior.

Generated `dist/` inspected or compared: **No**. I inspected TypeScript/source and tests. `dist/`/generated runtime parity remains unverified in this session.

Archive exclusion: the search tool could not reliably hard-exclude `archive/`. I manually classified archive hits as historical/non-current and did not use them as current authority. Several broad searches returned archive tickets/specs; those were treated as discovery noise, not evidence.

Search strategy used: targeted fetches of authority docs/skills/source/tests at `main`, plus broad code-search clusters for proposal-package validation, expected-witness coverage, capability fingerprints, validator registry, story-state validators, MCP/retrieval tools, patch-engine ops, stale forbidden concepts, and archive leakage. One early broad search appeared indexed against an older commit, so search results were used for discovery only; all cited authoritative evidence below is from targeted current-file fetches at `main`.

Current authority docs inspected:

| Artifact | Status |
| ----- | ----- |
| `docs/FOUNDATIONS.md` | Present and inspected. |
| `.claude/skills/_shared-templates/story-state-contract.md` | Present and inspected. |
| `.claude/skills/_shared-templates/story-record-schemas.md` | Present and inspected; current schema authority is split here. |
| `.claude/skills/_shared-templates/persisted-packet-recovery.md` | Present and inspected. |
| `docs/CONTEXT-PACKET-CONTRACT.md` | Present and inspected. |
| `docs/HARD-GATE-DISCIPLINE.md` | Present and inspected. |
| `docs/MACHINE-FACING-LAYER.md` | Present and inspected. |

Seven story-pipeline skills inspected:

| Skill | Current path |
| ----- | ----- |
| `branching-story-bootstrap` | `.claude/skills/branching-story-bootstrap/SKILL.md` |
| `branching-story-turn-cycle` | `.claude/skills/branching-story-turn-cycle/SKILL.md` |
| `branching-story-prose-attach` | `.claude/skills/branching-story-prose-attach/SKILL.md` |
| `commitment-block-authoring` | `.claude/skills/commitment-block-authoring/SKILL.md` |
| `branching-story-health-audit` | `.claude/skills/branching-story-health-audit/SKILL.md` |
| `story-fact-promotion-to-canon` | `.claude/skills/story-fact-promotion-to-canon/SKILL.md` |
| `story-promotion-closeout` | `.claude/skills/story-promotion-closeout/SKILL.md` |

Current non-archived implementation/test surfaces inspected:

| Area | Files inspected |
| ----- | ----- |
| Proposal package validation | `tools/validators/src/structural/proposal-package-shape.ts`; `tools/validators/tests/structural/proposal-package-shape.test.ts` |
| Expected witness / social propagation | `tools/validators/src/structural/expected-witness-coverage.ts`; `tools/validators/tests/structural/expected-witness-coverage.test.ts`; `tools/validators/src/structural/non-propagation-tag-shape.ts`; `tools/validators/tests/structural/non-propagation-tag-shape.test.ts` |
| Validator registry | `tools/validators/src/public/registry.ts`; `tools/validators/tests/structural/registry.test.ts` |
| Capability/build currency | `tools/world-mcp/src/build-info.ts`; `tools/world-mcp/src/tools/describe-capabilities.ts`; `tools/world-mcp/tests/tools/describe-capabilities.test.ts`; `tools/world-mcp/tests/server/capability-parity.test.ts`; `tools/world-mcp/tests/server/dispatch.test.ts` |
| MCP retrieval/context | `tools/world-mcp/src/tool-names.ts`; `tools/world-mcp/src/server.ts`; `tools/world-mcp/src/tools/get-context-packet.ts`; `tools/world-mcp/src/tools/describe-envelope-schema.ts`; related schema tests |
| Patch-engine | `tools/patch-engine/src/envelope/schema.ts`; `tools/patch-engine/src/apply.ts`; `tools/patch-engine/src/commit/order.ts`; `tools/patch-engine/src/ops/create-story-record.ts` |
| Core story validators | `causal-dependency-threat-scan.ts`, `observer-firewall.ts`, `branch-isolation.ts`, `canon-baseline-drift.ts`, `snapshot-replay-equality.ts`, and related tests |
| Hooks | `tools/hooks/README.md`; `.claude/settings.json.example`; `tools/hooks/src/hook3-guard-direct-edit.ts` |
| Current prior-art note | `reports/story-related-improvements-tenth-iteration.md` inspected as prior art only, not current authority. |

Repo areas not inspectable through available tools: deployed/running MCP server, actual user-local hook installation, untracked/generated `dist/`, exhaustive current fixture corpus execution, and true archive-excluded grep.

---

### **3. Current authority extraction**

Binding authority order used:

1. `docs/FOUNDATIONS.md`  
2. `.claude/skills/_shared-templates/story-state-contract.md`  
3. `docs/CONTEXT-PACKET-CONTRACT.md`  
4. `docs/HARD-GATE-DISCIPLINE.md`  
5. `docs/MACHINE-FACING-LAYER.md`  
6. Current non-archived source  
7. Current tests/fixtures/implementation notes  
8. Prior audits/reports as prior art  
9. Archived files as historical context only

Binding rules relevant to this eleventh audit:

| Rule | Current extraction |
| ----- | ----- |
| PG/prose authority | PG/page plan is authoritative; prose is a receipt and cannot mutate story state. |
| Present-causal-state | Current causal state, active records, commitments, choices, and replayable deltas matter more than global plot design. |
| Forbidden narrative machinery | No act structure, midpoint/climax tracking, global drama manager, fixed ending, plot rails, forced reconvergence, or word-count target pacing. |
| Story/world separation | Story-local SF/BEL/STSTAT/PG/SE state remains separate from world canon. |
| Canon promotion | Only `story-fact-promotion-to-canon` → `canon-addition` → `story-promotion-closeout` may move story-local claims toward world canon. |
| BEL/SF/STSTAT | BEL records belief/claims/knowledge/lies; SF records branch-local truth; STSTAT drives replayable life/agency/location and derived `entity_status`. |
| Mystery firewall | Mystery Reserve is protected against both direct resolution and cumulative narrowing. |
| HARD-GATE | Approval-token + patch-engine routing must not be bypassed for protected record writes. |
| Schema-minimalism | Add fields only with a named mechanical consumer; prefer validators, retrieval checks, tests, and replay harnesses. |
| Retrieval discipline | Persisted summaries are not sufficient; skills must retrieve load-bearing slices before acting. |
| Archive discipline | `archive/` is not current authority. |

Evidence: FOUNDATIONS preserves story/world separation, promotion routing, prose receipt discipline, no plot rails/no act structure, BEL/SF/STSTAT separation, and schema-minimalism. The shared story contract reiterates authority order, story-record schemas, patch write order, predicate DSL, and mystery/canon authority. The current schema template defines BEL, PG, SE, SF, SLT, DA, CHC, STSTAT, and prose receipt contracts.

---

### **4. Post-tenth implementation reconciliation**

| Tenth / ticketed issue | Current status | Evidence | Remaining work | Regression risk |
| ----- | ----- | ----- | ----- | ----- |
| Ticket 1: `proposal_package_shape` candidate purity and safety-block validation | **Fixed and test-backed** | Validator rejects promotion-only/non-CF fields inside `candidate`, requires top-level `proposal_evidence`, checks mystery-resolution source classes, and requires epistemic/exception governance safety blocks when CF type requires them. Tests cover impurity, accepted split evidence, mystery source misclass, missing evidence, missing safety blocks, and thin `n_a`. | Add one integration fixture through promotion skill + validator bundle, not a schema change. | Low. |
| Ticket 2: `expected_witness_coverage` direct witness coverage | **Fixed and test-backed** | Source computes direct witnesses using STSTAT/STLOC/STENT location/status and BEL coverage. Tests cover missing public BEL, wrong group label, partial coverage, valid BEL coverage, concealed-location no-trigger, and scoping. | Keep adversarial fixtures. | Low. |
| Ticket 2: indirect social propagation through DA/document/artifact evidence | **Partially fixed** | Source mechanizes public/factional DA propagation via BEL `basis.access_records[]` and allowed access routes, or parseable `event_leaves_no_accessible_trace` tag. Tests cover public/factional DA with/without BEL and non-propagation. | Broader institution/location/rumor/trace routes remain only partially mechanized. | Medium. |
| Ticket 2: social non-propagation tag syntax | **Partially fixed** | `non_propagation_tag_shape` parses closed reasons and rejects missing tag prose, but malformed tag candidates are warnings, not failures. | Make malformed tags fail when used in validator-relevant SE rationale. | Medium-high. |
| Ticket 3: `describe_capabilities` build/capability hash currency | **Fixed in source/tests; runtime/deployed-unverified** | Build info computes git/build/schema/validator/patch hashes; `describe_capabilities` returns them; parity tests compare registry and operation schema hashes. | Add deployed/server smoke test invoking the built server process. | Medium. |
| Validator registry / dispatch | **Fixed and test-backed** | Registry includes current validators including `proposal_package_shape`, `expected_witness_coverage`, `causal_dependency_threat_scan`, `observer_firewall`, `branch_isolation`, `canon_baseline_drift`, `snapshot_replay_equality`, and `non_propagation_tag_shape`. | Keep exact registry tests. | Low. |
| `causal_dependency_threat_scan` | **Fixed and test-backed** | Source checks choice, affordance, obligation, and high-salience SLT dependency threats. | Add more death/incapacity fixtures. | Low-medium. |
| Observer firewall current-choice resolution | **Fixed and test-backed** | Source resolves child-page selected choices and actor alias bindings; tests cover actor BEL access, private BEL leakage, SF access via BEL, and selected child page choices. | None for original bug. | Low. |
| Branch isolation unpadded root/genesis handling | **Fixed and test-backed** | Source recognizes root/genesis pages and allows bundle-genesis records; tests cover unpadded BEL-1 and reject sibling leakage. | Keep fixture lint. | Low. |
| Story-local context-packet seed filtering/rerouting | **Fixed but undertested from inspected evidence** | `get_context_packet` filters story-local seed nodes for story-pipeline task types and appends `story_local_seed_nodes_ignored`. | Add explicit retrieval tests for PG/BEL/SE/DA story-local seeds. | Medium-low. |
| `allocate_next_id` unpadded capability wording | **Fixed in source/tests; runtime-unverified** | MCP server description states story-bundle classes return unpadded natural-integer IDs; dispatch tests cover unpadded story IDs. | Runtime smoke. | Medium only for deployed drift. |
| `describe_envelope_schema(create_bel_record)` full BEL schema exposure | **Fixed and test-backed** | Envelope schema maps `create_bel_record` to story BEL schema; tests cover full BEL wrapper schema. | Runtime smoke. | Medium only for deployed drift. |
| Retired fixture fields / padded IDs | **Mostly fixed; exhaustive fixture pass not run** | Current story ops and tests use unpadded ID patterns. | Add repo-wide fixture lint excluding `archive/`. | Medium. |
| Archive-reference cleanup | **No active authority leakage found in inspected authority docs/skills** | Archive hits appeared in search, but current authority files inspected were non-archived. | Add CI grep so this stays true. | Medium because search cannot hard-exclude archive. |

---

### **5. Current architecture and enforcement map**

| Mechanism | Current enforcement |
| ----- | ----- |
| PG / SE / page plan / prose receipt authority | `story-record-schemas.md` defines PG/SE/prose receipt, snapshot hash, plan hash, audit-only SE semantics, and prose receipt non-authority. |
| BEL / SF / STSTAT separation | BEL schema separates beliefs/claims/lies; SF schema separates branch-local truth; STSTAT is active status, agency, life, and location source. |
| Storylet/choice/branch handling | SLT schema is causal-move based, forbids act/arc/stop-policy fields, and uses closed predicate DSL; branch isolation blocks sibling leakage and global-author-pool branch-local dependencies. |
| Mystery Reserve firewall | Shared contract and promotion skill require whole-class M retrieval and forbid direct/collapsing resolutions without user-facing promotion/adjudication. |
| Story-fact promotion path | Promotion skill writes proposal package only; closeout verifies linked CF/CH/PA outputs through MCP before story-local closeout. |
| Patch-engine write path | Patch submit validates envelope, verifies approval token, checks allocation race/stale index, runs validators, stages temp writes, commits atomically, consumes token, and syncs index. |
| Story-bundle patch ops | Patch engine includes `create_pg_record`, `create_se_record`, `create_bel_record`, `create_ststat_record`, `create_slt_record`, `create_chc_record`, and `append_story_diegetic_artifact_record`. |
| MCP retrieval/context | MCP registers `get_context_packet`, `get_record(s)`, field projections, persisted slice retrieval, firewall content, named entities, envelope schema, capabilities, validation, submit, and ID allocation. |
| Direct-write markdown surfaces | Hook 3 blocks `_source/*.yaml` direct edits but intentionally allows story markdown surfaces; skills carry hash/order obligations. |
| Runtime/deployed capability checks | Source exposes hashes and tests parity in memory; no actual deployed server was invoked in this audit. |

---

### **6. Regression audit**

| Category | Result |
| ----- | ----- |
| Verified implementation drift | No regression found in the three recent fix surfaces. The old tenth-report active items are mostly fixed in current source. |
| Doc-only drift | No inspected authority doc currently contradicts the implemented fixes. |
| Test-only drift | Tests are good for target bugs, but broader adversarial social-propagation and runtime/deployed smoke tests remain thin. |
| Fixture/migration drift | Not exhaustively verified. Current source/tests support unpadded IDs, but full fixture corpus lint was not run. |
| Generated/deployed drift | **Unverified.** Source computes fingerprints; parity tests exist; actual deployed MCP server was not invoked. |
| Archived-source leakage | Search returned archive hits, but no inspected current authority file depended on archive as current authority. |
| Source unavailable / unverifiable risk | Running server, generated `dist`, local hook installation, and exhaustive fixtures remain outside verified scope. |

No evidence showed that the recent fixes introduced schema/tooling mismatch, duplicate names, stale aliases, validator registration drift, source/test mismatch, or overbroad drama-manager-style narrative machinery.

---

### **7. What should not change**

Keep the architecture. The architecture is not the problem.

Do **not** add:

| Rejected change | Why it is wrong |
| ----- | ----- |
| Act/midpoint/climax fields | Violates FOUNDATIONS and turns local causal play into plot management. |
| Global drama manager | Would optimize for shape, not present causal state. |
| Target-ending optimization | Violates no fixed endings/no plot rails. |
| Automatic branch reconvergence | Destroys branch-local truth. |
| Word-count targets | Current prose discipline forbids word count as pacing control. |
| Prose-as-state | Would break PG/SE authority. |
| Hidden LLM memory as state | Would make replay/audit impossible. |
| Autonomous NPC simulation that mutates PG/SE | Bypasses HARD-GATE, patch-engine, and approval-token discipline. |
| New social-propagation schema fields without consumers | Existing BEL/DA/STSTAT/SE/BEL.basis routes are enough for the current gaps. |

The next improvements should be **validators, tests, runtime smoke checks, and hash/retrieval guards**, not new narrative ontology.

---

### **8. Red-team support matrix**

| Failure mode | Classification | Exact mechanism |
| ----- | ----- | ----- |
| Player kills or incapacitates a major actor early | Handled but undertested | STSTAT + `snapshot_replay_equality`; `causal_dependency_threat_scan` obligation-counterparty checks. |
| Player refuses the premise | Handled | No plot rails/fixed endings; turn-cycle routes refusal through SE/PG instead of forcing premise. |
| Player abandons current thread | Handled but undertested | OBL/CNSQ/THR debt health in health-audit skill. |
| Player lies publicly | Handled | BEL stores false/deceptive claims; `lie_promoted_silently` registered. |
| Player acts on unavailable information | Handled | `observer_firewall`. |
| Player attempts something impossible | Handled but undertested | Turn-cycle accommodates/refuses through SE outcome and page plan, not prose-only denial. |
| Player discovers or appears to discover protected mystery | Handled / judgment-assisted | Mystery firewall in contract, turn-cycle, prose attach, promotion skill. |
| Cumulative mystery narrowing collapses protected mystery | Partially handled | Health audit has accretion procedure; deterministic proof depends on schema-backed M policy or judgment-assisted review. |
| Player creates branch-local counterfactual | Handled | SF authority + branch-local/counterfactual promotion controls. |
| Rendered prose invents a structural fact | Handled / judgment-assisted | Prose attach receipt checks; prose never mutates PG/SE. |
| Canon changes after pages committed | Handled | `canon_baseline_drift` loads CH-window and affected CF traversal. |
| Story-local claim proposed for canon promotion | Handled | `story-fact-promotion-to-canon`; `proposal_package_shape`. |
| Sibling branches contradict one another | Handled | `branch_isolation`. |
| Sibling story bundles contradict one another | Judgment-assisted | Health-audit `cross_story` mode; no fully deterministic cross-story validator verified. |
| Social consequences propagate through witnesses, rumors, institutions, artifacts, documents, locations, traces, misunderstandings | Partially handled | Direct witnesses and public/factional DA indirect propagation handled; broader routes remain active finding F-02. |
| Expected social propagation does not occur | Partially handled | `expected_witness_coverage` catches direct and DA-indirect omissions. |
| Branch-local records leak into global author-pool storylets | Handled | `branch_isolation` global storylet branch-local dependency check. |
| Storylet alias binding fails or binds wrong record | Handled but undertested | Predicate DSL + observer firewall + SLT validation discipline. |
| Page snapshot replay diverges from SE deltas | Handled | `snapshot_replay_equality`. |
| Terminal branch leaves unresolved debts without proof | Handled but undertested | Health-audit continuation/terminal proof. |
| Accepted choices are cosmetic | Handled | `choice_set_noncollapse` / health-audit choice consequence integrity. |
| Non-terminal leaf becomes unactionable | Handled but undertested | Health-audit unactionable leaf and SLT eligibility checks. |
| Prose receipt fails but turn-cycle continues correctly from PG state | Handled | Prose attach is receipt-only; PG remains authority. |
| Promotion closeout records fake/unresolved canon-addition outputs | Handled | Closeout verifies linked CF/CH/PA through MCP before writing. |
| Context packet omits governing records/story-bundle context | Handled but undertested | Context packet contract + required classes + persisted slice recovery. |
| Patch-engine schemas permit records docs forbid or reject records docs require | Handled in inspected ops | Envelope schema + `describe_envelope_schema` + patch op specs. |
| Persisted packet or `get_records` summary returned but consuming skill fails to retrieve slices | Handled by docs; source-consumption runtime unverified | Persisted-packet recovery template requires retrieving load-bearing slices. |
| Schema discovery or deployed MCP capability surface stale relative to source | Source-handled; runtime-unverified | `describe_capabilities` build hashes + parity tests; deployed server not invoked. |
| Validator bundle in running MCP server stale relative to rebuilt source | Source-test handled; runtime-unverified | Dispatch tests include stale-validator failure language; actual deployment not invoked. |
| Page-plan direct write succeeds but bytes no longer match `PG.plan.plan_hash` | Partially handled | Skills/hash tooling detect; direct markdown write path lacks verified hook-level block. Active finding F-03. |
| Audit-only SE events accidentally enter page replay | Handled | `snapshot_replay_equality` treats audit-only events as no-op unless improperly page-resolved. |
| BEL/SF separation collapses because lie/rumor/contested claim becomes SF | Handled | `lie_promoted_silently`; SF authority rules. |
| STSTAT-derived `entity_status` diverges from active status records | Handled | `snapshot_replay_equality` derives `entity_status` from STSTAT and tests drift. |
| Social non-propagation tags malformed/unparseable/accepted without evidence records | Partially handled | Syntax validator warns malformed tags; active finding F-01. |
| Canon-baseline drift uses only latest CH instead of full window | Handled | `canon_baseline_drift` uses change window and affected_fact_ids. |
| Current docs/skills/tests cite archived files as current authority | Not found in inspected authority files | Search returned archive hits, manually rejected; add CI grep. |
| Generated `dist` or deployed capability docs stale relative to source | Runtime/deployed-unverified | Source parity exists; `dist` not inspected. Active finding F-04. |

---

### **9. Active findings**

#### **F-01 — P1 — Malformed `non_propagation:` tags are warnings, not hard failures**

| Field | Detail |
| ----- | ----- |
| Affected files | `tools/validators/src/structural/non-propagation-tag-shape.ts`; `tools/validators/tests/structural/non-propagation-tag-shape.test.ts` |
| Affected validator | `non_propagation_tag_shape` |
| Exact problem | The validator has `severity_mode: "fail"` but malformed tag candidates are emitted as `severity: "warn"`. Tests currently assert this warning behavior. |
| Evidence type | Code-level + test-level. |
| Why it matters in play | A malformed non-propagation tag can look like an intentional social-propagation exemption while being unparseable by the witness validator. That is exactly the kind of “paperwork says covered, machine can’t read it” failure that causes social consequences to vanish. |
| Issue type | Missing validation / validator severity drift. |
| Recommendation | Make malformed `non_propagation:` tags fail in pre-apply/full-world validation when the string appears in `SE.world_logic_rationale`. |
| Mechanical consumer | `expected_witness_coverage` and health-audit witness completeness depend on parseable tags. |
| Schema change required? | No. |
| Validator/test change required? | Yes. |
| MCP/patch-engine/hook change required? | No. |
| Migration/fixture impact | Update fixtures/tests expecting warning. |
| Deterministic vs judgment-assisted | Deterministic. |
| Confidence | High. |

#### **F-02 — P1 — Indirect social propagation is still too narrow outside public/factional DA routes**

| Field | Detail |
| ----- | ----- |
| Affected files | `tools/validators/src/structural/expected-witness-coverage.ts`; `tools/validators/tests/structural/expected-witness-coverage.test.ts`; `.claude/skills/branching-story-health-audit/SKILL.md` |
| Affected validator | `expected_witness_coverage` |
| Exact problem | Current deterministic indirect propagation is largely public/factional DA-centered: DA creation with `circulation ∈ {public,factional}` requires same-SE BEL via DA access record or parseable non-propagation. Broader routes named in skills—law, ritual, bureaucracy, public violence, visible environmental change, location traces, rumor, institutional channel, misunderstanding—are only partially mechanized. |
| Evidence type | Code-level + test-level + skill-level. |
| Why it matters in play | Public acts can fail to produce public/institutional consequences unless they happen to create a DA. That weakens the social fabric of branching play after betrayal, violence, ritual, legal action, public lies, or visible environmental change. |
| Issue type | Missing validation / implementation-test gap. |
| Recommendation | Do not add fields. Add deterministic checks only where current records already encode evidence: BEL `basis.access_route`, BEL `basis.access_records`, DA/STOBJ/STLOC evidence, and public/shared visibility. For non-mechanizable cases, add health-audit judgment-assisted fixtures that explicitly classify “not mechanized” instead of silently passing. |
| Mechanical consumer | `expected_witness_coverage`, `branching-story-health-audit` Phase 2d, turn-cycle witness propagation. |
| Schema change required? | No. |
| Validator/test change required? | Yes. |
| MCP/patch-engine/hook change required? | No. |
| Migration/fixture impact | Add adversarial SE/BEL/DA/STLOC/STOBJ fixtures. |
| Deterministic vs judgment-assisted | Mixed: deterministic for existing encoded routes; judgment-assisted for narrative-only routes. |
| Confidence | High for narrow implementation; medium for full desired propagation set. |

#### **F-03 — P2 — Direct-write markdown hash/order discipline is skill-enforced, not hook-enforced**

| Field | Detail |
| ----- | ----- |
| Affected files | `.claude/skills/_shared-templates/story-state-contract.md`; `.claude/skills/branching-story-prose-attach/SKILL.md`; `tools/hooks/src/hook3-guard-direct-edit.ts`; `tools/hooks/README.md` |
| Affected surfaces | `pages-prose-plans/PG-*.md`, `pages-prose/PG-*.md`, `pages-prose-receipts/PG-*.yaml`, bundle `INDEX.md` |
| Exact problem | Current Hook 3 blocks `_source/*.yaml` direct writes but intentionally allows story markdown surfaces. Skills require post-write plan hash verification before INDEX update, and prose attach checks plan/prose integrity, but I did not find a hook-level block that prevents a direct markdown plan write followed by INDEX update when bytes no longer match `PG.plan.plan_hash`. |
| Evidence type | Doc-level + hook-code-level. |
| Why it matters in play | PG plan hash is the audit bridge between machine state and rendered/attached prose. If markdown surfaces can drift before INDEX update, later prose/audit can detect it, but the immediate write path is not fail-closed. |
| Issue type | Hook/write-order drift / direct-write markdown hardening. |
| Recommendation | Add a hook or CLI guard for story markdown hash surfaces: any write to `pages-prose-plans/PG-*.md` or bundle `INDEX.md` should run the canonical PG plan hash verifier or refuse the INDEX update until verification passes. |
| Mechanical consumer | PG plan hash, prose attach, health audit, replay/audit reproducibility. |
| Schema change required? | No. |
| Validator/test change required? | Yes. |
| MCP/patch-engine/hook change required? | Hook or CLI required. |
| Migration/fixture impact | Add plan-hash mismatch fixture. |
| Deterministic vs judgment-assisted | Deterministic. |
| Confidence | Medium-high. |

#### **F-04 — P2 — Capability currency is source/test-backed but not deployed-runtime proven**

| Field | Detail |
| ----- | ----- |
| Affected files | `tools/world-mcp/src/build-info.ts`; `tools/world-mcp/src/tools/describe-capabilities.ts`; `tools/world-mcp/tests/server/capability-parity.test.ts`; `tools/world-mcp/tests/server/dispatch.test.ts`; `docs/MACHINE-FACING-LAYER.md` |
| Affected MCP tool | `describe_capabilities` |
| Exact problem | Source computes build/schema/validator/patch hashes and in-memory tests compare them, but this audit did not invoke a deployed MCP server or inspect generated `dist`. Therefore source-fixed does not equal deployed-verified. |
| Evidence type | Source/test-level + runtime/deployed-capability limitation. |
| Why it matters in play | A stale running MCP server can accept or miss story validators even when TypeScript source is correct. That is especially dangerous for post-merge validator fixes. |
| Issue type | Rollout/capability drift. |
| Recommendation | Add a deployed/server smoke command that builds, starts the actual MCP server process, invokes `describe_capabilities`, compares `validator_registry_hash` and `patch_operation_schema_hash` to freshly computed source hashes, and submits known-bad patch plans that must fail. |
| Mechanical consumer | Runtime MCP server, HARD-GATE dry-run, patch submit, story skills relying on validator bundle currency. |
| Schema change required? | No. |
| Validator/test change required? | Yes. |
| MCP/patch-engine/hook change required? | MCP test/CI command only. |
| Migration/fixture impact | Add known-bad causal dependency and expected-witness fixtures. |
| Deterministic vs judgment-assisted | Deterministic. |
| Confidence | High that source is fixed; high that runtime was unverified. |

---

### **10. Exact proposed amendments**

| Finding | File / section | Operation | Exact proposed amendment | Downstream impact | Pre-fix failure | Post-fix pass |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| F-01 | `tools/validators/src/structural/non-propagation-tag-shape.ts`, malformed verdict helper | Replace | Change malformed tag verdict severity from `warn` to `fail` for any `non_propagation:` candidate that does not match the closed tag grammar. Keep `expected_witness_tag_malformed` code. | Validator registry unchanged; update test expectation. | Malformed `non_propagation:` string produces warning and can be overlooked. | Malformed tag fails validation. |
| F-01 | `tools/validators/tests/structural/non-propagation-tag-shape.test.ts` | Replace | Rename test from “warns malformed tags” to `rejects malformed non_propagation tags`; expect `severity === "fail"`. | Test update only. | Current expected warning. | Failing pre-apply/full-world result. |
| F-02 | `tools/validators/tests/structural/expected-witness-coverage.test.ts` | Add | Add fixtures for `basis.access_route: institutional_channel`, `rumor`, `location_trace`, `object_trace`, and `document`, using current BEL/DA/STLOC/STOBJ fields only. | Validates existing route vocabulary without schema additions. | Missing BEL for non-DA public route can pass or remain judgment-only. | Encoded route either requires BEL/non-propagation or is explicitly classified judgment-assisted. |
| F-02 | `.claude/skills/branching-story-health-audit/SKILL.md`, Phase 2d | Clarify | Add: “When a propagation route is named in prose/rationale but no DA/STOBJ/STLOC/BEL basis record encodes it, classify as `judgment_assisted_indirect_propagation_unverified`; do not silently treat it as mechanized.” | Health-audit reporting only. | Audit may imply broader mechanization than source provides. | Audit labels deterministic vs judgment-assisted coverage. |
| F-03 | `tools/hooks/src/` | Add | Add a story-markdown hash guard hook or CLI: if write target is `pages-prose-plans/PG-*.md` or bundle `INDEX.md`, verify all indexed PG plan hashes using canonical hash tooling before allowing INDEX update. | Hooks, tests, skill write-order discipline. | Plan bytes drift and INDEX update can proceed until later audit. | INDEX update blocked until plan hashes match. |
| F-03 | `tools/hooks/tests/` | Add | Test `blocks_index_update_when_pg_plan_hash_mismatches`. Fixture: PG has `plan_hash = H1`; plan markdown bytes hash to `H2`; INDEX write attempted. | Hook test. | Write allowed. | Hook fails with hash mismatch. |
| F-04 | `tools/world-mcp/tests/server/` | Add | Add `deployed-process-capability-smoke.test.ts`: build server, spawn actual built MCP process, call `describe_capabilities`, compare hash fields to source compute functions, then validate known-bad causal dependency and expected-witness plans. | CI/runtime confidence. | Source parity passes while deployed bundle could be stale. | Deployed process proves current validators/capabilities. |
| F-04 | `docs/MACHINE-FACING-LAYER.md` | Clarify | Add a required release checklist item: “After build, run deployed MCP process smoke; do not rely on TypeScript in-memory tests alone.” | Deployment discipline. | Developers may assume source test == deployed currency. | Release docs make runtime check mandatory. |

No proposed amendment requires a new schema field.

---

### **11. Cross-skill / code propagation matrix**

| Accepted change | FOUNDATIONS | story-state-contract | persisted-packet-recovery | CONTEXT-PACKET | HARD-GATE | MACHINE-FACING | Bootstrap | Turn-cycle | Prose-attach | Commitment blocks | Health-audit | Promotion | Closeout | MCP retrieval | Patch-engine | Validators | Schemas | Hooks | Tests | Fixtures | Migrations | dist/deployed |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| F-01 malformed non-propagation tags fail | — | — | — | — | — | — | — | ✅ | — | — | ✅ | — | — | — | — | ✅ | — | — | ✅ | ✅ | — | — |
| F-02 indirect propagation route tests/classification | — | Clarify optional if wording overclaims | — | — | — | — | — | ✅ | — | — | ✅ | ✅ for promotion evidence side-effects | — | — | — | ✅ | — | — | ✅ | ✅ | — | — |
| F-03 markdown hash guard | — | ✅ write-order reference | — | — | ✅ optional note | — | ✅ | ✅ | ✅ | — | ✅ | — | ✅ if closeout touches INDEX | — | — | — | — | ✅ | ✅ | ✅ | — | — |
| F-04 deployed MCP capability smoke | — | — | — | — | ✅ optional note | ✅ | — | ✅ dry-run trust | — | ✅ dry-run trust | ✅ validator currency | ✅ dry-run trust | ✅ dry-run trust | ✅ | ✅ indirect | ✅ | — | — | ✅ | ✅ | — | ✅ |

---

### **12. Validator and test plan**

P0 blocking tests: **none newly required**. I found no P0 source-backed corruption bug in current inspected source.

P1 red-team tests:

| Test name | Purpose | Fixture shape | Pre-fix behavior | Post-fix behavior | Type | Likely file |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| `non_propagation_malformed_tag_fails_preapply` | Ensure malformed tags fail, not warn. | SE with `world_logic_rationale: ["non_propagation:bad(group=public records=BEL-1)"]`. | Warning only. | Fail verdict `expected_witness_tag_malformed`. | Deterministic validator | `tools/validators/tests/structural/non-propagation-tag-shape.test.ts` |
| `expected_witness_institutional_channel_requires_bel_or_tag` | Harden non-DA indirect public/institution route where current records encode the route. | SE creates public/institutional consequence plus BEL route missing. | Pass or judgment-only ambiguity. | Fail or explicit judgment-assisted classification. | Deterministic / judgment-assisted split | `expected-witness-coverage.test.ts` |
| `expected_witness_location_trace_requires_evidence_record` | Ensure location traces do not disappear. | SE creates STLOC/STOBJ/DA trace visible to public/faction. | May pass if no DA route. | Requires BEL basis or parseable non-propagation, or audit labels unmechanized. | Deterministic where record-backed | `expected-witness-coverage.test.ts` |
| `proposal_package_safety_blocks_integration` | Prove promotion skill output fails validator when missing epistemic/exception block. | SP proposal package with `candidate.type: technology` and no safety blocks. | Unit test only; integration not guaranteed. | Full patch/validator path fails. | Integration fixture | validator integration tests |

P2 production-hardening tests:

| Test name | Purpose | Fixture shape | Pre-fix behavior | Post-fix behavior | Type | Likely file |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| `story_markdown_plan_hash_hook_blocks_index_update` | Prevent direct markdown drift. | PG plan hash H1, plan file H2, INDEX write. | INDEX write allowed. | Hook blocks. | Hook integration | `tools/hooks/tests/` |
| `deployed_mcp_describe_capabilities_hash_matches_source` | Prove deployed server hash currency. | Built MCP process. | Source tests pass but deployed unverified. | Process returns current hashes. | Runtime integration | `tools/world-mcp/tests/server/` |
| `deployed_mcp_rejects_known_bad_validator_plans` | Detect stale runtime validator bundle. | Known-bad causal-dependency and expected-witness patch plans. | Stale server may pass. | Deployed server fails both. | Runtime integration | `dispatch` or new smoke test |
| `story_local_seed_warning_for_pg_bel_se_da` | Verify rerouting/warning for story-local seeds. | `get_context_packet` story task with PG/BEL/SE/DA seed nodes. | Source code likely works; test coverage not verified. | Warning and filtered seed set asserted. | MCP retrieval test | `get-context-packet.test.ts` |
| `fixture_unpadded_id_lint_current_only` | Catch padded-retired fixture drift. | Current fixtures excluding archive. | Padded IDs may survive unnoticed. | CI fails on `PG-0001`, `CF-0001`, etc. | Fixture lint | validator/tooling tests |
| `current_docs_do_not_cite_archive_as_authority` | Prevent archive leakage. | Grep docs/skills/tests excluding reports/prior art. | Archive authority refs could creep in. | CI fails unless clearly labeled historical. | Static lint | docs tests |

Optional research-inspired tests:

| Test name | Research lesson | Purpose |
| ----- | ----- | ----- |
| `narrative_qa_state_probe_from_pg_se` | QA-style narrative comprehension | Generate mechanical questions from PG/SE/BEL/STSTAT and verify prose receipts answer them without inventing facts. |
| `salience_starvation_property_window` | Storylet/local salience | Property-test that high-urgency debts cannot be ignored across N pages without rationale. |
| `intent_grounding_for_character_action` | Narrative planning / intentionality | Ensure non-system SE actor actions cite STINT/BEL/OBL/CNSQ/SREL/affordance grounding. |
| `kg_retrieval_context_governing_records` | KG-assisted storytelling | Assert context packet includes governing records for action-oriented changes and persists slices when oversized. |

---

### **13. Research synthesis**

| Source | What it suggests | Adopt / adapt / reject / note | Worldloom fit |
| ----- | ----- | ----- | ----- |
| Emily Short, “Storylets: You Want Them” | Storylets are flexible narrative units with prerequisites and effects; they support salience-based/content-recombinant structures better than brittle exhaustive branching. | **Already implemented / adapt** | Worldloom’s SLT causal-move model matches this. Adapt only by adding salience starvation tests; do not add act structure. |
| Riedl & Young, IPOCL narrative planning | Narrative comprehension depends on causal progression and character intentionality; IPOCL explicitly links actions to intentions/goals. | **Adapt** | Fits as validator/audit pressure: require actor actions to cite STINT/BEL/OBL/CNSQ/SREL/affordance grounding. Reject target-ending planning. |
| Baral et al., multi-agent action language | Multi-agent actions can change world state and agents’ knowledge/beliefs; awareness can be full, partial, or absent. | **Adapt** | Directly supports BEL/SF separation and witness/non-propagation validators. No new schema needed; improve propagation tests. |
| Inform 7 documentation on world creation/actions | IF separates initial world assertions, rules of play, and stored actions; actions need actor/noun/target detail to replay/inspect later. | **Already implemented / adapt** | Supports PG/SE/STSTAT replay and explicit action envelopes. Add replay fixtures for impossible write-ins and death/incapacity reconciliation. |
| Park et al., Generative Agents | Believable social behavior benefits from observation, planning, reflection, and memory retrieval, but their architecture stores natural-language memories and autonomous agent behavior. | **Reject core autonomy; adapt tests** | Reject hidden LLM memory/autonomous mutation. Adapt only the evaluation idea: check explicit BEL/STINT/STSTAT records and retrieval, not hidden memory. |
| SCORE, Story Coherence and Retrieval Enhancement | Long-form LLM stories benefit from dynamic state tracking, episode summaries, and retrieval-based consistency checking. | **Adapt** | Worldloom already has symbolic state and persisted packets. Add QA/retrieval probes; do not make summaries authoritative. |
| KG-assisted storytelling | Editable knowledge graphs can improve action-oriented narrative quality and user control, but benefits are setting-dependent. | **Already implemented / adapt** | Worldloom’s graph/index/MCP retrieval already fits. Add context-packet governing-record tests; do not let KG edits bypass patch engine. |
| FairytaleQA | Fine-grained narrative QA can assess explicit and implicit story comprehension across relations and narrative elements. | **Adapt** | Use generated QA probes as judgment-assisted audit checks against PG/SE/prose receipts; do not let QA output mutate state. |
| Re3 | Repeatedly injecting current story state into generation improves coherence, but it uses overarching plans. | **Reject overarching-plan dependency; adapt state injection** | Keep context-packet retrieval and current state injection; reject global plan/target-ending optimization. |

Foundation filter for every “adapt” above: no act structure, no fixed endings, no global drama manager, no prose-as-state, no world-canon mutation, no hidden memory, no Mystery Reserve weakening, no schema fields without consumers. The concrete transfer is tests, validators, retrieval checks, and audit probes.

---

### **14. Anti-recommendations**

| Rejected idea | Why rejected |
| ----- | ----- |
| Add `act`, `beat_phase`, `midpoint`, or `climax` fields | Violates FOUNDATIONS; no mechanical consumer compatible with present-causal-state discipline. |
| Add a global drama manager to choose “best” plot direction | Would replace local salience with plot optimization. |
| Add target-ending fields or convergence goals | Violates fixed-ending and reconvergence prohibitions. |
| Let prose attach modify PG/SE when prose reveals “better” facts | Breaks PG/page-plan authority and replay. |
| Store hidden LLM/NPC memories as implicit state | Unreplayable and unauditable; BEL/STINT/STSTAT already provide explicit state. |
| Autonomous NPC simulation that writes records without HARD-GATE | Bypasses approval-token and patch-engine discipline. |
| Add new witness-propagation schema fields | Current BEL.basis, DA/STLOC/STOBJ evidence, STSTAT location, and SE rationale are enough; the gap is validation/testing. |
| Treat archive tickets/specs as current authority | Archive is historical only. |
| Use word-count targets for pacing | Explicitly forbidden; use causal salience and choice pressure instead. |

---

### **15. Eleventh-iteration carryover, if any**

Carryover is limited and specific:

1. **Runtime/deployed MCP verification remains unperformed.** Source tests are strong, but I did not invoke a deployed MCP server or inspect built `dist`. Treat capability currency as source-fixed but runtime/deployed-unverified.  
2. **Generated `dist/` parity remains unverified.** The audit used current TypeScript/source and tests.  
3. **Exhaustive current fixture lint was not run.** I inspected representative validator tests and source, not every non-archived fixture/golden/migration.  
4. **True archive-excluded search was not available.** I manually classified archive hits, but a CI grep would be better.  
5. **Broader indirect propagation remains the main story-robustness carryover.** Direct witnesses and DA-based public/factional propagation are implemented. Institution/rumor/location/trace/misunderstanding cases need conservative tests and explicit judgment-assisted classification, not new schema.

