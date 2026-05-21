import type { Context, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, queryStructuralRecords } from "./utils.js";

const CANON_FACT_NODE_TYPE = "canon_fact_record";

export const approvalSemantics: Validator = {
  name: "approval_semantics",
  severity_mode: "fail",
  applies_to: () => true,
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const verdicts: Verdict[] = [];
    const records = await queryStructuralRecords(ctx);

    for (const record of records) {
      if (record.node_type === CANON_FACT_NODE_TYPE) {
        continue;
      }

      const sourceBasis = asPlainRecord(asPlainRecord(record.parsed).source_basis);
      if (Object.prototype.hasOwnProperty.call(sourceBasis, "direct_user_approval")) {
        verdicts.push({
          validator: "approval_semantics",
          severity: "fail",
          code: "approval_semantics.direct_user_approval_reserved",
          message: `${record.node_id} uses source_basis.direct_user_approval, which is reserved for accepted canon_fact_record records; use source_basis.user_approved for proposal-side approval state.`,
          location: {
            file: record.file_path,
            node_id: record.node_id
          }
        });
      }
    }

    return verdicts;
  }
};
