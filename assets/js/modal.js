/* Getting out of a dialog.
   ---------------------------------------------------------------------------
   Both dialogs on the site — submitting a paper, and reporting a question —
   could only be dismissed by finding their button. Escape and a tap on the
   dark area outside are what everyone reaches for first, and on a phone the
   tap-outside is the whole gesture.

   Hiding the box is exactly what their own Cancel buttons do, so there is
   nothing to tell the owner about: this closes them the same way.
   --------------------------------------------------------------------------- */
(function () {
  function openModal() { return document.querySelector('.modal:not(.hidden)'); }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    var m = openModal();
    if (m) m.classList.add('hidden');
  });

  document.addEventListener('click', function (e) {
    var m = openModal();
    /* Only the backdrop itself. A click inside lands on .modal-box or one of
       its children, and the click that opened the dialog lands on the button
       that opened it, so neither closes it again. */
    if (m && e.target === m) m.classList.add('hidden');
  });
})();
