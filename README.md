# MDS Mock Exam

A static website for sitting timed mock exams. Pick a paper, sit it under exam
conditions, then get a score and a full answer review with explanations.

No build step, no server code, no accounts — plain HTML/CSS/JS.

## Running it

- **Locally:** open `index.html` in a browser (double-click works).
- **Sharing it:** Settings → Pages → Deploy from branch → root. The site is then live
  at `https://<username>.github.io/<repo>/`.

## The papers

12 papers, 1,797 questions, generated from the PDFs in `source-papers/`. Cards appear in
the order the papers are listed in `tools/convert_papers.py`:

| Course | Paper | Questions | Time |
|---|---|---|---|
| MDS211 — Nervous System | SA1 Mock Exam 1 | 77 | 60 min |
| | SA1 Mock Exam 2 | 77 | 60 min |
| | Neuro Past Paper | 249 | 185 min |
| | The Professor's Gauntlet | 300 | 225 min |
| | SA1 Hint Exam | 102 | 75 min |
| MDS220 — Musculo 1 | Full Practice Exam | 202 | 150 min |
| | Hard Practice Exam | 151 | 115 min |
| | Comprehensive Exam | 171 | 130 min |
| | Musculo Hard Exam | 87 | 65 min |
| MDS221 — Musculo 2 | Comprehensive Exam | 130 | 100 min |
| | Master Past Paper | 131 | 100 min |
| | Standard Mock Paper II | 120 | 90 min |

All papers are single best answer, pass mark 60%, with questions and options shuffled on
every attempt.

The time limit is chosen on each paper's start screen — 30 sec, 45 sec, 1 min, 1 min 15
or 1 min 30 per question — and the total is worked out from the question count and
rounded to the nearest 5 minutes. The choice is remembered for the next paper, and the
times in the table below are the 45-second default. A resumed attempt keeps the time it
was given when it started.

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

## Seeing how people use it (optional, off by default)

The site sends nothing anywhere as shipped — no analytics, no fonts, no third-party
scripts. Every answer and score lives in the visitor's own browser.

To count visits, open `assets/js/analytics.js` and fill in `CONFIG.site`:

1. Make a free account at [goatcounter.com](https://www.goatcounter.com) (free for
   personal use) and pick a code, e.g. `mds-mock`.
2. Put that code in `CONFIG.site` and push.
3. Watch the dashboard at `https://<code>.goatcounter.com`.

It uses no cookies, so no consent banner is needed. Papers are reported by name —
`/exam/mds211-gauntlet` rather than one lump of `exam.html` hits — so you can see
which papers actually get opened, along with visitor counts, referrers and countries.

Cloudflare Web Analytics works too: set `provider` to `'cloudflare'` and put your
token in `site`. It cannot label papers by name.

**Scores are never sent, under either provider** — visit counting and exam results are
completely separate. While counting is switched on, the footer says so; switch it off
and the line disappears.

If you ever do want the scores themselves, that needs somewhere to store them (a Google
Sheet via Apps Script is the usual free route) and your friends should be told, since
exam results are personal.

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
  durationMinutes: 60,          // reference only: the timer uses the pace picker
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
assets/js/analytics.js    optional visit counting (off until configured)
data/manifest.js      paper metadata for the home page (generated)
data/*.js             one file per paper (generated)
source-papers/        the original exam PDFs
tools/convert_papers.py   PDF → data/*.js converter
```

The home page loads `data/manifest.js` only — metadata, a few kilobytes. The questions
for a paper (up to ~320 KB) load when that paper is opened.
