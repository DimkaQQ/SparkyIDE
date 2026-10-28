import { Octokit } from '@octokit/rest';
import type {
  GitHubCommitSummary,
  GitHubRepoSummary,
  GitHubTreeEntry,
  GitHubUser,
} from './types';

function client(token: string): Octokit {
  return new Octokit({ auth: token, userAgent: 'sparky-ide' });
}

function splitRepo(repo: string): { owner: string; name: string } {
  const [owner, name] = repo.split('/');
  if (!owner || !name) throw new Error(`Invalid repository "${repo}" — expected "owner/name".`);
  return { owner, name };
}

function decodeBase64Utf8(base64: string): string {
  const binary = atob(base64.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function describeGitHubError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/bad credentials/i.test(message)) return 'GitHub rejected the token (bad credentials).';
  if (/rate limit/i.test(message)) return 'GitHub API rate limit reached. Try again later.';
  return message;
}

export async function getViewer(token: string): Promise<GitHubUser> {
  const gh = client(token);
  const { data } = await gh.users.getAuthenticated();
  return {
    login: data.login,
    name: data.name ?? null,
    avatarUrl: data.avatar_url,
    htmlUrl: data.html_url,
  };
}

export async function listRepos(token: string, query = ''): Promise<GitHubRepoSummary[]> {
  const gh = client(token);
  const { data } = await gh.repos.listForAuthenticatedUser({
    per_page: 100,
    sort: 'updated',
    affiliation: 'owner,collaborator,organization_member',
  });
  const repos = data.map((repo) => ({
    fullName: repo.full_name,
    name: repo.name,
    owner: repo.owner?.login ?? repo.full_name.split('/')[0],
    description: repo.description,
    language: repo.language ?? null,
    private: repo.private,
    defaultBranch: repo.default_branch,
    stars: repo.stargazers_count ?? 0,
    updatedAt: repo.updated_at ?? '',
    htmlUrl: repo.html_url,
  }));
  const needle = query.trim().toLowerCase();
  if (!needle) return repos;
  return repos.filter(
    (repo) =>
      repo.fullName.toLowerCase().includes(needle) ||
      (repo.description ?? '').toLowerCase().includes(needle) ||
      (repo.language ?? '').toLowerCase().includes(needle),
  );
}

export async function getRepo(token: string, repo: string): Promise<GitHubRepoSummary> {
  const gh = client(token);
  const { owner, name } = splitRepo(repo);
  const { data } = await gh.repos.get({ owner, repo: name });
  return {
    fullName: data.full_name,
    name: data.name,
    owner: data.owner?.login ?? owner,
    description: data.description,
    language: data.language ?? null,
    private: data.private,
    defaultBranch: data.default_branch,
    stars: data.stargazers_count ?? 0,
    updatedAt: data.updated_at ?? '',
    htmlUrl: data.html_url,
  };
}

export async function getDefaultBranch(token: string, repo: string): Promise<string> {
  const gh = client(token);
  const { owner, name } = splitRepo(repo);
  const { data } = await gh.repos.get({ owner, repo: name });
  return data.default_branch;
}

export async function listBranches(token: string, repo: string): Promise<string[]> {
  const gh = client(token);
  const { owner, name } = splitRepo(repo);
  const { data } = await gh.repos.listBranches({ owner, repo: name, per_page: 100 });
  return data.map((branch) => branch.name);
}

export async function getTree(
  token: string,
  repo: string,
  ref?: string,
): Promise<GitHubTreeEntry[]> {
  const gh = client(token);
  const { owner, name } = splitRepo(repo);
  let sha = ref;
  if (!sha) {
    const { data } = await gh.repos.get({ owner, repo: name });
    sha = data.default_branch;
  }
  const { data } = await gh.git.getTree({
    owner,
    repo: name,
    tree_sha: sha,
    recursive: '1',
  });
  return (data.tree ?? [])
    .filter((entry) => entry.type === 'blob' || entry.type === 'tree')
    .map((entry): GitHubTreeEntry => ({
      path: entry.path ?? '',
      type: entry.type === 'tree' ? 'tree' : 'blob',
      size: entry.size,
    }))
    .filter((entry) => entry.path !== '');
}

export async function readFile(
  token: string,
  repo: string,
  path: string,
  ref?: string,
): Promise<string> {
  const gh = client(token);
  const { owner, name } = splitRepo(repo);
  const { data } = await gh.repos.getContent({ owner, repo: name, path, ...(ref ? { ref } : {}) });
  if (Array.isArray(data)) throw new Error(`"${path}" is a directory.`);
  if (!('content' in data) || !data.content) throw new Error(`No content returned for "${path}".`);
  return decodeBase64Utf8(data.content);
}

export async function listCommits(
  token: string,
  repo: string,
  ref?: string,
): Promise<GitHubCommitSummary[]> {
  const gh = client(token);
  const { owner, name } = splitRepo(repo);
  const { data } = await gh.repos.listCommits({
    owner,
    repo: name,
    per_page: 20,
    ...(ref ? { sha: ref } : {}),
  });
  return data.map((commit) => ({
    sha: commit.sha,
    message: commit.commit.message.split('\n')[0],
    author: commit.commit.author?.name ?? commit.author?.login ?? 'unknown',
    date: commit.commit.author?.date ?? '',
    htmlUrl: commit.html_url,
  }));
}

export interface CommitFilesOptions {
  repo: string;
  branch: string;
  baseBranch?: string;
  message: string;
  files: { path: string; content: string | null }[];
  createBranch?: boolean;
}

export async function commitFiles(
  token: string,
  options: CommitFilesOptions,
): Promise<{ branch: string; commitSha: string; url: string }> {
  const gh = client(token);
  const { owner, name } = splitRepo(options.repo);
  if (options.files.length === 0) throw new Error('No files to commit.');

  const { data: repoInfo } = await gh.repos.get({ owner, repo: name });
  const base = options.baseBranch || repoInfo.default_branch;
  const branch = options.branch || base;

  let parentSha: string | null = null;
  try {
    const { data } = await gh.git.getRef({ owner, repo: name, ref: `heads/${branch}` });
    parentSha = data.object.sha;
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status !== 404) throw error;
    if (!options.createBranch && branch !== base) {
      throw new Error(`Branch "${branch}" does not exist.`);
    }
    if (branch === base) throw error;
    const { data: baseRef } = await gh.git.getRef({ owner, repo: name, ref: `heads/${base}` });
    parentSha = baseRef.object.sha;
    await gh.git.createRef({
      owner,
      repo: name,
      ref: `refs/heads/${branch}`,
      sha: parentSha,
    });
  }

  if (!parentSha) throw new Error(`Could not resolve branch "${branch}".`);
  const { data: parentCommit } = await gh.git.getCommit({
    owner,
    repo: name,
    commit_sha: parentSha,
  });

  const tree = await Promise.all(
    options.files.map(async (file) => {
      if (file.content === null) {
        return { path: file.path, mode: '100644' as const, type: 'blob' as const, sha: null };
      }
      const { data: blob } = await gh.git.createBlob({
        owner,
        repo: name,
        content: file.content,
        encoding: 'utf-8',
      });
      return {
        path: file.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blob.sha,
      };
    }),
  );

  const { data: newTree } = await gh.git.createTree({
    owner,
    repo: name,
    base_tree: parentCommit.tree.sha,
    tree,
  });

  const { data: commit } = await gh.git.createCommit({
    owner,
    repo: name,
    message: options.message,
    tree: newTree.sha,
    parents: [parentSha],
  });

  await gh.git.updateRef({
    owner,
    repo: name,
    ref: `heads/${branch}`,
    sha: commit.sha,
  });

  return { branch, commitSha: commit.sha, url: commit.html_url };
}

export async function createPullRequest(
  token: string,
  repo: string,
  input: { title: string; head: string; base: string; body?: string; draft?: boolean },
): Promise<{ number: number; url: string }> {
  const gh = client(token);
  const { owner, name } = splitRepo(repo);
  const { data } = await gh.pulls.create({
    owner,
    repo: name,
    title: input.title,
    head: input.head,
    base: input.base,
    body: input.body,
    draft: input.draft,
  });
  return { number: data.number, url: data.html_url };
}

export interface ImportedRepo {
  files: Record<string, string>;
  skipped: number;
}

/** Pulls a repository tree into the workspace, skipping binaries and huge blobs. */
export async function importRepo(
  token: string,
  repo: string,
  ref?: string,
  limits: { maxFiles?: number; maxBytes?: number } = {},
): Promise<ImportedRepo> {
  const gh = client(token);
  const { owner, name } = splitRepo(repo);
  const maxFiles = limits.maxFiles ?? 120;
  const maxBytes = limits.maxBytes ?? 250_000;

  const tree = await getTree(token, repo, ref);
  const blobs = tree.filter((entry) => entry.type === 'blob');
  const chosen = blobs
    .filter((entry) => (entry.size ?? 0) <= maxBytes)
    .sort((a, b) => {
      const weight = (path: string) =>
        /(^|\/)(node_modules|dist|build|\.git|vendor|package-lock\.json|yarn\.lock)/.test(path)
          ? 1
          : 0;
      return weight(a.path) - weight(b.path) || a.path.localeCompare(b.path);
    })
    .slice(0, maxFiles);

  const files: Record<string, string> = {};
  let skipped = blobs.length - chosen.length;

  for (const entry of chosen) {
    try {
      const { data } = await gh.repos.getContent({
        owner,
        repo: name,
        path: entry.path,
        ...(ref ? { ref } : {}),
      });
      if (Array.isArray(data) || !('content' in data) || !data.content) {
        skipped += 1;
        continue;
      }
      files[entry.path] = decodeBase64Utf8(data.content);
    } catch {
      skipped += 1;
    }
  }

  return { files, skipped };
}
