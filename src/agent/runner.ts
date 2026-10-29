import type {
  ChatMessage,
  DocumentAttachment,
  ProviderConfig,
  ToolCall,
  ToolRunResult,
  ToolSchema,
} from '../types';
import { streamCompletion } from '../providers';
import { executeTool, TOOLS, type ToolContext } from './tools';

export interface AgentCallbacks {
  /** Creates a new assistant message in the store and returns its id. */
  startAssistant: (provider: ProviderConfig) => string;
  appendText: (messageId: string, delta: string) => void;
  setToolCalls: (messageId: string, toolCalls: ToolCall[]) => void;
  finishAssistant: (
    messageId: string,
    patch: { interrupted?: boolean; usage?: { input?: number; output?: number } },
  ) => void;
  appendToolResult: (message: ToolResultMessage) => void;
}

export interface ToolResultMessage {
  id: string;
  role: 'tool';
  toolCallId: string;
  name: string;
  content: string;
  ok: boolean;
  title?: string;
  meta?: Record<string, string | number | boolean>;
  createdAt: number;
}

export interface RunAgentOptions {
  provider: ProviderConfig;
  model: string;
  system: string;
  history: ChatMessage[];
  tools?: ToolSchema[];
  signal: AbortSignal;
  context: ToolContext;
  callbacks: AgentCallbacks;
  maxSteps?: number;
}

export interface RunAgentResult {
  steps: number;
  toolCalls: number;
}

/**
 * Runs the agent loop: stream an answer, execute any requested tools, feed the
 * results back to the model, and repeat until the model stops calling tools.
 */
export async function runAgent(options: RunAgentOptions): Promise<RunAgentResult> {
  const tools = options.tools ?? TOOLS;
  const maxSteps = options.maxSteps ?? 10;
  const working: ChatMessage[] = [...options.history];
  let toolCallCount = 0;

  for (let step = 0; step < maxSteps; step += 1) {
    if (options.signal.aborted) throw new DOMException('Aborted', 'AbortError');

    const messageId = options.callbacks.startAssistant(options.provider);
    let streamedText = '';

    const result = await streamCompletion({
      provider: options.provider,
      model: options.model,
      system: options.system,
      messages: working,
      tools,
      signal: options.signal,
      onText: (delta) => {
        streamedText += delta;
        options.callbacks.appendText(messageId, delta);
      },
    });

    const toolCalls = result.toolCalls.map((call) => ({
      ...call,
      arguments: call.arguments.trim() || '{}',
    }));

    options.callbacks.setToolCalls(messageId, toolCalls);
    options.callbacks.finishAssistant(messageId, { usage: result.usage });

    working.push({
      id: messageId,
      role: 'assistant',
      content: result.content || streamedText,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      model: options.model,
      providerId: options.provider.id,
      createdAt: Date.now(),
      usage: result.usage,
    });

    if (toolCalls.length === 0) {
      return { steps: step + 1, toolCalls: toolCallCount };
    }

    for (const call of toolCalls) {
      if (options.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      const toolResult: ToolRunResult = await executeTool(call, options.context);
      toolCallCount += 1;

      const message: ToolResultMessage = {
        id: `tool-${call.id || 'call'}-${Date.now()}-${toolCallCount}`,
        role: 'tool',
        toolCallId: call.id,
        name: call.name,
        content: toolResult.content,
        ok: toolResult.ok,
        title: toolResult.title,
        meta: toolResult.meta,
        createdAt: Date.now(),
      };
      options.callbacks.appendToolResult(message);
      working.push(message);
    }
  }

  const id = options.callbacks.startAssistant(options.provider);
  options.callbacks.appendText(
    id,
    `Stopped after ${maxSteps} tool steps. Ask me to continue if you want me to keep working.`,
  );
  options.callbacks.finishAssistant(id, {});
  return { steps: maxSteps, toolCalls: toolCallCount };
}

/** Compact description of the workspace + integrations handed to the model. */
export function buildSystemPrompt(input: {
  workspacePaths: string[];
  githubLogin?: string | null;
  activeFile?: string | null;
  contextDocuments?: DocumentAttachment[];
}): string {
  const paths = input.workspacePaths.slice(0, 240);
  const tree = paths.length > 0 ? paths.join('\n') : '(empty workspace)';
  const github = input.githubLogin
    ? [
        `GitHub is connected as @${input.githubLogin}. You can read repositories, create branches, commit, and open pull requests with the github_* tools.`,
        'Shipping flow: github_create_branch when you need a fresh branch → edit the workspace files → github_push_workspace to commit the whole workspace onto that branch → github_create_pr.',
        'Push to a dedicated branch instead of the default branch unless the user explicitly asks for the default branch.',
        'Never claim a push or commit happened without a github_ tool result that says it did.',
      ].join('\n')
    : 'GitHub is not connected. If the user asks for GitHub work, tell them to add a token in Settings → GitHub.';

  const pinned = (input.contextDocuments ?? []).filter(
    (document) => document.text.trim() !== '',
  );
  const contextBlock =
    pinned.length === 0
      ? ''
      : [
          '## Pinned context',
          'The user pinned these documents. Treat them as background for every answer in this chat and prefer them over guessing.',
          ...pinned.map((document) => {
            const pages = document.pages ? ` pages="${document.pages}"` : '';
            return `<document name="${document.name}"${pages}>\n${document.text.trim()}\n</document>`;
          }),
        ].join('\n');

  return [
    'You are Sparky, an autonomous AI coding agent inside Sparky IDE — a desktop-style development environment in the browser.',
    '',
    '## How to work',
    '- You have direct access to the user\'s workspace files through tools. Never pretend to read or edit a file: call the tool.',
    '- Inspect before editing: use list_files / read_file / search_files to understand the code first.',
    '- Prefer edit_file for small changes and write_file when creating or rewriting a file.',
    '- Keep changes focused on the request. Do not add unrelated refactors, dependencies or files.',
    '- After tools finish, summarise what changed and why, briefly.',
    '- If a tool fails, read the error, fix your call and retry once instead of guessing.',
    '',
    '## Answer style',
    '- Reply in the language the user writes in.',
    '- Use Markdown. Always put code in fenced blocks with a language tag.',
    '- Be concise and concrete. Mention file paths in `backticks`.',
    '',
    '## Workspace',
    tree,
    '',
    input.activeFile ? `The user currently has \`${input.activeFile}\` open in the editor.` : '',
    '',
    '## Integrations',
    github,
    '',
    contextBlock,
  ]
    .filter((line) => line !== '')
    .join('\n');
}
