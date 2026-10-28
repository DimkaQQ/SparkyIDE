import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUp,
  Bot,
  ImagePlus,
  KeyRound,
  Square,
  AlertTriangle,
  X,
} from 'lucide-react';
import { buildSystemPrompt, runAgent } from '../agent/runner';
import { useStore, uid } from '../state';
import type { ChatMessage, ToolMessage } from '../types';
import Markdown from './Markdown';
import ModelPicker from './ModelPicker';
import { ToolCard } from './ToolCard';

const SUGGESTIONS = [
  {
    title: 'Explain this workspace',
    prompt: 'List the files in my workspace and explain what this project does.',
  },
  {
    title: 'Write a feature',
    prompt:
      'Add a small TypeScript utility module with input validation and use it in the greeting code.',
  },
  {
    title: 'Review my repo',
    prompt: 'List my GitHub repositories, open one, and suggest three concrete improvements.',
  },
  {
    title: 'Commit my work',
    prompt: 'Commit the current workspace to GitHub on a new branch and open a pull request.',
  },
];

export default function ChatView() {
  const {
    activeProvider,
    activeSession,
    activeSessionId,
    appendMessage,
    patchMessage,
    workspace,
    getWorkspace,
    writeFile,
    deleteFile,
    githubToken,
    githubUser,
    editorPath,
    openFile,
    setSettingsOpen,
    prefill,
    setPrefill,
  } = useStore();

  const [input, setInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [composerError, setComposerError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const lastAssistantId = useRef<string | null>(null);
  const streamedText = useRef<Map<string, string>>(new Map());

  const messages = activeSession?.messages ?? [];

  const toolResults = useMemo(() => {
    const map = new Map<string, ToolMessage>();
    for (const message of messages) {
      if (message.role === 'tool') map.set(message.toolCallId, message);
    }
    return map;
  }, [messages]);

  const workspacePaths = useMemo(() => Object.keys(workspace).sort(), [workspace]);
  void workspacePaths;

  useEffect(() => {
    if (!prefill) return;
    setInput((previous) => (previous.trim() ? `${previous.trim()}\n\n${prefill}` : prefill));
    setPrefill(null);
    textareaRef.current?.focus();
  }, [prefill, setPrefill]);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 220)}px`;
  }, [input]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element || !stickToBottom.current) return;
    element.scrollTop = element.scrollHeight;
  }, [messages, busy]);

  const onScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    stickToBottom.current =
      element.scrollHeight - element.scrollTop - element.clientHeight < 90;
  };

  const attachImages = (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImages((previous) => [...previous, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const stop = () => {
    abortRef.current?.abort();
  };

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (busy) return;
    if (!text && images.length === 0) return;

    if (!activeProvider) {
      setSettingsOpen(true);
      return;
    }
    if (!activeProvider.apiKey && !/localhost|127\.0\.0\.1/.test(activeProvider.baseUrl)) {
      setComposerError(`Add an API key for ${activeProvider.name} to start chatting.`);
      return;
    }
    if (!activeProvider.model) {
      setComposerError('Choose a model for this provider first.');
      return;
    }

    setComposerError('');
    const sessionId = activeSessionId;
    const provider = activeProvider;
    const userMessage: ChatMessage = {
      id: uid('msg-'),
      role: 'user',
      content: text || 'Describe the attached image.',
      images: images.length > 0 ? [...images] : undefined,
      createdAt: Date.now(),
    };

    const history: ChatMessage[] = [...messages, userMessage];
    const usableHistory: ChatMessage[] = [];
    for (const message of history) {
      if (message.role === 'assistant' && (message.error || !message.content) && !message.toolCalls) {
        continue;
      }
      usableHistory.push(message);
    }

    appendMessage(sessionId, userMessage);
    setInput('');
    setImages([]);
    setBusy(true);
    lastAssistantId.current = null;
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await runAgent({
        provider,
        model: provider.model,
        system: buildSystemPrompt({
          workspacePaths: Object.keys(getWorkspace()).sort(),
          githubLogin: githubUser?.login ?? null,
          activeFile: editorPath,
        }),
        history: usableHistory,
        signal: controller.signal,
        context: {
          workspace: {
            read: getWorkspace,
            write: writeFile,
            remove: deleteFile,
          },
          githubToken,
        },
        callbacks: {
          startAssistant: (active) => {
            const id = uid('msg-');
            lastAssistantId.current = id;
            streamedText.current.set(id, '');
            appendMessage(sessionId, {
              id,
              role: 'assistant',
              content: '',
              providerId: active.id,
              model: active.model,
              createdAt: Date.now(),
            });
            return id;
          },
          appendText: (id, delta) => {
            const next = `${streamedText.current.get(id) ?? ''}${delta}`;
            streamedText.current.set(id, next);
            patchMessage(sessionId, id, { content: next });
          },
          setToolCalls: (id, toolCalls) => {
            patchMessage(sessionId, id, { toolCalls });
          },
          finishAssistant: (id, patch) => {
            patchMessage(sessionId, id, patch);
          },
          appendToolResult: (message) => {
            appendMessage(sessionId, message);
          },
        },
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      if (name === 'AbortError') {
        const id = lastAssistantId.current;
        if (id) {
          patchMessage(sessionId, id, {
            interrupted: true,
            content: streamedText.current.get(id) ?? '',
          });
        }
      } else {
        const message = error instanceof Error ? error.message : String(error);
        appendMessage(sessionId, {
          id: uid('msg-'),
          role: 'assistant',
          content: message,
          error: true,
          createdAt: Date.now(),
        });
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
      stickToBottom.current = true;
    }
  };

  const hasKey =
    Boolean(activeProvider?.apiKey) ||
    /localhost|127\.0\.0\.1/.test(activeProvider?.baseUrl ?? '');

  const lastMessage = messages[messages.length - 1];
  const showTyping =
    busy && (!lastMessage || lastMessage.role !== 'assistant' || !lastMessage.content);

  return (
    <div className="chat-view">
      <div className="chat-scroll" ref={scrollRef} onScroll={onScroll}>
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="empty-logo">S</div>
            <h1>What are we building?</h1>
            <p className="empty-sub">
              Sparky reads your workspace, edits files, and ships commits to GitHub.
            </p>

            {!hasKey && (
              <button
                type="button"
                className="notice-card"
                onClick={() => setSettingsOpen(true)}
              >
                <KeyRound size={16} />
                <span>
                  <strong>No API key yet.</strong> Connect any provider — Anthropic, OpenAI,
                  Gemini, OpenRouter, Groq, DeepSeek, Ollama — and Sparky will detect its models
                  automatically.
                </span>
              </button>
            )}

            <div className="suggestion-grid">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion.title}
                  type="button"
                  className="suggestion"
                  onClick={() => void send(suggestion.prompt)}
                  disabled={!hasKey || busy}
                >
                  <span className="suggestion-title">{suggestion.title}</span>
                  <span className="suggestion-text">{suggestion.prompt}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="message-list">
            {messages.map((message) => {
              if (message.role === 'tool') return null;

              if (message.role === 'user') {
                return (
                  <div key={message.id} className="msg user">
                    <div className="msg-body">
                      {message.images && message.images.length > 0 && (
                        <div className="msg-images">
                          {message.images.map((source, index) => (
                            <img key={index} src={source} alt="attachment" />
                          ))}
                        </div>
                      )}
                      <div className="user-text">{message.content}</div>
                    </div>
                  </div>
                );
              }

              const isEmpty =
                !message.content && (!message.toolCalls || message.toolCalls.length === 0);

              return (
                <div key={message.id} className="msg assistant">
                  <div className="msg-avatar">
                    <Bot size={14} />
                  </div>
                  <div className="msg-body">
                    {message.error ? (
                      <div className="error-card">
                        <AlertTriangle size={14} />
                        <div>
                          <strong>Request failed</strong>
                          <pre>{message.content}</pre>
                        </div>
                      </div>
                    ) : (
                      <>
                        {message.content && <Markdown content={message.content} />}
                        {message.toolCalls && message.toolCalls.length > 0 && (
                          <div className="tool-stack">
                            {message.toolCalls.map((call) => (
                              <ToolCard
                                key={call.id}
                                call={call}
                                result={toolResults.get(call.id)}
                                onOpenFile={openFile}
                              />
                            ))}
                          </div>
                        )}
                        {message.interrupted && (
                          <div className="stopped-chip">Stopped by you</div>
                        )}
                        {isEmpty && !message.interrupted && (
                          <div className="thinking">
                            <span />
                            <span />
                            <span />
                          </div>
                        )}
                      </>
                    )}
                    {message.model && !message.error && (
                      <div className="msg-meta">{message.model}</div>
                    )}
                  </div>
                </div>
              );
            })}

            {showTyping && (
              <div className="msg assistant">
                <div className="msg-avatar">
                  <Bot size={14} />
                </div>
                <div className="msg-body">
                  <div className="thinking">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="composer-wrap">
        {composerError && (
          <div className="composer-error">
            <AlertTriangle size={13} />
            <span>{composerError}</span>
            <button type="button" onClick={() => setSettingsOpen(true)}>
              Open settings
            </button>
            <button
              type="button"
              className="composer-error-close"
              onClick={() => setComposerError('')}
              aria-label="Dismiss"
            >
              <X size={12} />
            </button>
          </div>
        )}

        <div className="composer">
          {images.length > 0 && (
            <div className="composer-images">
              {images.map((source, index) => (
                <div key={index} className="composer-image">
                  <img src={source} alt="upload preview" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                    aria-label="Remove image"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            rows={1}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder={
              activeProvider
                ? `Ask ${activeProvider.name}…  (Enter to send, Shift+Enter for a new line)`
                : 'Connect a provider to start…'
            }
          />

          <div className="composer-bar">
            <button
              type="button"
              className="icon-btn"
              title="Attach images"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus size={15} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => {
                attachImages(event.target.files);
                event.target.value = '';
              }}
            />

            <ModelPicker />

            <div className="spacer" />

            {busy ? (
              <button type="button" className="send-btn stop" onClick={stop} title="Stop">
                <Square size={12} />
              </button>
            ) : (
              <button
                type="button"
                className="send-btn"
                onClick={() => void send()}
                disabled={(!input.trim() && images.length === 0) || !hasKey}
                title="Send"
              >
                <ArrowUp size={15} />
              </button>
            )}
          </div>
        </div>
        <div className="composer-hint">
          <span>{activeProvider?.name ?? 'No provider'} · {activeProvider?.model ?? 'no model'}</span>
          <span>Files and GitHub actions run locally in your browser</span>
        </div>
      </div>
    </div>
  );
}
