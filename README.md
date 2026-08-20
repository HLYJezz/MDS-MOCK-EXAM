# MDS Mock Exam

A static website for sitting timed mock exams. Pick a paper, sit it under exam
conditions, then get a score and a full answer review with explanations.

No build step, no server code, no accounts — plain HTML/CSS/JS.

## Running it

- **Locally:** open `index.html` in a browser (double-click works).
- **Sharing it:** Settings → Pages → Deploy from branch → root. The site is then live
  at `https://<username>.github.io/<repo>/`.

## The papers

12 papers, 1,797 questions, generated from the PDFs in `source-papers/`:

| Course | Paper | Questions | Time |
|---|---|---|---|
| MDS211 — Nervous System | Neuro Past Paper | 249 | 185 min |
| | The Professor's Gauntlet | 300 | 225 min |
| | SA1 Hint Exam | 102 | 75 min |
| | SA1 Mock Exam 1 | 77 | 60 min |
| | SA1 Mock Exam 2 | 77 | 60 min |
| MDS220 — Musculo 1 | Full Practice Exam | 202 | 150 min |
| | Hard Practice Exam | 151 | 115 min |
| | Comprehensive Exam | 171 | 130 min |
| | Musculo Hard Exam | 87 | 65 min |
| MDS221 — Musculo 2 | Comprehensive Exam | 130 | 100 min |
| | Master Past Paper | 131 | 100 min |
| | Standard Mock Paper II | 120 | 90 min |

All papers are single best answer, timed at 45 seconds per question, pass mark 60%,
with questions and options shuffled on every attempt.

Two questions from the MDS211 past paper (originally numbered 105 and 238) are left
out: they are recorded as illegible in the source archive and have no answer to mark
against.

## What the site does

- Papers grouped by course, each card showing question count, time and best score
- Countdown that turns amber at 5 minutes and red at 1 minute, and auto-submits at zero
- One question at a time, with a navigator showing answered and flagged questions
- Flag for review, jump around freely, arrow keys to move between questions
- Answers auto-save — closing the tab does not lose the attempt, reopening offers to resume
- Score against the pass mark, then a per-question review with the source explanations
- Attempt history and best score per paper, stored in the browser only
- Light and dark theme, works on phones

## Rebuilding the papers from the PDFs

The files in `data/` are generated. To change how a paper is converted, or to add a
new one, edit `tools/convert_papers.py` and re-run it:

```bash
pip install pypdf
python3 tools/convert_papers.py            # rewrite data/
python3 tools/convert_papers.py --check    # parse and report, write nothing
```

Each paper has an entry in the `PAPERS` list saying where its questions and answer key
are and how they are written. The script checks its own work: it compares the number of
questions parsed against the number the paper claims, confirms every question has a
valid answer letter, and cross-checks the answer text quoted in the key against the
option it names. Anything that does not line up is reported per question.

To add a paper: drop the PDF in `source-papers/`, add an entry to `PAPERS`, run the
script, and check the report is clean.

## Writing a paper by hand

You can also write a `data/*.js` file yourself and add it to `data/manifest.js`.
Options are labelled A, B, C… in the order written, and `answer` refers to those letters.

```js
registerExam({
  id: 'my-paper',                // unique, used in the URL
  name: 'My Paper',
  course: 'MDS211',              // grouping on the home page
  subtitle: 'Lectures 1–5',
  icon: '📘',
  accent: '#2f5bd6',
  description: 'What this paper covers.',
  durationMinutes: 60,
  passMark: 60,
  shuffleQuestions: true,
  shuffleOptions: true,
  sections: [{ id: 's1', title: 'Section A' }],
  questions: [
    {
      id: 'q1',
      section: 's1',             // optional
      marks: 1,                  // optional, default 1
      passage: 'Optional case stem shown above the question.',
      image: 'assets/img/fig1.png',   // optional
      stem: 'Which nerve supplies the muscles of mastication?',
      options: ['Facial', 'Mandibular division of trigeminal', 'Vagus'],
      answer: 'B',
      explanation: 'Shown in the review after submitting.'
    },
    { type: 'multi', stem: 'Select TWO…', options: ['…','…','…'], answer: ['A', 'C'] },
    { type: 'truefalse', stem: 'Enamel contains no living cells.', answer: true },
    { type: 'short', stem: 'Name the hardest tissue.', answer: ['enamel', 'dental enamel'] }
  ]
});
```

Short answers are matched case-insensitively, ignoring spacing and punctuation, so list
every wording you will accept.

## Project layout

```
index.html            paper chooser, grouped by course
exam.html             instructions → paper → results
assets/css/style.css  all styling
assets/js/store.js    localStorage (progress, results, theme)
assets/js/registry.js registerExam() and question normalising
assets/js/loader.js   loads one paper's questions on demand
assets/js/home.js     course groups, paper cards, attempt history
assets/js/exam.js     timer, paper, navigator, marking, review
data/manifest.js      paper metadata for the home page (generated)
data/*.js             one file per paper (generated)
source-papers/        the original exam PDFs
tools/convert_papers.py   PDF → data/*.js converter
```

The home page loads `data/manifest.js` only — metadata, a few kilobytes. The questions
for a paper (up to ~320 KB) load when that paper is opened.
