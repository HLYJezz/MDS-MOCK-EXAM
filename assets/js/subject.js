/* Second screen: the papers of one subject, split into its subsets.
   Reached from the home page as subject.html?course=MDS211. */
(function () {
  var grid = document.getElementById('paperGrid');
  var titleEl = document.getElementById('courseTitle');
  var summaryEl = document.getElementById('courseSummary');

  document.getElementById('themeToggle').addEventListener('click', function () {
    var now = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', now);
    Store.setTheme(now);
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

  function paperCard(s) {
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

  function notFound(id) {
    titleEl.textContent = 'Subject not found';
    summaryEl.textContent = id
      ? 'There are no papers here for "' + id + '".'
      : 'No subject was named in the link.';
    grid.innerHTML = '';
    var back = el('a', 'primary-btn', 'Back to subjects');
    back.href = 'index.html';
    grid.appendChild(back);
  }

  function render() {
    var id = new URLSearchParams(location.search).get('course') || '';
    var papers = MockExam.papersIn(id);
    if (!papers.length) return notFound(id);

    var course = MockExam.course(id) ||
      { id: id, title: id, accent: papers[0].accent, icon: '📚' };

    document.title = course.title + ' · MDS Mock Exam';
    titleEl.textContent = course.title;
    if (course.accent) titleEl.style.setProperty('--card-accent', course.accent);
    titleEl.classList.add('course-title-lg');
    summaryEl.textContent = tally(papers) +
      (course.year ? ' · ' + course.year : '') +
      '. Pick one to sit it under exam conditions.';

    grid.innerHTML = '';

    /* Courses can be split into subsets (MDS211 into SA1 and SA2). Papers with
       no subset are listed first, without a heading. */
    var subsets = [];
    papers.forEach(function (p) {
      var key = p.group || '';
      var found = subsets.filter(function (g) { return g.key === key; })[0];
      if (!found) subsets.push(found = { key: key, papers: [] });
      found.papers.push(p);
    });

    /* Recommended papers lead their subset, whatever order they were added in —
       a badged paper dropped in later still sits with its siblings. */
    subsets.forEach(function (subset) {
      var lead = subset.papers.filter(function (p) { return p.badge; });
      subset.papers = lead.concat(subset.papers.filter(function (p) { return !p.badge; }));
    });

    var section = el('section', 'course');
    subsets.forEach(function (subset) {
      if (subset.key) {
        /* Subset headings belong to a course: SA1 is Lectures 1–16 in MDS211
           but Lectures 1–9 in BCH212. */
        var label = el('h2', 'subset-title',
          ((MockExam.groups()[course.id] || {})[subset.key] || subset.key));
        label.appendChild(el('span', 'subset-count muted small', tally(subset.papers)));
        section.appendChild(label);
      }
      var row = el('div', 'course-grid');
      subset.papers.forEach(function (p) { row.appendChild(paperCard(p)); });
      section.appendChild(row);
    });
    grid.appendChild(section);
  }

  render();
})();
