# MDS Mock Exam

A static website for sitting timed mock exams. Pick a paper, sit it under exam
conditions, then get a score and a full answer review with explanations.

No build step, no server code, no accounts — plain HTML/CSS/JS.

## Running it

- **Locally:** open `index.html` in a browser (double-click works).
- **Sharing it:** Settings → Pages → Deploy from branch → root. The site is then live
  at `https://<username>.github.io/<repo>/`.

## The papers

15 papers, 2,178 questions, generated from the PDFs in `source-papers/`. Cards appear in
the order the papers are listed in `tools/convert_papers.py`. A course can be split into
subsets — MDS211 into SA1 and SA2 — by giving its papers a `group`:

| Course | Subset | Paper | Questions | Time |
|---|---|---|---|---|
| MDS211 — Nervous System | SA1 · Lectures 1–16 | SA1 Mock Exam 1 | 77 | 60 min |
| | | SA1 Mock Exam 2 | 77 | 60 min |
| | | Neuro Past Paper | 251 | 190 min |
| | | The Professor's Gauntlet | 300 | 225 min |
| | | SA1 Hint Exam | 102 | 75 min |
| | SA2 · Lectures 17–29 | SA2 Mock Exam 1 | 77 | 60 min |
| | | SA2 Mock Exam 2 | 77 | 60 min |
| | | Neuro Past Paper | 225 | 170 min |
| MDS220 — Musculo 1 | | Full Practice Exam | 202 | 150 min |
| | | Hard Practice Exam | 151 | 115 min |
| | | Comprehensive Exam | 171 | 130 min |
| | | Musculo Hard Exam | 87 | 65 min |
| MDS221 — Musculo 2 | | Comprehensive Exam | 130 | 100 min |
| | | Master Past Paper | 131 | 100 min |
| | | Standard Mock Paper II | 120 | 90 min |

All papers are single best answer, pass mark 60%, with questions and options shuffled on
every attempt.

Each paper's start screen offers two ways to be marked:

- **Exam** — timed, with the score and the full answer review at the end, like the real
  paper. This is the default.
- **Practice** — each answer is marked as soon as it is given, with its explanation, and
  the answer locks once marked. It runs untimed, with a running score in the header
  where the countdown would be, and still ends with the same results page.

In exam mode the time limit is chosen on the start screen — 30 sec, 45 sec, 1 min, 1 min 15
or 1 min 30 per question — and the total is worked out from the question count and
rounded to the nearest 5 minutes. The choice is remembered for the next paper, and the
times in the table below are the 45-second default. A resumed attempt keeps the time it
was given when it started.

Every question in every paper now has an answer: the two MDS211 items that used to be
recorded as illegible (105 and 238) are answered in the current edition of that paper.

## What the site does

- Papers grouped by course, each card showing question count, time and best score
- Exam mode (marked at the end) or practice mode (marked as you go, with explanations)
- Countdown that turns amber at 5 minutes and red at 1 minute, and auto-submits at zero
- One question at a time, with a navigator showing answered and flagged questions
- Flag for review, jump around freely, arrow keys to move between questions
- Answers auto-save — closing the tab does not lose the attempt, reopening offers to resume
- Score against the pass mark, then a per-question review with the source explanations
- Report a question that looks wrong, from the paper or from the review
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

## Question reports (needs a Google Sheet)

Every question carries a small **⚠ Report a problem** link, on the question itself and
again on each item in the answer review. It opens a short dialog: what kind of problem,
a comment, and an optional name that is remembered for next time.

Reports go straight into a Google Sheet you own — no form to fill in, no account needed
by whoever is reporting. Set it up once:

1. Make a Google Sheet to hold the reports.
2. In it: **Extensions → Apps Script**, delete the sample code, paste in
   `tools/feedback-sheet.gs`, and save.
3. **Deploy → New deployment → Web app**, with *Execute as* **Me** and *Who has access*
   **Anyone**. Authorise it, then copy the `/exec` URL.
4. Put that URL in `CONFIG.endpoint` in `assets/js/feedback.js` and push.

Opening the `/exec` URL in a browser should answer `{"ok":true,...}`. Each report becomes
a row: when it arrived, the paper, the question number and text, the options, what they
answered, what the key says, the problem, their comment and their name.

Re-deploy with **Manage deployments → edit → New version** after changing the script,
otherwise the old version keeps running.

### When rows do not appear

Open the `/exec` URL in a browser. What comes back says where the problem is:

| What you see | What it means |
|---|---|
| `{"ok":true,"sheet":"…","rows":N}` | Working, and writing to that sheet |
| `{"ok":false,"error":"…"}` | Deployed, but the script itself is failing — the error says why |
| A Google sign-in page | *Who has access* is not **Anyone**, so requests never reach the script |
| "Script function not found: doGet" | The code was saved but not re-deployed as a **New version** |

The most common cause of a silent failure is a **standalone** Apps Script project, where
`getActiveSpreadsheet()` returns nothing because the script is not attached to a sheet.
Setting `SHEET_ID` at the top of `tools/feedback-sheet.gs` avoids that entirely — it is
the long id in the sheet's URL.

**Nothing is lost if a send fails.** Every report is written to the reader's browser
first; if the network is down the report is queued and goes out next time they open the
site. Until `CONFIG.endpoint` is filled in, reports are only kept on the device and the
message says "saved" rather than claiming they were sent.

**Duplicate rows.** Each report carries an id that stays the same however many times
it is sent, and the script refuses an id it already holds. That matters because a report
whose delivery could not be confirmed is retried on the reader's next visit — before both
were in place, one report could arrive five times.

**The answer is never included while it is still hidden.** A report sent during an exam
question, or a practice question that has not been confirmed yet, deliberately leaves the
answer out, so a report cannot be used to peek. Reports from the review screen — where
the answer is already on display — include it.

## Questions the papers doubt themselves

Some archive questions are marked doubtful by the paper that carries them — an
explanation opening "FLAGGED", or one saying the question depended on a figure the
archive never captured. That warning used to be visible only after answering, so the
converter now lifts it onto the question as a `flag` and the site shows it before the
reader commits:

- **uncertain** — the source doubts the wording or the recorded answer (38 questions)
- **no-figure** — the question needs a picture the paper does not carry (5 questions)

Neither message hints at which option is right, so a flagged question can still be sat
normally. The counts are printed per paper when converting.

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
assets/js/feedback.js     question reports → Google Sheet (off until configured)
tools/feedback-sheet.gs   Apps Script that receives them
data/manifest.js      paper metadata for the home page (generated)
data/*.js             one file per paper (generated)
source-papers/        the original exam PDFs
tools/convert_papers.py   PDF → data/*.js converter
```

The home page loads `data/manifest.js` only — metadata, a few kilobytes. The questions
for a paper (up to ~320 KB) load when that paper is opened.
