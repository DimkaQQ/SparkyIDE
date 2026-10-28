import type { ToolCall } from '../types';
import { toolLabel } from './tools';

export function toolSummary(call: ToolCall): string {
  let args: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(call.arguments || '{}') as unknown;
    if (parsed && typeof parsed === 'object') args = parsed as Record<string, unknown>;
  } catch {
    /* arguments may still be streaming */
  }

  const path = typeof args.path === 'string' ? args.path : undefined;
  const repo = typeof args.repo === 'string' ? args.repo : undefined;
  const query = typeof args.query === 'string' ? args.query : undefined;
  const branch = typeof args.branch === 'string' ? args.branch : undefined;
  const command = typeof args.command === 'string' ? args.command : undefined;

  switch (call.name) {
    case 'read_file':
    case 'write_file':
    case 'delete_file':
      return path ?? '';
    case 'edit_file':
      return path ? `${path}` : '';
    case 'search_files':
      return query ? `"${query}"` : '';
    case 'github_read_file':
      return repo && path ? `${repo}/${path}` : repo ?? '';
    case 'github_commit_files':
      return [repo, branch].filter(Boolean).join('@');
    case 'github_list_tree':
    case 'github_list_commits':
    case 'github_list_branches':
    case 'github_create_pr':
      return repo ?? '';
    case 'github_list_repos':
      return query ? `"${query}"` : '';
    case 'run_command':
      return command ?? '';
    default:
      return '';
  }
}

export function describeTool(call: ToolCall): string {
  const summary = toolSummary(call);
  return summary ? `${toolLabel(call.name)} · ${summary}` : toolLabel(call.name);
}

export function parseToolArgs(call: ToolCall): Record<string, unknown> {
  try {
    const parsed = JSON.parse(call.arguments || '{}') as unknown;
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  return {};
}
