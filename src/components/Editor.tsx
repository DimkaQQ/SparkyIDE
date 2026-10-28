import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Plus, X, FileCode, FileJson, FileText } from 'lucide-react';
import { useTheme } from '../ThemeContext';

interface FileItem {
  name: string;
  content: string;
  language: string;
}

interface EditorProps {
  files: FileItem[];
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  activeFile: number;
  setActiveFile: (index: number) => void;
}

const LANGUAGES = ['javascript', 'typescript', 'python', 'html', 'css', 'json', 'markdown', 'java', 'cpp', 'rust'];

const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['js', 'jsx', 'ts', 'tsx'].includes(ext || '')) return <FileCode size={16} className="text-yellow-400" />;
  if (ext === 'json') return <FileJson size={16} className="text-green-400" />;
  return <FileText size={16} className="text-blue-400" />;
};

export default function EditorPanel({ files, setFiles, activeFile, setActiveFile }: EditorProps) {
  const { theme } = useTheme();
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileLang, setNewFileLang] = useState('javascript');

  const handleCreateFile = () => {
    if (!newFileName.trim()) return;
    setFiles([...files, { name: newFileName, content: '', language: newFileLang }]);
    setActiveFile(files.length);
    setShowNewFile(false);
    setNewFileName('');
  };

  const handleCloseFile = (index: number) => {
    if (files.length === 1) return;
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    if (activeFile >= newFiles.length) {
      setActiveFile(newFiles.length - 1);
    } else if (activeFile === index) {
      setActiveFile(Math.max(0, index - 1));
    }
  };

  const handleChange = (value: string | undefined) => {
    if (value === undefined) return;
    const newFiles = [...files];
    newFiles[activeFile] = { ...newFiles[activeFile], content: value };
    setFiles(newFiles);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* File Tabs */}
      <div
        className="h-14 flex items-center overflow-x-auto border-b relative z-10"
        style={{
          background: 'var(--bg-glass)',
          borderColor: 'var(--border-primary)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        }}
      >
        <div className="flex items-center gap-2 px-6">
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Файлы:
          </span>
        </div>
        {files.map((file, index) => (
          <div
            key={index}
            onClick={() => setActiveFile(index)}
            className="flex items-center gap-3 px-6 h-full cursor-pointer border-r min-w-fit group transition-all duration-300 relative"
            style={{
              borderColor: 'var(--border-primary)',
              background: activeFile === index ? 'var(--bg-tertiary)' : 'transparent',
            }}
          >
            {getFileIcon(file.name)}
            <span
              className="text-sm font-bold"
              style={{
                color: activeFile === index ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              {file.name}
            </span>
            {files.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseFile(index);
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all duration-300 rounded-lg p-1.5 hover:bg-red-500/10"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={14} />
              </button>
            )}
            {/* Active indicator */}
            {activeFile === index && (
              <div
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{ background: 'var(--accent-gradient)' }}
              />
            )}
          </div>
        ))}
        <button
          onClick={() => setShowNewFile(!showNewFile)}
          className="px-5 h-full transition-all duration-300 hover:scale-110 flex items-center gap-2"
          style={{ color: 'var(--text-muted)' }}
        >
          <Plus size={20} />
          <span className="text-sm font-bold uppercase tracking-wider">Новый</span>
        </button>
      </div>

      {/* New File Dialog */}
      {showNewFile && (
        <div
          className="flex items-center gap-5 p-6 border-b animate-fade-in relative z-10"
          style={{
            background: 'var(--bg-glass)',
            borderColor: 'var(--border-primary)',
            backdropFilter: 'blur(24px)',
          }}
        >
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Создать файл:
          </span>
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="имя_файла.js"
            className="input-field max-w-[250px]"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
            autoFocus
          />
          <select
            value={newFileLang}
            onChange={(e) => setNewFileLang(e.target.value)}
            className="input-field max-w-[180px]"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
          <button onClick={handleCreateFile} className="btn-primary text-sm py-3 px-6">
            Создать
          </button>
          <button
            onClick={() => setShowNewFile(false)}
            className="btn-secondary text-sm py-3 px-6"
          >
            Отмена
          </button>
        </div>
      )}

      {/* Monaco Editor */}
      <div className="flex-1 relative">
        <Editor
          height="100%"
          language={files[activeFile]?.language || 'javascript'}
          value={files[activeFile]?.content || ''}
          onChange={handleChange}
          theme={theme === 'dark' ? 'vs-dark' : 'vs'}
          options={{
            fontSize: 15,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            minimap: { enabled: true, scale: 0.01 },
            padding: { top: 24 },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            lineHeight: 26,
            letterSpacing: 0.3,
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
            },
          }}
        />
      </div>
    </div>
  );
}
