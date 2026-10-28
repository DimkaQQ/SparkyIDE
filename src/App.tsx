import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import AIChat from './components/AIChat';
import GitHubPanel from './components/GitHubPanel';
import FileUpload from './components/FileUpload';
import SettingsModal from './components/SettingsModal';
import { AppContext, AppSettings, DEFAULT_PROVIDERS } from './context';

function App() {
  const [activePanel, setActivePanel] = useState<'editor' | 'chat' | 'github' | 'files'>('editor');
  const [settings, setSettings] = useState<AppSettings>({
    providers: DEFAULT_PROVIDERS,
    activeProviderId: 'anthropic',
    githubToken: '',
  });
  const [showSettings, setShowSettings] = useState(false);
  const [files, setFiles] = useState<{ name: string; content: string; language: string }[]>([
    { name: 'main.js', content: '// Welcome to MetaCode IDE!\n// Start coding or ask AI for help.\n\nconsole.log("Hello, World!");', language: 'javascript' },
  ]);
  const [activeFile, setActiveFile] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; type: string; url: string; content?: string }[]>([]);

  const activeProvider = settings.providers.find((p) => p.id === settings.activeProviderId);
  const isConnected = !!activeProvider?.apiKey;
  const ghConnected = !!settings.githubToken;

  return (
    <AppContext.Provider value={{ settings, setSettings }}>
      <div className="h-screen w-screen flex bg-[#1e1e2e] text-gray-200 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          onOpenSettings={() => setShowSettings(true)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="h-10 bg-[#181825] border-b border-[#313244] flex items-center px-4 justify-between">
            <div className="flex items-center gap-2">
              <span className="text-purple-400 font-bold text-sm">MetaCode IDE</span>
              <span className="text-xs text-gray-500">|</span>
              <span className="text-xs text-gray-400">
                {files[activeFile]?.name || 'No file'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {activeProvider && (
                <>
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
                  <span className="text-xs text-gray-400">
                    {activeProvider.icon} {activeProvider.name} {isConnected ? '✓' : '(no key)'}
                  </span>
                </>
              )}
              <span className={`w-2 h-2 rounded-full ${ghConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
              <span className="text-xs text-gray-400">
                {ghConnected ? 'GitHub ✓' : 'GitHub'}
              </span>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {activePanel === 'editor' && (
              <Editor
                files={files}
                setFiles={setFiles}
                activeFile={activeFile}
                setActiveFile={setActiveFile}
              />
            )}
            {activePanel === 'chat' && <AIChat />}
            {activePanel === 'github' && <GitHubPanel files={files} setFiles={setFiles} />}
            {activePanel === 'files' && (
              <FileUpload
                uploadedFiles={uploadedFiles}
                setUploadedFiles={setUploadedFiles}
                setFiles={setFiles}
              />
            )}
          </div>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <SettingsModal
            settings={settings}
            setSettings={setSettings}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    </AppContext.Provider>
  );
}

export default App;
