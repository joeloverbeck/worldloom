import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context } from "./helpers.js";

test("record_schema_compliance accepts template-conformant diegetic artifact claim_map entries", async () => {
  const result = await recordSchemaCompliance.run(
    {
      files: [
        {
          path: "diegetic-artifacts/DA-10-test.md",
          content: diegeticArtifactMarkdown("DA-10", validClaimMap())
        }
      ]
    },
    context([])
  );

  assert.equal(result.length, 0);
});

test("record_schema_compliance accepts template-conformant loose-object blocks", async () => {
  const result = await recordSchemaCompliance.run(
    {
      files: [
        {
          path: "diegetic-artifacts/DA-14-test.md",
          content: diegeticArtifactMarkdown("DA-14", validClaimMap())
        }
      ]
    },
    context([])
  );

  assert.equal(result.length, 0);
});

test("record_schema_compliance rejects diegetic artifact claim_map enum drift", async () => {
  const result = await recordSchemaCompliance.run(
    {
      files: [
        {
          path: "diegetic-artifacts/DA-11-test.md",
          content: diegeticArtifactMarkdown("DA-11", {
            ...validClaimMap(),
            canon_status: "canonization_allowed"
          })
        }
      ]
    },
    context([])
  );

  assert.ok(hasSchemaViolation(result, "DA-11", "enum", "/claim_map/0/canon_status"));
});

test("record_schema_compliance rejects canonically_true claim_map entries without cf_id", async () => {
  const claim = validClaimMap();
  delete claim.cf_id;

  const result = await recordSchemaCompliance.run(
    {
      files: [
        {
          path: "diegetic-artifacts/DA-12-test.md",
          content: diegeticArtifactMarkdown("DA-12", claim)
        }
      ]
    },
    context([])
  );

  assert.ok(hasSchemaViolation(result, "DA-12", "required", "/claim_map/0"));
});

test("record_schema_compliance rejects mystery_adjacent claim_map entries without mr_id", async () => {
  const claim = {
    ...validClaimMap(),
    canon_status: "mystery_adjacent",
    cf_id: null
  };
  delete claim.mr_id;

  const result = await recordSchemaCompliance.run(
    {
      files: [
        {
          path: "diegetic-artifacts/DA-13-test.md",
          content: diegeticArtifactMarkdown("DA-13", claim)
        }
      ]
    },
    context([])
  );

  assert.ok(hasSchemaViolation(result, "DA-13", "required", "/claim_map/0"));
});

test("record_schema_compliance rejects malformed loose-object blocks", async () => {
  const cases: Array<{
    name: string;
    artifactId: string;
    overrides: DiegeticArtifactBlockOverrides;
    keyword: string;
    instancePath: string;
  }> = [
    {
      name: "world_consistency id formats",
      artifactId: "DA-15",
      overrides: {
        worldConsistency: {
          ...validWorldConsistency(),
          canon_facts_consulted: ["not-a-cf"]
        }
      },
      keyword: "pattern",
      instancePath: "/world_consistency/canon_facts_consulted/0"
    },
    {
      name: "author_profile additional properties",
      artifactId: "DA-16",
      overrides: {
        authorProfile: {
          ...validAuthorProfile(),
          unexpected_field: "not allowed"
        }
      },
      keyword: "additionalProperties",
      instancePath: "/author_profile"
    },
    {
      name: "source_basis required fields",
      artifactId: "DA-17",
      overrides: {
        sourceBasis: {
          world_slug: "test",
          brief_path: "briefs/test.md",
          character_path: null,
          generated_date: "2026-05-22"
        }
      },
      keyword: "required",
      instancePath: "/source_basis"
    }
  ];

  for (const fixture of cases) {
    const result = await recordSchemaCompliance.run(
      {
        files: [
          {
            path: `diegetic-artifacts/${fixture.artifactId}-test.md`,
            content: diegeticArtifactMarkdown(fixture.artifactId, validClaimMap(), fixture.overrides)
          }
        ]
      },
      context([])
    );

    assert.ok(
      hasSchemaViolation(result, fixture.artifactId, fixture.keyword, fixture.instancePath),
      fixture.name
    );
  }
});

test("record_schema_compliance validates visible on-disk diegetic artifact fixtures", async () => {
  const fixturePaths = [
    path.join(packageRoot(), "tests/fixtures/diegetic-artifact-with-new-fields.md"),
    path.join(repoRoot(), "tests/fixtures/animalia/diegetic-artifacts/a-season-on-the-circuit.md"),
    path.join(repoRoot(), "tests/fixtures/animalia/diegetic-artifacts/after-action-report-harrowgate-contract.md")
  ];
  const files = await Promise.all(
    fixturePaths.map(async (fixturePath) => ({
      path: path.relative(repoRoot(), fixturePath).split(path.sep).join("/"),
      content: await readFile(fixturePath, "utf8")
    }))
  );

  const result = await recordSchemaCompliance.run({ files }, context([]));

  assert.deepEqual(
    result.map((verdict) => ({
      file: verdict.location.file,
      node_id: verdict.location.node_id,
      code: verdict.code,
      message: verdict.message
    })),
    []
  );
});

type ClaimMapEntry = {
  claim: string;
  canon_status: string;
  narrator_belief: string;
  source: string;
  contradiction_risk: string;
  mode: string;
  adaptive_behavior_preserved_under_wrong_ontology: boolean;
  cf_id?: string | null;
  mr_id?: string | null;
  repair_trace: Record<string, unknown> | null;
};

type LooseObject = Record<string, unknown>;

type DiegeticArtifactBlockOverrides = {
  genreConventions?: LooseObject;
  authorProfile?: LooseObject;
  epistemicHorizon?: LooseObject;
  worldConsistency?: LooseObject;
  sourceBasis?: LooseObject;
};

function validClaimMap(): ClaimMapEntry {
  return {
    claim: "The author witnessed the Mudbrook audit.",
    canon_status: "canonically_true",
    narrator_belief: "true",
    source: "witnessed",
    contradiction_risk: "none",
    mode: "direct",
    adaptive_behavior_preserved_under_wrong_ontology: false,
    cf_id: "CF-0001",
    mr_id: null,
    repair_trace: null
  };
}

function validGenreConventions(): LooseObject {
  return {
    honors: ["institutional header"],
    breaks: []
  };
}

function validAuthorProfile(): LooseObject {
  return {
    species: "human",
    age_band: "adult",
    sex_or_gender: null,
    class: "scribe",
    literacy: "trade-tongue literate",
    profession: "auditor",
    religious_ideological_environment: "nominal",
    political_dependency: "charter office",
    bodily_limits: "human baseline",
    mobility: "local",
    archive_access: "office files",
    rumor_access: "clerks",
    speech_register: "formal",
    likely_blind_spots: "court gossip",
    trauma_history_if_relevant: null
  };
}

function validEpistemicHorizon(): LooseObject {
  return {
    direct_knowledge: ["the audit"],
    inferred_knowledge: [],
    secondhand_knowledge: [],
    wrongly_believed: [],
    concealable: [],
    impossible_knowledge: ["M-1"]
  };
}

function validWorldConsistency(): LooseObject {
  return {
    canon_facts_consulted: ["CF-0001"],
    invariants_respected: ["SOC-1"],
    mystery_reserve_firewall: ["M-1"],
    distribution_exceptions: []
  };
}

function validSourceBasis(): LooseObject {
  return {
    world_slug: "test",
    brief_path: "briefs/test.md",
    character_path: null,
    generated_date: "2026-05-22",
    user_approved: false
  };
}

function diegeticArtifactMarkdown(
  artifactId: string,
  claim: ClaimMapEntry,
  overrides: DiegeticArtifactBlockOverrides = {}
): string {
  return [
    "---",
    `artifact_id: ${artifactId}`,
    "slug: test-artifact",
    "title: Test Artifact",
    "artifact_type: report",
    "author: Test Author",
    "author_character_id: null",
    "date: 2026-05-22",
    "place: Mudbrook",
    "audience: internal",
    "communicative_purpose: narrate",
    "desired_relation_to_truth: accurate",
    ...objectLines("genre_conventions", overrides.genreConventions ?? validGenreConventions()),
    ...objectLines("author_profile", overrides.authorProfile ?? validAuthorProfile()),
    ...objectLines("epistemic_horizon", overrides.epistemicHorizon ?? validEpistemicHorizon()),
    "claim_map:",
    ...claimMapLines(claim),
    ...objectLines("world_consistency", overrides.worldConsistency ?? validWorldConsistency()),
    ...objectLines("source_basis", overrides.sourceBasis ?? validSourceBasis()),
    "---",
    "# Test Artifact",
    "",
    "Body prose."
  ].join("\n");
}

function objectLines(key: string, value: LooseObject): string[] {
  const rendered = renderYamlValue(value, 0);
  return [`${key}:`, ...rendered.map((line) => `  ${line}`)];
}

function renderYamlValue(value: unknown, indentLevel: number): string[] {
  const indent = "  ".repeat(indentLevel);
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [`${indent}[]`];
    }
    return value.flatMap((item) => [`${indent}- ${formatScalar(item)}`]);
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, nestedValue]) => {
      if (Array.isArray(nestedValue)) {
        return nestedValue.length === 0
          ? [`${indent}${key}: []`]
          : [`${indent}${key}:`, ...renderYamlValue(nestedValue, indentLevel + 1)];
      }
      return [`${indent}${key}: ${formatScalar(nestedValue)}`];
    });
  }
  return [`${indent}${formatScalar(value)}`];
}

function formatScalar(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }
  return JSON.stringify(String(value));
}

function claimMapLines(claim: ClaimMapEntry): string[] {
  const lines = [
    `  - claim: ${claim.claim}`,
    `    canon_status: ${claim.canon_status}`,
    `    narrator_belief: "${claim.narrator_belief}"`,
    `    source: ${claim.source}`,
    `    contradiction_risk: ${claim.contradiction_risk}`,
    `    mode: ${claim.mode}`,
    `    adaptive_behavior_preserved_under_wrong_ontology: ${claim.adaptive_behavior_preserved_under_wrong_ontology}`
  ];
  if ("cf_id" in claim) {
    lines.push(`    cf_id: ${claim.cf_id ?? "null"}`);
  }
  if ("mr_id" in claim) {
    lines.push(`    mr_id: ${claim.mr_id ?? "null"}`);
  }
  lines.push("    repair_trace: null");
  return lines;
}

function hasSchemaViolation(
  result: Awaited<ReturnType<typeof recordSchemaCompliance.run>>,
  nodeId: string,
  keyword: string,
  instancePath: string
): boolean {
  return result.some(
    (verdict) =>
      verdict.location.node_id === nodeId &&
      verdict.code === `record_schema_compliance.${keyword}` &&
      verdict.message.includes(instancePath)
  );
}

function packageRoot(): string {
  return path.resolve(import.meta.dirname, "../../..");
}

function repoRoot(): string {
  return path.resolve(packageRoot(), "../..");
}
