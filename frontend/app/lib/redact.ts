// Client-side minimisation: identifiers are masked in the browser, after decryption and before anything is
// sent to the AI. Amounts, dates of service and other facts the AI needs to reason about are left alone.

export interface Redaction {
  text: string
  count: number
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const RULES: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[email]'],
  // Labelled dates of birth, e.g. "DOB: 12/05/1994" or "Date of birth: 12 MAY 1994".
  [/\b(DOB|Date of birth)(\s*:\s*)\d{1,2}[/ .-](?:\d{1,2}|[A-Za-z]{3,9})[/ .-]\d{4}/gi, '$1$2[date of birth]'],
  // Passport-style document numbers, e.g. N1234567.
  [/\b[A-Z]{1,2}\d{6,8}\b/g, '[document no.]'],
  // Policy or member numbers, e.g. SH-GOLD-448812.
  [/\b[A-Z]{2,}(?:-[A-Z0-9]{2,})+-\d{4,}\b/g, '[policy no.]'],
  // Bank state-branch numbers, e.g. 000-123.
  [/\bBSB\s+\d{3}-\d{3}\b/gi, 'BSB [bsb]'],
  // Account numbers that follow the word "Account", e.g. "Account 4455 6677".
  [/\b(Account)\s+\d[\d ]{4,}\d\b/g, '$1 [account no.]'],
]

/** Masks the person's own names (from their token) and common identifiers. */
export function redact(text: string, names: string[]): Redaction {
  let count = 0
  let out = text
  const words = [...new Set(names.flatMap((n) => n.split(/\s+/)).filter((w) => w.length >= 2))]
  if (words.length) {
    const re = new RegExp(`\\b(?:${words.map(escape).join('|')})\\b`, 'gi')
    out = out.replace(re, () => (count++, '[name]'))
    out = out.replace(/\[name\](?:\s+\[name\])+/g, '[name]')
  }
  for (const [re, replacement] of RULES) {
    out = out.replace(re, (...args) => {
      count++
      return replacement.replace(/\$(\d)/g, (_, i) => String(args[Number(i)] ?? ''))
    })
  }
  return { text: out, count }
}
