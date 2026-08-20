/* Loads every data file listed in data/manifest.js, then fires MockExam.ready(). */
(function () {
  var files = (window.EXAM_FILES || []).slice();
  var waiting = [];
  var done = false;

  window.MockExam.ready = function (fn) {
    if (done) fn(); else waiting.push(fn);
  };

  function finish() {
    done = true;
    waiting.splice(0).forEach(function (fn) { fn(); });
  }

  function next() {
    if (!files.length) return finish();
    var src = files.shift();
    var s = document.createElement('script');
    s.src = src;
    s.onload = next;
    s.onerror = function () {
      console.error('Could not load exam data file: ' + src);
      next();
    };
    document.head.appendChild(s);
  }

  next();
})();
