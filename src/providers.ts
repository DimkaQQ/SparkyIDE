import type {
  ApiFormat,
  ChatMessage,
  ProviderConfig,
  ToolCall,
  ToolSchema,
  UserMessage,
} from './types';

/* -------------------------------------------------------------------------- */
/* Presets                                                                    */
/* -------------------------------------------------------------------------- */

export interface ProviderPreset {
  name: string;
  format: ApiFormat;
  baseUrl: string;
  icon: string;
  color: string;
  model: string;
  docsUrl: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    name: 'Anthropic (Claude)',
    format: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    icon: 'C',
    color: '#d97757',
    model: 'claude-sonnet-4-5',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    name: 'OpenAI',
    format: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    icon: 'O',
    color: '#10a37f',
    model: 'gpt-4o',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    name: 'Google Gemini',
    format: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    icon: 'G',
    color: '#4285f4',
    model: 'gemini-2.5-pro',
    docsUrl: 'https://aistudio.google.com/apikey',
  },
  {
    name: 'OpenRouter',
    format: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    icon: 'R',
    color: '#8b5cf6',
    model: 'anthropic/claude-sonnet-4.5',
    docsUrl: 'https://openrouter.ai/keys',
  },
  {
    name: 'Groq',
    format: 'openai',
    baseUrl: 'https://api.groq.com/openai/v1',
    icon: 'Q',
    color: '#f55036',
    model: 'llama-3.3-70b-versatile',
    docsUrl: 'https://console.groq.com/keys',
  },
  {
    name: 'DeepSeek',
    format: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    icon: 'D',
    color: '#4d6bfe',
    model: 'deepseek-chat',
    docsUrl: 'https://platform.deepseek.com/api_keys',
  },
  {
    name: 'Mistral AI',
    format: 'openai',
    baseUrl: 'https://api.mistral.ai/v1',
    icon: 'M',
    color: '#ff7000',
    model: 'mistral-large-latest',
    docsUrl: 'https://console.mistral.ai/api-keys',
  },
  {
    name: 'xAI (Grok)',
    format: 'openai',
    baseUrl: 'https://api.x.ai/v1',
    icon: 'X',
    color: '#c9c9c9',
    model: 'grok-4',
    docsUrl: 'https://console.x.ai',
  },
  {
    name: 'Together AI',
    format: 'openai',
    baseUrl: 'https://api.together.xyz/v1',
    icon: 'T',
    color: '#0f6fff',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    docsUrl: 'https://api.together.ai/settings/api-keys',
  },
  {
    name: 'Fireworks AI',
    format: 'openai',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    icon: 'F',
    color: '#f97316',
    model: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    docsUrl: 'https://fireworks.ai/account/api-keys',
  },
  {
    name: 'Cerebras',
    format: 'openai',
    baseUrl: 'https://api.cerebras.ai/v1',
    icon: 'B',
    color: '#f2f2f2',
    model: 'llama3.3-70b',
    docsUrl: 'https://cloud.cerebras.ai',
  },
  {
    name: 'Ollama (local)',
    format: 'openai',
    baseUrl: 'http://localhost:11434/v1',
    icon: 'L',
    color: '#8b8b93',
    model: 'llama3.2',
    docsUrl: 'https://ollama.com',
  },
  {
    name: 'LM Studio (local)',
    format: 'openai',
    baseUrl: 'http://localhost:1234/v1',
    icon: 'S',
    color: '#8b8b93',
    model: 'local-model',
    docsUrl: 'https://lmstudio.ai',
  },
  {
    name: 'vLLM / Self-hosted',
    format: 'openai',
    baseUrl: 'http://localhost:8000/v1',
    icon: 'V',
    color: '#8b8b93',
    model: 'local-model',
    docsUrl: 'https://docs.vllm.ai',
  },
  {
    name: 'Custom (OpenAI-compatible)',
    format: 'openai',
    baseUrl: 'https://api.example.com/v1',
    icon: '+',
    color: '#8b8b93',
    model: 'my-model',
    docsUrl: '',
  },
];

export function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function presetToProvider(preset: ProviderPreset, id?: string): ProviderConfig {
  return {
    id: id ?? slug(preset.name),
    name: preset.name,
    format: preset.format,
    baseUrl: preset.baseUrl,
    apiKey: '',
    model: preset.model,
    models: [],
    color: preset.color,
    icon: preset.icon,
  };
}

/** Providers that ship with the IDE out of the box. */
export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  'Anthropic (Claude)',
  'OpenAI',
  'Google Gemini',
  'OpenRouter',
  'Groq',
  'DeepSeek',
  'Ollama (local)',
]
  .map((name) => PROVIDER_PRESETS.find((p) => p.name === name))
  .filter((p): p is ProviderPreset => Boolean(p))
  .map((p) => presetToProvider(p));

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function headersFor(provider: ProviderConfig, stream: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(provider.headers ?? {}),
  };
  if (provider.format === 'anthropic') {
    headers['x-api-key'] = provider.apiKey;
    headers['anthropic-version'] = headers['anthropic-version'] ?? '2023-06-01';
    // Required for requests made directly from a browser.
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
  } else if (provider.format === 'openai') {
    if (provider.apiKey) headers.Authorization = `Bearer ${provider.apiKey}`;
    if (stream) headers.Accept = 'text/event-stream';
  }
  return headers;
}

async function ensureOk(res: Response, label: string): Promise<void> {
  if (res.ok) return;
  let detail = '';
  try {
    const text = await res.text();
    try {
      const json = JSON.parse(text) as Record<string, any>;
      detail =
        json?.error?.message ??
        json?.message ??
        json?.error ??
        text.slice(0, 600);
    } catch {
      detail = text.slice(0, 600);
    }
  } catch {
    /* ignore */
  }
  throw new Error(
    `${label} failed: ${res.status} ${res.statusText}${detail ? ` — ${String(detail)}` : ''}`,
  );
}

async function* readSSE(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<{ event?: string; data: string }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let event: string | undefined;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const raw = buffer.slice(0, newline).replace(/\r$/, '');
        buffer = buffer.slice(newline + 1);
        if (raw.trim() === '') {
          event = undefined;
          continue;
        }
        if (raw.startsWith('event:')) {
          event = raw.slice(6).trim();
          continue;
        }
        if (raw.startsWith('data:')) {
          yield { event, data: raw.slice(5).trim() };
        }
      }
    }
    const tail = buffer.trim();
    if (tail.startsWith('data:')) yield { event, data: tail.slice(5).trim() };
  } finally {
    reader.releaseLock();
  }
}

function parseArguments(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function safeJson(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    return {};
  }
}

/* -------------------------------------------------------------------------- */
/* Message conversion                                                         */
/* -------------------------------------------------------------------------- */

/**
 * PDFs travel as plain text so every provider can read them: the text is
 * wrapped in a <document> block right before the user's own message.
 */
function withDocuments(message: UserMessage): string {
  const documents = message.documents ?? [];
  const body = message.content || (message.images?.length ? 'Describe the attached image.' : '');
  if (documents.length === 0) return body;
  const blocks = documents.map((document) => {
    const text = document.text.trim();
    return [
      `<document name="${document.name}" pages="${document.pages}">`,
      text || '(no extractable text — this PDF is probably a scan of paper, ask the user for text or a screenshot)',
      '</document>',
    ].join('\n');
  });
  return [...blocks, body].filter((part) => part.trim() !== '').join('\n\n');
}

function toOpenAIMessages(system: string, messages: ChatMessage[]) {
  const out: any[] = [{ role: 'system', content: system }];
  for (const message of messages) {
    if (message.role === 'user') {
      if ((message.images && message.images.length > 0) || message.documents?.length) {
        out.push({
          role: 'user',
          content: [
            { type: 'text', text: withDocuments(message) },
            ...(message.images ?? []).map((url) => ({ type: 'image_url', image_url: { url } })),
          ],
        });
      } else {
        out.push({ role: 'user', content: message.content });
      }
    } else if (message.role === 'assistant') {
      const toolCalls = message.toolCalls ?? [];
      out.push({
        role: 'assistant',
        content: message.content || (toolCalls.length > 0 ? null : ''),
        ...(toolCalls.length > 0
          ? {
              tool_calls: toolCalls.map((call) => ({
                id: call.id,
                type: 'function',
                function: { name: call.name, arguments: call.arguments || '{}' },
              })),
            }
          : {}),
      });
    } else if (message.role === 'tool') {
      out.push({ role: 'tool', tool_call_id: message.toolCallId, content: message.content });
    }
  }
  return out;
}

function toAnthropicMessages(messages: ChatMessage[]) {
  const out: any[] = [];
  const push = (role: 'user' | 'assistant', blocks: any[]) => {
    if (blocks.length === 0) return;
    const last = out[out.length - 1];
    if (last && last.role === role && Array.isArray(last.content)) {
      last.content.push(...blocks);
      return;
    }
    out.push({ role, content: blocks });
  };

  for (const message of messages) {
    if (message.role === 'user') {
      const blocks: any[] = [];
      if (message.images) {
        for (const url of message.images) {
          const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(url);
          if (match) {
            blocks.push({
              type: 'image',
              source: { type: 'base64', media_type: match[1], data: match[2] },
            });
          }
        }
      }
      blocks.push({ type: 'text', text: withDocuments(message) });
      push('user', blocks);
    } else if (message.role === 'assistant') {
      const blocks: any[] = [];
      if (message.content) blocks.push({ type: 'text', text: message.content });
      for (const call of message.toolCalls ?? []) {
        blocks.push({
          type: 'tool_use',
          id: call.id,
          name: call.name,
          input: parseArguments(call.arguments),
        });
      }
      push('assistant', blocks);
    } else if (message.role === 'tool') {
      push('user', [
        {
          type: 'tool_result',
          tool_use_id: message.toolCallId,
          content: message.content,
          ...(message.ok ? {} : { is_error: true }),
        },
      ]);
    }
  }
  return out;
}

function toGeminiContents(messages: ChatMessage[]) {
  const out: any[] = [];
  const push = (role: 'user' | 'model', parts: any[]) => {
    if (parts.length === 0) return;
    const last = out[out.length - 1];
    if (last && last.role === role) {
      last.parts.push(...parts);
      return;
    }
    out.push({ role, parts });
  };

  for (const message of messages) {
    if (message.role === 'user') {
      const parts: any[] = [];
      for (const url of message.images ?? []) {
        const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(url);
        if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      }
      parts.push({ text: withDocuments(message) });
      push('user', parts);
    } else if (message.role === 'assistant') {
      const parts: any[] = [];
      if (message.content) parts.push({ text: message.content });
      for (const call of message.toolCalls ?? []) {
        parts.push({ functionCall: { name: call.name, args: parseArguments(call.arguments) } });
      }
      push('model', parts);
    } else if (message.role === 'tool') {
      push('user', [
        {
          functionResponse: {
            name: message.name,
            response: message.ok
              ? { result: message.content }
              : { error: message.content },
          },
        },
      ]);
    }
  }
  return out;
}

function toOpenAITools(tools: ToolSchema[]) {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

function toAnthropicTools(tools: ToolSchema[]) {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  }));
}

function toGeminiTools(tools: ToolSchema[]) {
  return [{ functionDeclarations: tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  })) }];
}

/* -------------------------------------------------------------------------- */
/* Streaming                                                                  */
/* -------------------------------------------------------------------------- */

export interface CompletionRequest {
  provider: ProviderConfig;
  model: string;
  system: string;
  messages: ChatMessage[];
  tools: ToolSchema[];
  signal: AbortSignal;
  onText: (delta: string) => void;
}

export interface CompletionResult {
  content: string;
  toolCalls: ToolCall[];
  finishReason?: string;
  usage?: { input?: number; output?: number };
}

export async function streamCompletion(req: CompletionRequest): Promise<CompletionResult> {
  if (!req.provider.apiKey && !isLocalProvider(req.provider)) {
    throw new Error(`No API key configured for ${req.provider.name}.`);
  }
  if (!req.model) throw new Error(`No model selected for ${req.provider.name}.`);
  switch (req.provider.format) {
    case 'anthropic':
      return streamAnthropic(req);
    case 'gemini':
      return streamGemini(req);
    default:
      return streamOpenAI(req);
  }
}

function isLocalProvider(provider: ProviderConfig): boolean {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(provider.baseUrl);
}

async function streamOpenAI(req: CompletionRequest): Promise<CompletionResult> {
  const { provider, model, system, messages, tools, signal, onText } = req;
  const body: Record<string, unknown> = {
    model,
    messages: toOpenAIMessages(system, messages),
    stream: true,
  };
  if (tools.length > 0) {
    body.tools = toOpenAITools(tools);
    body.tool_choice = 'auto';
  }

  const res = await fetch(joinUrl(provider.baseUrl, 'chat/completions'), {
    method: 'POST',
    headers: headersFor(provider, true),
    body: JSON.stringify(body),
    signal,
  });
  await ensureOk(res, provider.name);

  const contentType = res.headers.get('content-type') ?? '';
  const toolMap = new Map<number, ToolCall>();
  let content = '';
  let finishReason: string | undefined;
  let usage: CompletionResult['usage'];

  if (contentType.includes('application/json')) {
    const json = (await res.json()) as any;
    if (json?.error) throw new Error(json.error.message ?? JSON.stringify(json.error));
    const message = json?.choices?.[0]?.message;
    content = typeof message?.content === 'string' ? message.content : '';
    if (content) onText(content);
    (message?.tool_calls ?? []).forEach((call: any, index: number) => {
      toolMap.set(index, {
        id: call.id ?? `call_${index}_${Date.now()}`,
        name: call.function?.name ?? '',
        arguments: call.function?.arguments ?? '{}',
      });
    });
    finishReason = json?.choices?.[0]?.finish_reason;
    if (json?.usage) usage = { input: json.usage.prompt_tokens, output: json.usage.completion_tokens };
  } else {
    if (!res.body) throw new Error(`${provider.name}: empty response body.`);
    for await (const chunk of readSSE(res.body)) {
      if (chunk.data === '[DONE]') break;
      if (!chunk.data) continue;
      let json: any;
      try {
        json = JSON.parse(chunk.data);
      } catch {
        continue;
      }
      if (json?.error) {
        throw new Error(json.error.message ?? JSON.stringify(json.error));
      }
      const choice = json?.choices?.[0];
      const delta = choice?.delta ?? {};
      if (typeof delta.content === 'string' && delta.content) {
        content += delta.content;
        onText(delta.content);
      }
      for (const call of delta.tool_calls ?? []) {
        const index: number = call.index ?? 0;
        const current =
          toolMap.get(index) ??
          ({ id: call.id ?? `call_${index}_${Date.now()}`, name: '', arguments: '' } as ToolCall);
        if (call.id) current.id = call.id;
        if (call.function?.name) current.name += call.function.name;
        if (call.function?.arguments) current.arguments += call.function.arguments;
        toolMap.set(index, current);
      }
      if (choice?.finish_reason) finishReason = choice.finish_reason;
      if (json?.usage) {
        usage = {
          input: json.usage.prompt_tokens ?? usage?.input,
          output: json.usage.completion_tokens ?? usage?.output,
        };
      }
    }
  }

  const toolCalls = [...toolMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, call]) => call)
    .filter((call) => call.name);

  return {
    content,
    toolCalls: toolCalls.map((call) => ({
      ...call,
      arguments: call.arguments.trim() ? call.arguments : '{}',
    })),
    finishReason,
    usage,
  };
}

async function streamAnthropic(req: CompletionRequest): Promise<CompletionResult> {
  const { provider, model, system, messages, tools, signal, onText } = req;
  const body: Record<string, unknown> = {
    model,
    max_tokens: 8192,
    system,
    messages: toAnthropicMessages(messages),
    stream: true,
  };
  if (tools.length > 0) body.tools = toAnthropicTools(tools);

  const res = await fetch(joinUrl(provider.baseUrl, 'messages'), {
    method: 'POST',
    headers: headersFor(provider, true),
    body: JSON.stringify(body),
    signal,
  });
  await ensureOk(res, provider.name);

  const contentType = res.headers.get('content-type') ?? '';
  const toolMap = new Map<number, ToolCall>();
  let content = '';
  let finishReason: string | undefined;
  let usage: CompletionResult['usage'];

  if (contentType.includes('application/json')) {
    const json = (await res.json()) as any;
    if (json?.error) throw new Error(json.error.message ?? JSON.stringify(json.error));
    for (const block of json?.content ?? []) {
      if (block.type === 'text' && block.text) {
        content += block.text;
        onText(block.text);
      } else if (block.type === 'tool_use') {
        toolMap.set(toolMap.size, {
          id: block.id,
          name: block.name,
          arguments: JSON.stringify(block.input ?? {}),
        });
      }
    }
    finishReason = json?.stop_reason;
    if (json?.usage) usage = { input: json.usage.input_tokens, output: json.usage.output_tokens };
  } else {
    if (!res.body) throw new Error(`${provider.name}: empty response body.`);
    for await (const chunk of readSSE(res.body)) {
      if (!chunk.data) continue;
      let json: any;
      try {
        json = JSON.parse(chunk.data);
      } catch {
        continue;
      }
      if (json?.type === 'error') {
        throw new Error(json.error?.message ?? 'Anthropic returned an error.');
      }
      if (json?.type === 'content_block_start') {
        const block = json.content_block;
        if (block?.type === 'tool_use') {
          toolMap.set(json.index ?? toolMap.size, {
            id: block.id,
            name: block.name,
            arguments: '',
          });
        } else if (block?.type === 'text' && block.text) {
          content += block.text;
          onText(block.text);
        }
      } else if (json?.type === 'content_block_delta') {
        const delta = json.delta;
        if (delta?.type === 'text_delta' && delta.text) {
          content += delta.text;
          onText(delta.text);
        } else if (delta?.type === 'input_json_delta') {
          const current = toolMap.get(json.index ?? 0);
          if (current) current.arguments += delta.partial_json ?? '';
        }
      } else if (json?.type === 'message_delta') {
        finishReason = json.delta?.stop_reason ?? finishReason;
        if (json.usage) {
          usage = { ...usage, output: json.usage.output_tokens ?? usage?.output };
        }
      } else if (json?.type === 'message_start' && json.message?.usage) {
        usage = { input: json.message.usage.input_tokens, output: json.message.usage.output_tokens };
      } else if (json?.type === 'message_stop') {
        break;
      }
    }
  }

  return {
    content,
    toolCalls: [...toolMap.values()]
      .filter((call) => call.name)
      .map((call) => ({ ...call, arguments: call.arguments.trim() ? call.arguments : '{}' })),
    finishReason,
    usage,
  };
}

async function streamGemini(req: CompletionRequest): Promise<CompletionResult> {
  const { provider, model, system, messages, tools, signal, onText } = req;
  const base = provider.baseUrl.replace(/\/+$/, '');
  const url = `${base}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(provider.apiKey)}`;

  const body: Record<string, unknown> = {
    systemInstruction: { role: 'system', parts: [{ text: system }] },
    contents: toGeminiContents(messages),
    generationConfig: { maxOutputTokens: 8192 },
  };
  if (tools.length > 0) body.tools = toGeminiTools(tools);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(provider.headers ?? {}) },
    body: JSON.stringify(body),
    signal,
  });
  await ensureOk(res, provider.name);

  let content = '';
  let finishReason: string | undefined;
  let usage: CompletionResult['usage'];
  const toolCalls: ToolCall[] = [];
  const seen = new Set<string>();

  const consumeChunk = (chunk: any) => {
    const candidate = chunk?.candidates?.[0];
    for (const part of candidate?.content?.parts ?? []) {
      if (typeof part.text === 'string' && part.text) {
        content += part.text;
        onText(part.text);
      }
      if (part.functionCall) {
        const name = part.functionCall.name as string;
        const args = JSON.stringify(part.functionCall.args ?? {});
        const key = `${name}:${args}`;
        if (!seen.has(key)) {
          seen.add(key);
          toolCalls.push({
            id: `gemini_${Date.now()}_${toolCalls.length}`,
            name,
            arguments: args,
          });
        }
      }
    }
    if (candidate?.finishReason) finishReason = candidate.finishReason;
    if (chunk?.usageMetadata) {
      usage = {
        input: chunk.usageMetadata.promptTokenCount,
        output: chunk.usageMetadata.candidatesTokenCount,
      };
    }
  };

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const json = (await res.json()) as any;
    if (json?.error) throw new Error(json.error.message ?? JSON.stringify(json.error));
    if (Array.isArray(json)) json.forEach(consumeChunk);
    else consumeChunk(json);
  } else {
    if (!res.body) throw new Error(`${provider.name}: empty response body.`);
    for await (const chunk of readSSE(res.body)) {
      if (!chunk.data || chunk.data === '[DONE]') continue;
      try {
        consumeChunk(JSON.parse(chunk.data));
      } catch {
        /* skip malformed chunk */
      }
    }
  }

  return { content, toolCalls, finishReason, usage };
}

/* -------------------------------------------------------------------------- */
/* Model discovery                                                            */
/* -------------------------------------------------------------------------- */

function uniqueModels(list: unknown[]): string[] {
  const models = list
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      const record = entry as Record<string, unknown>;
      return (record?.id ?? record?.name ?? record?.model) as string | undefined;
    })
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map((value) => (value.startsWith('models/') ? value.slice('models/'.length) : value));
  return [...new Set(models)].sort((a, b) => a.localeCompare(b));
}

/**
 * Asks the provider which models the key can actually use.
 * Works for OpenAI-compatible endpoints, Anthropic and Google Gemini.
 */
export async function discoverModels(provider: ProviderConfig): Promise<string[]> {
  if (!provider.apiKey && !isLocalProvider(provider)) {
    throw new Error('Add an API key first.');
  }

  if (provider.format === 'gemini') {
    const url = `${provider.baseUrl.replace(/\/+$/, '')}/models?pageSize=1000&key=${encodeURIComponent(provider.apiKey)}`;
    const res = await fetch(url, { headers: { ...(provider.headers ?? {}) } });
    await ensureOk(res, provider.name);
    const json = (await res.json()) as any;
    const models = (json?.models ?? []) as any[];
    const usable = models.filter((model) => {
      const methods: string[] = model?.supportedGenerationMethods ?? [];
      return methods.length === 0 || methods.includes('generateContent');
    });
    return uniqueModels(usable);
  }

  const res = await fetch(joinUrl(provider.baseUrl, 'models'), {
    headers: headersFor(provider, false),
  });
  await ensureOk(res, provider.name);
  const json = (await res.json()) as any;
  const list: unknown[] = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json?.models)
      ? json.models
      : Array.isArray(json)
        ? json
        : [];
  return uniqueModels(list);
}

/** Lightweight call used by the settings screen to validate a key. */
export async function verifyProvider(provider: ProviderConfig): Promise<string[]> {
  return discoverModels(provider);
}

export interface ModelOption {
  providerId: string;
  providerName: string;
  model: string;
}

export function modelsForProvider(provider: ProviderConfig): string[] {
  if (provider.models.length > 0) return provider.models;
  return provider.model ? [provider.model] : [];
}
