/* scripts/state.js — IIFE Module: single source of truth */
;(function (App) {
  'use strict';

  var records  = App.storage.loadRecords();
  var settings = Object.assign({ goal: 0, ppm: 1.5 }, App.storage.loadSettings());
  var role     = App.storage.loadRole();
  var notes    = App.storage.loadNotes();

  App.state = {

    /* ── Records ─────────────────────────────────────────────── */
    getRecords: function () { return records; },

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

    toggleRecommended: function (id) {
      var rec = records.find(function (r) { return r.id === id; });
      if (!rec) return;
      App.state.updateRecord(id, { recommended: !rec.recommended });
    },

    generateId: function () {
      var num = String(records.length + 1).padStart(4, '0');
      return 'rec_' + num + '_' + Date.now().toString(36);
    },

    /* ── Settings ────────────────────────────────────────────── */
    getSettings: function () { return settings; },

    updateSettings: function (updates) {
      settings = Object.assign({}, settings, updates);
      App.storage.saveSettings(settings);
    },

    /* ── Role ────────────────────────────────────────────────── */
    getRole: function () { return role; },

    setRole: function (newRole) {
      role = newRole === 'facilitator' ? 'facilitator' : 'student';
      App.storage.saveRole(role);
    },

    /* ── Notes ───────────────────────────────────────────────── */
    getNotes: function () { return notes; },

    addNote: function (note) {
      notes.push(note);
      App.storage.saveNotes(notes);
    },

    updateNote: function (id, updates) {
      var idx = notes.findIndex(function (n) { return n.id === id; });
      if (idx === -1) return false;
      notes[idx] = Object.assign({}, notes[idx], updates, { updatedAt: new Date().toISOString() });
      App.storage.saveNotes(notes);
      return notes[idx];
    },

    deleteNote: function (id) {
      notes = notes.filter(function (n) { return n.id !== id; });
      App.storage.saveNotes(notes);
    },

    generateNoteId: function () {
      return 'note_' + Date.now().toString(36) + '_' +
             Math.random().toString(36).slice(2, 6);
    }
  };

})(window.App = window.App || {});
