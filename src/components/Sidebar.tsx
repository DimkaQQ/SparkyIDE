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
    { id: 'editor' as const, icon: Code2, label: 'Редактор' },
    { id: 'chat' as const, icon: MessageSquare, label: 'AI Чат' },
    { id: 'github' as const, icon: GitBranch, label: 'GitHub' },
    { id: 'files' as const, icon: Upload, label: 'Файлы' },
  ];

  return (
    <div
      className="w-24 flex flex-col items-center py-8 border-r relative z-20"
      style={{
        background: 'var(--bg-glass)',
        borderColor: 'var(--border-primary)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      }}
    >
      {/* Logo */}
      <div className="mb-12 relative group">
        <div
          className="w-16 h-16 rounded-3xl flex items-center justify-center text-white font-black text-2xl gradient-bg shadow-glow-strong transition-all duration-500 group-hover:scale-110 animate-gradient"
          style={{ backgroundSize: '200% 200%' }}
        >
          M
        </div>
        <div className="absolute inset-0 rounded-3xl gradient-bg opacity-0 group-hover:opacity-60 blur-2xl transition-opacity duration-500" />
      </div>

      {/* Navigation */}
      <div className="flex flex-col gap-4 flex-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activePanel === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePanel(item.id)}
              className={`flex flex-col items-center gap-2 w-20 py-4 rounded-2xl transition-all duration-500 group relative ${
                isActive ? 'scale-110' : 'hover:scale-105'
              }`}
              style={{
                background: isActive ? 'var(--accent-gradient)' : 'transparent',
                boxShadow: isActive ? 'var(--accent-glow-strong)' : 'none',
                color: isActive ? 'white' : 'var(--text-muted)',
              }}
            >
              <Icon size={28} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-xs font-bold uppercase tracking-wider">{item.label}</span>
              
              {/* Active indicator */}
              {isActive && (
                <>
                  <div
                    className="absolute -left-[3px] top-1/2 -translate-y-1/2 w-1.5 h-10 rounded-r-full"
                    style={{ background: 'var(--accent-gradient)' }}
                  />
                  <div className="absolute inset-0 rounded-2xl gradient-bg opacity-30 blur-2xl -z-10" />
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-4 mt-auto">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex flex-col items-center gap-2 w-20 py-4 rounded-2xl transition-all duration-500 hover:scale-105 relative group"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-muted)',
            border: '2px solid var(--border-secondary)',
          }}
        >
          {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
          <span className="text-xs font-bold uppercase tracking-wider">Тема</span>
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'var(--bg-hover)' }} />
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center gap-2 w-20 py-4 rounded-2xl transition-all duration-500 hover:scale-105 relative group"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-muted)',
            border: '2px solid var(--border-secondary)',
          }}
        >
          <Settings size={24} />
          <span className="text-xs font-bold uppercase tracking-wider">Настройки</span>
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'var(--bg-hover)' }} />
        </button>
      </div>
    </div>
  );
}
