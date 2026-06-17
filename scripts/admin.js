/* scripts/admin.js — Facilitator dashboard controller */
;(function (App) {
  'use strict';

  var storage    = App.storage;
  var validators = App.validators;
  var search     = App.search;
  var auth       = App.auth;

  /* ── Auth guard ─────────────────────────────────────────────── */
  auth.init();
  var session = auth.requireAuth('facilitator');
  if (!session) return;

  auth.wireThemeToggles();

  var userId = session.userId;

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

  function announce(msg) {
    var live = el('live-polite');
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

  /* Nav user info */
  (function () {
    var user = auth.getUserById(userId) || {};
    var name = user.name || session.name;
    el('nav-name').textContent   = name;
    el('nav-avatar').textContent = auth.initials(name);
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
    if (page === 'overview')     refreshOverview();
    if (page === 'approvals')    refreshApprovals();
    if (page === 'students')     refreshStudents();
    if (page === 'library')      refreshAdminLibrary();
    if (page === 'reports')      refreshReports();
    if (page === 'recommended')  refreshRecommended();
  }

  document.querySelectorAll('.nav-link').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      navigateTo(link.dataset.page);
    });
  });

  /* ── Overview page ───────────────────────────────────────────── */
  function refreshOverview() {
    var allRecs = storage.loadRecords();
    var users   = storage.loadUsers();
    var students = users.filter(function (u) { return u.role === 'student'; });

    var finished = allRecs.filter(function (r) { return r.status === 'finished'; });
    var rec      = allRecs.filter(function (r) { return r.recommended; });

    var avgPages = finished.length > 0
      ? Math.round(finished.reduce(function (s, r) { return s + (Number(r.pages) || 0); }, 0) / finished.length)
      : 0;

    var tagCounts = {};
    allRecs.forEach(function (r) { if (r.tag) tagCounts[r.tag] = (tagCounts[r.tag] || 0) + 1; });
    var topTag = Object.keys(tagCounts).sort(function (a, b) { return tagCounts[b] - tagCounts[a]; })[0] || '—';

    function set(id, v) { var e = el(id); if (e) e.textContent = v; }
    set('fac-stat-total',    allRecs.length);
    set('fac-stat-done',     finished.length);
    set('fac-stat-avgpages', avgPages || '—');
    set('fac-stat-rec',      rec.length);
    set('fac-stat-students', students.length);
    set('fac-stat-top-tag',  topTag);

    var subtitle = el('fac-subtitle');
    if (subtitle) subtitle.textContent = students.length + ' students · ' + allRecs.length + ' resources tracked';

    renderTagChart(allRecs);
    renderHealthGrid(allRecs, students);
    announce('Overview updated. ' + allRecs.length + ' total resources.');
  }

  /* Resources by tag bar chart */
  function renderTagChart(recs) {
    var chartEl = el('tag-chart');
    if (!chartEl) return;
    var stats = search.computeTagStats(recs).slice(0, 8);
    if (stats.length === 0) { chartEl.innerHTML = '<p class="empty-state" style="padding:1rem">No data yet.</p>'; return; }
    var maxVal = stats[0].count || 1;
    chartEl.innerHTML = stats.map(function (s) {
      var pct = Math.max(4, Math.round((s.count / maxVal) * 100));
      return '<div class="bar-col">' +
        '<div class="bar-col__bar" style="height:' + pct + '%">' +
          '<span class="bar-col__val">' + s.count + '</span>' +
        '</div>' +
        '<div class="bar-col__label">' + escHtml(s.tag) + '</div>' +
      '</div>';
    }).join('');
  }

  /* Library health grid: one cell per student */
  function renderHealthGrid(allRecs, students) {
    var gridEl = el('fac-health-grid');
    if (!gridEl) return;
    if (students.length === 0) { gridEl.innerHTML = '<p class="empty-state" style="padding:1rem">No students yet.</p>'; return; }

    gridEl.innerHTML = students.map(function (stu) {
      var stuRecs  = allRecs.filter(function (r) { return r.userId === stu.id; });
      var done     = stuRecs.filter(function (r) { return r.status === 'finished'; }).length;
      var reading  = stuRecs.filter(function (r) { return r.status === 'reading'; }).length;
      var cls      = done > 5 ? 'health--high' : done > 2 ? 'health--mid' : 'health--low';
      return '<div class="health-cell ' + cls + '" title="' + escHtml(stu.name) + ' · ' + done + ' finished">' +
        '<span class="health-cell__name">' + escHtml(auth.initials(stu.name)) + '</span>' +
        '<span class="health-cell__count">' + stuRecs.length + '</span>' +
      '</div>';
    }).join('');
  }

  /* ── Pending Approvals page ──────────────────────────────────── */
  function refreshApprovals() {
    var allRecs  = storage.loadRecords();
    var users    = storage.loadUsers();
    var pending  = allRecs.filter(function (r) { return !r.approved && !r.rejectedReason; });
    var rejected = allRecs.filter(function (r) { return !r.approved && r.rejectedReason; });

    /* Update nav badge */
    var badge = el('pending-badge');
    if (badge) {
      if (pending.length > 0) {
        badge.textContent = pending.length;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    }

    var container = el('approvals-container');
    if (!container) return;

    if (pending.length === 0 && rejected.length === 0) {
      container.innerHTML = '<div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg><h3>All clear!</h3><p>No submissions awaiting review.</p></div>';
      return;
    }

    var html = '';

    if (pending.length > 0) {
      html += '<h2 style="font-family:var(--font-serif);font-size:1.25rem;margin-bottom:1rem;color:var(--primary)">Awaiting Review (' + pending.length + ')</h2>';
      html += pending.map(function (r) {
        var user = users.find(function (u) { return u.id === r.userId; }) || {};
        return '<div class="pending-card" data-id="' + escHtml(r.id) + '">' +
          '<div class="pending-card__cover" style="background:' + escHtml(r.coverColor || '#1B4D3E') + ';width:48px;height:64px;border-radius:4px;flex-shrink:0"></div>' +
          '<div class="pending-card__body" style="flex:1;min-width:0">' +
            '<h3 style="font-size:.95rem;font-weight:700;margin-bottom:.2rem">' + escHtml(r.title) + '</h3>' +
            '<p style="font-size:.83rem;color:var(--text-muted);margin-bottom:.3rem">' + escHtml(r.author || '—') + '</p>' +
            '<div style="display:flex;gap:.5rem;flex-wrap:wrap;font-size:.78rem;color:var(--text-muted)">' +
              (r.tag ? '<span style="background:var(--bg-offset);padding:.15rem .5rem;border-radius:100px">' + escHtml(r.tag) + '</span>' : '') +
              '<span>' + escHtml(user.name || 'Unknown') + '</span>' +
              '<span>' + escHtml(r.dateAdded || '') + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="pending-card__actions" style="display:flex;gap:.5rem;flex-shrink:0">' +
            '<button class="btn btn--sm btn--primary approve-btn" data-id="' + escHtml(r.id) + '" aria-label="Approve ' + escHtml(r.title) + '">Approve</button>' +
            '<button class="btn btn--sm btn--danger  reject-btn"  data-id="' + escHtml(r.id) + '" aria-label="Reject ' + escHtml(r.title) + '">Reject</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    if (rejected.length > 0) {
      html += '<h2 style="font-family:var(--font-serif);font-size:1.25rem;margin:2rem 0 1rem;color:var(--primary)">Previously Rejected (' + rejected.length + ')</h2>';
      html += rejected.map(function (r) {
        var user = users.find(function (u) { return u.id === r.userId; }) || {};
        return '<div class="pending-card" style="opacity:.75">' +
          '<div style="background:' + escHtml(r.coverColor || '#888') + ';width:48px;height:64px;border-radius:4px;flex-shrink:0"></div>' +
          '<div style="flex:1;min-width:0">' +
            '<h3 style="font-size:.95rem;font-weight:700;margin-bottom:.2rem">' + escHtml(r.title) + '</h3>' +
            '<p style="font-size:.83rem;color:var(--text-muted);margin-bottom:.3rem">' + escHtml(r.author || '—') + ' · ' + escHtml(user.name || 'Unknown') + '</p>' +
            '<p style="font-size:.82rem;color:var(--red);font-style:italic">"' + escHtml(r.rejectedReason) + '"</p>' +
          '</div>' +
          '<div style="flex-shrink:0">' +
            '<button class="btn btn--sm btn--outline approve-btn" data-id="' + escHtml(r.id) + '" aria-label="Approve ' + escHtml(r.title) + '">Approve</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    container.innerHTML = html;

    container.querySelectorAll('.approve-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openConfirm('Approve "' + (storage.loadRecords().find(function(r){return r.id===btn.dataset.id;}) || {}).title + '"?', function () {
          storage.approveRecord(btn.dataset.id, userId);
          toast('Book approved and published to the catalog.');
          refreshApprovals();
        });
      });
    });

    container.querySelectorAll('.reject-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { openRejectModal(btn.dataset.id); });
    });
  }

  /* ── Reject modal ─────────────────────────────────────────────── */
  var rejectModal = el('reject-modal');

  function openRejectModal(recordId) {
    if (!rejectModal) {
      var reason = window.prompt('Enter rejection reason:');
      if (reason) { storage.rejectRecord(recordId, reason); toast('Submission rejected.'); refreshApprovals(); }
      return;
    }
    el('reject-record-id').value  = recordId;
    el('reject-reason').value     = '';
    el('reject-reason-err').textContent = '';
    rejectModal.hidden = false;
    el('reject-reason').focus();
    document.body.style.overflow = 'hidden';
  }

  function closeRejectModal() {
    if (rejectModal) rejectModal.hidden = true;
    document.body.style.overflow = '';
  }

  var rejectCloseBtn  = el('reject-modal-close');
  var rejectCancelBtn = el('reject-cancel-btn');
  var rejectConfirmBtn = el('reject-confirm-btn');

  if (rejectCloseBtn)  rejectCloseBtn.addEventListener('click',  closeRejectModal);
  if (rejectCancelBtn) rejectCancelBtn.addEventListener('click', closeRejectModal);
  if (rejectModal) rejectModal.addEventListener('click', function (e) { if (e.target === rejectModal) closeRejectModal(); });

  if (rejectConfirmBtn) {
    rejectConfirmBtn.addEventListener('click', function () {
      var reason   = el('reject-reason').value.trim();
      var recordId = el('reject-record-id').value;
      var errEl    = el('reject-reason-err');
      if (!reason) { if (errEl) errEl.textContent = 'Please enter a rejection reason.'; return; }
      if (errEl) errEl.textContent = '';
      storage.rejectRecord(recordId, reason);
      toast('Submission rejected.');
      closeRejectModal();
      refreshApprovals();
    });
  }

  /* Update the pending badge on page load */
  (function updatePendingBadge() {
    var pending = storage.loadRecords().filter(function (r) { return !r.approved && !r.rejectedReason; });
    var badge   = el('pending-badge');
    if (badge) {
      badge.textContent = pending.length;
      badge.style.display = pending.length > 0 ? 'inline-flex' : 'none';
    }
  })();

  /* ── Students by Class page ──────────────────────────────────── */
  var selectedStudentId = null;

  function refreshStudents() {
    el('student-detail').hidden = true;
    selectedStudentId = null;
    var allRecs  = storage.loadRecords();
    var students = storage.loadUsers().filter(function (u) { return u.role === 'student'; });

    var container = el('students-container');
    if (!container) return;

    if (students.length === 0) {
      container.innerHTML = '<p class="empty-state" style="padding:2rem">No students registered yet.</p>';
      return;
    }

    /* Group by class */
    var classMap = {};
    students.forEach(function (stu) {
      var cls = stu.class || 'Unassigned';
      if (!classMap[cls]) classMap[cls] = [];
      classMap[cls].push(stu);
    });

    container.innerHTML = Object.keys(classMap).sort().map(function (cls) {
      var stuList = classMap[cls];
      return '<section class="class-section" aria-labelledby="cls-' + escHtml(cls.replace(/\s/g,'_')) + '">' +
        '<h2 class="class-section__title" id="cls-' + escHtml(cls.replace(/\s/g,'_')) + '">' + escHtml(cls) +
          ' <span class="class-section__count">' + stuList.length + ' student' + (stuList.length !== 1 ? 's' : '') + '</span>' +
        '</h2>' +
        '<div class="student-grid">' +
        stuList.map(function (stu) {
          var stuRecs = allRecs.filter(function (r) { return r.userId === stu.id; });
          var done    = stuRecs.filter(function (r) { return r.status === 'finished'; }).length;
          return '<button class="student-card" data-uid="' + escHtml(stu.id) + '" aria-label="View ' + escHtml(stu.name) + '">' +
            '<div class="student-card__avatar">' + escHtml(auth.initials(stu.name)) + '</div>' +
            '<div class="student-card__name">' + escHtml(stu.name) + '</div>' +
            '<div class="student-card__mission">' + escHtml(stu.mission || '—') + '</div>' +
            '<div class="student-card__stats">' +
              '<span>' + stuRecs.length + ' total</span>' +
              '<span>' + done + ' finished</span>' +
            '</div>' +
          '</button>';
        }).join('') +
        '</div>' +
      '</section>';
    }).join('');

    container.querySelectorAll('.student-card').forEach(function (card) {
      card.addEventListener('click', function () { showStudentDetail(card.dataset.uid); });
    });
  }

  function showStudentDetail(uid) {
    var allRecs  = storage.loadRecords();
    var user     = auth.getUserById(uid);
    if (!user)   return;

    selectedStudentId = uid;
    var stuRecs  = allRecs.filter(function (r) { return r.userId === uid; });
    var done     = stuRecs.filter(function (r) { return r.status === 'finished'; });
    var reading  = stuRecs.filter(function (r) { return r.status === 'reading'; });

    /* Render detail card */
    var detailContent = el('student-detail-content');
    if (detailContent) {
      detailContent.innerHTML =
        '<div class="student-detail__header">' +
          '<div class="student-detail__avatar">' + escHtml(auth.initials(user.name)) + '</div>' +
          '<div>' +
            '<div class="student-detail__name">' + escHtml(user.name) + '</div>' +
            '<div class="student-detail__class">' + escHtml(user.class || '') + ' · ' + escHtml(user.email || '') + '</div>' +
            '<div class="student-detail__mission">' + escHtml(user.mission || '') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="student-detail__stats">' +
          '<span>' + stuRecs.length + ' total</span>' +
          '<span>' + done.length + ' finished</span>' +
          '<span>' + reading.length + ' reading</span>' +
        '</div>';
    }

    /* Render their books table */
    var tbody = el('stu-books-body');
    if (tbody) {
      tbody.innerHTML = stuRecs.length === 0
        ? '<tr><td colspan="5" class="empty-state" style="padding:1.5rem">No records yet.</td></tr>'
        : stuRecs.map(function (r) {
          return '<tr>' +
            '<td>' + escHtml(r.title) + (r.recommended ? ' <span style="color:#ca8a04">★</span>' : '') + '</td>' +
            '<td>' + escHtml(r.author) + '</td>' +
            '<td><span class="status-badge status-badge--' + escHtml(r.status) + '">' + escHtml(STATUS_LABEL[r.status] || r.status) + '</span></td>' +
            '<td>' + escHtml(r.pages) + '</td>' +
            '<td>' + escHtml(r.tag) + '</td>' +
          '</tr>';
        }).join('');
    }

    el('student-detail').hidden = false;
    el('student-back-btn').focus();
  }

  var studentBackBtn = el('student-back-btn');
  if (studentBackBtn) {
    studentBackBtn.addEventListener('click', function () {
      el('student-detail').hidden = true;
      selectedStudentId = null;
    });
  }

  /* ── Class Library page ──────────────────────────────────────── */
  var adminQuery = '', adminStatus = '', adminTag = '', adminSort = 'dateAdded-desc';

  function refreshAdminLibrary() {
    populateAdminTagFilter();
    renderAdminTable();
  }

  function populateAdminTagFilter() {
    var sel  = el('admin-filter-tag');
    if (!sel) return;
    var tags = {};
    storage.loadRecords().forEach(function (r) { if (r.tag) tags[r.tag] = true; });
    var curr = sel.value;
    while (sel.options.length > 1) sel.remove(1);
    Object.keys(tags).sort().forEach(function (tag) {
      var opt = document.createElement('option');
      opt.value = tag; opt.textContent = tag;
      sel.appendChild(opt);
    });
    sel.value = curr;
  }

  function renderAdminTable() {
    var allRecs = storage.loadRecords();
    var users   = storage.loadUsers();
    var result  = search.filterAndSort(allRecs, {
      query: adminQuery, caseInsensitive: true,
      status: adminStatus, tag: adminTag, sortBy: adminSort
    });

    var tbody   = el('admin-records-body');
    var countEl = el('admin-records-count');
    var emptyEl = el('admin-table-empty');
    var hintEl  = el('admin-search-hint');

    if (hintEl) {
      if (result.regexError) {
        hintEl.textContent = 'Regex error'; hintEl.style.color = 'var(--red)';
      } else if (adminQuery && result.re) {
        hintEl.textContent = result.filtered.length + ' match' + (result.filtered.length !== 1 ? 'es' : '');
        hintEl.style.color = 'var(--green)';
      } else { hintEl.textContent = ''; }
    }

    if (countEl) countEl.textContent = result.filtered.length + ' of ' + allRecs.length + ' resources';
    if (emptyEl) emptyEl.hidden = result.filtered.length > 0;
    if (!tbody)  return;

    tbody.innerHTML = result.filtered.map(function (r) {
      var user  = users.find(function (u) { return u.id === r.userId; }) || {};
      var title = validators.highlight(r.title, result.re);
      return '<tr>' +
        '<td class="col-spine"><div class="spine-dot spine-dot--' + escHtml(r.status) + '"></div></td>' +
        '<td>' + title + '</td>' +
        '<td>' + escHtml(r.author) + '</td>' +
        '<td>' + escHtml(user.name || 'Unknown') + '</td>' +
        '<td><span class="status-badge status-badge--' + escHtml(r.status) + '">' + escHtml(STATUS_LABEL[r.status] || r.status) + '</span></td>' +
        '<td style="text-align:center">' + (r.recommended ? '★' : '') + '</td>' +
        '<td>' +
          '<button class="btn btn--xs btn--ghost admin-view-btn" data-id="' + escHtml(r.id) + '" aria-label="View ' + escHtml(r.title) + '">View</button>' +
        '</td>' +
      '</tr>';
    }).join('');

    tbody.querySelectorAll('.admin-view-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var rec = storage.loadRecords().find(function (r) { return r.id === btn.dataset.id; });
        if (rec) openViewModal(rec);
      });
    });
  }

  /* Admin library filters */
  var adminDebounce;
  var adminSearchEl = el('admin-search');
  if (adminSearchEl) {
    adminSearchEl.addEventListener('input', function () {
      clearTimeout(adminDebounce);
      adminDebounce = setTimeout(function () { adminQuery = adminSearchEl.value; renderAdminTable(); }, 220);
    });
  }
  var adminFilterStatus = el('admin-filter-status');
  if (adminFilterStatus) adminFilterStatus.addEventListener('change', function () { adminStatus = adminFilterStatus.value; renderAdminTable(); });
  var adminFilterTag = el('admin-filter-tag');
  if (adminFilterTag) adminFilterTag.addEventListener('change', function () { adminTag = adminFilterTag.value; renderAdminTable(); });
  var adminSortEl = el('admin-sort');
  if (adminSortEl) adminSortEl.addEventListener('change', function () { adminSort = adminSortEl.value; renderAdminTable(); });
  var adminClearBtn = el('admin-clear-filters');
  if (adminClearBtn) {
    adminClearBtn.addEventListener('click', function () {
      adminQuery = ''; adminStatus = ''; adminTag = ''; adminSort = 'dateAdded-desc';
      if (adminSearchEl) adminSearchEl.value = '';
      if (adminFilterStatus) adminFilterStatus.value = '';
      if (adminFilterTag) adminFilterTag.value = '';
      if (adminSortEl) adminSortEl.value = 'dateAdded-desc';
      renderAdminTable();
    });
  }

  /* Admin export/import JSON */
  var adminExportBtn = el('admin-export-btn');
  if (adminExportBtn) {
    adminExportBtn.addEventListener('click', function () {
      var recs = storage.loadRecords();
      var blob = new Blob([JSON.stringify(recs, null, 2)], { type: 'application/json' });
      var url  = URL.createObjectURL(blob);
      var a    = document.createElement('a');
      a.href = url;
      a.download = 'all-records-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(url);
      toast('Exported ' + recs.length + ' records.');
    });
  }

  var adminImportFile = el('admin-import-file');
  if (adminImportFile) {
    adminImportFile.addEventListener('change', function () {
      var file = adminImportFile.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        var data;
        try { data = JSON.parse(e.target.result); } catch (_) { toast('Invalid JSON.', 'error'); return; }
        if (!storage.validateImport(data)) { toast('Import failed: invalid structure.', 'error'); return; }
        var recs     = storage.loadRecords();
        var existing = {};
        recs.forEach(function (r) { existing[r.id] = true; });
        var added = 0;
        data.forEach(function (r) { if (!existing[r.id]) { recs.push(r); added++; } });
        storage.saveRecords(recs);
        toast('Imported ' + added + ' records.');
        renderAdminTable();
        adminImportFile.value = '';
      };
      reader.readAsText(file);
    });
  }

  /* ── Reports page ────────────────────────────────────────────── */
  function refreshReports() {
    var allRecs = storage.loadRecords();
    renderTagLeaderboard(allRecs);
    renderCompletionChart(allRecs);
  }

  function renderTagLeaderboard(recs) {
    var boardEl = el('tag-leaderboard');
    if (!boardEl) return;
    var stats = search.computeTagStats(recs).slice(0, 10);
    if (stats.length === 0) { boardEl.innerHTML = '<p class="empty-state" style="padding:1rem">No tags yet.</p>'; return; }
    var maxVal = stats[0].count || 1;
    boardEl.innerHTML = stats.map(function (s) {
      var pct = Math.round((s.count / maxVal) * 100);
      return '<div class="tag-bar">' +
        '<span class="tag-bar__label">' + escHtml(s.tag) + '</span>' +
        '<div class="tag-bar__track"><div class="tag-bar__fill" style="width:' + pct + '%"></div></div>' +
        '<span class="tag-bar__count">' + s.count + '</span>' +
      '</div>';
    }).join('');
  }

  function renderCompletionChart(recs) {
    var chartEl = el('completion-chart');
    if (!chartEl) return;
    var days = search.computeCompletionsByDay(recs, 30);
    var maxVal = Math.max.apply(null, days.map(function (d) { return d.count; })) || 1;
    chartEl.innerHTML = days.map(function (d) {
      var pct = Math.max(d.count > 0 ? 8 : 1, Math.round((d.count / maxVal) * 100));
      return '<div class="bar-col bar-col--sm" title="' + d.label + ': ' + d.count + '">' +
        '<div class="bar-col__bar" style="height:' + pct + '%">' +
          (d.count > 0 ? '<span class="bar-col__val">' + d.count + '</span>' : '') +
        '</div>' +
        '<div class="bar-col__label bar-col__label--sm">' + d.label + '</div>' +
      '</div>';
    }).join('');
  }

  /* CSV export */
  var exportCsvBtn = el('export-csv-btn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', function () {
      var recs  = storage.loadRecords();
      var users = storage.loadUsers();

      function csvField(v) {
        var s = String(v == null ? '' : v);
        if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
        return s;
      }

      var header  = ['id','title','author','pages','status','tag','dateAdded','recommended','studentName','studentEmail','class'];
      var rows    = [header.map(csvField).join(',')];

      recs.forEach(function (r) {
        var user = users.find(function (u) { return u.id === r.userId; }) || {};
        rows.push([
          r.id, r.title, r.author, r.pages, r.status, r.tag,
          r.dateAdded, r.recommended ? '1' : '0',
          user.name || '', user.email || '', user.class || ''
        ].map(csvField).join(','));
      });

      var csv  = rows.join('\r\n');
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      var url  = URL.createObjectURL(blob);
      var a    = document.createElement('a');
      a.href = url;
      a.download = 'alu-library-report-' + new Date().toISOString().slice(0, 10) + '.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast('CSV exported (' + recs.length + ' records).');
    });
  }

  /* ── Recommended page ────────────────────────────────────────── */
  function refreshRecommended() {
    var allRecs = storage.loadRecords();
    renderRecBookshelf(allRecs);
    renderRecTable(allRecs);
  }

  function renderRecBookshelf(recs) {
    var shelfEl = el('fac-bookshelf');
    if (!shelfEl) return;
    var recRecs = recs.filter(function (r) { return r.recommended; });
    if (recRecs.length === 0) {
      shelfEl.innerHTML = '<p class="empty-state" style="padding:1rem">No recommended resources yet.</p>';
      return;
    }
    shelfEl.innerHTML = recRecs.slice(0, 20).map(function (r) {
      return '<button class="book-spine book-spine--' + escHtml(r.status) + '" data-id="' + escHtml(r.id) + '"' +
        ' title="' + escHtml(r.title) + '" aria-label="' + escHtml(r.title) + '">' +
        '<span class="book-spine__title">' + escHtml(r.title) + '</span>' +
      '</button>';
    }).join('');

    shelfEl.querySelectorAll('.book-spine').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var rec = storage.loadRecords().find(function (r) { return r.id === btn.dataset.id; });
        if (rec) openViewModal(rec);
      });
    });
  }

  function renderRecTable(recs) {
    var tbody = el('rec-table-body');
    if (!tbody) return;

    tbody.innerHTML = recs.map(function (r) {
      return '<tr data-id="' + escHtml(r.id) + '">' +
        '<td>' + escHtml(r.title) + '</td>' +
        '<td>' + escHtml(r.author) + '</td>' +
        '<td>' + escHtml(r.tag) + '</td>' +
        '<td style="text-align:center">' +
          '<input type="checkbox" class="rec-checkbox" data-id="' + escHtml(r.id) + '"' +
          (r.recommended ? ' checked' : '') +
          ' aria-label="Recommend ' + escHtml(r.title) + '" />' +
        '</td>' +
        '<td>' +
          '<button class="btn btn--xs btn--ghost rec-view-btn" data-id="' + escHtml(r.id) + '" aria-label="View ' + escHtml(r.title) + '">View</button>' +
        '</td>' +
      '</tr>';
    }).join('');

    tbody.querySelectorAll('.rec-checkbox').forEach(function (chk) {
      chk.addEventListener('change', function () {
        var recs = storage.loadRecords();
        var idx  = recs.findIndex(function (r) { return r.id === chk.dataset.id; });
        if (idx !== -1) {
          recs[idx].recommended = chk.checked;
          recs[idx].updatedAt   = new Date().toISOString();
          storage.saveRecords(recs);
          toast((chk.checked ? '★ Recommended: ' : 'Removed: ') + recs[idx].title);
          renderRecBookshelf(storage.loadRecords());
        }
      });
    });

    tbody.querySelectorAll('.rec-view-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var rec = storage.loadRecords().find(function (r) { return r.id === btn.dataset.id; });
        if (rec) openViewModal(rec);
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
    if (statusEl) {
      statusEl.textContent = STATUS_LABEL[rec.status] || rec.status;
      statusEl.className   = 'view-modal__status status-badge status-badge--' + (rec.status || 'want');
    }

    var notesSec = el('view-notes');
    if (rec.notes && rec.notes.trim()) {
      if (notesSec) notesSec.hidden = false;
      set('view-notes-text', rec.notes);
    } else {
      if (notesSec) notesSec.hidden = true;
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

  /* ── Global Escape ───────────────────────────────────────────── */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (rejectModal    && !rejectModal.hidden)    { closeRejectModal(); return; }
    if (viewModal      && !viewModal.hidden)      { closeViewModal();   return; }
    if (confirmOverlay && !confirmOverlay.hidden) { closeConfirm();     return; }
  });

  /* ── Initial render ──────────────────────────────────────────── */
  refreshOverview();

})(window.App = window.App || {});
