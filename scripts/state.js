// ── state.js ────────────────────────────────────────────
// Single source of truth for the app.
// All data lives here. UI reads from state, never from DOM.

import { loadBooks, saveBooks, loadSettings, saveSettings } from './storage.js';

// ── STATE OBJECT ─────────────────────────────────────────
export const state = {
  books:       [],      // all book records
  settings:    {},      // goal, pagesPerHour, theme
  sortBy:      'dateAdded',  // current sort field
  sortDir:     'desc',       // 'asc' or 'desc'
  filterStatus:'all',        // 'all' | 'Finished' | 'Reading' | 'Want to Read'
  searchQuery: '',           // current search string
  editingId:   null,         // id of book being edited, or null
};

// ── INIT ─────────────────────────────────────────────────

/** Load everything from localStorage into state. */
export function initState() {
  state.books    = loadBooks();
  state.settings = loadSettings();
}

// ── BOOK OPERATIONS ──────────────────────────────────────

/** Generate a unique id like rec_0001 */
function generateId() {
  const max = state.books.reduce((acc, b) => {
    const num = parseInt(b.id.replace('rec_', ''), 10);
    return num > acc ? num : acc;
  }, 0);
  return `rec_${String(max + 1).padStart(4, '0')}`;
}

/** Add a new book. Returns the new book. */
export function addBook(data) {
  const now  = new Date().toISOString();
  const book = {
    id:        generateId(),
    title:     data.title.trim(),
    author:    data.author.trim(),
    pages:     Number(data.pages),
    status:    data.status,
    tag:       data.tag ? data.tag.trim() : '',
    dateAdded: data.dateAdded,
    notes:     data.notes ? data.notes.trim() : '',
    createdAt: now,
    updatedAt: now,
  };
  state.books.push(book);
  saveBooks(state.books);
  return book;
}

/** Update an existing book by id. Returns updated book or null. */
export function updateBook(id, data) {
  const idx = state.books.findIndex(b => b.id === id);
  if (idx === -1) return null;

  state.books[idx] = {
    ...state.books[idx],
    title:     data.title.trim(),
    author:    data.author.trim(),
    pages:     Number(data.pages),
    status:    data.status,
    tag:       data.tag ? data.tag.trim() : '',
    dateAdded: data.dateAdded,
    notes:     data.notes ? data.notes.trim() : '',
    updatedAt: new Date().toISOString(),
  };
  saveBooks(state.books);
  return state.books[idx];
}

/** Delete a book by id. Returns true if found. */
export function deleteBook(id) {
  const before = state.books.length;
  state.books  = state.books.filter(b => b.id !== id);
  saveBooks(state.books);
  return state.books.length < before;
}

/** Replace all books (used after import). */
export function replaceBooks(books) {
  state.books = books;
  saveBooks(state.books);
}

// ── SETTINGS OPERATIONS ──────────────────────────────────

/** Update one or more settings fields. */
export function updateSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  saveSettings(state.settings);
}

// ── FILTERED + SORTED VIEW ───────────────────────────────

/**
 * Returns books after applying:
 *   1. status filter
 *   2. search query
 *   3. sort
 * Used by ui.js to render the table/cards.
 */
export function getFilteredBooks(searchRegex = null) {
  let list = [...state.books];

  // 1 — status filter
  if (state.filterStatus !== 'all') {
    list = list.filter(b => b.status === state.filterStatus);
  }

  // 2 — search
  if (searchRegex) {
    list = list.filter(b =>
      searchRegex.test(b.title)  ||
      searchRegex.test(b.author) ||
      searchRegex.test(b.tag)    ||
      searchRegex.test(b.notes)
    );
  }

  // 3 — sort
  list.sort((a, b) => {
    let valA = a[state.sortBy];
    let valB = b[state.sortBy];

    // Numeric sort for pages
    if (state.sortBy === 'pages') {
      valA = Number(valA);
      valB = Number(valB);
      return state.sortDir === 'asc' ? valA - valB : valB - valA;
    }

    // String sort for everything else
    valA = String(valA).toLowerCase();
    valB = String(valB).toLowerCase();
    if (valA < valB) return state.sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return state.sortDir === 'asc' ?  1 : -1;
    return 0;
  });

  return list;
}

// ── STATS ────────────────────────────────────────────────

/** Compute dashboard statistics from state.books */
export function getStats() {
  const books    = state.books;
  const total    = books.length;
  const finished = books.filter(b => b.status === 'Finished').length;
  const reading  = books.filter(b => b.status === 'Reading').length;
  const want     = books.filter(b => b.status === 'Want to Read').length;
  const pages    = books.reduce((sum, b) => sum + Number(b.pages), 0);

  // Top tag
  const tagCount = {};
  books.forEach(b => {
    if (b.tag) tagCount[b.tag] = (tagCount[b.tag] || 0) + 1;
  });
  const topTag = Object.keys(tagCount).sort(
    (a, b) => tagCount[b] - tagCount[a]
  )[0] || '—';

  // Last 7 days — count books added each day
  const today  = new Date();
  const days   = [];
  for (let i = 6; i >= 0; i--) {
    const d     = new Date(today);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    const ymd   = d.toISOString().slice(0, 10);
    const count = books.filter(b => b.dateAdded === ymd).length;
    days.push({ label, count });
  }

  // Reading hours estimate
  const pph   = state.settings.pagesPerHour || 30;
  const hours = (pages / pph).toFixed(1);

  return { total, finished, reading, want, pages, topTag, days, hours };
}