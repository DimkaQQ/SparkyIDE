import { Code2, GitBranch, MessageSquare, Moon, PanelLeft, Settings, Sun } from 'lucide-react';
import { useStore, type Mode } from '../state';

const ITEMS: { id: Mode; label: string; icon: typeof Code2 }[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'github', label: 'GitHub', icon: GitBranch },
];

export default function Rail() {
  const {
    mode,
    setMode,
    sidebarOpen,
    setSidebarOpen,
    setSettingsOpen,
    theme,
    toggleTheme,
    githubUser,
  } = useStore();

  return (
    <aside className="rail">
      <div className="rail-logo" title="Sparky IDE">
        S
      </div>

      <nav className="rail-nav">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`rail-btn ${mode === item.id ? 'active' : ''}`}
              onClick={() => setMode(item.id)}
              title={item.label}
              aria-label={item.label}
            >
              <Icon size={19} />
            </button>
          );
        })}
      </nav>

      <div className="rail-bottom">
        <button
          type="button"
          className={`rail-btn small ${sidebarOpen ? 'active' : ''}`}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title="Toggle sidebar"
          aria-label="Toggle sidebar"
        >
          <PanelLeft size={17} />
        </button>
        <button
          type="button"
          className="rail-btn small"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <button
          type="button"
          className="rail-btn small"
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          aria-label="Settings"
        >
          <Settings size={17} />
        </button>
        <button
          type="button"
          className={`rail-avatar ${githubUser ? '' : 'empty'}`}
          onClick={() => setMode('github')}
          title={githubUser ? `@${githubUser.login}` : 'Connect GitHub'}
        >
          {githubUser ? (
            <img src={githubUser.avatarUrl} alt={githubUser.login} />
          ) : (
            <GitBranch size={15} />
          )}
        </button>
      </div>
    </aside>
  );
}
