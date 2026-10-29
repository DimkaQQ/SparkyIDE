import {
  commitFiles,
  createBranch,
  createPullRequest,
  describeGitHubError,
  describeTokenAccess,
  getDefaultBranch,
  getTokenAccess,
  getTree,
  listBranches,
  listCommits,
  listRepos,
  readFile,
} from '../github';
import type { JsonSchema, ToolCall, ToolRunResult, ToolSchema } from '../types';

function schema(
  properties: Record<string, unknown>,
  required: string[] = [],
): JsonSchema {
  return { type: 'object', properties, required };
}

const str = (description: string) => ({ type: 'string', description });
const bool = (description: string) => ({ type: 'boolean', description });

export const TOOLS: ToolSchema[] = [
  {
    name: 'list_files',
    description:
      'List every file in the current workspace together with its size in bytes. Call this before editing an unfamiliar project.',
    parameters: schema({}),
  },
  {
    name: 'read_file',
    description: 'Read a file from the workspace and return its exact text content.',
    parameters: schema({ path: str('Workspace-relative file path, e.g. "src/App.tsx"') }, ['path']),
  },
  {
    name: 'write_file',
    description:
      'Create a file or replace its whole content. Prefer edit_file for small changes to existing files.',
    parameters: schema(
      {
        path: str('Workspace-relative file path'),
        content: str('Complete new file content'),
      },
      ['path', 'content'],
    ),
  },
  {
    name: 'edit_file',
    description:
      'Replace an exact string in a workspace file. old_string must match the current file byte for byte and must be unique unless replace_all is true.',
    parameters: schema(
      {
        path: str('Workspace-relative file path'),
        old_string: str('Exact text to find'),
        new_string: str('Replacement text'),
        replace_all: bool('Replace every occurrence instead of requiring a unique match'),
      },
      ['path', 'old_string', 'new_string'],
    ),
  },
  {
    name: 'delete_file',
    description: 'Delete a file from the workspace.',
    parameters: schema({ path: str('Workspace-relative file path') }, ['path']),
  },
  {
    name: 'search_files',
    description:
      'Search the workspace for a case-insensitive substring. Returns matching lines as path:line: text.',
    parameters: schema({ query: str('Text to search for') }, ['query']),
  },
  {
    name: 'github_list_repos',
    description: 'List GitHub repositories available to the connected account.',
    parameters: schema({ query: str('Optional filter by name, description or language') }),
  },
  {
    name: 'github_list_tree',
    description: 'List the files in a GitHub repository at a branch or commit.',
    parameters: schema(
      {
        repo: str('Repository in "owner/name" form'),
        ref: str('Branch, tag or commit SHA (defaults to the default branch)'),
      },
      ['repo'],
    ),
  },
  {
    name: 'github_read_file',
    description: 'Read a single file from a GitHub repository.',
    parameters: schema(
      {
        repo: str('Repository in "owner/name" form'),
        path: str('File path inside the repository'),
        ref: str('Branch, tag or commit SHA'),
      },
      ['repo', 'path'],
    ),
  },
  {
    name: 'github_list_commits',
    description: 'Show the latest commits on a repository branch.',
    parameters: schema(
      {
        repo: str('Repository in "owner/name" form'),
        ref: str('Branch name'),
      },
      ['repo'],
    ),
  },
  {
    name: 'github_list_branches',
    description: 'List branches of a GitHub repository.',
    parameters: schema({ repo: str('Repository in "owner/name" form') }, ['repo']),
  },
  {
    name: 'github_commit_files',
    description:
      'Commit one or more files to a GitHub repository. Returns the commit URL. Works on the default branch or on a branch that is created when missing.',
    parameters: schema(
      {
        repo: str('Repository in "owner/name" form'),
        branch: str('Target branch (defaults to the repository default branch)'),
        message: str('Commit message'),
        files: {
          type: 'array',
          description: 'Files to write. Set content to null to delete a file.',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path inside the repository' },
              content: { type: 'string', description: 'Full file content' },
            },
            required: ['path', 'content'],
          },
        },
      },
      ['repo', 'message', 'files'],
    ),
  },
  {
    name: 'github_check_access',
    description:
      'Check what the connected GitHub token is allowed to do. Pass a repo to learn whether commits and PRs are possible there. Use it when a GitHub action failed with a permission error.',
    parameters: schema({
      repo: str('Repository in "owner/name" form (optional)'),
    }),
  },
  {
    name: 'github_create_branch',
    description:
      'Create a branch on a GitHub repository from another branch (or the default branch). Safe to call when the branch already exists: it then reports the existing head.',
    parameters: schema(
      {
        repo: str('Repository in "owner/name" form'),
        branch: str('New branch name, e.g. "sparky/fix-settings"'),
        from: str('Source branch or commit SHA (defaults to the repository default branch)'),
      },
      ['repo', 'branch'],
    ),
  },
  {
    name: 'github_push_workspace',
    description:
      'Push the current workspace to GitHub in one call: commits the files as they are right now. Give a branch to create it when missing; without a branch it commits to the default branch. This is the normal way to publish the edits you just made.',
    parameters: schema(
      {
        repo: str('Repository in "owner/name" form'),
        message: str('Commit message'),
        branch: str('Target branch (created from `base` when it does not exist)'),
        base: str('Branch to start from when creating `branch` (defaults to the repository default branch)'),
        paths: {
          type: 'array',
          description: 'Only push these workspace paths (defaults to the whole workspace)',
          items: { type: 'string', description: 'Workspace-relative file path' },
        },
      },
      ['repo', 'message'],
    ),
  },
  {
    name: 'github_create_pr',
    description: 'Open a pull request from a branch into a base branch.',
    parameters: schema(
      {
        repo: str('Repository in "owner/name" form'),
        title: str('Pull request title'),
        head: str('Source branch'),
        base: str('Target branch (defaults to the repository default branch)'),
        body: str('Pull request description'),
        draft: bool('Create as draft'),
      },
      ['repo', 'title', 'head'],
    ),
  },
];

export interface ToolContext {
  workspace: {
    read: () => Record<string, string>;
    write: (path: string, content: string) => void;
    remove: (path: string) => void;
  };
  githubToken: string;
}

const MAX_TOOL_OUTPUT = 24_000;

function clip(text: string): string {
  if (text.length <= MAX_TOOL_OUTPUT) return text;
  return `${text.slice(0, MAX_TOOL_OUTPUT)}\n\n… output truncated (${text.length - MAX_TOOL_OUTPUT} more characters).`;
}

function safePath(input: unknown): string {
  if (typeof input !== 'string') throw new Error('path must be a string');
  const path = input
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .replace(/\/+$/, '')
    .trim();
  if (!path) throw new Error('path is required');
  if (path.includes('..')) throw new Error('path must stay inside the workspace');
  return path;
}

function argString(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required argument "${key}".`);
  }
  return value;
}

function parseArgs(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
    throw new Error('Arguments must be a JSON object.');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not parse tool arguments: ${message}`);
  }
}

function requireGitHub(ctx: ToolContext): string {
  if (!ctx.githubToken) {
    throw new Error(
      'GitHub is not connected. Ask the user to add a personal access token in Settings → GitHub.',
    );
  }
  return ctx.githubToken;
}

function countLines(text: string): number {
  return text === '' ? 0 : text.split('\n').length;
}

function errorResult(error: unknown): ToolRunResult {
  const message = error instanceof Error ? error.message : String(error);
  return { ok: false, content: `Error: ${message}`, title: 'Failed' };
}

export async function executeTool(call: ToolCall, ctx: ToolContext): Promise<ToolRunResult> {
  let args: Record<string, unknown>;
  try {
    args = parseArgs(call.arguments);
  } catch (error) {
    return errorResult(error);
  }

  try {
    switch (call.name) {
      case 'list_files': {
        const files = ctx.workspace.read();
        const paths = Object.keys(files).sort();
        if (paths.length === 0) {
          return { ok: true, content: '(the workspace is empty)', title: 'Workspace is empty' };
        }
        const body = paths
          .map((path) => `${path} (${new Blob([files[path]]).size} bytes)`)
          .join('\n');
        return {
          ok: true,
          content: body,
          title: `${paths.length} files`,
          meta: { files: paths.length },
        };
      }

      case 'read_file': {
        const path = safePath(args.path);
        const files = ctx.workspace.read();
        if (!(path in files)) throw new Error(`File not found: ${path}`);
        const content = files[path];
        return {
          ok: true,
          content: clip(content),
          title: path,
          meta: { path, lines: countLines(content) },
        };
      }

      case 'write_file': {
        const path = safePath(args.path);
        const content = argString(args, 'content');
        const existed = path in ctx.workspace.read();
        ctx.workspace.write(path, content);
        return {
          ok: true,
          content: `${existed ? 'Updated' : 'Created'} ${path} (${countLines(content)} lines, ${new Blob([content]).size} bytes).`,
          title: `${existed ? 'Updated' : 'Created'} ${path}`,
          meta: {
            path,
            lines: countLines(content),
            bytes: new Blob([content]).size,
            created: !existed,
          },
        };
      }

      case 'edit_file': {
        const path = safePath(args.path);
        const oldString = argString(args, 'old_string');
        const newString = typeof args.new_string === 'string' ? args.new_string : '';
        const replaceAll = args.replace_all === true;
        const files = ctx.workspace.read();
        if (!(path in files)) throw new Error(`File not found: ${path}`);
        const original = files[path];
        const occurrences = original.split(oldString).length - 1;
        if (occurrences === 0) throw new Error(`old_string was not found in ${path}.`);
        if (occurrences > 1 && !replaceAll) {
          throw new Error(
            `old_string appears ${occurrences} times in ${path}. Add more context or set replace_all.`,
          );
        }
        const updated = replaceAll
          ? original.split(oldString).join(newString)
          : original.replace(oldString, newString);
        ctx.workspace.write(path, updated);
        return {
          ok: true,
          content: `Edited ${path}: replaced ${occurrences} occurrence(s).`,
          title: `Edited ${path}`,
          meta: { path, occurrences, lines: countLines(updated) },
        };
      }

      case 'delete_file': {
        const path = safePath(args.path);
        if (!(path in ctx.workspace.read())) throw new Error(`File not found: ${path}`);
        ctx.workspace.remove(path);
        return { ok: true, content: `Deleted ${path}.`, title: `Deleted ${path}`, meta: { path } };
      }

      case 'search_files': {
        const query = argString(args, 'query');
        const needle = query.toLowerCase();
        const files = ctx.workspace.read();
        const matches: string[] = [];
        for (const [path, content] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i += 1) {
            if (lines[i].toLowerCase().includes(needle)) {
              matches.push(`${path}:${i + 1}: ${lines[i].trim().slice(0, 240)}`);
              if (matches.length >= 80) break;
            }
          }
          if (matches.length >= 80) break;
        }
        return {
          ok: true,
          content: matches.length > 0 ? matches.join('\n') : `No matches for "${query}".`,
          title: `${matches.length} match${matches.length === 1 ? '' : 'es'}`,
          meta: { query, matches: matches.length },
        };
      }

      case 'github_list_repos': {
        const token = requireGitHub(ctx);
        const query = typeof args.query === 'string' ? args.query : '';
        const repos = await listRepos(token, query);
        const body = repos
          .map(
            (repo) =>
              `${repo.fullName}${repo.private ? ' (private)' : ''} — ${repo.language ?? 'unknown'} — ${repo.description ?? 'no description'}`,
          )
          .join('\n');
        return {
          ok: true,
          content: body || 'No repositories found.',
          title: `${repos.length} repositories`,
          meta: { repos: repos.length },
        };
      }

      case 'github_list_tree': {
        const token = requireGitHub(ctx);
        const repo = argString(args, 'repo');
        const ref = typeof args.ref === 'string' && args.ref ? args.ref : undefined;
        const tree = await getTree(token, repo, ref);
        const body = tree
          .filter((entry) => entry.type === 'blob')
          .map((entry) => entry.path)
          .join('\n');
        return {
          ok: true,
          content: clip(body || '(empty repository)'),
          title: `${repo}${ref ? `@${ref}` : ''}`,
          meta: { files: tree.filter((entry) => entry.type === 'blob').length },
        };
      }

      case 'github_read_file': {
        const token = requireGitHub(ctx);
        const repo = argString(args, 'repo');
        const path = argString(args, 'path');
        const ref = typeof args.ref === 'string' && args.ref ? args.ref : undefined;
        const content = await readFile(token, repo, path, ref);
        return {
          ok: true,
          content: clip(content),
          title: `${repo}/${path}`,
          meta: { path, lines: countLines(content) },
        };
      }

      case 'github_list_commits': {
        const token = requireGitHub(ctx);
        const repo = argString(args, 'repo');
        const ref = typeof args.ref === 'string' && args.ref ? args.ref : undefined;
        const commits = await listCommits(token, repo, ref);
        const body = commits
          .map((commit) => `${commit.sha.slice(0, 7)} ${commit.date.slice(0, 10)} ${commit.author}: ${commit.message}`)
          .join('\n');
        return {
          ok: true,
          content: body || 'No commits found.',
          title: `${commits.length} commits`,
        };
      }

      case 'github_list_branches': {
        const token = requireGitHub(ctx);
        const repo = argString(args, 'repo');
        const branches = await listBranches(token, repo);
        return {
          ok: true,
          content: branches.join('\n') || 'No branches found.',
          title: `${branches.length} branches`,
        };
      }

      case 'github_commit_files': {
        const token = requireGitHub(ctx);
        const repo = argString(args, 'repo');
        const message = argString(args, 'message');
        const branch = typeof args.branch === 'string' && args.branch ? args.branch : undefined;
        const rawFiles = args.files;
        if (!Array.isArray(rawFiles) || rawFiles.length === 0) {
          throw new Error('files must be a non-empty array.');
        }
        const files = rawFiles.map((entry) => {
          const file = entry as Record<string, unknown>;
          const path = safePath(file.path);
          const content = file.content;
          if (content !== null && typeof content !== 'string') {
            throw new Error(`File "${path}" needs a string content value.`);
          }
          return { path, content: content as string | null };
        });
        const result = await commitFiles(token, {
          repo,
          branch: branch ?? '',
          message,
          files,
          createBranch: Boolean(branch),
        });
        return {
          ok: true,
          content: `Committed ${files.length} file(s) to ${repo}@${result.branch}.\nCommit: ${result.url}`,
          title: `Committed to ${result.branch}`,
          meta: { repo, branch: result.branch, files: files.length, sha: result.commitSha },
        };
      }

      case 'github_check_access': {
        const token = requireGitHub(ctx);
        const repo = typeof args.repo === 'string' && args.repo ? args.repo : undefined;
        const access = await getTokenAccess(token, repo);
        const { summary, warning } = describeTokenAccess(access);
        return {
          ok: true,
          content: [summary, warning].filter((line) => line !== '').join('\n\n'),
          title: warning ? 'Limited access' : 'Write access ok',
          meta: {
            login: access.login,
            classic: access.classic,
            canPush: access.canPush === undefined ? 'unknown' : access.canPush,
          },
        };
      }

      case 'github_create_branch': {
        const token = requireGitHub(ctx);
        const repo = argString(args, 'repo');
        const branch = argString(args, 'branch');
        const from = typeof args.from === 'string' && args.from ? args.from : undefined;
        const result = await createBranch(token, repo, branch, from);
        return {
          ok: true,
          content: result.created
            ? `Created branch ${result.branch} on ${repo} from ${result.base} (${result.sha.slice(0, 7)}).`
            : `Branch ${result.branch} already existed on ${repo} at ${result.sha.slice(0, 7)}.`,
          title: result.created ? `Created ${result.branch}` : `${result.branch} exists`,
          meta: { repo, branch: result.branch, base: result.base, created: result.created },
        };
      }

      case 'github_push_workspace': {
        const token = requireGitHub(ctx);
        const repo = argString(args, 'repo');
        const message = argString(args, 'message');
        const branch = typeof args.branch === 'string' && args.branch ? args.branch : undefined;
        const base = typeof args.base === 'string' && args.base ? args.base : undefined;
        const wanted = Array.isArray(args.paths) ? args.paths.map((path) => safePath(path)) : null;
        const files = ctx.workspace.read();
        const entries = Object.entries(files)
          .filter(([path]) => !wanted || wanted.includes(path))
          .sort(([a], [b]) => a.localeCompare(b));
        if (entries.length === 0) {
          throw new Error(
            wanted
              ? `None of the requested paths exist in the workspace: ${wanted.join(', ')}.`
              : 'The workspace is empty — there is nothing to push.',
          );
        }
        const result = await commitFiles(token, {
          repo,
          branch: branch ?? '',
          baseBranch: base,
          message,
          files: entries.map(([path, content]) => ({ path, content })),
          createBranch: Boolean(branch),
        });
        return {
          ok: true,
          content: `Pushed ${entries.length} file(s) from the workspace to ${repo}@${result.branch}.\nCommit: ${result.url}`,
          title: `Pushed ${entries.length} files to ${result.branch}`,
          meta: {
            repo,
            branch: result.branch,
            files: entries.length,
            sha: result.commitSha,
          },
        };
      }

      case 'github_create_pr': {
        const token = requireGitHub(ctx);
        const repo = argString(args, 'repo');
        const title = argString(args, 'title');
        const head = argString(args, 'head');
        const base =
          (typeof args.base === 'string' && args.base) || (await getDefaultBranch(token, repo));
        const pr = await createPullRequest(token, repo, {
          title,
          head,
          base,
          body: typeof args.body === 'string' ? args.body : undefined,
          draft: args.draft === true,
        });
        return {
          ok: true,
          content: `Opened pull request #${pr.number}: ${pr.url}`,
          title: `PR #${pr.number}`,
          meta: { number: pr.number, url: pr.url },
        };
      }

      default:
        return errorResult(new Error(`Unknown tool "${call.name}".`));
    }
  } catch (error) {
    // GitHub API errors need permission guidance, not a raw API message.
    return errorResult(
      call.name.startsWith('github_') ? new Error(describeGitHubError(error)) : error,
    );
  }
}

/** Human readable label for the UI. */
export function toolLabel(name: string): string {
  const labels: Record<string, string> = {
    list_files: 'List files',
    read_file: 'Read file',
    write_file: 'Write file',
    edit_file: 'Edit file',
    delete_file: 'Delete file',
    search_files: 'Search workspace',
    github_list_repos: 'List repositories',
    github_list_tree: 'List repository files',
    github_read_file: 'Read from GitHub',
    github_list_commits: 'List commits',
    github_list_branches: 'List branches',
    github_commit_files: 'Commit to GitHub',
    github_check_access: 'Check GitHub access',
    github_create_branch: 'Create branch',
    github_push_workspace: 'Push workspace',
    github_create_pr: 'Open pull request',
  };
  return labels[name] ?? name;
}
