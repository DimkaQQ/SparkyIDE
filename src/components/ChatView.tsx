import { useEffect, useMemo, useRef, useState } from 'react';
import type { ClipboardEvent, DragEvent as ReactDragEvent } from 'react';
import {
  ArrowUp,
  Bot,
  Check,
  FileDiff,
  FileText,
  ImagePlus,
  KeyRound,
  Pin,
  Square,
  AlertTriangle,
  X,
} from 'lucide-react';
import { buildSystemPrompt, runAgent } from '../agent/runner';
import {
  MAX_DOCUMENT_CHARS,
  isImage,
  isPdf,
  isTextFile,
  readImage,
  readPdf,
  readTextFile,
} from '../lib/attachments';
import { diffWorkspace } from '../lib/diff';
import { useStore, uid } from '../state';
import type { ChatMessage, DocumentAttachment, ToolMessage } from '../types';
import Markdown from './Markdown';
import ModelPicker from './ModelPicker';
import { ToolCard } from './ToolCard';

/** How many transcript messages render at once before older ones load on scroll. */
const MESSAGE_PAGE = 30;

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
    contextDocuments,
    pinDocument,
    unpinDocument,
    workspaceBaseline,
    setMode,
  } = useStore();

  const [input, setInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [documents, setDocuments] = useState<DocumentAttachment[]>([]);
  const [attaching, setAttaching] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [contextQuery, setContextQuery] = useState('');
  // Only the tail of a long transcript is rendered; the rest loads on demand.
  const [visibleCount, setVisibleCount] = useState(MESSAGE_PAGE);
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
  const hiddenCount = Math.max(0, messages.length - visibleCount);
  const renderedMessages = hiddenCount > 0 ? messages.slice(hiddenCount) : messages;

  const toolResults = useMemo(() => {
    const map = new Map<string, ToolMessage>();
    for (const message of messages) {
      if (message.role === 'tool') map.set(message.toolCallId, message);
    }
    return map;
  }, [messages]);

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

  useEffect(() => {
    setVisibleCount(MESSAGE_PAGE);
    stickToBottom.current = true;
  }, [activeSessionId]);

  const pendingScrollRestore = useRef<number | null>(null);
  const lastScrollTop = useRef(0);

  const loadEarlier = () => {
    const element = scrollRef.current;
    if (!element) return;
    pendingScrollRestore.current = element.scrollHeight - element.scrollTop;
    setVisibleCount((count) => count + MESSAGE_PAGE);
  };

  // Prepending older messages must not jump the transcript under the cursor.
  useEffect(() => {
    const element = scrollRef.current;
    const keep = pendingScrollRestore.current;
    if (!element || keep === null) return;
    pendingScrollRestore.current = null;
    element.scrollTop = element.scrollHeight - keep;
    lastScrollTop.current = element.scrollTop;
  }, [visibleCount]);

  const onScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    const top = element.scrollTop;
    stickToBottom.current = element.scrollHeight - top - element.clientHeight < 90;
    // Auto-load only when the user scrolls up from further down: a short
    // transcript otherwise keeps loading pages until everything is rendered.
    const scrolledUp = lastScrollTop.current > top + 40;
    if (top < 80 && scrolledUp && hiddenCount > 0 && pendingScrollRestore.current === null) {
      loadEarlier();
    }
    lastScrollTop.current = top;
  };

  const attachFiles = async (files: FileList | File[] | null) => {
    const list = files ? Array.from(files) : [];
    if (list.length === 0) return;
    setComposerError('');
    setAttaching(true);
    const rejected: string[] = [];
    try {
      for (const file of list) {
        if (isImage(file)) {
          const dataUrl = await readImage(file);
          setImages((previous) => [...previous, dataUrl]);
        } else if (isPdf(file)) {
          const document = await readPdf(file);
          setDocuments((previous) => [...previous, document]);
        } else if (isTextFile(file)) {
          const document = await readTextFile(file);
          setDocuments((previous) => [...previous, document]);
        } else {
          rejected.push(file.name);
        }
      }
    } catch (error) {
      setComposerError(
        error instanceof Error ? error.message : 'Could not read that attachment.',
      );
    } finally {
      setAttaching(false);
    }
    if (rejected.length > 0) {
      setComposerError(
        `Unsupported file${rejected.length === 1 ? '' : 's'}: ${rejected.join(', ')}. Attach images, PDFs or text files.`,
      );
    }
  };

  // Dropping a file outside the composer must not navigate away from the app.
  useEffect(() => {
    const block = (event: DragEvent) => {
      if (event.dataTransfer?.types?.includes('Files')) event.preventDefault();
    };
    window.addEventListener('dragover', block);
    window.addEventListener('drop', block);
    return () => {
      window.removeEventListener('dragover', block);
      window.removeEventListener('drop', block);
    };
  }, []);

  const dragHandlers = {
    onDragOver: (event: ReactDragEvent<HTMLDivElement>) => {
      if (!event.dataTransfer.types.includes('Files')) return;
      event.preventDefault();
      setDragging(true);
    },
    onDragLeave: (event: ReactDragEvent<HTMLDivElement>) => {
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
      setDragging(false);
    },
    onDrop: (event: ReactDragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      if (event.dataTransfer.files.length > 0) void attachFiles(event.dataTransfer.files);
    },
  };

  // Screenshots on the clipboard (Cmd/Ctrl+V) behave like attachments.
  const workspaceFiles = useMemo(() => Object.keys(workspace).sort(), [workspace]);
  const changedFiles = useMemo(
    () => diffWorkspace(workspace, workspaceBaseline),
    [workspace, workspaceBaseline],
  );
  const changedLines = useMemo(
    () => ({
      added: changedFiles.reduce((sum, change) => sum + change.added, 0),
      removed: changedFiles.reduce((sum, change) => sum + change.removed, 0),
    }),
    [changedFiles],
  );
  const filteredWorkspaceFiles = useMemo(() => {
    const needle = contextQuery.trim().toLowerCase();
    if (!needle) return workspaceFiles;
    return workspaceFiles.filter((path) => path.toLowerCase().includes(needle));
  }, [workspaceFiles, contextQuery]);

  const toggleWorkspacePin = (path: string) => {
    if (contextDocuments.some((document) => document.name === path)) {
      unpinDocument(path);
      return;
    }
    const content = getWorkspace()[path];
    if (typeof content !== 'string') {
      setComposerError(`\`${path}\` is no longer in the workspace.`);
      return;
    }
    pinDocument({
      name: path,
      kind: 'text',
      text:
        content.length > MAX_DOCUMENT_CHARS
          ? `${content.slice(0, MAX_DOCUMENT_CHARS)}\n…truncated`
          : content,
      bytes: new Blob([content]).size,
    });
  };

  // The picker closes on a click outside of it or on Escape.
  useEffect(() => {
    if (!contextOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('.context-menu, .context-toggle')) return;
      setContextOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setContextOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [contextOpen]);

  const pasteAttachments = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
      isImage(file),
    );
    if (files.length === 0) return;
    event.preventDefault();
    void attachFiles(files);
  };

  const stop = () => {
    abortRef.current?.abort();
  };

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (busy || attaching) return;
    if (!text && images.length === 0 && documents.length === 0) return;

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
    // Pinned documents already travel in the system prompt, so skip duplicates.
    const pendingDocuments = documents.filter(
      (document) => !contextDocuments.some((pinned) => pinned.name === document.name),
    );
    const userMessage: ChatMessage = {
      id: uid('msg-'),
      role: 'user',
      content:
        text ||
        (pendingDocuments.length > 0
          ? 'Read the attached document and summarise what matters.'
          : 'Describe the attached image.'),
      images: images.length > 0 ? [...images] : undefined,
      documents: pendingDocuments.length > 0 ? [...pendingDocuments] : undefined,
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
    setDocuments([]);
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
          contextDocuments,
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
      <div
        className="chat-scroll"
        ref={scrollRef}
        onScroll={onScroll}
        onWheel={(event) => {
          // Already at the very top: a scroll event will not fire, so listen here.
          const element = scrollRef.current;
          if (event.deltaY < 0 && element && element.scrollTop <= 0 && hiddenCount > 0) {
            loadEarlier();
          }
        }}
      >
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
            {hiddenCount > 0 && (
              <div className="message-more">
                <button type="button" onClick={loadEarlier}>
                  Load {Math.min(MESSAGE_PAGE, hiddenCount)} earlier message
                  {Math.min(MESSAGE_PAGE, hiddenCount) === 1 ? '' : 's'} ({hiddenCount} hidden)
                </button>
              </div>
            )}
            {renderedMessages.map((message) => {
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
                      {message.documents && message.documents.length > 0 && (
                        <div className="msg-docs">
                          {message.documents.map((document, index) => (
                            <span key={index} className="msg-doc">
                              <FileText size={11} />
                              {document.name}
                              <em>{document.pages ? `${document.pages} p` : 'text'}</em>
                            </span>
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
        {contextDocuments.length > 0 && (
          <div className="pinned-context">
            <span className="pinned-context-label">
              <Pin size={11} /> Pinned context
            </span>
            {contextDocuments.map((document) => (
              <span key={document.name} className="pinned-doc">
                <FileText size={10} />
                {document.name}
                <em>{document.pages ? `${document.pages} p` : 'text'}</em>
                <button
                  type="button"
                  onClick={() => unpinDocument(document.name)}
                  aria-label={`Unpin ${document.name}`}
                >
                  <X size={9} />
                </button>
              </span>
            ))}
          </div>
        )}

        {composerError && (
          <div className="composer-error">
            <AlertTriangle size={13} />
            <span>{composerError}</span>
            {/api key|model/i.test(composerError) && (
              <button type="button" onClick={() => setSettingsOpen(true)}>
                Open settings
              </button>
            )}
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

        <div className={dragging ? 'composer drop-active' : 'composer'} {...dragHandlers}>
          {contextOpen && (
            <div className="context-menu">
              <div className="context-menu-head">
                <Pin size={12} /> Project context
              </div>
              <input
                className="input context-search"
                placeholder="Filter workspace files…"
                value={contextQuery}
                onChange={(event) => setContextQuery(event.target.value)}
                autoFocus
              />
              <div className="context-list">
                {filteredWorkspaceFiles.length === 0 && (
                  <div className="context-empty">
                    {workspaceFiles.length === 0 ? 'The workspace is empty.' : 'No files match.'}
                  </div>
                )}
                {filteredWorkspaceFiles.map((path) => {
                  const pinned = contextDocuments.some((document) => document.name === path);
                  return (
                    <button
                      key={path}
                      type="button"
                      className={`context-item ${pinned ? 'pinned' : ''}`}
                      onClick={() => toggleWorkspacePin(path)}
                    >
                      <FileText size={11} />
                      <span>{path}</span>
                      {pinned ? <Check size={12} /> : <Pin size={11} />}
                    </button>
                  );
                })}
              </div>
              <div className="context-menu-foot">
                Pinned files are sent with every message in this chat.
              </div>
            </div>
          )}

          {dragging && <div className="composer-drop-hint">Drop images, PDFs or text files</div>}
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

          {documents.length > 0 && (
            <div className="composer-docs">
              {documents.map((document, index) => (
                <div key={index} className="composer-doc">
                  <FileText size={12} />
                  <span className="composer-doc-name">{document.name}</span>
                  <em>
                    {document.pages ? `${document.pages} p · ` : ''}
                    {document.text
                      ? `${Math.max(1, Math.round(document.text.length / 1000))}k chars`
                      : 'no text layer'}
                  </em>
                  <button
                    type="button"
                    className="composer-doc-pin"
                    title="Keep in every message"
                    aria-label={`Keep ${document.name} in every message`}
                    onClick={() => {
                      pinDocument(document);
                      setDocuments((previous) => previous.filter((_, i) => i !== index));
                    }}
                  >
                    <Pin size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDocuments((previous) => previous.filter((_, i) => i !== index))
                    }
                    aria-label={`Remove ${document.name}`}
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
            onPaste={pasteAttachments}
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
              title="Attach images, PDFs or text files (or paste a screenshot)"
              disabled={attaching}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus size={15} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.pdf,.txt,.md,.markdown,.csv,.tsv,.json,.yml,.yaml,.toml,.log,.ts,.tsx,.js,.jsx,.py,.css,.html,.sh,.sql"
              multiple
              hidden
              onChange={(event) => {
                void attachFiles(event.target.files);
                event.target.value = '';
              }}
            />

            <button
              type="button"
              className={`icon-btn context-toggle ${contextOpen ? 'active' : ''}`}
              title="Pin a workspace file as context"
              aria-label="Pin a workspace file as context"
              onClick={() => setContextOpen((open) => !open)}
            >
              <Pin size={14} />
            </button>

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
                disabled={
                  (!input.trim() && images.length === 0 && documents.length === 0) ||
                  !hasKey ||
                  attaching
                }
                title="Send"
              >
                <ArrowUp size={15} />
              </button>
            )}
          </div>
        </div>
        <div className="composer-hint">
          <span>{activeProvider?.name ?? 'No provider'} · {activeProvider?.model ?? 'no model'}</span>
          {changedFiles.length > 0 ? (
            <button
              type="button"
              className="hint-changes"
              onClick={() => setMode('code')}
              title="Open the workspace and review what changed"
            >
              <FileDiff size={11} />
              {changedFiles.length} changed
              <em className="added">+{changedLines.added}</em>
              <em className="removed">−{changedLines.removed}</em>
            </button>
          ) : (
            <span>Files and GitHub actions run locally in your browser</span>
          )}
        </div>
      </div>
    </div>
  );
}
