// scripts/ui.js
import { highlight } from './search.js';

const STATUS_LABELS = {
  want:     '📋 Want to Read',
  reading:  '📖 Reading',
  finished: '✅ Finished',
};

// ── Toast ──────────────────────────────────────────────────────
let toastTimer;
export const showToast = (msg) => {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
};

// ── ARIA live announce ─────────────────────────────────────────
export const announce = (msg, assertive = false) => {
  const el = document.getElementById(assertive ? 'live-assertive' : 'live-polite');
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = msg; });
};

// ── Render records table ───────────────────────────────────────
export const renderTable = (records, re) => {
  const tbody = document.getElementById('records-body');
  const empty = document.getElementById('table-empty');
  const count = document.getElementById('records-count');

  tbody.innerHTML = '';
  count.textContent = `${records.length} resource${records.length !== 1 ? 's' : ''}`;

  if (records.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  const frag = document.createDocumentFragment();
  for (const rec of records) {
    const tr = document.createElement('tr');
    tr.dataset.id = rec.id;

    const titleHtml   = highlight(rec.title, re);
    const authorHtml  = highlight(rec.author, re);
    const tagHtml     = highlight(rec.tag, re);

    tr.innerHTML = `
      <td class="col-spine"><span class="row-spine row-spine--${rec.status}" aria-hidden="true"></span></td>
      <td class="col-title">${titleHtml}</td>
      <td class="col-author">${authorHtml}</td>
      <td class="col-pages">${Number(rec.pages).toLocaleString()}</td>
      <td class="col-tag">${tagHtml}</td>
      <td class="col-status">
        <span class="status-badge status-badge--${rec.status}" aria-label="Status: ${STATUS_LABELS[rec.status]}">
          ${STATUS_LABELS[rec.status]}
        </span>
      </td>
      <td class="col-date">${formatDate(rec.dateAdded)}</td>
      <td class="col-actions">
        <div class="row-actions">
          <button class="btn-icon" data-action="edit" data-id="${rec.id}" aria-label="Edit ${escText(rec.title)}" title="Edit">✏️</button>
          <button class="btn-icon btn-icon--delete" data-action="delete" data-id="${rec.id}" aria-label="Delete ${escText(rec.title)}" title="Delete">🗑️</button>
        </div>
      </td>
    `;
    frag.appendChild(tr);
  }
  tbody.appendChild(frag);
};

// ── Render inline edit row ─────────────────────────────────────
export const renderEditRow = (rec) => {
  const tbody = document.getElementById('records-body');
  const row = tbody.querySelector(`tr[data-id="${rec.id}"]`);
  if (!row) return;

  row.classList.add('edit-row');
  row.innerHTML = `
    <td></td>
    <td><input type="text" value="${escText(rec.title)}" data-field="title" aria-label="Edit title" /></td>
    <td><input type="text" value="${escText(rec.author)}" data-field="author" aria-label="Edit author" /></td>
    <td><input type="text" value="${rec.pages}" data-field="pages" style="width:70px" aria-label="Edit pages" /></td>
    <td><input type="text" value="${escText(rec.tag)}" data-field="tag" aria-label="Edit tag" /></td>
    <td>
      <select data-field="status" aria-label="Edit status">
        <option value="want" ${rec.status==='want'?'selected':''}>📋 Want to Read</option>
        <option value="reading" ${rec.status==='reading'?'selected':''}>📖 Reading</option>
        <option value="finished" ${rec.status==='finished'?'selected':''}>✅ Finished</option>
      </select>
    </td>
    <td><input type="text" value="${rec.dateAdded}" data-field="dateAdded" style="width:110px" aria-label="Edit date" /></td>
    <td>
      <div class="row-actions">
        <button class="btn btn--sm btn--primary" data-action="save-edit" data-id="${rec.id}" aria-label="Save edits for ${escText(rec.title)}">Save</button>
        <button class="btn btn--sm btn--ghost" data-action="cancel-edit" data-id="${rec.id}" aria-label="Cancel editing">×</button>
      </div>
    </td>
  `;
  row.querySelector('input').focus();
};

// ── Render dashboard stats ─────────────────────────────────────
export const renderStats = (records, settings) => {
  const total    = records.length;
  const want     = records.filter(r => r.status === 'want').length;
  const reading  = records.filter(r => r.status === 'reading').length;
  const done     = records.filter(r => r.status === 'finished').length;
  const pages    = records.filter(r => r.status === 'finished')
                          .reduce((s, r) => s + Number(r.pages), 0);

  // Top tag
  const tagCounts = {};
  records.forEach(r => { tagCounts[r.tag] = (tagCounts[r.tag] || 0) + 1; });
  const topTag = Object.entries(tagCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || '—';

  document.getElementById('stat-total').textContent   = total;
  document.getElementById('stat-want').textContent    = want;
  document.getElementById('stat-reading').textContent = reading;
  document.getElementById('stat-done').textContent    = done;
  document.getElementById('stat-pages').textContent   = pages.toLocaleString();
  document.getElementById('stat-top-tag').textContent = topTag;

  // Cap/goal
  const goal = Number(settings.goal || 0);
  const capMsg = document.getElementById('cap-message');
  const capFill = document.getElementById('cap-fill');
  const capText = document.getElementById('cap-text');
  const capBar  = document.querySelector('.cap-bar');

  if (goal > 0) {
    const pct = Math.min(100, Math.round((done / goal) * 100));
    capFill.style.width = pct + '%';
    capBar.setAttribute('aria-valuenow', pct);
    capText.textContent = `${done} / ${goal} finished`;

    capMsg.hidden = false;
    if (done >= goal) {
      capMsg.className = 'cap-message cap-message--over';
      capMsg.textContent = `🎉 Goal reached! You've finished ${done} of ${goal} resources — you're ready for your capstone!`;
      announce(`Goal exceeded! You've finished ${done} of ${goal} resources.`, true);
    } else {
      const remaining = goal - done;
      capMsg.className = 'cap-message cap-message--under';
      capMsg.textContent = `📚 ${remaining} resource${remaining !== 1 ? 's' : ''} remaining to hit your goal of ${goal}.`;
      announce(`${remaining} resources remaining to hit your goal.`, false);
    }
  } else {
    capMsg.hidden = true;
    capFill.style.width = '0%';
    capText.textContent = 'No goal set';
  }

  renderBarChart(records);
  renderBookshelf(records);
};

// ── Bar chart (last 7 days) ────────────────────────────────────
const renderBarChart = (records) => {
  const el = document.getElementById('bar-chart');
  const today = new Date();
  const days = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    const count = records.filter(r => r.dateAdded === key).length;
    days.push({ label, key, count });
  }

  const max = Math.max(...days.map(d => d.count), 1);
  el.innerHTML = days.map(d => {
    const h = Math.round((d.count / max) * 80);
    return `
      <div class="bar-chart__bar-wrap">
        <span class="bar-chart__val" aria-hidden="true">${d.count || ''}</span>
        <div class="bar-chart__bar" style="height:${h}px" role="presentation" title="${d.label}: ${d.count}"></div>
        <span class="bar-chart__day" aria-hidden="true">${d.label}</span>
      </div>
    `;
  }).join('');
};

// ── Bookshelf ──────────────────────────────────────────────────
const renderBookshelf = (records) => {
  const el = document.getElementById('bookshelf');
  const empty = document.getElementById('shelf-empty');

  if (records.length === 0) {
    el.innerHTML = '';
    el.appendChild(empty);
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  // Height varies by page count, clamped
  const pages = records.map(r => Number(r.pages));
  const maxP  = Math.max(...pages, 100);
  const minH  = 50, maxH = 120;

  el.innerHTML = records.map(r => {
    const h = minH + Math.round(((Number(r.pages) / maxP) * (maxH - minH)));
    const shortTitle = r.title.length > 12 ? r.title.slice(0, 12) + '…' : r.title;
    return `<div
      class="book-spine book-spine--${r.status}"
      style="min-height:${h}px"
      data-title="${escText(shortTitle)}"
      title="${escText(r.title)} — ${escText(r.author)}"
      tabindex="0"
      role="button"
      aria-label="${escText(r.title)} by ${escText(r.author)}, status: ${STATUS_LABELS[r.status]}"
    ></div>`;
  }).join('');
};

// ── Populate tag filter ────────────────────────────────────────
export const populateTagFilter = (records) => {
  const select = document.getElementById('filter-tag');
  const current = select.value;
  const tags = [...new Set(records.map(r => r.tag))].sort();
  select.innerHTML = '<option value="">All Tags</option>' +
    tags.map(t => `<option value="${escText(t)}" ${t===current?'selected':''}>${escText(t)}</option>`).join('');
};

// ── Helpers ────────────────────────────────────────────────────
const formatDate = (str) => {
  if (!str) return '—';
  try {
    return new Date(str + 'T00:00:00').toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
  } catch { return str; }
};

const escText = (str) =>
  String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#x27;');