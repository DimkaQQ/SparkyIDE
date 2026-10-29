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

/** Text budget for one PDF; longer documents are truncated with a marker. */
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
