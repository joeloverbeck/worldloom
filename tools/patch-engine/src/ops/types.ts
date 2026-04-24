import type Database from "better-sqlite3";

import type { OperationKind } from "../envelope/schema.js";

export interface OpContext {
  worldRoot: string;
  db: Database.Database;
}

export interface StagedWrite {
  target_file_path: string;
  temp_file_path: string;
  new_content: string;
  new_hash: string;
  op_kind: OperationKind;
  noop?: boolean;
}
