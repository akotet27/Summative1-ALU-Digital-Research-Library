// ── ui.js ────────────────────────────────────────────────
// All DOM rendering functions.
// Reads from state, writes to DOM. Never touches localStorage.

import { state, getFilteredBooks, getStats } from './state.js';
import { highlight, escapeHTML }             from './search.js';
import { compileSearch }                     from './search.js';

// ── ANNOUNCE TO SCREEN READERS ───────────────────────────

/** Polite announcement — for non-urgent status updates */
export function announce(message) {
  const el = document.getElementById('status-msg');
  if (!el) return;
  el.textContent = '';
  setTimeout(() => { el.textContent = message; }, 50);
}

/** Assertive announcement — for urgent alerts (cap exceeded) */
export function announceAlert(message) {
  const el = document.getElementById('cap-alert');
  if (!el) return;
  el.textContent = '';
  setTimeout(() => { el.textContent = message; }, 50);
}

// ── TOAST NOTIFICATIONS ──────────────────────────────────

export function showToast(message, type = 'success') {
  // Remove existing toast
  document.querySelector('.toast')?.remove();

  const toast = document.createElement('div');
  toast.className  = `toast ${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'status');
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── SECTION NAVIGATION ───────────────────────────────────

export function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(s => {
    s.classList.remove('active');
  });

  // Show target section
  const target = document.getElementById(sectionId);
  if (target) {
    target.classList.add('active');
    target.focus?.();
  }

  // Update nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    const isActive = link.dataset.section === sectionId;
    link.classList.toggle('active', isActive);
    link.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

// ── DASHBOARD ────────────────────────────────────────────

export function renderDashboard() {
  const stats = getStats();

  // Stat numbers
  setText('stat-total',    stats.total);
  setText('stat-finished', stats.finished);
  setText('stat-reading',  stats.reading);
  setText('stat-want',     stats.want);
  setText('stat-pages',    stats.pages.toLocaleString());
  setText('stat-top-tag',  stats.topTag);

  // Reading goal progress
  renderCapBar(stats.finished);

  // 7-day chart
  renderWeekChart(stats.days);

  // Hours estimate in settings
  const hoursEl = document.getElementById('hours-result');
  if (hoursEl) {
    hoursEl.textContent =
      `At ${state.settings.pagesPerHour} pages/hour, ` +
      `your ${stats.pages.toLocaleString()} pages = ~${stats.hours} hours of reading.`;
  }
}

function renderCapBar(finished) {
  const goal    = state.settings.goal || 20;
  const pct     = Math.min(Math.round((finished / goal) * 100), 100);
  const bar     = document.getElementById('capBar');
  const wrapper = document.getElementById('capBarWrapper');
  const msg     = document.getElementById('cap-message');

  if (!bar || !msg) return;

  bar.style.width = pct + '%';
  wrapper?.setAttribute('aria-valuenow', pct);

  const over = finished >= goal;
  bar.classList.toggle('over', over);

  if (goal === 0) {
    msg.textContent = 'Set a goal in Settings to track progress.';
    return;
  }

  if (over) {
    const extra = finished - goal;
    msg.textContent =
      `🎉 Goal reached! ${finished}/${goal} books finished. ` +
      `${extra > 0 ? `${extra} books over target!` : 'Exactly on target!'}`;
    msg.style.color = 'var(--green)';
    // Assertive alert for screen readers
    announceAlert(
      `Capstone goal reached! You have finished ${finished} out of ${goal} books.`
    );
  } else {
    const left = goal - finished;
    msg.textContent =
      `${finished}/${goal} books finished — ${left} more to reach your capstone goal.`;
    msg.style.color = 'var(--text-muted)';
    announce(`${left} books left to reach your reading goal.`);
  }
}

function renderWeekChart(days) {
  const chart = document.getElementById('weekChart');
  if (!chart) return;

  const max = Math.max(...days.map(d => d.count), 1);
  chart.innerHTML = '';

  days.forEach(day => {
    const col = document.createElement('div');
    col.className = 'bar-col';

    const heightPct = Math.round((day.count / max) * 100);

    col.innerHTML = `
      <span class="bar-count">${day.count > 0 ? day.count : ''}</span>
      <div
        class="bar-fill"
        style="height:${heightPct}%"
        title="${day.label}: ${day.count} book(s)"
        aria-label="${day.label}: ${day.count} books added"
      ></div>
      <span class="bar-label">${day.label}</span>
    `;
    chart.appendChild(col);
  });
}

// ── RECORDS ──────────────────────────────────────────────

export function renderRecords(searchRegex = null) {
  const books     = getFilteredBooks(searchRegex);
  const container = document.getElementById('records-container');
  const emptyEl   = document.getElementById('empty-state');

  if (!container) return;

  if (books.length === 0) {
    container.innerHTML = '';
    if (emptyEl) emptyEl.hidden = false;
    announce('No books found.');
    return;
  }

  if (emptyEl) emptyEl.hidden = true;

  // Desktop — table
  const tableHTML = renderTable(books, searchRegex);
  // Mobile — cards
  const cardsHTML = renderCards(books, searchRegex);

  container.innerHTML = `
    <div class="records-table-wrapper">
      ${tableHTML}
    </div>
    <div class="cards-view">
      ${cardsHTML}
    </div>
  `;

  announce(`Showing ${books.length} book${books.length !== 1 ? 's' : ''}.`);
}

function renderTable(books, regex) {
  const rows = books.map(book => {
    const title  = regex ? highlight(book.title,  regex) : escapeHTML(book.title);
    const author = regex ? highlight(book.author, regex) : escapeHTML(book.author);
    const tag    = regex ? highlight(book.tag,    regex) : escapeHTML(book.tag || '—');
    const notes  = regex ? highlight(book.notes || '', regex) : escapeHTML(book.notes || '');

    return `
      <tr data-id="${book.id}">
        <td><strong>${title}</strong></td>
        <td>${author}</td>
        <td>${book.pages.toLocaleString()}</td>
        <td>${renderStatusBadge(book.status)}</td>
        <td>${book.tag ? `<span class="tag-badge">${tag}</span>` : '—'}</td>
        <td>${book.dateAdded}</td>
        <td>
          <div class="action-btns">
            <button
              class="btn btn-sm btn-secondary edit-btn"
              data-id="${book.id}"
              aria-label="Edit ${escapeHTML(book.title)}"
            >
              ✏️ Edit
            </button>
            <button
              class="btn btn-sm btn-danger delete-btn"
              data-id="${book.id}"
              aria-label="Delete ${escapeHTML(book.title)}"
            >
              🗑️ Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <table class="records-table" aria-label="Book records">
      <thead>
        <tr>
          <th scope="col">Title</th>
          <th scope="col">Author</th>
          <th scope="col">Pages</th>
          <th scope="col">Status</th>
          <th scope="col">Tag</th>
          <th scope="col">Date Added</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function renderCards(books, regex) {
  return books.map(book => {
    const title  = regex ? highlight(book.title,  regex) : escapeHTML(book.title);
    const author = regex ? highlight(book.author, regex) : escapeHTML(book.author);
    const tag    = regex ? highlight(book.tag || '', regex) : escapeHTML(book.tag || '');
    const notes  = regex ? highlight(book.notes || '', regex) : escapeHTML(book.notes || '');

    return `
      <article class="book-card" data-id="${book.id}" aria-label="${escapeHTML(book.title)}">
        <h3>${title}</h3>
        <p class="book-meta">
          by ${author} &nbsp;·&nbsp;
          ${book.pages.toLocaleString()} pages &nbsp;·&nbsp;
          ${book.dateAdded}
        </p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
          ${renderStatusBadge(book.status)}
          ${book.tag ? `<span class="tag-badge">${tag}</span>` : ''}
        </div>
        ${book.notes
          ? `<p class="book-notes">${notes}</p>`
          : ''}
        <div class="action-btns" style="margin-top:10px">
          <button
            class="btn btn-sm btn-secondary edit-btn"
            data-id="${book.id}"
            aria-label="Edit ${escapeHTML(book.title)}"
          >
            ✏️ Edit
          </button>
          <button
            class="btn btn-sm btn-danger delete-btn"
            data-id="${book.id}"
            aria-label="Delete ${escapeHTML(book.title)}"
          >
            🗑️ Delete
          </button>
        </div>
      </article>
    `;
  }).join('');
}

function renderStatusBadge(status) {
  const cls = {
    'Finished':     'finished',
    'Reading':      'reading',
    'Want to Read': 'want-to-read',
  }[status] || '';
  return `<span class="status-badge ${cls}">${escapeHTML(status)}</span>`;
}

// ── FORM ─────────────────────────────────────────────────

/** Fill the form with a book's data for editing */
export function fillFormForEdit(book) {
  document.getElementById('titleInput').value  = book.title;
  document.getElementById('authorInput').value = book.author;
  document.getElementById('pagesInput').value  = book.pages;
  document.getElementById('statusSelect').value= book.status;
  document.getElementById('tagInput').value    = book.tag || '';
  document.getElementById('dateInput').value   = book.dateAdded;
  document.getElementById('notesInput').value  = book.notes || '';
  document.getElementById('editId').value      = book.id;

  document.getElementById('form-heading').textContent = 'Edit Book';
  document.getElementById('submitBtn').textContent    = '💾 Update Book';
  document.getElementById('cancelBtn').hidden         = false;
}

/** Reset form back to Add mode */
export function resetForm() {
  document.getElementById('bookForm').reset();
  document.getElementById('editId').value             = '';
  document.getElementById('form-heading').textContent = 'Add a Book';
  document.getElementById('submitBtn').textContent    = '💾 Save Book';
  document.getElementById('cancelBtn').hidden         = true;

  // Clear all error messages
  document.querySelectorAll('.error-msg').forEach(el => {
    el.textContent = '';
  });

  // Clear valid/invalid classes
  document.querySelectorAll('.form-group input, .form-group textarea, .form-group select')
    .forEach(el => {
      el.classList.remove('valid', 'invalid');
    });

  // Set today's date as default
  const dateInput = document.getElementById('dateInput');
  if (dateInput) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }
}

/** Show a single field error */
export function showFieldError(fieldName,