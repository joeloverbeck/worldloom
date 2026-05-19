import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { locationFor, queryStructuralRecords, stringValue, touchedFilesInclude } from "./utils.js";
import { readSeNonPropagationFacts } from "./midstory-introduction-utils.js";

const VALIDATOR = "non_propagation_facts_completeness";
const REASON_TOKEN_PATTERN =
  /\b(no_witness|witness_incapacitated|evidence_concealed|institution_suppresses_report|event_leaves_no_accessible_trace)\b/g;

export const nonPropagationFactsCompleteness: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => patch.op === "create_se_record") === true ||
    touchedFilesInclude(ctx, /^stories\/[^/]+\/_source\/events\/SE-\d+\.yaml$/),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const verdicts: Verdict[] = [];

    for (const event of records.filter((record) => record.node_type === "story_event_record")) {
      verdicts.push(...validateEvent(event));
    }

    return verdicts;
  }
};

function validateEvent(event: IndexedRecord): Verdict[] {
  const rationale = stringValue(event.parsed.world_logic_rationale);
  if (rationale === undefined) {
    return [];
  }

  const facts = readSeNonPropagationFacts(event);
  const coveredReasons = new Set<string>(facts.map((fact) => fact.reason));
  const missingReasons = new Set<string>();
  for (const match of rationale.matchAll(REASON_TOKEN_PATTERN)) {
    const reason = match[1];
    if (reason !== undefined && !coveredReasons.has(reason)) {
      missingReasons.add(reason);
    }
  }

  return [...missingReasons].map((reason) => missing(event, reason));
}

function missing(event: IndexedRecord, reason: string): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code: "non_propagation_facts_completeness.missing_structured_entry",
    message: `${event.node_id} names non-propagation reason ${reason} without a matching SE.non_propagation_facts[] entry.`,
    location: locationFor(event),
    detail: { reason },
    suggested_fix:
      "Add an SE.non_propagation_facts[] entry with reason=<reason>, group=<witness-group>, records=[<record_ids>]."
  };
}
