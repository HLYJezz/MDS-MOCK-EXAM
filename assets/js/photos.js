/* Finding the pictures people drop into a folder.
   ---------------------------------------------------------------------------
   Two places do this — the study buddy during an exam, and the credits page's
   easter egg — and both want the same rule: name them 1, 2, 3 … and the site
   picks them up with nothing to rebuild.

   The catch is how you ask whether a file is there. Pointing an <img> at it
   answers the question by downloading the whole thing, so finding five memes
   cost most of a megabyte before one of them could be shown — on a phone,
   several seconds of waiting and a chunk of somebody's data for pictures that
   were then thrown away. A HEAD request asks the same question and brings back
   nothing but the answer, so only the picture actually chosen is downloaded.

   Opened straight off the disk there is no server to ask, so there it falls
   back to the old way, where the cost does not matter.
   --------------------------------------------------------------------------- */
(function () {
  var EXTS = ['jpg', 'png', 'jpeg', 'webp'];   // .jpg first: it is what phones produce
  var MAX = 24;                                // a ceiling on the search, not a limit worth hitting
  var CAN_ASK = !!window.fetch && location.protocol !== 'file:';

  function exists(url, cb) {
    if (!CAN_ASK) {
      var img = new Image();
      img.onload = function () { cb(true); };
      img.onerror = function () { cb(false); };
      img.src = url;
      return;
    }
    fetch(url, { method: 'HEAD' })
      .then(function (r) { cb(r.ok); })
      .catch(function () { cb(false); });      // offline, blocked, anything: treat as absent
  }

  /* dir/<base>-1.<ext>, then -2, and so on, stopping at the first number that
     is missing in every file type — which is why the READMEs ask for no gaps. */
  function find(dir, base, done) {
    var found = [], n = 1, e = 0;
    function step() {
      if (n > MAX) return done(found);
      var url = dir + base + '-' + n + '.' + EXTS[e];
      exists(url, function (yes) {
        if (yes) { found.push(url); n++; e = 0; return step(); }
        e++;
        if (e < EXTS.length) return step();    // same number, another file type
        done(found);
      });
    }
    step();
  }

  /* Have the picture in hand before it goes on screen: both callers measure it
     as it arrives, and a picture with no size yet measures as nothing. */
  function load(src, done) {
    var img = new Image(), called = false;
    function once() { if (!called) { called = true; done(img); } }
    img.onload = once;
    img.onerror = once;
    img.src = src;
  }

  window.MockPhotos = { find: find, load: load };
})();
