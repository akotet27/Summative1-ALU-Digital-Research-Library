/* scripts/state.js — IIFE Module: single source of truth */
;(function (App) {
  'use strict';

  var records  = App.storage.loadRecords();
  var settings = Object.assign({ goal: 0, ppm: 1.5 }, App.storage.loadSettings());

  App.state = {
    getRecords:  function () { return records; },
    getSettings: function () { return settings; },

    addRecord: function (record) {
      records.push(record);
      App.storage.saveRecords(records);
    },

    updateRecord: function (id, updates) {
      var idx = records.findIndex(function (r) { return r.id === id; });
      if (idx === -1) return false;
      records[idx] = Object.assign({}, records[idx], updates, { updatedAt: new Date().toISOString() });
      App.storage.saveRecords(records);
      return records[idx];
    },

    deleteRecord: function (id) {
      records = records.filter(function (r) { return r.id !== id; });
      App.storage.saveRecords(records);
    },

    replaceAll: function (newRecords) {
      records = newRecords;
      App.storage.saveRecords(records);
    },

    updateSettings: function (updates) {
      settings = Object.assign({}, settings, updates);
      App.storage.saveSettings(settings);
    },

    generateId: function () {
      var num = String(records.length + 1).padStart(4, '0');
      return 'rec_' + num + '_' + Date.now().toString(36);
    }
  };
})(window.App = window.App || {});