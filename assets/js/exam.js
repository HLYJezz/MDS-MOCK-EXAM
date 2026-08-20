/* Exam runner: timer, question paper, navigator, auto-save, marking and review. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var exam = null;      // the subject definition
  var state = null;     // live attempt
  var ticker = null;

  /* ---------- helpers ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function shuffled(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function fmtClock(ms) {
    if (ms < 0) ms = 0;
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    return (h > 0 ? h + ':' : '') + pad(m) + ':' + pad(sec);
  }
  function fmtDuration(ms) {
    var s = Math.round(ms / 1000);
    if (s < 60) return s + ' sec';
    var m = Math.round(s / 60);
    return m < 60 ? m + ' min' : Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
  }
  function norm(s) {
    return String(s).toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.,;:!?'"()\-]/g, '');
  }
  function questionsInOrder() {
    return state.order.map(function (i) { return exam.questions[i]; });
  }
  function optionsFor(q) {
    var order = state.optionOrder[q.id];
    if (!order) return q.options;
    return order.map(function (oid) {
      return q.options.filter(function (o) { return o.id === oid; })[0];
    }).filter(Boolean);
  }

  /* ---------- marking ---------- */
  function isAnswered(q) {
    var a = state.answers[q.id];
    if (a == null) return false;
    if (Array.isArray(a)) return a.length > 0;
    return String(a).trim() !== '';
  }
  function isCorrect(q) {
    var given = state.answers[q.id];
    if (given == null) return false;
    if (q.type === 'multi') {
      if (!Array.isArray(given) || given.length !== q.answer.length) return false;
      return q.answer.every(function (a) { return given.indexOf(a) !== -1; });
    }
    if (q.type === 'short') {
      if (String(given).trim() === '') return false;
      return q.answer.some(function (a) { return norm(a) === norm(given); });
    }
    return String(given) === String(q.answer);
  }

  /* ---------- attempt lifecycle ---------- */
  function newAttempt() {
    var idx = exam.questions.map(function (_, i) { return i; });
    if (exam.shuffleQuestions) idx = shuffled(idx);
    var optionOrder = {};
    if (exam.shuffleOptions) {
      exam.questions.forEach(function (q) {
        if (q.type === 'single' || q.type === 'multi') {
          optionOrder[q.id] = shuffled(q.options.map(function (o) { return o.id; }));
        }
      });
    }
    state = {
      subjectId: exam.id,
      order: idx,
      optionOrder: optionOrder,
      answers: {},
      flags: [],
      current: 0,
      startedAt: Date.now(),
      endsAt: Date.now() + exam.durationMinutes * 60000,
      submitted: false
    };
    save();
  }
  function save() { if (state) Store.saveProgress(exam.id, state); }

  /* ---------- rendering: the paper ---------- */
  function renderQuestion() {
    var qs = questionsInOrder();
    var q = qs[state.current];
    var card = $('questionCard');
    card.innerHTML = '';

    var meta = el('div', 'q-meta');
    meta.appendChild(el('div', 'q-number', 'Question ' + (state.current + 1) + ' of ' + qs.length));
    var tags = el('div', 'q-tags');
    if (q.section) tags.appendChild(el('span', 'chip', sectionTitle(q.section)));
    tags.appendChild(el('span', 'chip', q.marks + (q.marks === 1 ? ' mark' : ' marks')));
    if (q.type === 'multi') tags.appendChild(el('span', 'chip', 'Select ' + q.answer.length));
    meta.appendChild(tags);
    card.appendChild(meta);

    if (q.passage) card.appendChild(el('div', 'passage', q.passage));
    card.appendChild(el('div', 'q-stem', q.stem));
    if (q.image) {
      var img = el('img', 'q-image');
      img.src = q.image;
      img.alt = 'Figure for question ' + (state.current + 1);
      card.appendChild(img);
    }

    if (q.type === 'short') {
      var input = el('input', 'short-input');
      input.type = 'text';
      input.placeholder = 'Type your answer';
      input.value = state.answers[q.id] || '';
      input.addEventListener('input', function () {
        state.answers[q.id] = input.value;
        save(); renderPalette();
      });
      card.appendChild(input);
      card.appendChild(el('div', 'hint muted small', 'Spelling is matched loosely, but write the full term.'));
    } else {
      var wrap = el('div', 'options');
      var multi = q.type === 'multi';
      optionsFor(q).forEach(function (opt) {
        var label = el('label', 'option');
        var input = el('input');
        input.type = multi ? 'checkbox' : 'radio';
        input.name = 'q-' + q.id;
        input.value = opt.id;
        var given = state.answers[q.id];
        var on = multi ? (Array.isArray(given) && given.indexOf(opt.id) !== -1) : given === opt.id;
        input.checked = on;
        if (on) label.classList.add('selected');
        input.addEventListener('change', function () {
          if (multi) {
            var list = Array.isArray(state.answers[q.id]) ? state.answers[q.id].slice() : [];
            var at = list.indexOf(opt.id);
            if (input.checked && at === -1) list.push(opt.id);
            if (!input.checked && at !== -1) list.splice(at, 1);
            state.answers[q.id] = list;
          } else {
            state.answers[q.id] = opt.id;
          }
          save();
          renderQuestion();
          renderPalette();
        });
        label.appendChild(input);
        label.appendChild(el('span', 'letter', opt.id + '.'));
        label.appendChild(el('span', null, opt.text));
        wrap.appendChild(label);
      });
      card.appendChild(wrap);
    }

    $('prevBtn').disabled = state.current === 0;
    $('nextBtn').textContent = state.current === qs.length - 1 ? 'Review & submit' : 'Next →';
    var flagged = state.flags.indexOf(q.id) !== -1;
    $('flagBtn').classList.toggle('flagged-on', flagged);
    $('flagBtn').textContent = flagged ? '⚑ Flagged' : '⚑ Flag for review';
    $('progressFill').style.width = ((state.current + 1) / qs.length * 100) + '%';
  }

  function sectionTitle(id) {
    var s = (exam.sections || []).filter(function (x) { return x.id === id; })[0];
    return s ? s.title : id;
  }

  function renderPalette() {
    var qs = questionsInOrder();
    var grid = $('paletteGrid');
    grid.innerHTML = '';
    var lastSection = null;
    qs.forEach(function (q, i) {
      if (q.section && q.section !== lastSection) {
        grid.appendChild(el('div', 'pal-section', sectionTitle(q.section)));
        lastSection = q.section;
      }
      var b = el('button', 'pal-btn', String(i + 1));
      b.type = 'button';
      if (isAnswered(q)) b.classList.add('answered');
      if (state.flags.indexOf(q.id) !== -1) b.classList.add('flagged');
      if (i === state.current) b.classList.add('current');
      b.addEventListener('click', function () { goTo(i); });
      grid.appendChild(b);
    });
    var answered = qs.filter(isAnswered).length;
    $('paletteSummary').textContent = answered + ' of ' + qs.length + ' answered · ' +
      state.flags.length + ' flagged';
  }

  function goTo(i) {
    var qs = questionsInOrder();
    state.current = Math.max(0, Math.min(qs.length - 1, i));
    if (window.innerWidth <= 860) $('palette').classList.add('collapsed');
    save();
    renderQuestion();
    renderPalette();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- timer ---------- */
  function startTimer() {
    stopTimer();
    tick();
    ticker = setInterval(tick, 1000);
  }
  function stopTimer() { if (ticker) { clearInterval(ticker); ticker = null; } }
  function tick() {
    var left = state.endsAt - Date.now();
    var t = $('timer');
    t.textContent = fmtClock(left);
    t.classList.toggle('warning', left <= 5 * 60000 && left > 60000);
    t.classList.toggle('danger', left <= 60000);
    if (left <= 0) {
      stopTimer();
      submit(true);
    }
  }

  /* ---------- submission & review ---------- */
  function submit(auto) {
    stopTimer();
    state.submitted = true;
    state.finishedAt = Date.now();
    save();
    closeModal();

    var qs = questionsInOrder();
    var correct = 0, marks = 0, blank = 0;
    qs.forEach(function (q) {
      if (!isAnswered(q)) blank++;
      if (isCorrect(q)) { correct++; marks += q.marks; }
    });
    var percent = exam.totalMarks ? Math.round(marks / exam.totalMarks * 100) : 0;
    var passed = percent >= exam.passMark;
    var timeSpent = (state.finishedAt - state.startedAt);

    Store.addResult({
      subjectId: exam.id, subjectName: exam.name, date: state.finishedAt,
      correct: correct, totalQuestions: qs.length, marks: marks,
      totalMarks: exam.totalMarks, percent: percent, passed: passed,
      timeSpentMs: timeSpent, autoSubmitted: !!auto
    });
    Store.clearProgress(exam.id);

    renderResult({
      correct: correct, blank: blank, marks: marks, percent: percent,
      passed: passed, timeSpent: timeSpent, auto: !!auto, qs: qs
    });
    showScreen('screenResult');
  }

  function renderResult(r) {
    var card = $('resultCard');
    card.innerHTML = '';
    if (r.auto) card.appendChild(el('p', 'chip resume', 'Time expired — the paper was submitted automatically.'));
    card.appendChild(el('h1', null, exam.name + ' · Results'));

    var ring = el('div', 'score-ring');
    ring.style.setProperty('--ring-deg', (r.percent * 3.6) + 'deg');
    ring.style.setProperty('--ring-color', r.passed ? 'var(--good)' : 'var(--bad)');
    var inner = el('div', 'inner');
    var innerText = el('div');
    innerText.appendChild(el('div', 'pct', r.percent + '%'));
    innerText.appendChild(el('div', 'of', r.marks + '/' + exam.totalMarks));
    inner.appendChild(innerText);
    ring.appendChild(inner);
    card.appendChild(ring);
    card.appendChild(el('div', 'verdict ' + (r.passed ? 'pass' : 'fail'),
      r.passed ? 'Pass' : 'Below the pass mark'));

    var stats = el('div', 'result-stats');
    stats.appendChild(el('span', 'chip', r.correct + ' / ' + r.qs.length + ' correct'));
    stats.appendChild(el('span', 'chip', r.marks + ' / ' + exam.totalMarks + ' marks'));
    stats.appendChild(el('span', 'chip', r.blank + ' left blank'));
    stats.appendChild(el('span', 'chip', 'Time used ' + fmtDuration(r.timeSpent)));
    stats.appendChild(el('span', 'chip', 'Pass mark ' + exam.passMark + '%'));
    card.appendChild(stats);

    var actions = el('div', 'result-actions');
    var retake = el('button', 'primary-btn', 'Retake this paper');
    retake.type = 'button';
    retake.addEventListener('click', function () { newAttempt(); startPaper(); });
    actions.appendChild(retake);
    var home = el('a', 'secondary-btn', 'Back to subjects');
    home.href = 'index.html';
    actions.appendChild(home);
    card.appendChild(actions);

    var list = $('reviewList');
    list.innerHTML = '';
    list.appendChild(el('h2', null, 'Answer review'));
    r.qs.forEach(function (q, i) { list.appendChild(reviewItem(q, i)); });
  }

  function reviewItem(q, i) {
    var answered = isAnswered(q), ok = isCorrect(q);
    var kind = !answered ? 'blank' : (ok ? 'correct' : 'wrong');
    var item = el('article', 'card review-item ' + kind);

    var meta = el('div', 'q-meta');
    meta.appendChild(el('div', 'q-number', 'Question ' + (i + 1)));
    meta.appendChild(el('span', 'tag ' + kind,
      kind === 'correct' ? 'Correct' : kind === 'wrong' ? 'Incorrect' : 'Not answered'));
    item.appendChild(meta);

    if (q.passage) item.appendChild(el('div', 'passage', q.passage));
    item.appendChild(el('div', 'q-stem', q.stem));

    if (q.type === 'short') {
      var given = el('div', 'answer-line');
      given.appendChild(el('span', 'k', 'Your answer:'));
      given.appendChild(el('span', null, answered ? state.answers[q.id] : '—'));
      item.appendChild(given);
      var right = el('div', 'answer-line');
      right.appendChild(el('span', 'k', 'Accepted:'));
      right.appendChild(el('span', null, q.answer.join(' / ')));
      item.appendChild(right);
    } else {
      var chosen = state.answers[q.id];
      var chosenList = Array.isArray(chosen) ? chosen : (chosen ? [chosen] : []);
      var correctList = Array.isArray(q.answer) ? q.answer : [q.answer];
      var box = el('div', 'opt-review');
      q.options.forEach(function (opt) {
        var isRight = correctList.indexOf(opt.id) !== -1;
        var picked = chosenList.indexOf(opt.id) !== -1;
        var row = el('div', isRight ? 'is-correct' : (picked ? 'is-chosen-wrong' : ''));
        row.textContent = opt.id + '. ' + opt.text +
          (isRight ? '  ✓ correct answer' : '') + (picked && !isRight ? '  ✗ your answer' : '');
        box.appendChild(row);
      });
      item.appendChild(box);
    }

    if (q.explanation) {
      var ex = el('div', 'explanation');
      ex.appendChild(el('strong', null, 'Explanation: '));
      ex.appendChild(document.createTextNode(q.explanation));
      item.appendChild(ex);
    }
    return item;
  }

  /* ---------- screens ---------- */
  function showScreen(id) {
    ['screenIntro', 'screenExam', 'screenResult'].forEach(function (s) {
      $(s).classList.toggle('hidden', s !== id);
    });
    var running = id === 'screenExam';
    $('timer').classList.toggle('hidden', !running);
    $('submitBtn').classList.toggle('hidden', !running);
    $('paletteToggle').classList.toggle('hidden', !running);
    $('progressFill').style.width = running ? $('progressFill').style.width : '0';
  }

  function startPaper() {
    showScreen('screenExam');
    /* On phones the navigator starts hidden behind the "Questions" button. */
    $('palette').classList.toggle('collapsed', window.innerWidth <= 860);
    renderQuestion();
    renderPalette();
    startTimer();
  }

  /* ---------- modal ---------- */
  function openModal(title, body, onConfirm, confirmText) {
    $('modalTitle').textContent = title;
    $('modalBody').textContent = body;
    $('modalConfirm').textContent = confirmText || 'Submit now';
    $('modal').classList.remove('hidden');
    $('modalConfirm').onclick = onConfirm;
  }
  function closeModal() { $('modal').classList.add('hidden'); }
  $('modalCancel').addEventListener('click', closeModal);

  function confirmSubmit() {
    var qs = questionsInOrder();
    var unanswered = qs.filter(function (q) { return !isAnswered(q); }).length;
    var msg = unanswered
      ? unanswered + ' question' + (unanswered === 1 ? ' is' : 's are') + ' still unanswered. ' +
        'You cannot change your answers after submitting.'
      : 'All questions are answered. You cannot change your answers after submitting.';
    openModal('Submit paper?', msg, function () { submit(false); });
  }

  /* ---------- wiring ---------- */
  $('prevBtn').addEventListener('click', function () { goTo(state.current - 1); });
  $('nextBtn').addEventListener('click', function () {
    if (state.current === state.order.length - 1) confirmSubmit();
    else goTo(state.current + 1);
  });
  $('flagBtn').addEventListener('click', function () {
    var q = questionsInOrder()[state.current];
    var at = state.flags.indexOf(q.id);
    if (at === -1) state.flags.push(q.id); else state.flags.splice(at, 1);
    save(); renderQuestion(); renderPalette();
  });
  $('submitBtn').addEventListener('click', confirmSubmit);
  $('paletteToggle').addEventListener('click', function () {
    $('palette').classList.toggle('collapsed');
  });
  document.addEventListener('keydown', function (e) {
    if ($('screenExam').classList.contains('hidden')) return;
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'ArrowRight' && state.current < state.order.length - 1) goTo(state.current + 1);
    if (e.key === 'ArrowLeft') goTo(state.current - 1);
  });
  window.addEventListener('beforeunload', function (e) {
    if (state && !state.submitted && !$('screenExam').classList.contains('hidden')) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  /* ---------- boot ---------- */
  function param(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function boot() {
    var id = param('subject');
    exam = id ? MockExam.get(id) : null;

    if (!exam) {
      $('examTitle').textContent = 'Paper not found';
      $('introTitle').textContent = 'That paper is not available';
      $('introDesc').textContent = id
        ? 'No subject with the id "' + id + '" is registered. Check data/manifest.js.'
        : 'No subject was selected.';
      $('startBtn').classList.add('hidden');
      showScreen('screenIntro');
      return;
    }

    document.title = exam.name + ' · MDS Mock Exam';
    $('examTitle').textContent = exam.icon + ' ' + exam.name;
    $('examSub').textContent = exam.questions.length + ' questions · ' + exam.totalMarks + ' marks';
    $('introTitle').textContent = exam.name;
    $('introDesc').textContent = exam.description;

    var facts = [
      ['Questions', exam.questions.length],
      ['Total marks', exam.totalMarks],
      ['Time allowed', exam.durationMinutes + ' minutes'],
      ['Pass mark', exam.passMark + '%']
    ];
    var ul = $('introFacts');
    ul.innerHTML = '';
    facts.forEach(function (f) {
      var li = el('li');
      li.appendChild(el('span', 'k', f[0]));
      li.appendChild(el('span', 'v', String(f[1])));
      ul.appendChild(li);
    });

    var saved = Store.progress(exam.id);
    if (saved && !saved.submitted && saved.endsAt > Date.now()) {
      var resume = $('resumeBtn');
      resume.classList.remove('hidden');
      resume.textContent = 'Resume saved attempt (' + fmtClock(saved.endsAt - Date.now()) + ' left)';
      resume.addEventListener('click', function () { state = saved; startPaper(); });
      $('startBtn').textContent = 'Start a fresh attempt';
    }

    $('startBtn').addEventListener('click', function () { newAttempt(); startPaper(); });
    showScreen('screenIntro');
  }

  MockExam.ready(boot);
})();
