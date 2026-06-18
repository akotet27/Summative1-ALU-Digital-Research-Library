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

  var TAG_COLORS = {
    'Entrepreneurship':        '#0F2A5C',
    'Leadership':              '#1E3A6E',
    'Innovation':              '#1a3d7c',
    'Design Thinking':         '#6B1A2A',
    'Social Entrepreneurship': '#1A3D6B',
    'Software Development':    '#0F2A5C',
    'AI & Machine Learning':   '#0D1A6B',
    'Data Science':            '#0D3D6B',
    'Computing':               '#1A2A5A',
    'International Business':  '#3D1A0A',
    'Global Development':      '#1A1A3D',
    'Behavioral Economics':    '#2A1A3D',
    'Sustainability':          '#0D3D2A',
    'Finance':                 '#1A1A4D',
    'Communication':           '#1A3A5A',
    'Ethics':                  '#2D1B69'
  };

  function randomColor() {
    var colors = Object.values(TAG_COLORS);
    return colors[Math.floor(Math.random() * colors.length)];
  }

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
    if (page === 'overview')    refreshOverview();
    if (page === 'approvals')   refreshApprovals();
    if (page === 'students')    refreshStudents();
    if (page === 'library')     refreshAdminLibrary();
    if (page === 'reports')     refreshReports();
    if (page === 'recommended') refreshRecommended();
  }

  document.querySelectorAll('.nav-link').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      navigateTo(link.dataset.page);
    });
  });

  /* ── Overview page ───────────────────────────────────────────── */
  function refreshOverview() {
    var allRecs   = storage.loadRecords();
    var allNotes  = storage.loadNotes();
    var allProgress = storage.loadProgress ? storage.loadProgress() : [];
    var users     = storage.loadUsers();
    var students  = users.filter(function (u) { return u.role === 'student'; });

    /* Catalog books = facilitator-approved (matches homepage + dashboard count) */
    var facBooks  = allRecs.filter(function (r) { return r.addedByFacilitator && r.approved; });
    var rec       = facBooks.filter(function (r) { return r.recommended; });

    /* Average pages of catalog books */
    var avgPages = facBooks.length > 0
      ? Math.round(facBooks.reduce(function (s, r) { return s + (Number(r.pages) || 0); }, 0) / facBooks.length)
      : 0;

    /* Top tag across catalog */
    var tagCounts = {};
    facBooks.forEach(function (r) { if (r.tag) tagCounts[r.tag] = (tagCounts[r.tag] || 0) + 1; });
    var topTag = Object.keys(tagCounts).sort(function (a, b) { return tagCounts[b] - tagCounts[a]; })[0] || '—';

    /* Notes written by students */
    var stuIds   = students.map(function (s) { return s.id; });
    var stuNotes = allNotes.filter(function (n) { return stuIds.indexOf(n.userId) !== -1; });

    /* Student reading completions and active readers (from progress data) */
    var stuProgress   = allProgress.filter(function (p) { return stuIds.indexOf(p.userId) !== -1; });
    var completions   = stuProgress.filter(function (p) { return p.completed; }).length;
    var activeReaders = stuProgress.filter(function (p) { return p.percent > 0 && !p.completed; }).length;

    function set(id, v) { var e = el(id); if (e) e.textContent = v; }
    set('fac-stat-total',    facBooks.length);
    set('fac-stat-done',     completions);
    set('fac-stat-avgpages', avgPages || '—');
    set('fac-stat-rec',      rec.length);
    set('fac-stat-students', students.length);
    set('fac-stat-top-tag',  topTag);
    set('fac-stat-notes',    stuNotes.length);
    set('fac-stat-active',   activeReaders);

    var subtitle = el('fac-subtitle');
    if (subtitle) subtitle.textContent = students.length + ' students · ' + facBooks.length + ' catalog books · ' + stuNotes.length + ' notes';

    renderTagChart(allRecs);
    renderHealthGrid(allRecs, students);
    announce('Overview updated. ' + allRecs.length + ' total resources.');
  }

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

  function renderHealthGrid(allRecs, students) {
    var gridEl = el('fac-health-grid');
    if (!gridEl) return;
    if (students.length === 0) { gridEl.innerHTML = '<p class="empty-state" style="padding:1rem">No students yet.</p>'; return; }
    gridEl.innerHTML = students.map(function (stu) {
      var stuRecs = allRecs.filter(function (r) { return r.userId === stu.id; });
      var done    = stuRecs.filter(function (r) { return r.status === 'finished'; }).length;
      var cls     = done > 5 ? 'health--high' : done > 2 ? 'health--mid' : 'health--low';
      return '<div class="health-cell ' + cls + '" title="' + escHtml(stu.name) + ' · ' + done + ' finished">' +
        '<span class="health-cell__name">' + escHtml(auth.initials(stu.name)) + '</span>' +
        '<span class="health-cell__count">' + stuRecs.length + '</span>' +
      '</div>';
    }).join('');
  }

  /* ── Pending Approvals page — tabbed ────────────────────────── */
  var currentApprovalsTab = 'notes';

  function refreshApprovals() {
    updateAllApprovalBadges();
    if (currentApprovalsTab === 'notes')    renderNotesApprovals();
    if (currentApprovalsTab === 'requests') renderRequestsApprovals();
    if (currentApprovalsTab === 'books')    renderBooksApprovals();
  }

  /* Wire tab buttons */
  document.querySelectorAll('.approvals-tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.approvals-tab').forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      currentApprovalsTab = btn.dataset.tab;
      var panels = ['approvals-notes', 'approvals-requests', 'approvals-books'];
      panels.forEach(function (pid) {
        var p = el(pid);
        if (p) p.hidden = (pid !== 'approvals-' + currentApprovalsTab);
      });
      refreshApprovals();
    });
  });

  function updateAllApprovalBadges() {
    var allNotes    = storage.loadNotes();
    var allReqs     = storage.loadRequests ? storage.loadRequests() : [];
    var allRecs     = storage.loadRecords();
    var pendingNotes = allNotes.filter(function (n) { return (n.status || 'pending') === 'pending'; });
    var pendingReqs  = allReqs.filter(function (r) { return r.status === 'pending'; });
    var pendingBooks = allRecs.filter(function (r) { return !r.approved && !r.rejectedReason && !r.addedByFacilitator; });
    var totalPending = pendingNotes.length + pendingReqs.length + pendingBooks.length;

    function setBadge(id, count) {
      var b = el(id);
      if (!b) return;
      b.textContent = count;
      b.style.display = count > 0 ? 'inline-flex' : 'none';
    }
    setBadge('notes-pending-badge',  pendingNotes.length);
    setBadge('req-pending-badge',    pendingReqs.length);
    setBadge('books-pending-badge',  pendingBooks.length);
    setBadge('pending-badge',        totalPending);
  }

  /* ── Tab: Student Notes ──────────────────────────────────────── */
  function renderNotesApprovals() {
    var allNotes = storage.loadNotes();
    var users    = storage.loadUsers();
    var allRecs  = storage.loadRecords();
    var pending  = allNotes.filter(function (n) { return (n.status || 'pending') === 'pending'; });
    var reviewed = allNotes.filter(function (n) { return n.status === 'approved' || n.status === 'rejected'; });
    var container = el('approvals-notes');
    if (!container) return;

    if (pending.length === 0 && reviewed.length === 0) {
      container.innerHTML = '<div class="empty-state" style="padding:2rem"><p>No notes to review yet.</p></div>';
      return;
    }

    function buildNoteCard(n, dim) {
      var user = users.find(function (u) { return u.id === n.userId; }) || {};
      var book = allRecs.find(function (r) { return r.id === n.bookId; });
      var date = new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      var noteStatus = n.status || 'pending';
      var statusLabels = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };
      return '<div class="pending-card' + (dim ? '" style="opacity:.8' : '') + '">' +
        '<div class="pending-card__header">' +
          '<div style="flex:1;min-width:0">' +
            '<h3 class="pending-card__title" style="font-size:.9rem">' + escHtml(user.name || 'Unknown') + '</h3>' +
            (book ? '<p class="pending-card__author">On: <em>' + escHtml(book.title) + '</em></p>' : '<p class="pending-card__author">Freestanding note</p>') +
            '<p style="font-size:.8rem;color:var(--text-muted);margin-top:.2rem">' + date + '</p>' +
          '</div>' +
          (!dim
            ? '<div class="pending-card__actions">' +
                '<button class="btn btn--sm btn--primary note-review-btn" data-nid="' + escHtml(n.id) + '">Review</button>' +
              '</div>'
            : '<span class="note-status-badge note-status--' + noteStatus + '" style="flex-shrink:0">' + statusLabels[noteStatus] + '</span>') +
        '</div>' +
        '<p style="font-size:.875rem;color:var(--text);background:var(--bg-offset);border-radius:var(--radius);padding:.65rem .9rem;margin-top:.5rem;line-height:1.6;border-left:3px solid var(--primary-mid)">' +
          escHtml(n.content.slice(0, 300)) + (n.content.length > 300 ? '…' : '') +
        '</p>' +
        (n.facilComment ? '<p style="font-size:.8rem;color:var(--text-muted);font-style:italic;margin-top:.4rem;padding-left:.5rem">Facilitator: "' + escHtml(n.facilComment) + '"</p>' : '') +
      '</div>';
    }

    var html = '';
    if (pending.length > 0) {
      html += '<h2 style="font-family:var(--font-serif);font-size:1.1rem;margin-bottom:.85rem;color:var(--primary)">Awaiting Review (' + pending.length + ')</h2>';
      html += pending.map(function (n) { return buildNoteCard(n, false); }).join('');
    }
    if (reviewed.length > 0) {
      html += '<h2 style="font-family:var(--font-serif);font-size:1.1rem;margin:1.5rem 0 .85rem;color:var(--primary)">Previously Reviewed (' + reviewed.length + ')</h2>';
      html += reviewed.map(function (n) { return buildNoteCard(n, true); }).join('');
    }

    container.innerHTML = html;

    container.querySelectorAll('.note-review-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { openNoteReviewModal(btn.dataset.nid); });
    });
  }

  /* ── Tab: Book Requests ──────────────────────────────────────── */
  function renderRequestsApprovals() {
    var allReqs  = storage.loadRequests ? storage.loadRequests() : [];
    var users    = storage.loadUsers();
    var container = el('approvals-requests');
    if (!container) return;

    var pending  = allReqs.filter(function (r) { return r.status === 'pending'; });
    var resolved = allReqs.filter(function (r) { return r.status !== 'pending'; });

    if (pending.length === 0 && resolved.length === 0) {
      container.innerHTML = '<div class="empty-state" style="padding:2rem"><p>No book access requests yet.</p></div>';
      return;
    }

    function buildReqCard(req, dim) {
      var user = users.find(function (u) { return u.id === req.userId; }) || {};
      var date = new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return '<div class="request-card' + (dim ? '" style="opacity:.8' : '') + '">' +
        '<div class="request-card__info">' +
          '<p class="request-card__title">PDF Request: ' + escHtml(req.bookTitle || '—') + '</p>' +
          '<p class="request-card__student">From: <strong>' + escHtml(user.name || 'Unknown') + '</strong> · ' + escHtml(user.class || '') + '</p>' +
          '<p class="request-card__date">' + date + (req.facilComment ? ' · "' + escHtml(req.facilComment) + '"' : '') + '</p>' +
        '</div>' +
        (!dim
          ? '<div class="request-card__actions">' +
              '<button class="btn btn--sm btn--primary approve-req-btn" data-rid="' + escHtml(req.id) + '">Approve</button>' +
              '<button class="btn btn--sm btn--danger reject-req-btn" data-rid="' + escHtml(req.id) + '">Decline</button>' +
            '</div>'
          : '<span class="note-status-badge note-status--' + escHtml(req.status) + '" style="flex-shrink:0">' + (req.status === 'approved' ? 'Approved' : 'Declined') + '</span>') +
      '</div>';
    }

    var html = '';
    if (pending.length > 0) {
      html += '<h2 style="font-family:var(--font-serif);font-size:1.1rem;margin-bottom:.85rem;color:var(--primary)">Pending Requests (' + pending.length + ')</h2>';
      html += pending.map(function (r) { return buildReqCard(r, false); }).join('');
    }
    if (resolved.length > 0) {
      html += '<h2 style="font-family:var(--font-serif);font-size:1.1rem;margin:1.5rem 0 .85rem;color:var(--primary)">Resolved (' + resolved.length + ')</h2>';
      html += resolved.map(function (r) { return buildReqCard(r, true); }).join('');
    }

    container.innerHTML = html;

    container.querySelectorAll('.approve-req-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openConfirm('Approve this PDF access request?', function () {
          var reqs = storage.loadRequests();
          var idx  = reqs.findIndex(function (r) { return r.id === btn.dataset.rid; });
          if (idx !== -1) { reqs[idx].status = 'approved'; reqs[idx].facilComment = 'PDF access approved — book will be updated soon.'; }
          storage.saveRequests(reqs);
          toast('Request approved.');
          updateAllApprovalBadges();
          renderRequestsApprovals();
        });
      });
    });

    container.querySelectorAll('.reject-req-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openConfirm('Decline this PDF access request?', function () {
          var reqs = storage.loadRequests();
          var idx  = reqs.findIndex(function (r) { return r.id === btn.dataset.rid; });
          if (idx !== -1) { reqs[idx].status = 'rejected'; reqs[idx].facilComment = 'PDF not currently available for this title.'; }
          storage.saveRequests(reqs);
          toast('Request declined.');
          updateAllApprovalBadges();
          renderRequestsApprovals();
        });
      });
    });
  }

  /* ── Tab: Book Submissions ───────────────────────────────────── */
  function renderBooksApprovals() {
    var allRecs  = storage.loadRecords();
    var users    = storage.loadUsers();
    var pending  = allRecs.filter(function (r) { return !r.approved && !r.rejectedReason && !r.addedByFacilitator; });
    var rejected = allRecs.filter(function (r) { return !r.approved && r.rejectedReason; });
    var container = el('approvals-books');
    if (!container) return;

    if (pending.length === 0 && rejected.length === 0) {
      container.innerHTML = '<div class="empty-state" style="padding:2rem"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg><h3>All clear!</h3><p>No book submissions awaiting review.</p></div>';
      return;
    }

    var html = '';
    if (pending.length > 0) {
      html += '<h2 style="font-family:var(--font-serif);font-size:1.1rem;margin-bottom:.85rem;color:var(--primary)">Awaiting Review (' + pending.length + ')</h2>';
      html += pending.map(function (r) {
        var user = users.find(function (u) { return u.id === r.userId; }) || {};
        return '<div class="pending-card" data-id="' + escHtml(r.id) + '">' +
          '<div class="pending-card__header">' +
            '<div>' +
              '<h3 class="pending-card__title">' + escHtml(r.title) + '</h3>' +
              '<p class="pending-card__author">' + escHtml(r.author || '—') + '</p>' +
            '</div>' +
            '<div class="pending-card__actions">' +
              '<button class="btn btn--sm btn--primary approve-book-btn" data-id="' + escHtml(r.id) + '">Approve</button>' +
              '<button class="btn btn--sm btn--danger reject-book-btn" data-id="' + escHtml(r.id) + '">Reject</button>' +
            '</div>' +
          '</div>' +
          '<div class="pending-card__meta">' +
            (r.tag ? '<span>' + escHtml(r.tag) + '</span>' : '') +
            (r.dateAdded ? '<span>' + escHtml(r.dateAdded) + '</span>' : '') +
          '</div>' +
          (r.description ? '<p class="pending-card__desc">' + escHtml(r.description.slice(0, 200)) + (r.description.length > 200 ? '…' : '') + '</p>' : '') +
          '<p class="pending-card__submitter">Submitted by: <strong>' + escHtml(user.name || 'Unknown') + '</strong></p>' +
        '</div>';
      }).join('');
    }
    if (rejected.length > 0) {
      html += '<h2 style="font-family:var(--font-serif);font-size:1.1rem;margin:1.5rem 0 .85rem;color:var(--primary)">Previously Rejected (' + rejected.length + ')</h2>';
      html += rejected.map(function (r) {
        var user = users.find(function (u) { return u.id === r.userId; }) || {};
        return '<div class="pending-card" style="opacity:.8">' +
          '<div class="pending-card__header">' +
            '<div>' +
              '<h3 class="pending-card__title">' + escHtml(r.title) + '</h3>' +
              '<p class="pending-card__author">' + escHtml(r.author || '—') + ' · ' + escHtml(user.name || 'Unknown') + '</p>' +
            '</div>' +
            '<div class="pending-card__actions">' +
              '<button class="btn btn--sm btn--outline approve-book-btn" data-id="' + escHtml(r.id) + '">Approve instead</button>' +
            '</div>' +
          '</div>' +
          '<p style="font-size:.82rem;color:var(--red);font-style:italic;padding:.35rem 0">Rejected: "' + escHtml(r.rejectedReason) + '"</p>' +
        '</div>';
      }).join('');
    }

    container.innerHTML = html;
    container.querySelectorAll('.approve-book-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openConfirm('Approve and publish this book?', function () {
          storage.approveRecord(btn.dataset.id, userId);
          toast('Book approved and published to the catalog.');
          updateAllApprovalBadges();
          renderBooksApprovals();
        });
      });
    });
    container.querySelectorAll('.reject-book-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { openRejectModal(btn.dataset.id); });
    });
  }

  /* ── Note Review Modal ───────────────────────────────────────── */
  var noteReviewModal = el('note-review-modal');

  function openNoteReviewModal(noteId) {
    var allNotes = storage.loadNotes();
    var users    = storage.loadUsers();
    var allRecs  = storage.loadRecords();
    var note     = allNotes.find(function (n) { return n.id === noteId; });
    if (!note || !noteReviewModal) return;
    var user = users.find(function (u) { return u.id === note.userId; }) || {};
    var book = allRecs.find(function (r) { return r.id === note.bookId; });
    el('nr-note-id').value        = noteId;
    el('note-review-meta').textContent    = (user.name || 'Unknown') + (book ? ' — ' + book.title : ' — Freestanding note');
    el('note-review-content').textContent = note.content;
    el('nr-comment').value        = '';
    el('nr-comment-err').textContent = '';
    noteReviewModal.hidden = false;
    el('nr-comment').focus();
    document.body.style.overflow = 'hidden';
  }

  function closeNoteReviewModal() {
    if (noteReviewModal) noteReviewModal.hidden = true;
    document.body.style.overflow = '';
  }

  el('note-review-close') && el('note-review-close').addEventListener('click', closeNoteReviewModal);
  el('nr-cancel-btn')     && el('nr-cancel-btn').addEventListener('click', closeNoteReviewModal);
  if (noteReviewModal) noteReviewModal.addEventListener('click', function (e) { if (e.target === noteReviewModal) closeNoteReviewModal(); });

  function submitNoteReview(action) {
    var comment = (el('nr-comment').value || '').trim();
    var noteId  = el('nr-note-id').value;
    var errEl   = el('nr-comment-err');
    if (!comment) { if (errEl) errEl.textContent = 'Please add a comment for the student.'; return; }
    if (errEl) errEl.textContent = '';

    var allNotes = storage.loadNotes();
    var idx = allNotes.findIndex(function (n) { return n.id === noteId; });
    if (idx === -1) { toast('Note not found.', 'error'); return; }
    allNotes[idx].status       = action; /* 'approved' or 'rejected' */
    allNotes[idx].facilComment = comment;
    allNotes[idx].approvedBy   = userId;
    allNotes[idx].approvedAt   = new Date().toISOString();
    storage.saveNotes(allNotes);
    toast('Note ' + (action === 'approved' ? 'approved' : 'rejected') + '.');
    closeNoteReviewModal();
    updateAllApprovalBadges();
    renderNotesApprovals();
  }

  el('nr-approve-btn') && el('nr-approve-btn').addEventListener('click', function () { submitNoteReview('approved'); });
  el('nr-reject-btn')  && el('nr-reject-btn').addEventListener('click',  function () { submitNoteReview('rejected'); });

  /* ── Reject modal (book submissions) ────────────────────────── */
  var rejectModal = el('reject-modal');

  function openRejectModal(recordId) {
    if (!rejectModal) {
      var reason = window.prompt('Enter rejection reason:');
      if (reason) { storage.rejectRecord(recordId, reason); toast('Submission rejected.'); renderBooksApprovals(); }
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

  el('reject-modal-close')  && el('reject-modal-close').addEventListener('click', closeRejectModal);
  el('reject-cancel-btn')   && el('reject-cancel-btn').addEventListener('click', closeRejectModal);
  if (rejectModal) rejectModal.addEventListener('click', function (e) { if (e.target === rejectModal) closeRejectModal(); });

  el('reject-confirm-btn') && el('reject-confirm-btn').addEventListener('click', function () {
    var reason   = el('reject-reason').value.trim();
    var recordId = el('reject-record-id').value;
    var errEl    = el('reject-reason-err');
    if (!reason) { if (errEl) errEl.textContent = 'Please enter a rejection reason.'; return; }
    if (errEl) errEl.textContent = '';
    storage.rejectRecord(recordId, reason);
    toast('Submission rejected.');
    closeRejectModal();
    updateAllApprovalBadges();
    renderBooksApprovals();
  });

  /* Update the pending badge on page load */
  (function updatePendingBadge() {
    updateAllApprovalBadges();
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
          return '<div class="student-card" data-uid="' + escHtml(stu.id) + '">' +
            '<div class="student-card__main" role="button" tabindex="0" aria-label="View ' + escHtml(stu.name) + '">' +
              '<div class="student-card__avatar">' + escHtml(auth.initials(stu.name)) + '</div>' +
              '<div class="student-card__name">' + escHtml(stu.name) + '</div>' +
              '<div class="student-card__mission">' + escHtml(stu.mission || '—') + '</div>' +
              '<div class="student-card__stats">' +
                '<span>' + stuRecs.length + ' total</span>' +
                '<span>' + done + ' finished</span>' +
              '</div>' +
            '</div>' +
            '<div class="student-card__actions">' +
              '<button class="btn btn--xs btn--outline stu-edit-btn" data-uid="' + escHtml(stu.id) + '" aria-label="Edit ' + escHtml(stu.name) + '">Edit</button>' +
              '<button class="btn btn--xs btn--danger stu-del-btn" data-uid="' + escHtml(stu.id) + '" aria-label="Delete ' + escHtml(stu.name) + '">Delete</button>' +
            '</div>' +
          '</div>';
        }).join('') +
        '</div>' +
      '</section>';
    }).join('');

    container.querySelectorAll('.student-card__main').forEach(function (main) {
      var card = main.closest('.student-card');
      function open() { showStudentDetail(card.dataset.uid); }
      main.addEventListener('click', open);
      main.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });

    container.querySelectorAll('.stu-edit-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openStudentEditModal(btn.dataset.uid);
      });
    });

    container.querySelectorAll('.stu-del-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var uid  = btn.dataset.uid;
        var user = auth.getUserById(uid);
        if (!user) return;
        openConfirm('Delete student "' + user.name + '"? This cannot be undone.', function () {
          deleteStudent(uid);
        });
      });
    });
  }

  function deleteStudent(uid) {
    var users = storage.loadUsers().filter(function (u) { return u.id !== uid; });
    storage.saveUsers(users);
    /* Also remove their notes and progress */
    var notes = storage.loadNotes().filter(function (n) { return n.userId !== uid; });
    storage.saveNotes(notes);
    toast('Student removed.');
    refreshStudents();
    announce('Student deleted.');
  }

  function showStudentDetail(uid) {
    var allRecs     = storage.loadRecords();
    var allNotes    = storage.loadNotes ? storage.loadNotes() : [];
    var allProgress = storage.loadProgress ? storage.loadProgress() : [];
    var user        = auth.getUserById(uid);
    if (!user) return;

    selectedStudentId = uid;
    var stuRecs  = allRecs.filter(function (r) { return r.userId === uid; });
    var done     = stuRecs.filter(function (r) { return r.status === 'finished'; });
    var reading  = stuRecs.filter(function (r) { return r.status === 'reading'; });
    var facBooks = allRecs.filter(function (r) { return r.addedByFacilitator && r.approved; });

    var detailContent = el('student-detail-content');
    if (detailContent) {
      detailContent.innerHTML =
        '<div class="student-detail__header">' +
          '<div class="student-detail__avatar">' + escHtml(auth.initials(user.name)) + '</div>' +
          '<div>' +
            '<div class="student-detail__name">' + escHtml(user.name) + '</div>' +
            '<div class="student-detail__class">' + escHtml(user.class || '') + (user.email ? ' · ' + escHtml(user.email) : '') + '</div>' +
            (user.mission ? '<div class="student-detail__mission"><strong>Study Focus:</strong> ' + escHtml(user.mission) + '</div>' : '') +
            (user.missionDesc ? '<div class="student-detail__mission" style="font-style:italic;margin-top:.25rem">' + escHtml(user.missionDesc) + '</div>' : '') +
          '</div>' +
        '</div>' +
        '<div class="student-detail__stats">' +
          '<span>' + stuRecs.length + ' library entries</span>' +
          '<span>' + done.length + ' finished</span>' +
          '<span>' + reading.length + ' reading</span>' +
        '</div>';
    }

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

    var progSection = el('stu-reading-progress');
    if (progSection) {
      var progEntries = allProgress.filter(function (p) { return p.userId === uid; });
      if (facBooks.length === 0) {
        progSection.innerHTML = '<p style="color:var(--muted);font-size:.875rem">No facilitator books available yet.</p>';
      } else {
        progSection.innerHTML = facBooks.map(function (book) {
          var prog = progEntries.find(function (p) { return p.bookId === book.id; });
          var pct  = prog ? Math.min(100, Math.round(prog.percent || 0)) : 0;
          var statusLabel = prog
            ? (prog.completed ? 'Completed' : 'In Progress — page ' + (prog.currentPage || 0) + ' of ' + (prog.totalPages || book.pages || '?'))
            : 'Not started';
          return '<div style="margin-bottom:1rem">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.3rem">' +
              '<span style="font-size:.875rem;font-weight:600">' + escHtml(book.title) + '</span>' +
              '<span style="font-size:.8rem;color:var(--muted)">' + pct + '%</span>' +
            '</div>' +
            '<div class="bk-progress bk-progress--track" style="margin:0">' +
              '<div class="bk-progress__fill" style="width:' + pct + '%"></div>' +
            '</div>' +
            '<div style="font-size:.78rem;color:var(--muted);margin-top:.2rem">' + escHtml(statusLabel) + '</div>' +
          '</div>';
        }).join('');
      }
    }

    var notesSection = el('stu-book-notes');
    if (notesSection) {
      var stuNotes = allNotes.filter(function (n) { return n.userId === uid; });
      if (stuNotes.length === 0) {
        notesSection.innerHTML = '<p style="color:var(--muted);font-size:.875rem">This student has not added any notes yet.</p>';
      } else {
        var notesByBook = {};
        stuNotes.forEach(function (n) {
          if (!notesByBook[n.bookId]) notesByBook[n.bookId] = [];
          notesByBook[n.bookId].push(n);
        });
        notesSection.innerHTML = Object.keys(notesByBook).map(function (bookId) {
          var book = allRecs.find(function (r) { return r.id === bookId; });
          var bookTitle = book ? book.title : 'Unknown Book';
          return '<div style="margin-bottom:1.25rem">' +
            '<h4 style="font-family:var(--font-serif);font-size:.95rem;color:var(--primary);margin-bottom:.5rem">' + escHtml(bookTitle) + '</h4>' +
            notesByBook[bookId].map(function (n) {
              return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:.6rem .8rem;margin-bottom:.4rem;font-size:.85rem">' +
                '<p style="margin:0 0 .3rem">' + escHtml(n.content || n.text || n.note || '') + '</p>' +
                (n.page ? '<span style="font-size:.75rem;color:var(--muted)">Page ' + escHtml(String(n.page)) + '</span>' : '') +
                (n.createdAt ? '<span style="font-size:.75rem;color:var(--muted);float:right">' + escHtml(n.createdAt.slice(0, 10)) + '</span>' : '') +
              '</div>';
            }).join('') +
          '</div>';
        }).join('');
      }
    }

    el('student-detail').hidden = false;
    el('student-back-btn').focus();
  }

  el('student-back-btn') && el('student-back-btn').addEventListener('click', function () {
    el('student-detail').hidden = true;
    selectedStudentId = null;
  });

  /* ── Student Edit Modal ──────────────────────────────────────── */
  var studentEditModal = el('student-edit-modal');

  function openStudentEditModal(uid) {
    var user = auth.getUserById(uid);
    if (!user || !studentEditModal) return;
    el('se-id').value      = uid;
    el('se-name').value    = user.name  || '';
    el('se-class').value   = user.class || '';
    el('se-mission').value = user.mission || '';
    el('se-bio').value     = user.bio   || '';
    var err = el('student-edit-err');
    if (err) err.textContent = '';
    var nameErr = el('se-name-err');
    if (nameErr) nameErr.textContent = '';
    el('student-edit-title').textContent = 'Edit Student — ' + user.name;
    studentEditModal.hidden = false;
    el('se-name').focus();
    document.body.style.overflow = 'hidden';
  }

  function closeStudentEditModal() {
    if (studentEditModal) studentEditModal.hidden = true;
    document.body.style.overflow = '';
  }

  el('student-edit-close')  && el('student-edit-close').addEventListener('click',  closeStudentEditModal);
  el('student-edit-cancel') && el('student-edit-cancel').addEventListener('click', closeStudentEditModal);
  if (studentEditModal) studentEditModal.addEventListener('click', function (e) { if (e.target === studentEditModal) closeStudentEditModal(); });

  el('student-edit-form') && el('student-edit-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var uid  = el('se-id').value;
    var name = el('se-name').value.trim();
    var nameErr = el('se-name-err');
    if (!name) { if (nameErr) nameErr.textContent = 'Name is required.'; return; }
    if (nameErr) nameErr.textContent = '';

    var users = storage.loadUsers();
    var idx   = users.findIndex(function (u) { return u.id === uid; });
    if (idx === -1) { toast('Student not found.', 'error'); return; }

    users[idx].name      = name;
    users[idx].class     = el('se-class').value   || users[idx].class   || '';
    users[idx].mission   = el('se-mission').value.trim() || '';
    users[idx].bio       = el('se-bio').value.trim()     || '';
    users[idx].updatedAt = new Date().toISOString();
    storage.saveUsers(users);

    toast('Student "' + name + '" updated.');
    closeStudentEditModal();
    refreshStudents();
    announce('Student updated.');
  });

  /* ── Class Library page ──────────────────────────────────────── */
  var adminQuery = '', adminTag = '', adminSort = 'dateAdded-desc';

  function refreshAdminLibrary() {
    populateAdminTagFilter();
    renderAdminTable();
  }

  function populateAdminTagFilter() {
    var sel = el('admin-filter-tag');
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
    var result  = search.filterAndSort(allRecs, {
      query: adminQuery, caseInsensitive: true,
      tag: adminTag, sortBy: adminSort
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
        hintEl.style.color = 'var(--primary-light)';
      } else { hintEl.textContent = ''; }
    }

    if (countEl) countEl.textContent = result.filtered.length + ' of ' + allRecs.length + ' resources';
    if (emptyEl) emptyEl.hidden = result.filtered.length > 0;
    if (!tbody)  return;

    tbody.innerHTML = result.filtered.map(function (r) {
      var title = validators.highlight(r.title, result.re);
      var srcLabel = r.addedByFacilitator ? '<span style="font-size:.7rem;color:var(--primary);font-weight:600">FAC</span>' : '';
      return '<tr>' +
        '<td class="col-spine"><div class="spine-dot spine-dot--' + escHtml(r.status || 'want') + '"></div></td>' +
        '<td>' + title + ' ' + srcLabel + '</td>' +
        '<td>' + escHtml(r.author) + '</td>' +
        '<td><span class="book-card__tag" style="font-size:.7rem;padding:.2rem .5rem">' + escHtml(r.tag || '') + '</span></td>' +
        '<td style="text-align:center">' + (r.recommended ? '★' : '') + '</td>' +
        '<td class="admin-actions-cell">' +
          '<button class="btn btn--xs btn--ghost admin-view-btn" data-id="' + escHtml(r.id) + '" aria-label="View ' + escHtml(r.title) + '">View</button>' +
          '<button class="btn btn--xs btn--outline admin-edit-btn" data-id="' + escHtml(r.id) + '" aria-label="Edit ' + escHtml(r.title) + '">Edit</button>' +
          '<button class="btn btn--xs btn--danger admin-del-btn" data-id="' + escHtml(r.id) + '" aria-label="Delete ' + escHtml(r.title) + '">Delete</button>' +
        '</td>' +
      '</tr>';
    }).join('');

    tbody.querySelectorAll('.admin-view-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var rec = storage.loadRecords().find(function (r) { return r.id === btn.dataset.id; });
        if (rec) openViewModal(rec);
      });
    });

    tbody.querySelectorAll('.admin-edit-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var rec = storage.loadRecords().find(function (r) { return r.id === btn.dataset.id; });
        if (rec) openBookFormModal(rec);
      });
    });

    tbody.querySelectorAll('.admin-del-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id  = btn.dataset.id;
        var rec = storage.loadRecords().find(function (r) { return r.id === id; });
        if (!rec) return;
        openConfirm('Delete "' + rec.title + '"? This cannot be undone.', function () {
          deleteBook(id);
        });
      });
    });
  }

  function deleteBook(id) {
    var recs = storage.loadRecords().filter(function (r) { return r.id !== id; });
    storage.saveRecords(recs);
    /* Remove progress entries for this book */
    var progress = (storage.loadProgress ? storage.loadProgress() : []).filter(function (p) { return p.bookId !== id; });
    if (storage.saveProgress) storage.saveProgress(progress);
    toast('Book deleted.');
    renderAdminTable();
    announce('Book deleted.');
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
  var adminFilterTag = el('admin-filter-tag');
  if (adminFilterTag) adminFilterTag.addEventListener('change', function () { adminTag = adminFilterTag.value; renderAdminTable(); });
  var adminSortEl = el('admin-sort');
  if (adminSortEl) adminSortEl.addEventListener('change', function () { adminSort = adminSortEl.value; renderAdminTable(); });
  var adminClearBtn = el('admin-clear-filters');
  if (adminClearBtn) {
    adminClearBtn.addEventListener('click', function () {
      adminQuery = ''; adminTag = ''; adminSort = 'dateAdded-desc';
      if (adminSearchEl) adminSearchEl.value = '';
      if (adminFilterTag) adminFilterTag.value = '';
      if (adminSortEl) adminSortEl.value = 'dateAdded-desc';
      renderAdminTable();
    });
  }

  /* Add Book button */
  el('add-book-btn') && el('add-book-btn').addEventListener('click', function () {
    openBookFormModal(null);
  });

  /* Admin export/import JSON */
  el('admin-export-btn') && el('admin-export-btn').addEventListener('click', function () {
    var recs = storage.loadRecords();
    var blob = new Blob([JSON.stringify(recs, null, 2)], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url;
    a.download = 'alusource-library-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    toast('Exported ' + recs.length + ' records.');
  });

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

  /* ── Book Form Modal (Add / Edit) ────────────────────────────── */
  var bookFormModal = el('book-form-modal');

  function openBookFormModal(rec) {
    if (!bookFormModal) return;
    var isEdit = !!rec;
    el('book-form-title').textContent = isEdit ? 'Edit Book — ' + rec.title : 'Add Book';
    el('book-form-submit').textContent = isEdit ? 'Save Changes' : 'Publish Book';
    el('bf-id').value      = isEdit ? rec.id          : '';
    el('bf-title').value   = isEdit ? (rec.title  || '') : '';
    el('bf-author').value  = isEdit ? (rec.author || '') : '';
    el('bf-pages').value   = isEdit ? (rec.pages  || '') : '';
    el('bf-tag').value     = isEdit ? (rec.tag    || '') : '';
    el('bf-summary').value = isEdit ? (rec.description || '') : '';
    el('bf-cover').value   = isEdit ? (rec.coverUrl || '') : '';
    el('bf-pdf').value     = isEdit ? (rec.pdfUrl  || '') : '';
    el('bf-isbn').value    = isEdit ? (rec.isbn    || '') : '';
    el('bf-recommended').checked = isEdit ? !!rec.recommended : false;

    /* Cover preview */
    var prevEl = el('bf-cover-preview');
    var imgEl  = el('bf-cover-img');
    if (prevEl && imgEl) {
      if (rec && rec.coverUrl) {
        imgEl.src = rec.coverUrl;
        prevEl.style.display = 'block';
      } else {
        prevEl.style.display = 'none';
      }
    }

    /* Clear errors */
    ['bf-title-err','bf-author-err','bf-pages-err','bf-tag-err','bf-summary-err','book-form-err'].forEach(function (id) {
      var e = el(id); if (e) e.textContent = '';
    });

    bookFormModal.hidden = false;
    el('bf-title').focus();
    document.body.style.overflow = 'hidden';
  }

  function closeBookFormModal() {
    if (bookFormModal) bookFormModal.hidden = true;
    document.body.style.overflow = '';
  }

  el('book-form-close')  && el('book-form-close').addEventListener('click',  closeBookFormModal);
  el('book-form-cancel') && el('book-form-cancel').addEventListener('click', closeBookFormModal);
  if (bookFormModal) bookFormModal.addEventListener('click', function (e) { if (e.target === bookFormModal) closeBookFormModal(); });

  /* Live cover preview inside book form modal */
  el('bf-cover') && el('bf-cover').addEventListener('input', function () {
    var url = el('bf-cover').value.trim();
    var prevEl = el('bf-cover-preview');
    var imgEl  = el('bf-cover-img');
    if (url && prevEl && imgEl) {
      imgEl.src = url;
      prevEl.style.display = 'block';
    } else if (prevEl) {
      prevEl.style.display = 'none';
    }
  });

  el('book-form') && el('book-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var valid = true;

    function fieldErr(errId, msg) {
      var err = el(errId); if (err) err.textContent = msg;
      valid = false;
    }

    var titleVal   = el('bf-title').value.trim();
    var authorVal  = el('bf-author').value.trim();
    var pagesVal   = parseInt(el('bf-pages').value, 10);
    var tagVal     = el('bf-tag').value.trim();
    var summaryVal = el('bf-summary').value.trim();

    if (!titleVal)                            fieldErr('bf-title-err',   'Title is required.');
    if (!authorVal)                           fieldErr('bf-author-err',  'Author is required.');
    if (!el('bf-pages').value.trim() || isNaN(pagesVal) || pagesVal < 1)
                                              fieldErr('bf-pages-err',   'Enter a valid page count.');
    if (!tagVal)                              fieldErr('bf-tag-err',     'Topic / Tag is required.');
    if (!summaryVal)                          fieldErr('bf-summary-err', 'Summary is required.');
    if (!valid) return;

    var existingId = el('bf-id').value;
    var recs = storage.loadRecords();

    if (existingId) {
      /* Edit existing */
      var idx = recs.findIndex(function (r) { return r.id === existingId; });
      if (idx === -1) { toast('Book not found.', 'error'); return; }
      recs[idx].title       = titleVal;
      recs[idx].author      = authorVal;
      recs[idx].pages       = pagesVal;
      recs[idx].tag         = tagVal;
      recs[idx].description = summaryVal;
      recs[idx].coverUrl    = el('bf-cover').value.trim() || recs[idx].coverUrl || '';
      recs[idx].coverColor  = TAG_COLORS[tagVal] || recs[idx].coverColor || randomColor();
      recs[idx].pdfUrl      = el('bf-pdf').value.trim() || '';
      recs[idx].isbn        = el('bf-isbn').value.trim() || '';
      recs[idx].recommended = el('bf-recommended').checked;
      recs[idx].updatedAt   = new Date().toISOString();
      storage.saveRecords(recs);
      toast('"' + titleVal + '" updated.');
    } else {
      /* Add new */
      var newRec = {
        id:                 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        userId:             userId,
        title:              titleVal,
        author:             authorVal,
        pages:              pagesVal,
        tag:                tagVal,
        description:        summaryVal,
        coverUrl:           el('bf-cover').value.trim() || '',
        coverColor:         TAG_COLORS[tagVal] || randomColor(),
        pdfUrl:             el('bf-pdf').value.trim() || '',
        isbn:               el('bf-isbn').value.trim() || '',
        recommended:        el('bf-recommended').checked,
        status:             'finished',
        approved:           true,
        approvedBy:         userId,
        approvedAt:         new Date().toISOString(),
        addedByFacilitator: true,
        dateAdded:          new Date().toISOString().slice(0, 10),
        notes:              ''
      };
      recs.push(newRec);
      storage.saveRecords(recs);
      toast('"' + titleVal + '" published to the catalog.');
    }

    closeBookFormModal();
    renderAdminTable();
    announce((existingId ? 'Book updated: ' : 'Book added: ') + titleVal);
  });

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
    var days   = search.computeCompletionsByDay(recs, 30);
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

  el('export-csv-btn') && el('export-csv-btn').addEventListener('click', function () {
    var recs  = storage.loadRecords();
    var users = storage.loadUsers();
    function csvField(v) {
      var s = String(v == null ? '' : v);
      if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }
    var header = ['id','title','author','pages','status','tag','dateAdded','recommended','pdfUrl','studentName','studentEmail','class'];
    var rows   = [header.map(csvField).join(',')];
    recs.forEach(function (r) {
      var user = users.find(function (u) { return u.id === r.userId; }) || {};
      rows.push([r.id, r.title, r.author, r.pages, r.status, r.tag, r.dateAdded,
        r.recommended ? '1' : '0', r.pdfUrl || '', user.name || '', user.email || '', user.class || ''
      ].map(csvField).join(','));
    });
    var blob = new Blob([rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url;
    a.download = 'alusource-report-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV exported (' + recs.length + ' records).');
  });

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
      return '<button class="book-spine book-spine--' + escHtml(r.status || 'want') + '" data-id="' + escHtml(r.id) + '"' +
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
          (r.recommended ? ' checked' : '') + ' aria-label="Recommend ' + escHtml(r.title) + '" />' +
        '</td>' +
        '<td><button class="btn btn--xs btn--ghost rec-view-btn" data-id="' + escHtml(r.id) + '">View</button></td>' +
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
    set('view-author',      rec.author  || '—');
    set('view-pages',       (rec.pages  || '?') + ' pages');
    set('view-tag',         rec.tag     || '');
    set('view-date',        rec.dateAdded || '');

    var spineEl  = el('view-spine');
    if (spineEl) spineEl.className = 'view-modal__spine view-modal__spine--' + (rec.status || 'want');
    var statusEl = el('view-status');
    if (statusEl) {
      statusEl.textContent = STATUS_LABEL[rec.status] || rec.status || '';
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
    el('view-modal-close') && el('view-modal-close').focus();
    document.body.style.overflow = 'hidden';
  }

  function closeViewModal() {
    if (viewModal) viewModal.hidden = true;
    document.body.style.overflow = '';
  }

  el('view-modal-close') && el('view-modal-close').addEventListener('click', closeViewModal);
  el('view-close-btn')   && el('view-close-btn').addEventListener('click',   closeViewModal);
  if (viewModal) viewModal.addEventListener('click', function (e) { if (e.target === viewModal) closeViewModal(); });

  /* ── Confirm Modal ───────────────────────────────────────────── */
  var confirmOverlay = el('confirm-overlay');
  var confirmCb = null;

  function openConfirm(msg, onYes) {
    if (!confirmOverlay) { if (window.confirm(msg)) onYes(); return; }
    el('confirm-body').textContent = msg;
    confirmCb = onYes;
    confirmOverlay.hidden = false;
    el('confirm-yes') && el('confirm-yes').focus();
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
    if (bookFormModal     && !bookFormModal.hidden)     { closeBookFormModal();     return; }
    if (studentEditModal  && !studentEditModal.hidden)  { closeStudentEditModal();  return; }
    if (noteReviewModal   && !noteReviewModal.hidden)   { closeNoteReviewModal();   return; }
    if (rejectModal       && !rejectModal.hidden)       { closeRejectModal();       return; }
    if (viewModal         && !viewModal.hidden)         { closeViewModal();         return; }
    if (confirmOverlay    && !confirmOverlay.hidden)    { closeConfirm();           return; }
  });

  /* ── Initial render ──────────────────────────────────────────── */
  refreshOverview();

})(window.App = window.App || {});
