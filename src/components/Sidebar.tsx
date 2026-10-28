import { Code2, MessageSquare, GitBranch, Upload, Settings } from 'lucide-react';

interface SidebarProps {
  activePanel: 'editor' | 'chat' | 'github' | 'files';
  setActivePanel: (panel: 'editor' | 'chat' | 'github' | 'files') => void;
  onOpenSettings: () => void;
}

export default function Sidebar({ activePanel, setActivePanel, onOpenSettings }: SidebarProps) {
  const items = [
    { id: 'editor' as const, icon: Code2, label: 'Editor' },
    { id: 'chat' as const, icon: MessageSquare, label: 'AI Chat' },
    { id: 'github' as const, icon: GitBranch, label: 'GitHub' },
    { id: 'files' as const, icon: Upload, label: 'Files' },
  ];

  return (
    <div className="w-14 bg-[#181825] border-r border-[#313244] flex flex-col items-center py-4 gap-2">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => setActivePanel(item.id)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all group relative ${
              activePanel === item.id
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-gray-400 hover:text-white hover:bg-[#313244]'
            }`}
            title={item.label}
          >
            <Icon size={20} />
            <span className="absolute left-14 bg-[#313244] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
              {item.label}
            </span>
          </button>
        );
      })}

      <div className="flex-1" />

      <button
        onClick={onOpenSettings}
        className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#313244] transition-all"
        title="Settings"
      >
        <Settings size={20} />
      </button>
    </div>
  );
}
