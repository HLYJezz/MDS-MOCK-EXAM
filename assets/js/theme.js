/* The light/dark toggle in the header.
   The theme itself is applied by the small inline script in each page's <head>,
   before first paint, so a dark-mode reader never gets a white flash. This only
   handles the button. */
(function () {
  var btn = document.getElementById('themeToggle');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var now = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', now);
    Store.setTheme(now);
  });
})();
