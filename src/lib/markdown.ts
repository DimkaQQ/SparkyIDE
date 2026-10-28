import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: true });

const BLOCK_TAGS = new Set([
  'P',
  'BR',
  'STRONG',
  'EM',
  'DEL',
  'CODE',
  'PRE',
  'BLOCKQUOTE',
  'UL',
  'OL',
  'LI',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'A',
  'HR',
  'TABLE',
  'THEAD',
  'TBODY',
  'TR',
  'TH',
  'TD',
  'IMG',
  'SPAN',
  'DIV',
  'SUP',
  'SUB',
  'KBD',
]);

const DROP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'FORM',
  'LINK',
  'META',
  'SVG',
  'MATH',
  'AUDIO',
  'VIDEO',
  'TEXTAREA',
  'INPUT',
  'BUTTON',
  'SELECT',
]);

function isSafeUrl(value: string, allowDataImage: boolean): boolean {
  const url = value.trim().toLowerCase();
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
    return true;
  }
  if (url.startsWith('#') || url.startsWith('/')) return true;
  if (allowDataImage && url.startsWith('data:image/')) return true;
  return false;
}

/**
 * Small allow-list sanitizer: model output is untrusted HTML, so strip
 * scripts, event handlers and dangerous URLs before rendering with innerHTML.
 */
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<div id="sparky-root">${html}</div>`, 'text/html');
  const root = doc.getElementById('sparky-root');
  if (!root) return '';

  const drop: Element[] = [];
  const unwrap: Element[] = [];

  root.querySelectorAll('*').forEach((element) => {
    if (DROP_TAGS.has(element.tagName)) {
      drop.push(element);
      return;
    }
    if (!BLOCK_TAGS.has(element.tagName)) {
      unwrap.push(element);
      return;
    }
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value;
      const allowed =
        name === 'class' ||
        name === 'title' ||
        (name === 'href' && element.tagName === 'A') ||
        ((name === 'src' || name === 'alt' || name === 'width' || name === 'height') &&
          element.tagName === 'IMG') ||
        name === 'align' ||
        name === 'start';
      if (!allowed) {
        element.removeAttribute(attribute.name);
        continue;
      }
      if ((name === 'href' || name === 'src') && !isSafeUrl(value, name === 'src')) {
        element.removeAttribute(attribute.name);
      }
    }
    if (element.tagName === 'A') {
      element.setAttribute('target', '_blank');
      element.setAttribute('rel', 'noopener noreferrer');
    }
  });

  for (const element of drop) element.remove();
  for (const element of unwrap) {
    const parent = element.parentNode;
    if (!parent) continue;
    while (element.firstChild) parent.insertBefore(element.firstChild, element);
    parent.removeChild(element);
  }

  return root.innerHTML;
}

export function renderMarkdown(source: string): string {
  if (!source) return '';
  try {
    const html = marked.parse(source, { async: false }) as string;
    return sanitizeHtml(html);
  } catch {
    return `<p>${source.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
  }
}

export function languageOfFile(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    c: 'c',
    h: 'c',
    cpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    html: 'html',
    css: 'css',
    scss: 'scss',
    json: 'json',
    md: 'markdown',
    yml: 'yaml',
    yaml: 'yaml',
    toml: 'ini',
    sh: 'shell',
    bash: 'shell',
    sql: 'sql',
    xml: 'xml',
    txt: 'plaintext',
  };
  return map[extension] ?? 'plaintext';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function timeAgo(timestamp: number): string {
  const seconds = Math.max(1, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
