import { requiresExceptionGovernance } from "../structural/record-schema-compliance.js";
import { asPlainRecord } from "../structural/utils.js";
import type { Context, Validator, Verdict } from "../framework/types.js";
import { appliesToCanonFacts, fail, queryCanonFacts, recordIdFrom } from "./_shared/rule-utils.js";

const VALIDATOR = "rule11_action_space";

export const PERMISSIBLE_LEVERAGE_FORMS = [
  "locality",
  "secrecy",
  "legitimacy",
  "bureaucracy",
  "numbers",
  "ritual_authority",
  "domain_expertise",
  "access",
  "timing",
  "social_trust",
  "deniability",
  "infrastructural_control"
] as const;

const PERMISSIBLE = new Set<string>(PERMISSIBLE_LEVERAGE_FORMS);

export const rule11ActionSpace: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: appliesToCanonFacts,
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const verdicts: Verdict[] = [];

    for (const record of await queryCanonFacts(ctx)) {
      const parsed = asPlainRecord(record.parsed);
      const cfId = recordIdFrom(record);
      const type = typeof parsed.type === "string" ? parsed.type : "";

      if (!requiresExceptionGovernance(type)) {
        continue;
      }

      const exceptionGovernance = asPlainRecord(parsed.exception_governance);
      if (Object.keys(exceptionGovernance).length === 0) {
        // Historical CFs without SPEC-09 blocks are grandfathered in full-world mode.
        continue;
      }
      if (exceptionGovernance.n_a !== undefined) {
        continue;
      }

      const notes = typeof parsed.notes === "string" ? parsed.notes : "";
      const leverage = leverageEntriesFromNotes(notes);

      if (leverage.invalid.length > 0) {
        verdicts.push(
          fail(
            VALIDATOR,
            "rule11.invalid_leverage_form",
            `${cfId} Rule 11 leverage entries must use permissible forms; invalid: ${leverage.invalid.join(", ")}`,
            record
          )
        );
      }

      if (leverage.valid.size < 3) {
        verdicts.push(
          fail(
            VALIDATOR,
            "rule11.insufficient_leverage_forms",
            `${cfId} Rule 11 requires at least 3 ordinary-actor leverage forms; found ${leverage.valid.size} in cf.notes`,
            record
          )
        );
      }
    }

    return verdicts;
  }
};

function leverageEntriesFromNotes(notes: string): { valid: Set<string>; invalid: string[] } {
  const labeledEntries = notes
    .split(/\r?\n/)
    .filter((line) => /\bleverage\b/i.test(line))
    .flatMap((line) => {
      const afterLabel = line.includes(":") ? line.slice(line.indexOf(":") + 1) : line;
      return afterLabel.split(/[,;|]/).map((entry) => entry.trim()).filter(Boolean);
    });

  if (labeledEntries.length > 0) {
    const valid = new Set<string>();
    const invalid: string[] = [];
    for (const entry of labeledEntries) {
      const normalized = normalizeLeverage(entry);
      if (PERMISSIBLE.has(normalized)) {
        valid.add(normalized);
      } else {
        invalid.push(entry);
      }
    }
    return { valid, invalid };
  }

  return { valid: new Set<string>(), invalid: [] };
}

function normalizeLeverage(value: string): string {
  return value
    .toLowerCase()
    .replace(/[-\s]+/g, "_")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
