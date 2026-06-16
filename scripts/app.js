// ── app.js ───────────────────────────────────────────────
// Main entry point. Wires everything together.
// Imports from all other modules and attaches event listeners.

import { state, initState, addBook, updateBook,
         deleteBook, replaceBooks, updateSettings } from './state.js';
import { validateField, validateForm }              from './validators.js';
import { compileSearch }                            from './search.js';
import { loadSettings, exportJSON, parseImport }   from './storage.js';
import {
  showSection, renderDashboard, renderRecords,
  fillFormForEdit, resetForm, showFieldError,
  fillSettings, applyTheme, showToast, announce,
} from './ui.js';

// ── BOOT ─────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // 1. Load data from localStorage
  initState();

  // 2. Apply saved theme
  applyTheme(state.settings.theme || 'light');

  // 3. Set today's date as default in form
  const dateInput = document.getElementById('dateInput');
  if (dateInput) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }

  // 4. Fill settings panel
  fillSettings();

  // 5. Render initial view
  renderDashboard();
  renderRecords();

  // 6. Attach all event listeners
  attachNavListeners();
  attachFormListeners();
  attachRecordsListeners();
  attachSearchListeners();
  attachSettingsListeners();
  attachThemeListener();
});

// ── NAVIGATION ───────────────────────────────────────────

function attachNavListeners() {
  // Nav link clicks
  document.querySelectorAll('.nav-link, [data-section]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const section = link.dataset.section;
      if (!section) return;
      showSection(section);

      // Refresh data when switching sections
      if (section === 'dashboard') renderDashboard();
      if (section === 'records')   renderRecords(getCurrentRegex());
      if (section === 'add-form')  {
        // Only reset if not editing
        if (!state.editingId) resetForm();
      }
      if (section === 'settings')  fillSettings();
    });
  });
}

// ── FORM ─────────────────────────────────────────────────

function attachFormListeners() {
  const form = document.getElementById('bookForm');
  if (!form) return;

  // Real-time validation on input
  const fields = ['title', 'author', 'pages', 'tag', 'dateAdded', 'notes'];

  fields.forEach(name => {
    const inputId = name === 'dateAdded' ? 'dateInput'
                  : name === 'status'    ? 'statusSelect'
                  : `${name}Input`;
    const el = document.getElementById(inputId);
    if (!el) return;

    el.addEventListener('input', () => {
      const result = validateField(name, el.value);
      showFieldError(
        name === 'dateAdded' ? 'date' : name,
        result.message
      );
      // Visual valid/invalid indicator
      el.classList.toggle('invalid', !result.valid && el.value.length > 0);
      el.classList.toggle('valid',    result.valid && el.value.length > 0);
    });
  });

  // Status select real-time
  const statusEl = document.getElementById('statusSelect');
  if (statusEl) {
    statusEl.addEventListener('change', () => {
      const result = validateField('status', statusEl.value);
      showFieldError('status', result.message);
    });
  }

  // Form submit
  form.addEventListener('submit', e => {
    e.preventDefault();
    handleFormSubmit();
  });

  // Cancel edit
  document.getElementById('cancelBtn')?.addEventListener('click', () => {
    state.editingId = null;
    resetForm();
    announce('Edit cancelled.');
  });
}

function handleFormSubmit() {
  const data = {
    title:     document.getElementById('titleInput').value,
    author:    document.getElementById('authorInput').value,
    pages:     document.getElementById('pagesInput').value,
    status:    document.getElementById('statusSelect').value,
    tag:       document.getElementById('tagInput').value,
    dateAdded: document.getElementById('dateInput').value,
    notes:     document.getElementById('notesInput').value,
  };

  // Validate all fields
  const { valid, errors } = validateForm(data);

  // Show all errors
  showFieldError('title',  errors.title  || '');
  showFieldError('author', errors.author || '');
  showFieldError('pages',  errors.pages  || '');
  showFieldError('tag',    errors.tag    || '');
  showFieldError('date',   errors.dateAdded || '');
  showFieldError('status', errors.status || '');

  if (!valid) {
    announce('Please fix the errors in the form before saving.');
    // Focus first invalid field
    const firstError = Object.keys(errors)[0];
    const fieldId = firstError === 'dateAdded' ? 'dateInput'
                  : firstError === 'status'    ? 'statusSelect'
                  : `${firstError}Input`;
    document.getElementById(fieldId)?.focus();
    return;
  }

  const editId = document.getElementById('editId').value;

  if (editId) {
    // Update existing
    updateBook(editId, data);
    state.editingId = null;
    resetForm();
    showToast(`✅ "${data.title}" updated!`);
    announce(`Book "${data.title}" has been updated.`);
  } else {
    // Add new
    addBook(data);
    resetForm();
    showToast(`📚 "${data.title}" added to your vault!`);
    announce(`Book "${data.title}" has been added.`);
  }

  renderDashboard();
  renderRecords(getCurrentRegex());

  // Switch to records view
  showSection('records');
}

// ── RECORDS (edit / delete) ───────────────────────────────

function attachRecordsListeners() {
  // Use event delegation — one listener on the container
  const container = document.getElementById('records-container');
  if (!container) return;

  container.addEventListener('click', e => {
    // Edit button
    const editBtn = e.target.closest('.edit-btn');
    if (editBtn) {
      const id   = editBtn.dataset.id;
      const book = state.books.find(b => b.id === id);
      if (!book) return;

      state.editingId = id;
      fillFormForEdit(book);
      showSection('add-form');
      document.getElementById('titleInput')?.focus();
      announce(`Editing "${book.title}". Make your changes and click Update Book.`);
      return;
    }

    // Delete button
    const delBtn = e.target.closest('.delete-btn');
    if (delBtn) {
      const id   = delBtn.dataset.id;
      const book = state.books.find(b => b.id === id);
      if (!book) return;

      // Confirm before deleting
      const confirmed = window.confirm(
        `Delete "${book.title}"?\nThis cannot be undone.`
      );
      if (!confirmed) return;

      deleteBook(id);
      renderRecords(getCurrentRegex());
      renderDashboard();
      showToast(`🗑️ "${book.title}" deleted.`, 'error');
      announce(`"${book.title}" has been deleted.`);
    }
  });
}

// ── SEARCH ───────────────────────────────────────────────

let searchTimeout = null;

function attachSearchListeners() {
  const searchInput = document.getElementById('searchInput');
  const caseToggle  = document.getElementById('caseToggle');
  const errorEl     = document.getElementById('search-error');

  if (!searchInput) return;

  const doSearch = () => {
    const query         = searchInput.value;
    const caseSensitive = caseToggle?.checked || false;
    state.searchQuery   = query;

    const { regex, error } = compileSearch(query, caseSensitive);

    if (error) {
      if (errorEl) errorEl.textContent = error;
      return;
    }

    if (errorEl) errorEl.textContent = '';
    renderRecords(regex);
  };

  // Debounce — wait 250ms after typing stops
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(doSearch, 250);
  });

  caseToggle?.addEventListener('change', doSearch);
}

function getCurrentRegex() {
  const query       = document.getElementById('searchInput')?.value || '';
  const caseSensitive = document.getElementById('caseToggle')?.checked || false;
  const { regex }   = compileSearch(query, caseSensitive);
  return regex;
}

// ── SORT ─────────────────────────────────────────────────

document.addEventListener('click', e => {
  const sortBtn = e.target.closest('.sort-btn');
  if (!sortBtn) return;

  const field = sortBtn.dataset.sort;

  // Toggle direction if same field
  if (state.sortBy === field) {
    state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    state.sortBy  = field;
    state.sortDir = 'asc';
  }

  // Update button states
  document.querySelectorAll('.sort-btn').forEach(btn => {
    const isActive = btn.dataset.sort === field;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  renderRecords(getCurrentRegex());
  announce(`Sorted by ${field} ${state.sortDir === 'asc' ? 'ascending' : 'descending'}.`);
});

// ── FILTER ───────────────────────────────────────────────

document.addEventListener('click', e => {
  const filterBtn = e.target.closest('.filter-btn');
  if (!filterBtn) return;

  state.filterStatus = filterBtn.dataset.filter;

  document.querySelectorAll('.filter-btn').forEach(btn => {
    const isActive = btn.dataset.filter === state.filterStatus;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  renderRecords(getCurrentRegex());
  announce(`Filtered by: ${state.filterStatus}.`);
});

// ── SETTINGS ─────────────────────────────────────────────

function attachSettingsListeners() {

  // Save goal
  document.getElementById('saveTargetBtn')?.addEventListener('click', () => {
    const val = parseInt(document.getElementById('pageTarget').value, 10);
    if (!val || val < 1) {
      showToast('Please enter a valid goal (minimum 1).', 'error');
      return;
    }
    updateSettings({ goal: val });
    renderDashboard();
    showToast(`🎯 Goal set to ${val} books!`);
    announce(`Capstone reading goal updated to ${val} books.`);
  });

  // Save units
  document.getElementById('saveUnitsBtn')?.addEventListener('click', () => {
    const val = parseInt(document.getElementById('pagesPerHour').value, 10);
    if (!val || val < 1) {
      showToast('Please enter a valid reading speed.', 'error');
      return;
    }
    updateSettings({ pagesPerHour: val });
    renderDashboard();
    showToast(`📖 Reading speed set to ${val} pages/hour!`);
    announce(`Reading speed updated to ${val} pages per hour.`);
  });

  // Export JSON
  document.getElementById('exportBtn')?.addEventListener('click', () => {
    if (state.books.length === 0) {
      showToast('No books to export.', 'error');
      return;
    }
    exportJSON(state.books);
    showToast(`⬇️ Exported ${state.books.length} books!`);
    announce(`Exported ${state.books.length} books as JSON.`);
  });

  // Import JSON
  document.getElementById('importFile')?.addEventListener('change', e => {
    const file   = e.target.files[0];
    const status = document.getElementById('import-status');
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const result = parseImport(ev.target.result);
      if (!result.ok) {
        if (status) status.textContent = `❌ ${result.error}`;
        showToast(result.error, 'error');
        announce(`Import failed: ${result.error}`);
        return;
      }

      const confirmed = window.confirm(
        `Import ${result.books.length} books? This will REPLACE your current library.`
      );
      if (!confirmed) return;

      replaceBooks(result.books);
      renderDashboard();
      renderRecords();

      if (status) {
        status.textContent = `✅ Imported ${result.books.length} books successfully!`;
      }
      showToast(`✅ Imported ${result.books.length} books!`);
      announce(`Successfully imported ${result.books.length} books.`);
    };

    reader.readAsText(file);
    // Reset file input so same file can be imported again
    e.target.value = '';
  });

  // Clear all data
  document.getElementById('clearAllBtn')?.addEventListener('click', () => {
    if (state.books.length === 0) {
      showToast('Library is already empty.', 'error');
      return;
    }
    const confirmed = window.confirm(
      `Delete ALL ${state.books.length} books? This cannot be undone.`
    );
    if (!confirmed) return;

    replaceBooks([]);
    renderDashboard();
    renderRecords();
    showToast('🗑️ All data cleared.', 'error');
    announce('All books have been deleted.');
  });
}

// ── THEME TOGGLE ─────────────────────────────────────────

function attachThemeListener() {
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    const current = state.settings.theme || 'light';
    const next    = current === 'light' ? 'dark' : 'light';
    updateSettings({ theme: next });
    applyTheme(next);
    announce(`${next === 'dark' ? 'Dark' : 'Light'} mode enabled.`);
  });
}