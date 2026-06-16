/* scripts/search.js — IIFE Module: filter, sort, and regex search */
;(function (App) {
  'use strict';

  App.search = {
    filterAndSort: function (records, opts) {
      opts = opts || {};
      var result = records.slice();
      var activeRe = null;
      var regexError = null;

      // Regex search across title, author, tag, notes
      if (opts.query && opts.query.trim()) {
        var compiled = App.validators.compileRegex(opts.query, opts.caseInsensitive !== false);
        activeRe    = compiled.re;
        regexError  = compiled.error;
        if (activeRe) {
          result = result.filter(function (r) {
            activeRe.lastIndex = 0;
            var hit = activeRe.test(r.title) || activeRe.test(r.author) ||
                      activeRe.test(r.tag)   || activeRe.test(r.notes || '');
            return hit;
          });
        }
      }

      // Status filter
      if (opts.status) {
        result = result.filter(function (r) { return r.status === opts.status; });
      }

      // Tag filter
      if (opts.tag) {
        result = result.filter(function (r) { return r.tag === opts.tag; });
      }

      // Sorting
      var parts = (opts.sortBy || 'dateAdded-desc').split('-');
      var field  = parts[0];
      var dir    = parts[1] || 'desc';

      result.sort(function (a, b) {
        var va = a[field] != null ? a[field] : '';
        var vb = b[field] != null ? b[field] : '';
        if (field === 'pages') { va = Number(va); vb = Number(vb); }
        if (field === 'dateAdded') { va = new Date(va); vb = new Date(vb); }
        if (va < vb) return dir === 'asc' ? -1 : 1;
        if (va > vb) return dir === 'asc' ?  1 : -1;
        return 0;
      });

      return { filtered: result, re: activeRe, regexError: regexError };
    }
  };
})(window.App = window.App || {});