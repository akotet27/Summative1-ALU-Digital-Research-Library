// scripts/search.js
import { compileRegex, highlight } from './validators.js';

// Apply all active filters/sort to records
export const filterAndSort = (records, { query, caseInsensitive, status, tag, sortBy }) => {
  let result = [...records];

  // Regex search
  let activeRe = null;
  let regexError = null;
  if (query && query.trim()) {
    const { re, error } = compileRegex(query, caseInsensitive);
    activeRe = re;
    regexError = error;
    if (re) {
      result = result.filter(r =>
        re.test(r.title) || re.test(r.author) || re.test(r.tag) || re.test(r.notes || '')
      );
    }
  }

  // Status filter
  if (status) result = result.filter(r => r.status === status);

  // Tag filter
  if (tag) result = result.filter(r => r.tag === tag);

  // Sorting
  const [field, dir] = (sortBy || 'dateAdded-desc').split('-');
  result.sort((a, b) => {
    let va = a[field] ?? '';
    let vb = b[field] ?? '';
    if (field === 'pages') { va = Number(va); vb = Number(vb); }
    if (field === 'dateAdded') { va = new Date(va); vb = new Date(vb); }
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });

  return { filtered: result, re: activeRe, regexError };
};

export { highlight };