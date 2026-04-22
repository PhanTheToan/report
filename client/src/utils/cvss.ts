export function normalizeCvssInput(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : '';
}

function extractCvssVersion(value: string) {
  return value.match(/^CVSS:(\d(?:\.\d)?)/i)?.[1] ?? null;
}

export function extractCvssDisplayText(value: string | null | undefined) {
  const normalized = normalizeCvssInput(value);

  if (!normalized) {
    return '';
  }

  try {
    const url = new URL(normalized);
    const hash = decodeURIComponent(url.hash.replace(/^#/, '').trim());

    if (hash.startsWith('CVSS:')) {
      return hash;
    }
  } catch {
    // Fall back to plain-text parsing below.
  }

  const match = normalized.match(/CVSS:[^\s)]+/i);
  return match?.[0] ?? normalized;
}

export function getCvssReferenceHref(value: string | null | undefined) {
  const normalized = normalizeCvssInput(value);
  const display = extractCvssDisplayText(normalized);

  if (!display.startsWith('CVSS:')) {
    return null;
  }

  try {
    const url = new URL(normalized);
    const calculatorVersion = url.pathname.match(/\/cvss\/calculator\/(\d(?:\.\d)?)/i)?.[1];
    const version = calculatorVersion ?? extractCvssVersion(display);

    if (version) {
      return `https://www.first.org/cvss/calculator/${version}#${display}`;
    }
  } catch {
    const version = extractCvssVersion(display);

    if (version) {
      return `https://www.first.org/cvss/calculator/${version}#${display}`;
    }
  }

  return null;
}
