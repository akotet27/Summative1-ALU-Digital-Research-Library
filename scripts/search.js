/* scripts/search.js — IIFE Module: filter, sort, regex search, analytics */
;(function (App) {
  'use strict';

  App.search = {

    /* ── Library filter + sort ──────────────────────────────── */
    filterAndSort: function (records, opts) {
      opts = opts || {};
      var result = records.slice();
      var activeRe   = null;
      var regexError = null;

      if (opts.query && opts.query.trim()) {
        var compiled = App.validators.compileRegex(opts.query, opts.caseInsensitive !== false);
        activeRe   = compiled.re;
        regexError = compiled.error;
        if (activeRe) {
          result = result.filter(function (r) {
            activeRe.lastIndex = 0;
            return activeRe.test(r.title)  || activeRe.test(r.author) ||
                   activeRe.test(r.tag)    || activeRe.test(r.notes || '');
          });
        }
      }

      if (opts.status) {
        result = result.filter(function (r) { return r.status === opts.status; });
      }
      if (opts.tag) {
        result = result.filter(function (r) { return r.tag === opts.tag; });
      }

      var parts = (opts.sortBy || 'dateAdded-desc').split('-');
      var field = parts[0];
      var dir   = parts[1] || 'desc';

      result.sort(function (a, b) {
        var va = a[field] != null ? a[field] : '';
        var vb = b[field] != null ? b[field] : '';
        if (field === 'pages')    { va = Number(va);   vb = Number(vb); }
        if (field === 'dateAdded'){ va = new Date(va); vb = new Date(vb); }
        if (va < vb) return dir === 'asc' ? -1 :  1;
        if (va > vb) return dir === 'asc' ?  1 : -1;
        return 0;
      });

      return { filtered: result, re: activeRe, regexError: regexError };
    },

    /* ── Notes filter ───────────────────────────────────────── */
    filterNotes: function (notes, opts) {
      opts = opts || {};
      var result = notes.slice();

      if (opts.query && opts.query.trim()) {
        var compiled = App.validators.compileRegex(opts.query, true);
        if (compiled.re) {
          result = result.filter(function (n) {
            compiled.re.lastIndex = 0;
            return compiled.re.test(n.content || '');
          });
        }
      }
      if (opts.bookId) {
        result = result.filter(function (n) { return n.bookId === opts.bookId; });
      }

      result.sort(function (a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      return result;
    },

    /* ── Tag distribution (for facilitator charts) ──────────── */
    computeTagStats: function (records) {
      var counts = {};
      records.forEach(function (r) { counts[r.tag] = (counts[r.tag] || 0) + 1; });
      return Object.keys(counts).map(function (t) {
        return { tag: t, count: counts[t] };
      }).sort(function (a, b) { return b.count - a.count; });
    },

    /* ── Completions per day over N days ────────────────────── */
    computeCompletionsByDay: function (records, days) {
      var today = new Date();
      var result = [];
      for (var i = days - 1; i >= 0; i--) {
        var d   = new Date(today); d.setDate(d.getDate() - i);
        var key = d.toISOString().slice(0, 10);
        result.push({
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: records.filter(function (r) {
            return r.status === 'finished' && r.dateAdded === key;
          }).length
        });
      }
      return result;
    }

  };

})(window.App = window.App || {});
