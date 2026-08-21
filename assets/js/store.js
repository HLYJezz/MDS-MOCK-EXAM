/* Tiny localStorage wrapper shared by the home page and the exam runner. */
(function () {
  var PREFIX = 'mds-mock:';
  function read(key, fallback) {
    try { var raw = localStorage.getItem(PREFIX + key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) {}
  }
  function drop(key) {
    try { localStorage.removeItem(PREFIX + key); } catch (e) {}
  }

  window.Store = {
    progress: function (id) { return read('progress:' + id, null); },
    saveProgress: function (id, data) { write('progress:' + id, data); },
    clearProgress: function (id) { drop('progress:' + id); },
    results: function () { return read('results', []); },
    addResult: function (result) {
      var all = read('results', []);
      all.unshift(result);
      write('results', all.slice(0, 40));
    },
    clearResults: function () { drop('results'); },
    bestFor: function (id) {
      return read('results', [])
        .filter(function (r) { return r.subjectId === id; })
        .reduce(function (best, r) { return (!best || r.percent > best.percent) ? r : best; }, null);
    },
    theme: function () { return read('theme', null); },
    setTheme: function (t) { write('theme', t); },
    /* Seconds allowed per question, chosen on the exam's start screen. */
    pace: function () { return read('pace', 45); },
    setPace: function (seconds) { write('pace', seconds); },
    /* Question reports: kept here as well as sent, so nothing is lost if the
       form is closed or the person is offline. */
    reports: function () { return read('reports', []); },
    addReport: function (report) {
      var all = read('reports', []);
      all.unshift(report);
      write('reports', all.slice(0, 100));
    },
    clearReports: function () { drop('reports'); },
    bumpReportAttempts: function (id) {
      var all = read('reports', []);
      all.forEach(function (r) { if (r.id === id) r.attempts = (r.attempts || 0) + 1; });
      write('reports', all);
    },
    markReportSent: function (id) {
      var all = read('reports', []);
      all.forEach(function (r) { if (r.id === id) r.sent = true; });
      write('reports', all);
    },
    reporterName: function () { return read('reporterName', ''); },
    setReporterName: function (n) { write('reporterName', n || ''); },
    /* 'exam' marks everything at the end; 'practice' checks each answer as it
       is given. Chosen on the start screen. */
    mode: function () { return read('mode', 'exam') === 'practice' ? 'practice' : 'exam'; },
    setMode: function (m) { write('mode', m); }
  };

  /* Apply saved theme as early as possible. */
  var saved = window.Store.theme();
  if (!saved && window.matchMedia) {
    saved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', saved || 'light');
})();
