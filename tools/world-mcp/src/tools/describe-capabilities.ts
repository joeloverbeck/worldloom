import type { BuildInfo } from "../build-info.js";

export interface ToolCapability {
  name: string;
  description: string;
  input_schema_enums: Record<string, readonly string[]>;
}

export interface DescribeCapabilitiesResponse {
  build_info: BuildInfo;
  tools: Array<{
    name: string;
    description: string;
    input_schema_enums: Record<string, string[]>;
  }>;
}

export function describeCapabilities(args: {
  buildInfo: BuildInfo;
  tools: readonly ToolCapability[];
}): DescribeCapabilitiesResponse {
  return {
    build_info: { ...args.buildInfo },
    tools: args.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema_enums: Object.fromEntries(
        Object.entries(tool.input_schema_enums).map(([field, values]) => [field, [...values]])
      )
    }))
  };
}
