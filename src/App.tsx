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
    { name: 'main.js', content: '// Welcome to MetaCode IDE!\n// Start coding or ask AI for help.\n\nfunction greet(name) {\n  return `Hello, ${name}! 👋`;\n}\n\nconsole.log(greet("Developer"));', language: 'javascript' },
  ]);
  const [activeFile, setActiveFile] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; type: string; url: string; content?: string }[]>([]);

  const activeProvider = settings.providers.find((p) => p.id === settings.activeProviderId);
  const isConnected = !!activeProvider?.apiKey;
  const ghConnected = !!settings.githubToken;

  return (
    <AppContext.Provider value={{ settings, setSettings }}>
      <div className="h-screen w-screen flex overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
        {/* Sidebar */}
        <Sidebar
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          onOpenSettings={() => setShowSettings(true)}
          theme={theme}
          toggleTheme={toggleTheme}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div
            className="h-12 flex items-center px-5 justify-between border-b"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                style={{ background: 'var(--accent-gradient)' }}
              >
                M
              </div>
              <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                MetaCode IDE
              </span>
              <div className="h-4 w-px" style={{ background: 'var(--border-primary)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {files[activeFile]?.name || 'No file'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              {activeProvider && (
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${isConnected ? '' : ''}`}
                    style={{ background: isConnected ? 'var(--success)' : 'var(--error)' }}
                  />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {activeProvider.icon} {activeProvider.name.split(' ')[0]}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: ghConnected ? 'var(--success)' : 'var(--error)' }}
                />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>GitHub</span>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex overflow-hidden">
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
