// ── storage.js ──────────────────────────────────────────
// Handles all localStorage read/write for the app.
// Nothing else touches localStorage directly.

const BOOKS_KEY    = 'alu:books';
const SETTINGS_KEY = 'alu:settings';

// ── BOOKS ────────────────────────────────────────────────

/** Load all books from localStorage. Returns [] if none. */
export function loadBooks() {
  try {
    const raw = localStorage.getItem(BOOKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    console.warn('Could not load books from storage');
    return [];
  }
}

/** Save the full books array to localStorage. */
export function saveBooks(books) {
  try {
    localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
  } catch {
    console.warn('Could not save books to storage');
  }
}

// ── SETTINGS ─────────────────────────────────────────────

/** Load settings object. Returns defaults if none saved. */
export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {
      goal:         20,    // capstone book goal
      pagesPerHour: 30,    // reading speed
      theme:        'light'
    };
  } catch {
    return { goal: 20, pagesPerHour: 30, theme: 'light' };
  }
}

/** Save settings object to localStorage. */
export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    console.warn('Could not save settings to storage');
  }
}

// ── EXPORT JSON ──────────────────────────────────────────

/** Download books array as a .json file. */
export function exportJSON(books) {
  const data     = JSON.stringify(books, null, 2);
  const blob     = new Blob([data], { type: 'application/json' });
  const url      = URL.createObjectURL(blob);
  const a        = document.createElement('a');
  a.href         = url;
  a.download     = `alu-library-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── IMPORT JSON ──────────────────────────────────────────

/**
 * Validate and parse imported JSON.
 * Returns { ok: true, books } or { ok: false, error }
 */
export function parseImport(text) {
  let parsed;

  // Must be valid JSON
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'File is not valid JSON.' };
  }

  // Must be an array
  if (!Array.isArray(parsed)) {
    return { ok: false, error: 'JSON must be an array of books.' };
  }

  // Each record must have required fields
  const required = ['id', 'title', 'author', 'pages', 'status', 'dateAdded'];
  const invalid  = parsed.filter(item =>
    !required.every(key => Object.prototype.hasOwnProperty.call(item, key))
  );

  if (invalid.length > 0) {
    return {
      ok: false,
      error: `${invalid.length} record(s) missing required fields (id, title, author, pages, status, dateAdded).`
    };
  }

  return { ok: true, books: parsed };
}