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
    <div
      className="w-20 flex flex-col items-center py-6 border-r relative z-20"
      style={{
        background: 'var(--bg-glass)',
        borderColor: 'var(--border-primary)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }}
    >
      {/* Logo */}
      <div className="mb-8 relative group">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl gradient-bg shadow-glow-strong transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow-strong animate-gradient"
          style={{ backgroundSize: '200% 200%' }}
        >
          M
        </div>
        <div className="absolute inset-0 rounded-2xl gradient-bg opacity-0 group-hover:opacity-50 blur-xl transition-opacity duration-300" />
      </div>

      {/* Navigation */}
      <div className="flex flex-col gap-3 flex-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activePanel === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePanel(item.id)}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 group relative ${
                isActive ? 'scale-110' : 'hover:scale-105'
              }`}
              style={{
                background: isActive ? 'var(--accent-gradient)' : 'transparent',
                boxShadow: isActive ? 'var(--accent-glow)' : 'none',
                color: isActive ? 'white' : 'var(--text-muted)',
              }}
              title={item.label}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              
              {/* Tooltip */}
              <span
                className="absolute left-20 px-4 py-2 rounded-xl text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50 translate-x-2 group-hover:translate-x-0"
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-secondary)',
                  boxShadow: 'var(--shadow-lg)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                {item.label}
              </span>

              {/* Active indicator */}
              {isActive && (
                <>
                  <div
                    className="absolute -left-[2px] top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                    style={{ background: 'var(--accent-gradient)' }}
                  />
                  <div className="absolute inset-0 rounded-2xl gradient-bg opacity-20 blur-xl -z-10" />
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-3 mt-auto">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 relative group"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-primary)',
          }}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'var(--bg-hover)' }} />
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 relative group"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-primary)',
          }}
          title="Settings"
        >
          <Settings size={20} />
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'var(--bg-hover)' }} />
        </button>
      </div>
    </div>
  );
}
