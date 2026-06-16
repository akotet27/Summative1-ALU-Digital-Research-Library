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
    return '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
  }

  function fmtDate(str) {
    if (!str) return '—';
    try { return new Date(str + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch (e) { return str; }
  }

  var toastTimer;

  App.ui = {

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
        tr.innerHTML =
          '<td class="col-spine"><span class="row-spine row-spine--' + rec.status + '" aria-hidden="true"></span></td>' +
          '<td class="col-title">' + hl(rec.title, re) + '</td>' +
          '<td class="col-author">' + hl(rec.author, re) + '</td>' +
          '<td class="col-pages">' + Number(rec.pages).toLocaleString() + '</td>' +
          '<td class="col-tag">' + hl(rec.tag, re) + '</td>' +
          '<td class="col-status"><span class="status-badge status-badge--' + rec.status + '" aria-label="Status: ' + STATUS_LABELS[rec.status] + '"><span class="status-dot" aria-hidden="true"></span>' + STATUS_LABELS[rec.status] + '</span></td>' +
          '<td class="col-date">' + fmtDate(rec.dateAdded) + '</td>' +
          '<td class="col-actions"><div class="row-actions">' +
            '<button class="btn-icon" data-action="view"   data-id="' + esc(rec.id) + '" aria-label="View ' + esc(rec.title) + '" title="View">'   + ICONS.eye    + '</button>' +
            '<button class="btn-icon" data-action="edit"   data-id="' + esc(rec.id) + '" aria-label="Edit ' + esc(rec.title) + '" title="Edit">'   + ICONS.pencil + '</button>' +
            '<button class="btn-icon btn-icon--delete" data-action="delete" data-id="' + esc(rec.id) + '" aria-label="Delete ' + esc(rec.title) + '" title="Delete">' + ICONS.trash  + '</button>' +
          '</div></td>';
        frag.appendChild(tr);
      });
      tbody.appendChild(frag);
    },

    renderStats: function (records, settings) {
      var want   = records.filter(function (r) { return r.status === 'want'; }).length;
      var reading= records.filter(function (r) { return r.status === 'reading'; }).length;
      var done   = records.filter(function (r) { return r.status === 'finished'; }).length;
      var pages  = records.filter(function (r) { return r.status === 'finished'; })
                          .reduce(function (s, r) { return s + Number(r.pages); }, 0);
      var tagCounts = {};
      records.forEach(function (r) { tagCounts[r.tag] = (tagCounts[r.tag] || 0) + 1; });
      var topTag = Object.entries(tagCounts).sort(function (a, b) { return b[1] - a[1]; })[0];

      document.getElementById('stat-total').textContent   = records.length;
      document.getElementById('stat-want').textContent    = want;
      document.getElementById('stat-reading').textContent = reading;
      document.getElementById('stat-done').textContent    = done;
      document.getElementById('stat-pages').textContent   = pages.toLocaleString();
      document.getElementById('stat-top-tag').textContent = topTag ? topTag[0] : '—';

      // Goal / cap
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
          capMsg.textContent = 'Goal reached! You\'ve finished ' + done + ' of ' + goal + ' resources — ready for your capstone!';
          App.ui.announce('Goal reached! Finished ' + done + ' of ' + goal + '.', true);
        } else {
          var rem = goal - done;
          capMsg.className = 'cap-message cap-message--under';
          capMsg.textContent = rem + ' resource' + (rem !== 1 ? 's' : '') + ' remaining to hit your goal of ' + goal + '.';
        }
      } else {
        capFill.style.width = '0%';
        capText.textContent = 'No goal set';
        capMsg.hidden = true;
      }

      App.ui.renderBarChart(records);
      App.ui.renderBookshelf(records);
    },

    renderBarChart: function (records) {
      var el    = document.getElementById('bar-chart');
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
          '<div class="bar-chart__bar" style="height:' + h + 'px" role="presentation" title="' + d.label + ': ' + d.count + '"></div>' +
          '<span class="bar-chart__day" aria-hidden="true">' + d.label + '</span>' +
          '</div>';
      }).join('');
    },

    renderBookshelf: function (records) {
      var el    = document.getElementById('bookshelf');
      var empty = document.getElementById('shelf-empty');
      var esc   = App.validators.escapeHtml;

      if (records.length === 0) {
        el.innerHTML = ''; el.appendChild(empty); empty.hidden = false; return;
      }
      empty.hidden = true;
      var maxP = Math.max.apply(null, records.map(function (r) { return Number(r.pages); }).concat([100]));

      el.innerHTML = records.map(function (r) {
        var h     = 50 + Math.round((Number(r.pages) / maxP) * 70);
        var short = r.title.length > 12 ? r.title.slice(0, 12) + '…' : r.title;
        return '<div class="book-spine book-spine--' + r.status + '" ' +
          'style="min-height:' + h + 'px" ' +
          'data-id="' + esc(r.id) + '" ' +
          'data-title="' + esc(short) + '" ' +
          'title="' + esc(r.title) + ' — ' + esc(r.author) + '" ' +
          'tabindex="0" role="button" ' +
          'aria-label="' + esc(r.title) + ' by ' + esc(r.author) + ', ' + STATUS_LABELS[r.status] + '. Press Enter to view.">' +
          '</div>';
      }).join('');
    },

    populateTagFilter: function (records) {
      var select  = document.getElementById('filter-tag');
      var current = select.value;
      var tags    = [];
      records.forEach(function (r) { if (tags.indexOf(r.tag) === -1) tags.push(r.tag); });
      tags.sort();
      select.innerHTML = '<option value="">All Tags</option>' +
        tags.map(function (t) {
          return '<option value="' + App.validators.escapeHtml(t) + '"' + (t === current ? ' selected' : '') + '>' + App.validators.escapeHtml(t) + '</option>';
        }).join('');
    }
  };
})(window.App = window.App || {});