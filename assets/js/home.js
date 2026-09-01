/* Subject chooser: papers grouped by course, plus recent attempt history. */
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

  function subjectCard(s) {
    var card = el('a', 'subject-card');
    card.href = 'exam.html?subject=' + encodeURIComponent(s.id);
    if (s.accent) card.style.setProperty('--card-accent', s.accent);

    var head = el('div', 'card-head');
    head.appendChild(el('span', 'icon', s.icon));
    var titles = el('div');
    titles.appendChild(el('div', 'name', s.name));
    if (s.subtitle) titles.appendChild(el('div', 'sub muted small', s.subtitle));
    head.appendChild(titles);
    card.appendChild(head);

    card.appendChild(el('div', 'desc', s.description));

    var chips = el('div', 'chips');
    if (s.badge) chips.appendChild(el('span', 'chip badge', s.badge));
    chips.appendChild(el('span', 'chip', s.questionCount + ' questions'));
    /* Time shown at the pace chosen on the start screen, so the card agrees
       with what the exam will actually give. */
    chips.appendChild(el('span', 'chip',
      MockExam.durationMinutes(s.questionCount, Store.pace()) + ' min'));
    chips.appendChild(el('span', 'chip', 'Pass ' + s.passMark + '%'));

    var best = Store.bestFor(s.id);
    if (best) chips.appendChild(el('span', 'chip best', 'Best ' + best.percent + '%'));

    var saved = Store.progress(s.id);
    if (saved && !saved.submitted && (saved.mode === 'practice' || saved.endsAt > Date.now())) {
      chips.appendChild(el('span', 'chip resume', 'In progress'));
    }

    card.appendChild(chips);
    return card;
  }

  function tally(papers) {
    var n = papers.reduce(function (t, p) { return t + p.questionCount; }, 0);
    return papers.length + (papers.length === 1 ? ' paper · ' : ' papers · ') +
      n.toLocaleString() + ' questions';
  }

  function historyRow(r) {
    var row = el('div', 'history-row');
    var left = el('div');
    left.appendChild(el('div', null, r.subjectName));
    var when = new Date(r.date);
    left.appendChild(el('div', 'muted small',
      when.toLocaleDateString() + ' · ' + when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
      ' · ' + r.correct + '/' + r.totalQuestions + ' correct' +
      (r.mode === 'practice' ? ' · practice' : '')));
    row.appendChild(left);
    row.appendChild(el('div', 'score ' + (r.passed ? 'pass' : 'fail'), r.percent + '%'));
    return row;
  }

  function render() {
    var subjects = MockExam.subjects();
    var courses = MockExam.courses();
    grid.innerHTML = '';

    if (!subjects.length) {
      var empty = el('div', 'card');
      empty.appendChild(el('h2', null, 'No papers loaded yet'));
      empty.appendChild(el('p', 'muted',
        'Put the exam PDFs in source-papers/ and run tools/convert_papers.py. See README.md.'));
      grid.appendChild(empty);
      return;
    }

    /* Any paper whose course is not listed still gets shown, under its own heading. */
    var groups = courses.slice();
    subjects.forEach(function (s) {
      if (!groups.some(function (c) { return c.id === s.course; })) {
        groups.push({ id: s.course, title: s.course || 'Other papers', accent: s.accent });
      }
    });

    groups.forEach(function (course) {
      var papers = subjects.filter(function (s) { return s.course === course.id; });
      if (!papers.length) return;

      var section = el('section', 'course');
      var head = el('div', 'course-head');
      var title = el('h2', 'course-title', course.title);
      if (course.accent) title.style.setProperty('--card-accent', course.accent);
      head.appendChild(title);
      head.appendChild(el('span', 'muted small', tally(papers)));
      section.appendChild(head);

      /* Courses can be split into subsets (MDS211 into SA1 and SA2). Papers
         with no subset are listed first, without a heading. */
      var subsets = [];
      papers.forEach(function (p) {
        var key = p.group || '';
        var found = subsets.filter(function (g) { return g.key === key; })[0];
        if (!found) subsets.push(found = { key: key, papers: [] });
        found.papers.push(p);
      });

      /* Recommended papers lead their subset, whatever order they were added
         in — a badged paper dropped in later still sits with its siblings. */
      subsets.forEach(function (subset) {
        var lead = subset.papers.filter(function (p) { return p.badge; });
        subset.papers = lead.concat(subset.papers.filter(function (p) { return !p.badge; }));
      });

      subsets.forEach(function (subset) {
        if (subset.key) {
          /* Subset headings belong to a course: SA1 is Lectures 1–16 in
             MDS211 but Lectures 1–9 in BCH212. */
          var label = el('h3', 'subset-title',
            ((MockExam.groups()[course.id] || {})[subset.key] || subset.key));
          label.appendChild(el('span', 'subset-count muted small', tally(subset.papers)));
          section.appendChild(label);
        }
        var row = el('div', 'course-grid');
        subset.papers.forEach(function (p) { row.appendChild(subjectCard(p)); });
        section.appendChild(row);
      });

      grid.appendChild(section);
    });

    var results = Store.results();
    historyList.innerHTML = '';
    statsPanel.classList.toggle('hidden', results.length === 0);
    results.slice(0, 8).forEach(function (r) { historyList.appendChild(historyRow(r)); });
  }

  render();
})();
