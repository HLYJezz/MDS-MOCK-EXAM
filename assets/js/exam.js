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
  /* Options as the candidate sees them. When the paper shuffles its options the
     letters are re-lettered A, B, C… down the page, so the labels stay in order;
     the option's own id is what gets stored and marked. */
  function optionsFor(q) {
    var order = state.optionOrder[q.id];
    var list = q.options;
    if (order) {
      list = order.map(function (oid) {
        return q.options.filter(function (o) { return o.id === oid; })[0];
      }).filter(Boolean);
    }
    return list.map(function (o, i) {
      return { id: o.id, text: o.text, letter: order ? String.fromCharCode(65 + i) : o.id };
    });
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

  /* ---------- choosing what to sit ----------
     An attempt does not have to be the whole paper. The lecture picker on the
     start screen, the "Practise" button on a lecture in the results, and
     "Retry what you got wrong" all do the same thing: start an attempt from a
     subset of the paper's questions. Everything after that — the timer, the
     marking, the breakdown — works off the attempt, not off the paper. */
  var chosen = null;        // section ids to include, or null for all of them

  /* The paper's sections that actually carry questions.

     Numbered by lecture where every section is — papers list their sections in
     the order the questions happen to appear, which can run 17, 18, 20, 19, and
     someone looking for "Lecture 19" should not have to hunt for it. Sections
     that are not all numbered keep the paper's own order. */
  function lectures() {
    var out = [];
    exam.questions.forEach(function (q) {
      if (!q.section) return;
      var found = out.filter(function (s) { return s.id === q.section; })[0];
      if (!found) out.push(found = { id: q.section, title: sectionTitle(q.section), count: 0 });
      found.count++;
    });
    var numbers = out.map(function (s) {
      var m = /^Lectures?\s+(\d+)/i.exec(s.title);
      return m ? parseInt(m[1], 10) : null;
    });
    if (numbers.every(function (n) { return n !== null; })) {
      out = out.map(function (s, i) { return { s: s, n: numbers[i], i: i }; })
        .sort(function (a, b) { return (a.n - b.n) || (a.i - b.i); })
        .map(function (x) { return x.s; });
    }
    return out;
  }

  /* Indexes into exam.questions for the chosen lectures (all of them if null). */
  function indexesFor(sectionIds) {
    var all = exam.questions.map(function (_, i) { return i; });
    if (!sectionIds) return all;
    return all.filter(function (i) {
      return sectionIds.indexOf(exam.questions[i].section) !== -1;
    });
  }

  /* How many questions the next attempt would have, before one exists. */
  function plannedCount() {
    return state ? state.order.length : indexesFor(chosen).length;
  }

  /* Marks available in this attempt — a subset is worth less than the paper. */
  function attemptMarks() {
    return questionsInOrder().reduce(function (t, q) { return t + q.marks; }, 0);
  }

  /* A short description of a partial attempt, for the results and the history. */
  function subsetLabel(sectionIds) {
    if (!sectionIds) return null;
    if (sectionIds.length === 1) return sectionTitle(sectionIds[0]);
    return sectionIds.length + ' of ' + lectures().length + ' lectures';
  }

  /* ---------- attempt lifecycle ---------- */
  /* Minutes allowed at the pace the candidate picked, for however many
     questions the attempt actually holds. */
  function plannedMinutes(count) {
    return MockExam.durationMinutes(count == null ? plannedCount() : count, Store.pace());
  }

  /* opts: { indexes, label } — used by "retry what you got wrong", which picks
     its questions directly rather than by lecture. */
  function newAttempt(opts) {
    opts = opts || {};
    var idx = opts.indexes || indexesFor(chosen);
    var label = opts.label !== undefined ? opts.label : subsetLabel(chosen);
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
      revealed: [],        // practice mode: questions whose answer has been confirmed
      current: 0,
      startedAt: Date.now(),
      mode: Store.mode(),
      endsAt: Store.mode() === 'practice' ? null : Date.now() + plannedMinutes(idx.length) * 60000,
      secondsPerQuestion: Store.pace(),
      /* Set when this is part of the paper rather than all of it, so the score
         is never mistaken for a score on the whole thing. */
      subset: label || null,
      submitted: false
    };
    save();
  }
  function save() { if (state) Store.saveProgress(exam.id, state); }

  /* A report carries the recorded answer only when the reader has already seen
     it — otherwise the prefilled form would hand them the answer mid-exam. */
  function reportContext(q, index, answerVisible) {
    var opts = optionsFor(q);
    var given = state.answers[q.id];
    var givenText = '';
    if (q.type === 'short') givenText = given || '';
    else if (given != null) {
      givenText = [].concat(given).map(function (id) {
        var o = opts.filter(function (x) { return x.id === id; })[0];
        return o ? o.letter + '. ' + o.text : id;
      }).join(', ');
    }
    var recorded = '';
    if (answerVisible) {
      recorded = q.type === 'short'
        ? [].concat(q.answer).join(' / ')
        : [].concat(q.answer).map(function (id) {
            var o = opts.filter(function (x) { return x.id === id; })[0];
            return o ? o.letter + '. ' + o.text : id;
          }).join(', ');
    }
    return {
      paper: exam.id, paperName: exam.name,
      questionId: q.id, questionNumber: index + 1,
      stem: q.stem,
      options: opts.map(function (o) { return o.letter + '. ' + o.text; }),
      givenAnswer: givenText,
      recordedAnswer: recorded,
      mode: state.mode || 'exam'
    };
  }

  function reportButton(q, index, answerVisible) {
    var b = el('button', 'report-btn', '⚠ Report a problem');
    b.type = 'button';
    b.title = 'Tell the author this question looks wrong';
    b.addEventListener('click', function (e) {
      e.preventDefault();
      Feedback.open(reportContext(q, index, answerVisible));
    });
    return b;
  }

  /* The paper's icon beside its name in the header, drawn the same way as on
     the cards rather than left as an emoji. */
  function setTitleIcon(icon, name) {
    var host = $('examTitle');
    host.textContent = '';
    if (window.MockExam && MockExam.setIcon) {
      host.appendChild(MockExam.setIcon(el('span', 'icon title-icon'), icon));
    }
    host.appendChild(el('span', null, name));
  }

  /* ---------- rendering: the paper ---------- */
  function renderQuestion() {
    var qs = questionsInOrder();
    var q = qs[state.current];
    /* The companion's clock belongs to the question on screen, so it starts
       again here and whenever an answer is given. */
    if (window.Companion) Companion.reset(exam.id + ':' + q.id);
    var card = $('questionCard');
    card.innerHTML = '';

    var meta = el('div', 'q-meta');
    meta.appendChild(el('div', 'q-number', 'Question ' + (state.current + 1) + ' of ' + qs.length));
    var tags = el('div', 'q-tags');
    if (q.section) {
      var sec = el('span', 'chip section', sectionTitle(q.section));
      sec.title = sectionTitle(q.section);   // full text on hover; the chip truncates
      tags.appendChild(sec);
    }
    tags.appendChild(el('span', 'chip', q.marks + (q.marks === 1 ? ' mark' : ' marks')));
    if (q.type === 'multi') tags.appendChild(el('span', 'chip', 'Select ' + q.answer.length));
    meta.appendChild(tags);
    card.appendChild(meta);

    /* The papers mark some of their own questions as doubtful; say so up front
       rather than leaving it buried in the explanation. Neither message hints
       at which option is right. */
    if (q.flag) {
      var warn = el('div', 'q-warning');
      warn.appendChild(el('span', 'q-warning-icon', '⚠'));
      warn.appendChild(el('span', null, q.flag === 'no-figure'
        ? 'The original paper showed a figure here that the archive did not capture, so this question may not be answerable as written.'
        : 'The source marks this question as uncertain — its wording or recorded answer may be arguable.'));
      card.appendChild(warn);
    }

    if (q.passage) card.appendChild(el('div', 'passage', q.passage));
    card.appendChild(el('div', 'q-stem', q.stem));
    if (q.image) {
      var img = el('img', 'q-image');
      img.src = q.image;
      img.alt = 'Figure for question ' + (state.current + 1);
      card.appendChild(img);
    }

    var revealedNow = isRevealed(q);

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
      if (revealedNow) {
        input.disabled = true;
        var right = el('div', 'reveal ' + (isCorrect(q) ? 'right' : 'wrong'));
        right.appendChild(el('span', 'tag ' + (isCorrect(q) ? 'correct' : 'wrong'),
          isCorrect(q) ? 'Correct' : 'Incorrect'));
        var acc = el('div', 'answer-line');
        acc.appendChild(el('span', 'k', 'Accepted:'));
        acc.appendChild(el('span', null, [].concat(q.answer).join(' / ')));
        right.appendChild(acc);
        if (q.explanation) {
          var exs = el('div', 'explanation');
          exs.appendChild(el('strong', null, 'Explanation: '));
          exs.appendChild(document.createTextNode(q.explanation));
          right.appendChild(exs);
        }
        card.appendChild(right);
      }
    } else {
      var wrap = el('div', 'options');
      var multi = q.type === 'multi';
      /* In practice mode an answered question is marked there and then, and
         locked so the revealed answer cannot be edited afterwards. */
      var revealed = isRevealed(q);
      var correctList = Array.isArray(q.answer) ? q.answer : [q.answer];
      optionsFor(q).forEach(function (opt) {
        var label = el('label', 'option');
        var input = el('input');
        input.type = multi ? 'checkbox' : 'radio';
        input.name = 'q-' + q.id;
        input.value = opt.id;
        var given = state.answers[q.id];
        var on = multi ? (Array.isArray(given) && given.indexOf(opt.id) !== -1) : given === opt.id;
        input.checked = on;
        var mark = '';
        if (revealed) {
          input.disabled = true;
          if (correctList.indexOf(opt.id) !== -1) {
            label.classList.add('is-correct');
            mark = on ? '✓ your answer' : '✓ correct answer';
          } else if (on) {
            label.classList.add('is-chosen-wrong');
            mark = '✗ your answer';
          }
        } else if (on) {
          label.classList.add('selected');   // plain highlight until it is marked
        }
        input.addEventListener('change', function () {
          if (window.Companion) Companion.reset(exam.id + ':' + q.id);
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
        label.appendChild(el('span', 'letter', opt.letter + '.'));
        label.appendChild(el('span', null, opt.text));
        if (mark) label.appendChild(el('span', 'mark', mark));
        wrap.appendChild(label);
      });
      card.appendChild(wrap);

      if (revealed) {
        var verdict = isCorrect(q);
        var box = el('div', 'reveal ' + (verdict ? 'right' : 'wrong'));
        box.appendChild(el('span', 'tag ' + (verdict ? 'correct' : 'wrong'),
          verdict ? 'Correct' : 'Incorrect'));
        if (q.explanation) {
          var ex = el('div', 'explanation');
          ex.appendChild(el('strong', null, 'Explanation: '));
          ex.appendChild(document.createTextNode(q.explanation));
          box.appendChild(ex);
        }
        card.appendChild(box);
      }
    }

    card.appendChild(reportButton(q, state.current, revealedNow));

    var confirmBtn = $('confirmBtn');
    confirmBtn.classList.toggle('hidden', !isPractice() || revealedNow);
    confirmBtn.disabled = !isAnswered(q);
    confirmBtn.textContent = isAnswered(q) ? 'Confirm answer' : 'Choose an answer';
    $('nextBtn').classList.toggle('secondary-btn', isPractice() && !revealedNow);
    $('nextBtn').classList.toggle('primary-btn', !(isPractice() && !revealedNow));

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
    var showSections = !exam.shuffleQuestions;   // headings mean nothing once shuffled
    qs.forEach(function (q, i) {
      if (showSections && q.section && q.section !== lastSection) {
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
    if (isPractice()) return renderTally();   // practice mode runs without a clock
    tick();
    ticker = setInterval(tick, 1000);
  }

  /* Practice mode shows how many are right so far where the clock would be. */
  function renderTally() {
    var qs = questionsInOrder();
    var answered = qs.filter(isRevealed);
    var right = answered.filter(isCorrect).length;
    var t = $('timer');
    t.classList.remove('warning', 'danger');
    t.classList.add('tally');
    t.textContent = answered.length ? right + ' / ' + answered.length : 'Practice';
    t.title = 'Correct so far';
  }
  function stopTimer() { if (ticker) { clearInterval(ticker); ticker = null; } }
  function tick() {
    var left = state.endsAt - Date.now();
    var t = $('timer');
    t.classList.remove('tally');     // a practice attempt may have set this
    t.title = 'Time remaining';
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
    var available = attemptMarks();
    var percent = available ? Math.round(marks / available * 100) : 0;
    var passed = percent >= exam.passMark;
    var timeSpent = (state.finishedAt - state.startedAt);

    Store.addResult({
      subjectId: exam.id, subjectName: exam.name, date: state.finishedAt,
      mode: state.mode || 'exam',
      correct: correct, totalQuestions: qs.length, marks: marks,
      totalMarks: available, percent: percent, passed: passed,
      /* Scoring 100% on one lecture is not a 100% on the paper, so a partial
         attempt is kept in the history but never counted as a best score. */
      subset: state.subset || null,
      timeSpentMs: timeSpent, autoSubmitted: !!auto
    });
    Store.clearProgress(exam.id);

    renderResult({
      correct: correct, blank: blank, marks: marks, percent: percent,
      passed: passed, timeSpent: timeSpent, auto: !!auto, qs: qs
    });
    showScreen('screenResult');
  }

  /* ---------- results: how each lecture went ----------
     A total tells you whether you passed; it does not tell you what to revise.
     Grouping the same answers by the lecture they came from does, so the
     breakdown is listed weakest first — the top of the list is tonight's work. */
  function byLecture(qs) {
    var order = (exam.sections || []).map(function (s) { return s.id; });
    var rows = [];
    qs.forEach(function (q) {
      if (!q.section) return;
      var row = rows.filter(function (x) { return x.id === q.section; })[0];
      if (!row) rows.push(row = { id: q.section, title: sectionTitle(q.section), total: 0, correct: 0 });
      row.total++;
      if (isCorrect(q)) row.correct++;
    });
    rows.forEach(function (row) { row.percent = Math.round(row.correct / row.total * 100); });
    /* Weakest first; a tie is settled by the bigger lecture, then by the order
       the paper itself lists them, so the ranking never wobbles between runs. */
    rows.sort(function (a, b) {
      return (a.percent - b.percent) || (b.total - a.total) ||
             (order.indexOf(a.id) - order.indexOf(b.id));
    });
    return rows;
  }

  function lectureBreakdown(r) {
    var rows = byLecture(r.qs);
    if (rows.length < 2) return null;      // nothing to compare against

    var wrap = el('section', 'breakdown');
    var head = el('div', 'breakdown-head');
    head.appendChild(el('h2', null, 'How each lecture went'));

    var weak = rows.filter(function (x) { return x.percent < exam.passMark; });
    head.appendChild(el('p', 'muted small', weak.length
      ? 'Weakest first. ' + weak.length + ' of ' + rows.length +
        (weak.length === 1 ? ' lecture is' : ' lectures are') +
        ' below the ' + exam.passMark + '% pass mark — start there.'
      : 'Weakest first. Every lecture is at or above the ' + exam.passMark + '% pass mark.'));
    wrap.appendChild(head);

    var list = el('div', 'breakdown-list');
    rows.forEach(function (row) {
      var band = row.percent < exam.passMark ? 'bad'
               : row.percent < 80 ? 'warn' : 'good';
      var item = el('div', 'breakdown-row ' + band);

      var top = el('div', 'breakdown-label');
      var name = el('span', 'breakdown-name', row.title);
      name.title = row.title;                 // the full title, which the row truncates
      top.appendChild(name);
      top.appendChild(el('span', 'breakdown-score',
        row.correct + '/' + row.total + ' · ' + row.percent + '%'));
      /* The whole point of knowing a lecture is weak is being able to go and
         work on it, so the row starts that attempt itself. */
      var drill = el('button', 'breakdown-drill', 'Practise');
      drill.type = 'button';
      drill.title = 'Sit only ' + row.title;
      drill.addEventListener('click', function () {
        chosen = [row.id];
        newAttempt();
        startPaper();
      });
      top.appendChild(drill);
      item.appendChild(top);

      var bar = el('div', 'breakdown-bar');
      var fill = el('div', 'breakdown-fill');
      fill.style.width = Math.max(row.percent, 2) + '%';   // a sliver, so 0% still reads as a bar
      bar.appendChild(fill);
      item.appendChild(bar);

      list.appendChild(item);
    });
    wrap.appendChild(list);
    return wrap;
  }

  function renderResult(r) {
    var card = $('resultCard');
    card.innerHTML = '';
    if (r.auto) card.appendChild(el('p', 'chip resume', 'Time expired — the paper was submitted automatically.'));
    card.appendChild(el('h1', null, exam.name + ' · Results'));
    if (state.subset) {
      card.appendChild(el('p', 'muted subset-note',
        'This was ' + state.subset + ' — ' + r.qs.length + ' of the paper\'s ' +
        exam.questions.length + ' questions, so it is not counted as a score on the whole paper.'));
    }

    var ring = el('div', 'score-ring');
    ring.style.setProperty('--ring-deg', (r.percent * 3.6) + 'deg');
    ring.style.setProperty('--ring-color', r.passed ? 'var(--good)' : 'var(--bad)');
    var inner = el('div', 'inner');
    var innerText = el('div');
    innerText.appendChild(el('div', 'pct', r.percent + '%'));
    innerText.appendChild(el('div', 'of', r.marks + '/' + attemptMarks()));
    inner.appendChild(innerText);
    ring.appendChild(inner);
    card.appendChild(ring);
    card.appendChild(el('div', 'verdict ' + (r.passed ? 'pass' : 'fail'),
      r.passed ? 'Pass' : 'Below the pass mark'));

    var stats = el('div', 'result-stats');
    stats.appendChild(el('span', 'chip', r.correct + ' / ' + r.qs.length + ' correct'));
    stats.appendChild(el('span', 'chip', r.marks + ' / ' + attemptMarks() + ' marks'));
    stats.appendChild(el('span', 'chip', r.blank + ' left blank'));
    stats.appendChild(el('span', 'chip', 'Time used ' + fmtDuration(r.timeSpent)));
    stats.appendChild(el('span', 'chip', 'Pass mark ' + exam.passMark + '%'));
    if (isPractice()) stats.appendChild(el('span', 'chip badge', 'Practice'));
    card.appendChild(stats);

    var actions = el('div', 'result-actions');

    /* Redoing only what you got wrong is the point of reading a review, so it
       is the first thing offered — and it is only offered when there is
       something to redo. */
    var missed = r.qs.filter(function (q) { return !isCorrect(q); });
    if (missed.length) {
      var again = el('button', 'primary-btn',
        'Retry the ' + missed.length + ' you got wrong');
      again.type = 'button';
      again.addEventListener('click', function () {
        var ids = missed.map(function (q) { return q.id; });
        newAttempt({
          indexes: exam.questions.map(function (_, i) { return i; })
            .filter(function (i) { return ids.indexOf(exam.questions[i].id) !== -1; }),
          label: 'the ' + missed.length + ' you got wrong'
        });
        startPaper();
      });
      actions.appendChild(again);
    }

    var retake = el('button', missed.length ? 'secondary-btn' : 'primary-btn',
      state.subset ? 'Sit the whole paper' : 'Retake this paper');
    retake.type = 'button';
    retake.addEventListener('click', function () {
      chosen = null;
      newAttempt();
      startPaper();
    });
    actions.appendChild(retake);
    var home = el('a', 'secondary-btn', backTo.label);
    home.href = backTo.href;
    actions.appendChild(home);
    card.appendChild(actions);

    var list = $('reviewList');
    list.innerHTML = '';
    var breakdown = lectureBreakdown(r);
    if (breakdown) list.appendChild(breakdown);
    list.appendChild(el('h2', null, 'Answer review'));
    r.qs.forEach(function (q, i) { list.appendChild(reviewItem(q, i)); });
  }

  function reviewItem(q, i) {
    var answered = isAnswered(q), ok = isCorrect(q);
    var kind = !answered ? 'blank' : (ok ? 'correct' : 'wrong');
    var item = el('article', 'card review-item ' + kind);

    var meta = el('div', 'q-meta');
    meta.appendChild(el('div', 'q-number', 'Question ' + (i + 1)));
    /* Which lecture this came from, same chip as on the paper itself: reading
       back through the review, the tag says where to go and revise. */
    var tags = el('div', 'q-tags');
    if (q.section) {
      var sec = el('span', 'chip section', sectionTitle(q.section));
      sec.title = sectionTitle(q.section);   // full text on hover; the chip truncates
      tags.appendChild(sec);
    }
    tags.appendChild(el('span', 'tag ' + kind,
      kind === 'correct' ? 'Correct' : kind === 'wrong' ? 'Incorrect' : 'Not answered'));
    meta.appendChild(tags);
    item.appendChild(meta);

    if (q.flag) {
      var rwarn = el('div', 'q-warning');
      rwarn.appendChild(el('span', 'q-warning-icon', '⚠'));
      rwarn.appendChild(el('span', null, q.flag === 'no-figure'
        ? 'This question depended on a figure the archive did not capture.'
        : 'The source marks this question as uncertain — its recorded answer may be arguable.'));
      item.appendChild(rwarn);
    }
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
      optionsFor(q).forEach(function (opt) {
        var isRight = correctList.indexOf(opt.id) !== -1;
        var picked = chosenList.indexOf(opt.id) !== -1;
        var row = el('div', isRight ? 'is-correct' : (picked ? 'is-chosen-wrong' : ''));
        row.textContent = opt.letter + '. ' + opt.text +
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
    item.appendChild(reportButton(q, i, true));
    return item;
  }

  var MODES = [
    { id: 'exam', label: 'Exam', blurb: 'Timed, with the score and answers at the end — like the real paper.' },
    { id: 'practice', label: 'Practice',
      blurb: 'Answer, then confirm to reveal whether you were right, with the explanation. Untimed.' }
  ];

  /* Marking mode. Practice reveals each answer as it is given, so it runs
     without a countdown: a deadline while you are reading explanations would
     work against the point of it. */
  function renderModePicker(onChange) {
    var box = $('modeOptions');
    box.innerHTML = '';
    MODES.forEach(function (mode) {
      var b = el('button', 'mode-btn');
      b.type = 'button';
      b.appendChild(el('span', 'mode-name', mode.label));
      b.appendChild(el('span', 'mode-blurb', mode.blurb));
      b.setAttribute('aria-pressed', String(Store.mode() === mode.id));
      if (Store.mode() === mode.id) b.classList.add('selected');
      b.addEventListener('click', function () {
        Store.setMode(mode.id);
        renderModePicker(onChange);
        onChange();
      });
      box.appendChild(b);
    });
    $('paceBlock').classList.toggle('hidden', Store.mode() === 'practice');
  }

  function isPractice() { return (state ? state.mode : Store.mode()) === 'practice'; }

  /* Practice mode holds the answer back until it is confirmed, so a choice can
     still be changed while thinking it over. */
  function isRevealed(q) {
    return isPractice() && state.revealed && state.revealed.indexOf(q.id) !== -1;
  }

  function confirmAnswer() {
    var q = questionsInOrder()[state.current];
    if (!isPractice() || isRevealed(q) || !isAnswered(q)) return;
    if (!state.revealed) state.revealed = [];   // attempts saved before this existed
    state.revealed.push(q.id);
    save();
    renderQuestion();
    renderPalette();
    renderTally();
  }

  /* The rules describe whichever mode is selected, so the start screen never
     promises a countdown that practice mode will not show. */
  function renderRules() {
    var practice = Store.mode() === 'practice';
    var rules = practice
      ? ['Choose an answer, then press Confirm to reveal it with the explanation.',
         'You can change your choice freely until you confirm it, and not after.',
         'There is no time limit — the header keeps a running score instead.',
         'You can move freely between questions and flag any for review.',
         'Answers are saved as you go — if the tab closes, reopen it to resume.']
      : ['Choose your time per question above; the total is worked out for you.',
         'The timer starts as soon as you press Start exam and does not pause.',
         'You can move freely between questions and flag any question for review.',
         'The paper is submitted automatically when the time runs out.',
         'Answers are saved as you go — if the tab closes, reopen it to resume.'];
    $('rulesTitle').textContent = practice ? 'How practice works' : 'Exam rules';
    var ul = $('rulesList');
    ul.innerHTML = '';
    rules.forEach(function (r) { ul.appendChild(el('li', null, r)); });
    /* Keep the "fresh" wording when a saved attempt is offered alongside. */
    $('startBtn').textContent = $('startBtn').dataset.freshLabel
      ? (practice ? 'Start a fresh practice' : 'Start a fresh attempt')
      : (practice ? 'Start practice' : 'Start exam');
  }

  /* The pace picker on the start screen. The choice is remembered across papers
     and only affects attempts started afterwards — a resumed attempt keeps the
     time it was given when it began. */
  function renderPacePicker(onChange) {
    var box = $('paceOptions');
    box.innerHTML = '';
    MockExam.PACES.forEach(function (pace) {
      var b = el('button', 'pace-btn', pace.label);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(Store.pace() === pace.seconds));
      if (Store.pace() === pace.seconds) b.classList.add('selected');
      b.addEventListener('click', function () {
        Store.setPace(pace.seconds);
        renderPacePicker(onChange);
        onChange();
      });
      box.appendChild(b);
    });
    var n = plannedCount();
    $('paceSummary').textContent =
      n + (n === 1 ? ' question at ' : ' questions at ') + currentPaceLabel() + ' each · ' +
      fmtDuration(plannedMinutes() * 60000) + ' in total.';
  }

  /* The lecture picker on the start screen: tick the lectures you want and the
     attempt holds only those. Hidden for a paper with nothing to choose
     between. Not remembered between papers — it is a decision about this
     sitting, unlike the pace and the marking mode. */
  function renderLecturePicker(onChange) {
    var all = lectures();
    var block = $('lectureBlock');
    if (all.length < 2) { block.classList.add('hidden'); return; }
    block.classList.remove('hidden');

    var box = $('lectureOptions');
    box.innerHTML = '';
    all.forEach(function (lec) {
      var on = !chosen || chosen.indexOf(lec.id) !== -1;
      var label = el('label', 'lecture-opt' + (on ? ' selected' : ''));
      var input = el('input');
      input.type = 'checkbox';
      input.checked = on;
      input.addEventListener('change', function () {
        var picked = all.filter(function (l) {
          var box2 = box.querySelector('input[data-id="' + l.id + '"]');
          return box2 && box2.checked;
        }).map(function (l) { return l.id; });
        /* All of them ticked is the same as no filter at all. */
        chosen = picked.length === all.length ? null : picked;
        renderLecturePicker(onChange);
        onChange();
      });
      input.dataset.id = lec.id;
      label.appendChild(input);
      var text = el('span', 'lecture-opt-text');
      text.appendChild(el('span', 'lecture-opt-name', lec.title));
      text.appendChild(el('span', 'lecture-opt-count muted small',
        lec.count + (lec.count === 1 ? ' question' : ' questions')));
      label.appendChild(text);
      box.appendChild(label);
    });

    var picked = chosen ? chosen.length : all.length;
    var n = plannedCount();
    $('lectureSummary').textContent = n
      ? picked + ' of ' + all.length + ' lectures · ' + n +
        (n === 1 ? ' question' : ' questions')
      : 'No lectures selected — tick at least one to start.';
    $('lectureAll').textContent = chosen ? 'Select all' : 'Clear all';
    $('startBtn').disabled = n === 0;
  }

  function currentPaceLabel() {
    var found = MockExam.PACES.filter(function (p) { return p.seconds === Store.pace(); })[0];
    return found ? found.label : Store.pace() + ' sec';
  }

  /* ---------- screens ---------- */
  function showScreen(id) {
    if (window.Companion && id !== 'screenExam') Companion.stop();
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
    $('examSub').textContent = (exam.course ? exam.course + ' · ' : '') +
      state.order.length + ' questions' + (state.subset ? ' · ' + state.subset : '');
    showScreen('screenExam');
    /* Hidden if that is what was chosen last time, and on a phone by default,
       where a grid of 60 numbers above the question is not a help. */
    setPalette(Store.paletteHidden() || window.innerWidth <= 860);
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
  $('confirmBtn').addEventListener('click', confirmAnswer);
  $('submitBtn').addEventListener('click', confirmSubmit);
  /* The navigator folds away at any width, not just on a phone, for anyone who
     wants nothing on screen but the question. The choice is remembered. */
  function setPalette(hidden) {
    $('palette').classList.toggle('collapsed', hidden);
    document.body.classList.toggle('palette-off', hidden);
    var b = $('paletteToggle');
    b.textContent = hidden ? 'Questions' : 'Hide list';
    b.setAttribute('aria-pressed', String(!hidden));
    b.title = hidden ? 'Show the question navigator' : 'Hide the question navigator';
  }
  $('paletteToggle').addEventListener('click', function () {
    var hidden = !$('palette').classList.contains('collapsed');
    Store.setPaletteHidden(hidden);
    setPalette(hidden);
  });
  document.addEventListener('keydown', function (e) {
    if ($('screenExam').classList.contains('hidden')) return;
    if (e.target.tagName === 'INPUT') return;
    /* A dialog is in front: the arrows belong to it, not to the paper
       underneath, which the reader cannot even see. */
    if (document.querySelector('.modal:not(.hidden)')) return;
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

  /* Going back lands on the subject's paper list, not the front page, so the
     obvious next move is another paper in the same subject. */
  var backTo = { href: 'index.html', label: 'Back to subjects' };

  function setBackTo(course) {
    if (course) {
      backTo = { href: 'subject.html?course=' + encodeURIComponent(course),
                 label: 'Back to ' + course + ' papers' };
    }
    ['backLink', 'introBack'].forEach(function (id) {
      var a = $(id);
      if (!a) return;
      a.href = backTo.href;
      a.title = backTo.label;
      if (id === 'introBack') a.textContent = backTo.label;
    });
  }

  function boot(loaded) {
    var id = param('subject');
    exam = loaded || null;

    if (!exam) {
      $('examTitle').textContent = 'Paper not found';
      $('introTitle').textContent = 'That paper is not available';
      $('introDesc').textContent = id
        ? 'The paper "' + id + '" could not be loaded. It may have been renamed — go back and pick it again.'
        : 'No paper was selected.';
      $('startBtn').classList.add('hidden');
      showScreen('screenIntro');
      return;
    }

    document.title = exam.name + ' · MDS Mock Exam';
    setBackTo(exam.course);
    setTitleIcon(exam.icon, exam.name);
    $('examSub').textContent = (exam.course ? exam.course + ' · ' : '') +
      exam.questions.length + ' questions';
    $('introTitle').textContent = exam.name;
    $('introDesc').textContent = exam.description;

    var everyQuestionOneMark = exam.totalMarks === exam.questions.length;
    function renderFacts() {
      var facts = [
        ['Questions', plannedCount() === exam.questions.length
          ? exam.questions.length
          : plannedCount() + ' of ' + exam.questions.length],
        ['Time allowed', Store.mode() === 'practice' ? 'Untimed'
                                                     : fmtDuration(plannedMinutes() * 60000)],
        ['Pass mark', exam.passMark + '%'],
        everyQuestionOneMark ? ['Format', 'Single best answer']
                             : ['Total marks', exam.totalMarks]
      ];
      var ul = $('introFacts');
      ul.innerHTML = '';
      facts.forEach(function (f) {
        var li = el('li');
        li.appendChild(el('span', 'k', f[0]));
        li.appendChild(el('span', 'v', String(f[1])));
        ul.appendChild(li);
      });
    }
    function refresh() { renderFacts(); renderPacePicker(renderFacts); }
    renderFacts();
    renderModePicker(function () { renderRules(); refresh(); });
    renderRules();
    renderLecturePicker(refresh);
    renderPacePicker(renderFacts);

    $('lectureAll').addEventListener('click', function () {
      chosen = chosen ? null : [];      // "Select all" when filtered, else clear
      renderLecturePicker(refresh);
      refresh();
    });

    var saved = Store.progress(exam.id);
    if (saved && !saved.submitted && (saved.mode === 'practice' || saved.endsAt > Date.now())) {
      var resume = $('resumeBtn');
      resume.classList.remove('hidden');
      resume.textContent = saved.mode === 'practice'
        ? 'Resume saved practice'
        : 'Resume saved attempt (' + fmtClock(saved.endsAt - Date.now()) + ' left)';
      resume.addEventListener('click', function () { state = saved; startPaper(); });
      $('startBtn').dataset.freshLabel = '1';
      renderRules();      // relabels the button for the selected mode
    }

    $('startBtn').addEventListener('click', function () { newAttempt(); startPaper(); });
    showScreen('screenIntro');
  }

  /* The questions for one paper are a few hundred KB, so they load here rather
     than on the home page. */
  var wanted = param('subject');
  var meta = wanted && MockExam.subjectMeta(wanted);
  if (meta) {
    setBackTo(meta.course);
    setTitleIcon(meta.icon, meta.name);
    $('introTitle').textContent = meta.name;
    $('introDesc').textContent = 'Loading the paper…';
    $('startBtn').disabled = true;
  }
  MockExam.load(wanted, function (loaded) {
    $('startBtn').disabled = false;
    boot(loaded);
  });
})();
