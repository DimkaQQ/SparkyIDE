import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, FilePlus2, Plus, Search, X } from 'lucide-react';
import { useStore } from '../state';
import { formatBytes } from '../lib/markdown';
import { diffWorkspace, type ChangeStatus } from '../lib/diff';
import FileTree from './FileTree';

export default function WorkspacePanel() {
  const {
    workspace,
    workspaceVersion,
    workspaceBaseline,
    markWorkspaceSaved,
    editorPath,
    openFile,
    writeFile,
  } = useStore();
  const [filter, setFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [changesOpen, setChangesOpen] = useState(true);

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

  const changes = useMemo(() => {
    void workspaceVersion;
    return diffWorkspace(workspace, workspaceBaseline);
  }, [workspace, workspaceBaseline, workspaceVersion]);

  const changeByPath = useMemo(() => {
    const map = new Map<string, ChangeStatus>();
    for (const change of changes) map.set(change.path, change.status);
    return map;
  }, [changes]);

  const addedLines = changes.reduce((sum, change) => sum + change.added, 0);
  const removedLines = changes.reduce((sum, change) => sum + change.removed, 0);

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

      {changes.length > 0 && (
        <div className="changes-block">
          <div className="changes-head">
            <button
              type="button"
              className="changes-toggle"
              onClick={() => setChangesOpen((open) => !open)}
            >
              {changesOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Changed
              <span className="changes-count">{changes.length}</span>
              <span className="changes-stat added">+{addedLines}</span>
              <span className="changes-stat removed">−{removedLines}</span>
            </button>
            <button
              type="button"
              className="icon-btn"
              title="Mark the workspace as saved (clear change marks)"
              aria-label="Mark workspace as saved"
              onClick={markWorkspaceSaved}
            >
              <Check size={13} />
            </button>
          </div>
          {changesOpen && (
            <div className="changes-list">
              {changes.map((change) => (
                <button
                  key={change.path}
                  type="button"
                  className={`changes-row ${change.status}`}
                  title={
                    change.status === 'deleted'
                      ? `${change.path} was deleted`
                      : `Open ${change.path}`
                  }
                  onClick={() => {
                    if (change.status !== 'deleted') openFile(change.path);
                  }}
                >
                  <span className="changes-file">{change.path}</span>
                  <span className="changes-stat added">{change.added > 0 ? `+${change.added}` : ''}</span>
                  <span className="changes-stat removed">
                    {change.removed > 0 ? `−${change.removed}` : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="sidebar-scroll">
        <FileTree
          paths={filtered}
          activePath={editorPath}
          onSelect={openFile}
          changeByPath={changeByPath}
        />
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
