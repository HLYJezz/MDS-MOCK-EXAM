/* "This question looks wrong" reports, sent to a Google Sheet.
   ---------------------------------------------------------------------------
   Reports are written to the reader's browser first, then posted to a Google
   Apps Script web app that appends them to a sheet. Anything that fails to send
   — offline, endpoint down — stays queued and is retried next time the site is
   opened, so a report is never lost.

   Setup: deploy tools/feedback-sheet.gs as a web app and paste its /exec URL
   below. See the "Question reports" section of README.md.
   --------------------------------------------------------------------------- */
(function () {
  var CONFIG = {
    /* The Apps Script web app URL, ending in /exec */
    endpoint: 'https://script.google.com/macros/s/AKfycbx-Oh6ZVsR-3Td7_SAV2-MTL77OasZf9BTksKGJxLbbTtxrIHInYttyUHiEoJLgMx4v/exec'
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

  /* ---------- sending ----------
     Apps Script does not answer CORS preflight, so the request has to be a
     "simple" one: text/plain, no custom headers, no-cors. The response can
     never be read, so "it arrived" is not something this page can learn.

     sendBeacon is used where available: it hands the request to the browser
     and returns immediately, which matters because Apps Script answers with a
     cross-origin redirect that leaves a no-cors fetch hanging forever on iOS
     Safari — the row lands in the sheet but the promise never settles.

     The fetch fallback is raced against a timeout for the same reason. Waiting
     longer would tell us nothing, and the local copy is what keeps this safe. */
  var SEND_TIMEOUT = 6000;

  function post(report) {
    if (!CONFIG.endpoint) return Promise.reject(new Error('no endpoint configured'));
    var body = JSON.stringify(report);

    if (navigator.sendBeacon) {
      try {
        var blob = new Blob([body], { type: 'text/plain;charset=UTF-8' });
        if (navigator.sendBeacon(CONFIG.endpoint, blob)) return Promise.resolve('queued');
      } catch (e) { /* fall through to fetch */ }
    }

    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        /* Almost certainly delivered — an unreachable endpoint rejects instead
           of hanging — so treat it as sent rather than sending it twice later. */
        if (!settled) { settled = true; resolve('timeout'); }
      }, SEND_TIMEOUT);

      fetch(CONFIG.endpoint, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-store',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: body
      }).then(function () {
        if (!settled) { settled = true; clearTimeout(timer); resolve('sent'); }
      }, function (err) {
        if (!settled) { settled = true; clearTimeout(timer); reject(err); }
      });
    });
  }

  /* Retry anything still queued from an earlier visit. Quiet: no toasts. */
  function flush() {
    if (!CONFIG.endpoint) return;
    var pending = Store.reports().filter(function (r) { return !r.sent; });
    pending.forEach(function (r) {
      post(r).then(function () { Store.markReportSent(r.id); }, function () {});
    });
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
                givenAnswer, recordedAnswer, mode }
     recordedAnswer is left out while the answer is still hidden, so a report
     cannot be used to peek at the answer mid-exam. */
  function open(context) {
    var box = dialog();
    var p = box._parts;
    box.querySelector('.report-target').textContent =
      context.paperName + ' · question ' + context.questionNumber;
    p.comment.value = '';
    p.send.disabled = false;
    p.send.textContent = 'Send report';
    box.classList.remove('hidden');
    p.comment.focus();

    p.send.onclick = function () {
      var report = {
        id: 'r' + Date.now() + Math.random().toString(36).slice(2, 7),
        date: Date.now(),
        paper: context.paper,
        paperName: context.paperName,
        questionId: context.questionId,
        questionNumber: context.questionNumber,
        stem: context.stem,
        options: context.options,
        givenAnswer: context.givenAnswer || '',
        recordedAnswer: context.recordedAnswer || '',
        mode: context.mode || '',
        issue: (p.issues.querySelector('.selected') || {}).dataset.issue || ISSUES[0],
        comment: p.comment.value.trim(),
        name: p.name.value.trim(),
        sent: false
      };
      Store.addReport(report);
      Store.setReporterName(report.name);

      p.send.disabled = true;
      p.send.textContent = 'Sending…';

      if (!CONFIG.endpoint) {
        close();
        toast('Thanks — your report has been saved.');
        return;
      }
      post(report).then(function () {
        try { Store.markReportSent(report.id); } catch (e) {}
        close();
        toast('Thanks — your report has been sent.');
      }, function () {
        /* Kept in the queue; it goes out next time the site is opened. */
        close();
        toast('Thanks — saved. It will be sent when you are back online.');
      })['catch'](function () {
        close();      // never leave the dialog stuck on "Sending…"
        toast('Thanks — your report has been saved.');
      });
    };
  }

  function toast(message) {
    var t = el('div', 'toast', message);
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('leaving'); }, 3200);
    setTimeout(function () { t.remove(); }, 3800);
  }

  window.Feedback = {
    open: open,
    flush: flush,
    configured: function () { return !!CONFIG.endpoint; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', flush);
  } else {
    flush();
  }
})();
