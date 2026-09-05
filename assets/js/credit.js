/* The credits page's one bit of mischief.
   ---------------------------------------------------------------------------
   Tap anyone's card enough times in a row and it turns over to a photo of
   them. Then it turns back and forgets, so it is a surprise every time rather
   than a switch left flipped.

   The photos are named after the person — day-1.jpg, mew-1.jpg — in
   assets/img/creator/, and are looked for only once somebody has actually
   earned the flip. So opening the page asks for nothing, and a card with no
   photo yet does nothing at all rather than half-turning onto a blank. Adding
   someone is dropping a file in and nothing else.
   --------------------------------------------------------------------------- */
(function () {
  /* Found by the shape of the page rather than by an attribute, and the person
     taken from the nickname on the card. This is deliberate: twice now a
     browser holding yesterday's HTML alongside today's script has killed this
     feature outright, because the two had to agree on a name that changed.
     A card is a card in every version of this page, so nothing here breaks
     when the markup moves on — and adding somebody to the page needs no
     change here at all. */
  var cards = document.querySelectorAll('.credit-page .credit-card');
  if (!cards.length) return;

  var TAPS = 7;           // how many it takes
  var GAP = 1800;         // ms allowed between them: this is spamming, not clicking
  var HOLD = 4200;        // ms the photo stays up
  /* Nobody stops dead on the seventh tap. The taps still coming while the card
     turns would otherwise shut it again before it had been seen, so for this
     long after the flip the card ignores them; a tap after that still puts it
     back early for anyone who wants it gone. */
  var GRACE = 1500;

  var DIR = 'assets/img/creator/';

  /* Said over the photo. Nothing here is about anyone in particular, since any
     of them can turn up on any card. */
  var LINES = [
    'Hello.',
    'You found me.',
    'Yes. That is the face.',
    'Please stop poking me.',
    'Right. You have my attention.',
    'Ten out of ten for persistence.'
  ];

  /* Finding the pictures.
     ---------------------------------------------------------------------
     Kept in this file on purpose. It lived in a shared one for a while, and
     any page still cached from before that file existed never asked for it,
     so this feature died on a missing global — no error a reader could see,
     just nothing happening. A copy in each of the two files that need it is
     cheaper than a dependency that can half-arrive.

     Pointing an <img> at a file to ask whether it is there answers by
     downloading the whole thing; a HEAD request brings back only the answer,
     so only the picture actually shown is fetched. Off the local disk there
     is no server to ask, and there the cost does not matter. */
  var EXTS = ['jpg', 'png', 'jpeg', 'webp'];
  var MAX = 24;
  var CAN_ASK = !!window.fetch && location.protocol !== 'file:';

  function exists(url, cb) {
    if (!CAN_ASK) {
      var probe = new Image();
      probe.onload = function () { cb(true); };
      probe.onerror = function () { cb(false); };
      probe.src = url;
      return;
    }
    fetch(url, { method: 'HEAD' })
      .then(function (r) { cb(r.ok); })
      .catch(function () { cb(false); });
  }

  /* <base>-1.<ext>, then -2, stopping at the first number missing in every
     file type — which is why the README asks for no gaps. */
  function findIn(dir, base, done) {
    var found = [], n = 1, e = 0;
    (function step() {
      if (n > MAX) return done(found);
      var url = dir + base + '-' + n + '.' + EXTS[e];
      exists(url, function (yes) {
        if (yes) { found.push(url); n++; e = 0; return step(); }
        e++;
        if (e < EXTS.length) return step();
        done(found);
      });
    })();
  }

  /* Have the picture in hand before it goes on screen: the card turns onto
     one that is there rather than one still arriving. */
  function loadPhoto(src, done) {
    var img = new Image(), called = false;
    img.onload = img.onerror = function () { if (!called) { called = true; done(img); } };
    img.src = src;
  }

  /* Each card counts its own taps and searches for its own photos, so tapping
     one has nothing to do with any of the others. */
  function wire(card) {
    var named = card.querySelector('.credit-who');
    if (!named) return;
    var who = (card.getAttribute('data-egg') || named.textContent)
      .trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    /* What the attribute was called when only one card had it. */
    if (who === 'creator') who = 'day';
    if (!who) return;

    /* A page from before every card could turn has neither the class that
       gives it a hinge nor a front face to turn away — so give it both. */
    card.classList.add('egg-card');
    if (!card.querySelector('.egg-front')) {
      var front = document.createElement('div');
      front.className = 'egg-face egg-front';
      while (card.firstChild) front.appendChild(card.firstChild);
      card.appendChild(front);
    }

    var taps = 0, last = 0, flipped = false, back = null, timer = null, shownAt = 0;
    var photos = [], probed = false, probing = false, waiting = [];

    function findPhotos(done) {
      if (probed) return done();
      waiting.push(done);
      if (probing) return;
      probing = true;
      findIn(DIR, who, function (urls) {
        photos = urls;
        probed = true; probing = false;
        var q = waiting; waiting = [];
        q.forEach(function (fn) { fn(); });
      });
    }

    /* img is the element already loaded. */
    function buildBack(img) {
      var b = document.createElement('div');
      b.className = 'egg-face egg-back';
      b.setAttribute('aria-hidden', 'true');
      img.className = 'egg-photo';
      img.alt = '';
      var cap = document.createElement('p');
      cap.className = 'egg-caption';
      cap.textContent = LINES[Math.floor(Math.random() * LINES.length)];
      b.appendChild(img);
      b.appendChild(cap);
      return b;
    }

    function unflip() {
      if (timer) { clearTimeout(timer); timer = null; }
      flipped = false; taps = 0;
      card.classList.remove('flipped');
      /* Leave the photo in place until the card is side-on, or it vanishes in
         front of the reader rather than behind the turn. */
      setTimeout(function () {
        if (!flipped && back && back.parentNode === card) { card.removeChild(back); back = null; }
      }, 450);
    }

    function flip() {
      findPhotos(function () {
        if (!photos.length || flipped) return;     // no photo for this one: nothing happens
        loadPhoto(photos[Math.floor(Math.random() * photos.length)], turn);
      });
    }

    function turn(img) {
      if (flipped) return;
      flipped = true;
      shownAt = Date.now();
      if (back && back.parentNode === card) card.removeChild(back);
      back = buildBack(img);
      card.appendChild(back);
      void card.offsetWidth;
      card.classList.add('flipped');
      timer = setTimeout(unflip, HOLD);
    }

    card.addEventListener('click', function () {
      if (flipped) {
        /* Still settling: this is the tail of the spam that opened it. */
        if (Date.now() - shownAt < GRACE) return;
        return unflip();                           // a tap puts it back early
      }
      var now = Date.now();
      taps = (now - last <= GAP) ? taps + 1 : 1;
      last = now;
      /* A little give on each tap, so it feels like something is happening well
         before anything does. */
      card.classList.remove('nudge');
      void card.offsetWidth;
      card.classList.add('nudge');
      if (taps >= TAPS) flip();
    });
  }

  Array.prototype.forEach.call(cards, wire);
})();
