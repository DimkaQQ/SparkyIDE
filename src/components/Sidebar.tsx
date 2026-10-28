import { Code2, MessageSquare, GitBranch, Upload, Settings, Sun, Moon } from 'lucide-react';
import { Theme } from '../ThemeContext';

interface SidebarProps {
  activePanel: 'editor' | 'chat' | 'github' | 'files';
  setActivePanel: (panel: 'editor' | 'chat' | 'github' | 'files') => void;
  onOpenSettings: () => void;
  theme: Theme;
  toggleTheme: () => void;
}

export default function Sidebar({ activePanel, setActivePanel, onOpenSettings, theme, toggleTheme }: SidebarProps) {
  const items = [
    { id: 'editor' as const, icon: Code2, label: 'Editor' },
    { id: 'chat' as const, icon: MessageSquare, label: 'AI Chat' },
    { id: 'github' as const, icon: GitBranch, label: 'GitHub' },
    { id: 'files' as const, icon: Upload, label: 'Files' },
  ];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div
        className="flex items-center justify-center font-bold text-white"
        style={{
          width: 32,
          height: 32,
          borderRadius: 'var(--radius)',
          background: 'var(--accent)',
          fontSize: 'var(--text-sm)',
        }}
      >
        M
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 flex-1 w-full px-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activePanel === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePanel(item.id)}
              className={`btn-icon w-full ${isActive ? 'active' : ''}`}
              style={{
                width: '100%',
                height: 40,
                borderRadius: 'var(--radius)',
                position: 'relative',
              }}
              title={item.label}
            >
              <Icon size={20} />
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '25%',
                    bottom: '25%',
                    width: 2,
                    background: 'var(--accent)',
                    borderRadius: '0 2px 2px 0',
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="flex flex-col gap-1 w-full px-1.5 pb-2">
        <button
          onClick={toggleTheme}
          className="btn-icon w-full"
          style={{ width: '100%', height: 40 }}
          title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button
          onClick={onOpenSettings}
          className="btn-icon w-full"
          style={{ width: '100%', height: 40 }}
          title="Settings"
        >
          <Settings size={20} />
        </button>
      </div>
    </aside>
  );
}
