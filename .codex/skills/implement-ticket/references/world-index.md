# World-Index Ticket Checks

Use these focused checks for `world-index`, index-backed build/sync/verify, and atomic-source parser tickets. They supplement the main implement-ticket workflow.

## Reassessment

- For `world-index` content tickets that mention adjudication YAML placement or `unexpected_yaml_section`, inspect `tools/world-index/src/parse/yaml.ts` before trusting any ticket claim about a canonical adjudication YAML section; the live parser may treat all adjudication fenced YAML as out-of-section.
- For end-to-end tests that copy a live world tree or fixture, inspect copied generated-state directories such as `_index/` before trusting a "fresh build" proof path. Strip or account for inherited generated state so setup drift is not misdiagnosed as current-ticket fallout.
- For cleanup/removal tickets, separate parser utility deletion from dispatch/mode removal. A ticket can remove legacy world-build activation while retaining markdown/YAML parser utilities, fixtures, or tests that still exercise hybrid documents or direct parser contracts.
- For staged tool/schema tickets whose public API is world-agnostic but helper code is world-scoped, verify whether the missing scope can be derived internally before broadening the public contract.

## Verification

- For index-backed build/sync/verify tickets, prefer temp-copy probes over live-world `_index/` state when proving rebuild behavior or unresolved-reference cleanup.
- For atomic-source `world-index verify` tickets, remember that retired logical file names such as `INSTITUTIONS.md` can be synthetic in atomic worlds but real disk-backed files in legacy fixtures. Skip or special-case them only after proving the backing file is absent or the fixture mode is truly atomic.
- When replacing a drafted tool/index command with a manual probe, confirm the probe uses the same artifact root, package/module-resolution root, and source-node/filter boundary as the live producer path. Do not scan a broader substrate ad hoc and treat that result as equivalent evidence.
- When proof moves to a temp copy or alternate root, retarget all dependent readonly queries and follow-on commands to that same rebuilt artifact root instead of mixing live generated state with temp-copy proof.
- When a command is expected to reject a world before build/sync, assert the rejection does not create or mutate `_index/world.db`, WAL/SHM files, or other derived artifacts unless the ticket explicitly owns that side effect.

## Closeout

- If final verification intentionally uses a live world instead of a temp copy, inspect the private `worlds/` repo status and classify any `_index/` changes as expected derived dirt, cleaned state, or unexpected source fallout.
- If synthetic logical nodes or derived helper rows change, inspect adjacent build/count/verify helpers and expectations in the same seam. Existing proof code may need to count those derived rows explicitly or exempt them from parser-vs-index drift checks just as it already does for older synthetic artifacts.
- For atomic-source record checks, do not filter solely by `node_type`: primary `_source/entities/*.yaml` records can emit `named_entity` nodes that are disk-backed source rows, while derived helper entities such as `entity:*` are synthetic and may need different visibility or drift treatment.
