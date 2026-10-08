import { describe, expect, it } from 'vitest';
import { csvCell, toCsv } from './csv.js';

describe('csvCell', () => {
  it('leaves plain text alone and empties null values', () => {
    expect(csvCell('Étude d’impact')).toBe('Étude d’impact');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
    expect(csvCell(12)).toBe('12');
  });

  it('quotes separators, quotes and line breaks', () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('dit "oui"')).toBe('"dit ""oui"""');
    expect(csvCell('ligne 1\nligne 2')).toBe('"ligne 1\nligne 2"');
    expect(csvCell('a, b')).toBe('a, b');
  });

  it('neutralises spreadsheet formulas typed by a visitor', () => {
    expect(csvCell('=HYPERLINK("http://x","clic")')).toBe(
      `"'=HYPERLINK(""http://x"",""clic"")"`,
    );
    expect(csvCell('@SUM(A1:A9)')).toBe(`'@SUM(A1:A9)`);
    expect(csvCell('+cmd|calc')).toBe(`'+cmd|calc`);
    expect(csvCell('-2+3')).toBe(`'-2+3`);
    expect(csvCell('\t=1+1')).toBe(`'\t=1+1`);
    expect(csvCell('\r=1+1')).toBe(`"'\r=1+1"`);
  });

  it('keeps international phone numbers readable', () => {
    expect(csvCell('+243 81 000 00 00')).toBe('+243 81 000 00 00');
    expect(csvCell('+33 (0)1.23.45.67.89')).toBe('+33 (0)1.23.45.67.89');
  });

  it('writes dates as ISO 8601', () => {
    expect(csvCell(new Date('2026-10-08T14:03:00.000Z'))).toBe(
      '2026-10-08T14:03:00.000Z',
    );
  });
});

describe('toCsv', () => {
  it('starts with a BOM, separates with semicolons and ends lines with CRLF', () => {
    const csv = toCsv(['Nom', 'Message'], [['Aimé', 'Bonjour; merci']]);
    expect(csv).toBe('﻿Nom;Message\r\nAimé;"Bonjour; merci"\r\n');
  });

  it('exports only the header for no rows', () => {
    expect(toCsv(['A', 'B'], [])).toBe('﻿A;B\r\n');
  });
});
