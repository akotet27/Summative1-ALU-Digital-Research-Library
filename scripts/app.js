// scripts/app.js — Main entry point
import { getRecords, getSettings, addRecord, updateRecord, deleteRecord,
         replaceAll, updateSettings, generateId } from './state.js';
import { validateRecord, validateTitle, validateAuthor, validatePages,
         validateDate, validateTag, validateNotes, validateStatus,
         normalizeTitle } from './validators.js';
import { filterAndSort } from './search.js';
import { renderTable, renderEditRow, renderStats, populateTagFilter,
         showToast, announce } from './ui.js';
import { validateImport } from './storage.js';

// ── Navigation ─────────────────────────────────────────────────
const navigateTo = (page) => {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('page--active', p.id === `page-${page}`);
  });
  document.querySelectorAll('.nav-link, .bottom-nav__item').forEach(a => {
    const active = a.dataset.page === page;
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  if (page === 'dashboard') { renderStats(getRecords(), getSettings()); }
  if (page === 'library')   { refreshLibrary(); }
  if (page === 'settings')  { loadSettingsForm(); }

  // Reset add form heading
  if (page === 'add') {
    document.getElementById('add-heading').textContent = 'Add Resource';
    document.getElementById('edit-id').value = '';
    document.getElementById('cancel-edit').hidden = true;
    document.getElementById('submit-btn').textContent = 'Save Resource';
    document.getElementById('resource-form').reset();
    clearFormErrors();
  }

  // Scroll top
  document.getElementById('main-content').scrollTop = 0;
  window.scrollTo(0, 0);
};

// Wire nav links
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-page]');
  if (link) { e.preventDefault(); navigateTo(link.dataset.page); }
});

// ── Library refresh ────────────────────────────────────────────
const getSearchState = () => ({
  query:           document.getElementById('search-input').value,
  caseInsensitive: !document.getElementById('search-case').checked,
  status:          document.getElementById('filter-status').value,
  tag:             document.getElementById('filter-tag').value,
  sortBy:          document.getElementById('sort-by').value,
});

const refreshLibrary = () => {
  const state = getSearchState();
  const { filtered, re, regexError } = filterAndSort(getRecords(), state);

  const hint = document.getElementById('search-hint');
  const inp  = document.getElementById('search-input');
  if (regexError) {
    hint.textContent = '⚠ ' + regexError;
    inp.classList.add('search-error');
  } else if (state.query) {
    hint.textContent = `✓ ${filtered.length} match${filtered.length !== 1 ? 'es' : ''}`;
    inp.classList.remove('search-error');
  } else {
    hint.textContent = '';
    inp.classList.remove('search-error');
  }

  populateTagFilter(getRecords());
  renderTable(filtered, re);
};

// Search / filter events
['search-input','filter-status','filter-tag','sort-by'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', refreshLibrary);
  document.getElementById(id)?.addEventListener('change', refreshLibrary);
});
document.getElementById('search-case').addEventListener('change', refreshLibrary);

document.getElementById('clear-filters').addEventListener('click', () => {
  document.getElementById('search-input').value = '';
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-tag').value = '';
  document.getElementById('sort-by').value = 'dateAdded-desc';
  refreshLibrary();
});

// ── Table actions (edit / delete) ──────────────────────────────
document.getElementById('records-body').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;

  if (action === 'edit') {
    const rec = getRecords().find(r => r.id === id);
    if (rec) renderEditRow(rec);
  }

  if (action === 'delete') {
    const rec = getRecords().find(r => r.id === id);
    if (rec) openConfirm(`Delete "${rec.title}"?`, () => {
      deleteRecord(id);
      refreshLibrary();
      renderStats(getRecords(), getSettings());
      showToast('Resource deleted.');
      announce('Resource deleted.');
    });
  }

  if (action === 'save-edit') {
    const row = btn.closest('tr');
    const fields = {};
    row.querySelectorAll('[data-field]').forEach(el => {
      fields[el.dataset.field] = el.value;
    });
    const { errors, isValid } = validateRecord({
      title:  fields.title, author: fields.author,
      pages:  fields.pages, date:   fields.dateAdded,
      tag:    fields.tag,   status: fields.status,
      notes:  '',
    });
    if (!isValid) {
      const msg = Object.values(errors)[0];
      showToast('⚠ ' + msg);
      announce(msg, true);
      return;
    }
    updateRecord(id, {
      title:     normalizeTitle(fields.title),
      author:    fields.author.trim(),
      pages:     parseInt(fields.pages, 10),
      dateAdded: fields.dateAdded.trim(),
      tag:       fields.tag.trim(),
      status:    fields.status,
    });
    refreshLibrary();
    renderStats(getRecords(), getSettings());
    showToast('Resource updated.');
    announce('Resource updated.');
  }

  if (action === 'cancel-edit') {
    refreshLibrary();
  }
});

// ── Add/Edit Form ──────────────────────────────────────────────
const fieldValidators = {
  'f-title':  (v) => validateTitle(v),
  'f-author': (v) => validateAuthor(v),
  'f-pages':  (v) => validatePages(v),
  'f-date':   (v) => validateDate(v),
  'f-tag':    (v) => validateTag(v),
  'f-status': (v) => validateStatus(v),
  'f-notes':  (v) => validateNotes(v),
};

const showFieldError = (id, msg) => {
  const input = document.getElementById(id);
  const err   = document.getElementById(id + '-err');
  if (!input || !err) return;
  err.textContent = msg || '';
  input.classList.toggle('invalid', !!msg);
  input.classList.toggle('valid', !msg && input.value.trim() !== '');
};

const clearFormErrors = () => {
  Object.keys(fieldValidators).forEach(id => showFieldError(id, ''));
};

// Live validation on blur
Object.entries(fieldValidators).forEach(([id, fn]) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('blur', () => {
    const err = fn(el.value);
    showFieldError(id, err);
  });
});

document.getElementById('resource-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const fields = {
    title:  document.getElementById('f-title').value,
    author: document.getElementById('f-author').value,
    pages:  document.getElementById('f-pages').value,
    date:   document.getElementById('f-date').value,
    tag:    document.getElementById('f-tag').value,
    status: document.getElementById('f-status').value,
    notes:  document.getElementById('f-notes').value,
  };

  const { errors, isValid } = validateRecord(fields);

  // Show all errors
  showFieldError('f-title',  errors.title  || '');
  showFieldError('f-author', errors.author || '');
  showFieldError('f-pages',  errors.pages  || '');
  showFieldError('f-date',   errors.date   || '');
  showFieldError('f-tag',    errors.tag    || '');
  showFieldError('f-status', errors.status || '');
  showFieldError('f-notes',  errors.notes  || '');

  if (!isValid) {
    const first = Object.values(errors)[0];
    announce(first, true);
    return;
  }

  const editId = document.getElementById('edit-id').value;
  const now = new Date().toISOString();

  if (editId) {
    // Update existing
    updateRecord(editId, {
      title:     normalizeTitle(fields.title),
      author:    fields.author.trim(),
      pages:     parseInt(fields.pages, 10),
      dateAdded: fields.date.trim(),
      tag:       fields.tag.trim(),
      status:    fields.status,
      notes:     fields.notes.trim(),
    });
    showToast('Resource updated.');
    announce('Resource updated successfully.');
  } else {
    // Add new
    addRecord({
      id:        generateId(),
      title:     normalizeTitle(fields.title),
      author:    fields.author.trim(),
      pages:     parseInt(fields.pages, 10),
      dateAdded: fields.date.trim(),
      tag:       fields.tag.trim(),
      status:    fields.status,
      notes:     fields.notes.trim(),
      createdAt: now,
      updatedAt: now,
    });
    showToast('Resource added! 📚');
    announce('Resource added successfully.');
  }

  document.getElementById('resource-form').reset();
  clearFormErrors();
  document.getElementById('edit-id').value = '';
  document.getElementById('cancel-edit').hidden = true;
  document.getElementById('submit-btn').textContent = 'Save Resource';
  document.getElementById('add-heading').textContent = 'Add Resource';
  navigateTo('library');
});

// Load record into edit form
const loadIntoForm = (rec) => {
  document.getElementById('f-title').value  = rec.title;
  document.getElementById('f-author').value = rec.author;
  document.getElementById('f-pages').value  = rec.pages;
  document.getElementById('f-date').value   = rec.dateAdded;
  document.getElementById('f-tag').value    = rec.tag;
  document.getElementById('f-status').value = rec.status;
  document.getElementById('f-notes').value  = rec.notes || '';
  document.getElementById('edit-id').value  = rec.id;
  document.getElementById('cancel-edit').hidden = false;
  document.getElementById('submit-btn').textContent = 'Update Resource';
  document.getElementById('add-heading').textContent = 'Edit Resource';
  clearFormErrors();
  navigateTo('add');
  document.getElementById('f-title').focus();
};

document.getElementById('cancel-edit').addEventListener('click', () => {
  document.getElementById('resource-form').reset();
  clearFormErrors();
  document.getElementById('edit-id').value = '';
  document.getElementById('cancel-edit').hidden = true;
  document.getElementById('submit-btn').textContent = 'Save Resource';
  document.getElementById('add-heading').textContent = 'Add Resource';
});

// Bookshelf / table edit button → load form
document.getElementById('bookshelf').addEventListener('click', (e) => {
  const spine = e.target.closest('.book-spine');
  if (!spine) return;
  // Find by title match (books can be edited from shelf)
});

// Also handle edit from table on library page → form
document.addEventListener('click', (e) => {
  const editLink = e.target.closest('[data-edit-full]');
  if (editLink) {
    const rec = getRecords().find(r => r.id === editLink.dataset.editFull);
    if (rec) loadIntoForm(rec);
  }
});

// ── Cancel edit in table ───────────────────────────────────────
// (Handled above in records-body click handler)

// ── Page converter ─────────────────────────────────────────────
document.getElementById('conv-input')?.addEventListener('input', (e) => {
  const pages = Number(e.target.value);
  const ppm   = Number(getSettings().ppm || 1.5);
  const el    = document.getElementById('conversion-results');
  if (!pages || pages <= 0) { el.innerHTML = ''; return; }
  const minutes = pages / ppm;
  const hours   = minutes / 60;
  el.innerHTML = `
    <div>At ${ppm} pages/min:</div>
    <div><strong>${Math.round(minutes)}</strong> minutes to read</div>
    <div><strong>${hours.toFixed(1)}</strong> hours to read</div>
    <div><strong>${(hours / 8).toFixed(1)}</strong> work-days (8h)</div>
  `;
});

// ── Settings ───────────────────────────────────────────────────
const loadSettingsForm = () => {
  const s = getSettings();
  document.getElementById('s-goal').value = s.goal || '';
  document.getElementById('s-ppm').value  = s.ppm  || 1.5;
};

document.getElementById('save-goal-btn').addEventListener('click', () => {
  const val = Number(document.getElementById('s-goal').value);
  updateSettings({ goal: val >= 0 ? val : 0 });
  renderStats(getRecords(), getSettings());
  showToast('Goal saved.');
  announce('Reading goal saved.');
});

document.getElementById('save-units-btn').addEventListener('click', () => {
  const val = parseFloat(document.getElementById('s-ppm').value);
  if (!val || val <= 0) { showToast('Enter a valid reading speed.'); return; }
  updateSettings({ ppm: val });
  showToast('Reading speed saved.');
  announce('Reading speed saved.');
});

document.getElementById('clear-data-btn').addEventListener('click', () => {
  openConfirm('Delete ALL resources? This cannot be undone.', () => {
    replaceAll([]);
    renderStats(getRecords(), getSettings());
    refreshLibrary();
    showToast('All data cleared.');
    announce('All data cleared.', true);
  });
});

// ── Import / Export ────────────────────────────────────────────
document.getElementById('export-btn').addEventListener('click', () => {
  const data = getRecords();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `alu-library-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Library exported.');
  announce('Library exported as JSON.');
});

document.getElementById('import-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!validateImport(data)) {
        showToast('⚠ Invalid JSON structure — import failed.');
        announce('Import failed: invalid structure.', true);
        return;
      }
      openConfirm(`Import ${data.length} records? This will replace your current library.`, () => {
        const now = new Date().toISOString();
        const normalised = data.map(r => ({
          ...r,
          createdAt: r.createdAt || now,
          updatedAt: r.updatedAt || now,
        }));
        replaceAll(normalised);
        refreshLibrary();
        renderStats(getRecords(), getSettings());
        showToast(`Imported ${normalised.length} resources.`);
        announce(`Imported ${normalised.length} resources.`);
      });
    } catch {
      showToast('⚠ Could not parse JSON file.');
      announce('Import failed: could not parse file.', true);
    }
  };
  reader.readAsText(file);
  e.target.value = ''; // reset
});

// ── Confirm modal ──────────────────────────────────────────────
let pendingConfirm = null;

const openConfirm = (msg, callback) => {
  pendingConfirm = callback;
  document.getElementById('confirm-body').textContent = msg;
  const overlay = document.getElementById('confirm-overlay');
  overlay.hidden = false;
  document.getElementById('confirm-yes').focus();
};

const closeConfirm = () => {
  document.getElementById('confirm-overlay').hidden = true;
  pendingConfirm = null;
};

document.getElementById('confirm-yes').addEventListener('click', () => {
  if (pendingConfirm) pendingConfirm();
  closeConfirm();
});
document.getElementById('confirm-no').addEventListener('click', closeConfirm);

document.getElementById('confirm-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeConfirm();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeConfirm();
});

// ── Today's date helper ────────────────────────────────────────
document.getElementById('f-date').value = new Date().toISOString().slice(0, 10);

// ── Init ───────────────────────────────────────────────────────
navigateTo('dashboard');