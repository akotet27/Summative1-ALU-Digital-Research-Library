/* scripts/app.js — Home page (index.html) catalog controller */
;(function (App) {
  'use strict';

  var storage    = App.storage;
  var validators = App.validators;
  var search     = App.search;
  var auth       = App.auth;

  auth.init();
  auth.wireThemeToggles();

  /* Only show facilitator-approved books on the public home page */
  var allRecs = storage.loadRecords().filter(function (r) { return r.approved === true; });

  /* ── Hero stats ─────────────────────────────────────────────── */
  (function buildHeroStats() {
    var users    = storage.loadUsers();
    var students = users.filter(function (u) { return u.role === 'student'; });
    var tags     = {};
    allRecs.forEach(function (r) { if (r.tag) tags[r.tag] = true; });

    function set(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
    set('hero-stat-books',    allRecs.length);
    set('hero-stat-students', students.length);
    set('hero-stat-tags',     Object.keys(tags).length);
  })();

  /* ── Populate tag filter ────────────────────────────────────── */
  (function buildTagFilter() {
    var tags = {};
    allRecs.forEach(function (r) { if (r.tag) tags[r.tag] = (tags[r.tag] || 0) + 1; });
    var sel = document.getElementById('pub-tag');
    if (!sel) return;
    Object.keys(tags).sort().forEach(function (tag) {
      var opt = document.createElement('option');
      opt.value       = tag;
      opt.textContent = tag + ' (' + tags[tag] + ')';
      sel.appendChild(opt);
    });
  })();

  /* ── Helpers ────────────────────────────────────────────────── */
  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* TAG → cover-color map for books without an explicit coverColor */
  var TAG_COLORS = {
    'Entrepreneurship': '#0F4C35',
    'Design':           '#6B1A2A',
    'Leadership':       '#2D1B69',
    'Data Science':     '#0D3D6B',
    'Technology':       '#0F3D0F',
    'Methodology':      '#1A3A1A',
    'Policy':           '#3D1A0A',
    'Economics':        '#1A1A3D',
    'Ethics':           '#3D1A3D',
    'Research':         '#1A3D3D',
  };

  function coverColor(rec) {
    return rec.coverColor || TAG_COLORS[rec.tag] || '#1B4D3E';
  }

  /* ── Build card HTML ────────────────────────────────────────── */
  function buildCard(rec, re) {
    var titleHtml  = validators.highlight(rec.title  || '', re);
    var authorHtml = validators.highlight(rec.author || '', re);
    var tagHtml    = validators.highlight(rec.tag    || '', re);
    var desc       = rec.description || '';
    var shortDesc  = desc.slice(0, 155) + (desc.length > 155 ? '…' : '');
    var color      = coverColor(rec);

    return '<article class="book-card" role="listitem" tabindex="0"' +
      ' data-id="' + escHtml(rec.id) + '"' +
      ' aria-label="' + escHtml(rec.title) + ' by ' + escHtml(rec.author) + '">' +
      '<div class="book-card__cover" style="background:' + escHtml(color) + '">' +
        '<p class="book-card__cover-title">' + escHtml(rec.title) + '</p>' +
        '<p class="book-card__cover-author">' + escHtml(rec.author || '') + '</p>' +
      '</div>' +
      '<div class="book-card__body">' +
        (rec.tag ? '<span class="book-card__tag">' + tagHtml + '</span>' : '') +
        '<h3 class="book-card__title">' + titleHtml + '</h3>' +
        '<p class="book-card__desc">' + escHtml(shortDesc) + '</p>' +
        '<div class="book-card__meta">' +
          '<span class="book-card__pages">' + escHtml(String(rec.pages || '?')) + ' pp</span>' +
          (rec.recommended ? '<span style="color:var(--accent);font-size:.82rem">Recommended</span>' : '') +
        '</div>' +
        '<button class="book-card__read-more" data-id="' + escHtml(rec.id) + '">Read More</button>' +
      '</div>' +
    '</article>';
  }

  /* ── Render catalog ─────────────────────────────────────────── */
  function renderCatalog(filtered, re) {
    var grid  = document.getElementById('catalog-grid');
    var count = document.getElementById('catalog-count');
    var empty = document.getElementById('catalog-empty');
    if (!grid) return;

    if (filtered.length === 0) {
      grid.innerHTML = '';
      if (empty) empty.hidden = false;
      if (count) count.textContent = '0 books';
      return;
    }
    if (empty) empty.hidden = true;
    if (count) count.textContent = filtered.length + ' book' + (filtered.length !== 1 ? 's' : '');
    grid.innerHTML = filtered.map(function (r) { return buildCard(r, re); }).join('');

    /* Wire card click and keyboard open */
    grid.querySelectorAll('.book-card').forEach(function (card) {
      function openCard() {
        var id  = card.dataset.id;
        var rec = allRecs.find(function (r) { return r.id === id; });
        if (rec) openBookModal(rec);
      }
      card.addEventListener('click', function (e) {
        if (e.target.classList.contains('book-card__read-more')) return;
        openCard();
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCard(); }
      });
    });

    grid.querySelectorAll('.book-card__read-more').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id  = btn.dataset.id;
        var rec = allRecs.find(function (r) { return r.id === id; });
        if (rec) openBookModal(rec);
      });
    });
  }

  /* ── Filter state ───────────────────────────────────────────── */
  var currentQuery = '';
  var currentTag   = '';
  var currentSort  = 'dateAdded-desc';
  var recOnly      = false;

  function applyFilters() {
    var base = allRecs.slice();
    if (recOnly)      base = base.filter(function (r) { return r.recommended; });
    if (currentTag)   base = base.filter(function (r) { return r.tag === currentTag; });

    var result = search.filterAndSort(base, {
      query: currentQuery, caseInsensitive: true, sortBy: currentSort
    });

    var hint = document.getElementById('pub-search-hint');
    if (hint) {
      if (result.regexError) {
        hint.textContent = 'Regex error: ' + result.regexError;
        hint.style.color = 'var(--red)';
      } else if (currentQuery && result.re) {
        hint.textContent = result.filtered.length + ' match' + (result.filtered.length !== 1 ? 'es' : '');
        hint.style.color = 'var(--green)';
      } else {
        hint.textContent = '';
      }
    }

    renderCatalog(result.filtered, result.re);
  }

  /* ── Event listeners ────────────────────────────────────────── */
  var debounceTimer;

  function wireSearch(inputId) {
    var inp = document.getElementById(inputId);
    if (!inp) return;
    inp.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        var pubSearch = document.getElementById('pub-search');
        var heroSearch = document.getElementById('hero-search');
        /* Sync both inputs */
        if (inputId === 'hero-search' && pubSearch) pubSearch.value = inp.value;
        if (inputId === 'pub-search'  && heroSearch) heroSearch.value = inp.value;
        currentQuery = inp.value;
        applyFilters();
        if (inputId === 'hero-search') {
          var catalog = document.getElementById('catalog');
          if (catalog) catalog.scrollIntoView({ behavior: 'smooth' });
        }
      }, 220);
    });
  }
  wireSearch('pub-search');
  wireSearch('hero-search');

  var heroSearchBtn = document.getElementById('hero-search-btn');
  if (heroSearchBtn) {
    heroSearchBtn.addEventListener('click', function () {
      var inp = document.getElementById('hero-search');
      if (inp) { currentQuery = inp.value; applyFilters(); }
      var catalog = document.getElementById('catalog');
      if (catalog) catalog.scrollIntoView({ behavior: 'smooth' });
    });
  }

  var tagSel = document.getElementById('pub-tag');
  if (tagSel) {
    tagSel.addEventListener('change', function () { currentTag = tagSel.value; applyFilters(); });
  }

  var sortSel = document.getElementById('pub-sort');
  if (sortSel) {
    sortSel.addEventListener('change', function () { currentSort = sortSel.value; applyFilters(); });
  }

  var recCheck = document.getElementById('pub-rec-only');
  if (recCheck) {
    recCheck.addEventListener('change', function () { recOnly = recCheck.checked; applyFilters(); });
  }

  /* ── Book modal ─────────────────────────────────────────────── */
  var bookModal = document.getElementById('book-modal');

  function openBookModal(rec) {
    if (!bookModal) return;

    function set(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
    function setHtml(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; }

    var coverEl = document.getElementById('book-modal-cover');
    if (coverEl) coverEl.style.background = coverColor(rec);

    set('book-modal-tag',    rec.tag    || '');
    set('book-modal-title',  rec.title  || '');
    set('book-modal-author', rec.author || '');
    set('book-modal-desc-text', rec.description || 'No description available for this book.');

    var metaEl = document.getElementById('book-modal-meta');
    if (metaEl) {
      var meta = [];
      if (rec.pages)     meta.push('<span>' + escHtml(String(rec.pages)) + ' pages</span>');
      if (rec.dateAdded) meta.push('<span>Added ' + escHtml(rec.dateAdded) + '</span>');
      if (rec.isbn)      meta.push('<span>ISBN: ' + escHtml(rec.isbn) + '</span>');
      if (rec.recommended) meta.push('<span style="color:var(--accent)">Recommended</span>');
      metaEl.innerHTML = meta.join('');
    }

    bookModal.hidden = false;
    var closeBtn = document.getElementById('book-modal-close');
    if (closeBtn) closeBtn.focus();
    document.body.style.overflow = 'hidden';
  }

  function closeBookModal() {
    if (!bookModal) return;
    bookModal.hidden = true;
    document.body.style.overflow = '';
  }

  var closeBtn   = document.getElementById('book-modal-close');
  var closeBtnBt = document.getElementById('book-modal-close-btn');
  if (closeBtn)   closeBtn.addEventListener('click', closeBookModal);
  if (closeBtnBt) closeBtnBt.addEventListener('click', closeBookModal);
  if (bookModal) {
    bookModal.addEventListener('click', function (e) {
      if (e.target === bookModal) closeBookModal();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && bookModal && !bookModal.hidden) closeBookModal();
  });

  /* ── Initial render ─────────────────────────────────────────── */
  applyFilters();

})(window.App = window.App || {});
