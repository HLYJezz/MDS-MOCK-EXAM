/* First screen: the subjects, listed by year. Choosing one opens subject.html,
   which lists that subject's papers. Recent attempts are shown underneath. */
(function () {
  var grid = document.getElementById('subjectGrid');
  var statsPanel = document.getElementById('statsPanel');
  var historyList = document.getElementById('historyList');

  document.getElementById('themeToggle').addEventListener('click', function () {
    var now = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', now);
    Store.setTheme(now);
  });

  document.getElementById('clearHistory').addEventListener('click', function () {
    if (confirm('Delete all saved scores on this device?')) { Store.clearResults(); render(); }
  });

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function tally(papers) {
    var n = papers.reduce(function (t, p) { return t + p.questionCount; }, 0);
    return papers.length + (papers.length === 1 ? ' paper · ' : ' papers · ') +
      n.toLocaleString() + ' questions';
  }

  /* The subsets a course is split into, in the order its papers appear. */
  function subsetNames(course, papers) {
    var labels = MockExam.groups()[course.id] || {};
    var seen = [];
    papers.forEach(function (p) {
      var key = p.group || '';
      if (key && seen.indexOf(key) === -1) seen.push(key);
    });
    return seen.map(function (key) { return (labels[key] || key).split(' · ')[0]; });
  }

  function courseCard(course, papers) {
    var card = el('a', 'course-card');
    card.href = 'subject.html?course=' + encodeURIComponent(course.id);
    if (course.accent) card.style.setProperty('--card-accent', course.accent);

    var head = el('div', 'card-head');
    /* The icon sits in a disc of the course's own colour, which is most of what
       makes one subject look different from the next at a glance. */
    head.appendChild(MockExam.setIcon(el('span', 'icon course-icon'), course.icon || '📚'));
    var titles = el('div', 'card-titles');
    titles.appendChild(el('div', 'name', course.title));
    var parts = [tally(papers)];
    var subsets = subsetNames(course, papers);
    if (subsets.length) parts.push(subsets.join(' · '));
    titles.appendChild(el('div', 'sub muted small', parts.join(' · ')));
    head.appendChild(titles);
    card.appendChild(head);

    var chips = el('div', 'chips');

    /* A half-finished paper is the thing you most want to be told about, so
       it is called out on the subject card as well as on the paper itself. */
    var resumable = papers.filter(function (p) {
      var saved = Store.progress(p.id);
      return saved && !saved.submitted &&
        (saved.mode === 'practice' || saved.endsAt > Date.now());
    }).length;
    if (resumable) {
      chips.appendChild(el('span', 'chip resume',
        resumable === 1 ? 'In progress' : resumable + ' in progress'));
    }

    var done = papers.filter(function (p) { return Store.bestFor(p.id); }).length;
    if (done) chips.appendChild(el('span', 'chip best', done + ' of ' + papers.length + ' attempted'));

    if (chips.childNodes.length) card.appendChild(chips);
    card.appendChild(el('span', 'course-go', 'See papers →'));
    return card;
  }

  function historyRow(r) {
    var row = el('div', 'history-row');
    var left = el('div');
    left.appendChild(el('div', null, r.subjectName));
    var when = new Date(r.date);
    left.appendChild(el('div', 'muted small',
      when.toLocaleDateString() + ' · ' + when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
      ' · ' + r.correct + '/' + r.totalQuestions + ' correct' +
      (r.mode === 'practice' ? ' · practice' : '') +
      /* Say when a score was on part of a paper, so it is not read as a
         score on the whole thing. */
      (r.subset ? ' · ' + r.subset : '')));
    row.appendChild(left);
    row.appendChild(el('div', 'score ' + (r.passed ? 'pass' : 'fail'), r.percent + '%'));
    return row;
  }

  function render() {
    var subjects = MockExam.subjects();
    grid.innerHTML = '';

    if (!subjects.length) {
      var empty = el('div', 'card');
      empty.appendChild(el('h2', null, 'No papers loaded yet'));
      empty.appendChild(el('p', 'muted',
        'Put the exam PDFs in source-papers/ and run tools/convert_papers.py. See README.md.'));
      grid.appendChild(empty);
      return;
    }

    /* A course with papers but no entry in the manifest still gets listed, and
       a year that was never named still gets a heading of its own. */
    var courses = MockExam.courses().slice();
    subjects.forEach(function (s) {
      if (!courses.some(function (c) { return c.id === s.course; })) {
        courses.push({ id: s.course, title: s.course || 'Other papers', accent: s.accent, year: '' });
      }
    });

    var years = MockExam.years().slice();
    courses.forEach(function (c) {
      if (years.indexOf(c.year || '') === -1) years.push(c.year || '');
    });

    years.forEach(function (year) {
      var inYear = courses.filter(function (c) {
        return (c.year || '') === year && MockExam.papersIn(c.id).length;
      });
      if (!inYear.length) return;

      var section = el('section', 'year');
      if (year) {
        var head = el('div', 'year-head');
        head.appendChild(el('h2', 'year-title', year));
        var all = [];
        inYear.forEach(function (c) { all = all.concat(MockExam.papersIn(c.id)); });
        head.appendChild(el('span', 'muted small',
          inYear.length + (inYear.length === 1 ? ' subject · ' : ' subjects · ') + tally(all)));
        section.appendChild(head);
      }

      var row = el('div', 'course-grid');
      inYear.forEach(function (c) { row.appendChild(courseCard(c, MockExam.papersIn(c.id))); });
      section.appendChild(row);
      grid.appendChild(section);
    });

    var results = Store.results();
    historyList.innerHTML = '';
    statsPanel.classList.toggle('hidden', results.length === 0);
    results.slice(0, 8).forEach(function (r) { historyList.appendChild(historyRow(r)); });
  }

  render();
})();
