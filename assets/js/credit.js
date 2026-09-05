/* The credits page's one bit of mischief.
   ---------------------------------------------------------------------------
   Tap the IT card enough times in a row and it turns over to show a photo of
   whoever is on it. Then it turns back and forgets, so it is a surprise every
   time rather than a switch left flipped.

   The photos live in assets/img/creator/ and are looked for only once someone
   has actually earned the flip — so a reader who never pokes the card makes no
   requests for them, and with the folder empty nothing happens at all. That is
   deliberate: an easter egg that half-works is worse than one nobody finds.
   --------------------------------------------------------------------------- */
(function () {
  var card = document.querySelector('[data-egg="creator"]');
  if (!card) return;

  var TAPS = 7;           // how many it takes
  var GAP = 1800;         // ms allowed between them: this is spamming, not clicking
  var HOLD = 4200;        // ms the photo stays up
  /* Nobody stops dead on the seventh tap. The taps still coming while the card
     turns would otherwise shut it again before it had been seen, so for this
     long after the flip the card ignores them; a tap after that still puts it
     back early for anyone who wants it gone. */
  var GRACE = 1500;

  var DIR = 'assets/img/creator/';

  /* Said over the photo. Dry, and nothing anyone would mind being said about
     their own face. */
  var LINES = [
    'Hello.',
    'You found me.',
    'Yes. That is the face.',
    'Please stop poking the IT guy.',
    'This is what writing answer keys does to you.'
  ];

  var taps = 0, last = 0, flipped = false, back = null, timer = null, shownAt = 0;
  var photos = [], probed = false, probing = false, waiting = [];

  /* Same rule as the study buddy's folders: face-1, face-2 … stopping at the
     first missing number, so adding one is only ever dropping in a file. */
  function findPhotos(done) {
    if (probed) return done();
    waiting.push(done);
    if (probing) return;
    probing = true;
    MockPhotos.find(DIR, 'face', function (urls) {
      photos = urls;
      probed = true; probing = false;
      var q = waiting; waiting = [];
      q.forEach(function (fn) { fn(); });
    });
  }

  /* img is the element already loaded, so the card turns onto a picture that
     is there rather than one still arriving. */
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
      if (!photos.length || flipped) return;       // nothing to show: no easter egg
      var src = photos[Math.floor(Math.random() * photos.length)];
      /* Load it before turning: a card that flips to a blank while the picture
         arrives is worse than one that takes a moment to flip. */
      MockPhotos.load(src, turn);
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
      return unflip();                             // a tap puts it back early
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
})();
