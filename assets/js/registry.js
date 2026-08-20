/* Exam registry — every file in /data calls registerExam() to add a subject. */
(function () {
  window.MockExam = window.MockExam || {};
  var store = {};
  var order = [];

  function normaliseOption(opt, i) {
    var letter = String.fromCharCode(65 + i); // A, B, C…
    if (typeof opt === 'string') return { id: letter, text: opt };
    return { id: opt.id || letter, text: opt.text != null ? opt.text : String(opt) };
  }

  function normaliseQuestion(q, i) {
    var type = (q.type || (q.options ? 'single' : 'short')).toLowerCase();
    if (type === 'tf') type = 'truefalse';
    var out = {
      id: q.id || 'q' + (i + 1),
      number: i + 1,
      type: type,
      section: q.section || null,
      passage: q.passage || q.case || null,
      stem: q.stem || q.question || '',
      image: q.image || null,
      explanation: q.explanation || q.rationale || '',
      marks: typeof q.marks === 'number' ? q.marks : 1,
      options: []
    };

    if (type === 'truefalse') {
      out.options = [{ id: 'T', text: 'True' }, { id: 'F', text: 'False' }];
      var a = q.answer;
      out.answer = (a === true || a === 'T' || a === 'true' || a === 'True') ? 'T' : 'F';
    } else if (type === 'short') {
      out.answer = [].concat(q.answer).map(function (s) { return String(s); });
    } else {
      out.options = (q.options || []).map(normaliseOption);
      out.answer = type === 'multi' ? [].concat(q.answer).map(String) : String(q.answer);
    }
    return out;
  }

  window.registerExam = function (exam) {
    var id = exam.id;
    if (!id) { console.error('registerExam: subject is missing an "id"', exam); return; }
    var normalised = {
      id: id,
      name: exam.name || id,
      course: exam.course || null,
      subtitle: exam.subtitle || '',
      icon: exam.icon || '📘',
      accent: exam.accent || null,
      description: exam.description || '',
      durationMinutes: exam.durationMinutes || 60,
      passMark: typeof exam.passMark === 'number' ? exam.passMark : 50,
      shuffleQuestions: !!exam.shuffleQuestions,
      shuffleOptions: !!exam.shuffleOptions,
      sections: exam.sections || [],
      questions: (exam.questions || []).map(normaliseQuestion)
    };
    normalised.totalMarks = normalised.questions.reduce(function (s, q) { return s + q.marks; }, 0);
    if (!store[id]) order.push(id);
    store[id] = normalised;
  };

  window.MockExam.all = function () {
    return order.map(function (id) { return store[id]; });
  };
  window.MockExam.get = function (id) { return store[id] || null; };
})();
