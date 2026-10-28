import { useState } from 'react';
import { useAppContext } from '../context';
import { GitBranch, FolderOpen, FileCode, Download, RefreshCw, AlertCircle } from 'lucide-react';
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

      // Get the latest commit SHA
      const { data: refData } = await octokit.git.getRef({ owner, repo, ref: 'heads/main' }).catch(() =>
        octokit.git.getRef({ owner, repo, ref: 'heads/master' })
      );
      const latestCommitSha = refData.object.sha;

      // Get tree
      const { data: commitData } = await octokit.git.getCommit({ owner, repo, commit_sha: latestCommitSha });
      const baseTreeSha = commitData.tree.sha;

      // Create blobs for each file
      const treeItems = await Promise.all(
        files.map(async (file) => {
          const { data: blob } = await octokit.git.createBlob({
            owner,
            repo,
            content: file.content,
            encoding: 'utf-8',
          });
          return {
            path: file.name,
            mode: '100644' as const,
            type: 'blob' as const,
            sha: blob.sha,
          };
        })
      );

      // Create tree
      const { data: newTree } = await octokit.git.createTree({
        owner,
        repo,
        base_tree: baseTreeSha,
        tree: treeItems,
      });

      // Create commit
      const { data: newCommit } = await octokit.git.createCommit({
        owner,
        repo,
        message: commitMsg,
        tree: newTree.sha,
        parents: [latestCommitSha],
      });

      // Update ref
      const refName = refData.ref.includes('main') ? 'heads/main' : 'heads/master';
      await octokit.git.updateRef({
        owner,
        repo,
        ref: refName,
        sha: newCommit.sha,
      });

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
      <div className="h-12 bg-[#181825] border-b border-[#313244] flex items-center px-4 gap-2">
        <GitBranch size={18} className="text-green-400" />
        <span className="font-medium text-sm">GitHub</span>
        {selectedRepo && (
          <span className="text-xs text-gray-400 ml-2">/ {selectedRepo}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!settings.githubToken ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <AlertCircle size={48} className="text-yellow-400" />
            <p className="text-gray-400">GitHub Token не настроен</p>
            <p className="text-sm text-gray-500">Перейди в настройки и добавь GitHub Personal Access Token</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Load Repos Button */}
            <button
              onClick={loadRepos}
              disabled={loading}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Loading...' : 'Load Repositories'}
            </button>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Repos List */}
            {repos.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-300">Your Repositories</h3>
                <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                  {repos.map((repo) => (
                    <button
                      key={repo.full_name}
                      onClick={() => loadRepoContents(repo.full_name)}
                      className="flex items-center gap-3 bg-[#313244] p-3 rounded-lg hover:bg-[#45475a] transition-colors text-left"
                    >
                      <FolderOpen size={16} className="text-yellow-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{repo.name}</p>
                        <p className="text-xs text-gray-400 truncate">{repo.description || 'No description'}</p>
                      </div>
                      {repo.language && (
                        <span className="text-xs text-gray-500 flex-shrink-0">{repo.language}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Repo Files */}
            {repoFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-300">
                    {currentPath ? `Files in /${currentPath}` : 'Root Files'}
                  </h3>
                  {currentPath && (
                    <button
                      onClick={() => loadRepoContents(selectedRepo, '')}
                      className="text-xs text-purple-400 hover:text-purple-300"
                    >
                      Back to root
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {repoFiles.map((file) => (
                    <div
                      key={file.path}
                      className={`flex items-center gap-2 p-2 rounded-lg ${
                        file.type === 'dir'
                          ? 'cursor-pointer hover:bg-[#313244]'
                          : 'cursor-pointer hover:bg-[#313244]'
                      }`}
                      onClick={() => {
                        if (file.type === 'dir') {
                          loadRepoContents(selectedRepo, file.path);
                        } else {
                          loadFileContent(file.path);
                        }
                      }}
                    >
                      {file.type === 'dir' ? (
                        <FolderOpen size={14} className="text-yellow-400" />
                      ) : (
                        <FileCode size={14} className="text-blue-400" />
                      )}
                      <span className="text-sm text-gray-300">{file.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Push to GitHub */}
            {selectedRepo && (
              <div className="border-t border-[#313244] pt-4 mt-4">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Push Files to Repository</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commitMsg}
                    onChange={(e) => setCommitMsg(e.target.value)}
                    placeholder="Commit message..."
                    className="flex-1 bg-[#313244] text-white text-sm px-3 py-2 rounded-lg border border-[#45475a] focus:border-green-500 focus:outline-none"
                  />
                  <button
                    onClick={pushToGitHub}
                    disabled={loading || !commitMsg.trim()}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <Download size={16} />
                    Push
                  </button>
                </div>
                {pushMessage && (
                  <p className={`text-sm mt-2 ${pushMessage.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>
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
