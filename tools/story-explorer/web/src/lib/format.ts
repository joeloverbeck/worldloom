export function formatTurnIndex(n: number): string {
  return `Turn ${n}`;
}

export function formatPageStatusStrip(pageId: string, branchId: string, turnIndex: number): string {
  return `${pageId} · Branch ${branchId} · ${formatTurnIndex(turnIndex)}`;
}

export function formatBranchPath(branchPath: string[]): string {
  return branchPath.join(' → ');
}
