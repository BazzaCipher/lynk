/**
 * CSV parser for ledger import.
 *
 * Handles quoted fields (with embedded quotes via ""), CR/LF line endings, and
 * auto-detects the delimiter by sampling the first non-empty line.
 */

const DELIMITERS = [',', '\t', ';', '|'] as const;
export type CsvDelimiter = (typeof DELIMITERS)[number];

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
  delimiter: CsvDelimiter;
}

export function detectDelimiter(sample: string): CsvDelimiter {
  const firstLine = sample.split(/\r?\n/).find((l) => l.trim().length > 0) ?? '';
  let best: CsvDelimiter = ',';
  let bestCount = -1;
  for (const d of DELIMITERS) {
    const count = firstLine.split(d).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}


export function parseCsv(text: string, delimiter?: CsvDelimiter): ParsedCsv {
  const d = delimiter ?? detectDelimiter(text);

  // Split respecting quoted newlines.
  const records: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === d) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      records.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }

  const nonEmpty = records.filter((r) => r.some((cell) => cell.trim().length > 0));
  if (nonEmpty.length === 0) return { headers: [], rows: [], delimiter: d };

  const [headerRow, ...rest] = nonEmpty;
  const headers = headerRow.map((h, i) => h.trim() || `Column ${i + 1}`);
  const width = headers.length;
  const rows = rest.map((r) => {
    const padded = r.slice();
    while (padded.length < width) padded.push('');
    return padded.slice(0, width);
  });
  return { headers, rows, delimiter: d };
}
