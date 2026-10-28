import { useMemo, useState } from 'react';
import { FilePlus2, Plus, Search, X } from 'lucide-react';
import { useStore } from '../state';
import { formatBytes } from '../lib/markdown';
import FileTree from './FileTree';

export default function WorkspacePanel() {
  const { workspace, workspaceVersion, editorPath, openFile, writeFile } = useStore();
  const [filter, setFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const paths = useMemo(() => {
    void workspaceVersion;
    return Object.keys(workspace).sort();
  }, [workspace, workspaceVersion]);

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return paths;
    return paths.filter((path) => path.toLowerCase().includes(needle));
  }, [paths, filter]);

  const totalBytes = useMemo(
    () => Object.values(workspace).reduce((sum, content) => sum + new Blob([content]).size, 0),
    [workspace],
  );

  const create = () => {
    const name = newName
      .trim()
      .replace(/^\/+/, '')
      .replace(/\\/g, '/');
    if (!name) return;
    if (name in workspace) {
      openFile(name);
      setCreating(false);
      setNewName('');
      return;
    }
    writeFile(name, '');
    openFile(name);
    setCreating(false);
    setNewName('');
  };

  return (
    <div className="sidebar-inner">
      <div className="sidebar-head">
        <span className="sidebar-title">Workspace</span>
        <button
          type="button"
          className="icon-btn"
          title="New file"
          onClick={() => setCreating((value) => !value)}
        >
          {creating ? <X size={14} /> : <FilePlus2 size={14} />}
        </button>
      </div>

      {creating && (
        <div className="new-file-row">
          <input
            autoFocus
            value={newName}
            placeholder="path/to/file.ts"
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') create();
              if (event.key === 'Escape') {
                setCreating(false);
                setNewName('');
              }
            }}
          />
          <button type="button" className="btn btn-sm" onClick={create}>
            <Plus size={12} />
          </button>
        </div>
      )}

      <div className="sidebar-search">
        <Search size={13} />
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter files…"
        />
      </div>

      <div className="sidebar-scroll">
        <FileTree paths={filtered} activePath={editorPath} onSelect={openFile} />
      </div>

      <div className="sidebar-foot">
        <div className="foot-stat">
          <span>{paths.length} files</span>
          <span>{formatBytes(totalBytes)}</span>
        </div>
        <div className="foot-note">Click a file to open it in the editor</div>
      </div>
    </div>
  );
}
