import type { Verdict } from "../framework/types.js";
import { asPlainRecord } from "./utils.js";
import {
  CARRIER_TYPES,
  carrierRecord,
  clueCarriers,
  defineSecretValidator,
  fail,
  isInSecretBranch
} from "./secret-utils.js";

const VALIDATOR = "secret_carrier_existence";

export const secretCarrierExistence = defineSecretValidator(VALIDATOR, (secret, _ctx, records): Verdict[] => {
  const verdicts: Verdict[] = [];
  for (const carrier of clueCarriers(secret)) {
    if (carrier.kind === undefined || CARRIER_TYPES[carrier.kind] === undefined) {
      verdicts.push(fail(secret, VALIDATOR, "secret_carrier_existence.invalid_kind", `clue_carriers[${carrier.index}].kind must be one of ${Object.keys(CARRIER_TYPES).join(", ")}.`));
      continue;
    }
    if (carrier.record === undefined) {
      verdicts.push(fail(secret, VALIDATOR, "secret_carrier_existence.missing_record", `clue_carriers[${carrier.index}].record must name a ${carrier.kind} record.`));
      continue;
    }
    if (!carrier.record.startsWith(`${carrier.kind}-`)) {
      verdicts.push(fail(secret, VALIDATOR, "secret_carrier_existence.kind_mismatch", `clue_carriers[${carrier.index}] declares kind ${carrier.kind} but references ${carrier.record}.`, { kind: carrier.kind, record: carrier.record }));
      continue;
    }
    const target = carrierRecord(records, secret, carrier);
    if (target === undefined) {
      verdicts.push(fail(secret, VALIDATOR, "secret_carrier_existence.missing_record", `clue_carriers[${carrier.index}].record references missing ${carrier.record}.`, { kind: carrier.kind, record: carrier.record }));
      continue;
    }
    if (!isInSecretBranch(secret, target, records.pagesById)) {
      verdicts.push(fail(secret, VALIDATOR, "secret_carrier_existence.branch_inactive_record", `clue_carriers[${carrier.index}].record ${carrier.record} is not in the branch path for ${String(asPlainRecord(secret.parsed).created_at_page)}.`, { record: carrier.record }));
    }
  }
  return verdicts;
});
