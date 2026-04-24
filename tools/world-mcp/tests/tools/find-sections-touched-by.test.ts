import assert from "node:assert/strict";
import test from "node:test";

import { findSectionsTouchedBy } from "../../src/tools/find-sections-touched-by";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared";

function seedTouchedSectionsWorld(root: string): void {
  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      {
        node_id: "SEC-GEO-001",
        world_slug: "seeded",
        file_path: "_source/geography/SEC-GEO-001.yaml",
        node_type: "section",
        body: [
          "id: SEC-GEO-001",
          "file_class: GEOGRAPHY",
          "order: 1",
          "heading: Salt Roads",
          "heading_level: 2",
          "body: Salt roads converge at Brinewick.",
          "touched_by_cf:",
          "  - CF-0001",
          "extensions: []",
          ""
        ].join("\n")
      },
      {
        node_id: "SEC-INS-005",
        world_slug: "seeded",
        file_path: "_source/institutions/SEC-INS-005.yaml",
        node_type: "section",
        body: [
          "id: SEC-INS-005",
          "file_class: INSTITUTIONS",
          "order: 5",
          "heading: Harbor Court",
          "heading_level: 2",
          "body: The harbor court arbitrates dock disputes.",
          "touched_by_cf: []",
          "extensions:",
          "  - originating_cf: CF-0002",
          "    note: Harbor court jurisdiction appended.",
          ""
        ].join("\n")
      },
      {
        node_id: "SEC-ECR-003",
        world_slug: "seeded",
        file_path: "_source/economy-and-resources/SEC-ECR-003.yaml",
        node_type: "section",
        body: [
          "id: SEC-ECR-003",
          "file_class: ECONOMY_AND_RESOURCES",
          "order: 3",
          "heading: Salt Contracts",
          "heading_level: 2",
          "body: Salt contract revisions are public.",
          "touched_by_cf:",
          "  - CF-0003",
          "extensions:",
          "  - originating_cf: CF-0003",
          "    note: Contract revision attribution.",
          ""
        ].join("\n")
      },
      {
        node_id: "CF-0001",
        world_slug: "seeded",
        file_path: "_source/canon/CF-0001.yaml",
        node_type: "canon_fact_record",
        body: [
          "id: CF-0001",
          "title: Salt Roads",
          "statement: Salt roads converge at Brinewick.",
          ""
        ].join("\n")
      }
    ]
  });
}

test("findSectionsTouchedBy returns sections matching touched_by_cf", async () => {
  const root = createTempRepoRoot();

  try {
    seedTouchedSectionsWorld(root);

    const result = await withRepoRoot(root, () =>
      findSectionsTouchedBy({ cf_id: "CF-0001", world_slug: "seeded" })
    );

    assert.deepEqual(result, {
      sections: [
        {
          sec_id: "SEC-GEO-001",
          file_path: "_source/geography/SEC-GEO-001.yaml",
          match_type: "touched_by_cf"
        }
      ],
      total_count: 1
    });
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("findSectionsTouchedBy returns sections matching extension originating_cf", async () => {
  const root = createTempRepoRoot();

  try {
    seedTouchedSectionsWorld(root);

    const result = await withRepoRoot(root, () =>
      findSectionsTouchedBy({ cf_id: "CF-0002", world_slug: "seeded" })
    );

    assert.deepEqual(result, {
      sections: [
        {
          sec_id: "SEC-INS-005",
          file_path: "_source/institutions/SEC-INS-005.yaml",
          match_type: "extension"
        }
      ],
      total_count: 1
    });
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("findSectionsTouchedBy returns both match types when a section has both signals", async () => {
  const root = createTempRepoRoot();

  try {
    seedTouchedSectionsWorld(root);

    const result = await withRepoRoot(root, () =>
      findSectionsTouchedBy({ cf_id: "CF-0003", world_slug: "seeded" })
    );

    assert.deepEqual(result, {
      sections: [
        {
          sec_id: "SEC-ECR-003",
          file_path: "_source/economy-and-resources/SEC-ECR-003.yaml",
          match_type: "touched_by_cf"
        },
        {
          sec_id: "SEC-ECR-003",
          file_path: "_source/economy-and-resources/SEC-ECR-003.yaml",
          match_type: "extension"
        }
      ],
      total_count: 2
    });
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("findSectionsTouchedBy returns an empty result for unreferenced CF ids", async () => {
  const root = createTempRepoRoot();

  try {
    seedTouchedSectionsWorld(root);

    const result = await withRepoRoot(root, () =>
      findSectionsTouchedBy({ cf_id: "CF-9999", world_slug: "seeded" })
    );

    assert.deepEqual(result, {
      sections: [],
      total_count: 0
    });
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("findSectionsTouchedBy returns invalid_input for non-CF ids", async () => {
  const result = await findSectionsTouchedBy({ cf_id: "NOT-A-CF", world_slug: "seeded" });

  assert.ok("code" in result);
  assert.equal(result.code, "invalid_input");
  assert.equal(result.details?.field, "cf_id");
});
