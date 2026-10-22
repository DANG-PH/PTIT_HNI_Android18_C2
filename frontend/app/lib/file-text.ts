'use client'

/** The AI reads at most this much of one document (the API trims to the same length). */
export const MAX_DOC_CHARS = 60_000

/**
 * Turns a picked file into plain text inside the browser. PDFs are parsed locally with pdf.js, so the
 * file itself never leaves this device: only the extracted text is encrypted and stored.
 */
export async function readFileText(file: File): Promise<string> {
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) return file.text()
  const pdfjs = await import('pdfjs-dist')
  // Registering the worker module lets pdf.js run in this thread, with no separate worker file to serve.
  // @ts-ignore: the worker build ships without type declarations
  await import('pdfjs-dist/build/pdf.worker.min.mjs')
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const { items } = await (await pdf.getPage(i)).getTextContent()
    pages.push(items.map((it) => ('str' in it ? it.str + (it.hasEOL ? '\n' : ' ') : '')).join(''))
  }
  return pages.join('\n\n')
}
