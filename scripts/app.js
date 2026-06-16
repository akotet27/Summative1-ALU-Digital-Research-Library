/* scripts/app.js — IIFE Module: main application logic */
;(function (App) {
  'use strict';

  var FOCUSABLE = 'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';

  // Short-hand aliases
  var state      = App.state;
  var validators = App.validators;
  var search     = App.search;
  var ui         = App.ui;
  var storage    = App.storage;

  // ── Sidebar (mobile) ──────────────────────────────────────────
  var sidebar  = document.getElementById('sidebar');
  var backdrop = document.getElementById('sidebar-backdrop');

  function openSidebar() {
    sidebar.classList.add('open');
    backdrop.classList.add('active');
    document.getElementById('sidebar-toggle').setAttribute('aria-expanded', 'true');
    document.getElementById('sidebar-close').focus();
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    backdrop.classList.remove('active');
    var t = document.getElementById('sidebar-toggle');
    if (t) t.setAttribute('aria-expanded', 'false');
  }

  document.getElementById('sidebar-toggle').addEventListener('click', openSidebar);
  document.getElementById('sidebar-close').addEventListener('click', closeSidebar);
  backdrop.addEventListener('click', closeSidebar);

  // ── Navigation ────────────────────────────────────────────────
  function navigateTo(page) {
    document.querySelectorAll('.page').forEach(function (p) {
      p.classList.toggle('page--active', p.id === 'page-' + page);
    });
    document.querySelectorAll('.nav-link').forEach(function (a) {
      var active = a.dataset.page === page;
      a.classList.toggle('active', active);
      if (active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    if (page === 'dashboard') ui.renderStats(state.getRecords(), state.getSettings());
    if (page === 'library')   refreshLibrary();
    if (page === 'settings')  loadSettingsForm();
    if (page === 'add') {
      document.getElementById('add-heading').textContent = 'Add Resource';
      document.getElementById('resource-form').reset();
      document.getElementById('f-date').value = todayStr();
      clearErrors('f');
    }
    closeSidebar();
    window.scrollTo(0, 0);
  }

  // Wire nav clicks via event delegation
  document.addEventListener('click', function (e) {
    var link = e.target.closest('[data-page]');
    if (link) { e.preventDefault(); navigateTo(link.dataset.page); }
  });

  // ── Library refresh ───────────────────────────────────────────
  function getSearchState() {
    return {
      query:           document.getElementById('search-input').value,
      caseInsensitive: !document.getElementById('search-case').checked,
      status:          document.getElementById('filter-status').value,
      tag:             document.getElementById('filter-tag').value,
      sortBy:          document.getElementById('sort-by').value,
    };
  }

  function refreshLibrary() {
    var opts    = getSearchState();
    var result  = search.filterAndSort(state.getRecords(), opts);
    var hint    = document.getElementById('search-hint');
    var inp     = document.getElementById('search-input');

    if (result.regexError) {
      hint.textContent = '⚠ ' + result.regexError;
      inp.classList.add('search-error');
    } else if (opts.query) {
      hint.textContent = result.filtered.length + ' match' + (result.filtered.length !== 1 ? 'es' : '');
      inp.classList.remove('search-error');
    } else {
      hint.textContent = '';
      inp.classList.remove('search-error');
    }

    ui.populateTagFilter(state.getRecords());
    ui.renderTable(result.filtered, result.re);
  }

  ['search-input', 'filter-status', 'filter-tag', 'sort-by'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', refreshLibrary);
    if (el) el.addEventListener('change', refreshLibrary);
  });
  document.getElementById('search-case').addEventListener('change', refreshLibrary);
  document.getElementById('clear-filters').addEventListener('click', function () {
    document.getElementById('search-input').value  = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-tag').value    = '';
    document.getElementById('sort-by').value       = 'dateAdded-desc';
    refreshLibrary();
  });

  // ── Table row actions ─────────────────────────────────────────
  document.getElementById('records-body').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.dataset.action;
    var id     = btn.dataset.id;

    if (action === 'view') {
      var rec = state.getRecords().find(function (r) { return r.id === id; });
      if (rec) openViewModal(rec);
    }
    if (action === 'edit') {
      var rec = state.getRecords().find(function (r) { return r.id === id; });
      if (rec) openEditModal(rec);
    }
    if (action === 'delete') {
      var rec = state.getRecords().find(function (r) { return r.id === id; });
      if (rec) openConfirm('Delete "' + rec.title + '"?', function () {
        state.deleteRecord(id);
        refreshLibrary();
        ui.renderStats(state.getRecords(), state.getSettings());
        ui.showToast('Resource deleted.');
        ui.announce('Resource deleted.');
      });
    }
  });

  // ── Bookshelf clicks ──────────────────────────────────────────
  document.getElementById('bookshelf').addEventListener('click', function (e) {
    var spine = e.target.closest('.book-spine');
    if (!spine) return;
    var rec = state.getRecords().find(function (r) { return r.id === spine.dataset.id; });
    if (rec) openViewModal(rec);
  });
  document.getElementById('bookshelf').addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    var spine = e.target.closest('.book-spine');
    if (!spine) return;
    var rec = state.getRecords().find(function (r) { return r.id === spine.dataset.id; });
    if (rec) openViewModal(rec);
  });

  // ── VIEW MODAL ────────────────────────────────────────────────
  var viewTrigger = null;
  var currentViewRec = null;

  function openViewModal(rec) {
    currentViewRec = rec;
    viewTrigger    = document.activeElement;

    document.getElementById('view-spine').className = 'view-modal__spine view-modal__spine--' + rec.status;
    document.getElementById('view-modal-title').textContent = rec.title;
    document.getElementById('view-author').textContent      = 'by ' + rec.author;

    var labels = { want: 'Want to Read', reading: 'Currently Reading', finished: 'Finished' };
    document.getElementById('view-status').innerHTML =
      '<span class="status-badge status-badge--' + rec.status + '">' +
      '<span class="status-dot" aria-hidden="true"></span>' + labels[rec.status] + '</span>';

    document.getElementById('view-pages').textContent = Number(rec.pages).toLocaleString() + ' pages';
    document.getElementById('view-tag').textContent   = rec.tag;
    document.getElementById('view-date').textContent  = fmtDate(rec.dateAdded);

    var notesWrap = document.getElementById('view-notes');
    if (rec.notes && rec.notes.trim()) {
      document.getElementById('view-notes-text').textContent = rec.notes;
      notesWrap.hidden = false;
    } else {
      notesWrap.hidden = true;
    }

    document.getElementById('view-modal').hidden = false;
    document.getElementById('view-edit-btn').focus();
    ui.announce('Viewing: ' + rec.title);
  }

  function closeViewModal() {
    document.getElementById('view-modal').hidden = true;
    currentViewRec = null;
    if (viewTrigger && viewTrigger.focus) viewTrigger.focus();
    viewTrigger = null;
  }

  document.getElementById('view-modal-close').addEventListener('click', closeViewModal);
  document.getElementById('view-close-btn').addEventListener('click', closeViewModal);
  document.getElementById('view-edit-btn').addEventListener('click', function () {
    var rec = currentViewRec;
    closeViewModal();
    if (rec) openEditModal(rec);
  });
  document.getElementById('view-modal').addEventListener('click', function (e) {
    if (e.target === e.currentTarget) closeViewModal();
  });
  document.getElementById('view-modal').addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeViewModal(); return; }
    if (e.key === 'Tab') trapFocus(e, document.getElementById('view-modal'));
  });

  // ── EDIT MODAL ────────────────────────────────────────────────
  var editTrigger = null;

  function openEditModal(rec) {
    editTrigger = document.activeElement;
    document.getElementById('em-id').value     = rec.id;
    document.getElementById('em-title').value  = rec.title;
    document.getElementById('em-author').value = rec.author;
    document.getElementById('em-pages').value  = rec.pages;
    document.getElementById('em-date').value   = rec.dateAdded;
    document.getElementById('em-tag').value    = rec.tag;
    document.getElementById('em-status').value = rec.status;
    document.getElementById('em-notes').value  = rec.notes || '';
    clearErrors('em');
    document.getElementById('edit-modal').hidden = false;
    document.getElementById('em-title').focus();
  }

  function closeEditModal() {
    document.getElementById('edit-modal').hidden = true;
    if (editTrigger && editTrigger.focus) editTrigger.focus();
    editTrigger = null;
  }

  document.getElementById('edit-modal-close').addEventListener('click', closeEditModal);
  document.getElementById('edit-modal-cancel').addEventListener('click', closeEditModal);
  document.getElementById('edit-modal').addEventListener('click', function (e) {
    if (e.target === e.currentTarget) closeEditModal();
  });
  document.getElementById('edit-modal').addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeEditModal(); return; }
    if (e.key === 'Tab') trapFocus(e, document.getElementById('edit-modal'));
  });

  document.getElementById('edit-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = {
      title:  document.getElementById('em-title').value,
      author: document.getElementById('em-author').value,
      pages:  document.getElementById('em-pages').value,
      date:   document.getElementById('em-date').value,
      tag:    document.getElementById('em-tag').value,
      status: document.getElementById('em-status').value,
      notes:  document.getElementById('em-notes').value,
    };
    var result = validators.validateRecord(f);
    showErrors('em', result.errors);
    if (!result.isValid) { ui.announce(Object.values(result.errors)[0], true); return; }

    state.updateRecord(document.getElementById('em-id').value, {
      title:     validators.normalizeTitle(f.title),
      author:    f.author.trim(),
      pages:     parseInt(f.pages, 10),
      dateAdded: f.date.trim(),
      tag:       f.tag.trim(),
      status:    f.status,
      notes:     f.notes.trim(),
    });
    closeEditModal();
    refreshLibrary();
    ui.renderStats(state.getRecords(), state.getSettings());
    ui.showToast('Resource updated.');
    ui.announce('Resource updated.');
  });

  // Live blur validation — edit modal
  var editValidators = { 'em-title': 'validateTitle', 'em-author': 'validateAuthor', 'em-pages': 'validatePages', 'em-date': 'validateDate', 'em-tag': 'validateTag', 'em-status': 'validateStatus', 'em-notes': 'validateNotes' };
  Object.keys(editValidators).forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur', function () {
      setFieldError(id, validators[editValidators[id]](el.value));
    });
  });

  // ── ADD FORM ──────────────────────────────────────────────────
  var addValidators = { 'f-title': 'validateTitle', 'f-author': 'validateAuthor', 'f-pages': 'validatePages', 'f-date': 'validateDate', 'f-tag': 'validateTag', 'f-status': 'validateStatus', 'f-notes': 'validateNotes' };
  Object.keys(addValidators).forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur', function () {
      setFieldError(id, validators[addValidators[id]](el.value));
    });
  });

  document.getElementById('resource-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = {
      title:  document.getElementById('f-title').value,
      author: document.getElementById('f-author').value,
      pages:  document.getElementById('f-pages').value,
      date:   document.getElementById('f-date').value,
      tag:    document.getElementById('f-tag').value,
      status: document.getElementById('f-status').value,
      notes:  document.getElementById('f-notes').value,
    };
    var result = validators.validateRecord(f);
    showErrors('f', result.errors);
    if (!result.isValid) { ui.announce(Object.values(result.errors)[0], true); return; }

    var now = new Date().toISOString();
    state.addRecord({
      id:        state.generateId(),
      title:     validators.normalizeTitle(f.title),
      author:    f.author.trim(),
      pages:     parseInt(f.pages, 10),
      dateAdded: f.date.trim(),
      tag:       f.tag.trim(),
      status:    f.status,
      notes:     f.notes.trim(),
      createdAt: now, updatedAt: now,
    });
    document.getElementById('resource-form').reset();
    document.getElementById('f-date').value = todayStr();
    clearErrors('f');
    ui.showToast('Resource added!');
    ui.announce('Resource added successfully.');
    navigateTo('library');
  });

  // ── Page Converter ────────────────────────────────────────────
  document.getElementById('conv-input').addEventListener('input', function (e) {
    var pages = Number(e.target.value);
    var ppm   = Number(state.getSettings().ppm || 1.5);
    var el    = document.getElementById('conversion-results');
    if (!pages || pages <= 0) { el.innerHTML = ''; return; }
    var mins = pages / ppm;
    var hrs  = mins / 60;
    el.innerHTML =
      '<div>At <strong>' + ppm + '</strong> pages/min:</div>' +
      '<div><strong>' + Math.round(mins) + '</strong> minutes</div>' +
      '<div><strong>' + hrs.toFixed(1) + '</strong> hours</div>' +
      '<div><strong>' + (hrs / 8).toFixed(1) + '</strong> work-days (8 hrs)</div>';
  });

  // ── Settings ──────────────────────────────────────────────────
  function loadSettingsForm() {
    var s = state.getSettings();
    document.getElementById('s-goal').value = s.goal || '';
    document.getElementById('s-ppm').value  = s.ppm  || 1.5;
  }

  document.getElementById('save-goal-btn').addEventListener('click', function () {
    var val = Number(document.getElementById('s-goal').value);
    state.updateSettings({ goal: val >= 0 ? val : 0 });
    ui.renderStats(state.getRecords(), state.getSettings());
    ui.showToast('Goal saved.');
    ui.announce('Reading goal saved.');
  });

  document.getElementById('save-units-btn').addEventListener('click', function () {
    var val = parseFloat(document.getElementById('s-ppm').value);
    if (!val || val <= 0) { ui.showToast('Enter a valid reading speed.'); return; }
    state.updateSettings({ ppm: val });
    ui.showToast('Reading speed saved.');
    ui.announce('Reading speed saved.');
  });

  document.getElementById('clear-data-btn').addEventListener('click', function () {
    openConfirm('Delete ALL resources? This cannot be undone.', function () {
      state.replaceAll([]);
      ui.renderStats(state.getRecords(), state.getSettings());
      refreshLibrary();
      ui.showToast('All data cleared.');
      ui.announce('All data cleared.', true);
    });
  });

  // ── Import / Export ───────────────────────────────────────────
  document.getElementById('export-btn').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(state.getRecords(), null, 2)], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = 'alu-library-' + todayStr() + '.json';
    a.click();
    URL.revokeObjectURL(url);
    ui.showToast('Library exported.');
    ui.announce('Library exported as JSON.');
  });

  document.getElementById('import-file').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      try {
        var data = JSON.parse(ev.target.result);
        if (!storage.validateImport(data)) {
          ui.showToast('⚠ Invalid JSON structure — import failed.');
          ui.announce('Import failed: invalid structure.', true);
          return;
        }
        openConfirm('Import ' + data.length + ' records? This replaces your current library.', function () {
          var now = new Date().toISOString();
          state.replaceAll(data.map(function (r) {
            return Object.assign({ createdAt: now, updatedAt: now }, r);
          }));
          refreshLibrary();
          ui.renderStats(state.getRecords(), state.getSettings());
          ui.showToast('Imported ' + data.length + ' resources.');
          ui.announce('Imported ' + data.length + ' resources.');
        });
      } catch (err) {
        ui.showToast('⚠ Could not parse JSON file.');
        ui.announce('Import failed: could not parse file.', true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // ── CONFIRM MODAL ─────────────────────────────────────────────
  var pendingConfirm  = null;
  var confirmTrigger  = null;

  function openConfirm(msg, callback) {
    pendingConfirm  = callback;
    confirmTrigger  = document.activeElement;
    document.getElementById('confirm-body').textContent = msg;
    document.getElementById('confirm-overlay').hidden   = false;
    document.getElementById('confirm-yes').focus();
  }
  function closeConfirm() {
    document.getElementById('confirm-overlay').hidden = true;
    pendingConfirm = null;
    if (confirmTrigger && confirmTrigger.focus) confirmTrigger.focus();
    confirmTrigger = null;
  }

  document.getElementById('confirm-yes').addEventListener('click', function () {
    if (pendingConfirm) pendingConfirm();
    closeConfirm();
  });
  document.getElementById('confirm-no').addEventListener('click', closeConfirm);
  document.getElementById('confirm-overlay').addEventListener('click', function (e) {
    if (e.target === e.currentTarget) closeConfirm();
  });
  document.getElementById('confirm-overlay').addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeConfirm(); return; }
    if (e.key === 'Tab') trapFocus(e, document.getElementById('confirm-overlay'));
  });

  // Global Escape
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!document.getElementById('view-modal').hidden)    closeViewModal();
    if (!document.getElementById('edit-modal').hidden)    closeEditModal();
    if (!document.getElementById('confirm-overlay').hidden) closeConfirm();
    if (sidebar.classList.contains('open'))              closeSidebar();
  });

  // ── Helpers ───────────────────────────────────────────────────
  function trapFocus(e, container) {
    var focusable = Array.from(container.querySelectorAll(FOCUSABLE));
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
    else            { if (document.activeElement === last)  { e.preventDefault(); first.focus(); } }
  }

  function setFieldError(id, msg) {
    var input = document.getElementById(id);
    var err   = document.getElementById(id + '-err');
    if (!input) return;
    if (err) err.textContent = msg || '';
    input.classList.toggle('invalid', !!msg);
    input.classList.toggle('valid',   !msg && input.value.trim() !== '');
  }

  function clearErrors(prefix) {
    ['title','author','pages','date','tag','status','notes'].forEach(function (f) {
      setFieldError(prefix + '-' + f, '');
    });
  }

  function showErrors(prefix, errors) {
    ['title','author','pages','date','tag','status','notes'].forEach(function (f) {
      setFieldError(prefix + '-' + f, errors[f] || '');
    });
  }

  function todayStr() { return new Date().toISOString().slice(0, 10); }
  function fmtDate(str) {
    if (!str) return '—';
    try { return new Date(str + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch (e) { return str; }
  }

  // ── Init ──────────────────────────────────────────────────────
  document.getElementById('f-date').value = todayStr();
  navigateTo('dashboard');

})(window.App = window.App || {});