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
  if (['js', 'jsx', 'ts', 'tsx'].includes(ext || '')) return <FileCode size={13} className="text-yellow-400" />;
  if (ext === 'json') return <FileJson size={13} className="text-green-400" />;
  return <FileText size={13} className="text-blue-400" />;
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
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* File Tabs */}
      <div
        className="h-10 flex items-center overflow-x-auto border-b"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-primary)',
        }}
      >
        {files.map((file, index) => (
          <div
            key={index}
            onClick={() => setActiveFile(index)}
            className="flex items-center gap-2 px-4 h-full cursor-pointer border-r min-w-fit group transition-all duration-150"
            style={{
              borderColor: 'var(--border-primary)',
              background: activeFile === index ? 'var(--bg-primary)' : 'transparent',
              borderBottom: activeFile === index ? '2px solid var(--accent-primary)' : '2px solid transparent',
            }}
          >
            {getFileIcon(file.name)}
            <span
              className="text-xs font-medium"
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
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all duration-150 rounded p-0.5"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => setShowNewFile(!showNewFile)}
          className="px-3 h-full transition-all duration-150 hover:scale-110"
          style={{ color: 'var(--text-muted)' }}
        >
          <Plus size={16} />
        </button>
      </div>

      {/* New File Dialog */}
      {showNewFile && (
        <div
          className="flex items-center gap-3 p-3 border-b animate-fade-in"
          style={{
            background: 'var(--bg-tertiary)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="filename.js"
            className="input-field max-w-[200px]"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
            autoFocus
          />
          <select
            value={newFileLang}
            onChange={(e) => setNewFileLang(e.target.value)}
            className="input-field max-w-[150px]"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
          <button onClick={handleCreateFile} className="btn-primary text-sm py-2 px-4">
            Create
          </button>
          <button
            onClick={() => setShowNewFile(false)}
            className="text-sm px-3 py-2 rounded-lg"
            style={{ color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={files[activeFile]?.language || 'javascript'}
          value={files[activeFile]?.content || ''}
          onChange={handleChange}
          theme={theme === 'dark' ? 'vs-dark' : 'vs'}
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            minimap: { enabled: true },
            padding: { top: 16 },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            lineHeight: 22,
            letterSpacing: 0.3,
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            bracketPairColorization: { enabled: true },
          }}
        />
      </div>
    </div>
  );
}
