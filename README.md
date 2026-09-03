# MDS Mock Exam

A static website for sitting timed mock exams. Pick a paper, sit it under exam
conditions, then get a score and a full answer review with explanations.

No build step, no server code, no accounts — plain HTML/CSS/JS.

## Running it

- **Locally:** open `index.html` in a browser (double-click works).
- **Sharing it:** Settings → Pages → Deploy from branch → root. The site is then live
  at `https://<username>.github.io/<repo>/`.

## Getting around

Three screens:

1. `index.html` — the subjects, listed by year, plus links out to the Drive folder and
   the Notion hub. Which year a subject belongs to is set in `COURSES` in
   `tools/convert_papers.py`, and the years are listed in the order `YEARS` gives.
2. `subject.html?course=MDS211` — that subject's papers, split into its subsets.
3. `exam.html?subject=<paper>` — the paper itself. Its back links return to the
   subject, not the front page, so the next paper is one tap away.

## The papers

25 papers, 3,040 questions, generated from the files in `source-papers/`. Cards appear in
the order the papers are listed in `tools/convert_papers.py`, except that papers carrying a
`badge` lead their subset, so a recommended paper added later still sits with its siblings.
A course can be split into subsets — MDS210, MDS211 and BCH212 each into SA1 and SA2 — by
giving its papers a `group`. The heading each subset gets is set per course in `GROUPS`,
since SA1 means Lectures 1–16 in MDS211, 1–9 in BCH212 and 1–5 in MDS210:

| Course | Subset | Paper | Questions | Time |
|---|---|---|---|---|
| MDS211 — Nervous System | SA1 · Lectures 1–16 | SA1 Mock Exam 1 | 77 | 60 min |
| | | SA1 Mock Exam 2 | 77 | 60 min |
| | | Neuro Past Paper | 251 | 190 min |
| | | The Professor's Gauntlet | 300 | 225 min |
| | | SA1 Hint Exam | 102 | 75 min |
| | SA2 · Lectures 17–29 | SA2 Mock Exam 1 | 77 | 60 min |
| | | SA2 Mock Exam 2 | 77 | 60 min |
| | | SA2 Mock Exam 3 | 77 | 60 min |
| | | Neuro Past Paper | 225 | 170 min |
| | | Lecture 28 New Professor Practice Set | 20 | 15 min |
| | | SA2 Lecture-Grouped Question Bank | 155 | 115 min |
| MDS220 — Musculoskeletal 1 | | Full Practice Exam | 202 | 150 min |
| | | Hard Practice Exam | 151 | 115 min |
| | | Comprehensive Exam | 171 | 130 min |
| | | Musculo Hard Exam | 87 | 65 min |
| MDS221 — Musculoskeletal 2 | | Comprehensive Exam | 130 | 100 min |
| | | Master Past Paper | 131 | 100 min |
| | | Standard Mock Paper II | 120 | 90 min |
| BCH212 — Biochemistry | SA1 · Lectures 1–9 | SA1 Mock Exam | 84 | 65 min |
| | SA2 · Lectures 10–21 | SA2 Mock Exam | 94 | 70 min |
| | | Full Simulation Paper | 192 | 145 min |
| MDS210 — Cell Biology | SA1 · Lectures 1–5 | SA1 Mock Exam | 60 | 45 min |
| | | SA1 Mock Exam 2 | 60 | 45 min |
| | SA2 · Lectures 6–10 | SA2 Mock Exam | 60 | 45 min |
| | | SA2 Mock Exam 2 | 60 | 45 min |

All papers are single best answer, pass mark 60%, with questions and options shuffled on
every attempt.

A paper does not have to be sat whole. The start screen lists its lectures with a
checkbox each, so an attempt can be just the lectures you pick; the results offer
**Retry the N you got wrong**, and every lecture in the breakdown has a **Practise**
button that sits only that lecture. A partial attempt is kept in the history, labelled
with what it covered, but never counts as a best score — 100% on twelve questions is
not 100% on the paper.

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
- One question at a time, with a navigator showing answered and flagged questions —
  foldable at any width, and it stays folded until you say otherwise
- Flag for review, jump around freely, arrow keys to move between questions
- Answers auto-save — closing the tab does not lose the attempt, reopening offers to resume
- Sit the whole paper, or tick the lectures you want; retry just what you got wrong
- Score against the pass mark, a per-lecture breakdown of where the marks went, then a
  per-question review with the source explanations, each tagged with its lecture
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

## Adding a paper as JSON (the easy route)

A paper supplied as JSON needs **no parsing rules and no entry in `PAPERS`**. Drop the
file in `source-papers/` with a `.json` extension, run the converter, and it appears.
PDFs work too, but every PDF so far has been laid out differently and needed its own
rules written first — JSON skips all of that.

```json
{
  "id": "mds211-sa3-mock",
  "name": "SA3 Mock Exam",
  "subtitle": "Real SA3 structure · 80 questions",
  "course": "MDS211",
  "group": "SA2",
  "icon": "📝",
  "badge": "Start here",
  "description": "One sentence for the card on the home page.",
  "questionCount": 80,
  "questions": [
    {
      "section": "Lecture 17 — Motor System",
      "stem": "Regarding the myotatic reflex, which of the following is correct?",
      "options": ["Afferent = Ib fiber", "Efferent = Ia fiber", "Antagonist = quadriceps",
                  "Heteronymous = hamstring", "Receptor = Golgi tendon organ"],
      "answer": "D",
      "explanation": "Shown in the review after answering."
    }
  ]
}
```

`id`, `name`, `course` and `questions` are required; everything else is optional.
`options` are labelled A, B, C… in the order given and `answer` names one of those
letters. `course` is `MDS211`, `MDS220` or `MDS221`; `group` is `SA1` or `SA2` where the
course uses subsets. A `badge` — "Start here" — moves the paper to the front of its subset.

`name` may safely keep the course code the generating chat put on it: a name beginning
with the paper's own course, such as `"MDS211 SA2 Mock Exam 3"` filed under `MDS211`, has
it trimmed, because on the site the card already sits under that course's heading.

The converter checks every question and reports what it finds — an answer letter that is
not one of the options, two identical options, an empty stem, a missing explanation, or a
`questionCount` that disagrees with the questions supplied. Run it with `--check` to see
the report without writing anything.

### Asking another chat to produce it

Paste this, with the material:

> Produce a single JSON file for my mock exam site, in exactly this shape:
> `{"id": "...", "name": "...", "subtitle": "...", "course": "MDS211", "group": "SA1",
> "icon": "📝", "description": "...", "questionCount": N, "questions": [{"section": "...",
> "stem": "...", "options": ["...","...","...","...","..."], "answer": "C",
> "explanation": "..."}]}`
> Rules: `answer` must be the letter of one of the options as ordered in the array.
> Every question needs an explanation. No question may reference a figure, picture or
> diagram, since the site is text only. Do not wrap the JSON in prose or markdown fences —
> output the file only. `id` must be lowercase with hyphens and unique.

## Rebuilding the papers from the PDFs

PDF papers each need an entry in `PAPERS` describing their layout. The files in `data/`
are generated. To change how a paper is converted, or to add a
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

Most papers collect their answers in a key at the back, named by `key_start`. A paper
that instead prints the answer under each question — as the BCH212 simulation papers do —
sets `inline_key: True` and an `answer_re` matching that line, and the questions and the
key are then read from the same text.

### Merging papers that are drafts of each other

Sometimes several PDFs are versions of one exam rather than separate papers: the three
BCH212 simulations shared 208 of their 400 questions, reworded. An entry in `MERGES`
builds one paper from all of them and marks the sources `internal`, so they are still
parsed and checked but get no card of their own.

Two questions count as the same when their wording is close **and** their option lists
largely agree. Wording alone is not enough — "the RATE-LIMITING enzyme of heme synthesis"
and "of bile acid synthesis" read nearly identically but are different questions, and
their options say so. Where a question appears more than once, the version with the
fullest explanation is kept, except that a clean explanation beats a longer one whose
symbols did not survive the PDF. `sections_from` names the paper whose lecture list the
merged paper uses; every question is re-filed against it **by topic**, which also fixes a
source that files the same topic under a different lecture number.

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

## Look and feel

The typeface is **Inter**, served from `assets/fonts/` rather than from a font CDN.
A `<link>` to Google Fonts would have meant every visitor's browser telling Google's
servers who was reading, which the promise below rules out. Three weights, Latin only,
about 72 KB — SIL Open Font License, copied into `assets/fonts/Inter-LICENSE.txt`.

Subject and paper icons are drawn in `assets/js/icons.js` as inline SVG rather than
left as emoji: an emoji is drawn by the operating system, so the same paper looked
different on every device and its colours ignored the palette. Each icon is stroked in
`currentColor`, so it takes its subject's colour. A paper whose emoji has no drawing
keeps the emoji, so a new one is never iconless.

The college mark (`assets/img/`) is in the header, the footer and the browser tab.
The footer says in as many words that this is a student's unofficial study site.

## The study buddy

Sit on one question without answering for 75 seconds and the buddy arrives the size
of the page, shrinking over three seconds into the corner with a line; 90 seconds
after that it comes back once more to point out that flagging a question and coming
back is allowed. Tapping it sends it away for that question.

**Put pictures in `assets/img/companion/`** and it uses one of those instead of the
drawn cat, a random one each time. There are two folders: one from `with-text/` turns
up on its own, because a meme with writing across it has already said its piece and a
bubble beside it is two jokes fighting; one from `no-text/` comes with a line to
speak. The flagging tip is the one message worth keeping, so it always goes to a
picture without words, or to the cat when there are none.

Name them `companion-1.jpg`, `companion-2.jpg` and so on within each folder (`.png`,
`.jpeg` and `.webp` also work); the search stops at the first missing number, so leave
no gaps. Nothing else needs changing — there is no list to keep in step and nothing to
rebuild. With both folders empty it draws the cat, so the feature can never break. The
picture is shown whole and never cropped: it keeps its own shape and is only bounded,
tall ones by the height and wide ones by the width. Nothing is fetched until the buddy
is actually due, so a reader who never stalls makes no requests for pictures at all.
The folder's own README has the rest.

It never says anything about the question itself. Anything it knew would be a hint,
and a mock exam that helps you is not worth sitting — `assets/js/companion.js` has
no access to the answers and its lines are a fixed list. It also stops counting when
the tab is in the background, goes away the moment you answer or move on, and takes
no clicks except its own, so it can never swallow a tap meant for an answer.

## Project layout

```
index.html            subject chooser, grouped by year
subject.html          one subject's papers, split into its subsets
exam.html             instructions → paper → results
assets/css/style.css  all styling
assets/js/store.js    localStorage (progress, results, theme)
assets/js/registry.js registerExam() and question normalising
assets/js/loader.js   loads one paper's questions on demand
assets/js/home.js     subjects by year, resource links, attempt history
assets/js/subject.js  the paper cards for one subject
assets/js/icons.js    the drawn icons the cards use
assets/js/companion.js the study buddy that turns up on a long question
assets/fonts/         Inter, self-hosted (SIL OFL)
assets/img/           the college logo and the tab icon
assets/img/companion/ drop pictures here: with-text/ speaks for itself, no-text/ gets a line
assets/js/exam.js     timer, paper, navigator, marking, review
assets/js/analytics.js    optional visit counting (off until configured)
assets/js/feedback.js     question reports → Google Sheet (off until configured)
tools/feedback-sheet.gs   Apps Script that receives them
data/manifest.js      paper metadata for the home page (generated)
data/*.js             one file per paper (generated)
source-papers/        the original exam PDFs
tools/convert_papers.py   PDF → data/*.js converter
```

The first two screens load `data/manifest.js` only — metadata, a few kilobytes. The questions
for a paper (up to ~320 KB) load when that paper is opened.
