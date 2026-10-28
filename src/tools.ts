import { Octokit } from '@octokit/rest';

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

// GitHub Tools
export const githubTools: Tool[] = [
  {
    name: 'create_repository',
    description: 'Create a new GitHub repository',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Repository name',
        },
        description: {
          type: 'string',
          description: 'Repository description',
        },
        private: {
          type: 'boolean',
          description: 'Whether the repository is private',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'push_files',
    description: 'Push multiple files to a GitHub repository',
    parameters: {
      type: 'object',
      properties: {
        repo: {
          type: 'string',
          description: 'Repository name (owner/repo format)',
        },
        files: {
          type: 'array',
          description: 'Array of files to push',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path' },
              content: { type: 'string', description: 'File content' },
            },
            required: ['path', 'content'],
          },
        },
        commit_message: {
          type: 'string',
          description: 'Commit message',
        },
      },
      required: ['repo', 'files', 'commit_message'],
    },
  },
  {
    name: 'list_repositories',
    description: 'List all repositories for the authenticated user',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_repository_files',
    description: 'Get all files from a repository',
    parameters: {
      type: 'object',
      properties: {
        repo: {
          type: 'string',
          description: 'Repository name (owner/repo format)',
        },
      },
      required: ['repo'],
    },
  },
];

export async function executeTool(
  toolCall: ToolCall,
  githubToken: string
): Promise<ToolResult> {
  try {
    const octokit = new Octokit({ auth: githubToken });

    switch (toolCall.name) {
      case 'create_repository': {
        const { name, description, private: isPrivate } = toolCall.arguments;
        const response = await octokit.repos.createForAuthenticatedUser({
          name,
          description,
          private: isPrivate || false,
        });
        return {
          success: true,
          output: `Repository created: ${response.data.html_url}`,
        };
      }

      case 'push_files': {
        const { repo, files, commit_message } = toolCall.arguments;
        const [owner, repoName] = repo.split('/');

        // Get the latest commit
        const refResponse = await octokit.git.getRef({
          owner,
          repo: repoName,
          ref: 'heads/main',
        }).catch(() => 
          octokit.git.getRef({ owner, repo: repoName, ref: 'heads/master' })
        );
        
        const latestCommitSha = refResponse.data.object.sha;
        const commitResponse = await octokit.git.getCommit({
          owner,
          repo: repoName,
          commit_sha: latestCommitSha,
        });
        const baseTreeSha = commitResponse.data.tree.sha;

        // Create blobs for each file
        const treeItems = await Promise.all(
          files.map(async (file: { path: string; content: string }) => {
            const blobResponse = await octokit.git.createBlob({
              owner,
              repo: repoName,
              content: file.content,
              encoding: 'utf-8',
            });
            return {
              path: file.path,
              mode: '100644' as const,
              type: 'blob' as const,
              sha: blobResponse.data.sha,
            };
          })
        );

        // Create tree
        const treeResponse = await octokit.git.createTree({
          owner,
          repo: repoName,
          base_tree: baseTreeSha,
          tree: treeItems,
        });

        // Create commit
        const commitCreateResponse = await octokit.git.createCommit({
          owner,
          repo: repoName,
          message: commit_message,
          tree: treeResponse.data.sha,
          parents: [latestCommitSha],
        });

        // Update ref
        const refName = refResponse.data.ref.includes('main') ? 'heads/main' : 'heads/master';
        await octokit.git.updateRef({
          owner,
          repo: repoName,
          ref: refName,
          sha: commitCreateResponse.data.sha,
        });

        return {
          success: true,
          output: `Successfully pushed ${files.length} file(s) to ${repo}`,
        };
      }

      case 'list_repositories': {
        const response = await octokit.repos.listForAuthenticatedUser({
          per_page: 100,
        });
        const repos = response.data.map((r) => ({
          name: r.full_name,
          description: r.description,
          private: r.private,
          url: r.html_url,
        }));
        return {
          success: true,
          output: JSON.stringify(repos, null, 2),
        };
      }

      case 'get_repository_files': {
        const { repo } = toolCall.arguments;
        const [owner, repoName] = repo.split('/');
        
        const response = await octokit.repos.getContent({
          owner,
          repo: repoName,
          path: '',
        });

        const files = Array.isArray(response.data) 
          ? response.data.map((item) => ({
              path: item.path,
              type: item.type,
              size: item.size,
            }))
          : [];

        return {
          success: true,
          output: JSON.stringify(files, null, 2),
        };
      }

      default:
        return {
          success: false,
          output: '',
          error: `Unknown tool: ${toolCall.name}`,
        };
    }
  } catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message,
    };
  }
}
