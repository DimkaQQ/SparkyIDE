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
    { id: 'editor' as const, icon: Code2, label: 'Editor', gradient: 'from-blue-500 to-cyan-500' },
    { id: 'chat' as const, icon: MessageSquare, label: 'AI Chat', gradient: 'from-purple-500 to-pink-500' },
    { id: 'github' as const, icon: GitBranch, label: 'GitHub', gradient: 'from-green-500 to-emerald-500' },
    { id: 'files' as const, icon: Upload, label: 'Files', gradient: 'from-orange-500 to-amber-500' },
  ];

  return (
    <div
      className="w-16 flex flex-col items-center py-5 gap-1 border-r"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-primary)',
      }}
    >
      {/* Logo */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg mb-4"
        style={{
          background: 'var(--accent-gradient)',
          boxShadow: 'var(--accent-glow)',
        }}
      >
        M
      </div>

      {/* Navigation */}
      <div className="flex flex-col gap-1.5 flex-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activePanel === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePanel(item.id)}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 group relative ${
                isActive ? 'scale-105' : 'hover:scale-105'
              }`}
              style={{
                background: isActive ? 'var(--accent-gradient)' : 'transparent',
                boxShadow: isActive ? 'var(--accent-glow)' : 'none',
                color: isActive ? 'white' : 'var(--text-muted)',
              }}
              title={item.label}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              {/* Tooltip */}
              <span
                className="absolute left-14 px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 translate-x-2 group-hover:translate-x-0"
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                {item.label}
              </span>
              {/* Active indicator */}
              {isActive && (
                <div
                  className="absolute -left-[1px] top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                  style={{ background: 'var(--accent-primary)' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-1.5 mt-auto">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-primary)',
          }}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-primary)',
          }}
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
}
