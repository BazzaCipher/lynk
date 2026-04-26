import { describe, it, expect } from 'vitest';
import { parseCsv, detectDelimiter } from '../../utils/csvParser';

describe('csvParser', () => {
  it('parses comma-delimited with header', () => {
    const { headers, rows } = parseCsv('a,b,c\n1,2,3\n4,5,6\n');
    expect(headers).toEqual(['a', 'b', 'c']);
    expect(rows).toEqual([
      ['1', '2', '3'],
      ['4', '5', '6'],
    ]);
  });

  it('handles quoted fields with embedded commas and quotes', () => {
    const { rows } = parseCsv('a,b\n"hello, world","she said ""hi"""\n');
    expect(rows[0]).toEqual(['hello, world', 'she said "hi"']);
  });

  it('handles quoted multiline fields', () => {
    const { rows } = parseCsv('a,b\n"line1\nline2",x\n');
    expect(rows[0]).toEqual(['line1\nline2', 'x']);
  });

  it('auto-detects tab delimiter', () => {
    expect(detectDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t');
    const { headers, rows } = parseCsv('a\tb\n1\t2\n');
    expect(headers).toEqual(['a', 'b']);
    expect(rows).toEqual([['1', '2']]);
  });

  it('pads short rows to header width', () => {
    const { rows } = parseCsv('a,b,c\n1,2\n');
    expect(rows[0]).toEqual(['1', '2', '']);
  });

  it('handles CRLF line endings', () => {
    const { headers, rows } = parseCsv('a,b\r\n1,2\r\n');
    expect(headers).toEqual(['a', 'b']);
    expect(rows).toEqual([['1', '2']]);
  });
});
