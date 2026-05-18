import assert from "node:assert/strict";
import test from "node:test";

import { crossFileReference } from "../../src/structural/cross-file-reference.js";
import { context, record, validCf, validSection } from "./helpers.js";

test("cross_file_reference catches orphan record references and invalid file classes", async () => {
  const cf = record("canon_fact_record", "CF-1", "_source/canon/CF-1.yaml", {
    ...validCf,
    source_basis: { direct_user_approval: true, derived_from: ["CF-4040"] },
    required_world_updates: ["BAD_CLASS"]
  });
  const section = record("section", "SEC-INS-001", "_source/institutions/SEC-INS-001.yaml", {
    ...validSection,
    touched_by_cf: ["CF-1", "CF-9999"]
  });

  const result = await crossFileReference.run({}, context([cf, section]));

  assert.deepEqual(
    result.map((verdict) => verdict.code).sort(),
    [
      "cross_file_reference.orphan_reference",
      "cross_file_reference.orphan_reference",
      "cross_file_reference.unknown_file_class"
    ].sort()
  );
});

test("cross_file_reference warns on dangling creation_evidence indexed edges", async () => {
  const sourceRecord = record("story_secret_record", "red-bunny:STSEC-1", "stories/red-bunny/_source/secrets/STSEC-1.yaml", {
    id: "STSEC-1"
  });
  const eventRecord = record("story_event_record", "red-bunny:SE-1", "stories/red-bunny/_source/events/SE-1.yaml", {
    id: "SE-1"
  });

  const result = await crossFileReference.run(
    {},
    context([sourceRecord, eventRecord], {
      story_slug: "red-bunny",
      edges: [
        {
          source_node_id: "red-bunny:SE-1",
          target_node_id: "red-bunny:STSEC-1",
          target_unresolved_ref: null,
          edge_type: "state_delta_create",
          story_slug: "red-bunny"
        },
        {
          source_node_id: "red-bunny:STSEC-1",
          target_node_id: null,
          target_unresolved_ref: "red-bunny:BEL-404",
          edge_type: "creation_evidence",
          story_slug: "red-bunny"
        }
      ]
    })
  );

  assert.equal(result.length, 1);
  assert.deepEqual(result[0], {
    validator: "cross_file_reference",
    severity: "warn",
    code: "cross_file_reference.dangling_creation_evidence",
    message:
      "red-bunny:STSEC-1 authored by red-bunny:SE-1 has unresolved creation_evidence target red-bunny:BEL-404",
    location: {
      file: "stories/red-bunny/_source/secrets/STSEC-1.yaml",
      node_id: "red-bunny:STSEC-1"
    }
  });
});

test("cross_file_reference accepts resolved creation_evidence indexed edges", async () => {
  const sourceRecord = record("story_secret_record", "red-bunny:STSEC-1", "stories/red-bunny/_source/secrets/STSEC-1.yaml", {
    id: "STSEC-1"
  });
  const evidenceRecord = record("belief_record", "red-bunny:BEL-1", "stories/red-bunny/_source/beliefs/BEL-1.yaml", {
    id: "BEL-1"
  });

  const result = await crossFileReference.run(
    {},
    context([sourceRecord, evidenceRecord], {
      story_slug: "red-bunny",
      edges: [
        {
          source_node_id: "red-bunny:STSEC-1",
          target_node_id: "red-bunny:BEL-1",
          target_unresolved_ref: null,
          edge_type: "creation_evidence",
          story_slug: "red-bunny"
        }
      ]
    })
  );

  assert.deepEqual(result, []);
});

test("cross_file_reference counts mixed dangling creation_evidence indexed edges", async () => {
  const records = [
    record("story_secret_record", "red-bunny:STSEC-1", "stories/red-bunny/_source/secrets/STSEC-1.yaml", { id: "STSEC-1" }),
    record("story_secret_record", "red-bunny:STSEC-2", "stories/red-bunny/_source/secrets/STSEC-2.yaml", { id: "STSEC-2" }),
    record("belief_record", "red-bunny:BEL-1", "stories/red-bunny/_source/beliefs/BEL-1.yaml", { id: "BEL-1" }),
    record("belief_record", "red-bunny:BEL-2", "stories/red-bunny/_source/beliefs/BEL-2.yaml", { id: "BEL-2" }),
    record("belief_record", "red-bunny:BEL-3", "stories/red-bunny/_source/beliefs/BEL-3.yaml", { id: "BEL-3" }),
    record("belief_record", "red-bunny:BEL-4", "stories/red-bunny/_source/beliefs/BEL-4.yaml", { id: "BEL-4" }),
    record("belief_record", "red-bunny:BEL-5", "stories/red-bunny/_source/beliefs/BEL-5.yaml", { id: "BEL-5" })
  ];

  const result = await crossFileReference.run(
    {},
    context(records, {
      story_slug: "red-bunny",
      edges: [
        ...["BEL-1", "BEL-2", "BEL-3", "BEL-4", "BEL-5"].map((id) => ({
          source_node_id: "red-bunny:STSEC-1",
          target_node_id: `red-bunny:${id}`,
          target_unresolved_ref: null,
          edge_type: "creation_evidence",
          story_slug: "red-bunny"
        })),
        ...["BEL-404", "BEL-405", "BEL-406"].map((id) => ({
          source_node_id: "red-bunny:STSEC-2",
          target_node_id: null,
          target_unresolved_ref: `red-bunny:${id}`,
          edge_type: "creation_evidence",
          story_slug: "red-bunny"
        }))
      ]
    })
  );

  assert.equal(result.length, 3);
  assert.deepEqual(
    result.map((verdict) => verdict.code),
    [
      "cross_file_reference.dangling_creation_evidence",
      "cross_file_reference.dangling_creation_evidence",
      "cross_file_reference.dangling_creation_evidence"
    ]
  );
});

test("cross_file_reference warns on dangling state_delta indexed edges", async () => {
  const eventRecord = record("story_event_record", "red-bunny:SE-1", "stories/red-bunny/_source/events/SE-1.yaml", {
    id: "SE-1"
  });

  const result = await crossFileReference.run(
    {},
    context([eventRecord], {
      story_slug: "red-bunny",
      edges: [
        {
          source_node_id: "red-bunny:SE-1",
          target_node_id: null,
          target_unresolved_ref: "red-bunny:STSEC-404",
          edge_type: "state_delta_create",
          story_slug: "red-bunny"
        },
        {
          source_node_id: "red-bunny:SE-1",
          target_node_id: null,
          target_unresolved_ref: "red-bunny:CLK-404",
          edge_type: "state_delta_supersede",
          story_slug: "red-bunny"
        }
      ]
    })
  );

  assert.deepEqual(
    result.map((verdict) => verdict.code).sort(),
    [
      "cross_file_reference.dangling_state_delta_create",
      "cross_file_reference.dangling_state_delta_supersede"
    ].sort()
  );
  assert.ok(result.every((verdict) => verdict.severity === "warn"));
});
