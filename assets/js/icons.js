/* Line icons for the subject and paper cards.
   ---------------------------------------------------------------------------
   The papers name themselves with an emoji, which is the one thing on the page
   that looks different on every device: an emoji is drawn by the operating
   system, so 🧪 is a blue-grey flask on one phone and a green one on the next,
   it sits on its own baseline, and its colours take no notice of the palette.

   These are drawn here instead — one shape per idea, stroked in currentColor so
   each one picks up its subject's colour. Anything without a mapping keeps its
   emoji, so a new paper is never iconless.
   --------------------------------------------------------------------------- */
(function () {
  var SVG = 'http://www.w3.org/2000/svg';

  /* Every path is drawn on the same 24×24 grid with the same stroke, which is
     what makes a row of them look like one set rather than a collection. */
  var PATHS = {
    /* A page with a folded corner: mock exams, past papers, question banks. */
    document: ['M6.5 2.5h7.5l5 5v14h-12.5z', 'M14 2.5v5h5', 'M9.5 13h6', 'M9.5 17h6'],
    /* A neuron: cell body, three dendrites, one long axon ending in its
       terminals. Few strokes and long ones — an earlier version had twice as
       many and read as a scribble at 34 pixels. */
    neuron: ['M8 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
             'M8 9V4.4', 'M5.7 10 2.6 7.4', 'M5.7 14 2.6 16.6',
             'M11 12h6.2', 'M17.2 12l2.6-2.6', 'M17.2 12l2.6 2.6'],
    /* A long bone with its two heads. */
    bone: ['M8.4 15.6 15.6 8.4',
           'M6.6 16.1a2.1 2.1 0 1 1-2.6 2.6 2.1 2.1 0 1 1 2.6-2.6',
           'M17.4 7.9a2.1 2.1 0 1 1 2.6-2.6 2.1 2.1 0 1 1-2.6 2.6'],
    /* A dumbbell for the musculoskeletal papers: muscle, without trying to
       draw an arm at 24 pixels. */
    dumbbell: ['M8 12h8', 'M6 8.5h2.5v7H6z', 'M15.5 8.5H18v7h-2.5z',
               'M3.5 10.2v3.6', 'M20.5 10.2v3.6'],
    /* A conical flask: biochemistry. */
    flask: ['M9.6 2.8v6.4L4.9 17.6a2.1 2.1 0 0 0 1.8 3.2h10.6a2.1 2.1 0 0 0 1.8-3.2L14.4 9.2V2.8',
            'M8.2 2.8h7.6', 'M7.2 14.4h9.6'],
    /* A cell with an off-centre nucleus: cell biology. The nucleus is off
       centre on purpose — centred, two rings read as the target below it. */
    cell: ['M12 12m-8.6 0a8.6 8.6 0 1 0 17.2 0a8.6 8.6 0 1 0-17.2 0',
           'M14.1 9.9m-3.2 0a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0-6.4 0'],
    /* A double helix. */
    dna: ['M7 3c0 4.5 10 4.5 10 9s-10 4.5-10 9', 'M17 3c0 4.5-10 4.5-10 9s10 4.5 10 9',
          'M8.6 6.5h6.8', 'M8.6 17.5h6.8', 'M7.4 12h9.2'],
    /* Concentric rings: the hint paper, aimed at what the examiner asks. */
    target: ['M12 12m-8.6 0a8.6 8.6 0 1 0 17.2 0a8.6 8.6 0 1 0-17.2 0',
             'M12 12m-4.4 0a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0-8.8 0',
             'M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0'],
    /* Crossed blades: the Gauntlet. */
    swords: ['M4.6 3.6 15.4 14.4', 'M19.4 3.6 8.6 14.4',
             'M14 16.4 17.6 12.8', 'M10 16.4 6.4 12.8',
             'M15.4 18.6 19 15', 'M8.6 18.6 5 15'],
    /* A flame: the hard papers. */
    flame: ['M12 21.2a6.4 6.4 0 0 0 6.4-6.4c0-4.4-3.4-6.9-6.4-11.4-3 4.5-6.4 7-6.4 11.4a6.4 6.4 0 0 0 6.4 6.4z',
            'M12 21.2a2.9 2.9 0 0 0 2.9-2.9c0-2-1.4-2.9-2.9-5.4-1.5 2.5-2.9 3.4-2.9 5.4a2.9 2.9 0 0 0 2.9 2.9z'],
    /* A folder: the merged archives. */
    archive: ['M3.4 7.6a1.6 1.6 0 0 1 1.6-1.6h4.8l2.1 2.6h8.1a1.6 1.6 0 0 1 1.6 1.6v8.2a1.6 1.6 0 0 1-1.6 1.6H5a1.6 1.6 0 0 1-1.6-1.6z']
  };

  /* What each paper's emoji means. Anything missing falls back to the emoji. */
  var FOR_EMOJI = {
    '📝': 'document', '📄': 'document', '📘': 'document', '📗': 'document', '📚': 'document',
    '🧠': 'neuron', '🦴': 'bone', '💪': 'dumbbell',
    '⚗️': 'flask', '⚗': 'flask', '🧪': 'flask',
    '🔬': 'cell', '🧬': 'dna', '🎯': 'target', '⚔️': 'swords', '⚔': 'swords',
    '🔥': 'flame', '💥': 'flame', '🗂️': 'archive', '🗂': 'archive'
  };

  function svg(name) {
    var paths = PATHS[name];
    if (!paths) return null;
    var node = document.createElementNS(SVG, 'svg');
    node.setAttribute('viewBox', '0 0 24 24');
    node.setAttribute('fill', 'none');
    node.setAttribute('stroke', 'currentColor');
    node.setAttribute('stroke-width', '1.6');
    node.setAttribute('stroke-linecap', 'round');
    node.setAttribute('stroke-linejoin', 'round');
    node.setAttribute('aria-hidden', 'true');
    node.setAttribute('class', 'icon-svg');
    paths.forEach(function (d) {
      var p = document.createElementNS(SVG, 'path');
      p.setAttribute('d', d);
      node.appendChild(p);
    });
    return node;
  }

  window.MockExam = window.MockExam || {};

  /* Fill `host` with the icon for this emoji — or leave the emoji in place if
     there is no drawing for it. */
  window.MockExam.setIcon = function (host, emoji) {
    var drawn = svg(FOR_EMOJI[emoji]);
    host.textContent = '';
    if (drawn) {
      host.appendChild(drawn);
      host.classList.add('has-icon');
    } else {
      host.textContent = emoji || '';
      host.classList.remove('has-icon');
    }
    return host;
  };

  window.MockExam.iconNames = function () { return Object.keys(PATHS); };
})();
