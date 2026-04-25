import type { Context, Validator, Verdict } from "../framework/types.js";
import { queryStructuralRecords } from "./utils.js";

export const idUniqueness: Validator = {
  name: "id_uniqueness",
  severity_mode: "fail",
  applies_to: () => true,
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const byClassAndId = new Map<string, typeof records>();

    for (const record of records) {
      const key = `${record.node_type}:${record.node_id}`;
      const bucket = byClassAndId.get(key) ?? [];
      bucket.push(record);
      byClassAndId.set(key, bucket);
    }

    const verdicts: Verdict[] = [];
    for (const duplicates of byClassAndId.values()) {
      if (duplicates.length < 2) {
        continue;
      }
      const [first, ...rest] = duplicates;
      for (const duplicate of rest) {
        verdicts.push({
          validator: "id_uniqueness",
          severity: "fail",
          code: "id_uniqueness.duplicate",
          message: `${duplicate.node_id} is duplicated within ${duplicate.node_type}: ${first?.file_path ?? "unknown"} and ${duplicate.file_path}`,
          location: {
            file: duplicate.file_path,
            node_id: duplicate.node_id
          }
        });
      }
    }

    return verdicts;
  }
};
