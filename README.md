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

---

## Features

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

---

## Data Model

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

---

## File Structure

```
Summative-1/
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
```

---

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

---

## Contact

**Author:** Akotet Demise
**GitHub:** https://github.com/akotet27
**Email:** a.demise@alustudent.com
**Institution:** African Leadership University (ALU)
