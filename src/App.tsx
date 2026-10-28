import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import AIChat from './components/AIChat';
import GitHubPanel from './components/GitHubPanel';
import FileUpload from './components/FileUpload';
import SettingsModal from './components/SettingsModal';
import { AppContext, AppSettings, DEFAULT_PROVIDERS } from './context';
import { ThemeProvider, useTheme } from './ThemeContext';

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const [activePanel, setActivePanel] = useState<'editor' | 'chat' | 'github' | 'files'>('editor');
  const [settings, setSettings] = useState<AppSettings>({
    providers: DEFAULT_PROVIDERS,
    activeProviderId: 'anthropic',
    githubToken: '',
  });
  const [showSettings, setShowSettings] = useState(false);
  const [files, setFiles] = useState<{ name: string; content: string; language: string }[]>([
    { name: 'main.js', content: '// ✨ Добро пожаловать в MetaCode IDE!\n// Твоя AI-среда для разработки\n\nfunction greet(name) {\n  return `Привет, ${name}! 👋`;\n}\n\nconsole.log(greet("Разработчик"));', language: 'javascript' },
  ]);
  const [activeFile, setActiveFile] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; type: string; url: string; content?: string }[]>([]);

  const activeProvider = settings.providers.find((p) => p.id === settings.activeProviderId);
  const isConnected = !!activeProvider?.apiKey;
  const ghConnected = !!settings.githubToken;

  return (
    <AppContext.Provider value={{ settings, setSettings }}>
      <div className="h-screen w-screen flex overflow-hidden relative" style={{ background: 'var(--bg-primary)' }}>
        {/* Decorative Background */}
        <div className="absolute inset-0 pointer-events-none mesh-gradient opacity-60" />
        <div className="glow-orb glow-orb-1" />
        <div className="glow-orb glow-orb-2" />

        {/* Sidebar */}
        <Sidebar
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          onOpenSettings={() => setShowSettings(true)}
          theme={theme}
          toggleTheme={toggleTheme}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Top Bar */}
          <div
            className="h-16 flex items-center px-8 justify-between border-b relative z-10"
            style={{
              background: 'var(--bg-glass)',
              borderColor: 'var(--border-primary)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            }}
          >
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-lg gradient-bg shadow-glow"
                >
                  M
                </div>
                <div>
                  <span className="font-black text-base tracking-tight block" style={{ color: 'var(--text-primary)' }}>
                    MetaCode IDE
                  </span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                    AI-Powered Development
                  </span>
                </div>
              </div>
              <div className="h-8 w-px mx-3" style={{ background: 'var(--border-secondary)' }} />
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '2px solid var(--border-primary)' }}>
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-primary)' }} />
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {files[activeFile]?.name || 'Нет файла'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {activeProvider && (
                <div className="flex items-center gap-3 px-5 py-2.5 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '2px solid var(--border-primary)' }}>
                  <span className="text-lg">{activeProvider.icon}</span>
                  <div>
                    <span className="text-sm font-bold block" style={{ color: 'var(--text-primary)' }}>
                      {activeProvider.name.split(' ')[0]}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: isConnected ? 'var(--success)' : 'var(--error)' }}>
                      {isConnected ? 'Подключено' : 'Нет ключа'}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 px-5 py-2.5 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '2px solid var(--border-primary)' }}>
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>GitHub</span>
                <span className="text-xs font-bold" style={{ color: ghConnected ? 'var(--success)' : 'var(--error)' }}>
                  {ghConnected ? '✓ Подключено' : '✗ Не подключено'}
                </span>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex overflow-hidden relative z-10">
            {activePanel === 'editor' && (
              <Editor files={files} setFiles={setFiles} activeFile={activeFile} setActiveFile={setActiveFile} />
            )}
            {activePanel === 'chat' && <AIChat />}
            {activePanel === 'github' && <GitHubPanel files={files} setFiles={setFiles} />}
            {activePanel === 'files' && (
              <FileUpload uploadedFiles={uploadedFiles} setUploadedFiles={setUploadedFiles} setFiles={setFiles} />
            )}
          </div>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <SettingsModal settings={settings} setSettings={setSettings} onClose={() => setShowSettings(false)} />
        )}
      </div>
    </AppContext.Provider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
