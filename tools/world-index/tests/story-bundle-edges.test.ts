import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { parseStoryBundleSourceFile } from "../src/parse/atomic.js";

test("belief records emit holder, basis, access, and consequence edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-belief-edges-"));

  try {
    writeStoryBelief(root, "harborwatch", "BEL-1", [
      "id: BEL-1",
      "story_id: STORY-1",
      "created_at_page: PG-1",
      "holder: STENT-1",
      "claim: Brinewick believes the salt gate needs watching.",
      "belief_mode: believes",
      "truth_relation: true",
      "confidence: high",
      "visibility: shared",
      "basis:",
      "  source_event: SE-1",
      "  access_route: witnessed",
      "  access_records:",
      "    - PG-1",
      "    - DA-1",
      "consequences:",
      "  opens:",
      "    - OBL-1",
      "    - STQ-1",
      "  constrains_choices: []"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/beliefs/BEL-1.yaml"
    );

    assert.deepEqual(
      beliefEdges(parsed.edges),
      [
        {
          source_node_id: "harborwatch:BEL-1",
          target_unresolved_ref: "harborwatch:STENT-1",
          edge_type: "belief_holder",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:BEL-1",
          target_unresolved_ref: "harborwatch:SE-1",
          edge_type: "belief_basis_event",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:BEL-1",
          target_unresolved_ref: "harborwatch:PG-1",
          edge_type: "belief_access_record",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:BEL-1",
          target_unresolved_ref: "harborwatch:DA-1",
          edge_type: "belief_access_record",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:BEL-1",
          target_unresolved_ref: "harborwatch:OBL-1",
          edge_type: "belief_opens",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:BEL-1",
          target_unresolved_ref: "harborwatch:STQ-1",
          edge_type: "belief_opens",
          story_slug: "harborwatch"
        }
      ]
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("belief records with empty optional fields emit only populated belief edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-belief-empty-"));

  try {
    writeStoryBelief(root, "harborwatch", "BEL-2", [
      "id: BEL-2",
      "story_id: STORY-1",
      "created_at_page: PG-1",
      "holder: STENT-2",
      "claim: Brinewick has an unsupported suspicion.",
      "belief_mode: suspects",
      "truth_relation: unknown",
      "confidence: low",
      "visibility: private",
      "basis:",
      "  source_event: null",
      "  access_route: inference",
      "  access_records: []",
      "consequences:",
      "  opens: []",
      "  constrains_choices: []"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/beliefs/BEL-2.yaml"
    );

    assert.deepEqual(
      beliefEdges(parsed.edges).map((edge) => ({
        target_unresolved_ref: edge.target_unresolved_ref,
        edge_type: edge.edge_type
      })),
      [
        {
          target_unresolved_ref: "harborwatch:STENT-2",
          edge_type: "belief_holder"
        }
      ]
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("relationship records emit participant and derived-from edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-srel-edges-"));

  try {
    writeStoryRelationship(root, "harborwatch", "SREL-1", [
      "id: SREL-1",
      "story_id: STORY-1",
      "created_at_page: PG-2",
      "supersedes: null",
      "participants:",
      "  - STENT-1",
      "  - STENT-2",
      "axis: trust",
      "value: allied",
      "direction:",
      "  kind: bidirectional",
      "  from: null",
      "  to: null",
      "evidence:",
      "  - SE-1",
      "derived_from:",
      "  - SE-1",
      "  - BEL-1"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/relationships/SREL-1.yaml"
    );

    assert.deepEqual(
      relationshipEdges(parsed.edges),
      [
        {
          source_node_id: "harborwatch:SREL-1",
          target_unresolved_ref: "harborwatch:STENT-1",
          edge_type: "relationship_participant",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:SREL-1",
          target_unresolved_ref: "harborwatch:STENT-2",
          edge_type: "relationship_participant",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:SREL-1",
          target_unresolved_ref: "harborwatch:SE-1",
          edge_type: "relationship_derived_from",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:SREL-1",
          target_unresolved_ref: "harborwatch:BEL-1",
          edge_type: "relationship_derived_from",
          story_slug: "harborwatch"
        }
      ]
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("relationship records with empty arrays emit no relationship edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-srel-empty-"));

  try {
    writeStoryRelationship(root, "harborwatch", "SREL-2", [
      "id: SREL-2",
      "story_id: STORY-1",
      "created_at_page: PG-2",
      "supersedes: null",
      "participants: []",
      "axis: trust",
      "value: neutral",
      "direction:",
      "  kind: bidirectional",
      "  from: null",
      "  to: null",
      "evidence: []",
      "derived_from: []"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/relationships/SREL-2.yaml"
    );

    assert.deepEqual(relationshipEdges(parsed.edges), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("intention records emit holder and supersedes edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-stint-edges-"));

  try {
    writeStoryIntention(root, "harborwatch", "STINT-2", [
      "id: STINT-2",
      "story_id: STORY-1",
      "created_at_page: PG-3",
      "supersedes: STINT-1",
      "holder: STENT-1",
      "intent: Keep the north winch guarded.",
      "urgency: medium",
      "expires_when: The watch changes."
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/intentions/STINT-2.yaml"
    );

    assert.deepEqual(
      intentionEdges(parsed.edges),
      [
        {
          source_node_id: "harborwatch:STINT-2",
          target_unresolved_ref: "harborwatch:STENT-1",
          edge_type: "intention_holder",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:STINT-2",
          target_unresolved_ref: "harborwatch:STINT-1",
          edge_type: "intention_supersedes",
          story_slug: "harborwatch"
        }
      ]
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("intention records with null supersedes emit only holder edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-stint-null-supersedes-"));

  try {
    writeStoryIntention(root, "harborwatch", "STINT-1", [
      "id: STINT-1",
      "story_id: STORY-1",
      "created_at_page: PG-1",
      "supersedes: null",
      "holder: STENT-1",
      "intent: Keep the lantern lit.",
      "urgency: high",
      "expires_when: Dawn arrives."
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/intentions/STINT-1.yaml"
    );

    assert.deepEqual(
      intentionEdges(parsed.edges).map((edge) => ({
        target_unresolved_ref: edge.target_unresolved_ref,
        edge_type: edge.edge_type
      })),
      [
        {
          target_unresolved_ref: "harborwatch:STENT-1",
          edge_type: "intention_holder"
        }
      ]
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("intention supersession chains are walkable through supersedes edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-stint-chain-"));

  try {
    writeStoryIntention(root, "harborwatch", "STINT-1", [
      "id: STINT-1",
      "story_id: STORY-1",
      "created_at_page: PG-1",
      "supersedes: null",
      "holder: STENT-1",
      "intent: Hold the western door.",
      "urgency: low",
      "expires_when: A replacement order arrives."
    ]);
    writeStoryIntention(root, "harborwatch", "STINT-2", [
      "id: STINT-2",
      "story_id: STORY-1",
      "created_at_page: PG-2",
      "supersedes: STINT-1",
      "holder: STENT-1",
      "intent: Hold the western door with a partner.",
      "urgency: medium",
      "expires_when: A replacement order arrives."
    ]);
    writeStoryIntention(root, "harborwatch", "STINT-3", [
      "id: STINT-3",
      "story_id: STORY-1",
      "created_at_page: PG-3",
      "supersedes: STINT-2",
      "holder: STENT-1",
      "intent: Yield the door only to the harbor watch.",
      "urgency: high",
      "expires_when: The watch captain countersigns."
    ]);

    const parsed = ["STINT-1", "STINT-2", "STINT-3"].flatMap((intentionId) =>
      parseStoryBundleSourceFile(
        root,
        "fixture-world",
        `stories/harborwatch/_source/intentions/${intentionId}.yaml`
      ).edges
    );

    const supersessionTargetsBySource = new Map(
      intentionEdges(parsed)
        .filter((edge) => edge.edge_type === "intention_supersedes")
        .map((edge) => [edge.source_node_id, edge.target_unresolved_ref])
    );

    assert.equal(supersessionTargetsBySource.size, 2);
    assert.equal(supersessionTargetsBySource.get("harborwatch:STINT-3"), "harborwatch:STINT-2");
    assert.equal(supersessionTargetsBySource.get("harborwatch:STINT-2"), "harborwatch:STINT-1");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("status records emit entity edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-ststat-edges-"));

  try {
    writeStoryStatus(root, "harborwatch", "STSTAT-1", [
      "id: STSTAT-1",
      "story_id: STORY-1",
      "created_at_page: PG-3",
      "supersedes: null",
      "entity: STENT-1",
      "life: alive",
      "agency: free",
      "location: STLOC-1",
      "derived_from:",
      "  - SE-1"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/status/STSTAT-1.yaml"
    );

    assert.deepEqual(
      statusEdges(parsed.edges),
      [
        {
          source_node_id: "harborwatch:STSTAT-1",
          target_unresolved_ref: "harborwatch:STENT-1",
          edge_type: "status_entity",
          story_slug: "harborwatch"
        }
      ]
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("status records with empty entity emit no status edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-ststat-empty-"));

  try {
    writeStoryStatus(root, "harborwatch", "STSTAT-2", [
      "id: STSTAT-2",
      "story_id: STORY-1",
      "created_at_page: PG-3",
      "supersedes: null",
      "entity: ''",
      "life: unknown",
      "agency: unknown",
      "location: unknown",
      "derived_from: []"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/status/STSTAT-2.yaml"
    );

    assert.deepEqual(statusEdges(parsed.edges), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("clock records emit linked-record, driver, and tick-event edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-clock-edges-"));

  try {
    writeStoryClock(root, "harborwatch", "CLK-1", [
      "id: CLK-1",
      "story_id: STORY-1",
      "created_at_page: PG-4",
      "supersedes: null",
      "title: Harbor gate deadline",
      "clock_kind: deadline",
      "driver: STENT-1",
      "linked_records:",
      "  - OBL-1",
      "  - STQ-1",
      "value: 2",
      "max: 6",
      "salience: high",
      "visibility: public",
      "thresholds: []",
      "tick_history:",
      "  - event: SE-1",
      "    delta: 1",
      "    cause: The first bell rang.",
      "  - event: SE-2",
      "    delta: 1",
      "    cause: The tide turned.",
      "  - event: SE-3",
      "    delta: -1",
      "    cause: The watch bought time.",
      "status: active",
      "resolution_event: null"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/clocks/CLK-1.yaml"
    );

    assert.deepEqual(
      clockEdges(parsed.edges),
      [
        {
          source_node_id: "harborwatch:CLK-1",
          target_unresolved_ref: "harborwatch:OBL-1",
          edge_type: "clock_linked_record",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:CLK-1",
          target_unresolved_ref: "harborwatch:STQ-1",
          edge_type: "clock_linked_record",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:CLK-1",
          target_unresolved_ref: "harborwatch:STENT-1",
          edge_type: "clock_driver",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:CLK-1",
          target_unresolved_ref: "harborwatch:SE-1",
          edge_type: "clock_tick_event",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:CLK-1",
          target_unresolved_ref: "harborwatch:SE-2",
          edge_type: "clock_tick_event",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:CLK-1",
          target_unresolved_ref: "harborwatch:SE-3",
          edge_type: "clock_tick_event",
          story_slug: "harborwatch"
        }
      ]
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("clock records with empty nullable fields emit no clock edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-clock-empty-"));

  try {
    writeStoryClock(root, "harborwatch", "CLK-2", [
      "id: CLK-2",
      "story_id: STORY-1",
      "created_at_page: PG-4",
      "supersedes: null",
      "title: Empty clock",
      "clock_kind: danger",
      "driver: ''",
      "linked_records: []",
      "value: 0",
      "max: 4",
      "salience: low",
      "visibility: hidden",
      "thresholds: []",
      "tick_history: []",
      "status: paused",
      "resolution_event: null"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/clocks/CLK-2.yaml"
    );

    assert.deepEqual(clockEdges(parsed.edges), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("clock driver placeholders do not emit driver edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-clock-placeholder-"));

  try {
    for (const [index, driver] of ["system", "unknown", "group:watchmen"].entries()) {
      writeStoryClock(root, "harborwatch", `CLK-${index + 3}`, [
        `id: CLK-${index + 3}`,
        "story_id: STORY-1",
        "created_at_page: PG-4",
        "supersedes: null",
        `title: Placeholder clock ${index + 1}`,
        "clock_kind: faction",
        `driver: ${driver}`,
        "linked_records: []",
        "value: 1",
        "max: 4",
        "salience: medium",
        "visibility: factional",
        "thresholds: []",
        "tick_history: []",
        "status: active",
        "resolution_event: null"
      ]);
    }

    const parsed = ["CLK-3", "CLK-4", "CLK-5"].flatMap((clockId) =>
      parseStoryBundleSourceFile(
        root,
        "fixture-world",
        `stories/harborwatch/_source/clocks/${clockId}.yaml`
      ).edges
    );

    assert.deepEqual(clockEdges(parsed), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("secret records emit truth-anchor, holder, clue-carrier, and reveal-record edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-secret-edges-"));

  try {
    writeStorySecret(root, "harborwatch", "STSEC-1", [
      "id: STSEC-1",
      "story_id: STORY-1",
      "created_at_page: PG-5",
      "supersedes: null",
      "secret_kind: identity",
      "secret_claim: The bell keeper is the masked witness.",
      "truth_anchor: SF-1",
      "holders:",
      "  - STENT-1",
      "  - STENT-2",
      "salience: high",
      "protected_mystery_refs: []",
      "clue_carriers:",
      "  - kind: DA",
      "    record: DA-1",
      "    clue_text: The bell ledger has a hidden initial.",
      "    clue_strength: confirming",
      "    discovered_by:",
      "      - STENT-1",
      "    audience_visible: hidden",
      "    status: available",
      "  - kind: STOBJ",
      "    record: STOBJ-3",
      "    clue_text: A mask lies under the winch.",
      "    clue_strength: suggestive",
      "    discovered_by: []",
      "    audience_visible: ambiguous",
      "    status: discovered",
      "source_records:",
      "  - BEL-1",
      "status: hidden",
      "reveal_event: null",
      "reveal_records:",
      "  - BEL-2",
      "  - STQ-4"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/secrets/STSEC-1.yaml"
    );

    assert.deepEqual(
      secretEdges(parsed.edges),
      [
        {
          source_node_id: "harborwatch:STSEC-1",
          target_unresolved_ref: "harborwatch:SF-1",
          edge_type: "secret_truth_anchor",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:STSEC-1",
          target_unresolved_ref: "harborwatch:STENT-1",
          edge_type: "secret_holder",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:STSEC-1",
          target_unresolved_ref: "harborwatch:STENT-2",
          edge_type: "secret_holder",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:STSEC-1",
          target_unresolved_ref: "harborwatch:DA-1",
          edge_type: "secret_clue_carrier",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:STSEC-1",
          target_unresolved_ref: "harborwatch:STOBJ-3",
          edge_type: "secret_clue_carrier",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:STSEC-1",
          target_unresolved_ref: "harborwatch:BEL-2",
          edge_type: "secret_reveal_record",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:STSEC-1",
          target_unresolved_ref: "harborwatch:STQ-4",
          edge_type: "secret_reveal_record",
          story_slug: "harborwatch"
        }
      ]
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("secret records with empty nullable fields emit no secret edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-secret-empty-"));

  try {
    writeStorySecret(root, "harborwatch", "STSEC-2", [
      "id: STSEC-2",
      "story_id: STORY-1",
      "created_at_page: PG-5",
      "supersedes: null",
      "secret_kind: motive",
      "secret_claim: The watch motive remains unanchored.",
      "truth_anchor: null",
      "holders: []",
      "salience: low",
      "protected_mystery_refs: []",
      "clue_carriers: []",
      "source_records: []",
      "status: hidden",
      "reveal_event: null",
      "reveal_records: []"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/secrets/STSEC-2.yaml"
    );

    assert.deepEqual(secretEdges(parsed.edges), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("secret holder placeholders do not emit holder edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-secret-placeholder-"));

  try {
    writeStorySecret(root, "harborwatch", "STSEC-3", [
      "id: STSEC-3",
      "story_id: STORY-1",
      "created_at_page: PG-5",
      "supersedes: null",
      "secret_kind: institutional",
      "secret_claim: The harbor compact has a hidden clause.",
      "truth_anchor: null",
      "holders:",
      "  - group:foundlings",
      "  - narrator",
      "salience: medium",
      "protected_mystery_refs: []",
      "clue_carriers: []",
      "source_records: []",
      "status: hidden",
      "reveal_event: null",
      "reveal_records: []"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/secrets/STSEC-3.yaml"
    );

    assert.deepEqual(secretEdges(parsed.edges), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("secret holder placeholders are skipped while STENT holders still emit", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-secret-mixed-holder-"));

  try {
    writeStorySecret(root, "harborwatch", "STSEC-4", [
      "id: STSEC-4",
      "story_id: STORY-1",
      "created_at_page: PG-5",
      "supersedes: null",
      "secret_kind: artifact_truth",
      "secret_claim: The bell tongue is not original.",
      "truth_anchor: null",
      "holders:",
      "  - STENT-7",
      "  - group:foundlings",
      "  - narrator",
      "salience: medium",
      "protected_mystery_refs: []",
      "clue_carriers: []",
      "source_records: []",
      "status: hidden",
      "reveal_event: null",
      "reveal_records: []"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/secrets/STSEC-4.yaml"
    );

    assert.deepEqual(
      secretEdges(parsed.edges).map((edge) => ({
        target_unresolved_ref: edge.target_unresolved_ref,
        edge_type: edge.edge_type
      })),
      [
        {
          target_unresolved_ref: "harborwatch:STENT-7",
          edge_type: "secret_holder"
        }
      ]
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("story question records emit source, payoff, and answer edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-stq-edges-"));

  try {
    writeStoryQuestion(root, "harborwatch", "STQ-2", [
      "id: STQ-2",
      "story_id: STORY-1",
      "created_at_page: PG-6",
      "supersedes: null",
      "setup_kind: dramatic_question",
      "question_or_setup: Who opened the harbor gate?",
      "salience: high",
      "audience_visibility: explicit",
      "source_event: SE-2",
      "source_records:",
      "  - BEL-1",
      "  - STSEC-1",
      "payoff_of: STQ-1",
      "status: answered",
      "answer_event: SE-3",
      "answer_records:",
      "  - BEL-2",
      "  - DA-1",
      "abandonment_rationale: null"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/story-questions/STQ-2.yaml"
    );

    assert.deepEqual(
      questionEdges(parsed.edges),
      [
        {
          source_node_id: "harborwatch:STQ-2",
          target_unresolved_ref: "harborwatch:BEL-1",
          edge_type: "story_question_source",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:STQ-2",
          target_unresolved_ref: "harborwatch:STSEC-1",
          edge_type: "story_question_source",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:STQ-2",
          target_unresolved_ref: "harborwatch:STQ-1",
          edge_type: "story_question_payoff_of",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:STQ-2",
          target_unresolved_ref: "harborwatch:BEL-2",
          edge_type: "story_question_answer_record",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:STQ-2",
          target_unresolved_ref: "harborwatch:DA-1",
          edge_type: "story_question_answer_record",
          story_slug: "harborwatch"
        }
      ]
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("story question records with empty relation fields emit no question edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-stq-empty-"));

  try {
    writeStoryQuestion(root, "harborwatch", "STQ-3", [
      "id: STQ-3",
      "story_id: STORY-1",
      "created_at_page: PG-6",
      "supersedes: null",
      "setup_kind: setup",
      "question_or_setup: A quiet setup with no linked records.",
      "salience: low",
      "audience_visibility: hidden",
      "source_event: SE-2",
      "source_records: []",
      "payoff_of: null",
      "status: open",
      "answer_event: null",
      "answer_records: []",
      "abandonment_rationale: null"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/story-questions/STQ-3.yaml"
    );

    assert.deepEqual(questionEdges(parsed.edges), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("story question payoff chains are walkable through payoff edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-stq-chain-"));

  try {
    writeStoryQuestion(root, "harborwatch", "STQ-1", [
      "id: STQ-1",
      "story_id: STORY-1",
      "created_at_page: PG-5",
      "supersedes: null",
      "setup_kind: setup",
      "question_or_setup: A bell key goes missing.",
      "salience: medium",
      "audience_visibility: implied",
      "source_event: SE-1",
      "source_records:",
      "  - DA-1",
      "payoff_of: null",
      "status: open",
      "answer_event: null",
      "answer_records: []",
      "abandonment_rationale: null"
    ]);
    writeStoryQuestion(root, "harborwatch", "STQ-2", [
      "id: STQ-2",
      "story_id: STORY-1",
      "created_at_page: PG-6",
      "supersedes: null",
      "setup_kind: promise",
      "question_or_setup: The missing key is found in the bell room.",
      "salience: high",
      "audience_visibility: explicit",
      "source_event: SE-2",
      "source_records:",
      "  - BEL-2",
      "payoff_of: STQ-1",
      "status: paid_off",
      "answer_event: SE-3",
      "answer_records:",
      "  - SF-1",
      "abandonment_rationale: null"
    ]);

    const parsed = ["STQ-1", "STQ-2"].flatMap((questionId) =>
      parseStoryBundleSourceFile(
        root,
        "fixture-world",
        `stories/harborwatch/_source/story-questions/${questionId}.yaml`
      ).edges
    );

    const payoffEdges = questionEdges(parsed).filter((edge) => edge.edge_type === "story_question_payoff_of");

    assert.deepEqual(payoffEdges, [
      {
        source_node_id: "harborwatch:STQ-2",
        target_unresolved_ref: "harborwatch:STQ-1",
        edge_type: "story_question_payoff_of",
        story_slug: "harborwatch"
      }
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("story event records emit actor, target, selected-storylet, and existing event edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-se-edges-"));

  try {
    writeStoryEvent(root, "harborwatch", "SE-1", [
      "id: SE-1",
      "story_id: STORY-1",
      "created_at_page: PG-7",
      "parent_page_id: PG-6",
      "event_kind: selected_choice",
      "actor: STENT-1",
      "targets:",
      "  - STENT-2",
      "  - STLOC-1",
      "  - STOBJ-1",
      "commitment:",
      "  selected_slt_id: SLT-4",
      "  selection_source: emitted_choice",
      "  alias_bindings:",
      "    actor: STENT-1",
      "outcome_route: accept",
      "resolution:",
      "  result: success",
      "  player_visible_feedback: The harbor watch moves.",
      "world_logic_rationale: >-",
      "  STQ-4 is introduced by the structured record_introductions field.",
      "record_introductions:",
      "  - record_id: STQ-4",
      "    class: STQ",
      "    trigger: explicit_question_raised",
      "    evidence:",
      "      - PG-7",
      "      - SE-0",
      "    distinct_from: []",
      "state_delta:",
      "  create:",
      "    - BEL-3",
      "  supersede:",
      "    - STSTAT-1",
      "  close: []",
      "promotion_claims: []"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/events/SE-1.yaml"
    );

    assert.deepEqual(
      eventEdges(parsed.edges),
      [
        {
          source_node_id: "harborwatch:SE-1",
          target_unresolved_ref: "harborwatch:STENT-1",
          edge_type: "event_actor",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:SE-1",
          target_unresolved_ref: "harborwatch:STENT-2",
          edge_type: "event_target",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:SE-1",
          target_unresolved_ref: "harborwatch:STLOC-1",
          edge_type: "event_target",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:SE-1",
          target_unresolved_ref: "harborwatch:STOBJ-1",
          edge_type: "event_target",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:SE-1",
          target_unresolved_ref: "harborwatch:SLT-4",
          edge_type: "event_selected_storylet",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:SE-1",
          target_unresolved_ref: "harborwatch:BEL-3",
          edge_type: "state_delta_create",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:SE-1",
          target_unresolved_ref: "harborwatch:STSTAT-1",
          edge_type: "state_delta_supersede",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:STQ-4",
          target_unresolved_ref: "harborwatch:PG-7",
          edge_type: "creation_evidence",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:STQ-4",
          target_unresolved_ref: "harborwatch:SE-0",
          edge_type: "creation_evidence",
          story_slug: "harborwatch"
        }
      ]
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("story event records skip placeholder actors and null selected storylets", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-se-placeholder-"));

  try {
    for (const [index, actor] of ["system", "unknown"].entries()) {
      writeStoryEvent(root, "harborwatch", `SE-${index + 2}`, [
        `id: SE-${index + 2}`,
        "story_id: STORY-1",
        "created_at_page: PG-7",
        "parent_page_id: null",
        "event_kind: story_start",
        `actor: ${actor}`,
        "targets: []",
        "commitment:",
        "  selected_slt_id: null",
        "  selection_source: none",
        "  alias_bindings: {}",
        "outcome_route: accept",
        "resolution:",
        "  result: success",
        "  player_visible_feedback: The story starts.",
        "world_logic_rationale: No structured introductions in this event.",
        "state_delta:",
        "  create: []",
        "  supersede: []",
        "  close: []",
        "promotion_claims: []"
      ]);
    }

    const parsed = ["SE-2", "SE-3"].flatMap((eventId) =>
      parseStoryBundleSourceFile(root, "fixture-world", `stories/harborwatch/_source/events/${eventId}.yaml`).edges
    );

    assert.deepEqual(eventEdges(parsed), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function beliefEdges(edges: Array<{ edge_type: string; source_node_id: string; target_unresolved_ref: string | null; story_slug?: string | null }>): Array<{
  source_node_id: string;
  target_unresolved_ref: string | null;
  edge_type: string;
  story_slug: string | null;
}> {
  return edges
    .filter((edge) => edge.edge_type.startsWith("belief_"))
    .map((edge) => ({
      source_node_id: edge.source_node_id,
      target_unresolved_ref: edge.target_unresolved_ref,
      edge_type: edge.edge_type,
      story_slug: edge.story_slug ?? null
    }));
}

function relationshipEdges(edges: Array<{ edge_type: string; source_node_id: string; target_unresolved_ref: string | null; story_slug?: string | null }>): Array<{
  source_node_id: string;
  target_unresolved_ref: string | null;
  edge_type: string;
  story_slug: string | null;
}> {
  return edges
    .filter((edge) => edge.edge_type.startsWith("relationship_"))
    .map((edge) => ({
      source_node_id: edge.source_node_id,
      target_unresolved_ref: edge.target_unresolved_ref,
      edge_type: edge.edge_type,
      story_slug: edge.story_slug ?? null
    }));
}

function intentionEdges(edges: Array<{ edge_type: string; source_node_id: string; target_unresolved_ref: string | null; story_slug?: string | null }>): Array<{
  source_node_id: string;
  target_unresolved_ref: string | null;
  edge_type: string;
  story_slug: string | null;
}> {
  return edges
    .filter((edge) => edge.edge_type.startsWith("intention_"))
    .map((edge) => ({
      source_node_id: edge.source_node_id,
      target_unresolved_ref: edge.target_unresolved_ref,
      edge_type: edge.edge_type,
      story_slug: edge.story_slug ?? null
    }));
}

function statusEdges(edges: Array<{ edge_type: string; source_node_id: string; target_unresolved_ref: string | null; story_slug?: string | null }>): Array<{
  source_node_id: string;
  target_unresolved_ref: string | null;
  edge_type: string;
  story_slug: string | null;
}> {
  return edges
    .filter((edge) => edge.edge_type.startsWith("status_"))
    .map((edge) => ({
      source_node_id: edge.source_node_id,
      target_unresolved_ref: edge.target_unresolved_ref,
      edge_type: edge.edge_type,
      story_slug: edge.story_slug ?? null
    }));
}

function clockEdges(edges: Array<{ edge_type: string; source_node_id: string; target_unresolved_ref: string | null; story_slug?: string | null }>): Array<{
  source_node_id: string;
  target_unresolved_ref: string | null;
  edge_type: string;
  story_slug: string | null;
}> {
  return edges
    .filter((edge) => edge.edge_type.startsWith("clock_"))
    .map((edge) => ({
      source_node_id: edge.source_node_id,
      target_unresolved_ref: edge.target_unresolved_ref,
      edge_type: edge.edge_type,
      story_slug: edge.story_slug ?? null
    }));
}

function secretEdges(edges: Array<{ edge_type: string; source_node_id: string; target_unresolved_ref: string | null; story_slug?: string | null }>): Array<{
  source_node_id: string;
  target_unresolved_ref: string | null;
  edge_type: string;
  story_slug: string | null;
}> {
  return edges
    .filter((edge) => edge.edge_type.startsWith("secret_"))
    .map((edge) => ({
      source_node_id: edge.source_node_id,
      target_unresolved_ref: edge.target_unresolved_ref,
      edge_type: edge.edge_type,
      story_slug: edge.story_slug ?? null
    }));
}

function questionEdges(edges: Array<{ edge_type: string; source_node_id: string; target_unresolved_ref: string | null; story_slug?: string | null }>): Array<{
  source_node_id: string;
  target_unresolved_ref: string | null;
  edge_type: string;
  story_slug: string | null;
}> {
  return edges
    .filter((edge) => edge.edge_type.startsWith("story_question_"))
    .map((edge) => ({
      source_node_id: edge.source_node_id,
      target_unresolved_ref: edge.target_unresolved_ref,
      edge_type: edge.edge_type,
      story_slug: edge.story_slug ?? null
    }));
}

function eventEdges(edges: Array<{ edge_type: string; source_node_id: string; target_unresolved_ref: string | null; story_slug?: string | null }>): Array<{
  source_node_id: string;
  target_unresolved_ref: string | null;
  edge_type: string;
  story_slug: string | null;
}> {
  return edges
    .filter(
      (edge) =>
        edge.edge_type.startsWith("event_") ||
        edge.edge_type.startsWith("state_delta_") ||
        edge.edge_type === "creation_evidence"
    )
    .map((edge) => ({
      source_node_id: edge.source_node_id,
      target_unresolved_ref: edge.target_unresolved_ref,
      edge_type: edge.edge_type,
      story_slug: edge.story_slug ?? null
    }));
}

function writeStoryBelief(root: string, storySlug: string, beliefId: string, lines: string[]): void {
  const relativeDirectory = path.join(
    root,
    "worlds",
    "fixture-world",
    "stories",
    storySlug,
    "_source",
    "beliefs"
  );
  mkdirSync(relativeDirectory, { recursive: true });
  writeFileSync(path.join(relativeDirectory, `${beliefId}.yaml`), `${lines.join("\n")}\n`, "utf8");
}

function writeStoryRelationship(root: string, storySlug: string, relationshipId: string, lines: string[]): void {
  const relativeDirectory = path.join(
    root,
    "worlds",
    "fixture-world",
    "stories",
    storySlug,
    "_source",
    "relationships"
  );
  mkdirSync(relativeDirectory, { recursive: true });
  writeFileSync(path.join(relativeDirectory, `${relationshipId}.yaml`), `${lines.join("\n")}\n`, "utf8");
}

function writeStoryIntention(root: string, storySlug: string, intentionId: string, lines: string[]): void {
  const relativeDirectory = path.join(
    root,
    "worlds",
    "fixture-world",
    "stories",
    storySlug,
    "_source",
    "intentions"
  );
  mkdirSync(relativeDirectory, { recursive: true });
  writeFileSync(path.join(relativeDirectory, `${intentionId}.yaml`), `${lines.join("\n")}\n`, "utf8");
}

function writeStoryStatus(root: string, storySlug: string, statusId: string, lines: string[]): void {
  const relativeDirectory = path.join(
    root,
    "worlds",
    "fixture-world",
    "stories",
    storySlug,
    "_source",
    "status"
  );
  mkdirSync(relativeDirectory, { recursive: true });
  writeFileSync(path.join(relativeDirectory, `${statusId}.yaml`), `${lines.join("\n")}\n`, "utf8");
}

function writeStoryClock(root: string, storySlug: string, clockId: string, lines: string[]): void {
  const relativeDirectory = path.join(
    root,
    "worlds",
    "fixture-world",
    "stories",
    storySlug,
    "_source",
    "clocks"
  );
  mkdirSync(relativeDirectory, { recursive: true });
  writeFileSync(path.join(relativeDirectory, `${clockId}.yaml`), `${lines.join("\n")}\n`, "utf8");
}

function writeStorySecret(root: string, storySlug: string, secretId: string, lines: string[]): void {
  const relativeDirectory = path.join(
    root,
    "worlds",
    "fixture-world",
    "stories",
    storySlug,
    "_source",
    "secrets"
  );
  mkdirSync(relativeDirectory, { recursive: true });
  writeFileSync(path.join(relativeDirectory, `${secretId}.yaml`), `${lines.join("\n")}\n`, "utf8");
}

function writeStoryQuestion(root: string, storySlug: string, questionId: string, lines: string[]): void {
  const relativeDirectory = path.join(
    root,
    "worlds",
    "fixture-world",
    "stories",
    storySlug,
    "_source",
    "story-questions"
  );
  mkdirSync(relativeDirectory, { recursive: true });
  writeFileSync(path.join(relativeDirectory, `${questionId}.yaml`), `${lines.join("\n")}\n`, "utf8");
}

function writeStoryEvent(root: string, storySlug: string, eventId: string, lines: string[]): void {
  const relativeDirectory = path.join(root, "worlds", "fixture-world", "stories", storySlug, "_source", "events");
  mkdirSync(relativeDirectory, { recursive: true });
  writeFileSync(path.join(relativeDirectory, `${eventId}.yaml`), `${lines.join("\n")}\n`, "utf8");
}
