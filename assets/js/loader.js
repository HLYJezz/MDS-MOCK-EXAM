/* Loads exam data on demand.

   data/manifest.js holds metadata only (name, question count, duration), which is
   all the home page needs. The questions for a paper are a few hundred kilobytes
   each, so exam.html loads just the one paper being sat. */
(function () {
  window.MockExam = window.MockExam || {};

  /* The pace choices offered on the exam's start screen. */
  window.MockExam.PACES = [
    { seconds: 30, label: '30 sec' },
    { seconds: 45, label: '45 sec' },
    { seconds: 60, label: '1 min' },
    { seconds: 75, label: '1 min 15' },
    { seconds: 90, label: '1 min 30' }
  ];

  /* Total time for a paper, rounded to the nearest 5 minutes. */
  window.MockExam.durationMinutes = function (questionCount, secondsEach) {
    return Math.max(5, Math.round(questionCount * secondsEach / 60 / 5) * 5);
  };

  window.MockExam.subjects = function () { return window.SUBJECTS || []; };
  window.MockExam.courses = function () { return window.COURSES || []; };
  window.MockExam.groups = function () { return window.GROUPS || {}; };
  window.MockExam.years = function () { return window.YEARS || []; };
  window.MockExam.course = function (id) {
    return (window.COURSES || []).filter(function (c) { return c.id === id; })[0] || null;
  };
  /* The papers of one course, in the order the manifest lists them. */
  window.MockExam.papersIn = function (courseId) {
    return window.MockExam.subjects().filter(function (s) { return s.course === courseId; });
  };
  window.MockExam.subjectMeta = function (id) {
    return (window.SUBJECTS || []).filter(function (s) { return s.id === id; })[0] || null;
  };

  /* Load one paper's questions, then call done(exam) — or done(null) if it fails. */
  window.MockExam.load = function (id, done) {
    var meta = window.MockExam.subjectMeta(id);
    if (!meta) return done(null);
    if (window.MockExam.get(id)) return done(window.MockExam.get(id));

    var s = document.createElement('script');
    s.src = meta.file;
    s.onload = function () { done(window.MockExam.get(id)); };
    s.onerror = function () {
      console.error('Could not load ' + meta.file);
      done(null);
    };
    document.head.appendChild(s);
  };
})();
