/* scripts/validators.js — IIFE Module: validation, normalization, regex utilities
 *
 * Regex catalog:
 *  1. Title no-leading/trailing-space:   /^\S(?:.*\S)?$/
 *  2. Pages positive integer:            /^[1-9]\d*$/
 *  3. Date YYYY-MM-DD (strict):          /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
 *  4. Tag letters/spaces/hyphens:        /^[A-Za-zÀ-ɏ]+(?:[ -][A-Za-zÀ-ɏ]+)*$/
 *  5. ISBN-10 or ISBN-13 (alternation):  /^(?:\d{9}[\dX]|\d{13})$/
 *  6. URL positive lookahead (advanced): /^https?:\/\/(?=\S+\.\S).+/i
 *  7. Duplicate word back-reference:     /\b(\w+)\s+\1\b/i   (advanced)
 *  8. Author "Surname, Given" back-ref:  prevents Given == Surname  (advanced)
 */
;(function (App) {
  'use strict';

  var VALID_STATUSES = ['want', 'reading', 'finished'];

  /* ── HTML safety ─────────────────────────────────────────────── */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Highlight regex matches with <mark> ─────────────────────── */
  function highlight(text, re) {
    if (!re) return escapeHtml(text);
    var parts = [];
    var last = 0;
    var searchRe = new RegExp(re.source, re.ignoreCase ? 'ig' : 'g');
    var m;
    while ((m = searchRe.exec(text)) !== null) {
      parts.push(escapeHtml(text.slice(last, m.index)));
      parts.push('<mark>' + escapeHtml(m[0]) + '</mark>');
      last = m.index + m[0].length;
      if (m[0].length === 0) { searchRe.lastIndex++; }
    }
    parts.push(escapeHtml(text.slice(last)));
    return parts.join('');
  }

  /* ── Field validators ───────────────────────────────────────── */

  /* Rule 1: no leading/trailing whitespace, min 2 chars */
  function validateTitle(v) {
    if (!v || !v.trim()) return 'Title is required.';
    if (!/^\S(?:.*\S)?$/.test(v))
      return 'Title must not start or end with a space.';
    if (v.trim().length < 2) return 'Title must be at least 2 characters.';
    if (v.trim().length > 200) return 'Title must be 200 characters or fewer.';
    return '';
  }

  function validateAuthor(v) {
    if (!v || !v.trim()) return 'Author is required.';
    if (v.trim().length > 150) return 'Author must be 150 characters or fewer.';
    return '';
  }

  /* Rule 2: positive integer only */
  function validatePages(v) {
    if (!v || !v.toString().trim()) return 'Pages is required.';
    if (!/^[1-9]\d*$/.test(v.toString().trim()))
      return 'Pages must be a positive whole number (no decimals).';
    if (parseInt(v, 10) > 99999) return 'Pages value seems too large.';
    return '';
  }

  /* Rule 3: strict date YYYY-MM-DD */
  function validateDate(v) {
    if (!v || !v.trim()) return 'Date is required.';
    if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v.trim()))
      return 'Date must be in YYYY-MM-DD format with a valid month/day.';
    var d = new Date(v.trim() + 'T00:00:00');
    if (isNaN(d.getTime())) return 'Enter a valid calendar date.';
    return '';
  }

  /* Rule 4: tag letters, spaces, hyphens (unicode-aware) */
  function validateTag(v) {
    if (!v || !v.trim()) return 'Tag is required.';
    if (!/^[A-Za-zÀ-ɏ]+(?:[ -][A-Za-zÀ-ɏ]+)*$/.test(v.trim()))
      return 'Tag must contain only letters, spaces, or hyphens.';
    if (v.trim().length > 50) return 'Tag must be 50 characters or fewer.';
    return '';
  }

  function validateStatus(v) {
    if (!v || VALID_STATUSES.indexOf(v) === -1) return 'Select a valid status.';
    return '';
  }

  function validateNotes(v) {
    if (!v) return '';
    if (v.length > 2000) return 'Notes must be 2000 characters or fewer.';
    /* Advanced Rule 7: duplicate-word back-reference */
    var dup = detectDuplicateWords(v);
    if (dup) return dup;
    return '';
  }

  /* Rule 5 (alternation): ISBN-10 or ISBN-13 */
  function validateISBN(v) {
    if (!v || !v.trim()) return ''; /* optional */
    var clean = v.trim().replace(/[-\s]/g, '');
    if (!/^(?:\d{9}[\dX]|\d{13})$/.test(clean))
      return 'Invalid ISBN — must be 10 or 13 digits (hyphens OK).';
    return '';
  }

  /* Rule 6 (advanced — positive lookahead): URL protocol + domain */
  function validateUrl(v) {
    if (!v || !v.trim()) return ''; /* optional */
    /* Lookahead (?=\S+\.\S) ensures a domain dot exists after the host */
    if (!/^https?:\/\/(?=\S+\.\S).+/i.test(v.trim()))
      return 'URL must start with http:// or https:// and include a domain.';
    return '';
  }

  /* Rule 8 (advanced — back-reference): "Surname, Given" where Given ≠ Surname */
  function validateAuthorFormat(v) {
    if (!v || !v.trim() || v.indexOf(',') === -1) return '';
    /* Capture Surname, then negative lookahead prevents Given starting with same token */
    var pattern = /^([A-Za-zÀ-ɏ'-]+(?:\s[A-Za-zÀ-ɏ'-]+)*),\s+(?!\1\b)[A-Za-zÀ-ɏ'. -]+$/;
    if (!pattern.test(v.trim()))
      return 'When using a comma, format must be "Surname, Given Name" (Given ≠ Surname).';
    return '';
  }

  /* Advanced Rule 7: detect duplicate consecutive words */
  function detectDuplicateWords(text) {
    if (!text) return '';
    var m = text.match(/\b(\w+)\s+\1\b/i);
    return m ? 'Duplicate word detected: "' + m[0] + '"' : '';
  }

  /* ── Composite validator ────────────────────────────────────── */
  function validateRecord(f) {
    var errors = {
      title:  validateTitle(f.title),
      author: validateAuthor(f.author),
      pages:  validatePages(f.pages),
      date:   validateDate(f.date),
      tag:    validateTag(f.tag),
      status: validateStatus(f.status),
      notes:  validateNotes(f.notes),
    };
    var isValid = Object.keys(errors).every(function (k) { return !errors[k]; });
    return { isValid: isValid, errors: errors };
  }

  /* ── Normalizers ────────────────────────────────────────────── */
  function normalizeTitle(t) {
    if (!t) return '';
    /* Collapse multiple spaces */
    return t.trim().replace(/\s+/g, ' ');
  }

  /* ── Safe regex compiler ────────────────────────────────────── */
  function compileRegex(query, caseInsensitive) {
    try {
      var flags = caseInsensitive ? 'ig' : 'g';
      return { re: new RegExp(query, flags), error: null };
    } catch (e) {
      return { re: null, error: e.message };
    }
  }

  /* ── Email (advanced: lookahead ensures domain dot) ─────────── */
  function validateEmail(v) {
    if (!v || !v.trim()) return 'Email is required.';
    /* Positive lookahead (?=.*@.*\.) ensures @ exists and a dot follows */
    if (!/^(?=.*@.*\.)[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim().toLowerCase()))
      return 'Enter a valid email address (e.g. name@domain.com).';
    return '';
  }

  /* ── Password (advanced: multiple lookaheads) ────────────────── */
  /* Rule: min 8 chars, ≥1 uppercase, ≥1 digit, ≥1 special char */
  function validatePassword(v) {
    if (!v) return 'Password is required.';
    if (v.length < 8) return 'Password must be at least 8 characters.';
    /* Chained positive lookaheads: uppercase + digit + special */
    if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[\S]{8,}$/.test(v))
      return 'Needs uppercase, number & special character (!@#$%^&*).';
    return '';
  }

  /* ── Public API ─────────────────────────────────────────────── */
  App.validators = {
    escapeHtml:           escapeHtml,
    highlight:            highlight,
    validateTitle:        validateTitle,
    validateAuthor:       validateAuthor,
    validatePages:        validatePages,
    validateDate:         validateDate,
    validateTag:          validateTag,
    validateStatus:       validateStatus,
    validateNotes:        validateNotes,
    validateISBN:         validateISBN,
    validateUrl:          validateUrl,
    validateAuthorFormat: validateAuthorFormat,
    detectDuplicateWords: detectDuplicateWords,
    validateRecord:       validateRecord,
    normalizeTitle:       normalizeTitle,
    compileRegex:         compileRegex,
    validateEmail:        validateEmail,
    validatePassword:     validatePassword,
  };

})(window.App = window.App || {});
