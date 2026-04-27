import { asPlainRecord, nestedRecords, stringArray } from "../structural/utils.js";
import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { appliesToCanonFacts, fail, queryCanonFacts, recordIdFrom } from "./_shared/rule-utils.js";

const VALIDATOR = "rule12_redundancy";

export const TRACE_REGISTERS = [
  "law",
  "ritual",
  "architecture",
  "slang",
  "ledgers",
  "funerary",
  "landscape",
  "bodily_scars",
  "supply_chains",
  "songs",
  "maps",
  "educational_customs",
  "bureaucratic_forms"
] as const;

const REGISTER_ALIASES: Readonly<Record<string, string>> = {
  law: "law",
  legal: "law",
  ritual: "ritual",
  architecture: "architecture",
  architectural: "architecture",
  slang: "slang",
  idiom: "slang",
  idioms: "slang",
  ledger: "ledgers",
  ledgers: "ledgers",
  funerary: "funerary",
  funeral: "funerary",
  landscape: "landscape",
  "bodily scar": "bodily_scars",
  "bodily scars": "bodily_scars",
  bodily_scar: "bodily_scars",
  bodily_scars: "bodily_scars",
  scar: "bodily_scars",
  scars: "bodily_scars",
  "supply chain": "supply_chains",
  "supply chains": "supply_chains",
  supply_chain: "supply_chains",
  supply_chains: "supply_chains",
  song: "songs",
  songs: "songs",
  map: "maps",
  maps: "maps",
  "educational custom": "educational_customs",
  "educational customs": "educational_customs",
  educational_custom: "educational_customs",
  educational_customs: "educational_customs",
  "bureaucratic form": "bureaucratic_forms",
  "bureaucratic forms": "bureaucratic_forms",
  bureaucratic_form: "bureaucratic_forms",
  bureaucratic_forms: "bureaucratic_forms"
};

export const rule12Redundancy: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: appliesToCanonFacts,
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const [canonFacts, sections] = await Promise.all([
      queryCanonFacts(ctx),
      ctx.index.query({ record_type: "section", world_slug: ctx.world_slug })
    ]);
    const verdicts: Verdict[] = [];

    for (const record of canonFacts) {
      const parsed = asPlainRecord(record.parsed);
      const cfId = recordIdFrom(record);

      if (!isHardCanonCoreTruth(parsed)) {
        continue;
      }
      if (!hasCanonSafetyBlock(parsed)) {
        // Historical CFs without SPEC-09 blocks are grandfathered in full-world mode.
        continue;
      }
      if (hasMysteryReserveDerivedFrom(parsed)) {
        continue;
      }

      const registers = traceRegistersForCf(cfId, sections);
      if (registers.size < 2) {
        verdicts.push(
          fail(
            VALIDATOR,
            "rule12.insufficient_trace_registers",
            `${cfId} Rule 12 requires at least 2 distinct trace registers; found ${registers.size}`,
            record
          )
        );
      }
    }

    return verdicts;
  }
};

function isHardCanonCoreTruth(parsed: Record<string, unknown>): boolean {
  const truthScope = asPlainRecord(parsed.truth_scope);
  return parsed.status === "hard_canon" && truthScope.world_level === true;
}

function hasCanonSafetyBlock(parsed: Record<string, unknown>): boolean {
  return parsed.epistemic_profile !== undefined || parsed.exception_governance !== undefined;
}

function hasMysteryReserveDerivedFrom(parsed: Record<string, unknown>): boolean {
  const sourceBasis = asPlainRecord(parsed.source_basis);
  return stringArray(sourceBasis.derived_from).some((source) => /\bM-\d+\b/.test(source));
}

function traceRegistersForCf(cfId: string, sections: IndexedRecord[]): Set<string> {
  const registers = new Set<string>();

  for (const section of sections) {
    const parsed = asPlainRecord(section.parsed);
    if (!sectionTouchesCf(parsed, cfId)) {
      continue;
    }

    for (const text of sectionTexts(parsed)) {
      for (const register of registersInText(text)) {
        registers.add(register);
      }
    }
  }

  return registers;
}

function sectionTouchesCf(parsed: Record<string, unknown>, cfId: string): boolean {
  if (stringArray(parsed.touched_by_cf).includes(cfId)) {
    return true;
  }
  return nestedRecords(parsed, "extensions").some((extension) => extension.originating_cf === cfId);
}

function sectionTexts(parsed: Record<string, unknown>): string[] {
  const texts = [parsed.heading, parsed.body].filter((value): value is string => typeof value === "string");
  for (const extension of nestedRecords(parsed, "extensions")) {
    for (const value of [extension.label, extension.body]) {
      if (typeof value === "string") {
        texts.push(value);
      }
    }
  }
  return texts;
}

function registersInText(text: string): Set<string> {
  const registers = new Set<string>();
  const normalized = text.toLowerCase().replace(/[-_]+/g, " ");

  for (const [alias, register] of Object.entries(REGISTER_ALIASES)) {
    const phrase = alias.replace(/[-_]+/g, " ");
    if (new RegExp(`\\b${escapeRegex(phrase)}\\b`).test(normalized)) {
      registers.add(register);
    }
  }

  const otherMatches = normalized.matchAll(/\bother(?:\s+named)?\s+register\s*[:=]\s*([a-z][a-z0-9 -]{1,60})/g);
  for (const match of otherMatches) {
    const name = match[1]?.trim().replace(/\s+/g, "_");
    if (name) {
      registers.add(`other:${name}`);
    }
  }

  return registers;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
