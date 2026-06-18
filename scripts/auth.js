/* scripts/auth.js — IIFE Module: authentication (register/login/session/profile) */
;(function (App) {
  'use strict';

  var SESSION_TTL = 24 * 60 * 60 * 1000; /* 24 hours */

  var CLASSES = [
    { id: 'BSE-FY', label: 'BSE — Software Engineering (Final Year)' },
    { id: 'BEL-FY', label: 'BEL — Entrepreneurial Leadership (Final Year)' },
    { id: 'IBT-FY', label: 'IBT — International Business & Trade (Final Year)' },
  ];

  /* ── Theme helper (runs before any DOM) ──────────────────── */
  function applyTheme() {
    var t = App.storage.loadTheme();
    document.documentElement.setAttribute('data-theme', t);
  }

  function toggleTheme() {
    var current = App.storage.loadTheme();
    var next    = current === 'dark' ? 'light' : 'dark';
    App.storage.saveTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    /* Update all toggle button labels on the page */
    document.querySelectorAll('.theme-toggle').forEach(function (btn) {
      updateThemeBtn(btn, next);
    });
  }

  function updateThemeBtn(btn, theme) {
    if (!btn) return;
    btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    btn.querySelector('.theme-toggle__label').textContent = theme === 'dark' ? 'Light' : 'Dark';
    var icon = btn.querySelector('.theme-toggle__icon');
    if (icon) {
      icon.innerHTML = theme === 'dark'
        ? '<path d="M12 3v1m0 16v1m8.66-13h-1M4.34 12H3.34m14.95 5.66-.71-.71M6.34 6.34l-.71-.71m12.02 0-.71.71M6.34 17.66l-.71.71M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"/>'
        : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    }
  }

  function wireThemeToggles() {
    var theme = App.storage.loadTheme();
    document.querySelectorAll('.theme-toggle').forEach(function (btn) {
      updateThemeBtn(btn, theme);
      btn.addEventListener('click', function () { toggleTheme(); });
    });
  }

  /* ── Session ──────────────────────────────────────────────── */
  function getSession() {
    var sess = App.storage.loadSession();
    if (!sess) return null;
    if (Date.now() > sess.expiresAt) {
      App.storage.clearSession();
      return null;
    }
    return sess;
  }

  function requireAuth(role) {
    var sess = getSession();
    if (!sess) {
      window.location.href = 'login.html';
      return null;
    }
    if (role && sess.role !== role) {
      window.location.href = sess.role === 'facilitator' ? 'admin.html' : 'dashboard.html';
      return null;
    }
    return sess;
  }

  /* ── Register ─────────────────────────────────────────────── */
  function register(data) {
    var v = App.validators;

    if (!data.name || !data.name.trim())  return { ok: false, error: 'Full name is required.' };
    if (!data.class)                       return { ok: false, error: 'Please select your class.' };
    if (!data.mission || !data.mission.trim()) return { ok: false, error: 'Capstone mission is required.' };

    var emailErr = v.validateEmail(data.email);
    if (emailErr) return { ok: false, error: emailErr };

    var pwErr = v.validatePassword(data.password);
    if (pwErr) return { ok: false, error: pwErr };

    if (data.password !== data.confirmPassword)
      return { ok: false, error: 'Passwords do not match.' };

    var users = App.storage.loadUsers();
    if (users.find(function (u) { return u.email === data.email.toLowerCase().trim(); }))
      return { ok: false, error: 'That email is already registered. Try logging in.' };

    var now  = new Date().toISOString();
    var user = {
      id:           'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5),
      name:         data.name.trim(),
      email:        data.email.toLowerCase().trim(),
      passwordHash: btoa(data.password),
      role:         'student',
      class:        data.class,
      mission:      data.mission.trim(),
      missionDesc:  (data.missionDesc || '').trim(),
      bio:          (data.bio || '').trim(),
      createdAt:    now,
      updatedAt:    now,
    };
    users.push(user);
    App.storage.saveUsers(users);
    return { ok: true, user: user };
  }

  /* ── Login ────────────────────────────────────────────────── */
  function login(email, password) {
    if (!email || !password)
      return { ok: false, error: 'Email and password are required.' };

    var users = App.storage.loadUsers();
    var user  = users.find(function (u) {
      return u.email === email.toLowerCase().trim();
    });

    if (!user)                         return { ok: false, error: 'No account found with that email.' };
    if (user.passwordHash !== btoa(password)) return { ok: false, error: 'Incorrect password.' };

    var sess = {
      userId:    user.id,
      role:      user.role,
      name:      user.name,
      email:     user.email,
      class:     user.class,
      mission:   user.mission,
      expiresAt: Date.now() + SESSION_TTL,
    };
    App.storage.saveSession(sess);
    return { ok: true, session: sess, user: user };
  }

  /* ── Logout ───────────────────────────────────────────────── */
  function logout() {
    App.storage.clearSession();
    window.location.href = 'login.html';
  }

  /* ── Update profile ───────────────────────────────────────── */
  function updateProfile(userId, updates) {
    var users = App.storage.loadUsers();
    var idx   = users.findIndex(function (u) { return u.id === userId; });
    if (idx === -1) return { ok: false, error: 'User not found.' };

    if (updates.newPassword) {
      var pwErr = App.validators.validatePassword(updates.newPassword);
      if (pwErr) return { ok: false, error: pwErr };
      if (updates.newPassword !== updates.confirmPassword)
        return { ok: false, error: 'New passwords do not match.' };
      /* Verify current password */
      if (users[idx].passwordHash !== btoa(updates.currentPassword || ''))
        return { ok: false, error: 'Current password is incorrect.' };
      users[idx].passwordHash = btoa(updates.newPassword);
    }

    if (updates.name)    users[idx].name    = updates.name.trim();
    if (updates.mission) users[idx].mission = updates.mission.trim();
    if (updates.bio !== undefined) users[idx].bio = updates.bio.trim();
    if (updates.class)   users[idx].class   = updates.class;

    users[idx].updatedAt = new Date().toISOString();
    App.storage.saveUsers(users);

    /* Refresh session with new values */
    var sess = App.storage.loadSession();
    if (sess && sess.userId === userId) {
      sess.name    = users[idx].name;
      sess.mission = users[idx].mission;
      sess.class   = users[idx].class;
      App.storage.saveSession(sess);
    }
    return { ok: true, user: users[idx] };
  }

  /* ── Avatars (initial letters) ───────────────────────────── */
  function initials(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }

  /* ── Public API ──────────────────────────────────────────── */
  App.auth = {
    classes:       CLASSES,
    init:          function () { App.storage.seed(); applyTheme(); },
    applyTheme:    applyTheme,
    toggleTheme:   toggleTheme,
    wireThemeToggles: wireThemeToggles,
    getSession:    getSession,
    requireAuth:   requireAuth,
    register:      register,
    login:         login,
    logout:        logout,
    updateProfile: updateProfile,
    initials:      initials,
    getUsers:      function () { return App.storage.loadUsers(); },
    getUserById:   function (id) {
      return App.storage.loadUsers().find(function (u) { return u.id === id; }) || null;
    },
  };

})(window.App = window.App || {});
