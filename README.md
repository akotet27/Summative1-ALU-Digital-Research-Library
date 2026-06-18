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

---

## Features

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

---

## Data Model

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

---

## File Structure

```
Summative-1/
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
```

---

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

---

## Contact

**Author:** Akotet Demise  
**GitHub:** https://github.com/akotet27  
**Email:** a.demise@alustudent.com  
**Institution:** African Leadership University (ALU)
