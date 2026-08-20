/* "This question looks wrong" reports.
   ---------------------------------------------------------------------------
   Every report is kept in the reader's browser, and — once the Google Form
   below is filled in — also opens a prefilled form so the report reaches you.

   To set the form up, see the "Question reports" section of README.md. Until
   CONFIG.formUrl is filled in, reports are still recorded on the device but
   cannot reach anyone, so do fill it in.
   --------------------------------------------------------------------------- */
(function () {
  var CONFIG = {
    /* The form's public link, ending in /viewform */
    formUrl: '',
    /* Field ids from the form's "Get pre-filled link" (entry.123456789).
       Any you leave blank are folded into `details` instead. */
    entries: {
      paper: '',
      question: '',
      issue: '',
      comment: '',
      name: '',
      details: ''
    }
  };

  var ISSUES = [
    'The marked answer looks wrong',
    'A typo or formatting problem',
    'The question is unclear',
    'Something else'
  ];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* Everything worth knowing about the report, as one block of text. Used for
     the `details` field, and as the fallback when a form has fewer fields. */
  function asText(r) {
    var lines = [
      'Paper: ' + r.paperName + ' (' + r.paper + ')',
      'Question ' + r.questionNumber + ' [' + r.questionId + ']',
      'Problem: ' + r.issue,
      '',
      'Question: ' + r.stem
    ];
    if (r.options && r.options.length) lines.push('Options: ' + r.options.join(' | '));
    if (r.givenAnswer) lines.push('Their answer: ' + r.givenAnswer);
    if (r.recordedAnswer) lines.push('Answer on file: ' + r.recordedAnswer);
    if (r.comment) lines.push('', 'Comment: ' + r.comment);
    if (r.name) lines.push('From: ' + r.name);
    return lines.join('\n');
  }

  function formUrlFor(r) {
    if (!CONFIG.formUrl) return null;
    var e = CONFIG.entries;
    var values = {
      paper: r.paperName,
      question: 'Q' + r.questionNumber + ' — ' + r.stem,
      issue: r.issue,
      comment: r.comment,
      name: r.name,
      details: asText(r)
    };
    var parts = ['usp=pp_url'];
    var missing = [];
    Object.keys(values).forEach(function (k) {
      if (k === 'details') return;
      if (e[k]) parts.push(encodeURIComponent(e[k]) + '=' + encodeURIComponent(values[k] || ''));
      else if (values[k]) missing.push(k);
    });
    /* Anything the form has no field for still travels, in the details field. */
    if (e.details) parts.push(encodeURIComponent(e.details) + '=' + encodeURIComponent(values.details));
    else if (missing.length && e.comment) {
      parts = parts.filter(function (p) { return p.indexOf(encodeURIComponent(e.comment) + '=') !== 0; });
      parts.push(encodeURIComponent(e.comment) + '=' + encodeURIComponent(values.details));
    }
    return CONFIG.formUrl + (CONFIG.formUrl.indexOf('?') === -1 ? '?' : '&') + parts.join('&');
  }

  /* ---------- the dialog ---------- */
  function dialog() {
    var box = document.getElementById('reportModal');
    if (box) return box;

    box = el('div', 'modal hidden');
    box.id = 'reportModal';
    var inner = el('div', 'modal-box card');
    inner.appendChild(el('h2', null, 'Report a problem'));
    inner.appendChild(el('p', 'muted small report-target', ''));

    var issueWrap = el('div', 'report-issues');
    ISSUES.forEach(function (text, i) {
      var b = el('button', 'pace-btn', text);
      b.type = 'button';
      b.dataset.issue = text;
      if (i === 0) b.classList.add('selected');
      b.addEventListener('click', function () {
        issueWrap.querySelectorAll('.pace-btn').forEach(function (o) { o.classList.remove('selected'); });
        b.classList.add('selected');
      });
      issueWrap.appendChild(b);
    });
    inner.appendChild(issueWrap);

    var comment = el('textarea', 'report-comment');
    comment.rows = 3;
    comment.placeholder = 'What looks wrong? (optional, but it helps)';
    inner.appendChild(comment);

    var name = el('input', 'short-input report-name');
    name.type = 'text';
    name.placeholder = 'Your name (optional)';
    name.value = Store.reporterName() || '';
    inner.appendChild(name);

    var actions = el('div', 'modal-actions');
    var cancel = el('button', 'secondary-btn', 'Cancel');
    cancel.type = 'button';
    cancel.addEventListener('click', close);
    var send = el('button', 'primary-btn', 'Send report');
    send.type = 'button';
    actions.appendChild(cancel);
    actions.appendChild(send);
    inner.appendChild(actions);

    box.appendChild(inner);
    document.body.appendChild(box);
    box._parts = { comment: comment, name: name, issues: issueWrap, send: send };
    return box;
  }

  function close() {
    var box = document.getElementById('reportModal');
    if (box) box.classList.add('hidden');
  }

  /* context: { paper, paperName, questionId, questionNumber, stem, options,
                givenAnswer, recordedAnswer }
     recordedAnswer must be left out while the answer is still hidden, so a
     report cannot be used to peek at the answer mid-exam. */
  function open(context) {
    var box = dialog();
    var p = box._parts;
    box.querySelector('.report-target').textContent =
      context.paperName + ' · question ' + context.questionNumber;
    p.comment.value = '';
    box.classList.remove('hidden');
    p.comment.focus();

    p.send.onclick = function () {
      var report = {
        date: Date.now(),
        paper: context.paper,
        paperName: context.paperName,
        questionId: context.questionId,
        questionNumber: context.questionNumber,
        stem: context.stem,
        options: context.options,
        givenAnswer: context.givenAnswer || '',
        recordedAnswer: context.recordedAnswer || '',
        issue: (p.issues.querySelector('.selected') || {}).dataset.issue || ISSUES[0],
        comment: p.comment.value.trim(),
        name: p.name.value.trim()
      };
      Store.addReport(report);
      Store.setReporterName(report.name);

      var url = formUrlFor(report);
      if (url) window.open(url, '_blank', 'noopener');
      close();
      toast(url ? 'Thanks — the report form is opening in a new tab.'
                : 'Thanks — your report has been saved.');
    };
  }

  function toast(message) {
    var t = el('div', 'toast', message);
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('leaving'); }, 3200);
    setTimeout(function () { t.remove(); }, 3800);
  }

  window.Feedback = { open: open, asText: asText, configured: function () { return !!CONFIG.formUrl; } };
})();
