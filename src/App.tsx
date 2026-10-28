import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import AIChat from './components/AIChat';
import GitHubPanel from './components/GitHubPanel';
import FileUpload from './components/FileUpload';
import SettingsModal from './components/SettingsModal';
import { AppContext, AppSettings, DEFAULT_PROVIDERS } from './context';
import { ThemeProvider, useTheme } from './ThemeContext';
import { Wifi, WifiOff, GitBranch } from 'lucide-react';

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
    { name: 'main.js', content: '// Welcome to MetaCode IDE\n// Start coding or ask AI for help.\n\nconsole.log("Hello, World!");', language: 'javascript' },
  ]);
  const [activeFile, setActiveFile] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; type: string; url: string; content?: string }[]>([]);

  const activeProvider = settings.providers.find((p) => p.id === settings.activeProviderId);
  const isConnected = !!activeProvider?.apiKey;
  const ghConnected = !!settings.githubToken;

  return (
    <AppContext.Provider value={{ settings, setSettings }}>
      <div className="h-screen w-screen flex overflow-hidden" style={{ background: 'var(--bg)' }}>
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
            className="toolbar"
            style={{
              background: 'var(--panel)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="font-semibold"
                style={{ color: 'var(--text-strong)', fontSize: 'var(--text-sm)' }}
              >
                MetaCode IDE
              </span>
              <span style={{ color: 'var(--muted)', fontSize: 'var(--text-xs)' }}>|</span>
              <span style={{ color: 'var(--muted)', fontSize: 'var(--text-xs)' }}>
                {files[activeFile]?.name || 'No file'}
              </span>
            </div>

            <div className="flex-1" />

            {/* Status indicators */}
            <div className="flex items-center gap-3">
              {activeProvider && (
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <Wifi size={14} style={{ color: 'var(--success)' }} />
                  ) : (
                    <WifiOff size={14} style={{ color: 'var(--error)' }} />
                  )}
                  <span style={{ color: 'var(--muted)', fontSize: 'var(--text-xs)' }}>
                    {activeProvider.name.split(' ')[0]}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <GitBranch size={14} style={{ color: ghConnected ? 'var(--success)' : 'var(--muted)' }} />
                <span style={{ color: 'var(--muted)', fontSize: 'var(--text-xs)' }}>
                  {ghConnected ? 'GitHub' : 'No GitHub'}
                </span>
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
