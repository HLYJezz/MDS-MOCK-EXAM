/* Loads exam data on demand.

   data/manifest.js holds metadata only (name, question count, duration), which is
   all the home page needs. The questions for a paper are a few hundred kilobytes
   each, so exam.html loads just the one paper being sat. */
(function () {
  window.MockExam = window.MockExam || {};

  window.MockExam.subjects = function () { return window.SUBJECTS || []; };
  window.MockExam.courses = function () { return window.COURSES || []; };
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
