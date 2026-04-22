function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function trimOuterEmptyRows(rows: string[][]) {
  const normalized = rows.map((row) => row.map((cell) => cell.replace(/\r/g, '').trim()));

  while (normalized.length > 0 && normalized[0].every((cell) => cell.length === 0)) {
    normalized.shift();
  }

  while (normalized.length > 0 && normalized[normalized.length - 1].every((cell) => cell.length === 0)) {
    normalized.pop();
  }

  return normalized;
}

function normalizeRows(rows: string[][]) {
  const trimmed = trimOuterEmptyRows(rows);
  const colCount = trimmed.reduce((max, row) => Math.max(max, row.length), 0);

  if (trimmed.length === 0 || colCount === 0) {
    return null;
  }

  return trimmed.map((row) => Array.from({ length: colCount }, (_, index) => row[index] ?? ''));
}

function parseDelimitedText(text: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(field);
      field = '';
      continue;
    }

    if (!inQuotes && char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    if (!inQuotes && char === '\r') {
      continue;
    }

    field += char;
  }

  row.push(field);
  rows.push(row);

  return normalizeRows(rows);
}

function scoreRows(rows: string[][] | null, allowSingleLine = false) {
  if (!rows) {
    return -1;
  }

  const rowCount = rows.length;
  const colCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const multiColumnRows = rows.filter((row) => row.length > 1).length;

  if (rowCount === 1 && !allowSingleLine) {
    return -1;
  }

  if (rowCount === 1 && colCount < 3) {
    return -1;
  }

  if (rowCount < 2 && colCount < 2) {
    return -1;
  }

  return rowCount * 10 + colCount * 5 + multiColumnRows * 3;
}

export function parseClipboardTableText(text: string, options: { allowSingleLine?: boolean } = {}) {
  const normalized = text.trim();
  const allowSingleLine = options.allowSingleLine === true;

  if (!normalized) {
    return null;
  }

  if (normalized.includes('\t')) {
    const parsed = parseDelimitedText(normalized, '\t');
    return scoreRows(parsed, true) >= 0 ? parsed : null;
  }

  let bestRows: string[][] | null = null;
  let bestScore = -1;

  for (const delimiter of [',', ';', '|']) {
    if (!normalized.includes(delimiter)) {
      continue;
    }

    const parsed = parseDelimitedText(normalized, delimiter);
    const score = scoreRows(parsed, allowSingleLine);

    if (score > bestScore) {
      bestScore = score;
      bestRows = parsed;
    }
  }

  return bestScore >= 0 ? bestRows : null;
}

export function buildTableHtmlFromRows(rows: string[][]) {
  const normalized = normalizeRows(rows);

  if (!normalized) {
    return '';
  }

  const body = normalized
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => `<td>${escapeHtml(cell).replace(/\n/g, '<br />')}</td>`)
          .join('')}</tr>`
    )
    .join('');

  return `<table><tbody>${body}</tbody></table>`;
}
