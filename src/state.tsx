import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { DEFAULT_PROVIDERS } from './providers';
import type {
  ChatMessage,
  DocumentAttachment,
  GitHubUser,
  ProviderConfig,
  Session,
} from './types';

export type Theme = 'dark' | 'light';
export type Mode = 'chat' | 'code' | 'github';

const STORAGE_KEY = 'sparky-ide:state:v1';

interface PersistedState {
  providers: ProviderConfig[];
  activeProviderId: string;
  sessions: Session[];
  activeSessionId: string;
  workspace: Record<string, string>;
  /** Snapshot the workspace is compared against to show what changed. */
  workspaceBaseline?: Record<string, string>;
  githubToken: string;
  theme: Theme;
  editorPath: string | null;
  /** Documents the user pinned as background for every chat message. */
  contextDocuments?: DocumentAttachment[];
}

export function uid(prefix = ''): string {
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createSession(): Session {
  const now = Date.now();
  return { id: uid('session-'), title: 'New chat', messages: [], createdAt: now, updatedAt: now };
}

const SEED_WORKSPACE: Record<string, string> = {
  'README.md': [
    '# Sparky workspace',
    '',
    'This workspace lives in your browser and is shared with the AI agent.',
    'Every file the agent creates or edits shows up in the Files panel, and you can',
    'commit the whole workspace to GitHub from the GitHub panel.',
    '',
    'Things to try:',
    '',
    '- "List the files and explain what this project does"',
    '- "Add a TypeScript helper with input validation"',
    '- "Read my repo owner/project and fix the failing build"',
  ].join('\n'),
  'src/greeting.ts': [
    'export function greeting(name: string): string {',
    '  const clean = name.trim();',
    '  if (!clean) return "Hello, stranger!";',
    '  return `Hello, ${clean}!`;',
    '}',
    '',
  ].join('\n'),
};

function loadState(): PersistedState {
  const fallback: PersistedState = {
    providers: DEFAULT_PROVIDERS,
    activeProviderId: DEFAULT_PROVIDERS[0].id,
    sessions: [createSession()],
    activeSessionId: '',
    workspace: SEED_WORKSPACE,
    workspaceBaseline: SEED_WORKSPACE,
    githubToken: '',
    theme: 'dark',
    editorPath: 'README.md',
    contextDocuments: [],
  };
  fallback.activeSessionId = fallback.sessions[0].id;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const providers =
      Array.isArray(parsed.providers) && parsed.providers.length > 0
        ? parsed.providers.map((provider) => ({
            ...provider,
            models: Array.isArray(provider.models) ? provider.models : [],
            apiKey: typeof provider.apiKey === 'string' ? provider.apiKey : '',
          }))
        : fallback.providers;
    const sessions =
      Array.isArray(parsed.sessions) && parsed.sessions.length > 0
        ? parsed.sessions
        : fallback.sessions;
    const workspace =
      parsed.workspace && typeof parsed.workspace === 'object'
        ? parsed.workspace
        : fallback.workspace;
    return {
      providers,
      workspaceBaseline:
        parsed.workspaceBaseline && typeof parsed.workspaceBaseline === 'object'
          ? parsed.workspaceBaseline
          : workspace,
      activeProviderId:
        parsed.activeProviderId && providers.some((p) => p.id === parsed.activeProviderId)
          ? parsed.activeProviderId
          : providers[0].id,
      sessions,
      activeSessionId:
        parsed.activeSessionId && sessions.some((s) => s.id === parsed.activeSessionId)
          ? parsed.activeSessionId
          : sessions[0].id,
      workspace,
      githubToken: typeof parsed.githubToken === 'string' ? parsed.githubToken : '',
      theme: parsed.theme === 'light' ? 'light' : 'dark',
      editorPath: typeof parsed.editorPath === 'string' ? parsed.editorPath : null,
      contextDocuments: Array.isArray(parsed.contextDocuments)
        ? parsed.contextDocuments.filter(
            (document): document is DocumentAttachment =>
              Boolean(document) && typeof document.name === 'string' && typeof document.text === 'string',
          )
        : [],
    };
  } catch {
    return fallback;
  }
}

function titleFrom(text: string): string {
  const clean = text
    .replace(/```[\s\S]*?```/g, 'code')
    .replace(/[#*`>_\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return 'New chat';
  return clean.length > 52 ? `${clean.slice(0, 52).trimEnd()}…` : clean;
}

export interface StoreValue {
  providers: ProviderConfig[];
  setProviders: React.Dispatch<React.SetStateAction<ProviderConfig[]>>;
  activeProviderId: string;
  setActiveProviderId: (id: string) => void;
  activeProvider: ProviderConfig | undefined;
  setProviderModel: (providerId: string, model: string) => void;

  sessions: Session[];
  activeSessionId: string;
  activeSession: Session | undefined;
  newSession: () => void;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => void;
  appendMessage: (sessionId: string, message: ChatMessage) => void;
  patchMessage: (sessionId: string, messageId: string, patch: Record<string, unknown>) => void;

  workspace: Record<string, string>;
  workspaceVersion: number;
  getWorkspace: () => Record<string, string>;
  writeFile: (path: string, content: string) => void;
  deleteFile: (path: string) => void;
  replaceWorkspace: (files: Record<string, string>) => void;
  /** Snapshot the workspace is compared against to show what changed. */
  workspaceBaseline: Record<string, string>;
  markWorkspaceSaved: () => void;
  editorPath: string | null;
  openFile: (path: string | null) => void;

  githubToken: string;
  setGithubToken: (token: string) => void;
  githubUser: GitHubUser | null;
  setGithubUser: (user: GitHubUser | null) => void;

  contextDocuments: DocumentAttachment[];
  pinDocument: (document: DocumentAttachment) => void;
  unpinDocument: (name: string) => void;

  theme: Theme;
  toggleTheme: () => void;

  mode: Mode;
  setMode: (mode: Mode) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  prefill: string | null;
  setPrefill: (value: string | null) => void;
  resetAll: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside <StoreProvider>.');
  return value;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [initial] = useState<PersistedState>(() => loadState());
  const [providers, setProviders] = useState<ProviderConfig[]>(initial.providers);
  const [activeProviderId, setActiveProviderIdState] = useState(initial.activeProviderId);
  const [sessions, setSessions] = useState<Session[]>(initial.sessions);
  const [activeSessionId, setActiveSessionId] = useState(initial.activeSessionId);
  const [githubToken, setGithubTokenState] = useState(initial.githubToken);
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [contextDocuments, setContextDocuments] = useState<DocumentAttachment[]>(
    initial.contextDocuments ?? [],
  );
  const [theme, setTheme] = useState<Theme>(initial.theme);
  const [editorPath, setEditorPath] = useState<string | null>(initial.editorPath);
  const [mode, setMode] = useState<Mode>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prefill, setPrefill] = useState<string | null>(null);

  const workspaceRef = useRef<Record<string, string>>(initial.workspace);
  const [workspaceBaseline, setWorkspaceBaseline] = useState<Record<string, string>>(
    initial.workspaceBaseline ?? initial.workspace,
  );
  const [workspaceVersion, bumpWorkspace] = useReducer((value: number) => value + 1, 0);

  const activeSessionIdRef = useRef(activeSessionId);
  activeSessionIdRef.current = activeSessionId;
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const activeProvider = useMemo(
    () => providers.find((provider) => provider.id === activeProviderId) ?? providers[0],
    [providers, activeProviderId],
  );

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId),
    [sessions, activeSessionId],
  );

  const setActiveProviderId = useCallback((id: string) => setActiveProviderIdState(id), []);

  const setProviderModel = useCallback((providerId: string, model: string) => {
    setProviders((prev) =>
      prev.map((provider) => (provider.id === providerId ? { ...provider, model } : provider)),
    );
  }, []);

  const newSession = useCallback(() => {
    const session = createSession();
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    setMode('chat');
  }, []);

  const selectSession = useCallback((id: string) => {
    setActiveSessionId(id);
    setMode('chat');
  }, []);

  const deleteSession = useCallback((id: string) => {
    const remaining = sessionsRef.current.filter((session) => session.id !== id);
    if (remaining.length === 0) {
      const session = createSession();
      setSessions([session]);
      setActiveSessionId(session.id);
      return;
    }
    setSessions(remaining);
    if (activeSessionIdRef.current === id) setActiveSessionId(remaining[0].id);
  }, []);

  const appendMessage = useCallback((sessionId: string, message: ChatMessage) => {
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== sessionId) return session;
        const autoTitle =
          session.title === 'New chat' && message.role === 'user'
            ? titleFrom(message.content)
            : session.title;
        return {
          ...session,
          title: autoTitle,
          messages: [...session.messages, message],
          updatedAt: Date.now(),
        };
      }),
    );
  }, []);

  const patchMessage = useCallback(
    (sessionId: string, messageId: string, patch: Record<string, unknown>) => {
      setSessions((prev) =>
        prev.map((session) => {
          if (session.id !== sessionId) return session;
          return {
            ...session,
            messages: session.messages.map((message) =>
              message.id === messageId
                ? ({ ...message, ...patch } as ChatMessage)
                : message,
            ),
            updatedAt: Date.now(),
          };
        }),
      );
    },
    [],
  );

  const writeFile = useCallback((path: string, content: string) => {
    workspaceRef.current = { ...workspaceRef.current, [path]: content };
    bumpWorkspace();
  }, []);

  const deleteFile = useCallback((path: string) => {
    const next = { ...workspaceRef.current };
    delete next[path];
    workspaceRef.current = next;
    bumpWorkspace();
  }, []);

  const replaceWorkspace = useCallback((files: Record<string, string>) => {
    workspaceRef.current = { ...files };
    // Importing a repository starts a new "nothing changed yet" point.
    setWorkspaceBaseline({ ...files });
    bumpWorkspace();
  }, []);

  const markWorkspaceSaved = useCallback(() => {
    setWorkspaceBaseline({ ...workspaceRef.current });
  }, []);

  const openFile = useCallback((path: string | null) => {
    setEditorPath(path);
    if (path) setMode('code');
  }, []);

  const setGithubToken = useCallback((token: string) => {
    setGithubTokenState(token.trim());
    setGithubUser(null);
  }, []);

  const pinDocument = useCallback((document: DocumentAttachment) => {
    setContextDocuments((prev) => {
      const without = prev.filter((item) => item.name !== document.name);
      return [...without, document];
    });
  }, []);

  const unpinDocument = useCallback((name: string) => {
    setContextDocuments((prev) => prev.filter((item) => item.name !== name));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const resetAll = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    window.location.reload();
  }, []);

  const snapshotRef = useRef<PersistedState | null>(null);

  useEffect(() => {
    snapshotRef.current = {
      providers,
      activeProviderId,
      sessions,
      activeSessionId,
      workspace: workspaceRef.current,
      workspaceBaseline,
      githubToken,
      theme,
      editorPath,
      contextDocuments,
    };
    const state = snapshotRef.current;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        /* storage may be full — the app keeps working in memory */
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [
    providers,
    activeProviderId,
    sessions,
    activeSessionId,
    githubToken,
    theme,
    editorPath,
    contextDocuments,
    workspaceBaseline,
    workspaceVersion,
  ]);

  // A reload right after a change must not lose it: flush the pending write.
  useEffect(() => {
    const flush = () => {
      if (!snapshotRef.current) return;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshotRef.current));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
    };
  }, []);

  const value: StoreValue = {
    providers,
    setProviders,
    activeProviderId,
    setActiveProviderId,
    activeProvider,
    setProviderModel,
    sessions,
    activeSessionId,
    activeSession,
    newSession,
    selectSession,
    deleteSession,
    appendMessage,
    patchMessage,
    workspace: workspaceRef.current,
    workspaceVersion,
    getWorkspace: () => workspaceRef.current,
    writeFile,
    deleteFile,
    replaceWorkspace,
    workspaceBaseline,
    markWorkspaceSaved,
    editorPath,
    openFile,
    githubToken,
    setGithubToken,
    githubUser,
    setGithubUser,
    contextDocuments,
    pinDocument,
    unpinDocument,
    theme,
    toggleTheme,
    mode,
    setMode,
    sidebarOpen,
    setSidebarOpen,
    settingsOpen,
    setSettingsOpen,
    prefill,
    setPrefill,
    resetAll,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
