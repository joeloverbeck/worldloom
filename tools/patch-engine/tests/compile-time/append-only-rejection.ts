import type { PatchOperation } from "../../src/envelope/schema.js";

const badReplace: PatchOperation = {
  op: "replace_cf_record",
  target_world: "minimal-world",
  target_record_id: "CF-0001",
  payload: {}
};

const badDelete: PatchOperation = {
  op: "delete_cf_record",
  target_world: "minimal-world",
  target_record_id: "CF-0001",
  payload: {}
};

const badAnchorInsert: PatchOperation = {
  op: "insert_before_node",
  target_world: "minimal-world",
  target_record_id: "SEC-ELF-001",
  payload: {}
};

void [badReplace, badDelete, badAnchorInsert];
