export const MCP_ERROR_CODES = [
  "invalid_input",
  "index_missing",
  "index_version_mismatch",
  "stale_index",
  "empty_index",
  "world_not_found",
  "node_not_found",
  "record_not_found",
  "record_field_not_found",
  "token_invalid",
  "token_expired",
  "token_consumed",
  "token_tampered",
  "packet_incomplete_required_classes",
  "anchor_drift",
  "validator_unavailable"
] as const;

export type McpErrorCode = (typeof MCP_ERROR_CODES)[number];

export interface McpError {
  code: McpErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export function createMcpError(
  code: McpErrorCode,
  message: string,
  details?: Record<string, unknown>
): McpError {
  return details === undefined ? { code, message } : { code, message, details };
}
