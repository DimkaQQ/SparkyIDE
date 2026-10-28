import Editor from '@monaco-editor/react';
import { FileCode2, MessageSquare, Sparkles, Trash2 } from 'lucide-react';
import { useStore } from '../state';
import { formatBytes, languageOfFile } from '../lib/markdown';

export default function EditorPane() {
  const {
    editorPath,
    workspace,
    writeFile,
    deleteFile,
    openFile,
    setMode,
    setPrefill,
    theme,
  } = useStore();

  if (!editorPath || !(editorPath in workspace)) {
    return (
      <div className="empty-pane">
        <div className="empty-pane-icon">
          <FileCode2 size={22} />
        </div>
        <h2>Nothing open</h2>
        <p>Pick a file in the sidebar, or ask the AI to create one for you.</p>
        <button type="button" className="btn btn-sm" onClick={() => setMode('chat')}>
          <Sparkles size={13} />
          Go to chat
        </button>
      </div>
    );
  }

  const content = workspace[editorPath];

  return (
    <div className="editor-pane">
      <div className="editor-head">
        <FileCode2 size={14} />
        <span className="editor-path">{editorPath}</span>
        <span className="badge">{languageOfFile(editorPath)}</span>
        <span className="editor-stat">
          {content.split('\n').length} lines · {formatBytes(new Blob([content]).size)}
        </span>
        <div className="spacer" />
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            setMode('chat');
            setPrefill(`Explain \`${editorPath}\` and suggest concrete improvements.`);
          }}
        >
          <MessageSquare size={12} />
          Ask AI
        </button>
        <button
          type="button"
          className="icon-btn danger"
          title="Delete file"
          onClick={() => {
            if (window.confirm(`Delete ${editorPath} from the workspace?`)) {
              deleteFile(editorPath);
              openFile(null);
            }
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="editor-body">
        <Editor
          height="100%"
          path={editorPath}
          language={languageOfFile(editorPath)}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          value={content}
          onChange={(value) => writeFile(editorPath, value ?? '')}
          loading={<div className="editor-loading">Loading editor…</div>}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            padding: { top: 14, bottom: 14 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            automaticLayout: true,
            tabSize: 2,
            renderLineHighlight: 'line',
            cursorBlinking: 'smooth',
            bracketPairColorization: { enabled: true },
            wordWrap: 'on',
            lineHeight: 21,
          }}
        />
      </div>
      <div className="editor-foot">Autosaved to your local workspace · visible to the AI agent</div>
    </div>
  );
}
