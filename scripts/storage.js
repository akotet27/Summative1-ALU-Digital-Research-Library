/* scripts/storage.js — IIFE Module: localStorage persistence */
;(function (App) {
  'use strict';
  var RECORDS_KEY  = 'alu:records';
  var SETTINGS_KEY = 'alu:settings';

  App.storage = {
    loadRecords: function () {
      try { return JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]'); }
      catch (e) { return []; }
    },
    saveRecords: function (records) {
      localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    },
    loadSettings: function () {
      try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); }
      catch (e) { return {}; }
    },
    saveSettings: function (settings) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    },
    clearAll: function () {
      localStorage.removeItem(RECORDS_KEY);
      localStorage.removeItem(SETTINGS_KEY);
    },
    validateImport: function (data) {
      if (!Array.isArray(data)) return false;
      return data.every(function (r) {
        return typeof r.id === 'string' &&
               typeof r.title === 'string' &&
               typeof r.author === 'string' &&
               r.pages !== undefined &&
               typeof r.tag === 'string' &&
               typeof r.status === 'string' &&
               typeof r.dateAdded === 'string' &&
               typeof r.createdAt === 'string';
      });
    }
  };
})(window.App = window.App || {});