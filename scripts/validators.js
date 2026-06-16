// scripts/validators.js
// ────────────────────────────────────────────────────────────────
// Regex Catalog
//
// 1. TITLE — no leading/trailing spaces, no double spaces
//    /^\S(?:.*\S)?$/  +  collapse: title.replace(/\s{2,}/g, ' ')
//
// 2. AUTHOR — letters, spaces, hyphens, dots (for initials)
//    /^[A-Za-z][A-Za-z.\s-]*[A-Za-z.]$/
//
// 3. PAGES — positive integer, no leading zeros
//    /^[1-9]\d*$/
//
// 4. DATE — YYYY-MM-DD with basic month/day validation
//    /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
//
// 5. TAG — letters & spaces, no consecutive hyphens (lookahead advanced)
//    /^(?!.*--)[A-Za-z]+(?:[ -][A-Za-z]+)*$/
//
// 6. NOTES — advanced back-reference: detect duplicate consecutive words
//    /\b(\w+)\s+\1\b/i
//
// 7. SEARCH — safe user-supplied regex compiled via compileRegex()
//    Supports lookahead: e.g.  (?=.*methods)  or  \b(\w+)\s+\1\b
// ────────────────────────────────────────────────────────────────

// 1. Title validation
export const validateTitle = (value) => {
  if (!value || !value.trim()) return 'Title is required.';
  const trimmed = value.trim();
  if (!/^\S(?:.*\S)?$/.test(trimmed)) return 'Title must not have leading or trailing spaces.';
  if (/\s{2,}/.test(trimmed)) return 'Title must not have consecutive spaces.';
  if (trimmed.length > 200) return 'Title must be 200 characters or fewer.';
  return null;
};

// Auto-clean title
export const normalizeTitle = (value) =>
  value.trim().replace(/\s{2,}/g, ' ');

// 2. Author validation
export const validateAuthor = (value) => {
  if (!value || !value.trim()) return 'Author is required.';
  const trimmed = value.trim();
  if (!/^[A-Za-z][A-Za-z.\s-]*[A-Za-z.]$/.test(trimmed))
    return 'Author should contain only letters, spaces, hyphens, or periods (e.g. "J.K. Rowling").';
  if (trimmed.length > 120) return 'Author must be 120 characters or fewer.';
  return null;
};

// 3. Pages validation
export const validatePages = (value) => {
  if (!value || !String(value).trim()) return 'Page count is required.';
  if (!/^[1-9]\d*$/.test(String(value).trim()))
    return 'Pages must be a whole number greater than 0 (e.g. 320).';
  const n = parseInt(value, 10);
  if (n > 50000) return 'Page count seems too large.';
  return null;
};

// 4. Date validation
export const validateDate = (value) => {
  if (!value || !value.trim()) return 'Date is required.';
  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value.trim()))
    return 'Date must be in YYYY-MM-DD format (e.g. 2025-09-01).';
  return null;
};

// 5. Tag validation — advanced: lookahead to forbid consecutive hyphens
export const validateTag = (value) => {
  if (!value || !value.trim()) return 'Tag is required.';
  const trimmed = value.trim();
  // Advanced regex: negative lookahead (?!.*--) forbids double hyphens
  if (!/^(?!.*--)[A-Za-z]+(?:[ -][A-Za-z]+)*$/.test(trimmed))
    return 'Tag must contain only letters, single spaces, or single hyphens (e.g. "Research Methods" or "Mixed-Methods").';
  if (trimmed.length > 50) return 'Tag must be 50 characters or fewer.';
  return null;
};

// 6. Notes validation — advanced back-reference to catch duplicate words
export const validateNotes = (value) => {
  if (!value) return null; // optional
  // Back-reference: \b(\w+)\s+\1\b catches "the the", "and and", etc.
  const dupMatch = value.match(/\b(\w+)\s+\1\b/i);
  if (dupMatch)
    return `Duplicate word detected: "${dupMatch[0]}" — did you mean to write it twice?`;
  return null;
};

// 7. Status validation
export const validateStatus = (value) => {
  if (!['want', 'reading', 'finished'].includes(value))
    return 'Please select a reading status.';
  return null;
};

// Safe regex compiler for search (with error feedback)
export const compileRegex = (input, caseInsensitive = true) => {
  if (!input || !input.trim()) return { re: null, error: null };
  try {
    const flags = caseInsensitive ? 'gi' : 'g';
    return { re: new RegExp(input.trim(), flags), error: null };
  } catch (e) {
    return { re: null, error: `Invalid regex: ${e.message}` };
  }
};

// Highlight matches within text (returns HTML string)
export const highlight = (text, re) => {
  if (!re || !text) return escapeHtml(text || '');
  // Reset lastIndex for global regex
  re.lastIndex = 0;
  return String(text).replace(re, (m) => `<mark>${escapeHtml(m)}</mark>`);
};

const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Run all form validations, returns { errors, isValid }
export const validateRecord = (fields) => {
  const errors = {};
  const checks = [
    ['title',  validateTitle(fields.title)],
    ['author', validateAuthor(fields.author)],
    ['pages',  validatePages(fields.pages)],
    ['date',   validateDate(fields.date)],
    ['tag',    validateTag(fields.tag)],
    ['status', validateStatus(fields.status)],
    ['notes',  validateNotes(fields.notes)],
  ];
  for (const [key, err] of checks) {
    if (err) errors[key] = err;
  }
  return { errors, isValid: Object.keys(errors).length === 0 };
};