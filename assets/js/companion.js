/* A small cat that turns up when you have been on one question for a while.
   ---------------------------------------------------------------------------
   It is only ever company. It never says anything about the question, because
   anything it knew would be a hint, and a mock exam that helps you is not
   worth sitting. The most it does is remind you that flagging a question and
   coming back is allowed.

   It keeps out of the way: it waits for a long quiet spell, it does not count
   time while the tab is in the background or the paper is not on screen, it
   goes away the moment you answer or move on, and a tap sends it away.
   --------------------------------------------------------------------------- */
(function () {
  var SVG = 'http://www.w3.org/2000/svg';

  var FIRST = 75000;      // ms of no answering before it appears
  var AGAIN = 90000;      // and again, once, with the flagging tip

  /* Nothing here hints at an answer — the first four are just company, and the
     tip is about how the paper works, which the rules already say. */
  var LINES = [
    'Still thinking? No rush.',
    'Take your time — I will wait.',
    'A tricky one. Deep breath.',
    'You are doing fine.'
  ];
  var TIP = 'Stuck? Flag it and come back later.';

  var box = null, timer = null, shownFor = null, stage = 0, dismissed = {};
  var current = null;     // a key for the question on screen

  function cat() {
    var s = document.createElementNS(SVG, 'svg');
    s.setAttribute('viewBox', '0 0 64 50');
    s.setAttribute('class', 'cat-svg');
    s.setAttribute('aria-hidden', 'true');
    function add(tag, attrs, cls) {
      var n = document.createElementNS(SVG, tag);
      Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
      if (cls) n.setAttribute('class', cls);
      s.appendChild(n);
      return n;
    }
    /* Drawn the same way as the paper icons — outline in the accent colour on
       the page's own surface — so it belongs to the site rather than looking
       like a sticker put on top of it. */
    var line = { stroke: 'currentColor', 'stroke-width': 2,
                 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    function outline(attrs) {
      var a = { fill: 'var(--surface)' };
      Object.keys(line).forEach(function (k) { a[k] = line[k]; });
      Object.keys(attrs).forEach(function (k) { a[k] = attrs[k]; });
      return a;
    }
    add('path', outline({ d: 'M15.5 18 18 5.5 30 13.5Z' }));                 // ears
    add('path', outline({ d: 'M48.5 18 46 5.5 34 13.5Z' }));
    add('ellipse', outline({ cx: 32, cy: 28.5, rx: 18.5, ry: 16 }));         // head
    add('circle', outline({ cx: 24, cy: 44, r: 4 }));                        // paws
    add('circle', outline({ cx: 40, cy: 44, r: 4 }));
    add('ellipse', { cx: 25.2, cy: 26.5, rx: 2.5, ry: 3, fill: 'currentColor' }, 'cat-eye');
    add('ellipse', { cx: 38.8, cy: 26.5, rx: 2.5, ry: 3, fill: 'currentColor' }, 'cat-eye');
    add('path', { d: 'M32 32.4l-2 -1.8M32 32.4l2 -1.8M32 32.4v1.6', fill: 'none',
                  stroke: 'currentColor', 'stroke-width': 1.7,
                  'stroke-linecap': 'round', 'stroke-linejoin': 'round' });   // nose
    add('path', { d: 'M29.6 35.4a2.6 2.6 0 0 0 4.8 0', fill: 'none',
                  stroke: 'currentColor', 'stroke-width': 1.7,
                  'stroke-linecap': 'round' });                               // smile
    add('path', { d: 'M14.5 27H5.5M15 32.5 6.5 34.5M49.5 27h9M49 32.5 57.5 34.5',
                  fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6,
                  'stroke-linecap': 'round' });                               // whiskers
    return s;
  }

  function build() {
    if (box) return box;
    box = document.createElement('div');
    box.className = 'companion hidden';
    var bubble = document.createElement('p');
    bubble.className = 'companion-bubble';
    box.appendChild(bubble);
    box.appendChild(cat());
    box._bubble = bubble;
    box.title = 'Tap to send me away';
    box.addEventListener('click', function () {
      if (current) dismissed[current] = true;
      hide();
    });
    document.body.appendChild(box);
    return box;
  }

  function show(text) {
    var b = build();
    b._bubble.textContent = text;
    b.classList.remove('hidden');
    /* Restart the entrance every time, so a second visit is not silent. */
    b.classList.remove('is-in');
    void b.offsetWidth;
    b.classList.add('is-in');
  }

  function hide() {
    if (box) box.classList.add('hidden');
    shownFor = null;
  }

  function clear() {
    if (timer) { clearTimeout(timer); timer = null; }
  }

  function arm(delay, text) {
    clear();
    timer = setTimeout(function () {
      if (document.hidden || !current || dismissed[current]) return;
      show(text);
      shownFor = current;
      if (stage === 0) { stage = 1; arm(AGAIN, TIP); }
    }, delay);
  }

  /* Called whenever the reader does something: a new question, an answer, a
     flag. The clock starts again from nothing. */
  function reset(key) {
    current = key == null ? null : String(key);
    stage = 0;
    if (shownFor !== null && shownFor !== current) hide();
    if (shownFor === current) hide();
    clear();
    if (current === null || dismissed[current]) return;
    arm(FIRST, LINES[Math.floor(Math.random() * LINES.length)]);
  }

  /* Leaving the paper — results, or the tab going away — stops it entirely. */
  function stop() {
    current = null;
    clear();
    hide();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) clear();
    else if (current !== null && !dismissed[current] && !shownFor) {
      arm(FIRST, LINES[Math.floor(Math.random() * LINES.length)]);
    }
  });

  window.Companion = { reset: reset, stop: stop, hide: hide };
})();
