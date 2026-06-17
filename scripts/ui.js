/* scripts/ui.js — IIFE Module: all DOM rendering */
;(function (App) {
  'use strict';

  var STATUS_LABELS = { want: 'Want to Read', reading: 'Currently Reading', finished: 'Finished' };

  var ICONS = {
    eye:    svg('<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'),
    pencil: svg('<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>'),
    trash:  svg('<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>'),
  };

  function svg(paths) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" ' +
      'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true">' + paths + '</svg>';
  }

  function fmtDate(str) {
    if (!str) return '—';
    try {
      return new Date(str + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
    } catch (e) { return str; }
  }

  var toastTimer;

  App.ui = {

    /* ── Notifications ──────────────────────────────────────── */
    showToast: function (msg) {
      var el = document.getElementById('toast');
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2800);
    },

    announce: function (msg, assertive) {
      var el = document.getElementById(assertive ? 'live-assertive' : 'live-polite');
      el.textContent = '';
      requestAnimationFrame(function () { el.textContent = msg; });
    },

    /* ── Library Table ──────────────────────────────────────── */
    renderTable: function (records, re) {
      var tbody = document.getElementById('records-body');
      var empty = document.getElementById('table-empty');
      var count = document.getElementById('records-count');
      var hl    = App.validators.highlight;
      var esc   = App.validators.escapeHtml;

      tbody.innerHTML = '';
      count.textContent = records.length + ' resource' + (records.length !== 1 ? 's' : '');

      if (records.length === 0) { empty.hidden = false; return; }
      empty.hidden = true;

      var frag = document.createDocumentFragment();
      records.forEach(function (rec) {
        var tr = document.createElement('tr');
        tr.dataset.id = rec.id;
        var recBadge = rec.recommended
          ? '<span title="Recommended" style="color:var(--red);font-size:.7rem;margin-left:.3rem">★</span>'
          : '';
        tr.innerHTML =
          '<td class="col-spine"><span class="row-spine row-spine--' + rec.status + '" aria-hidden="true"></span></td>' +
          '<td class="col-title">' + hl(rec.title, re) + recBadge + '</td>' +
          '<td class="col-author">' + hl(rec.author, re) + '</td>' +
          '<td class="col-pages">' + Number(rec.pages).toLocaleString() + '</td>' +
          '<td class="col-tag">' + hl(rec.tag, re) + '</td>' +
          '<td class="col-status"><span class="status-badge status-badge--' + rec.status + '" ' +
            'aria-label="Status: ' + STATUS_LABELS[rec.status] + '">' +
            '<span class="status-dot" aria-hidden="true"></span>' + (STATUS_LABELS[rec.status] || rec.status) + '</span></td>' +
          '<td class="col-date">' + fmtDate(rec.dateAdded) + '</td>' +
          '<td class="col-actions"><div class="row-actions">' +
            '<button class="btn-icon" data-action="view"   data-id="' + esc(rec.id) + '" aria-label="View '   + esc(rec.title) + '" title="View">'   + ICONS.eye    + '</button>' +
            '<button class="btn-icon" data-action="edit"   data-id="' + esc(rec.id) + '" aria-label="Edit '   + esc(rec.title) + '" title="Edit">'   + ICONS.pencil + '</button>' +
            '<button class="btn-icon btn-icon--delete" data-action="delete" data-id="' + esc(rec.id) + '" aria-label="Delete ' + esc(rec.title) + '" title="Delete">' + ICONS.trash  + '</button>' +
          '</div></td>';
        frag.appendChild(tr);
      });
      tbody.appendChild(frag);
    },

    /* ── Tag filter populate ────────────────────────────────── */
    populateTagFilter: function (records) {
      var select  = document.getElementById('filter-tag');
      var current = select.value;
      var tags    = [];
      records.forEach(function (r) { if (tags.indexOf(r.tag) === -1) tags.push(r.tag); });
      tags.sort();
      select.innerHTML = '<option value="">All Tags</option>' +
        tags.map(function (t) {
          return '<option value="' + App.validators.escapeHtml(t) + '"' +
                 (t === current ? ' selected' : '') + '>' +
                 App.validators.escapeHtml(t) + '</option>';
        }).join('');
    },

    /* ── Stats (student dashboard) ──────────────────────────── */
    renderStats: function (records, settings) {
      var want    = records.filter(function (r) { return r.status === 'want'; }).length;
      var reading = records.filter(function (r) { return r.status === 'reading'; }).length;
      var done    = records.filter(function (r) { return r.status === 'finished'; }).length;
      var pages   = records.filter(function (r) { return r.status === 'finished'; })
                           .reduce(function (s, r) { return s + Number(r.pages); }, 0);
      var tagCounts = {};
      records.forEach(function (r) { tagCounts[r.tag] = (tagCounts[r.tag] || 0) + 1; });
      var topTag  = Object.entries(tagCounts).sort(function (a, b) { return b[1] - a[1]; })[0];

      document.getElementById('stat-total').textContent   = records.length;
      document.getElementById('stat-want').textContent    = want;
      document.getElementById('stat-reading').textContent = reading;
      document.getElementById('stat-done').textContent    = done;
      document.getElementById('stat-pages').textContent   = pages.toLocaleString();
      document.getElementById('stat-top-tag').textContent = topTag ? topTag[0] : '—';

      var goal    = Number((settings || {}).goal || 0);
      var capMsg  = document.getElementById('cap-message');
      var capFill = document.getElementById('cap-fill');
      var capText = document.getElementById('cap-text');
      var capBar  = document.querySelector('.cap-bar');

      if (goal > 0) {
        var pct = Math.min(100, Math.round((done / goal) * 100));
        capFill.style.width = pct + '%';
        if (capBar) capBar.setAttribute('aria-valuenow', pct);
        capText.textContent = done + ' / ' + goal;
        capMsg.hidden = false;
        if (done >= goal) {
          capMsg.className = 'cap-message cap-message--over';
          capMsg.textContent = '🎉 Goal reached! You\'ve finished ' + done + ' of ' + goal + ' resources.';
          App.ui.announce('Goal reached! Finished ' + done + ' of ' + goal + '.', true);
        } else {
          var rem = goal - done;
          capMsg.className = 'cap-message cap-message--under';
          capMsg.textContent = rem + ' resource' + (rem !== 1 ? 's' : '') + ' remaining to hit your goal of ' + goal + '.';
        }
      } else {
        if (capFill) capFill.style.width = '0%';
        if (capText) capText.textContent = 'No goal set';
        if (capMsg) capMsg.hidden = true;
      }

      App.ui.renderBarChart(records);
      App.ui.renderBookshelf(records);
    },

    /* ── Bar chart (7-day activity) ─────────────────────────── */
    renderBarChart: function (records) {
      var el    = document.getElementById('bar-chart');
      if (!el) return;
      var today = new Date();
      var days  = [];
      for (var i = 6; i >= 0; i--) {
        var d   = new Date(today); d.setDate(d.getDate() - i);
        var key = d.toISOString().slice(0, 10);
        var cnt = records.filter(function (r) { return r.dateAdded === key; }).length;
        days.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), count: cnt });
      }
      var max = Math.max.apply(null, days.map(function (d) { return d.count; }).concat([1]));
      el.innerHTML = days.map(function (d) {
        var h = Math.round((d.count / max) * 80);
        return '<div class="bar-chart__bar-wrap">' +
          '<span class="bar-chart__val" aria-hidden="true">' + (d.count || '') + '</span>' +
          '<div class="bar-chart__bar" style="height:' + h + 'px" role="presentation" title="' + d.label + ': ' + d.count + ' added"></div>' +
          '<span class="bar-chart__day" aria-hidden="true">' + d.label + '</span>' +
          '</div>';
      }).join('');
    },

    /* ── Student bookshelf ──────────────────────────────────── */
    renderBookshelf: function (records) {
      var el    = document.getElementById('bookshelf');
      var empty = document.getElementById('shelf-empty');
      if (!el) return;

      if (records.length === 0) {
        el.innerHTML = '';
        if (empty) { el.appendChild(empty); empty.hidden = false; }
        return;
      }
      if (empty) empty.hidden = true;

      var esc  = App.validators.escapeHtml;
      var maxP = Math.max.apply(null, records.map(function (r) { return Number(r.pages) || 0; }).concat([100]));

      el.innerHTML = records.map(function (r) {
        var h     = 50 + Math.round(((Number(r.pages) || 0) / maxP) * 70);
        var short = r.title.length > 12 ? r.title.slice(0, 12) + '…' : r.title;
        var recCls = r.recommended ? ' book-spine--recommended' : '';
        return '<div class="book-spine book-spine--' + r.status + recCls + '" ' +
          'style="min-height:' + h + 'px" ' +
          'data-id="' + esc(r.id) + '" ' +
          'data-title="' + esc(short) + '" ' +
          'title="' + esc(r.title) + ' — ' + esc(r.author) + '" ' +
          'tabindex="0" role="button" ' +
          'aria-label="' + esc(r.title) + ' by ' + esc(r.author) + ', ' +
          (STATUS_LABELS[r.status] || r.status) + '. Press Enter to view.">' +
          '</div>';
      }).join('');
    },

    /* ── Notes preview (student dashboard) ─────────────────── */
    renderNotesPreview: function (notes, records) {
      var el = document.getElementById('notes-preview-list');
      if (!el) return;
      var recent = notes.slice().sort(function (a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }).slice(0, 3);

      if (!recent.length) {
        el.innerHTML = '<p class="notes-preview-empty">No notes yet. Notes from books appear here.</p>';
        return;
      }
      var recMap = {};
      records.forEach(function (r) { recMap[r.id] = r; });
      var esc = App.validators.escapeHtml;
      el.innerHTML = recent.map(function (n) {
        var book = n.bookId ? recMap[n.bookId] : null;
        var bTitle = book ? esc(book.title) : 'Freestanding Note';
        var preview = n.content.length > 80 ? n.content.slice(0, 80) + '…' : n.content;
        return '<div class="note-preview-item">' +
          '<strong>' + bTitle + '</strong>' +
          '<span>' + esc(preview) + '</span>' +
          '</div>';
      }).join('');
    },

    /* ── Facilitator dashboard ──────────────────────────────── */
    renderFacilitatorStats: function (records) {
      var total  = records.length;
      var done   = records.filter(function (r) { return r.status === 'finished'; }).length;
      var avgPg  = done
        ? Math.round(records.filter(function (r) { return r.status === 'finished'; })
              .reduce(function (s, r) { return s + Number(r.pages); }, 0) / done)
        : 0;
      var recCt  = records.filter(function (r) { return r.recommended; }).length;

      var tagCounts = {};
      records.forEach(function (r) { tagCounts[r.tag] = (tagCounts[r.tag] || 0) + 1; });
      var topTag = Object.entries(tagCounts).sort(function (a, b) { return b[1] - a[1]; })[0];

      var setEl = function (id, val) {
        var el = document.getElementById(id); if (el) el.textContent = val;
      };
      setEl('fac-stat-total',     total);
      setEl('fac-stat-done',      done);
      setEl('fac-stat-avgpages',  avgPg ? avgPg.toLocaleString() : '—');
      setEl('fac-stat-rec',       recCt);
      setEl('fac-stat-top-tag',   topTag ? topTag[0] : '—');
    },

    renderTagChart: function (records) {
      var el = document.getElementById('tag-chart');
      if (!el) return;
      var stats = App.search.computeTagStats(records).slice(0, 8);
      if (!stats.length) { el.innerHTML = '<p style="font-size:.8rem;color:var(--text-muted)">No data yet.</p>'; return; }
      var max = stats[0].count;
      el.innerHTML = stats.map(function (s) {
        var h = Math.round((s.count / max) * 80);
        var short = s.tag.length > 10 ? s.tag.slice(0, 10) + '…' : s.tag;
        return '<div class="bar-chart__bar-wrap">' +
          '<span class="bar-chart__val" aria-hidden="true">' + s.count + '</span>' +
          '<div class="bar-chart__bar" style="height:' + h + 'px;background:var(--red)" title="' + App.validators.escapeHtml(s.tag) + ': ' + s.count + '"></div>' +
          '<span class="bar-chart__day" aria-hidden="true">' + App.validators.escapeHtml(short) + '</span>' +
          '</div>';
      }).join('');
    },

    renderFacilitatorHealth: function (records) {
      var el = document.getElementById('fac-health-grid');
      if (!el) return;
      var total  = records.length;
      var done   = records.filter(function (r) { return r.status === 'finished'; }).length;
      var noNotes= records.filter(function (r) { return !r.notes || !r.notes.trim(); }).length;
      var rec    = records.filter(function (r) { return r.recommended; }).length;
      var pct    = total ? Math.round((done / total) * 100) : 0;
      el.innerHTML =
        '<div class="stat-card stat-card--done"><div class="stat-card__body">' +
          '<span class="stat-card__value">' + pct + '%</span>' +
          '<span class="stat-card__label">Finish Rate</span>' +
        '</div></div>' +
        '<div class="stat-card stat-card--want"><div class="stat-card__body">' +
          '<span class="stat-card__value">' + noNotes + '</span>' +
          '<span class="stat-card__label">Without Notes</span>' +
        '</div></div>' +
        '<div class="stat-card stat-card--tag"><div class="stat-card__body">' +
          '<span class="stat-card__value">' + rec + '</span>' +
          '<span class="stat-card__label">Recommended</span>' +
        '</div></div>';
    },

    renderFacilitatorBookshelf: function (records) {
      var el = document.getElementById('fac-bookshelf');
      if (!el) return;
      var recommended = records.filter(function (r) { return r.recommended; });
      if (!recommended.length) {
        el.innerHTML = '<p class="empty-state" style="padding:1rem 0">No recommended resources yet. Toggle ★ in Reports.</p>';
        return;
      }
      var esc  = App.validators.escapeHtml;
      var maxP = Math.max.apply(null, recommended.map(function (r) { return Number(r.pages) || 0; }).concat([100]));
      el.innerHTML = recommended.map(function (r) {
        var h     = 50 + Math.round(((Number(r.pages) || 0) / maxP) * 70);
        var short = r.title.length > 12 ? r.title.slice(0, 12) + '…' : r.title;
        return '<div class="book-spine book-spine--' + r.status + ' book-spine--recommended" ' +
          'style="min-height:' + h + 'px" data-id="' + esc(r.id) + '" ' +
          'data-title="' + esc(short) + '" ' +
          'title="' + esc(r.title) + ' — Recommended" ' +
          'tabindex="0" role="button" ' +
          'aria-label="' + esc(r.title) + ' — Recommended. Press Enter to view.">' +
          '</div>';
      }).join('');
    },

    /* ── Notes browser ──────────────────────────────────────── */
    renderNotesList: function (notes, records) {
      var el = document.getElementById('notes-list');
      if (!el) return;
      if (!notes.length) {
        el.innerHTML = '<p class="empty-state">No notes yet. Add notes via the book form or the Add Note button.</p>';
        return;
      }
      var esc = App.validators.escapeHtml;
      var recMap = {};
      records.forEach(function (r) { recMap[r.id] = r; });

      el.innerHTML = notes.map(function (n) {
        var book      = n.bookId ? recMap[n.bookId] : null;
        var bookTitle = book ? esc(book.title) : 'Freestanding Note';
        return '<div class="note-card" data-note-id="' + esc(n.id) + '">' +
          '<div class="note-card__meta">' +
            '<span class="note-card__book">' + bookTitle + '</span>' +
            '<span class="note-card__date">' + new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + '</span>' +
          '</div>' +
          '<p class="note-card__content">' + esc(n.content) + '</p>' +
          '<div class="note-card__actions">' +
            '<button class="btn-icon" data-note-action="edit"   data-note-id="' + esc(n.id) + '" aria-label="Edit note">'   + ICONS.pencil + '</button>' +
            '<button class="btn-icon btn-icon--delete" data-note-action="delete" data-note-id="' + esc(n.id) + '" aria-label="Delete note">' + ICONS.trash  + '</button>' +
          '</div>' +
          '</div>';
      }).join('');
    },

    populateNoteBookFilter: function (records) {
      var sel = document.getElementById('notes-filter-book');
      if (!sel) return;
      var cur = sel.value;
      sel.innerHTML = '<option value="">All Books</option>' +
        records.map(function (r) {
          return '<option value="' + App.validators.escapeHtml(r.id) + '"' +
                 (r.id === cur ? ' selected' : '') + '>' +
                 App.validators.escapeHtml(r.title) + '</option>';
        }).join('');
    },

    /* ── Reports page ───────────────────────────────────────── */
    renderReportsTable: function (records) {
      var tbody = document.getElementById('rec-table-body');
      if (!tbody) return;
      var esc = App.validators.escapeHtml;
      if (!records.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No resources in the library.</td></tr>';
        return;
      }
      tbody.innerHTML = records.map(function (r) {
        return '<tr>' +
          '<td>' + esc(r.title) + '</td>' +
          '<td>' + esc(r.author) + '</td>' +
          '<td>' + esc(r.tag) + '</td>' +
          '<td style="text-align:center">' +
            '<label class="sr-only" for="rec-cb-' + esc(r.id) + '">Recommended: ' + esc(r.title) + '</label>' +
            '<input type="checkbox" id="rec-cb-' + esc(r.id) + '" class="rec-checkbox" ' +
            'data-id="' + esc(r.id) + '"' + (r.recommended ? ' checked' : '') + ' />' +
          '</td>' +
          '<td><div class="row-actions">' +
            '<button class="btn-icon" data-action="view" data-id="' + esc(r.id) + '" aria-label="View ' + esc(r.title) + '" title="View">' + ICONS.eye + '</button>' +
          '</div></td>' +
          '</tr>';
      }).join('');
    },

    renderTagLeaderboard: function (records) {
      var el = document.getElementById('tag-leaderboard');
      if (!el) return;
      var stats = App.search.computeTagStats(records);
      if (!stats.length) { el.innerHTML = '<p style="font-size:.82rem;color:var(--text-muted)">No data yet.</p>'; return; }
      var max = stats[0].count;
      el.innerHTML = stats.map(function (s) {
        var pct = Math.round((s.count / max) * 100);
        return '<div class="tag-row">' +
          '<span class="tag-row__name">' + App.validators.escapeHtml(s.tag) + '</span>' +
          '<div class="tag-row__bar-bg" role="presentation"><div class="tag-row__bar" style="width:' + pct + '%"></div></div>' +
          '<span class="tag-row__count">' + s.count + '</span>' +
          '</div>';
      }).join('');
    },

    renderCompletionChart: function (records) {
      var el = document.getElementById('completion-chart');
      if (!el) return;
      var allDays = App.search.computeCompletionsByDay(records, 30);
      /* Show every 5th day label to avoid crowding */
      var max = Math.max.apply(null, allDays.map(function (d) { return d.count; }).concat([1]));
      el.innerHTML = allDays.map(function (d, i) {
        var h      = Math.round((d.count / max) * 80);
        var showLbl= (i % 5 === 4);
        return '<div class="bar-chart__bar-wrap">' +
          '<span class="bar-chart__val" aria-hidden="true">' + (d.count || '') + '</span>' +
          '<div class="bar-chart__bar" style="height:' + h + 'px" title="' + d.label + ': ' + d.count + ' finished"></div>' +
          '<span class="bar-chart__day" aria-hidden="true">' + (showLbl ? d.label : '') + '</span>' +
          '</div>';
      }).join('');
    },

    /* ── Role application ───────────────────────────────────── */
    applyRole: function (role) {
      var studentPanel = document.getElementById('dashboard-student');
      var facPanel     = document.getElementById('dashboard-facilitator');
      if (studentPanel) studentPanel.hidden = role !== 'student';
      if (facPanel)     facPanel.hidden     = role !== 'facilitator';

      document.querySelectorAll('[data-role-nav]').forEach(function (li) {
        li.hidden = li.dataset.roleNav !== role;
      });

      /* Update role badge in sidebar */
      var badge = document.getElementById('sidebar-role-badge');
      if (badge) {
        badge.textContent = role === 'student' ? 'Student' : 'Facilitator';
        badge.className   = 'role-badge' + (role === 'facilitator' ? ' role-badge--facilitator' : '');
      }
      var topBadge = document.getElementById('topbar-role-badge');
      if (topBadge) topBadge.textContent = role === 'student' ? 'Student' : 'Facilitator';

      /* Sidebar subtitle */
      var sub = document.querySelector('.sidebar__sub');
      if (sub) sub.textContent = role === 'student' ? 'Student View' : 'Facilitator View';

      /* Settings role buttons */
      var sBtn = document.getElementById('role-student-btn');
      var fBtn = document.getElementById('role-facilitator-btn');
      if (sBtn) { sBtn.setAttribute('aria-pressed', role === 'student' ? 'true' : 'false'); sBtn.classList.toggle('role-btn--active', role === 'student'); }
      if (fBtn) { fBtn.setAttribute('aria-pressed', role === 'facilitator' ? 'true' : 'false'); fBtn.classList.toggle('role-btn--active', role === 'facilitator'); }

      /* Library heading changes per role */
      var libH = document.getElementById('library-heading');
      if (libH) libH.textContent = role === 'facilitator' ? 'Class Library' : 'My Library';
      var navLibLink = document.querySelector('[data-page="library"] span');
      if (navLibLink) navLibLink.textContent = role === 'facilitator' ? 'Class Library' : 'My Library';

      /* Dashboard subtitle */
      var sub2 = document.getElementById('dashboard-subtitle');
      if (sub2) sub2.textContent = role === 'student'
        ? 'Your personal reading at a glance'
        : 'Class library overview & analytics';
    }
  };

})(window.App = window.App || {});
