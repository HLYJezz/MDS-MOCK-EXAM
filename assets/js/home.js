/* Subject chooser: renders one card per registered subject plus attempt history. */
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

  function subjectCard(exam) {
    var card = el('a', 'subject-card');
    card.href = 'exam.html?subject=' + encodeURIComponent(exam.id);
    if (exam.accent) card.style.setProperty('--card-accent', exam.accent);

    card.appendChild(el('div', 'icon', exam.icon));
    card.appendChild(el('div', 'name', exam.name));
    card.appendChild(el('div', 'desc', exam.description));

    var chips = el('div', 'chips');
    chips.appendChild(el('span', 'chip', exam.questions.length + ' questions'));
    chips.appendChild(el('span', 'chip', exam.durationMinutes + ' min'));
    chips.appendChild(el('span', 'chip', 'Pass ' + exam.passMark + '%'));

    var best = Store.bestFor(exam.id);
    if (best) chips.appendChild(el('span', 'chip best', 'Best ' + best.percent + '%'));

    var saved = Store.progress(exam.id);
    if (saved && !saved.submitted) chips.appendChild(el('span', 'chip resume', 'In progress'));

    card.appendChild(chips);
    return card;
  }

  function historyRow(r) {
    var row = el('div', 'history-row');
    var left = el('div');
    left.appendChild(el('div', null, r.subjectName));
    var when = new Date(r.date);
    left.appendChild(el('div', 'muted small',
      when.toLocaleDateString() + ' · ' + when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
      ' · ' + r.correct + '/' + r.totalQuestions + ' correct'));
    row.appendChild(left);
    row.appendChild(el('div', 'score ' + (r.passed ? 'pass' : 'fail'), r.percent + '%'));
    return row;
  }

  function render() {
    var exams = MockExam.all();
    grid.innerHTML = '';
    if (!exams.length) {
      var empty = el('div', 'card');
      empty.appendChild(el('h2', null, 'No papers loaded yet'));
      empty.appendChild(el('p', 'muted',
        'Add a subject file inside the data/ folder and list it in data/manifest.js. ' +
        'See README.md for the question format.'));
      grid.appendChild(empty);
    } else {
      exams.forEach(function (e) { grid.appendChild(subjectCard(e)); });
    }

    var results = Store.results();
    historyList.innerHTML = '';
    statsPanel.classList.toggle('hidden', results.length === 0);
    results.slice(0, 8).forEach(function (r) { historyList.appendChild(historyRow(r)); });
  }

  MockExam.ready(render);
})();
