import type { Verdict } from "../framework/types.js";
import { asPlainRecord, stringArray, stringValue } from "./utils.js";
import { defineSecretValidator, fail } from "./secret-utils.js";

const VALIDATOR = "secret_mystery_firewall_compliance";

export const secretMysteryFirewallCompliance = defineSecretValidator(VALIDATOR, (secret, _ctx, records): Verdict[] => {
  const parsed = asPlainRecord(secret.parsed);
  const refs = stringArray(parsed.protected_mystery_refs);
  const status = stringValue(parsed.status);
  const verdicts: Verdict[] = [];

  for (const [index, mysteryId] of refs.entries()) {
    const mystery = records.mysteriesById.get(mysteryId);
    if (mystery === undefined) {
      verdicts.push(fail(secret, VALIDATOR, "secret_mystery_firewall_compliance.missing_mystery", `protected_mystery_refs[${index}] references missing ${mysteryId}.`, { mystery_ref: mysteryId }));
      continue;
    }
    const mysteryStatus = stringValue(asPlainRecord(mystery.parsed).status);
    if (status === "revealed" && mysteryStatus === "forbidden") {
      verdicts.push(fail(secret, VALIDATOR, "secret_mystery_firewall_compliance.forbidden_mystery_revealed", `revealed STSEC may not resolve forbidden Mystery Reserve entry ${mysteryId}.`, { mystery_ref: mysteryId }));
    }
  }

  return verdicts;
});
