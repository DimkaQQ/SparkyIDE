/** Line-level change summary between two workspace snapshots. */

export type ChangeStatus = 'added' | 'modified' | 'deleted';

export interface FileChange {
  path: string;
  status: ChangeStatus;
  added: number;
  removed: number;
}

const LCS_BUDGET = 1_000_000;

function commonPrefix(a: string[], b: string[]): number {
  const limit = Math.min(a.length, b.length);
  let index = 0;
  while (index < limit && a[index] === b[index]) index += 1;
  return index;
}

function commonSuffix(a: string[], b: string[], skip: number): number {
  const limit = Math.min(a.length, b.length) - skip;
  let count = 0;
  while (count < limit && a[a.length - 1 - count] === b[b.length - 1 - count]) count += 1;
  return count;
}

function lcsLength(a: string[], b: string[]): number {
  const width = b.length;
  let previous = new Uint32Array(width + 1);
  let current = new Uint32Array(width + 1);
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= width; j += 1) {
      current[j] =
        a[i - 1] === b[j - 1]
          ? previous[j - 1] + 1
          : previous[j] >= current[j - 1]
            ? previous[j]
            : current[j - 1];
    }
    const swap = previous;
    previous = current;
    current = swap;
    current.fill(0);
  }
  return previous[width];
}

/**
 * Counts added and removed lines. Common head and tail are trimmed first, and
 * very large rewrites fall back to "everything in the middle changed" so the
 * UI never blocks on a diff.
 */
export function countLineChanges(before: string, after: string): { added: number; removed: number } {
  if (before === after) return { added: 0, removed: 0 };
  const oldLines = before.split('\n');
  const newLines = after.split('\n');
  const prefix = commonPrefix(oldLines, newLines);
  const suffix = commonSuffix(oldLines, newLines, prefix);
  const oldMiddle = oldLines.slice(prefix, oldLines.length - suffix);
  const newMiddle = newLines.slice(prefix, newLines.length - suffix);

  if (oldMiddle.length * newMiddle.length > LCS_BUDGET) {
    return { added: newMiddle.length, removed: oldMiddle.length };
  }
  const common = lcsLength(oldMiddle, newMiddle);
  return {
    added: newMiddle.length - common,
    removed: oldMiddle.length - common,
  };
}

/** Compares the workspace with its baseline and reports per-file changes. */
export function diffWorkspace(
  current: Record<string, string>,
  baseline: Record<string, string>,
): FileChange[] {
  const changes: FileChange[] = [];
  for (const [path, content] of Object.entries(current)) {
    if (!(path in baseline)) {
      changes.push({ path, status: 'added', ...countLineChanges('', content) });
      continue;
    }
    if (baseline[path] !== content) {
      changes.push({ path, status: 'modified', ...countLineChanges(baseline[path], content) });
    }
  }
  for (const path of Object.keys(baseline)) {
    if (!(path in current)) {
      changes.push({ path, status: 'deleted', ...countLineChanges(baseline[path], '') });
    }
  }
  return changes.sort((a, b) => a.path.localeCompare(b.path));
}
