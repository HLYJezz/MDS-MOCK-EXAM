# MDS Mock Exam

A small static website where friends can sit timed mock exams. Pick a subject on the
home page, sit the paper under exam conditions, then get a score and a full answer review.

No build step, no server code, no accounts — plain HTML/CSS/JS.

## Running it

- **Locally:** open `index.html` in a browser (double-click works — no server needed).
- **Sharing it with friends:** push this repo and turn on GitHub Pages
  (Settings → Pages → Deploy from branch → `main` / root). The site is then live at
  `https://<username>.github.io/<repo>/`.

## What it does

- Subject chooser with question count, duration and pass mark on each card
- Timed paper with a countdown that turns amber at 5 minutes and red at 1 minute
- One question at a time, with a question navigator showing answered / flagged state
- Flag questions for review, jump around freely, arrow keys move between questions
- Answers auto-save — closing the tab by accident does not lose the attempt
- Auto-submit when time runs out
- Score, pass/fail against the paper's pass mark, and a per-question review with explanations
- Attempt history and best score per subject, stored in the browser only
- Light and dark theme

## Adding a real exam

1. Create a file in `data/`, e.g. `data/anatomy.js`.
2. Add it to the list in `data/manifest.js`.

That's it — the subject card appears automatically.

### File format

```js
registerExam({
  id: 'anatomy',                 // unique, used in the URL
  name: 'Anatomy',
  icon: '🦴',                    // any emoji
  accent: '#2f5bd6',             // card colour (optional)
  description: 'Paper 1 — head and neck.',
  durationMinutes: 90,
  passMark: 60,                  // percent
  shuffleQuestions: false,       // optional
  shuffleOptions: false,         // optional
  sections: [                    // optional, groups the navigator
    { id: 'a', title: 'Section A — MCQ' }
  ],
  questions: [ /* see below */ ]
});
```

### Question types

Options are labelled **A, B, C…** in the order you write them, and the `answer` refers
to those letters.

**Single answer**
```js
{
  type: 'single',
  section: 'a',                  // optional
  marks: 1,                      // optional, default 1
  passage: 'Optional case stem or scenario shown above the question.',
  image: 'assets/img/fig1.png',  // optional
  stem: 'Which nerve supplies the muscles of mastication?',
  options: ['Facial', 'Mandibular division of trigeminal', 'Glossopharyngeal', 'Vagus'],
  answer: 'B',
  explanation: 'Shown in the review after submitting.'
}
```

**Multiple answer** — the paper tells the candidate how many to pick, and marks are
all-or-nothing.
```js
{ type: 'multi', stem: 'Select TWO…', options: ['…','…','…','…'], answer: ['A', 'C'] }
```

**True / false**
```js
{ type: 'truefalse', stem: 'Enamel contains no living cells.', answer: true }
```

**Short written answer** — matched case-insensitively, ignoring spacing and punctuation.
List every wording you will accept.
```js
{ type: 'short', stem: 'Name the hardest tissue in the body.', answer: ['enamel', 'dental enamel'] }
```

### Tips

- Keep each subject in its own file so papers are easy to swap in and out.
- Put figures in `assets/img/` and reference them with `image:`.
- Use `passage:` for shared case stems; repeat it on each question that needs it.
- `marks:` lets a long question count for more than one mark; the percentage uses marks,
  not question count.

## Project layout

```
index.html            subject chooser
exam.html             instructions → paper → results
assets/css/style.css  all styling
assets/js/store.js    localStorage (progress, results, theme)
assets/js/registry.js registerExam() + normalising the question format
assets/js/loader.js   loads the files listed in the manifest
assets/js/home.js     subject cards and attempt history
assets/js/exam.js     timer, paper, navigator, marking, review
data/manifest.js      list of exam files to load
data/*.js             one file per subject
```
