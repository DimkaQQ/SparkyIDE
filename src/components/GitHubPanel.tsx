import { useState } from 'react';
import { useAppContext } from '../context';
import { GitBranch, FolderOpen, FileCode, Download, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';
import { Octokit } from '@octokit/rest';

interface FileItem {
  name: string;
  content: string;
  language: string;
}

interface GitHubPanelProps {
  files: FileItem[];
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
}

interface Repo {
  name: string;
  full_name: string;
  description: string;
  language: string;
  updated_at: string;
}

interface RepoFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
}

export default function GitHubPanel({ files, setFiles }: GitHubPanelProps) {
  const { settings } = useAppContext();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [repoFiles, setRepoFiles] = useState<RepoFile[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pushMessage, setPushMessage] = useState('');
  const [commitMsg, setCommitMsg] = useState('');

  const getOctokit = () => {
    if (!settings.githubToken) throw new Error('GitHub token not set');
    return new Octokit({ auth: settings.githubToken });
  };

  const loadRepos = async () => {
    setLoading(true);
    setError('');
    try {
      const octokit = getOctokit();
      const { data } = await octokit.repos.listForAuthenticatedUser({ per_page: 50 });
      setRepos(data as any);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRepoContents = async (repoFullName: string, path: string = '') => {
    setLoading(true);
    setError('');
    try {
      const octokit = getOctokit();
      const [owner, repo] = repoFullName.split('/');
      const { data } = await octokit.repos.getContent({ owner, repo, path });
      setRepoFiles(data as any);
      setCurrentPath(path);
      setSelectedRepo(repoFullName);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFileContent = async (filePath: string) => {
    setLoading(true);
    setError('');
    try {
      const octokit = getOctokit();
      const [owner, repo] = selectedRepo.split('/');
      const { data } = await octokit.repos.getContent({ owner, repo, path: filePath });
      if ('content' in data && data.content) {
        const content = atob(data.content.replace(/\n/g, ''));
        const fileName = filePath.split('/').pop() || 'file';
        const ext = fileName.split('.').pop() || '';
        const langMap: Record<string, string> = {
          js: 'javascript', ts: 'typescript', py: 'python', html: 'html',
          css: 'css', json: 'json', md: 'markdown', java: 'java',
          cpp: 'cpp', rs: 'rust', jsx: 'javascript', tsx: 'typescript',
        };
        const language = langMap[ext] || 'javascript';
        setFiles((prev) => [...prev, { name: fileName, content, language }]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pushToGitHub = async () => {
    if (!selectedRepo || !commitMsg.trim()) return;
    setLoading(true);
    setPushMessage('');
    try {
      const octokit = getOctokit();
      const [owner, repo] = selectedRepo.split('/');
      const refResponse = await octokit.git.getRef({ owner, repo, ref: 'heads/main' }).catch(() =>
        octokit.git.getRef({ owner, repo, ref: 'heads/master' })
      );
      const latestCommitSha = refResponse.data.object.sha;
      const commitResponse = await octokit.git.getCommit({ owner, repo, commit_sha: latestCommitSha });
      const baseTreeSha = commitResponse.data.tree.sha;
      const treeItems = await Promise.all(
        files.map(async (file) => {
          const blobResponse = await octokit.git.createBlob({ owner, repo, content: file.content, encoding: 'utf-8' });
          return { path: file.name, mode: '100644' as const, type: 'blob' as const, sha: blobResponse.data.sha };
        })
      );
      const treeResponse = await octokit.git.createTree({ owner, repo, base_tree: baseTreeSha, tree: treeItems });
      const commitCreateResponse = await octokit.git.createCommit({ owner, repo, message: commitMsg, tree: treeResponse.data.sha, parents: [latestCommitSha] });
      const refName = refResponse.data.ref.includes('main') ? 'heads/main' : 'heads/master';
      await octokit.git.updateRef({ owner, repo, ref: refName, sha: commitCreateResponse.data.sha });
      setPushMessage('Successfully pushed to GitHub!');
      setCommitMsg('');
    } catch (err: any) {
      setPushMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {/* Header */}
      <div className="toolbar">
        <div className="flex items-center gap-2">
          <GitBranch size={16} style={{ color: 'var(--text)' }} />
          <span className="font-semibold text-sm" style={{ color: 'var(--text-strong)' }}>
            GitHub
          </span>
          {selectedRepo && (
            <span style={{ color: 'var(--muted)', fontSize: 'var(--text-xs)' }}>
              / {selectedRepo}
            </span>
          )}
        </div>
        <div className="flex-1" />
        {currentPath && (
          <button
            onClick={() => loadRepoContents(selectedRepo, '')}
            className="btn"
          >
            <ArrowLeft size={14} />
            <span>Root</span>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4" style={{ background: 'var(--bg)' }}>
        {!settings.githubToken ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertCircle size={48} style={{ color: 'var(--warning)' }} />
            <p className="font-semibold mt-4" style={{ color: 'var(--text-strong)' }}>
              GitHub Token not configured
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
              Open settings and add your GitHub Personal Access Token
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Load Repos Button */}
            <button onClick={loadRepos} disabled={loading} className="btn-primary">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Loading...' : 'Load Repositories'}</span>
            </button>

            {error && (
              <div className="card" style={{ borderColor: 'var(--error)' }}>
                <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
              </div>
            )}

            {/* Repos List */}
            {repos.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                  Your Repositories
                </h3>
                <div className="grid gap-2 max-h-[400px] overflow-y-auto">
                  {repos.map((repo) => (
                    <button
                      key={repo.full_name}
                      onClick={() => loadRepoContents(repo.full_name)}
                      className="card flex items-center gap-3 text-left"
                    >
                      <FolderOpen size={16} style={{ color: 'var(--warning)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                          {repo.name}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                          {repo.description || 'No description'}
                        </p>
                      </div>
                      {repo.language && (
                        <span className="badge badge-info">{repo.language}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Repo Files */}
            {repoFiles.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                  {currentPath ? `Files in /${currentPath}` : 'Root Files'}
                </h3>
                <div className="card p-0 overflow-hidden">
                  {repoFiles.map((file, i) => (
                    <div
                      key={file.path}
                      className="flex items-center gap-3 p-3 cursor-pointer transition-colors"
                      style={{
                        borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                      }}
                      onClick={() => {
                        if (file.type === 'dir') {
                          loadRepoContents(selectedRepo, file.path);
                        } else {
                          loadFileContent(file.path);
                        }
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {file.type === 'dir' ? (
                        <FolderOpen size={14} style={{ color: 'var(--warning)' }} />
                      ) : (
                        <FileCode size={14} style={{ color: 'var(--info)' }} />
                      )}
                      <span className="text-sm" style={{ color: 'var(--text)' }}>{file.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Push to GitHub */}
            {selectedRepo && (
              <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
                  Push to Repository
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commitMsg}
                    onChange={(e) => setCommitMsg(e.target.value)}
                    placeholder="Commit message..."
                    className="input flex-1"
                  />
                  <button
                    onClick={pushToGitHub}
                    disabled={loading || !commitMsg.trim()}
                    className="btn-primary"
                  >
                    <Download size={14} />
                    <span>Push</span>
                  </button>
                </div>
                {pushMessage && (
                  <p className="text-sm mt-3" style={{ color: pushMessage.includes('Successfully') ? 'var(--success)' : 'var(--error)' }}>
                    {pushMessage}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
