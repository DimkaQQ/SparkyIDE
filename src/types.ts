export type ApiFormat = 'openai' | 'anthropic' | 'gemini';

export interface JsonSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
}

export interface ToolSchema {
  name: string;
  description: string;
  parameters: JsonSchema;
}

export interface ToolCall {
  id: string;
  name: string;
  /** Raw JSON string exactly as streamed by the model. */
  arguments: string;
}

export interface UserMessage {
  id: string;
  role: 'user';
  content: string;
  images?: string[];
  createdAt: number;
}

export interface AssistantMessage {
  id: string;
  role: 'assistant';
  content: string;
  toolCalls?: ToolCall[];
  providerId?: string;
  model?: string;
  error?: boolean;
  interrupted?: boolean;
  usage?: { input?: number; output?: number };
  createdAt: number;
}

export interface ToolMessage {
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

export type ChatMessage = UserMessage | AssistantMessage | ToolMessage;

export interface Session {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface ProviderConfig {
  id: string;
  name: string;
  format: ApiFormat;
  baseUrl: string;
  apiKey: string;
  /** Currently selected model. */
  model: string;
  /** Models discovered through the provider's /models endpoint. */
  models: string[];
  modelsFetchedAt?: number;
  headers?: Record<string, string>;
  color: string;
  icon: string;
}

export interface GitHubUser {
  login: string;
  name: string | null;
  avatarUrl: string;
  htmlUrl: string;
}

export interface GitHubRepoSummary {
  fullName: string;
  name: string;
  owner: string;
  description: string | null;
  language: string | null;
  private: boolean;
  defaultBranch: string;
  stars: number;
  updatedAt: string;
  htmlUrl: string;
}

export interface GitHubTreeEntry {
  path: string;
  type: 'blob' | 'tree';
  size?: number;
}

export interface GitHubCommitSummary {
  sha: string;
  message: string;
  author: string;
  date: string;
  htmlUrl: string;
}

export interface ToolRunResult {
  ok: boolean;
  content: string;
  title: string;
  meta?: Record<string, string | number | boolean>;
}
