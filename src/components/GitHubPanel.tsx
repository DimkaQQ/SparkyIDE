import { useState } from 'react';
import { useAppContext } from '../context';
import { GitBranch, FolderOpen, FileCode, Download, RefreshCw, AlertCircle, ArrowLeft, GitPullRequest } from 'lucide-react';
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
  content?: string;
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
      const { data: refData } = await octokit.git.getRef({ owner, repo, ref: 'heads/main' }).catch(() =>
        octokit.git.getRef({ owner, repo, ref: 'heads/master' })
      );
      const latestCommitSha = refData.object.sha;
      const { data: commitData } = await octokit.git.getCommit({ owner, repo, commit_sha: latestCommitSha });
      const baseTreeSha = commitData.tree.sha;
      const treeItems = await Promise.all(
        files.map(async (file) => {
          const { data: blob } = await octokit.git.createBlob({ owner, repo, content: file.content, encoding: 'utf-8' });
          return { path: file.name, mode: '100644' as const, type: 'blob' as const, sha: blob.sha };
        })
      );
      const { data: newTree } = await octokit.git.createTree({ owner, repo, base_tree: baseTreeSha, tree: treeItems });
      const { data: newCommit } = await octokit.git.createCommit({ owner, repo, message: commitMsg, tree: newTree.sha, parents: [latestCommitSha] });
      const refName = refData.ref.includes('main') ? 'heads/main' : 'heads/master';
      await octokit.git.updateRef({ owner, repo, ref: refName, sha: newCommit.sha });
      setPushMessage('✅ Successfully pushed to GitHub!');
      setCommitMsg('');
    } catch (err: any) {
      setPushMessage(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="h-14 flex items-center px-5 gap-3 border-b"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
          <GitBranch size={16} style={{ color: 'var(--success)' }} />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>GitHub</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {selectedRepo || 'Connect your repositories'}
          </p>
        </div>
        {currentPath && (
          <button
            onClick={() => loadRepoContents(selectedRepo, '')}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all duration-200 hover:scale-105"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-accent)' }}
          >
            <ArrowLeft size={12} /> Root
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5" style={{ background: 'var(--bg-primary)' }}>
        {!settings.githubToken ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
              <AlertCircle size={32} style={{ color: 'var(--warning)' }} />
            </div>
            <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              GitHub Token не настроен
            </p>
            <p className="text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>
              Перейди в настройки (⚙️) и добавь GitHub Personal Access Token с правами repo
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Load Repos Button */}
            <button
              onClick={loadRepos}
              disabled={loading}
              className="flex items-center gap-2 btn-primary"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Loading...' : 'Load Repositories'}
            </button>

            {error && (
              <div className="card" style={{ borderColor: 'var(--error)', background: 'rgba(239, 68, 68, 0.05)' }}>
                <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
              </div>
            )}

            {/* Repos List */}
            {repos.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Your Repositories
                </h3>
                <div className="grid gap-2 max-h-[400px] overflow-y-auto">
                  {repos.map((repo) => (
                    <button
                      key={repo.full_name}
                      onClick={() => loadRepoContents(repo.full_name)}
                      className="card flex items-center gap-3 text-left transition-all duration-200 hover:scale-[1.01]"
                    >
                      <FolderOpen size={18} style={{ color: 'var(--warning)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {repo.name}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
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
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {currentPath ? `Files in /${currentPath}` : 'Root Files'}
                </h3>
                <div className="card p-0 overflow-hidden">
                  {repoFiles.map((file, i) => (
                    <div
                      key={file.path}
                      className="flex items-center gap-3 p-3 cursor-pointer transition-all duration-150"
                      style={{
                        borderTop: i > 0 ? '1px solid var(--border-primary)' : 'none',
                      }}
                      onClick={() => {
                        if (file.type === 'dir') {
                          loadRepoContents(selectedRepo, file.path);
                        } else {
                          loadFileContent(file.path);
                        }
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {file.type === 'dir' ? (
                        <FolderOpen size={16} style={{ color: 'var(--warning)' }} />
                      ) : (
                        <FileCode size={16} style={{ color: 'var(--info)' }} />
                      )}
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{file.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Push to GitHub */}
            {selectedRepo && (
              <div className="border-t pt-5" style={{ borderColor: 'var(--border-primary)' }}>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                  Push to Repository
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commitMsg}
                    onChange={(e) => setCommitMsg(e.target.value)}
                    placeholder="Commit message..."
                    className="input-field flex-1"
                  />
                  <button
                    onClick={pushToGitHub}
                    disabled={loading || !commitMsg.trim()}
                    className="flex items-center gap-2 btn-primary"
                  >
                    <Download size={16} />
                    Push
                  </button>
                </div>
                {pushMessage && (
                  <p className="text-sm mt-3" style={{ color: pushMessage.includes('✅') ? 'var(--success)' : 'var(--error)' }}>
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
