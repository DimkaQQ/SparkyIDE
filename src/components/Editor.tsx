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
  if (['js', 'jsx', 'ts', 'tsx'].includes(ext || '')) return <FileCode size={14} />;
  if (ext === 'json') return <FileJson size={14} />;
  return <FileText size={14} />;
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
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {/* File Tabs */}
      <div className="tabs">
        {files.map((file, index) => (
          <div
            key={index}
            onClick={() => setActiveFile(index)}
            className={`tab ${activeFile === index ? 'active' : ''}`}
          >
            {getFileIcon(file.name)}
            <span>{file.name}</span>
            {files.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseFile(index);
                }}
                className="btn-icon"
                style={{ width: 20, height: 20, padding: 0, marginLeft: 'auto' }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => setShowNewFile(!showNewFile)}
          className="btn-icon"
          style={{ marginLeft: 'var(--gap)' }}
          title="New file"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* New File Dialog */}
      {showNewFile && (
        <div
          className="flex items-center gap-2 p-3 animate-fade-in"
          style={{
            background: 'var(--panel)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="filename.js"
            className="input"
            style={{ width: 200 }}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
            autoFocus
          />
          <select
            value={newFileLang}
            onChange={(e) => setNewFileLang(e.target.value)}
            className="input"
            style={{ width: 140 }}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
          <button onClick={handleCreateFile} className="btn-primary">
            Create
          </button>
          <button onClick={() => setShowNewFile(false)} className="btn">
            Cancel
          </button>
        </div>
      )}

      {/* Monaco Editor */}
      <div className="flex-1 min-w-0 min-h-0">
        <Editor
          height="100%"
          language={files[activeFile]?.language || 'javascript'}
          value={files[activeFile]?.content || ''}
          onChange={handleChange}
          theme={theme === 'dark' ? 'vs-dark' : 'vs'}
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
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
