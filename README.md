<<<<<<< HEAD
# ALUSOURCE — Digital Library Platform

**A project by Akotet Demise**
**Repo:** https://github.com/akotet27/Summative-1-ALU-library.git

A role-based digital library web application for ALU students and facilitators. Facilitators manage a curated book catalog; students browse, read, and annotate books — no build step, no server required.

---

## Quick Start

1. Clone the repository
2. Open `index.html` in any modern browser (Chrome, Edge, or Firefox)
3. The app seeds 16 books and demo accounts on first visit

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Facilitator | facilitator@alu.edu | Facilitate1! |
| Student | a.demise@alustudent.com | Student1! |
| Student | a.kamara@alustudent.com | Student1! |
| Student | b.nkosi@alustudent.com | Student1! |
| Student | c.obi@alustudent.com | Student1! |
| Student | d.mensah@alustudent.com | Student1! |
| Student | f.alhassan@alustudent.com | Student1! |
=======
# ALUSOURCE — ALU's Digital Research Library

**Theme:** Book & Notes Vault  
**Live URL:** https://akotet27.github.io/Summative-1/  
**Repo URL:** https://github.com/akotet27/Summative-1

A facilitator-curated, student-driven research library for ALU's BSE, BEL, and IBT Final Year cohorts. Students browse, track, and annotate books; facilitators upload resources and monitor progress.

---

## Setup

1. Clone or download the repository.
2. Open `index.html` directly in a modern browser — no build step required.
3. For best results use Chrome, Edge, or Firefox (latest).
4. The app auto-loads 16 seed books and 2 seed accounts on first visit.

**Demo accounts (pre-loaded)**

| Role        | Email                        | Password      |
|-------------|------------------------------|---------------|
| Student     | a.demise@alustudent.com      | Student1!     |
| Facilitator | facilitator@alu.edu          | Facilitate1!  |
>>>>>>> aa124d7942f8ccc6e35420a914fa3bb2a24cf2ea

---

## Features

<<<<<<< HEAD
### Public Homepage (`index.html`)
- Searchable and filterable catalog of all 16 facilitator-approved books
- Regex-powered live search with match highlighting
- Filter by topic tag; sort by date, title, or pages
- Book detail modal with summary and sign-in CTA
- Once logged in: reading progress shown directly on catalog cards
- Light / Dark theme toggle

### Student Dashboard (`dashboard.html`)
- **Stats:** Library Books, Notes Written, In Progress, Completed, Pages Covered, Top Topic
- **7-day bar chart:** notes written per day
- **Visual bookshelf:** reading-progress spines (Want / Reading / Finished)
- **Browse Books:** grid/list toggle with search + filter; books without a PDF show "View Details" → full summary + "Request PDF Access"
- **My Library:** table of all 16 curated books; view, add note, track status
- **My Notes:** create, edit, delete notes; every note goes through facilitator review
  - ⏳ Pending review → ✓ Approved (with facilitator comment) or ✗ Rejected
- **Profile:** update name, class, study focus, bio, and password
- **Settings:** reading goal, reading speed, data management

### Facilitator Dashboard (`admin.html`)
- **Overview stats:** Total Resources, Student count, Active Readers, Top Tag, Notes submitted
- **Class Library:** full catalog table with Add · Edit · Delete (popup modal for each action)
- **Pending Approvals** (three tabs):
  - *Student Notes* — review pending notes, write a comment, approve or reject
  - *Book Requests* — students requesting PDF access; approve or decline
  - *Book Submissions* — student-submitted books (audit trail)
- **Students by Class:** per-student cards with reading history, notes, and edit/delete actions
- **Reports:** tag leaderboard, 30-day completion chart, CSV export
- **Recommended:** manage the ★ recommended books shelf

---

## Access Control

- Students cannot add books to the catalog — they read and annotate only
- `dashboard.html` requires a valid student session; unauthenticated visitors are redirected to `login.html`
- `admin.html` requires a valid facilitator session; same redirect
- After login, all prompts to sign in disappear from every page
=======
### Public (no login required)
- Browse and search the facilitator-approved book catalog
- Live regex search with match highlighting
- Filter by topic tag and sort by date / title / pages
- Book detail modal with sign-in CTA

### Student Dashboard
- Personal reading tracker — add, edit, delete books with status (Want / Reading / Finished)
- Reading goal and progress bar with ARIA live feedback
- 7-day activity bar chart
- Visual bookshelf (click spine to view details)
- Notes system — freestanding or linked to any library/personal book
- In-app PDF reader with page-by-page progress tracking
- JSON import / export with validation
- Profile management and password change
- Settings: reading speed (pages/min) and reading goal target
- Dark / Light theme toggle

### Facilitator Dashboard
- Upload books directly to the catalog (immediately approved)
- Class overview with aggregate stats (students, notes, active readers, top tag)
- Students-by-class view with per-student reading progress and notes
- Manage recommended books
- Reports: tag leaderboard, 30-day completion chart, CSV export
>>>>>>> aa124d7942f8ccc6e35420a914fa3bb2a24cf2ea

---

## Data Model

<<<<<<< HEAD
All data is stored in `localStorage`. Keys:

| Key | Contents |
|-----|----------|
| `alu:records` | Book records (`addedByFacilitator`, `approved`, `summary`, `pdfUrl`, …) |
| `alu:users` | User accounts (hashed passwords, role, profile) |
| `alu:notes` | Student notes (`status: pending/approved/rejected`, `facilComment`) |
| `alu:progress` | Per-user PDF reading progress |
| `alu:requests` | Student PDF access requests |
| `alu:session` | Active login session |
| `alu:theme` | `light` or `dark` |
| `alu:settings:{uid}` | Per-user reading goal and speed |

---

## Regex Validation Rules

| # | Field | Pattern | Notes |
|---|-------|---------|-------|
| 1 | Title | `/^\S(?:.*\S)?$/` | No leading/trailing spaces |
| 2 | Pages | `/^[1-9]\d*$/` | Positive integer only |
| 3 | Date | `/^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])$/` | Strict YYYY-MM-DD |
| 4 | Tag | `/^[A-Za-zÀ-ɏ]+(?:[ -][A-Za-zÀ-ɏ]+)*$/` | Letters, spaces, hyphens |
| 5 | ISBN | `/^(?:\d{9}[\dX]\|\d{13})$/` | ISBN-10 or ISBN-13 (alternation) |
| 6 | URL | `/^https?:\/\/(?=\S+\.\S).+/i` | Positive lookahead |
| 7 | Notes | `/\b(\w+)\s+\1\b/i` | Duplicate-word back-reference |
| 8 | Author | `/^([A-Za-z'-]+…),\s+(?!\1\b)[A-Za-z'. -]+$/` | Back-reference + negative lookahead |
| 9 | Email | `/^(?=.*@.*\.)[^\s@]+@[^\s@]+\.[^\s@]+$/` | Positive lookahead |
| 10 | Password | `/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[\S]{8,}$/` | Chained lookaheads |

---

## Design System

| Variable | Light | Dark |
|----------|-------|------|
| `--primary` | `#0F2A5C` (navy) | `#0F2A5C` |
| `--accent` | `#B91C1C` (red) | `#B91C1C` |
| `--bg` | `#FFFFFF` | `#0B1628` |

- Colors: white, red, and blue only — no green UI elements
- Theme toggle (light / dark) on every page, persisted via `localStorage`
- Fully responsive: mobile-first, works on phones, tablets, and desktops
=======
Every record must include:

```json
{
  "id":        "rec_0001",
  "userId":    "u_stu_001",
  "title":     "The Lean Startup",
  "author":    "Ries, Eric",
  "pages":     336,
  "tag":       "Entrepreneurship",
  "status":    "finished",
  "dateAdded": "2025-09-10",
  "notes":     "Build-Measure-Learn cycle is key.",
  "createdAt": "2025-09-10T08:00:00.000Z",
  "updatedAt": "2025-09-10T08:00:00.000Z"
}
```

All changes auto-save to `localStorage` under the key `alu:records`.

---

## Regex Catalog

| # | Rule | Pattern | Example passing | Example failing |
|---|------|---------|-----------------|-----------------|
| 1 | Title — no leading/trailing space | `/^\S(?:.*\S)?$/` | `"Factfulness"` | `" Lean "` |
| 2 | Pages — positive integer | `/^[1-9]\d*$/` | `"336"` | `"0"`, `"3.5"` |
| 3 | Date — strict YYYY-MM-DD | `/^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])$/` | `"2025-09-10"` | `"2025-13-01"` |
| 4 | Tag — letters, spaces, hyphens | `/^[A-Za-zÀ-ɏ]+(?:[ -][A-Za-zÀ-ɏ]+)*$/` | `"Design Thinking"` | `"Tag1"`, `"--bad"` |
| 5 | ISBN-10 or ISBN-13 *(alternation)* | `/^(?:\d{9}[\dX]\|\d{13})$/` | `"0307887898"`, `"9780307887894"` | `"12345"` |
| 6 | URL — positive lookahead *(advanced)* | `/^https?:\/\/(?=\S+\.\S).+/i` | `"https://alu.edu"` | `"ftp://x"`, `"alu.edu"` |
| 7 | Duplicate word — back-reference *(advanced)* | `/\b(\w+)\s+\1\b/i` | detects `"the the"` | `"the book"` |
| 8 | Author format — back-ref + negative lookahead *(advanced)* | `/^([A-Za-z'-]+…),\s+(?!\1\b)[A-Za-z'. -]+$/` | `"Ries, Eric"` | `"Ries, Ries"` |
| 9 | Email — positive lookahead | `/^(?=.*@.*\.)[^\s@]+@[^\s@]+\.[^\s@]+$/` | `"alice@alu.edu"` | `"alicealu.edu"` |
| 10 | Password — chained lookaheads *(advanced)* | `/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[\S]{8,}$/` | `"Student1!"` | `"student1"` |

Advanced patterns used: lookahead (Rules 6, 9, 10), back-reference (Rules 7, 8), chained lookaheads (Rule 10).

---

## Keyboard Map

| Key | Action |
|-----|--------|
| `Tab` | Move focus forward through interactive elements |
| `Shift + Tab` | Move focus backward |
| `Enter` / `Space` | Activate focused button or link; open modal |
| `Escape` | Close any open modal |
| `Alt + skip link` | Jump to main content (skip-to-content at top of each page) |
| Arrow keys | Navigate sidebar nav items when focused |
| `Enter` on book card | Open book detail modal |
| `Enter` on book spine | Open view modal for that record |

The full keyboard flow:
1. Tab to the Skip Link → Enter to jump to `#main-content`
2. Tab through the nav bar: Sign In, theme toggle
3. Tab into the hero search input → type a query → Enter or Tab to the search button
4. Tab through the catalog filter controls
5. Tab to any book card → Enter to open the modal
6. Within a modal: Tab cycles through action buttons; Escape closes

---

## Accessibility Notes

- **Semantic landmarks:** `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>` throughout all pages
- **Heading hierarchy:** `h1` per page → `h2` for sections → `h3` for subsections
- **Skip-to-content link:** First focusable element on every page; becomes visible on focus
- **ARIA live regions:**  
  - `role="status" aria-live="polite"` — dashboard stat updates, toast notifications  
  - `role="alert" aria-live="assertive"` — form errors, login failures  
  - Reading goal progress uses `role="progressbar"` with `aria-valuenow`
- **Labels:** Every `<input>`, `<select>`, and `<textarea>` has an associated `<label>` (explicit `for`/`id` binding)
- **Focus management:** Opening a modal moves focus to the first interactive element (close button); Escape returns focus to the trigger
- **Color contrast:** Primary navy `#0F2A5C` on white `#FFFFFF` — contrast ratio 13.7:1 (AAA); accent red `#B91C1C` on white — 7.9:1 (AAA)
- **Dark theme:** All foreground/background pairs re-evaluated in `[data-theme="dark"]` overrides
- **Keyboard-only tested** in Chrome and Firefox; all actions reachable without a mouse

---

## Running the Tests

Open `tests.html` in any modern browser. The suite runs automatically on page load with no server required.

**13 test suites, 90+ assertions covering:**
1. `validateTitle` — Rule 1: leading/trailing whitespace
2. `validatePages` — Rule 2: positive integer
3. `validateDate` — Rule 3: YYYY-MM-DD
4. `validateTag` — Rule 4: letters/spaces/hyphens
5. `validateISBN` — Rule 5: ISBN alternation (ISBN-10 / ISBN-13)
6. `validateUrl` — Rule 6: URL positive lookahead
7. `validateNotes` — Rule 7: duplicate-word back-reference
8. `validateAuthorFormat` — Rule 8: Surname ≠ Given (back-ref + negative lookahead)
9. `validateEmail` — Rule 9: email lookahead
10. `validatePassword` — Rule 10: chained lookaheads
11. `compileRegex` — safe regex compiler (try/catch, lookaheads, back-references)
12. `highlight` — HTML-safe match wrapping in `<mark>`
13. `filterAndSort` — filter by status/tag, sort by date/pages/title, regex search, bad-pattern error handling
>>>>>>> aa124d7942f8ccc6e35420a914fa3bb2a24cf2ea

---

## File Structure

```
Summative-1/
<<<<<<< HEAD
├── index.html          — Public homepage / catalog
├── login.html          — Login & registration
├── dashboard.html      — Student dashboard
├── admin.html          — Facilitator dashboard
├── tests.html          — Automated test suite
├── seed.json           — 16 seed book records
├── styles/
│   └── main.css        — All styles (CSS custom properties + responsive)
└── scripts/
    ├── storage.js      — localStorage persistence (IIFE)
    ├── validators.js   — Regex validation rules (IIFE)
    ├── auth.js         — Auth, session, profile (IIFE)
    ├── search.js       — Search, filter, sort engine (IIFE)
    ├── app.js          — Homepage controller (IIFE)
    ├── dashboard.js    — Student dashboard controller (IIFE)
    ├── admin.js        — Facilitator dashboard controller (IIFE)
    └── icons.js        — Inline SVG strings for dynamic DOM
=======
├── index.html          # Public catalog (home)
├── login.html          # Authentication (sign in / register)
├── dashboard.html      # Student dashboard
├── admin.html          # Facilitator dashboard
├── tests.html          # M3 validation test suite
├── seed.json           # 12 diverse seed records
├── sw.js               # Service worker (offline cache)
├── styles/
│   └── main.css        # Mobile-first CSS (2800+ lines)
├── scripts/
│   ├── storage.js      # IIFE: localStorage persistence, seed data, import/export
│   ├── validators.js   # IIFE: 10 regex rules + highlight + compileRegex
│   ├── auth.js         # IIFE: session, login, register, roles, theme toggle
│   ├── search.js       # IIFE: filterAndSort, filterNotes, tag stats, charts
│   ├── app.js          # IIFE: index.html catalog controller
│   ├── dashboard.js    # IIFE: student dashboard controller
│   ├── admin.js        # IIFE: facilitator dashboard controller
│   ├── icons.js        # Inline SVG strings for dynamic DOM contexts
│   ├── state.js        # Shared state helpers
│   └── ui.js           # Shared UI utilities
└── assets/
    └── .gitkeep
>>>>>>> aa124d7942f8ccc6e35420a914fa3bb2a24cf2ea
```

---

<<<<<<< HEAD
## Running Tests

Open `tests.html` in any browser. The suite runs automatically with no server needed.

Covers: validators (all 10 regex rules), search/filter/sort, localStorage persistence, auth, and highlight utilities.

---

## Accessibility

- Semantic landmarks on every page (`<header>`, `<nav>`, `<main>`, `<footer>`)
- Skip-to-content link at the top of each page
- ARIA live regions for stat updates, toasts, and form errors
- Every input has an associated `<label>`
- Focus managed when modals open/close; Escape closes any open modal
- Keyboard navigable throughout
- Contrast ratios: Navy on white 13.7:1 (AAA), Red on white 7.9:1 (AAA)
=======
## Milestones Progress

| Milestone | Status | Notes |
|-----------|--------|-------|
| M1 — Spec & Wireframes | ✅ Done | Data model, a11y plan, wireframes |
| M2 — Semantic HTML & Base CSS | ✅ Done | Mobile-first, 3+ breakpoints |
| M3 — Forms & Regex Validation | ✅ Done | 10 rules, tests.html |
| M4 — Render + Sort + Regex Search | ✅ Done | Table, cards, highlight, sort |
| M5 — Stats + Cap/Targets | ✅ Done | Dashboard stats, reading goal, ARIA live |
| M6 — Persistence + Import/Export | ✅ Done | localStorage, JSON round-trip validation |
| M7 — Polish & A11y Audit | ✅ Done | Dark mode, service worker, keyboard audit |
>>>>>>> aa124d7942f8ccc6e35420a914fa3bb2a24cf2ea

---

## Contact

<<<<<<< HEAD
**Author:** Akotet Demise
**GitHub:** https://github.com/akotet27
**Email:** a.demise@alustudent.com
=======
**Author:** Akotet Demise  
**GitHub:** https://github.com/akotet27  
**Email:** a.demise@alustudent.com  
>>>>>>> aa124d7942f8ccc6e35420a914fa3bb2a24cf2ea
**Institution:** African Leadership University (ALU)
