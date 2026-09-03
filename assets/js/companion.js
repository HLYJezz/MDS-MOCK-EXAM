/* A study buddy that turns up when you have been on one question for a while.
   ---------------------------------------------------------------------------
   If there are pictures in assets/img/companion/ it uses one of those; with
   none there it draws a cat instead, so the feature works out of the box and
   never breaks when a picture is missing.

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

  var FIRST = 60000;      // ms of no answering before it appears
  var AGAIN = 90000;      // and again, once, with the flagging tip

  var DIR = 'assets/img/companion/';
  var EXTS = ['png', 'jpg', 'jpeg', 'webp'];
  var MAX_PHOTOS = 12;    // a sane ceiling on the search, not a limit worth hitting

  /* Two folders, because a meme with writing across it has already said its
     piece: putting a speech bubble next to it is two jokes fighting. So a
     picture from with-text/ turns up on its own and says nothing, and only a
     picture from no-text/ — or the drawn cat — gets a line to speak. */
  var SETS = [
    { dir: DIR + 'with-text/', wordless: false },
    { dir: DIR + 'no-text/', wordless: true }
  ];

  /* Nothing here hints at an answer — they are just company, and the tip is
     about how the paper works, which the rules already say. Every line is
     about the buddy or about sitting there, never about the question, and none
     of them is tied to a particular picture: any line can turn up beside any
     face, which is most of the fun. A picture dropped in the folder therefore
     needs nothing written for it. */
  var LINES = [
    'Hello. You have been on this one a while.',
    'This question is not going to blink first.',
    'Long enough to memorise the font, I reckon.',
    'No rush. I brought snacks.',
    'Still thinking? Same.',
    'I checked. Staring harder does not work.',
    'What in the actual —',
    'No thoughts. Only this face.',
    'I have been making this face for a while now.',
    'Right. We pray now.',
    'Praying is technically a strategy.',
    'Lord, help us.',
    'That is two of us praying.',
    'Please. Just this one.',
    'Lord, help us both.',
    'Someone help me.',
    'Send help. Or snacks.',
    'I have been here exactly as long as you have.'
  ];
  var TIP = 'Flag it, move on, come back. Completely legal.';

  var box = null, timer = null, shownFor = null, stage = 0, dismissed = {};
  var current = null;     // a key for the question on screen

  /* ---------- the pictures ----------
     Named companion-1, companion-2 … in each folder, so that dropping a file
     in is the whole job: no list to keep in step, nothing to rebuild. The
     search stops at the first missing number, which is why the READMEs ask for
     no gaps. It runs once, and not until the buddy is actually about to turn
     up, so a reader who never idles makes no requests at all. */
  var photos = [], probed = false, probing = false, waiting = [];

  function findPhotos(done) {
    if (probed) return done();
    waiting.push(done);
    if (probing) return;
    probing = true;

    function finish() {
      probed = true; probing = false;
      var queue = waiting; waiting = [];
      queue.forEach(function (fn) { fn(); });
    }
    /* One folder at a time, and within it one number at a time. */
    function scan(set, then) {
      var n = 1, e = 0;
      function step() {
        if (n > MAX_PHOTOS) return then();
        var img = new Image();
        img.onload = function () {
          photos.push({ src: img.src, wordless: set.wordless });
          n++; e = 0; step();
        };
        img.onerror = function () {
          e++;
          if (e < EXTS.length) return step();  // same number, another file type
          then();                              // a gap in the numbering: that is all of them
        };
        img.src = set.dir + 'companion-' + n + '.' + EXTS[e];
      }
      step();
    }
    var i = 0;
    (function nextSet() {
      if (i >= SETS.length) return finish();
      scan(SETS[i++], nextSet);
    })();
  }

  /* Which picture turns up. When the buddy has something to say the choice is
     limited to the ones without words of their own; with none of those in the
     folder it returns null, and the drawn cat speaks instead. */
  function pick(mustSpeak) {
    var pool = photos;
    if (mustSpeak) {
      pool = [];
      photos.forEach(function (p) { if (p.wordless) pool.push(p); });
    }
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }

  function any(list) { return list[Math.floor(Math.random() * list.length)]; }

  function cat() {
    var s = document.createElementNS(SVG, 'svg');
    s.setAttribute('viewBox', '0 0 64 50');
    s.setAttribute('class', 'companion-face cat-svg');
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

  /* A fresh face each visit, so with several pictures a different one turns up. */
  function setFace(b, photo) {
    var old = b.querySelector('.companion-face');
    if (old) b.removeChild(old);
    if (!photo) { var drawn = cat(); b.appendChild(drawn); return drawn; }
    var node = document.createElement('img');
    node.className = 'companion-face companion-photo';
    node.alt = '';
    node.setAttribute('aria-hidden', 'true');
    /* If a picture disappears between the search and now, draw the cat rather
       than leave a broken image in the corner — and let it speak, since the
       line it was holding back belonged to the picture that is no longer there. */
    node.onerror = function () {
      var keep = [];
      photos.forEach(function (p) { if (p.src !== node.src) keep.push(p); });
      photos = keep;
      if (node.parentNode !== b) return;
      b.replaceChild(cat(), node);
      say(b, b._pending);
    };
    node.src = photo.src;
    b.appendChild(node);
    return node;
  }

  /* The bubble is left out entirely for a picture that already has writing on
     it, rather than emptied, so nothing shows where it would have been. */
  function say(b, text) {
    b._bubble.textContent = text || '';
    b._bubble.classList.toggle('gone', !text);
  }

  function build() {
    if (box) return box;
    box = document.createElement('div');
    box.className = 'companion hidden';
    var bubble = document.createElement('p');
    bubble.className = 'companion-bubble';
    box.appendChild(bubble);
    box._bubble = bubble;
    box.title = 'Tap to send me away';
    box.addEventListener('click', function () {
      if (current) dismissed[current] = true;
      hide();
    });
    document.body.appendChild(box);
    return box;
  }

  /* It arrives filling the page and shrinks down into its corner. The scale it
     starts at is worked out from the window, because a fixed number would swamp
     a phone and look timid on a monitor. It starts faint and gains its colour
     on the way down, so the question underneath stays readable throughout. */
  function entranceScale(node) {
    var r = node.getBoundingClientRect();
    if (!r.width || !r.height) return 6;
    return Math.max(1, Math.min(window.innerWidth * 0.92 / r.width,
                                window.innerHeight * 0.86 / r.height));
  }

  /* Picture and words are drawn independently, so any line can turn up beside
     any face. useTip is the second visit, whose line is fixed. */
  function show(useTip) {
    var b = build();
    var photo = pick(useTip);
    var text = useTip ? TIP : any(LINES);
    b._pending = text;
    /* The cat always speaks; a picture only if it has no words of its own. */
    say(b, (!photo || photo.wordless) ? text : null);
    var face = setFace(b, photo);
    b.classList.remove('hidden');
    /* Restart the entrance every time, so a second visit is not silent. */
    b.classList.remove('is-in');
    void b.offsetWidth;
    face.style.setProperty('--cat-scale', entranceScale(face).toFixed(2));
    b.classList.add('is-in');
  }

  function hide() {
    if (box) box.classList.add('hidden');
    shownFor = null;
  }

  function clear() {
    if (timer) { clearTimeout(timer); timer = null; }
  }

  /* useTip marks the second visit: the flagging tip is the one thing the buddy
     says that is worth knowing, so it is never dropped for a picture. */
  function arm(delay, useTip) {
    clear();
    timer = setTimeout(function () {
      var key = current;
      if (document.hidden || !key || dismissed[key]) return;
      /* Looking for the pictures can take a moment; check nothing has moved on
         in the meantime before putting the buddy on screen. */
      findPhotos(function () {
        if (document.hidden || current !== key || dismissed[key]) return;
        show(useTip);
        shownFor = key;
        if (stage === 0) { stage = 1; arm(AGAIN, true); }
      });
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
    arm(FIRST, false);
  }

  /* Leaving the paper — results, or the tab going away — stops it entirely. */
  function stop() {
    current = null;
    clear();
    hide();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) clear();
    else if (current !== null && !dismissed[current] && !shownFor) arm(FIRST, false);
  });

  window.Companion = { reset: reset, stop: stop, hide: hide };
})();
