// ── search.js ────────────────────────────────────────────
// Safe regex compiler and text highlighter for the search bar.
//
// ADVANCED REGEX patterns users can try:
//   /^The/i          → titles starting with "The"
//   /(design|product)/i → books about design OR product
//   /\b(\w+)\s+\1\b/i  → duplicate words (back-reference)
//   /\d{3,}/           → numbers with 3+ digits (page refs)
// ─────────────────────────────────────────────────────────

/**
 * Safely compile a user-typed search string into a RegExp.
 *
 * Supports two modes:
 *   1. Plain text  → "lean startup"   → /lean startup/i
 *   2. Regex mode  → "/^The/i"        → /^The/i
 *
 * Returns { regex: RegExp|null, error: string|null }
 */
export function compileSearch(input, caseSensitive = false) {
  if (!input || input.trim() === '') {
    return { regex: null, error: null };
  }

  const trimmed = input.trim();

  // ── Regex mode: user typed /pattern/flags ──
  const regexMode = trimmed.match(/^\/(.+)\/([gimsuy]*)$/);
  if (regexMode) {
    const [, pattern, flags] = regexMode;
    try {
      const regex = new RegExp(pattern, flags);
      return { regex, error: null };
    } catch (e) {
      return { regex: null, error: `Invalid regex: ${e.message}` };
    }
  }

  // ── Plain text mode ──
  // Escape special regex characters so plain text is safe
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const flags   = caseSensitive ? '' : 'i';

  try {
    const regex = new RegExp(escaped, flags);
    return { regex, error: null };
  } catch (e) {
    return { regex: null, error: `Search error: ${e.message}` };
  }
}

/**
 * Wrap regex matches in <mark> tags for highlighting.
 * Safe — uses textContent approach to avoid XSS.
 *
 * @param {string} text  — plain text to search in
 * @param {RegExp} regex — compiled regex from compileSearch
 * @returns {string}     — HTML string with <mark> tags
 */
export function highlight(text, regex) {
  if (!text || !regex) return escapeHTML(text || '');

  // Reset lastIndex for global regexes
  regex.lastIndex = 0;

  // Split text on matches and rebuild with <mark>
  const result  = [];
  let   lastIdx = 0;
  let   match;

  // Clone regex with global flag to find all matches
  const globalRe = new RegExp(
    regex.source,
    regex.flags.includes('g') ? regex.flags : regex.flags + 'g'
  );

  while ((match = globalRe.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIdx) {
      result.push(escapeHTML(text.slice(lastIdx, match.index)));
    }
    // The match — wrapped in mark
    result.push(`<mark>${escapeHTML(match[0])}</mark>`);
    lastIdx = globalRe.lastIndex;

    // Prevent infinite loop on zero-length matches
    if (match[0].length === 0) globalRe.lastIndex++;
  }

  // Remaining text after last match
  if (lastIdx < text.length) {
    result.push(escapeHTML(text.slice(lastIdx)));
  }

  return result.join('');
}

/**
 * Escape HTML special characters to prevent XSS.
 * Used before inserting any user content into innerHTML.
 */
export function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}