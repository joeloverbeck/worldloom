import { withIndexFreshnessGuard } from "../context-packet/freshness-guard.js";
import { createMcpError, type McpError } from "../errors.js";

import {
  allocateNextIdWithOffset,
  type AllocateNextIdArgs,
  type IdClass
} from "./allocate-next-id.js";

export interface AllocationRequest {
  id_class: IdClass;
  story_slug?: string;
  audit_id?: string;
}

export interface AllocateManyIdsArgs {
  world_slug: string;
  allocations: AllocationRequest[];
}

export interface AllocatedId {
  id_class: IdClass;
  allocated_id: string;
}

export interface AllocateManyIdsResponse {
  allocations: AllocatedId[];
}

function scopeKey(worldSlug: string, allocation: AllocationRequest): string {
  const storySlug = allocation.story_slug?.trim() ?? "";
  const auditId = allocation.audit_id?.trim() ?? "";
  return [worldSlug, allocation.id_class, storySlug, auditId].join("\u0000");
}

async function allocateManyIdsImpl(
  args: AllocateManyIdsArgs
): Promise<AllocateManyIdsResponse | McpError> {
  const successfulAllocations: AllocatedId[] = [];
  const offsetsByScope = new Map<string, number>();

  for (const allocation of args.allocations) {
    const key = scopeKey(args.world_slug, allocation);
    const offset = offsetsByScope.get(key) ?? 0;
    const singleArgs: AllocateNextIdArgs = {
      world_slug: args.world_slug,
      id_class: allocation.id_class
    };

    if (allocation.story_slug !== undefined) {
      singleArgs.story_slug = allocation.story_slug;
    }

    if (allocation.audit_id !== undefined) {
      singleArgs.audit_id = allocation.audit_id;
    }

    const result = await allocateNextIdWithOffset(singleArgs, offset);

    if ("code" in result) {
      return createMcpError(result.code, result.message, {
        ...result.details,
        failed_allocation_index: successfulAllocations.length,
        successful_allocations: successfulAllocations
      });
    }

    successfulAllocations.push({
      id_class: allocation.id_class,
      allocated_id: result.next_id
    });
    offsetsByScope.set(key, offset + 1);
  }

  return { allocations: successfulAllocations };
}

export const allocateManyIds = withIndexFreshnessGuard(allocateManyIdsImpl);
