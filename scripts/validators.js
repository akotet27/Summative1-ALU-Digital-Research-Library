/* scripts/validators.js — IIFE Module: regex validation rules
 *
 * Regex Catalog:
 * 1. Title:  /^\S(?:.*\S)?$/  — no leading/trailing spaces
 * 2. Author: /^[A-Za-z][A-Za-z.\s-]*[A-Za-z.]$/  — letters, dots, hyphens
 * 3. Pages:  /^[1-9]\d*$/  — whole number > 0
 * 4. Date:   /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/  — YYYY-MM-DD
 * 5. Tag:    /^(?!.*--)[A-Za-z]+(?:[ -][A-Za-z]+)*$/ ADVANCED lookahead (no --)
 * 6. Notes:  /\b(\w+)\s+\1\b/i  ADVANCED back-reference (duplicate words)
 * 7. Search: compileRegex() — safe user-supplied pattern with try/catch
 */
;(function (App) {
  'use strict';

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
  }

  App.validators = {

    // 1. Title — no leading/trailing spaces, no double spaces, max 200 chars
    validateTitle: function (v) {
      if (!v || !v.trim()) return 'Title is required.';
      var t = v.trim();
      if (!/^\S(?:.*\S)?$/.test(t)) return 'Title must not have leading or trailing spaces.';
      if (/\s{2,}/.test(t)) return 'Title must not have consecutive spaces.';
      if (t.length > 200) return 'Title must be 200 characters or fewer.';
      return null;
    },

    // 2. Author — letters, dots, hyphens
    validateAuthor: function (v) {
      if (!v || !v.trim()) return 'Author is required.';
      var t = v.trim();
      if (!/^[A-Za-z][A-Za-z.\s-]*[A-Za-z.]$/.test(t))
        return 'Author should contain only letters, spaces, hyphens, or periods (e.g. "J.K. Rowling").';
      if (t.length > 120) return 'Author must be 120 characters or fewer.';
      return null;
    },

    // 3. Pages — whole number greater than 0
    validatePages: function (v) {
      if (!v || !String(v).trim()) return 'Page count is required.';
      if (!/^[1-9]\d*$/.test(String(v).trim())) return 'Pages must be a whole number greater than 0.';
      if (parseInt(v, 10) > 50000) return 'Page count seems too large.';
      return null;
    },

    // 4. Date — YYYY-MM-DD with basic month/day validation
    validateDate: function (v) {
      if (!v || !v.trim()) return 'Date is required.';
      if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v.trim()))
        return 'Date must be in YYYY-MM-DD format (e.g. 2025-09-01).';
      return null;
    },

    // 5. Tag — ADVANCED lookahead: forbids double hyphens (--)
    validateTag: function (v) {
      if (!v || !v.trim()) return 'Tag is required.';
      var t = v.trim();
      if (!/^(?!.*--)[A-Za-z]+(?:[ -][A-Za-z]+)*$/.test(t))
        return 'Tag must contain only letters, single spaces or single hyphens (e.g. "Research Methods").';
      if (t.length > 50) return 'Tag must be 50 characters or fewer.';
      return null;
    },

    // 6. Notes — ADVANCED back-reference: catches duplicate consecutive words
    validateNotes: function (v) {
      if (!v) return null;
      var dup = v.match(/\b(\w+)\s+\1\b/i);
      if (dup) return 'Duplicate word detected: "' + dup[0] + '" — did you mean to write it twice?';
      return null;
    },

    // Status
    validateStatus: function (v) {
      if (!['want', 'reading', 'finished'].includes(v)) return 'Please select a reading status.';
      return null;
    },

    // Run all validations at once
    validateRecord: function (f) {
      var v = App.validators;
      var errors = {};
      var pairs = [
        ['title',  v.validateTitle(f.title)],
        ['author', v.validateAuthor(f.author)],
        ['pages',  v.validatePages(f.pages)],
        ['date',   v.validateDate(f.date)],
        ['tag',    v.validateTag(f.tag)],
        ['status', v.validateStatus(f.status)],
        ['notes',  v.validateNotes(f.notes)],
      ];
      pairs.forEach(function (p) { if (p[1]) errors[p[0]] = p[1]; });
      return { errors: errors, isValid: Object.keys(errors).length === 0 };
    },

    // 7. Safe regex compiler for search
    compileRegex: function (input, caseInsensitive) {
      if (!input || !input.trim()) return { re: null, error: null };
      try {
        var flags = caseInsensitive !== false ? 'gi' : 'g';
        return { re: new RegExp(input.trim(), flags), error: null };
      } catch (e) {
        return { re: null, error: 'Invalid regex: ' + e.message };
      }
    },

    // Highlight matches in text, returns safe HTML string
    highlight: function (text, re) {
      if (!re || !text) return escapeHtml(text || '');
      re.lastIndex = 0;
      return String(text).replace(re, function (m) { return '<mark>' + escapeHtml(m) + '</mark>'; });
    },

    normalizeTitle: function (v) {
      return v.trim().replace(/\s{2,}/g, ' ');
    },

    escapeHtml: escapeHtml
  };
})(window.App = window.App || {});