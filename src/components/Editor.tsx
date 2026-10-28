import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Plus, X, FileCode } from 'lucide-react';

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

export default function EditorPanel({ files, setFiles, activeFile, setActiveFile }: EditorProps) {
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
      <div className="h-9 bg-[#181825] border-b border-[#313244] flex items-center overflow-x-auto">
        {files.map((file, index) => (
          <div
            key={index}
            onClick={() => setActiveFile(index)}
            className={`flex items-center gap-1.5 px-3 h-full cursor-pointer border-r border-[#313244] min-w-fit group ${
              activeFile === index
                ? 'bg-[#1e1e2e] text-white border-t-2 border-t-purple-500'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#1e1e2e]/50'
            }`}
          >
            <FileCode size={14} className="text-purple-400" />
            <span className="text-xs">{file.name}</span>
            {files.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); handleCloseFile(index); }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => setShowNewFile(!showNewFile)}
          className="px-3 h-full text-gray-400 hover:text-white transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* New File Dialog */}
      {showNewFile && (
        <div className="bg-[#181825] border-b border-[#313244] p-3 flex items-center gap-2">
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="filename.js"
            className="bg-[#313244] text-white text-sm px-3 py-1.5 rounded border border-[#45475a] focus:border-purple-500 focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
          />
          <select
            value={newFileLang}
            onChange={(e) => setNewFileLang(e.target.value)}
            className="bg-[#313244] text-white text-sm px-2 py-1.5 rounded border border-[#45475a] focus:border-purple-500 focus:outline-none"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
          <button
            onClick={handleCreateFile}
            className="bg-purple-600 text-white text-sm px-3 py-1.5 rounded hover:bg-purple-700 transition-colors"
          >
            Create
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
          theme="vs-dark"
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            minimap: { enabled: true },
            padding: { top: 16 },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}
