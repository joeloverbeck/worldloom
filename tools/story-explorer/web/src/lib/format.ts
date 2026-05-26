import type { ProseStatus } from '../api/client';

export function formatTurnIndex(n: number): string {
  return `Turn ${n}`;
}

export function formatPageStatusStrip(pageId: string, branchId: string, turnIndex: number): string {
  return `${pageId} · Branch ${branchId} · ${formatTurnIndex(turnIndex)}`;
}

export function formatBranchPath(branchPath: string[]): string {
  return branchPath.join(' → ');
}

export function formatProseStatus(status: ProseStatus): string {
  switch (status) {
    case 'present':
      return 'Prose attached';
    case 'missing':
      return 'Rendered prose not attached yet';
    case 'unreadable':
      return 'Prose file unreadable';
    case 'hash_mismatch':
      return 'Prose receipt hash mismatch';
  }
}
