/* scripts/dashboard.js — Student dashboard controller */
;(function (App) {
  'use strict';

  var storage    = App.storage;
  var validators = App.validators;
  var search     = App.search;
  var auth       = App.auth;

  /* ── Auth guard ─────────────────────────────────────────────── */
  auth.init();
  var session = auth.requireAuth('student');
  if (!session) return;

  auth.wireThemeToggles();

  var userId = session.userId;

  /* ── Data helpers ────────────────────────────────────────────── */
  function myRecords() {
    return storage.loadRecords().filter(function (r) { return r.userId === userId; });
  }
  function myNotes() {
    return storage.loadNotes().filter(function (n) { return n.userId === userId; });
  }

  /* ── Helpers ─────────────────────────────────────────────────── */
  function el(id) { return document.getElementById(id); }

  function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var STATUS_LABEL = { want: 'Want to Read', reading: 'Reading', finished: 'Finished' };

  /* ── Toast ───────────────────────────────────────────────────── */
  var toastTimer;
  function toast(msg, type) {
    var t = el('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast toast--show' + (type === 'error' ? ' toast--error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'toast'; }, 3200);
  }

  function announce(msg, assertive) {
    var live = el(assertive ? 'live-assertive' : 'live-polite');
    if (!live) return;
    live.textContent = '';
    setTimeout(function () { live.textContent = msg; }, 50);
  }

  /* ── Sidebar ─────────────────────────────────────────────────── */
  var sidebar  = el('sidebar');
  var backdrop = el('sidebar-backdrop');

  function openSidebar() {
    sidebar.classList.add('open');
    backdrop.classList.add('active');
    el('sidebar-toggle').setAttribute('aria-expanded', 'true');
    el('sidebar-close').focus();
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    backdrop.classList.remove('active');
    el('sidebar-toggle').setAttribute('aria-expanded', 'false');
  }
  el('sidebar-toggle').addEventListener('click', openSidebar);
  el('sidebar-close').addEventListener('click',  closeSidebar);
  backdrop.addEventListener('click', closeSidebar);

  /* Populate nav user info */
  (function () {
    var user = auth.getUserById(userId) || {};
    var name = user.name || session.name;
    el('nav-name').textContent    = name;
    el('nav-class').textContent   = user.class || session.class || '';
    el('nav-avatar').textContent  = auth.initials(name);
  })();

  el('logout-btn').addEventListener('click', function () { auth.logout(); });

  /* ── Navigation ──────────────────────────────────────────────── */
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
    closeSidebar();
    if (page === 'dashboard') refreshDashboard();
    if (page === 'library')   refreshLibrary();
    if (page === 'notes')     refreshNotes();
    if (page === 'add')       resetAddForm();
    if (page === 'profile')   loadProfile();
    if (page === 'settings')  loadSettings();
  }

  document.querySelectorAll('.nav-link').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      navigateTo(link.dataset.page);
    });
  });

  /* data-page links inside page bodies */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-page]');
    if (t && !t.classList.contains('nav-link')) {
      e.preventDefault();
      navigateTo(t.dataset.page);
    }
  });

  /* ── Cap bar ─────────────────────────────────────────────────── */
  function updateCapBar(recs) {
    var s        = storage.loadUserSettings(userId);
    var goal     = s.goal || 0;
    var finished = recs.filter(function (r) { return r.status === 'finished'; }).length;
    var capText  = el('cap-text');
    var capFill  = el('cap-fill');
    var capMsg   = el('cap-message');

    if (goal > 0) {
      var pct = Math.min(100, Math.round((finished / goal) * 100));
      if (capText) capText.textContent = finished + ' / ' + goal + ' (' + pct + '%)';
      if (capFill) {
        capFill.style.width = pct + '%';
        capFill.parentElement.setAttribute('aria-valuenow', pct);
      }
      if (capMsg) {
        capMsg.hidden = false;
        if (finished >= goal) {
          capMsg.textContent = 'Goal reached! You finished ' + finished + ' resource' + (finished !== 1 ? 's' : '') + '.';
          capMsg.className   = 'cap-message cap-message--success';
          announce('Reading goal reached!');
        } else {
          var left = goal - finished;
          capMsg.textContent = left + ' more resource' + (left !== 1 ? 's' : '') + ' to reach your goal of ' + goal + '.';
          capMsg.className   = 'cap-message';
        }
      }
    } else {
      if (capText) capText.textContent = 'No goal set';
      if (capFill) capFill.style.width = '0%';
      if (capMsg)  capMsg.hidden = true;
    }
  }

  /* ── Dashboard page ──────────────────────────────────────────── */
  function refreshDashboard() {
    var recs  = myRecords();
    var notes = myNotes();

    var finished = recs.filter(function (r) { return r.status === 'finished'; });
    var reading  = recs.filter(function (r) { return r.status === 'reading'; });
    var want     = recs.filter(function (r) { return r.status === 'want'; });
    var totalPgs = finished.reduce(function (s, r) { return s + (Number(r.pages) || 0); }, 0);

    var tagCounts = {};
    recs.forEach(function (r) { if (r.tag) tagCounts[r.tag] = (tagCounts[r.tag] || 0) + 1; });
    var topTag = Object.keys(tagCounts).sort(function (a, b) { return tagCounts[b] - tagCounts[a]; })[0] || '—';

    function set(id, v) { var e = el(id); if (e) e.textContent = v; }
    set('stat-total',   recs.length);
    set('stat-want',    want.length);
    set('stat-reading', reading.length);
    set('stat-done',    finished.length);
    set('stat-pages',   totalPgs.toLocaleString());
    set('stat-top-tag', topTag);

    updateCapBar(recs);
    renderBarChart(recs);
    renderBookshelf(recs);
    renderNotesPreview(notes, recs);
    announce('Dashboard updated. ' + recs.length + ' resource' + (recs.length !== 1 ? 's' : '') + ' in your library.');
  }

  /* Bar chart: resources added — last 7 days */
  function renderBarChart(recs) {
    var chartEl = el('bar-chart');
    if (!chartEl) return;

    var today = new Date();
    var days  = [];
    for (var i = 6; i >= 0; i--) {
      var d   = new Date(today); d.setDate(d.getDate() - i);
      var key = d.toISOString().slice(0, 10);
      days.push({
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: recs.filter(function (r) { return r.dateAdded === key; }).length
      });
    }

    var maxVal = Math.max.apply(null, days.map(function (d) { return d.count; })) || 1;
    chartEl.innerHTML = days.map(function (d) {
      var pct = Math.max(4, Math.round((d.count / maxVal) * 100));
      return '<div class="bar-col">' +
        '<div class="bar-col__bar" style="height:' + pct + '%">' +
          (d.count > 0 ? '<span class="bar-col__val">' + d.count + '</span>' : '') +
        '</div>' +
        '<div class="bar-col__label">' + d.label + '</div>' +
      '</div>';
    }).join('');
  }

  /* Bookshelf */
  function renderBookshelf(recs) {
    var shelfEl = el('bookshelf');
    var emptyEl = el('shelf-empty');
    if (!shelfEl) return;

    if (recs.length === 0) {
      shelfEl.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    shelfEl.innerHTML = recs.slice(0, 24).map(function (r) {
      return '<button class="book-spine book-spine--' + escHtml(r.status) + '"' +
        ' data-id="' + escHtml(r.id) + '"' +
        ' title="' + escHtml(r.title) + '"' +
        ' aria-label="' + escHtml(r.title) + ' (' + escHtml(STATUS_LABEL[r.status] || r.status) + ')">' +
        '<span class="book-spine__title">' + escHtml(r.title) + '</span>' +
      '</button>';
    }).join('');

    shelfEl.querySelectorAll('.book-spine').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var rec = myRecords().find(function (r) { return r.id === btn.dataset.id; });
        if (rec) openViewModal(rec);
      });
    });
  }

  /* Recent notes preview on dashboard */
  function renderNotesPreview(notes, recs) {
    var listEl = el('notes-preview-list');
    if (!listEl) return;

    if (notes.length === 0) {
      listEl.innerHTML = '<p class="empty-state">No notes yet.</p>';
      return;
    }

    listEl.innerHTML = notes.slice(0, 3).map(function (n) {
      var book = recs.find(function (r) { return r.id === n.bookId; });
      return '<div class="note-preview">' +
        '<p class="note-preview__content">' +
          escHtml((n.content || '').slice(0, 120)) + ((n.content || '').length > 120 ? '…' : '') +
        '</p>' +
        (book ? '<span class="note-preview__book">' + escHtml(book.title) + '</span>' : '') +
      '</div>';
    }).join('');
  }

  /* ── Library page ────────────────────────────────────────────── */
  var libQuery = '', libStatus = '', libTag = '', libSort = 'dateAdded-desc', libCase = false;

  function refreshLibrary() {
    populateTagFilter('filter-tag', myRecords());
    renderLibraryTable();
  }

  function populateTagFilter(selId, recs) {
    var sel = el(selId);
    if (!sel) return;
    var tags = {};
    recs.forEach(function (r) { if (r.tag) tags[r.tag] = true; });
    var current = sel.value;
    while (sel.options.length > 1) sel.remove(1);
    Object.keys(tags).sort().forEach(function (tag) {
      var opt = document.createElement('option');
      opt.value = tag; opt.textContent = tag;
      sel.appendChild(opt);
    });
    sel.value = current;
  }

  function renderLibraryTable() {
    var recs   = myRecords();
    var result = search.filterAndSort(recs, {
      query: libQuery, caseInsensitive: !libCase,
      status: libStatus, tag: libTag, sortBy: libSort
    });

    var tbody   = el('records-body');
    var countEl = el('records-count');
    var emptyEl = el('table-empty');
    var hintEl  = el('search-hint');

    if (hintEl) {
      if (result.regexError) {
        hintEl.textContent = 'Regex error'; hintEl.style.color = 'var(--red)';
      } else if (libQuery && result.re) {
        hintEl.textContent = result.filtered.length + ' match' + (result.filtered.length !== 1 ? 'es' : '');
        hintEl.style.color = 'var(--green)';
      } else { hintEl.textContent = ''; }
    }

    if (countEl) countEl.textContent = result.filtered.length + ' of ' + recs.length + ' resources';
    if (emptyEl) emptyEl.hidden = result.filtered.length > 0;
    if (!tbody)  return;

    tbody.innerHTML = result.filtered.map(function (r) {
      var titleHtml  = validators.highlight(r.title,  result.re);
      var authorHtml = validators.highlight(r.author, result.re);
      var tagHtml    = validators.highlight(r.tag,    result.re);
      var approvalBadge = r.approved
        ? '<span class="approval-badge approval-badge--approved">Approved</span>'
        : r.rejectedReason
          ? '<span class="approval-badge approval-badge--rejected" title="' + escHtml(r.rejectedReason) + '">Rejected</span>'
          : '<span class="approval-badge approval-badge--pending">Pending</span>';

      return '<tr data-id="' + escHtml(r.id) + '">' +
        '<td class="col-spine"><div class="spine-dot spine-dot--' + escHtml(r.status) + '"></div></td>' +
        '<td class="col-title">' + titleHtml +
          (r.recommended ? ' <span title="Recommended" aria-label="Recommended" style="color:#ca8a04">★</span>' : '') +
        '</td>' +
        '<td class="col-author">' + authorHtml + '</td>' +
        '<td class="col-pages">' + escHtml(r.pages) + '</td>' +
        '<td class="col-tag">' + tagHtml + '</td>' +
        '<td class="col-status"><span class="status-badge status-badge--' + escHtml(r.status) + '">' +
          escHtml(STATUS_LABEL[r.status] || r.status) + '</span></td>' +
        '<td class="col-date">' + escHtml(r.dateAdded) + '</td>' +
        '<td class="col-approval">' + approvalBadge + '</td>' +
        '<td class="col-actions">' +
          '<button class="btn btn--xs btn--ghost action-view"   data-id="' + escHtml(r.id) + '" aria-label="View ' + escHtml(r.title) + '">View</button>' +
          '<button class="btn btn--xs btn--ghost action-edit"   data-id="' + escHtml(r.id) + '" aria-label="Edit ' + escHtml(r.title) + '"' + (r.approved ? ' disabled title="Approved books cannot be edited"' : '') + '>Edit</button>' +
          '<button class="btn btn--xs btn--ghost action-delete" data-id="' + escHtml(r.id) + '" aria-label="Delete ' + escHtml(r.title) + '" style="color:var(--red)">Del</button>' +
        '</td>' +
      '</tr>';
    }).join('');

    tbody.querySelectorAll('.action-view').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var rec = myRecords().find(function (r) { return r.id === btn.dataset.id; });
        if (rec) openViewModal(rec);
      });
    });
    tbody.querySelectorAll('.action-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var rec = myRecords().find(function (r) { return r.id === btn.dataset.id; });
        if (rec) openEditModal(rec);
      });
    });
    tbody.querySelectorAll('.action-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var rec = myRecords().find(function (r) { return r.id === btn.dataset.id; });
        if (rec) confirmDeleteRecord(rec);
      });
    });
  }

  /* Library filter events */
  var libDebounce;
  var searchInput = el('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      clearTimeout(libDebounce);
      libDebounce = setTimeout(function () { libQuery = searchInput.value; renderLibraryTable(); }, 220);
    });
  }
  var filterStatus = el('filter-status');
  if (filterStatus) filterStatus.addEventListener('change', function () { libStatus = filterStatus.value; renderLibraryTable(); });
  var filterTag = el('filter-tag');
  if (filterTag) filterTag.addEventListener('change', function () { libTag = filterTag.value; renderLibraryTable(); });
  var sortBy = el('sort-by');
  if (sortBy) sortBy.addEventListener('change', function () { libSort = sortBy.value; renderLibraryTable(); });
  var searchCase = el('search-case');
  if (searchCase) searchCase.addEventListener('change', function () { libCase = searchCase.checked; renderLibraryTable(); });

  var clearFiltersBtn = el('clear-filters');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', function () {
      libQuery = ''; libStatus = ''; libTag = ''; libSort = 'dateAdded-desc'; libCase = false;
      if (searchInput) searchInput.value = '';
      if (filterStatus) filterStatus.value = '';
      if (filterTag) filterTag.value = '';
      if (sortBy) sortBy.value = 'dateAdded-desc';
      if (searchCase) searchCase.checked = false;
      renderLibraryTable();
    });
  }

  /* Export / Import */
  var exportBtn = el('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      var recs = myRecords();
      var blob = new Blob([JSON.stringify(recs, null, 2)], { type: 'application/json' });
      var url  = URL.createObjectURL(blob);
      var a    = document.createElement('a');
      a.href = url;
      a.download = 'my-library-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(url);
      toast('Exported ' + recs.length + ' records.');
    });
  }

  var importFile = el('import-file');
  if (importFile) {
    importFile.addEventListener('change', function () {
      var file = importFile.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        var data;
        try { data = JSON.parse(e.target.result); } catch (_) { toast('Invalid JSON file.', 'error'); return; }
        if (!storage.validateImport(data)) { toast('Import failed: invalid record format.', 'error'); return; }
        var recs     = storage.loadRecords();
        var existing = {};
        recs.forEach(function (r) { existing[r.id] = true; });
        var added = 0;
        data.forEach(function (r) {
          if (!existing[r.id]) { r.userId = userId; recs.push(r); added++; }
        });
        storage.saveRecords(recs);
        toast('Imported ' + added + ' new records.');
        renderLibraryTable();
        importFile.value = '';
      };
      reader.readAsText(file);
    });
  }

  /* ── Notes page ──────────────────────────────────────────────── */
  var notesQuery = '', notesBook = '';

  function refreshNotes() {
    var bookSel = el('notes-filter-book');
    if (bookSel) {
      var curr = bookSel.value;
      while (bookSel.options.length > 1) bookSel.remove(1);
      myRecords().forEach(function (r) {
        var opt = document.createElement('option');
        opt.value = r.id; opt.textContent = r.title.slice(0, 45);
        bookSel.appendChild(opt);
      });
      bookSel.value = curr;
    }
    renderNotesList();
  }

  function renderNotesList() {
    var notes    = myNotes();
    var recs     = myRecords();
    var filtered = search.filterNotes(notes, { query: notesQuery, bookId: notesBook || undefined });
    var listEl   = el('notes-list');
    if (!listEl) return;

    if (filtered.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;padding:2rem">' +
        '<p class="empty-state">No notes yet.</p>' +
        '<button class="btn btn--primary btn--sm" id="empty-add-note-btn" style="margin-top:.75rem">Add your first note</button>' +
        '</div>';
      var emptyBtn = el('empty-add-note-btn');
      if (emptyBtn) emptyBtn.addEventListener('click', function () { openNoteModal(null); });
      return;
    }

    listEl.innerHTML = filtered.map(function (n) {
      var book = recs.find(function (r) { return r.id === n.bookId; });
      var date = new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return '<div class="note-card">' +
        '<div class="note-card__header">' +
          (book
            ? '<span class="note-card__book">' + escHtml(book.title) + '</span>'
            : '<span class="note-card__book note-card__book--free">Freestanding Note</span>') +
          '<span class="note-card__date">' + date + '</span>' +
        '</div>' +
        '<p class="note-card__content">' + escHtml(n.content) + '</p>' +
        '<div class="note-card__actions">' +
          '<button class="btn btn--xs btn--ghost note-edit" data-nid="' + escHtml(n.id) + '">Edit</button>' +
          '<button class="btn btn--xs btn--ghost note-delete" data-nid="' + escHtml(n.id) + '" style="color:var(--red)">Delete</button>' +
        '</div>' +
      '</div>';
    }).join('');

    listEl.querySelectorAll('.note-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var note = myNotes().find(function (n) { return n.id === btn.dataset.nid; });
        if (note) openNoteModal(note);
      });
    });
    listEl.querySelectorAll('.note-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var note = myNotes().find(function (n) { return n.id === btn.dataset.nid; });
        if (note) confirmDeleteNote(note);
      });
    });
  }

  var notesSearchEl = el('notes-search');
  if (notesSearchEl) notesSearchEl.addEventListener('input', function () { notesQuery = notesSearchEl.value; renderNotesList(); });
  var notesFilterBook = el('notes-filter-book');
  if (notesFilterBook) notesFilterBook.addEventListener('change', function () { notesBook = notesFilterBook.value; renderNotesList(); });
  var addNoteBtn = el('add-note-btn');
  if (addNoteBtn) addNoteBtn.addEventListener('click', function () { openNoteModal(null); });

  /* ── Add Resource form ───────────────────────────────────────── */
  var ADD_VALIDATORS = {
    'f-title':  function (v) { return validators.validateTitle(v); },
    'f-author': function (v) { return validators.validateAuthorFormat(v); },
    'f-pages':  function (v) { return validators.validatePages(v); },
    'f-date':   function (v) { return validators.validateDate(v); },
    'f-tag':    function (v) { return validators.validateTag(v); },
    'f-status': function (v) { return v ? '' : 'Please select a status.'; },
    'f-notes':  function (v) { return validators.validateNotes(v); },
  };

  function validateField(id, val) {
    var fn  = ADD_VALIDATORS[id];
    var err = fn ? fn(val) : '';
    var errEl = el(id + '-err');
    if (errEl) errEl.textContent = err;
    var inp = el(id);
    if (inp) inp.setAttribute('aria-invalid', err ? 'true' : 'false');
    return !err;
  }

  function resetAddForm() {
    var form = el('resource-form');
    if (form) form.reset();
    Object.keys(ADD_VALIDATORS).forEach(function (id) {
      var errEl = el(id + '-err');
      if (errEl) errEl.textContent = '';
      var inp = el(id);
      if (inp) inp.removeAttribute('aria-invalid');
    });
    var dateEl = el('f-date');
    if (dateEl) dateEl.value = new Date().toISOString().slice(0, 10);
  }

  /* Blur validation */
  Object.keys(ADD_VALIDATORS).forEach(function (id) {
    var inp = el(id);
    if (inp) inp.addEventListener('blur', function () { validateField(id, inp.value); });
  });

  var resourceForm = el('resource-form');
  if (resourceForm) {
    resourceForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = true;
      Object.keys(ADD_VALIDATORS).forEach(function (id) {
        var inp = el(id);
        if (!validateField(id, inp ? inp.value : '')) valid = false;
      });
      if (!valid) { announce('Please fix validation errors before saving.', true); return; }

      var now = new Date().toISOString();
      var rec = {
        id:          'rec_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5),
        userId:      userId,
        title:       el('f-title').value.trim(),
        author:      el('f-author').value.trim(),
        pages:       parseInt(el('f-pages').value, 10),
        dateAdded:   el('f-date').value.trim(),
        tag:         el('f-tag').value.trim(),
        status:      el('f-status').value,
        notes:       el('f-notes').value.trim(),
        recommended: false,
        approved:    false,
        isbn:        '',
        createdAt:   now,
        updatedAt:   now,
      };

      var recs = storage.loadRecords();
      recs.push(rec);
      storage.saveRecords(recs);

      toast('"' + rec.title + '" submitted — pending facilitator approval.');
      announce('Resource ' + rec.title + ' submitted. Awaiting facilitator approval.');
      resetAddForm();
      navigateTo('library');
    });
  }

  /* Page converter */
  var convInput   = el('conv-input');
  var convResults = el('conversion-results');
  if (convInput && convResults) {
    convInput.addEventListener('input', function () {
      var pages = parseFloat(convInput.value);
      if (!pages || pages <= 0) { convResults.innerHTML = ''; return; }
      var s   = storage.loadUserSettings(userId);
      var ppm = s.ppm || 1.5;
      var mins = Math.round(pages / ppm);
      var hrs  = Math.floor(mins / 60);
      var rem  = mins % 60;
      convResults.innerHTML =
        '<div class="conv-result"><span class="conv-val">' + (hrs > 0 ? hrs + 'h ' : '') + rem + 'm</span><span class="conv-label">at ' + ppm + ' pages/min</span></div>' +
        '<div class="conv-result"><span class="conv-val">' + Math.round(pages * 250) + '</span><span class="conv-label">estimated words</span></div>';
    });
  }

  /* ── Profile page ────────────────────────────────────────────── */
  function loadProfile() {
    var user = auth.getUserById(userId) || {};
    el('profile-avatar').textContent  = auth.initials(user.name || '');
    el('profile-name').textContent    = user.name    || '—';
    el('profile-meta').textContent    = (user.class  || '') + (user.email ? ' · ' + user.email : '');
    el('profile-mission').textContent = user.mission || '';
    el('pf-name').value    = user.name    || '';
    el('pf-mission').value = user.mission || '';
    el('pf-bio').value     = user.bio     || '';

    var classSelect = el('pf-class');
    if (classSelect) {
      classSelect.innerHTML = '';
      auth.classes.forEach(function (c) {
        var opt = document.createElement('option');
        opt.value = c.id; opt.textContent = c.label;
        classSelect.appendChild(opt);
      });
      classSelect.value = user.class || '';
    }

    ['pf-curr-pw', 'pf-new-pw', 'pf-conf-pw'].forEach(function (id) {
      var inp = el(id); if (inp) inp.value = '';
    });
    var formErr = el('profile-form-err');
    if (formErr) formErr.textContent = '';
  }

  var profileForm = el('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name    = el('pf-name').value.trim();
      var cls     = el('pf-class').value;
      var mission = el('pf-mission').value.trim();
      var bio     = el('pf-bio').value;
      var currPw  = el('pf-curr-pw').value;
      var newPw   = el('pf-new-pw').value;
      var confPw  = el('pf-conf-pw').value;

      if (!name) { el('pf-name-err').textContent = 'Name is required.'; return; }
      el('pf-name-err').textContent = '';

      var updates = { name: name, class: cls, mission: mission, bio: bio };
      if (newPw) {
        updates.currentPassword = currPw;
        updates.newPassword     = newPw;
        updates.confirmPassword = confPw;
      }

      var result = auth.updateProfile(userId, updates);
      var formErr = el('profile-form-err');
      if (!result.ok) { if (formErr) formErr.textContent = result.error; return; }
      if (formErr) formErr.textContent = '';

      toast('Profile updated.');
      loadProfile();
      el('nav-name').textContent   = result.user.name;
      el('nav-class').textContent  = result.user.class || '';
      el('nav-avatar').textContent = auth.initials(result.user.name);
    });
  }

  /* ── Settings page ───────────────────────────────────────────── */
  function loadSettings() {
    var s = storage.loadUserSettings(userId);
    var goalEl = el('s-goal');
    var ppmEl  = el('s-ppm');
    if (goalEl) goalEl.value = s.goal || 0;
    if (ppmEl)  ppmEl.value  = s.ppm  || 1.5;
  }

  var saveGoalBtn = el('save-goal-btn');
  if (saveGoalBtn) {
    saveGoalBtn.addEventListener('click', function () {
      var goalEl = el('s-goal');
      var goal   = Math.max(0, parseInt(goalEl ? goalEl.value : 0, 10) || 0);
      var s = storage.loadUserSettings(userId);
      s.goal = goal;
      storage.saveUserSettings(userId, s);
      updateCapBar(myRecords());
      toast('Reading goal saved: ' + goal + ' resources.');
    });
  }

  var saveUnitsBtn = el('save-units-btn');
  if (saveUnitsBtn) {
    saveUnitsBtn.addEventListener('click', function () {
      var ppmEl = el('s-ppm');
      var ppm   = Math.max(0.1, parseFloat(ppmEl ? ppmEl.value : 1.5) || 1.5);
      var s = storage.loadUserSettings(userId);
      s.ppm = ppm;
      storage.saveUserSettings(userId, s);
      toast('Reading speed saved: ' + ppm + ' pages/min.');
    });
  }

  var clearDataBtn = el('clear-data-btn');
  if (clearDataBtn) {
    clearDataBtn.addEventListener('click', function () {
      openConfirm('Delete ALL your records and notes? This cannot be undone.', function () {
        storage.clearUserData(userId);
        toast('All your data has been cleared.');
        refreshDashboard();
      });
    });
  }

  var clearNotesBtn = el('clear-notes-btn');
  if (clearNotesBtn) {
    clearNotesBtn.addEventListener('click', function () {
      openConfirm('Delete all your notes? Records will be kept.', function () {
        var notes = storage.loadNotes().filter(function (n) { return n.userId !== userId; });
        storage.saveNotes(notes);
        toast('Notes cleared.');
      });
    });
  }

  /* ── View Modal ──────────────────────────────────────────────── */
  var viewModal = el('view-modal');

  function openViewModal(rec) {
    if (!viewModal) return;
    function set(id, v) { var e = el(id); if (e) e.textContent = v; }
    set('view-modal-title', rec.title);
    set('view-author',      rec.author || '—');
    set('view-pages',       (rec.pages || '?') + ' pages');
    set('view-tag',         rec.tag    || '');
    set('view-date',        rec.dateAdded || '');

    var spineEl  = el('view-spine');
    if (spineEl)  spineEl.className  = 'view-modal__spine view-modal__spine--' + (rec.status || 'want');
    var statusEl = el('view-status');
    if (statusEl) { statusEl.textContent = STATUS_LABEL[rec.status] || rec.status; statusEl.className = 'view-modal__status status-badge status-badge--' + (rec.status || 'want'); }

    var notesSec = el('view-notes');
    if (rec.notes && rec.notes.trim()) {
      if (notesSec) notesSec.hidden = false;
      set('view-notes-text', rec.notes);
    } else {
      if (notesSec) notesSec.hidden = true;
    }

    var editBtn = el('view-edit-btn');
    if (editBtn) editBtn.onclick = function () { closeViewModal(); openEditModal(rec); };

    viewModal.hidden = false;
    el('view-modal-close').focus();
    document.body.style.overflow = 'hidden';
  }

  function closeViewModal() {
    if (viewModal) viewModal.hidden = true;
    document.body.style.overflow = '';
  }

  el('view-modal-close') && el('view-modal-close').addEventListener('click', closeViewModal);
  el('view-close-btn')   && el('view-close-btn').addEventListener('click', closeViewModal);
  if (viewModal) viewModal.addEventListener('click', function (e) { if (e.target === viewModal) closeViewModal(); });

  /* ── Edit Modal ──────────────────────────────────────────────── */
  var editModal = el('edit-modal');

  function openEditModal(rec) {
    if (!editModal) return;
    el('em-id').value     = rec.id;
    el('em-title').value  = rec.title;
    el('em-author').value = rec.author;
    el('em-pages').value  = rec.pages;
    el('em-date').value   = rec.dateAdded;
    el('em-tag').value    = rec.tag;
    el('em-status').value = rec.status;
    el('em-notes').value  = rec.notes || '';
    ['em-title', 'em-author', 'em-pages', 'em-date', 'em-tag', 'em-notes'].forEach(function (id) {
      var errEl = el(id + '-err'); if (errEl) errEl.textContent = '';
    });
    editModal.hidden = false;
    el('edit-modal-close').focus();
    document.body.style.overflow = 'hidden';
  }

  function closeEditModal() {
    if (editModal) editModal.hidden = true;
    document.body.style.overflow = '';
  }

  el('edit-modal-close')  && el('edit-modal-close').addEventListener('click', closeEditModal);
  el('edit-modal-cancel') && el('edit-modal-cancel').addEventListener('click', closeEditModal);
  if (editModal) editModal.addEventListener('click', function (e) { if (e.target === editModal) closeEditModal(); });

  var EDIT_V = {
    'em-title':  function (v) { return validators.validateTitle(v); },
    'em-author': function (v) { return validators.validateAuthorFormat(v); },
    'em-pages':  function (v) { return validators.validatePages(v); },
    'em-date':   function (v) { return validators.validateDate(v); },
    'em-tag':    function (v) { return validators.validateTag(v); },
    'em-notes':  function (v) { return validators.validateNotes(v); },
  };

  var editForm = el('edit-form');
  if (editForm) {
    editForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = true;
      Object.keys(EDIT_V).forEach(function (id) {
        var inp = el(id);
        var err = EDIT_V[id](inp ? inp.value : '');
        var errEl = el(id + '-err');
        if (errEl) errEl.textContent = err;
        if (err) valid = false;
      });
      if (!valid) return;

      var id   = el('em-id').value;
      var recs = storage.loadRecords();
      var idx  = recs.findIndex(function (r) { return r.id === id; });
      if (idx === -1) { toast('Record not found.', 'error'); return; }

      recs[idx].title     = el('em-title').value.trim();
      recs[idx].author    = el('em-author').value.trim();
      recs[idx].pages     = parseInt(el('em-pages').value, 10);
      recs[idx].dateAdded = el('em-date').value.trim();
      recs[idx].tag       = el('em-tag').value.trim();
      recs[idx].status    = el('em-status').value;
      recs[idx].notes     = el('em-notes').value.trim();
      recs[idx].updatedAt = new Date().toISOString();

      storage.saveRecords(recs);
      closeEditModal();
      toast('Record updated.');
      announce('Record updated: ' + recs[idx].title);
      renderLibraryTable();
      updateCapBar(myRecords());
    });
  }

  /* ── Note Modal ──────────────────────────────────────────────── */
  var noteModal = el('note-modal');

  function openNoteModal(note) {
    if (!noteModal) return;
    var recs    = myRecords();
    var bookSel = el('nm-book');
    if (bookSel) {
      while (bookSel.options.length > 1) bookSel.remove(1);
      recs.forEach(function (r) {
        var opt = document.createElement('option');
        opt.value = r.id; opt.textContent = r.title.slice(0, 50);
        bookSel.appendChild(opt);
      });
      bookSel.value = note && note.bookId ? note.bookId : '';
    }
    el('nm-id').value      = note ? note.id      : '';
    el('nm-content').value = note ? note.content : '';

    var titleEl = el('note-modal-title');
    if (titleEl) titleEl.textContent = note ? 'Edit Note' : 'Add Note';
    var errEl = el('nm-content-err');
    if (errEl) errEl.textContent = '';

    noteModal.hidden = false;
    el('note-modal-close').focus();
    document.body.style.overflow = 'hidden';
  }

  function closeNoteModal() {
    if (noteModal) noteModal.hidden = true;
    document.body.style.overflow = '';
  }

  el('note-modal-close')   && el('note-modal-close').addEventListener('click', closeNoteModal);
  el('note-modal-cancel')  && el('note-modal-cancel').addEventListener('click', closeNoteModal);
  if (noteModal) noteModal.addEventListener('click', function (e) { if (e.target === noteModal) closeNoteModal(); });

  var noteForm = el('note-form');
  if (noteForm) {
    noteForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var content = el('nm-content').value.trim();
      var errEl   = el('nm-content-err');
      if (!content) { if (errEl) errEl.textContent = 'Note content is required.'; return; }
      var dupErr = validators.validateNotes(content);
      if (dupErr) { if (errEl) errEl.textContent = dupErr; return; }
      if (errEl) errEl.textContent = '';

      var existingId = el('nm-id').value;
      var bookId     = el('nm-book').value || null;
      var now        = new Date().toISOString();
      var allNotes   = storage.loadNotes();

      if (existingId) {
        var idx = allNotes.findIndex(function (n) { return n.id === existingId; });
        if (idx !== -1) { allNotes[idx].content = content; allNotes[idx].bookId = bookId; allNotes[idx].updatedAt = now; }
      } else {
        allNotes.push({
          id:        'note_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5),
          userId:    userId,
          bookId:    bookId,
          content:   content,
          createdAt: now,
          updatedAt: now,
        });
      }
      storage.saveNotes(allNotes);
      closeNoteModal();
      toast(existingId ? 'Note updated.' : 'Note added.');
      renderNotesList();
    });
  }

  /* ── Confirm Modal ───────────────────────────────────────────── */
  var confirmOverlay = el('confirm-overlay');
  var confirmCb = null;

  function openConfirm(msg, onYes) {
    if (!confirmOverlay) { if (window.confirm(msg)) onYes(); return; }
    el('confirm-body').textContent = msg;
    confirmCb = onYes;
    confirmOverlay.hidden = false;
    el('confirm-yes').focus();
    document.body.style.overflow = 'hidden';
  }

  function closeConfirm() {
    if (confirmOverlay) confirmOverlay.hidden = true;
    document.body.style.overflow = '';
    confirmCb = null;
  }

  el('confirm-yes') && el('confirm-yes').addEventListener('click', function () { if (confirmCb) confirmCb(); closeConfirm(); });
  el('confirm-no')  && el('confirm-no').addEventListener('click', closeConfirm);
  if (confirmOverlay) confirmOverlay.addEventListener('click', function (e) { if (e.target === confirmOverlay) closeConfirm(); });

  function confirmDeleteRecord(rec) {
    openConfirm('Delete "' + rec.title + '"? This cannot be undone.', function () {
      var recs = storage.loadRecords().filter(function (r) { return r.id !== rec.id; });
      storage.saveRecords(recs);
      toast('"' + rec.title + '" deleted.');
      renderLibraryTable();
      updateCapBar(myRecords());
    });
  }

  function confirmDeleteNote(note) {
    openConfirm('Delete this note?', function () {
      var notes = storage.loadNotes().filter(function (n) { return n.id !== note.id; });
      storage.saveNotes(notes);
      toast('Note deleted.');
      renderNotesList();
    });
  }

  /* ── Global Escape ───────────────────────────────────────────── */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (viewModal      && !viewModal.hidden)      { closeViewModal();   return; }
    if (editModal      && !editModal.hidden)      { closeEditModal();   return; }
    if (noteModal      && !noteModal.hidden)      { closeNoteModal();   return; }
    if (confirmOverlay && !confirmOverlay.hidden) { closeConfirm();     return; }
  });

  /* ── Initial render ──────────────────────────────────────────── */
  refreshDashboard();

})(window.App = window.App || {});
