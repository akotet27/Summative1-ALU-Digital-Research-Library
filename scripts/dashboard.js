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
    var user  = auth.getUserById(userId) || {};
    var name  = user.name || session.name || '';
    var klass = user.class || session.class || '';
    var nameEl   = el('nav-name');
    var classEl  = el('nav-class');
    var avatarEl = el('nav-avatar');
    if (nameEl)   nameEl.textContent   = name;
    if (classEl)  classEl.textContent  = klass;
    if (avatarEl) avatarEl.textContent = auth.initials(name);
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
    if (page === 'books')     refreshBooks();
    if (page === 'library')   refreshLibrary();
    if (page === 'notes')     refreshNotes();
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
  function updateCapBar() {
    var s        = storage.loadUserSettings(userId);
    var goal     = s.goal || 0;
    var progs    = storage.getUserProgress(userId);
    var finished = progs.filter(function (p) { return p.completed; }).length;
    var capText  = el('cap-text');
    var capFill  = el('cap-fill');
    var capMsg   = el('cap-message');
    var capBar   = el('cap-fill') && el('cap-fill').parentElement;

    /* remove old set-goal link / done badge if re-rendering */
    var oldLink = document.querySelector('.cap-set-link');
    var oldDone = document.querySelector('.cap-goal-done');
    if (oldLink) oldLink.remove();
    if (oldDone) oldDone.remove();

    if (goal > 0) {
      var pct = Math.min(100, Math.round((finished / goal) * 100));
      if (capText) capText.textContent = finished + ' / ' + goal + ' (' + pct + '%)';
      if (capFill) {
        capFill.style.width = pct + '%';
        if (capBar) capBar.setAttribute('aria-valuenow', pct);
      }
      if (capMsg) {
        capMsg.hidden = false;
        if (finished >= goal) {
          capMsg.setAttribute('aria-live', 'assertive');
          capMsg.textContent = 'Goal reached! ' + finished + ' done.';
          capMsg.className   = 'cap-message cap-message--success';
          announce('Goal reached! You have finished ' + finished + ' of ' + goal + ' resources.', true);
          /* show done badge in sidebar */
          var doneEl = document.createElement('span');
          doneEl.className = 'cap-goal-done';
          doneEl.textContent = 'Goal complete!';
          var sidebarCap = document.querySelector('.sidebar__cap');
          if (sidebarCap) sidebarCap.appendChild(doneEl);
        } else {
          capMsg.setAttribute('aria-live', 'polite');
          var left = goal - finished;
          capMsg.textContent = left + ' more to reach your goal of ' + goal + '.';
          capMsg.className   = 'cap-message';
          announce(left + ' resource' + (left !== 1 ? 's' : '') + ' remaining.');
        }
      }
    } else {
      if (capText) capText.textContent = '—';
      if (capFill) capFill.style.width = '0%';
      if (capMsg)  capMsg.hidden = true;
      /* show set-goal link */
      var link = document.createElement('a');
      link.href = '#';
      link.className = 'cap-set-link';
      link.textContent = 'Set a reading goal →';
      link.addEventListener('click', function (e) { e.preventDefault(); navigateTo('settings'); });
      var sidebarCap = document.querySelector('.sidebar__cap');
      if (sidebarCap) sidebarCap.appendChild(link);
    }
  }

  /* ── Dashboard page ──────────────────────────────────────────── */
  function refreshDashboard() {
    var libs  = facBooks();
    var notes = myNotes();
    var progs = storage.getUserProgress(userId);

    var inProgress = progs.filter(function (p) { return p.percent > 0 && !p.completed; });
    var completed  = progs.filter(function (p) { return p.completed; });
    var totalPages = completed.reduce(function (s, p) { return s + (p.totalPages || 0); }, 0);

    var tagCounts = {};
    libs.forEach(function (r) { if (r.tag) tagCounts[r.tag] = (tagCounts[r.tag] || 0) + 1; });
    var topTag = Object.keys(tagCounts).sort(function (a, b) { return tagCounts[b] - tagCounts[a]; })[0] || '—';

    function set(id, v) { var e = el(id); if (e) e.textContent = v; }
    set('stat-total',   libs.length);
    set('stat-want',    notes.length);
    set('stat-reading', inProgress.length);
    set('stat-done',    completed.length);
    set('stat-pages',   totalPages.toLocaleString());
    set('stat-top-tag', topTag);

    updateCapBar();
    renderBarChart(notes);
    renderBookshelf(libs);
    renderNotesPreview(notes, []);
    announce('Dashboard updated. ' + libs.length + ' books in library, ' + notes.length + ' notes written.');
  }

  /* Bar chart: notes written — last 7 days */
  function renderBarChart(notes) {
    var chartEl = el('bar-chart');
    if (!chartEl) return;

    var today = new Date();
    var days  = [];
    for (var i = 6; i >= 0; i--) {
      var d   = new Date(today); d.setDate(d.getDate() - i);
      var key = d.toISOString().slice(0, 10);
      days.push({
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: notes.filter(function (n) { return (n.createdAt || '').slice(0, 10) === key; }).length
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

  /* Bookshelf — shows library books the student has interacted with */
  function renderBookshelf(libs) {
    var shelfEl = el('bookshelf');
    var emptyEl = el('shelf-empty');
    if (!shelfEl) return;

    var progs    = storage.getUserProgress(userId);
    var notedIds = {};
    myNotes().forEach(function (n) { if (n.bookId) notedIds[n.bookId] = true; });

    var activeBooks = libs.filter(function (book) {
      return notedIds[book.id] || progs.some(function (p) { return p.bookId === book.id; });
    });

    if (activeBooks.length === 0) {
      shelfEl.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    shelfEl.innerHTML = activeBooks.slice(0, 24).map(function (r) {
      var prog   = progs.find(function (p) { return p.bookId === r.id; });
      var status = prog ? (prog.completed ? 'finished' : 'reading') : 'want';
      return '<button class="book-spine book-spine--' + escHtml(status) + '"' +
        ' data-id="' + escHtml(r.id) + '"' +
        ' title="' + escHtml(r.title) + '"' +
        ' aria-label="' + escHtml(r.title) + ' (' + escHtml(STATUS_LABEL[status] || status) + ')">' +
        '<span class="book-spine__title">' + escHtml(r.title) + '</span>' +
      '</button>';
    }).join('');

    shelfEl.querySelectorAll('.book-spine').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var book = libs.find(function (r) { return r.id === btn.dataset.id; });
        if (book) openViewModal(book);
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

    var libBooks = facBooks();
    listEl.innerHTML = notes.slice(0, 3).map(function (n) {
      var book = recs.find(function (r) { return r.id === n.bookId; })
               || libBooks.find(function (r) { return r.id === n.bookId; });
      return '<div class="note-preview">' +
        '<p class="note-preview__content">' +
          escHtml((n.content || '').slice(0, 120)) + ((n.content || '').length > 120 ? '…' : '') +
        '</p>' +
        (book ? '<span class="note-preview__book">' + escHtml(book.title) + '</span>' : '') +
      '</div>';
    }).join('');
  }

  /* ── Browse Books page ──────────────────────────────────────── */
  var TAG_COLORS_DB = {
    /* BEL */
    'Entrepreneurship': '#0F2A5C', 'Leadership': '#1E3A6E',
    'Innovation': '#1a3d7c', 'Design Thinking': '#6B1A2A',
    'Social Entrepreneurship': '#1A3D6B',
    /* BSE */
    'Software Development': '#0F2A5C', 'AI & Machine Learning': '#0D1A6B',
    'Data Science': '#0D3D6B', 'Computing': '#1A2A5A',
    /* IBT */
    'International Business': '#3D1A0A', 'Global Development': '#1A1A3D',
    'Behavioral Economics': '#2A1A3D', 'Sustainability': '#0D3D2A',
    /* General */
    'Finance': '#1A1A4D', 'Communication': '#1A3A5A', 'Ethics': '#2D1B69'
  };

  var booksListMode = false;
  var booksTagFilter = '';
  var booksSearchQuery = '';

  function facBooks() {
    return storage.loadRecords().filter(function (r) { return r.addedByFacilitator && r.approved; });
  }

  function refreshBooks() {
    var books = facBooks();

    /* Populate tag filter */
    var tagSel = el('books-tag-filter');
    if (tagSel) {
      var curr = tagSel.value;
      while (tagSel.options.length > 1) tagSel.remove(1);
      var tags = {};
      books.forEach(function (b) { if (b.tag) tags[b.tag] = true; });
      Object.keys(tags).sort().forEach(function (t) {
        var opt = document.createElement('option'); opt.value = t; opt.textContent = t;
        tagSel.appendChild(opt);
      });
      tagSel.value = curr;
    }

    renderBooksGrid();
  }

  function renderBooksGrid() {
    var books = facBooks();
    var allProgress = storage.loadProgress ? storage.loadProgress() : [];

    /* Filter */
    var filtered = books.filter(function (b) {
      var q = booksSearchQuery.toLowerCase();
      var matchQ = !q || (b.title || '').toLowerCase().indexOf(q) !== -1 || (b.author || '').toLowerCase().indexOf(q) !== -1;
      var matchT = !booksTagFilter || b.tag === booksTagFilter;
      return matchQ && matchT;
    });

    var gridEl  = el('books-grid');
    var emptyEl = el('books-empty');
    if (!gridEl) return;

    if (filtered.length === 0) {
      gridEl.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    gridEl.className = 'books-grid' + (booksListMode ? ' view--list' : '');

    gridEl.innerHTML = filtered.map(function (book) {
      var prog    = allProgress.find(function (p) { return p.userId === userId && p.bookId === book.id; });
      var pct     = prog ? Math.min(100, Math.round(prog.percent || 0)) : 0;
      var bgColor = book.coverColor || TAG_COLORS_DB[book.tag] || '#0F2A5C';
      var coverStyle = book.coverUrl
        ? 'background-image:url(' + escHtml(book.coverUrl) + ');background-size:cover;background-position:center'
        : 'background-color:' + bgColor;
      var btnLabel = prog && prog.completed ? 'Read Again' : (prog && prog.currentPage > 0 ? 'Continue Reading' : 'Start Reading');
      var btnClass = prog && prog.currentPage > 0 ? 'btn--primary' : 'btn--outline';

      return '<div class="bk-card">' +
        '<div class="bk-card__cover" style="' + coverStyle + '">' +
          (book.coverUrl ? '' : '<span class="bk-card__cover-title">' + escHtml(book.title) + '</span>') +
          (pct > 0 ? '<div class="bk-progress bk-progress--overlay"><div class="bk-progress__fill" style="width:' + pct + '%"></div></div>' : '') +
        '</div>' +
        '<div class="bk-card__body">' +
          (book.tag ? '<span class="bk-card__tag">' + escHtml(book.tag) + '</span>' : '') +
          '<h3 class="bk-card__title">' + escHtml(book.title) + '</h3>' +
          '<p class="bk-card__author">' + escHtml(book.author || '') + '</p>' +
          (book.description ? '<p class="bk-card__summary">' + escHtml(book.description.slice(0, 120)) + (book.description.length > 120 ? '…' : '') + '</p>' : '') +
          '<div class="bk-card__footer">' +
            (book.pages ? '<span class="bk-card__pages">' + book.pages + ' pages</span>' : '') +
            (pct > 0 ? '<span class="reader-pct-badge" style="font-size:.72rem;padding:.2rem .5rem">' + pct + '%</span>' : '') +
          '</div>' +
          (book.pdfUrl
            ? '<button class="btn btn--sm ' + btnClass + ' start-reading-btn" data-book-id="' + escHtml(book.id) + '" aria-label="' + btnLabel + ' ' + escHtml(book.title) + '">' + btnLabel + '</button>'
            : '<button class="btn btn--sm btn--ghost view-details-btn" data-book-id="' + escHtml(book.id) + '">View Details</button>') +
        '</div>' +
      '</div>';
    }).join('');

    gridEl.querySelectorAll('.start-reading-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { startReading(btn.dataset.bookId); });
    });
    gridEl.querySelectorAll('.view-details-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var book = facBooks().find(function (b) { return b.id === btn.dataset.bookId; });
        if (book) openViewModal(book);
      });
    });
  }

  /* Grid / List toggle */
  var booksGridBtn = el('books-grid-btn');
  var booksListBtn = el('books-list-btn');
  if (booksGridBtn) {
    booksGridBtn.addEventListener('click', function () {
      booksListMode = false;
      booksGridBtn.classList.add('active');    booksGridBtn.setAttribute('aria-pressed', 'true');
      if (booksListBtn) { booksListBtn.classList.remove('active'); booksListBtn.setAttribute('aria-pressed', 'false'); }
      renderBooksGrid();
    });
  }
  if (booksListBtn) {
    booksListBtn.addEventListener('click', function () {
      booksListMode = true;
      booksListBtn.classList.add('active');    booksListBtn.setAttribute('aria-pressed', 'true');
      if (booksGridBtn) { booksGridBtn.classList.remove('active'); booksGridBtn.setAttribute('aria-pressed', 'false'); }
      renderBooksGrid();
    });
  }

  /* Books search + filter */
  var booksSearchEl = el('books-search');
  if (booksSearchEl) {
    booksSearchEl.addEventListener('input', function () {
      booksSearchQuery = booksSearchEl.value;
      renderBooksGrid();
    });
  }
  var booksTagFilterEl = el('books-tag-filter');
  if (booksTagFilterEl) {
    booksTagFilterEl.addEventListener('change', function () {
      booksTagFilter = booksTagFilterEl.value;
      renderBooksGrid();
    });
  }

  /* ── PDF Reader ──────────────────────────────────────────────── */
  var pdfDoc       = null;
  var pdfPageNum   = 1;
  var pdfRendering = false;
  var pdfPending   = null;
  var currentBookId = null;

  var PDF_JS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';

  function ensurePdfJs(cb) {
    if (window.pdfjsLib) { cb(); return; }
    var script = document.createElement('script');
    script.src = PDF_JS_URL;
    script.onload = function () {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
      cb();
    };
    script.onerror = function () { cb(new Error('Failed to load PDF.js')); };
    document.head.appendChild(script);
  }

  function startReading(bookId) {
    var book = storage.loadRecords().find(function (r) { return r.id === bookId; });
    if (!book) return;

    currentBookId = bookId;
    pdfDoc      = null;
    pdfPageNum  = 1;

    /* Navigate to reader page */
    navigateTo('reader');

    /* Set header */
    var heading = el('reader-heading');
    if (heading) heading.textContent = book.title;
    var pctBadge = el('reader-pct-badge');
    if (pctBadge) pctBadge.textContent = '0%';

    /* Show loading, hide canvas/iframe */
    var loadingEl = el('reader-loading');
    var canvasEl  = el('pdf-canvas');
    var iframeEl  = el('reader-iframe');
    var footerEl  = el('reader-footer');
    if (loadingEl) loadingEl.style.display = 'flex';
    if (canvasEl)  canvasEl.style.display  = 'none';
    if (iframeEl)  iframeEl.style.display  = 'none';
    if (footerEl)  footerEl.style.display  = 'none';

    /* Restore last page */
    var prog = storage.getProgress ? storage.getProgress(userId, bookId) : null;
    if (prog && prog.currentPage > 0) pdfPageNum = prog.currentPage;

    if (!book.pdfUrl) {
      if (loadingEl) loadingEl.innerHTML = '<p style="color:var(--muted)">No PDF URL provided for this book.</p>';
      return;
    }

    ensurePdfJs(function (loadErr) {
      if (loadErr || !window.pdfjsLib) {
        /* Fallback to iframe */
        if (loadingEl) loadingEl.style.display = 'none';
        if (iframeEl) { iframeEl.src = book.pdfUrl; iframeEl.style.display = 'block'; }
        if (footerEl) footerEl.style.display = 'none';
        return;
      }

      window.pdfjsLib.getDocument(book.pdfUrl).promise.then(function (doc) {
        pdfDoc = doc;
        var totalPages = doc.numPages;

        /* Update progress entry totalPages */
        if (storage.updateProgress) storage.updateProgress(userId, bookId, pdfPageNum, totalPages);

        if (loadingEl) loadingEl.style.display = 'none';
        if (footerEl)  footerEl.style.display  = 'flex';

        renderPdfPage(pdfPageNum);
      }).catch(function () {
        /* Fallback to iframe on CORS or other error */
        if (loadingEl) loadingEl.style.display = 'none';
        if (iframeEl) { iframeEl.src = book.pdfUrl; iframeEl.style.display = 'block'; }
        if (footerEl) footerEl.style.display = 'none';
      });
    });
  }

  function renderPdfPage(pageNum) {
    if (!pdfDoc) return;
    if (pdfRendering) { pdfPending = pageNum; return; }
    pdfRendering = true;

    pdfDoc.getPage(pageNum).then(function (page) {
      var canvasEl  = el('pdf-canvas');
      if (!canvasEl) { pdfRendering = false; return; }
      canvasEl.style.display = 'block';

      var container = el('reader-body');
      var viewport  = page.getViewport({ scale: 1 });
      var maxWidth  = container ? container.clientWidth - 32 : 800;
      var scale     = Math.min(2, maxWidth / viewport.width);
      var scaledVP  = page.getViewport({ scale: scale });

      canvasEl.width  = scaledVP.width;
      canvasEl.height = scaledVP.height;

      var ctx    = canvasEl.getContext('2d');
      var render = page.render({ canvasContext: ctx, viewport: scaledVP });

      render.promise.then(function () {
        pdfRendering = false;
        pdfPageNum   = pageNum;

        updatePdfProgress();

        if (pdfPending !== null) {
          var next = pdfPending; pdfPending = null;
          renderPdfPage(next);
        }
      });
    }).catch(function () { pdfRendering = false; });
  }

  function updatePdfProgress() {
    if (!pdfDoc || !currentBookId) return;
    var totalPages = pdfDoc.numPages;
    var pct        = Math.round((pdfPageNum / totalPages) * 100);

    /* Storage */
    if (storage.updateProgress) storage.updateProgress(userId, currentBookId, pdfPageNum, totalPages);

    /* Progress bar */
    var fill    = el('reader-progress-fill');
    var barEl   = el('reader-progress-bar');
    var pctEl   = el('reader-pct-badge');
    var pageEl  = el('reader-page-info');
    var prevBtn = el('reader-prev-btn');
    var nextBtn = el('reader-next-btn');

    if (fill)   { fill.style.width = pct + '%'; }
    if (barEl)  { barEl.setAttribute('aria-valuenow', pct); }
    if (pctEl)  { pctEl.textContent = pct + '%'; }
    if (pageEl) { pageEl.textContent = 'Page ' + pdfPageNum + ' of ' + totalPages; }
    if (prevBtn){ prevBtn.disabled = pdfPageNum <= 1; }
    if (nextBtn){ nextBtn.disabled = pdfPageNum >= totalPages; }
  }

  /* Reader nav buttons */
  var readerPrevBtn = el('reader-prev-btn');
  var readerNextBtn = el('reader-next-btn');
  var readerBackBtn = el('reader-back-btn');

  if (readerPrevBtn) {
    readerPrevBtn.addEventListener('click', function () {
      if (pdfPageNum > 1) renderPdfPage(pdfPageNum - 1);
    });
  }
  if (readerNextBtn) {
    readerNextBtn.addEventListener('click', function () {
      if (pdfDoc && pdfPageNum < pdfDoc.numPages) renderPdfPage(pdfPageNum + 1);
    });
  }
  if (readerBackBtn) {
    readerBackBtn.addEventListener('click', function () {
      navigateTo('books');
    });
  }

  /* ── Library page ────────────────────────────────────────────── */
  var libQuery = '', libStatus = '', libTag = '', libSort = 'dateAdded-desc', libCase = false;

  function refreshLibrary() {
    populateTagFilter('filter-tag', facBooks());
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
    var recs   = facBooks();
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
        hintEl.style.color = 'var(--primary-light)';
      } else { hintEl.textContent = ''; }
    }

    if (countEl) countEl.textContent = result.filtered.length + ' of ' + recs.length + ' books';
    if (emptyEl) emptyEl.hidden = result.filtered.length > 0;
    if (!tbody)  return;

    var progs = storage.getUserProgress(userId);

    tbody.innerHTML = result.filtered.map(function (r) {
      var titleHtml  = validators.highlight(r.title,  result.re);
      var authorHtml = validators.highlight(r.author, result.re);
      var tagHtml    = validators.highlight(r.tag,    result.re);
      var prog       = progs.find(function (p) { return p.bookId === r.id; });
      var status     = prog ? (prog.completed ? 'finished' : 'reading') : 'want';

      return '<tr data-id="' + escHtml(r.id) + '">' +
        '<td class="col-spine"><div class="spine-dot spine-dot--' + escHtml(status) + '"></div></td>' +
        '<td class="col-title">' + titleHtml +
          (r.recommended ? ' <span title="Recommended" aria-label="Recommended" style="color:var(--accent)">★</span>' : '') +
        '</td>' +
        '<td class="col-author">' + authorHtml + '</td>' +
        '<td class="col-pages">' + escHtml(String(r.pages || '')) + '</td>' +
        '<td class="col-tag">' + tagHtml + '</td>' +
        '<td class="col-status"><span class="status-badge status-badge--' + escHtml(status) + '">' +
          escHtml(STATUS_LABEL[status] || status) + '</span></td>' +
        '<td class="col-date">' + escHtml(r.dateAdded) + '</td>' +
        '<td class="col-actions">' +
          '<button class="btn btn--xs btn--ghost action-view" data-id="' + escHtml(r.id) + '" aria-label="View ' + escHtml(r.title) + '">View</button>' +
          '<button class="btn btn--xs btn--accent action-note" data-id="' + escHtml(r.id) + '" aria-label="Note for ' + escHtml(r.title) + '">Note</button>' +
          '<button class="btn btn--xs btn--outline action-edit" data-id="' + escHtml(r.id) + '" aria-label="Edit ' + escHtml(r.title) + '">Edit</button>' +
          '<button class="btn btn--xs btn--danger action-delete" data-id="' + escHtml(r.id) + '" aria-label="Delete ' + escHtml(r.title) + '">Delete</button>' +
        '</td>' +
      '</tr>';
    }).join('');

    tbody.querySelectorAll('.action-view').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var rec = facBooks().find(function (r) { return r.id === btn.dataset.id; });
        if (rec) openViewModal(rec);
      });
    });
    tbody.querySelectorAll('.action-note').forEach(function (btn) {
      btn.addEventListener('click', function () { openNoteModal(null, btn.dataset.id); });
    });
    tbody.querySelectorAll('.action-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var rec = facBooks().find(function (r) { return r.id === btn.dataset.id; });
        if (rec) openEditModal(rec);
      });
    });
    tbody.querySelectorAll('.action-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var rec = facBooks().find(function (r) { return r.id === btn.dataset.id; });
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

  /* Export library as JSON */
  var exportBtn = el('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      var libs = facBooks();
      var notes = myNotes();
      var exportData = {
        library: libs.map(function (r) {
          return { id: r.id, title: r.title, author: r.author, pages: r.pages, tag: r.tag, description: r.description || '' };
        }),
        myNotes: notes.map(function (n) {
          var book = libs.find(function (r) { return r.id === n.bookId; });
          return { id: n.id, content: n.content, bookId: n.bookId, bookTitle: book ? book.title : '', createdAt: n.createdAt, updatedAt: n.updatedAt };
        })
      };
      var blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      var url  = URL.createObjectURL(blob);
      var a    = document.createElement('a');
      a.href     = url;
      a.download = 'alusource-library-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(url);
      toast('Exported library (' + libs.length + ' books, ' + notes.length + ' notes).');
    });
  }

  /* ── Notes page ──────────────────────────────────────────────── */
  var notesQuery = '', notesBook = '';

  function refreshNotes() {
    var bookSel = el('notes-filter-book');
    if (bookSel) {
      var curr     = bookSel.value;
      var libBooks = facBooks();
      while (bookSel.options.length > 1) bookSel.remove(1);
      libBooks.forEach(function (r) {
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
    var libBooks = facBooks();
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
      var book = recs.find(function (r) { return r.id === n.bookId; })
               || libBooks.find(function (r) { return r.id === n.bookId; });
      var date = new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      var noteStatus = n.status || 'pending';
      var statusLabels = { pending: '⏳ Pending review', approved: '✓ Approved', rejected: '✗ Rejected' };
      var statusBadge = '<span class="note-status-badge note-status--' + noteStatus + '">' + (statusLabels[noteStatus] || noteStatus) + '</span>';
      var facilComment = n.facilComment
        ? '<p class="note-facil-comment">Facilitator: "' + escHtml(n.facilComment) + '"</p>'
        : '';
      return '<div class="note-card">' +
        '<div class="note-card__header">' +
          (book
            ? '<span class="note-card__book">' + escHtml(book.title) + '</span>'
            : '<span class="note-card__book note-card__book--free">Freestanding Note</span>') +
          '<span class="note-card__date">' + date + '</span>' +
        '</div>' +
        '<p class="note-card__content">' + escHtml(n.content) + '</p>' +
        '<div class="note-card__approval">' + statusBadge + facilComment + '</div>' +
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
  function ppmToPreview(ppm) {
    /* Convert pages-per-minute speed into an example for a 300-page book */
    var v = parseFloat(ppm) || 1.5;
    var min = Math.round(300 / v);
    var hrs = Math.floor(min / 60), rem = min % 60;
    return 'e.g. a 300-page book: ~' + (hrs > 0 ? hrs + 'h ' + rem + 'm' : rem + 'm');
  }

  function loadSettings() {
    var s = storage.loadUserSettings(userId);
    var goalEl    = el('s-goal');
    var ppmEl     = el('s-ppm');
    var ppmPreview = el('s-ppm-preview');
    if (goalEl) goalEl.value = s.goal || 0;
    if (ppmEl)  { ppmEl.value = s.ppm || 1.5; }
    if (ppmPreview) ppmPreview.textContent = ppmToPreview(s.ppm || 1.5);
    if (ppmEl && ppmPreview) {
      ppmEl.addEventListener('input', function () {
        ppmPreview.textContent = ppmToPreview(ppmEl.value);
      });
    }
  }

  var saveGoalBtn = el('save-goal-btn');
  if (saveGoalBtn) {
    saveGoalBtn.addEventListener('click', function () {
      var goalEl = el('s-goal');
      var goal   = Math.max(0, parseInt(goalEl ? goalEl.value : 0, 10) || 0);
      var s = storage.loadUserSettings(userId);
      s.goal = goal;
      storage.saveUserSettings(userId, s);
      updateCapBar();
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

    /* Reading time conversion: pages ÷ ppm → minutes → hours */
    var readTimeEl = el('view-read-time');
    if (readTimeEl && rec.pages) {
      var s   = storage.loadUserSettings(userId);
      var ppm = parseFloat(s.ppm) || 1.5;
      var totalMin = Math.round(rec.pages / ppm);
      var hrs  = Math.floor(totalMin / 60);
      var mins = totalMin % 60;
      var label = hrs > 0
        ? '~' + hrs + 'h ' + mins + 'm to read'
        : '~' + mins + 'm to read';
      readTimeEl.textContent = label;
      readTimeEl.hidden = false;
    } else if (readTimeEl) {
      readTimeEl.hidden = true;
    }

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

    /* Show student's own notes for this book */
    var myNotesSec  = el('view-my-notes');
    var myNotesListEl = el('view-my-notes-list');
    var myBookNotes = myNotes().filter(function (n) { return n.bookId === rec.id; });
    if (myNotesSec) {
      if (myBookNotes.length > 0) {
        myNotesSec.hidden = false;
        if (myNotesListEl) {
          myNotesListEl.innerHTML = myBookNotes.map(function (n) {
            return '<p style="margin:.4rem 0;padding:.5rem .75rem;background:var(--bg-offset);border-radius:var(--radius);font-size:.85rem">' + escHtml(n.content) + '</p>';
          }).join('');
        }
      } else {
        myNotesSec.hidden = true;
      }
    }

    var noteBtn = el('view-edit-btn');
    if (noteBtn) noteBtn.onclick = function () { closeViewModal(); openNoteModal(null, rec.id); };

    /* Description / summary */
    var descEl = el('view-desc');
    if (descEl) {
      if (rec.description) { descEl.textContent = rec.description; descEl.hidden = false; }
      else descEl.hidden = true;
    }

    /* No-PDF badge */
    var noPdfBadge = el('view-no-pdf-badge');
    if (noPdfBadge) noPdfBadge.hidden = !!rec.pdfUrl;

    /* Request PDF access button */
    var reqBtn = el('view-request-btn');
    if (reqBtn) {
      if (!rec.pdfUrl) {
        var existingReqs = storage.loadRequests ? storage.loadRequests() : [];
        var alreadyReq   = existingReqs.some(function (r) {
          return r.userId === userId && r.bookId === rec.id && r.status === 'pending';
        });
        reqBtn.textContent = alreadyReq ? 'Access Requested ✓' : 'Request PDF Access';
        reqBtn.disabled    = alreadyReq;
        reqBtn.hidden      = false;
        reqBtn.onclick = function () {
          if (reqBtn.disabled) return;
          var reqs = storage.loadRequests ? storage.loadRequests() : [];
          reqs.push({
            id:        'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 4),
            userId:    userId,
            bookId:    rec.id,
            bookTitle: rec.title,
            status:    'pending',
            createdAt: new Date().toISOString()
          });
          if (storage.saveRequests) storage.saveRequests(reqs);
          reqBtn.textContent = 'Access Requested ✓';
          reqBtn.disabled    = true;
          toast('PDF access request sent to facilitator.');
        };
      } else {
        reqBtn.hidden = true;
      }
    }

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
      updateCapBar();
    });
  }

  /* ── Note Modal ──────────────────────────────────────────────── */
  var noteModal = el('note-modal');

  function openNoteModal(note, preBookId) {
    if (!noteModal) return;
    var libBooks = facBooks();
    var bookSel  = el('nm-book');
    if (bookSel) {
      while (bookSel.options.length > 1) bookSel.remove(1);
      libBooks.forEach(function (r) {
        var opt = document.createElement('option');
        opt.value = r.id; opt.textContent = r.title.slice(0, 50);
        bookSel.appendChild(opt);
      });
      bookSel.value = preBookId || (note && note.bookId ? note.bookId : '');
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
        if (idx !== -1) {
          allNotes[idx].content      = content;
          allNotes[idx].bookId       = bookId;
          allNotes[idx].updatedAt    = now;
          allNotes[idx].status       = 'pending'; /* re-submit for approval on edit */
          allNotes[idx].facilComment = '';
        }
      } else {
        allNotes.push({
          id:          'note_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5),
          userId:      userId,
          bookId:      bookId,
          content:     content,
          status:      'pending',
          facilComment: '',
          createdAt:   now,
          updatedAt:   now,
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
      updateCapBar();
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
  /* Check if redirected from homepage with a specific book to read */
  var urlParams  = new URLSearchParams(window.location.search);
  var bookParam  = urlParams.get('book');
  if (bookParam) {
    var targetBook = storage.loadRecords().find(function (r) { return r.id === bookParam && r.addedByFacilitator && r.approved; });
    if (targetBook && targetBook.pdfUrl) {
      /* Clean URL so refreshes don't re-trigger */
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, '', window.location.pathname);
      }
      startReading(bookParam);
    } else {
      navigateTo('books');
      refreshBooks();
    }
  } else {
    refreshDashboard();
  }

})(window.App = window.App || {});
