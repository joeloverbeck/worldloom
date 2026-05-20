import assert from "node:assert/strict";
import test from "node:test";

import { characterMemorabilityStructure } from "../../src/structural/character-memorability-structure.js";
import { context } from "./helpers.js";

test("character_memorability_structure accepts complete CHAR protagonist-grade surfaces", async () => {
  const verdicts = await characterMemorabilityStructure.run(
    inputFile("characters/maren.md", validCharacter()),
    context([])
  );

  assert.deepEqual(verdicts, []);
});

test("character_memorability_structure rejects missing CHAR body headings", async () => {
  const verdicts = await characterMemorabilityStructure.run(
    inputFile("characters/maren.md", validCharacter(["Protagonist-Grade Core"])),
    context([])
  );

  assert.ok(verdicts.some((verdict) => verdict.code === "character_memorability_structure.missing_character_section"));
  assert.ok(verdicts.some((verdict) => verdict.message.includes("Protagonist-Grade Core")));
});

test("character_memorability_structure rejects weak CHAR behavior lists", async () => {
  const content = validCharacter(undefined, `
dramatic_core:
  world_produced_wound: "Her office makes rescue and audit the same act."
  active_appetite: "She wants one debtor to bless the ledger."
  self_mythology: "She is the only honest mouth at the tollhouse."
  irreconcilable_contradiction: "She hides debtors by recording them."
  pressure_behavior:
    cornered: "quotes receipt law"
    tempted: "quotes receipt law"
    humiliated: ""
    offered_power: "demands a witness"
    protecting_attachment: "lies by omission"
  relational_charge:
    - target_or_relation_type: "former debtor"
      need: "forgiveness"
      resentment_or_fear: "being exposed as sentimental"
      likely_harm_or_betrayal: "records the debtor's secret anyway"
  moral_psychological_edge: "She believes rescue is valid only when it leaves a scar."
  signature_scene_behaviors:
    - "folds receipts into charms"
  voice_under_pressure:
    lying: "precise and priestly"
    begging: "transactional"
    threatening: "softly bureaucratic"
    grieving_or_hiding_ignorance: "recites doctrine"
  cannot_be_swapped_out_because: "Only her office makes mercy and audit the same act."
`);

  const verdicts = await characterMemorabilityStructure.run(
    inputFile("characters/maren.md", content),
    context([])
  );

  assert.ok(verdicts.some((verdict) => verdict.code === "character_memorability_structure.signature_scene_behaviors_min_items"));
  assert.ok(verdicts.some((verdict) => verdict.code === "character_memorability_structure.pressure_behavior_empty"));
  assert.ok(verdicts.some((verdict) => verdict.code === "character_memorability_structure.pressure_behavior_duplicate"));
});

test("character_memorability_structure rejects malformed source proposal ids on CHAR records", async () => {
  const verdicts = await characterMemorabilityStructure.run(
    inputFile("characters/maren.md", validCharacter(undefined, validDramaticCoreYaml(), "7")),
    context([])
  );

  assert.ok(verdicts.some((verdict) => verdict.code === "character_memorability_structure.source_proposal_id_format"));
});

test("character_memorability_structure accepts NCP cards without CHAR-only body headings", async () => {
  const verdicts = await characterMemorabilityStructure.run(
    inputFile("character-proposals/NCP-12-maren.md", validProposalCard()),
    context([])
  );

  assert.deepEqual(verdicts, []);
});

test("character_memorability_structure rejects upgraded NCP cards without rejected-directions audit", async () => {
  const verdicts = await characterMemorabilityStructure.run(
    inputFile("character-proposals/NCP-12-maren.md", validProposalCard({ includeAuditHeading: false })),
    context([])
  );

  assert.ok(verdicts.some((verdict) => verdict.code === "character_memorability_structure.missing_rejected_directions_audit"));
});

test("character_memorability_structure rejects user-seed NCP cards without rejected-directions audit", async () => {
  const verdicts = await characterMemorabilityStructure.run(
    inputFile("character-proposals/NCP-12-maren.md", validProposalCard({ includeAuditHeading: false, originKind: "user_seed" })),
    context([])
  );

  assert.ok(verdicts.some((verdict) => verdict.code === "character_memorability_structure.missing_rejected_directions_audit"));
});

test("character_memorability_structure rejects upgraded and user-seed NCP cards with too few rejected directions", async () => {
  for (const originKind of ["upgraded_seed", "user_seed"] as const) {
    const verdicts = await characterMemorabilityStructure.run(
      inputFile("character-proposals/NCP-12-maren.md", validProposalCard({ originKind, rejectedDirectionsCount: 2 })),
      context([])
    );

    assert.ok(verdicts.some((verdict) => verdict.code === "character_memorability_structure.rejected_directions_audit_min_items"));
  }
});

test("character_memorability_structure leaves batch-generated NCP audit shape unaffected", async () => {
  const verdicts = await characterMemorabilityStructure.run(
    inputFile("character-proposals/NCP-12-maren.md", validProposalCard({
      includeAuditHeading: false,
      originKind: "batch_generated",
      rejectedDirectionsCount: 1
    })),
    context([])
  );

  assert.deepEqual(verdicts, []);
});

test("character_memorability_structure rejects canon-requiring NCP cards without implied facts", async () => {
  const verdicts = await characterMemorabilityStructure.run(
    inputFile("character-proposals/NCP-12-maren.md", validProposalCard({ canonRequiringWithoutFacts: true })),
    context([])
  );

  assert.ok(verdicts.some((verdict) => verdict.code === "character_memorability_structure.canon_requiring_missing_implied_facts"));
});

test("character_memorability_structure rejects placeholder text on character surfaces", async () => {
  const verdicts = await characterMemorabilityStructure.run(
    inputFile("character-proposals/NCP-12-maren.md", `${validProposalCard()}\nTODO: sharpen later\n`),
    context([])
  );

  assert.ok(verdicts.some((verdict) => verdict.code === "character_memorability_structure.placeholder_text"));
});

test("character_memorability_structure ignores absence statements about placeholder text", async () => {
  const verdicts = await characterMemorabilityStructure.run(
    inputFile(
      "character-proposals/NCP-12-maren.md",
      `${validProposalCard()}\n- Test 9: PASS - no TODO / placeholder / empty-where-content-required fields.\n`
    ),
    context([])
  );

  assert.deepEqual(verdicts, []);
});

test("character_memorability_structure ignores collection indexes", async () => {
  const verdicts = await characterMemorabilityStructure.run(
    {
      files: [
        {
          path: "characters/INDEX.md",
          content: "TODO: maintain this index\n"
        },
        {
          path: "character-proposals/INDEX.md",
          content: "TODO: maintain this index\n"
        }
      ]
    },
    context([])
  );

  assert.deepEqual(verdicts, []);
});

function inputFile(path: string, content: string) {
  return {
    files: [
      {
        path,
        content
      }
    ]
  };
}

function validCharacter(
  omitSections: readonly string[] = [],
  dramaticCore = validDramaticCoreYaml(),
  sourceProposalId = "NCP-7"
): string {
  const sections = [
    "Material Reality",
    "Institutional Embedding",
    "Epistemic Position",
    "Goals and Pressures",
    "Capabilities",
    "Voice and Perception",
    "Contradictions and Tensions",
    "Protagonist-Grade Core",
    "Pressure Behavior",
    "Self-Mythology and Blind Spots",
    "Relational Charge",
    "Moral and Psychological Edge",
    "Signature Scene Behavior",
    "Likely Story Hooks",
    "Canon Safety Check Trace"
  ].filter((section) => !omitSections.includes(section));

  return [
    "---",
    "character_id: CHAR-12",
    "slug: maren-toll-confessor",
    "name: Maren",
    "species: human",
    "age_band: adult",
    "place_of_origin: Lower Ferry",
    "current_location: River Tollhouse",
    "date: rain season",
    "social_position: licensed confessor",
    "profession: toll clerk",
    "kinship_situation: estranged oath-sibling",
    "religious_ideological_environment: ledger cult",
    "major_local_pressures: [seasonal debt audit]",
    "intended_narrative_role: protagonist",
    dramaticCore.trimEnd(),
    "world_consistency:",
    "  canon_facts_consulted: [CF-1]",
    "source_basis:",
    "  world_slug: animalia",
    "  source_paths: []",
    `  source_proposal_id: ${sourceProposalId}`,
    "---",
    "# Maren",
    "",
    ...sections.flatMap((section) => [`## ${section}`, "", "Grounded prose.", ""])
  ].join("\n");
}

function validDramaticCoreYaml(): string {
  return `
dramatic_core:
  world_produced_wound: "Her office makes rescue and audit the same act."
  active_appetite: "She wants one debtor to bless the ledger."
  self_mythology: "She is the only honest mouth at the tollhouse."
  irreconcilable_contradiction: "She hides debtors by recording them."
  pressure_behavior:
    cornered: "quotes receipt law"
    tempted: "asks who benefits"
    humiliated: "turns procedural"
    offered_power: "demands a witness"
    protecting_attachment: "lies by omission"
  relational_charge:
    - target_or_relation_type: "former debtor"
      need: "forgiveness"
      resentment_or_fear: "being exposed as sentimental"
      likely_harm_or_betrayal: "records the debtor's secret anyway"
  moral_psychological_edge: "She believes rescue is valid only when it leaves a scar."
  signature_scene_behaviors:
    - "folds receipts into charms"
    - "counts exits before speaking"
    - "answers prayers with fee schedules"
  voice_under_pressure:
    lying: "precise and priestly"
    begging: "transactional"
    threatening: "softly bureaucratic"
    grieving_or_hiding_ignorance: "recites doctrine"
  cannot_be_swapped_out_because: "Only her office makes mercy and audit the same act."
`;
}

function validProposalCard(options: {
  includeAuditHeading?: boolean;
  canonRequiringWithoutFacts?: boolean;
  originKind?: "batch_generated" | "upgraded_seed" | "user_seed";
  rejectedDirectionsCount?: number;
} = {}): string {
  const includeAuditHeading = options.includeAuditHeading ?? true;
  const canonStatus = options.canonRequiringWithoutFacts ? "canon-requiring" : "canon-safe";
  const originKind = options.originKind ?? "upgraded_seed";
  const rejectedDirectionsCount = options.rejectedDirectionsCount ?? 3;
  return [
    "---",
    "proposal_id: NCP-12",
    "slug: maren-toll-confessor",
    "title: Maren, Toll Confessor",
    "upgrade_lineage:",
    `  origin_kind: ${originKind}`,
    "  source_path: briefs/maren.md",
    "  source_proposal_id: ''",
    "  mutation_summary: Kept the toll role and sharpened the debt appetite.",
    "  rejected_directions_audit:",
    ...Array.from({ length: rejectedDirectionsCount }, (_, index) => `    - rejected direction ${index + 1}`),
    "memorability_profile:",
    "  seed_essence_preserved: [Toll confession role]",
    "canon_assumption_flags:",
    `  status: ${canonStatus}`,
    "  edge_assumptions: []",
    "  implied_new_facts: []",
    "---",
    "# Maren, Toll Confessor",
    "",
    "## Proposal",
    "",
    "World-rooted proposal prose.",
    "",
    ...(includeAuditHeading ? ["## Rejected Directions Audit", "", "- Pure monster flattened the office pressure.", ""] : [])
  ].join("\n");
}
