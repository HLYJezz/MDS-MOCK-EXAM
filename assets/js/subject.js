/* Second screen: the papers of one subject, split into its subsets.
   Reached from the home page as subject.html?course=MDS211. */
(function () {
  var grid = document.getElementById('paperGrid');
  var titleEl = document.getElementById('courseTitle');
  var summaryEl = document.getElementById('courseSummary');

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

  /* Papers often end their subtitle with their own question count — "Real SA1
     structure · 77 questions" — which now sits directly under a line already
     saying "77 questions · 60 min". Saying it twice reads as carelessness, so
     the repeat is dropped from the subtitle, where it is the less useful of
     the two. Only an exactly matching count goes; anything else is left alone. */
  function trimmedSubtitle(s) {
    var sub = (s.subtitle || '').trim();
    if (!sub) return '';
    var parts = sub.split('·').map(function (p) { return p.trim(); });
    var kept = parts.filter(function (p) {
      var m = /^(\d+)\s+questions?$/i.exec(p);
      return !(m && parseInt(m[1], 10) === s.questionCount);
    });
    return (kept.length ? kept : parts).join(' · ');
  }

  function paperCard(s) {
    var card = el('a', 'subject-card');
    card.href = 'exam.html?subject=' + encodeURIComponent(s.id);
    if (s.accent) card.style.setProperty('--card-accent', s.accent);

    var head = el('div', 'card-head');
    head.appendChild(MockExam.setIcon(el('span', 'icon paper-icon'), s.icon));
    var titles = el('div', 'card-titles');
    titles.appendChild(el('div', 'name', s.name));
    /* Size and length are what you compare papers by, so they sit under the
       title as plain text rather than competing with everything else as pills.
       The time is at the pace chosen on the start screen, so the card agrees
       with what the exam will actually give. */
    titles.appendChild(el('div', 'card-facts muted small',
      s.questionCount + ' questions · ' +
      MockExam.durationMinutes(s.questionCount, Store.pace()) + ' min'));
    var sub = trimmedSubtitle(s);
    if (sub) titles.appendChild(el('div', 'sub muted small', sub));
    head.appendChild(titles);
    card.appendChild(head);

    card.appendChild(el('div', 'desc', s.description));

    /* Only what is worth noticing gets a chip: the recommendation, and whatever
       is true of you in particular. The pass mark is 60% on all 24 papers, so
       printing it on every card said nothing; it is on the start screen. */
    var chips = el('div', 'chips');
    if (s.badge) chips.appendChild(el('span', 'chip badge', s.badge));

    var saved = Store.progress(s.id);
    if (saved && !saved.submitted && (saved.mode === 'practice' || saved.endsAt > Date.now())) {
      chips.appendChild(el('span', 'chip resume', 'In progress'));
    }
    var best = Store.bestFor(s.id);
    if (best) {
      chips.appendChild(el('span', 'chip best' + (best.passed ? '' : ' below'),
        'Best ' + best.percent + '%'));
    }

    if (chips.childNodes.length) card.appendChild(chips);
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
    /* The whole page is tinted with the course's colour, so opening MDS211
       looks different from opening BCH212 before you have read a word. */
    if (course.accent) {
      document.getElementById('courseBanner').style.setProperty('--card-accent', course.accent);
      document.body.style.setProperty('--card-accent', course.accent);
    }
    MockExam.setIcon(document.getElementById('courseIcon'), course.icon || '📚');
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
