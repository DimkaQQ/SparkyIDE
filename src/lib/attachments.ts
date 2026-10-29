import type { DocumentAttachment } from '../types';

/** PDF.js is heavy, so it is only fetched when the user actually attaches a PDF. */
async function loadPdfjs() {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
}

/** Text budget for one attachment; longer files are truncated with a marker. */
export const MAX_DOCUMENT_CHARS = 60_000;

export function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error(`Could not read ${file.name}.`));
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function tidyPage(text: string): string {
  return text
    .replace(/\u00ad/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extracts the selectable text of a PDF in the browser. Scanned documents have
 * no text layer, so they come back with an empty `text`.
 */
export async function readPdf(file: File): Promise<DocumentAttachment> {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  try {
    const pages: string[] = [];
    let budget = MAX_DOCUMENT_CHARS;
    for (let index = 1; index <= doc.numPages && budget > 0; index += 1) {
      const page = await doc.getPage(index);
      const content = await page.getTextContent();
      let raw = '';
      for (const item of content.items) {
        if (!('str' in item)) continue;
        raw += item.str + (item.hasEOL ? '\n' : ' ');
      }
      const text = tidyPage(raw);
      page.cleanup();
      if (!text) continue;
      const slice = text.length > budget ? `${text.slice(0, budget)}…` : text;
      budget -= slice.length;
      pages.push(`--- page ${index} ---\n${slice}`);
    }

    return {
      name: file.name,
      kind: 'pdf',
      pages: doc.numPages,
      text: pages.join('\n\n'),
      bytes: file.size,
    };
  } finally {
    void doc.destroy();
  }
}

export function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

export function isImage(file: File): boolean {
  return file.type.startsWith('image/');
}

const TEXT_EXTENSIONS =
  /\.(txt|md|markdown|mdx|csv|tsv|json|jsonc|ya?ml|toml|ini|cfg|conf|log|html?|css|scss|less|jsx?|tsx?|py|rb|go|rs|java|kt|c|h|cpp|cs|php|sh|bash|zsh|sql|env|gitignore)$/i;

export function isTextFile(file: File): boolean {
  if (isPdf(file) || isImage(file)) return false;
  if (TEXT_EXTENSIONS.test(file.name)) return true;
  return /^text\//.test(file.type) || file.type === 'application/json';
}

/** Reads a plain text attachment, such as a README, CSV dump or source file. */
export async function readTextFile(file: File): Promise<DocumentAttachment> {
  const raw = await file.text();
  const text =
    raw.length > MAX_DOCUMENT_CHARS ? `${raw.slice(0, MAX_DOCUMENT_CHARS)}\n…truncated` : raw;
  return { name: file.name, kind: 'text', text, bytes: file.size };
}
