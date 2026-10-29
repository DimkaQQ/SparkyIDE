import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Download,
  FileUp,
  GitBranch,
  GitPullRequest,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  Search,
  Sparkles,
  Star,
} from 'lucide-react';
import {
  commitFiles,
  createPullRequest,
  describeGitHubError,
  describeTokenAccess,
  getTokenAccess,
  getTree,
  getViewer,
  importRepo,
  listBranches,
  listCommits,
  listRepos,
  readFile,
} from '../github';
import { timeAgo } from '../lib/markdown';
import { useStore } from '../state';
import type { GitHubCommitSummary, GitHubRepoSummary, GitHubTreeEntry } from '../types';
import FileTree from './FileTree';

type Tab = 'files' | 'commits' | 'actions';

export default function GitHubView() {
  const {
    githubToken,
    setGithubToken,
    githubUser,
    setGithubUser,
    getWorkspace,
    replaceWorkspace,
    writeFile,
    openFile,
    setSettingsOpen,
    setMode,
    setPrefill,
  } = useStore();

  const [tokenDraft, setTokenDraft] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [authError, setAuthError] = useState('');
  const [accessWarning, setAccessWarning] = useState('');

  const [repos, setRepos] = useState<GitHubRepoSummary[]>([]);
  const [query, setQuery] = useState('');
  const [reposLoading, setReposLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const [selected, setSelected] = useState<GitHubRepoSummary | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [branch, setBranch] = useState('');
  const [tree, setTree] = useState<GitHubTreeEntry[]>([]);
  const [commits, setCommits] = useState<GitHubCommitSummary[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('files');

  const [preview, setPreview] = useState<{ path: string; content: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [commitMessage, setCommitMessage] = useState('Update from Sparky IDE');
  const [newBranch, setNewBranch] = useState('sparky/workspace-update');
  const [openPR, setOpenPR] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!githubToken || githubUser) return;
    let cancelled = false;
    setConnecting(true);
    getViewer(githubToken)
      .then((user) => {
        if (!cancelled) setGithubUser(user);
      })
      .catch((err) => {
        if (!cancelled) setAuthError(describeGitHubError(err));
      })
      .finally(() => {
        if (!cancelled) setConnecting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [githubToken, githubUser, setGithubUser]);

  const loadRepos = useCallback(async () => {
    if (!githubToken) return;
    setReposLoading(true);
    setError('');
    try {
      setRepos(await listRepos(githubToken));
    } catch (err) {
      setError(describeGitHubError(err));
    } finally {
      setReposLoading(false);
    }
  }, [githubToken]);

  useEffect(() => {
    if (githubUser) void loadRepos();
  }, [githubUser, loadRepos]);

  const connect = async () => {
    const token = tokenDraft.trim();
    if (!token) return;
    setAuthError('');
    setConnecting(true);
    try {
      const user = await getViewer(token);
      setGithubToken(token);
      setGithubUser(user);
      setTokenDraft('');
      try {
        const { warning } = describeTokenAccess(await getTokenAccess(token));
        if (warning) setStatus({ kind: 'error', text: warning });
      } catch {
        /* the connection already succeeded; access details are optional */
      }
    } catch (err) {
      setAuthError(describeGitHubError(err));
    } finally {
      setConnecting(false);
    }
  };

  const openRepo = async (repo: GitHubRepoSummary) => {
    setSelected(repo);
    setPreview(null);
    setTab('files');
    setStatus(null);
    setError('');
    setDetailLoading(true);
    setCommitMessage(`Update ${repo.name} from Sparky IDE`);
    setNewBranch(`sparky/update-${new Date().toISOString().slice(0, 10)}`);
    try {
      const [branchList, entries, commitList] = await Promise.all([
        listBranches(githubToken, repo.fullName),
        getTree(githubToken, repo.fullName, repo.defaultBranch),
        listCommits(githubToken, repo.fullName, repo.defaultBranch),
      ]);
      setBranches(branchList);
      setBranch(repo.defaultBranch);
      setTree(entries);
      setCommits(commitList);
    } catch (err) {
      setError(describeGitHubError(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const changeBranch = async (next: string) => {
    if (!selected) return;
    setBranch(next);
    setDetailLoading(true);
    setError('');
    try {
      const [entries, commitList] = await Promise.all([
        getTree(githubToken, selected.fullName, next),
        listCommits(githubToken, selected.fullName, next),
      ]);
      setTree(entries);
      setCommits(commitList);
      setPreview(null);
    } catch (err) {
      setError(describeGitHubError(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const openPreview = async (path: string) => {
    if (!selected) return;
    setPreviewLoading(true);
    setPreview({ path, content: '' });
    try {
      const content = await readFile(githubToken, selected.fullName, path, branch);
      setPreview({ path, content });
    } catch (err) {
      setStatus({ kind: 'error', text: describeGitHubError(err) });
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const addPreviewToWorkspace = () => {
    if (!preview) return;
    writeFile(preview.path, preview.content);
    openFile(preview.path);
    setStatus({ kind: 'ok', text: `${preview.path} added to your workspace.` });
  };

  const importRepository = async () => {
    if (!selected) return;
    const current = Object.keys(getWorkspace()).length;
    if (
      current > 0 &&
      !window.confirm(
        `Replace your current ${current} workspace file(s) with ${selected.fullName}@${branch}?`,
      )
    ) {
      return;
    }
    setWorking(true);
    setStatus(null);
    try {
      const imported = await importRepo(githubToken, selected.fullName, branch);
      replaceWorkspace(imported.files);
      const count = Object.keys(imported.files).length;
      setStatus({
        kind: 'ok',
        text: `Imported ${count} file(s) from ${selected.fullName}@${branch}${
          imported.skipped > 0 ? ` (${imported.skipped} binary/large file(s) skipped)` : ''
        }.`,
      });
    } catch (err) {
      setStatus({ kind: 'error', text: describeGitHubError(err) });
    } finally {
      setWorking(false);
    }
  };

  const pushWorkspace = async () => {
    if (!selected) return;
    const files = Object.entries(getWorkspace()).map(([path, content]) => ({ path, content }));
    if (files.length === 0) {
      setStatus({ kind: 'error', text: 'Your workspace is empty — nothing to commit.' });
      return;
    }
    const target = (newBranch.trim() || branch).replace(/^\/+/, '');
    if (!commitMessage.trim()) {
      setStatus({ kind: 'error', text: 'Add a commit message first.' });
      return;
    }
    setWorking(true);
    setStatus(null);
    try {
      const commit = await commitFiles(githubToken, {
        repo: selected.fullName,
        branch: target,
        baseBranch: branch,
        message: commitMessage.trim(),
        files,
        createBranch: target !== branch,
      });
      let text = `Committed ${files.length} file(s) to ${selected.fullName}@${commit.branch}.`;
      if (openPR && target !== branch) {
        try {
          const pr = await createPullRequest(githubToken, selected.fullName, {
            title: commitMessage.trim(),
            head: target,
            base: branch,
            body: 'Created with Sparky IDE.',
          });
          text += ` Opened pull request #${pr.number}.`;
        } catch (err) {
          text += ` Pull request not opened: ${describeGitHubError(err)}`;
        }
      }
      setStatus({ kind: 'ok', text });
      void loadRepos();
      if (target !== branch) void changeBranch(target);
    } catch (err) {
      setStatus({ kind: 'error', text: describeGitHubError(err) });
    } finally {
      setWorking(false);
    }
  };

  const filteredRepos = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return repos;
    return repos.filter(
      (repo) =>
        repo.fullName.toLowerCase().includes(needle) ||
        (repo.description ?? '').toLowerCase().includes(needle),
    );
  }, [repos, query]);

  const blobPaths = useMemo(
    () => tree.filter((entry) => entry.type === 'blob').map((entry) => entry.path),
    [tree],
  );

  if (!githubUser) {
    return (
      <div className="gh-connect">
        <div className="gh-connect-card">
          <div className="gh-connect-icon">
            <GitBranch size={24} />
          </div>
          <h1>Connect GitHub</h1>
          <p>
            Add a personal access token so Sparky can read repositories, push commits and open pull
            requests. Pushing needs write access: a classic token with the <code>repo</code> scope,
            or a fine-grained token with <strong>Contents: Read and write</strong>. The token stays
            in this browser.
          </p>
          <input
            className="input"
            type="password"
            value={tokenDraft}
            onChange={(event) => setTokenDraft(event.target.value)}
            placeholder="ghp_… or github_pat_…"
            onKeyDown={(event) => {
              if (event.key === 'Enter') void connect();
            }}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void connect()}
            disabled={connecting || !tokenDraft.trim()}
          >
            {connecting ? <Loader2 size={14} className="spin" /> : <GitBranch size={14} />}
            Connect GitHub
          </button>
          {authError && (
            <div className="notice error">
              <AlertTriangle size={13} /> {authError}
            </div>
          )}
          <a
            className="gh-link"
            href="https://github.com/settings/tokens/new?scopes=repo&description=Sparky%20IDE"
            target="_blank"
            rel="noreferrer"
          >
            Create a classic token with <code>repo</code> scope <ArrowUpRight size={11} />
          </a>
          <a
            className="gh-link"
            href="https://github.com/settings/personal-access-tokens/new"
            target="_blank"
            rel="noreferrer"
          >
            Or create a fine-grained token (Contents: Read and write){' '}
            <ArrowUpRight size={11} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="gh-view">
      <aside className="gh-sidebar">
        <div className="gh-account">
          <img src={githubUser.avatarUrl} alt={githubUser.login} className="gh-avatar" />
          <div className="gh-account-text">
            <span className="gh-login">@{githubUser.login}</span>
            <a href={githubUser.htmlUrl} target="_blank" rel="noreferrer">
              View profile <ArrowUpRight size={10} />
            </a>
          </div>
          <button
            type="button"
            className="icon-btn"
            title="Disconnect GitHub"
            onClick={() => {
              setGithubToken('');
              setGithubUser(null);
              setRepos([]);
              setSelected(null);
            }}
          >
            <LogOut size={14} />
          </button>
        </div>

        <div className="sidebar-search">
          <Search size={13} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter repositories…"
          />
        </div>

        <div className="gh-repos-head">
          <span>Repositories</span>
          <button
            type="button"
            className="icon-btn"
            onClick={() => void loadRepos()}
            title="Refresh repositories"
          >
            <RefreshCw size={13} className={reposLoading ? 'spin' : ''} />
          </button>
        </div>

        <div className="gh-repos">
          {reposLoading && repos.length === 0 && (
            <div className="gh-placeholder">
              <Loader2 size={16} className="spin" /> Loading repositories…
            </div>
          )}
          {!reposLoading && filteredRepos.length === 0 && (
            <div className="gh-placeholder">No repositories found.</div>
          )}
          {filteredRepos.map((repo) => (
            <button
              key={repo.fullName}
              type="button"
              className={`gh-repo ${selected?.fullName === repo.fullName ? 'active' : ''}`}
              onClick={() => void openRepo(repo)}
            >
              <div className="gh-repo-name">
                {repo.private ? <Lock size={11} /> : <GitBranch size={11} />}
                <span>{repo.name}</span>
              </div>
              <div className="gh-repo-meta">
                <span>{repo.owner}</span>
                {repo.language && <span>{repo.language}</span>}
                {repo.stars > 0 && (
                  <span className="gh-stars">
                    <Star size={10} /> {repo.stars}
                  </span>
                )}
                {repo.canPush === false && <span className="gh-repo-ro">read-only</span>}
              </div>
            </button>
          ))}
        </div>

        <div className="sidebar-foot">
          <div className="foot-note">Working copy: {Object.keys(getWorkspace()).length} files</div>
          <button
            type="button"
            className="sidebar-foot-btn"
            onClick={() => {
              setTokenDraft('');
              setSettingsOpen(true);
            }}
          >
            <Lock size={12} /> Manage token
          </button>
        </div>
      </aside>

      <main className="gh-main">
        {!selected ? (
          <div className="empty-pane">
            <div className="empty-pane-icon">
              <GitBranch size={22} />
            </div>
            <h2>Pick a repository</h2>
            <p>
              Browse files, import a repo into your workspace, or let the AI read it and make
              changes.
            </p>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                setStatus(null);
                void loadRepos();
              }}
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        ) : (
          <>
            <div className="gh-repo-head">
              <div className="gh-repo-title">
                <span className="gh-repo-fullname">
                  {selected.owner}/<strong>{selected.name}</strong>
                </span>
                {selected.private && (
                  <span className="badge">
                    <Lock size={10} /> private
                  </span>
                )}
                <a href={selected.htmlUrl} target="_blank" rel="noreferrer" className="gh-link">
                  Open on GitHub <ArrowUpRight size={10} />
                </a>
              </div>
              <div className="spacer" />
              <select
                className="select"
                value={branch}
                onChange={(event) => void changeBranch(event.target.value)}
                disabled={detailLoading}
              >
                {(branches.length > 0 ? branches : [branch]).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="icon-btn"
                onClick={() => selected && void openRepo(selected)}
                title="Refresh repository"
              >
                <RefreshCw size={14} className={detailLoading ? 'spin' : ''} />
              </button>
            </div>

            <div className="gh-tabs">
              {(['files', 'commits', 'actions'] as Tab[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`gh-tab ${tab === item ? 'active' : ''}`}
                  onClick={() => setTab(item)}
                >
                  {item === 'files' && <FileUp size={12} />}
                  {item === 'commits' && <GitBranch size={12} />}
                  {item === 'actions' && <Sparkles size={12} />}
                  {item[0].toUpperCase() + item.slice(1)}
                </button>
              ))}
              <div className="spacer" />
              {error && (
                <span className="gh-inline-error">
                  <AlertTriangle size={12} /> {error}
                </span>
              )}
            </div>

            <div className="gh-content">
              {status && (
                <div className={`notice ${status.kind === 'ok' ? 'ok' : 'error'}`}>
                  {status.kind === 'ok' ? <Check size={13} /> : <AlertTriangle size={13} />}
                  <span>{status.text}</span>
                </div>
              )}

              {tab === 'files' && (
                <div className="gh-files">
                  <div className="gh-file-tree">
                    <div className="gh-section-label">
                      {blobPaths.length} files at {branch}
                    </div>
                    <FileTree
                      paths={blobPaths}
                      activePath={preview?.path ?? null}
                      onSelect={(path) => void openPreview(path)}
                    />
                  </div>

                  <div className="gh-preview-pane">
                    {!preview ? (
                      <div className="gh-placeholder">
                        Select a file to preview it, then add it to your workspace or hand it to the
                        AI.
                      </div>
                    ) : (
                      <>
                        <div className="gh-preview-head">
                          <span className="gh-preview-path">{preview.path}</span>
                          <div className="spacer" />
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={addPreviewToWorkspace}
                            disabled={previewLoading}
                          >
                            <FileUp size={12} /> Add to workspace
                          </button>
                        </div>
                        <pre className="gh-preview-body">
                          {previewLoading ? 'Loading…' : preview.content.slice(0, 200_000)}
                        </pre>
                      </>
                    )}
                  </div>
                </div>
              )}

              {tab === 'commits' && (
                <div className="gh-list">
                  {commits.map((commit) => (
                    <a
                      key={commit.sha}
                      className="gh-commit"
                      href={commit.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <GitBranch size={13} />
                      <div className="gh-commit-text">
                        <span className="gh-commit-message">{commit.message}</span>
                        <span className="gh-commit-meta">
                          {commit.author} · {commit.date ? timeAgo(new Date(commit.date).getTime()) : 'unknown'}
                        </span>
                      </div>
                      <code className="gh-sha">{commit.sha.slice(0, 7)}</code>
                    </a>
                  ))}
                  {commits.length === 0 && <div className="gh-placeholder">No commits found.</div>}
                </div>
              )}

              {tab === 'actions' && (
                <div className="gh-actions">
                  <section className="gh-card">
                    <h3>
                      <Download size={14} /> Import repository into workspace
                    </h3>
                    <p>
                      Copies the text files of <strong>{selected.fullName}</strong> at{' '}
                      <code>{branch}</code> into your local workspace. Binary and very large files
                      are skipped.
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => void importRepository()}
                      disabled={working}
                    >
                      {working ? <Loader2 size={13} className="spin" /> : <Download size={13} />}
                      Import {branch}
                    </button>
                  </section>

                  <section className="gh-card">
                    <h3>
                      <GitPullRequest size={14} /> Commit workspace to GitHub
                    </h3>
                    <p>
                      Pushes all {Object.keys(getWorkspace()).length} workspace files to the
                      repository. Use a new branch name to avoid touching <code>{branch}</code>{' '}
                      directly.
                    </p>
                    <div className="field">
                      <label htmlFor="commit-message">Commit message</label>
                      <input
                        id="commit-message"
                        className="input"
                        value={commitMessage}
                        onChange={(event) => setCommitMessage(event.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="commit-branch">Target branch</label>
                      <input
                        id="commit-branch"
                        className="input"
                        value={newBranch}
                        onChange={(event) => setNewBranch(event.target.value)}
                      />
                    </div>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={openPR}
                        onChange={(event) => setOpenPR(event.target.checked)}
                      />
                      Open a pull request when using a new branch
                    </label>
                    {selected?.canPush === false && (
                      <div className="notice error">
                        <AlertTriangle size={13} />
                        <span>
                          This token cannot write to {selected.fullName}. Grant it Contents: Read
                          and write (fine-grained) or the <code>repo</code> scope (classic), then
                          reconnect.
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => void pushWorkspace()}
                      disabled={working || selected?.canPush === false}
                    >
                      {working ? <Loader2 size={13} className="spin" /> : <GitBranch size={13} />}
                      Commit and push
                    </button>
                  </section>

                  <section className="gh-card">
                    <h3>
                      <Sparkles size={14} /> Let the AI handle it
                    </h3>
                    <p>
                      The agent has GitHub tools: list repos, read files, commit changes and open
                      pull requests.
                    </p>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setMode('chat');
                        setPrefill(
                          `Review ${selected.fullName} and suggest three concrete improvements. Ask before changing anything.`,
                        );
                      }}
                    >
                      Ask Sparky to update this repo
                    </button>
                  </section>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
