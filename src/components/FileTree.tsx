import { useMemo, useState } from 'react';
import { ChevronRight, FileCode, FileImage, FileJson, FileText } from 'lucide-react';

interface FileTreeProps {
  paths: string[];
  activePath: string | null;
  onSelect: (path: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
  isFile: boolean;
}

function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: '', path: '', children: [], isFile: false };

  for (const path of paths) {
    const parts = path.split('/');
    let node = root;
    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      const nextPath = parts.slice(0, index + 1).join('/');
      let child = node.children.find((entry) => entry.name === part && entry.isFile === isFile);
      if (!child) {
        child = { name: part, path: nextPath, children: [], isFile };
        node.children.push(child);
      } else if (isFile) {
        child.isFile = true;
      }
      node = child;
    });
  }

  const sort = (node: TreeNode) => {
    node.children.sort((a, b) => {
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sort);
  };
  sort(root);
  return root;
}

function iconFor(name: string) {
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  if (['json', 'lock'].includes(extension)) return <FileJson size={13} />;
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(extension)) {
    return <FileImage size={13} />;
  }
  if (['md', 'txt', 'mdx'].includes(extension)) return <FileText size={13} />;
  return <FileCode size={13} />;
}

export default function FileTree({ paths, activePath, onSelect }: FileTreeProps) {
  const tree = useMemo(() => buildTree(paths), [paths]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderNode = (node: TreeNode, depth: number) => {
    if (node.isFile) {
      return (
        <button
          key={node.path}
          type="button"
          className={`tree-row ${activePath === node.path ? 'active' : ''}`}
          style={{ paddingLeft: 10 + depth * 12 }}
          onClick={() => onSelect(node.path)}
          title={node.path}
        >
          <span className="tree-icon">{iconFor(node.name)}</span>
          <span className="tree-name">{node.name}</span>
        </button>
      );
    }

    const isCollapsed = collapsed.has(node.path);
    return (
      <div key={`dir:${node.path}`}>
        <button
          type="button"
          className="tree-row dir"
          style={{ paddingLeft: 10 + depth * 12 }}
          onClick={() => toggle(node.path)}
        >
          <ChevronRight size={12} className={`tree-chevron ${isCollapsed ? '' : 'open'}`} />
          <span className="tree-name">{node.name}</span>
        </button>
        {!isCollapsed &&
          node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  if (paths.length === 0) {
    return <div className="tree-empty">No files yet. Ask the AI to create one.</div>;
  }

  return <div className="file-tree">{tree.children.map((node) => renderNode(node, 0))}</div>;
}
