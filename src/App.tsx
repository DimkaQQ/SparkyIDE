import { useEffect } from 'react';
import { GitBranch, PanelLeft, Plus, Settings as SettingsIcon, Wifi, WifiOff } from 'lucide-react';
import ChatView from './components/ChatView';
import EditorPane from './components/EditorPane';
import GitHubView from './components/GitHubView';
import Rail from './components/Rail';
import SessionList from './components/SessionList';
import SettingsModal from './components/SettingsModal';
import WorkspacePanel from './components/WorkspacePanel';
import { describeGitHubError, getViewer } from './github';
import { discoverModels } from './providers';
import { StoreProvider, useStore } from './state';

function Shell() {
  const {
    mode,
    setMode,
    sidebarOpen,
    setSidebarOpen,
    activeSession,
    editorPath,
    activeProvider,
    githubUser,
    githubToken,
    setGithubUser,
    providers,
    setProviders,
    setSettingsOpen,
    settingsOpen,
    newSession,
  } = useStore();

  // Verify a stored GitHub token once at startup.
  useEffect(() => {
    if (!githubToken || githubUser) return;
    let cancelled = false;
    getViewer(githubToken)
      .then((user) => {
        if (!cancelled) setGithubUser(user);
      })
      .catch((error) => {
        console.warn(describeGitHubError(error));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Silently discover models for providers that already have a key.
  useEffect(() => {
    if (providers.length === 0) return;
    let cancelled = false;
    const targets = providers.filter((provider) => provider.apiKey && provider.models.length === 0);
    if (targets.length === 0) return;

    void (async () => {
      for (const provider of targets) {
        try {
          const models = await discoverModels(provider);
          if (cancelled || models.length === 0) continue;
          setProviders((prev) =>
            prev.map((entry) =>
              entry.id === provider.id && entry.models.length === 0
                ? {
                    ...entry,
                    models,
                    modelsFetchedAt: Date.now(),
                    model: models.includes(entry.model) ? entry.model : models[0],
                  }
                : entry,
            ),
          );
        } catch {
          /* ignore: the settings screen shows errors on demand */
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasKey = Boolean(activeProvider?.apiKey);

  return (
    <div className="app">
      <Rail />

      <div className="shell">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle sidebar"
          >
            <PanelLeft size={15} />
          </button>

          <span className="topbar-title">
            {mode === 'chat'
              ? activeSession?.title ?? 'Chat'
              : mode === 'code'
                ? editorPath ?? 'Editor'
                : 'GitHub'}
          </span>

          <div className="spacer" />

          {mode === 'chat' && (
            <button type="button" className="btn btn-sm" onClick={newSession}>
              <Plus size={12} /> New chat
            </button>
          )}

          <button
            type="button"
            className={`status-chip ${hasKey ? 'ok' : ''}`}
            onClick={() => setSettingsOpen(true)}
            title={hasKey ? `Connected to ${activeProvider?.name}` : 'Add an API key'}
          >
            {hasKey ? <Wifi size={11} /> : <WifiOff size={11} />}
            {activeProvider?.name ?? 'No provider'}
          </button>

          <button
            type="button"
            className={`status-chip ${githubUser ? 'ok' : ''}`}
            onClick={() => setMode('github')}
            title={githubUser ? `Signed in as @${githubUser.login}` : 'Connect GitHub'}
          >
            <GitBranch size={11} />
            {githubUser ? `@${githubUser.login}` : 'GitHub'}
          </button>

          <button
            type="button"
            className="icon-btn"
            onClick={() => setSettingsOpen(true)}
            title="Settings"
          >
            <SettingsIcon size={15} />
          </button>
        </header>

        <div className="body">
          {sidebarOpen && mode !== 'github' && (
            <aside className="sidebar">
              {mode === 'chat' ? <SessionList /> : <WorkspacePanel />}
            </aside>
          )}

          <main className="main">
            {mode === 'chat' && <ChatView />}
            {mode === 'code' && <EditorPane />}
            {mode === 'github' && <GitHubView />}
          </main>
        </div>
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
