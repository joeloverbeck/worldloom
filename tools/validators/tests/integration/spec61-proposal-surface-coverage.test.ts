import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { build as buildWorldIndex } from "@worldloom/world-index/commands/build";
import { openExistingIndex } from "@worldloom/world-index/index/open";
import yaml from "js-yaml";

import { buildFullWorldReadSurface } from "../../src/_helpers/index-access.js";
import { approvalSemantics } from "../../src/structural/approval-semantics.js";
import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record, validCf } from "../structural/helpers.js";

type SurfaceFixture = {
  nodeType: string;
  idField: string;
  id: string;
  path: string;
  frontmatter: Record<string, unknown>;
};

const PROPOSAL_SURFACE_NODE_TYPES = [
  "proposal_card",
  "proposal_batch",
  "pressure_event_card",
  "pressure_event_sidecar_proposal",
  "pressure_event_batch",
  "audit_record",
  "retcon_proposal_card",
  "world_proposal_card",
  "world_proposal_batch"
] as const;

test("SPEC-61 capstone validates proposal surfaces and approval semantics together", async () => {
  const fixtures = proposalSurfaceFixtures();

  const validSchemaVerdicts = await recordSchemaCompliance.run(
    {},
    context([
      ...fixtures.map((fixture) => record(fixture.nodeType, fixture.id, fixture.path, fixture.frontmatter)),
      record("canon_fact_record", "CF-1", "_source/canon/CF-1.yaml", validCf)
    ])
  );
  assert.deepEqual(validSchemaVerdicts, []);

  const malformedSchemaVerdicts = await recordSchemaCompliance.run(
    {},
    context(fixtures.map((fixture) => record(fixture.nodeType, fixture.id, fixture.path, malformed(fixture))))
  );
  for (const fixture of fixtures) {
    assert.ok(
      malformedSchemaVerdicts.some(
        (verdict) =>
          verdict.validator === "record_schema_compliance" &&
          verdict.location.file === fixture.path &&
          verdict.code === "record_schema_compliance.required"
      ),
      `expected schema failure for ${fixture.path}`
    );
  }

  const approvalVerdicts = await approvalSemantics.run(
    undefined,
    context([
      record("retcon_proposal_card", "RP-2", "audits/AU-1/retcon-proposals/RP-2.md", {
        source_basis: { direct_user_approval: false, user_approved: false }
      }),
      record("canon_fact_record", "CF-1", "_source/canon/CF-1.yaml", validCf),
      record("diegetic_artifact_record", "DA-1", "diegetic-artifacts/DA-1.md", {
        source_basis: { user_approved: true }
      })
    ])
  );
  assert.equal(approvalVerdicts.length, 1);
  assert.equal(approvalVerdicts[0]?.code, "approval_semantics.direct_user_approval_reserved");
  assert.match(approvalVerdicts[0]?.message ?? "", /reserved for accepted canon_fact_record records/);
  assert.match(approvalVerdicts[0]?.message ?? "", /source_basis\.user_approved/);

  const cfNoRegressionVerdicts = await recordSchemaCompliance.run(
    {},
    context([
      record("canon_fact_record", "CF-1", "_source/canon/CF-1.yaml", {
        ...validCf,
        source_basis: { derived_from: [] }
      })
    ])
  );
  assert.ok(
    cfNoRegressionVerdicts.some(
      (verdict) =>
        verdict.validator === "record_schema_compliance" &&
        verdict.code === "record_schema_compliance.required" &&
        verdict.message.includes("direct_user_approval")
    ),
    "accepted CFs must still require source_basis.direct_user_approval"
  );
});

test("SPEC-61 capstone confirms RP template and retrieval/index boundaries", () => {
  const template = readRepoFile(".claude/skills/continuity-audit/templates/retcon-proposal-card.md");
  assert.match(template, /source_basis:\n  user_approved: false/);
  assert.doesNotMatch(template, /source_basis:\n  direct_user_approval:/);

  const listRecordsSource = readRepoFile("tools/world-mcp/src/tools/list-records.ts");
  assert.doesNotMatch(listRecordsSource, /"pressure_event_card"/);
  assert.doesNotMatch(listRecordsSource, /"pressure_event_sidecar_proposal"/);
  assert.doesNotMatch(listRecordsSource, /"pressure_event_batch"/);
});

test("SPEC-61 capstone builds a temp indexed world with proposal-surface node types", async () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "worldloom-spec61-capstone-"));
  const worldRoot = path.join(tempRoot, "worlds", "spec61");

  try {
    writeWorldFixture(worldRoot, proposalSurfaceFixtures());
    assert.equal(buildWorldIndex(tempRoot, "spec61", { quiet: true }), 0);

    const db = openExistingIndex(tempRoot, "spec61");
    try {
      const rows = db.prepare(
        "SELECT node_type, COUNT(*) AS count FROM nodes WHERE world_slug = ? GROUP BY node_type"
      ).all("spec61") as Array<{ node_type: string; count: number }>;
      const counts = new Map(rows.map((row) => [row.node_type, row.count]));

      for (const nodeType of PROPOSAL_SURFACE_NODE_TYPES) {
        assert.equal(counts.get(nodeType), 1, `${nodeType} should be emitted by world-index build`);
      }

      const indexedProposalSurface = buildFullWorldReadSurface(db, "spec61");
      const indexedSchemaVerdicts = await recordSchemaCompliance.run(
        {},
        {
          run_mode: "full-world",
          world_slug: "spec61",
          touched_files: [],
          index: {
            query: async (query) =>
              query.record_type === "proposal_card" || query.record_type === "proposal_batch"
                ? indexedProposalSurface.query(query)
                : [],
            queryEdges: async (query) => indexedProposalSurface.queryEdges?.(query) ?? []
          }
        }
      );
      assert.deepEqual(indexedSchemaVerdicts, []);
    } finally {
      db.close();
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

function malformed(fixture: SurfaceFixture): Record<string, unknown> {
  const copy = structuredClone(fixture.frontmatter) as Record<string, unknown>;
  delete copy[fixture.idField];
  return copy;
}

function readRepoFile(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), "..", "..", relativePath), "utf8");
}

function writeWorldFixture(worldRoot: string, fixtures: SurfaceFixture[]): void {
  writeFile(worldRoot, "WORLD_KERNEL.md", "# SPEC-61 fixture\n");
  writeFile(worldRoot, "ONTOLOGY.md", "# Ontology\n");
  writeYaml(worldRoot, "_source/canon/CF-1.yaml", validCf);

  for (const fixture of fixtures) {
    writeFile(worldRoot, fixture.path, markdownWithFrontmatter(fixture.frontmatter, fixture.path));
  }
}

function writeYaml(worldRoot: string, relativePath: string, recordBody: Record<string, unknown>): void {
  writeFile(worldRoot, relativePath, `${yaml.dump(recordBody, { lineWidth: -1 }).trimEnd()}\n`);
}

function writeFile(worldRoot: string, relativePath: string, content: string): void {
  const absolutePath = path.join(worldRoot, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, "utf8");
}

function markdownWithFrontmatter(frontmatter: Record<string, unknown>, title: string): string {
  return ["---", yaml.dump(frontmatter, { lineWidth: -1 }).trimEnd(), "---", `# ${title}`, ""].join("\n");
}

function proposalSurfaceFixtures(): SurfaceFixture[] {
  return [
    {
      nodeType: "proposal_card",
      idField: "proposal_id",
      id: "PR-1",
      path: "proposals/PR-1-salt-law.md",
      frontmatter: validProposalCard()
    },
    {
      nodeType: "proposal_batch",
      idField: "batch_id",
      id: "BATCH-1",
      path: "proposals/batches/BATCH-1.md",
      frontmatter: validProposalBatch()
    },
    {
      nodeType: "pressure_event_card",
      idField: "event_id",
      id: "EPE-1",
      path: "pressure-events/EPE-1-salt-shortage.md",
      frontmatter: validPressureEventCard()
    },
    {
      nodeType: "pressure_event_sidecar_proposal",
      idField: "proposal_id",
      id: "PR-2",
      path: "pressure-events/EPE-1-salt-shortage.proposal.md",
      frontmatter: validPressureSidecarProposal()
    },
    {
      nodeType: "pressure_event_batch",
      idField: "batch_id",
      id: "BATCH-2",
      path: "pressure-events/batches/BATCH-2.md",
      frontmatter: validPressureEventBatch()
    },
    {
      nodeType: "audit_record",
      idField: "audit_id",
      id: "AU-1",
      path: "audits/AU-1-continuity.md",
      frontmatter: validAuditReport()
    },
    {
      nodeType: "retcon_proposal_card",
      idField: "id",
      id: "RP-1",
      path: "audits/AU-1/retcon-proposals/RP-1.md",
      frontmatter: validRetconProposal()
    },
    {
      nodeType: "world_proposal_card",
      idField: "proposal_id",
      id: "NWP-1",
      path: "world-proposals/NWP-1-reef-court.md",
      frontmatter: validWorldProposalCard()
    },
    {
      nodeType: "world_proposal_batch",
      idField: "batch_id",
      id: "NWB-1",
      path: "world-proposals/batches/NWB-1.md",
      frontmatter: validWorldProposalBatch()
    }
  ];
}

function validProposalCard(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    proposal_id: "PR-1",
    batch_id: "BATCH-1",
    slug: "salt-law",
    title: "Salt Law",
    canon_fact_statement: "Salt courts license winter crossings.",
    proposed_status: "hard_canon",
    type: "law",
    enrichment_category: "institutional pressure",
    proposal_family: 0,
    domains_touched: ["law"],
    recommended_scope: { geographic: "local", temporal: "current", social: "public" },
    why_not_universal: ["Only one coast uses salt courts."],
    scores: {
      coherence: 5,
      propagation_value: 5,
      story_yield: 4,
      distinctiveness: 4,
      ordinary_life_relevance: 4,
      mystery_preservation: 3,
      integration_burden: 2,
      redundancy_risk: 1
    },
    score_aggregate: 82,
    immediate_consequences: ["Courts control crossings."],
    longer_term_consequences: ["Smuggling pressure rises."],
    likely_required_downstream_updates: ["INSTITUTIONS"],
    risks: ["Local overload."],
    canon_safety_check: {
      invariants_respected: ["INV-1"],
      mystery_reserve_firewall: ["M-1"],
      distribution_discipline: { canon_facts_consulted: ["CF-1"] }
    },
    source_basis: {
      world_slug: "spec61",
      batch_id: "BATCH-1",
      generated_date: "2026-05-21",
      user_approved: false,
      derived_from_cfs: ["CF-1"]
    },
    notes: "Fixture.",
    ...overrides
  };
}

function validProposalBatch(): Record<string, unknown> {
  return {
    batch_id: "BATCH-1",
    world_slug: "spec61",
    generated_date: "2026-05-21",
    parameters: {
      batch_size: 1,
      novelty_range: "moderate",
      enrichment_types: ["law"],
      taboo_areas: [],
      upstream_audit_path: ""
    },
    diagnosis_summary: "One card.",
    card_ids: ["PR-1"],
    dropped_card_ids: [],
    user_approved: false,
    notes: "Fixture."
  };
}

function validPressureEventCard(): Record<string, unknown> {
  return {
    event_id: "EPE-1",
    batch_id: "BATCH-2",
    slug: "salt-shortage",
    title: "Salt Shortage",
    event_seed: "Winter salt stores run low.",
    origin_type: "scarcity",
    traceability: {
      cited_canon_facts: ["CF-1"],
      cited_institutions: ["Salt Court"],
      cited_material_conditions: ["winter roads"],
      cited_pressures: ["scarcity"]
    },
    actors_involved: ["Salt Court"],
    what_changes_immediately: ["Crossing fees rise."],
    what_might_change_if_unchecked: ["Smugglers gain leverage."],
    who_benefits: ["licensed carriers"],
    who_suffers: ["small traders"],
    rumor_waves: ["The court hoards salt."],
    mysteries_touched: ["M-1"],
    scope: {
      geographic: "local",
      temporal: "seasonal",
      why_not_universal: ["Only one road is affected."]
    },
    downstream_routing: "canonize",
    routing_rationale: "A local legal pressure is worth canon review.",
    proposal_card_extract: null,
    canon_safety_flags: {
      invariants_tested: ["INV-1"],
      mystery_reserve_firewall: ["M-1"],
      distribution_discipline: { canon_facts_consulted: ["CF-1"] },
      invariant_conformance: "pass",
      mystery_reserve_firewall_status: "pass",
      distribution_discipline_status: "pass"
    },
    recurrence_flag: null,
    status: "active",
    source_basis: {
      world_slug: "spec61",
      batch_id: "BATCH-2",
      generated_date: "2026-05-21",
      user_approved: false
    },
    notes: "Fixture."
  };
}

function validPressureSidecarProposal(): Record<string, unknown> {
  return validProposalCard({
    proposal_id: "PR-2",
    batch_id: "BATCH-2",
    enrichment_category: "derived_from_epe",
    source_basis: {
      world_slug: "spec61",
      batch_id: "BATCH-2",
      generated_date: "2026-05-21",
      user_approved: false,
      derived_from_cfs: ["CF-1"],
      derived_from_epe: "EPE-1"
    }
  });
}

function validPressureEventBatch(): Record<string, unknown> {
  return {
    batch_id: "BATCH-2",
    world_slug: "spec61",
    generated_date: "2026-05-21",
    parameters: {
      batch_size: 1,
      novelty_range: "moderate",
      origin_type_focus: ["scarcity"],
      taboo_areas: [],
      current_date: "2026-05-21",
      current_season: "winter"
    },
    pressure_inventory_summary: "One pressure event.",
    card_ids: ["EPE-1"],
    sidecars_emitted: ["EPE-1"],
    dropped_card_ids: [],
    phase_4_drop_log_ids: [],
    user_approved: false,
    notes: "Fixture."
  };
}

function validAuditReport(): Record<string, unknown> {
  return {
    audit_id: "AU-1",
    world_slug: "spec61",
    date: "2026-05-21",
    parameters: {
      audit_scope: "full",
      severity_floor: 1,
      focus_domains: ["law"],
      trigger_context: "periodic",
      recent_canon_addition_cutoff: "none"
    },
    trigger_context: "periodic",
    severity_floor: 1,
    categories_audited: [1],
    categories_deferred: [],
    finding_count_by_severity: {
      severity_1: 0,
      severity_2: 0,
      severity_3: 0,
      severity_4: 0,
      severity_5: 0
    },
    retcon_card_ids: ["RP-1"],
    dropped_finding_ids: [],
    dropped_card_ids: [],
    user_approved: false
  };
}

function validRetconProposal(): Record<string, unknown> {
  return {
    id: "RP-1",
    title: "Retcon Salt Court",
    proposed_status: "hard_canon",
    type: "law",
    statement: "Salt courts license winter crossings.",
    retcon_type: "A",
    target_cf_ids: ["CF-1"],
    severity_before_fix: 3,
    severity_after_fix: 1,
    audit_origin: "AU-1",
    finding_id: "F-1",
    scope: { geographic: "local", temporal: "current", social: "public" },
    truth_scope: { world_level: true, diegetic_status: "objective" },
    domains_affected: ["law"],
    prerequisites: ["CF-1"],
    distribution: {
      who_can_do_it: ["licensed carriers"],
      who_cannot_easily_do_it: ["small traders"],
      why_not_universal: ["Only one coast uses salt courts."]
    },
    costs_and_limits: ["Requires public license."],
    visible_consequences: ["Crossing fees rise."],
    required_world_updates: ["INSTITUTIONS"],
    source_basis: { user_approved: false, derived_from: ["CF-1"] },
    contradiction_risk: { hard: false, soft: false },
    notes: "Fixture."
  };
}

function validWorldProposalCard(): Record<string, unknown> {
  return {
    proposal_id: "NWP-1",
    batch_id: "NWB-1",
    slug: "reef-court",
    title: "Reef Court",
    generated_date: "2026-05-21",
    core_sentence: "A reef court world where law follows tide memory.",
    intended_canon_layer: "hard_canon",
    niche_summary: "Tidal law.",
    occupancy_strength: {
      current_state: "open",
      nearest_existing_worlds: [],
      decisive_differences: ["law follows tide memory"]
    },
    distinctness_enforced: true,
    distinctness_check_skipped_reason: "",
    preference_fit: {
      matched_patterns: ["institutional pressure"],
      rejected_patterns_avoided: ["generic empire"],
      why_user_may_like_it: "It makes law material."
    },
    scores: {
      preference_alignment: 5,
      novelty: 5,
      consequence_propagation: 5,
      ordinary_life_reach: 4,
      institution_generation: 5,
      faction_generation: 4,
      geography_as_law_strength: 5,
      deep_history_pressure: 4,
      mystery_reserve_quality: 4,
      diegetic_artifact_potential: 4,
      character_generation_potential: 4,
      native_story_procedure_strength: 4,
      tonal_aesthetic_specificity: 4,
      redundancy_risk: 1,
      pastiche_risk: 1,
      overcomplexity: 2,
      implementation_burden: 2,
      thematic_mismatch: 1,
      ethical_boundary_risk: 1,
      mystery_flattening_risk: 1,
      spectacle_without_society_risk: 1
    },
    score_aggregate: 86,
    domains_affected: ["law"],
    mystery_reserve_seeds: {},
    canon_safety_check: {},
    critic_pass_trace: { distinctness: "Pass." },
    source_basis: {
      preference_path: "preferences/test.md",
      parameters_path: "parameters/test.md",
      derived_from_seed_id: "seed-1",
      user_approved: false
    },
    recommended_next_step: "route_to_create_base_world",
    notes: "Fixture."
  };
}

function validWorldProposalBatch(): Record<string, unknown> {
  return {
    batch_id: "NWB-1",
    generated_date: "2026-05-21",
    source_preference_document: "preferences/test.md",
    parameters_path: "parameters/test.md",
    parameters: {
      proposal_count_requested: 1,
      intended_use_case: "novel",
      scale_preference: "region",
      inspiration_distance: "distant",
      novelty_preference: "high",
      existing_world_policy: "strict_avoid",
      content_boundaries: {
        sexual_content: "allowed_if_structural",
        body_horror: "ask_or_tag",
        child_endangerment: "ask_or_tag",
        religion: "allowed_if_structural",
        politics: "allowed_if_structural",
        oppression: "allowed_if_structural"
      },
      genre_diversification: "diversify",
      inferred_defaults: []
    },
    distinctness_enforced: true,
    existing_worlds_scanned: [],
    card_ids: ["NWP-1"],
    dropped_card_ids: [],
    bootstrap_writes_required: false,
    bootstrap_writes_performed: [],
    user_approved: false,
    deliverable_summary_distinctness_banner_surfaced: true
  };
}
