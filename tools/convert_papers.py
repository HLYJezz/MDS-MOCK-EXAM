#!/usr/bin/env python3
"""Convert the PDFs in source-papers/ into the site's data/*.js question files.

Every paper has its own layout, so each one gets an entry in PAPERS below saying
where its questions and its answer key are and how they are written. The parsing
itself is shared.

Run from the repo root:   python3 tools/convert_papers.py
Add --check to parse and report without writing any files.

Requires pypdf (pip install pypdf).
"""

import json
import os
import re
import sys
import unicodedata

from pypdf import PdfReader

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'source-papers')
OUT = os.path.join(ROOT, 'data')

SECONDS_PER_QUESTION = 45
PASS_MARK = 60

# --------------------------------------------------------------------------
# Per-paper configuration
#
#   file          PDF name in source-papers/
#   id            used in the URL and as the data file name
#   course        grouping on the home page
#   group         optional subset within the course, e.g. 'SA1' / 'SA2'
#   expected      how many questions the paper says it has
#   body_start    optional; text marking where the questions begin, for papers
#                 whose front matter contains numbered lists of its own
#   key_start     text that marks the beginning of the answer key
#   key_mode      how the key is written (see parse_key)
#   section_re    optional; matches a section/lecture heading in the questions
#   sec_key_re    optional; the same headings as they appear inside the key
#   drop_re       page furniture to throw away
#   badge         optional label shown on the card, e.g. 'Start here'
# --------------------------------------------------------------------------

PAGE_FURNITURE = r'^\s*Page\s+\d+\s*$|^\s*\d{1,3}\s*$'

# Headings every paper shares a shape for, whatever its own section_re says:
# "PART 3 — Ear Development", "Taste (Gustatory) Pathway (5 questions)",
# "SECTION B -- Gross Anatomy". Recognising these keeps them out of the option
# and explanation text even where a paper's own pattern does not describe them.
GENERIC_SECTION = re.compile(
    r'^(?:PART\s+\d+\s*[—–-].*'
    r'|.{3,80}\(\d+\s+questions?\)'
    r'|SECTION\s+[A-Z0-9]+\s*(?:--|—|–).*'
    r'|Section\s+\d+\s*[·•].*)$'
)


# A heading can wrap onto a second line, so its first line lacks the trailing
# "(12 questions)" that GENERIC_SECTION looks for. These prefixes catch the
# opening line; the rest is swallowed until the next question or option.
SECTION_START = re.compile(
    r'^(?:PART\s+\d+\s*[—–-]'
    r'|Lectures?\s+[\d\s,–—-]+[—–-]\s*\S'
    r'|SECTION\s+[A-Z0-9]+\s*(?:--|—|–)'
    r'|Section\s+\d+\s*[·•])'
)


def is_section(line, section_re):
    return bool((section_re and section_re.match(line))
                or GENERIC_SECTION.match(line)
                or SECTION_START.match(line))

PAPERS = [
    {
        'file': 'MDS211 SA1 MockExam 77Q.pdf',
        'id': 'mds211-sa1-mock-1',
        'group': 'SA1',
        'badge': 'Start here',
        'name': 'SA1 Mock Exam 1',
        'subtitle': 'Real SA1 structure · 77 questions',
        'course': 'MDS211',
        'icon': '📝',
        'expected': 77,
        'key_start': 'Answer Key & Explanations',
        'key_mode': 'q_correct',
        'section_re': r'^Lecture\s+\d+\s*[—–-]\s*.+\(\d+\s+questions?\)\s*$',
        'drop_re': r'^MDS211_SA1_MockExam_77Q\.pdf$|' + PAGE_FURNITURE,
        'description': 'Mirrors the real SA1 exam structure: 77 questions spread across Lectures 1–16 in proportion '
                       'to lecture hours, drawn from the verified question bank.',
    },
    {
        'file': 'MDS211 SA1 MockExam 77Q v2.pdf',
        'id': 'mds211-sa1-mock-2',
        'group': 'SA1',
        'badge': 'Start here',
        'name': 'SA1 Mock Exam 2',
        'subtitle': 'Second set · no overlap with Mock 1',
        'course': 'MDS211',
        'icon': '📝',
        'expected': 77,
        'key_start': 'Answer Key & Explanations',
        'key_mode': 'q_correct',
        'section_re': r'^Lecture\s+\d+\s*[—–-]\s*.+\(\d+\s+questions?\)\s*$',
        'drop_re': r'^MDS211_SA1_MockExam_77Q_v2\.pdf$|' + PAGE_FURNITURE,
        'description': 'A second, fully independent SA1 set with no overlap with Mock Exam 1, using the same real '
                       'exam weighting.',
    },
    {
        'file': 'MDS211 Neuro PastPaper Lec1-16 CorrectedKey.pdf',
        'id': 'mds211-past-paper',
        'group': 'SA1',
        'name': 'Neuro Past Paper',
        'subtitle': 'Lectures 1–16 · corrected key',
        'course': 'MDS211',
        'icon': '🧠',
        'expected': 251,
        'key_start': 'Answer Key & Explanations',
        'key_mode': 'q_correct',
        'section_re': r'^Lecture\s+\d+\s*[—–-]\s*.+\(\d+\s+questions?\)\s*$',
        'drop_re': r'^MDS211_PastPaper_Lec1-16_CorrectedKey\.pdf$|' + PAGE_FURNITURE,
        'description': 'Every recorded question from the MDS211 past-paper archive for Exam 1 (Lectures 1–16), '
                       'de-duplicated, with the answer key re-verified against source material.',
    },
    {
        'file': 'MDS211_SA2_MockExam_Lec17-29_77Q.pdf',
        'id': 'mds211-sa2-mock',
        'group': 'SA2',
        'badge': 'Start here',
        'name': 'SA2 Mock Exam 1',
        'subtitle': 'Real SA2 structure · 77 questions',
        'course': 'MDS211',
        'icon': '📝',
        'expected': 77,
        'body_start': 'Section 1 — Questions',
        'key_start': 'Section 2 — Answer Key & Explanations',
        'key_mode': 'q_correct',
        'section_re': r'^Lecture\s+\d+\s*[—–-]\s*.+$',
        'drop_re': r'^MDS211 Nervous System · SA2 Mock Exam · Lectures 17–29$|' + PAGE_FURNITURE,
        'description': 'Mirrors the real SA2 exam structure: 77 questions across Lectures 17–29 in proportion to '
                       'lecture hours, with a common-trap note on every answer.',
    },
    {
        'file': 'MDS211_SA2_MockExam2_Lec17-29_77Q.pdf',
        'id': 'mds211-sa2-mock-2',
        'group': 'SA2',
        'badge': 'Start here',
        'name': 'SA2 Mock Exam 2',
        'subtitle': 'Second set · no overlap with Mock 1',
        'course': 'MDS211',
        'icon': '📝',
        'expected': 77,
        'body_start': 'Section 1 — Questions',
        'key_start': 'Section 2 — Answer Key & Explanations',
        'key_mode': 'q_correct',
        'section_re': r'^Lecture\s+\d+\s*[—–-]\s*.+$',
        'drop_re': r'^MDS211 Nervous System · SA2 Mock Exam 2 · Lectures 17–29$|' + PAGE_FURNITURE,
        'description': 'A second, fully independent SA2 set with no overlap with Mock Exam 1, using the same real '
                       'exam weighting.',
    },
    {
        'file': 'MDS211 Neuro PastPaper Lec17-29 CorrectedKey.pdf',
        'id': 'mds211-past-paper-sa2',
        'name': 'Neuro Past Paper',
        'subtitle': 'Lectures 17–29 · corrected key',
        'course': 'MDS211',
        'group': 'SA2',
        'icon': '🧠',
        'expected': 225,
        'key_start': 'Answer Key & Explanations',
        'key_mode': 'q_correct',
        'section_re': r'^Lecture\s+\d+\s*[—–-]\s*.+\(\d+\s+questions?\)\s*$',
        'drop_re': r'^MDS211_PastPaper_Lec17-29_CorrectedKey\.pdf$|' + PAGE_FURNITURE,
        'description': 'Every recorded question from the MDS211 past-paper archive for Exam 2 (Lectures 17–29), '
                       'de-duplicated, with the answer key re-verified against source material.',
    },
    {
        'file': 'MDS211 Professors Gauntlet.pdf',
        'id': 'mds211-gauntlet',
        'group': 'SA1',
        'name': "The Professor's Gauntlet",
        'subtitle': 'Lectures 1–16 · distractor analysis',
        'course': 'MDS211',
        'icon': '⚔️',
        'expected': 300,
        'key_start': 'Answer Key & Full Distractor Analysis',
        'key_mode': 'q_correct',
        'section_re': r'^Lecture\s+\d+\s*[—–-]\s*.+\(\d+\s+questions?\)\s*$',
        'drop_re': r'^MDS211_Professors_Gauntlet\.pdf$|' + PAGE_FURNITURE,
        'description': 'Half archive-verified questions, half original critical-thinking items written from the '
                       'lecture slides. Every answer explains why the tempting wrong choices are traps.',
    },
    {
        'file': 'MDS211 SA1 HintExam ProfKanokporn.pdf',
        'id': 'mds211-sa1-hints',
        'group': 'SA1',
        'name': 'SA1 Hint Exam',
        'subtitle': "Prof. Kanokporn's hint list",
        'course': 'MDS211',
        'icon': '🎯',
        'expected': 102,
        'key_start': 'Answer Key & Full Explanations',
        'key_mode': 'q_correct',
        'section_re': r'^(?:Ear|Eye|Somatosensory|Taste|Smell|Special Senses)[^\n]{0,60}\(\d+\s+questions?\)\s*$',
        'drop_re': r'^MDS211_SA1_HintExam_ProfKanokporn\.pdf$|' + PAGE_FURNITURE,
        'description': "Built directly from the topics Prof. Kanokporn named as exam hints, with 'Prof's Emphasis' "
                       'notes flagging the exact distinctions she tends to test.',
    },
    {
        'file': 'MDS220 Full Practice Exam 202Q.pdf',
        'id': 'mds220-full-202',
        'name': 'Full Practice Exam',
        'subtitle': '202 questions · Lectures 1–23',
        'course': 'MDS220',
        'icon': '📘',
        'expected': 202,
        'key_start': 'Answer Key & Explanations',
        'key_mode': 'num_answer',
        'section_re': r'^Section\s+\d+\s*[·•]\s*.+$',
        'drop_re': r'^MDS220 Full Practice Exam \(202Q\).*$|' + PAGE_FURNITURE,
        'description': 'Full-length paper mirroring the real exam weighting, mixing straight recall with applied '
                       'reasoning across the whole course.',
    },
    {
        'file': 'MDS220 Hard Practice Exam 151Q balanced.pdf',
        'id': 'mds220-hard-151',
        'name': 'Hard Practice Exam',
        'subtitle': '151 critical-thinking questions',
        'course': 'MDS220',
        'icon': '🔥',
        'expected': 151,
        'key_start': 'Answer Key & Detailed Explanations',
        'key_mode': 'num_answer',
        'section_re': r'^Section\s+\d+\s*[·•]\s*.+$',
        'drop_re': r'^MDS220 Hard Practice Exam.*$|' + PAGE_FURNITURE,
        'description': 'The hardest of the MDS220 sets — clinical vignettes and multi-step reasoning rather than '
                       'recall.',
    },
    {
        'file': 'MDS220 Musculo1 Comprehensive Exam.pdf',
        'id': 'mds220-comprehensive',
        'name': 'Comprehensive Exam',
        'subtitle': '171 questions · Lectures 1–22',
        'course': 'MDS220',
        'icon': '🦴',
        'expected': 171,
        'key_start': 'Answer Key with Explanations',
        'key_mode': 'num_dash',
        'section_re': r'^SECTION\s+[A-Z]\s*--\s*.+$',
        'drop_re': PAGE_FURNITURE,
        'description': 'Broad single-best-answer coverage of the whole musculoskeletal course, built from the '
                       'lecture slides.',
    },
    {
        'file': 'MDS220 Musculo1 Hard Exam.pdf',
        'id': 'mds220-musculo-hard',
        'name': 'Musculo Hard Exam',
        'subtitle': '87 high-difficulty questions',
        'course': 'MDS220',
        'icon': '💥',
        'expected': 87,
        'key_start': 'Answer Key with Explanations',
        'key_mode': 'num_dash',
        'section_re': r'^SECTION\s+[A-Z]\s*--\s*.+$',
        'drop_re': PAGE_FURNITURE,
        'description': 'Short, sharp and difficult: clinical vignettes, NOT/EXCEPT items and nerve–muscle–action '
                       'reasoning.',
    },
    {
        'file': 'MDS221 Exam Full.pdf',
        'id': 'mds221-comprehensive',
        'name': 'Comprehensive Exam',
        'subtitle': '130 questions · Lectures 1–12',
        'course': 'MDS221',
        'icon': '📗',
        'expected': 130,
        'key_start': 'Answer Key with Explanations',
        'key_mode': 'num_dash',
        'section_re': r'^SECTION\s+\d+\s*[—–-]\s*.+$',
        'drop_re': PAGE_FURNITURE,
        'description': 'Full-course paper covering head, neck and trunk anatomy plus muscle physiology.',
    },
    {
        'file': 'MDS221 Master Past Paper.pdf',
        'id': 'mds221-master-past-paper',
        'name': 'Master Past Paper',
        'subtitle': '131 distinct questions, repeats merged',
        'course': 'MDS221',
        'icon': '🗂️',
        'expected': 131,
        'key_start': 'Answer key & reasoning',
        'key_mode': 'grid_seq',
        'grid_start': 'Answer grid',
        # Headings are capitalised topic lines; the front-matter labels and the
        # "LECTURES 3–4" strap lines that sit beside them are excluded.
        'section_re': r'^(?!LECTURES?\b|QUESTIONS$|SECTIONS$|COVERAGE$|FORMAT$|BUILT FROM$'
                      r'|HOW THIS PAPER|MASTER PAST PAPER|NO\.$|ANS$)[A-Z][A-Z0-9 ,&:\'’()–—-]{2,}$',
        'drop_re': PAGE_FURNITURE,
        'description': 'The real MDS221 past paper rebuilt: all 190 recovered items with the repeats merged and '
                       'out-of-syllabus questions removed.',
    },
    {
        'file': 'MDS221 Standard Mock Exam 2.pdf',
        'id': 'mds221-standard-mock-2',
        'name': 'Standard Mock Paper II',
        'subtitle': '120 questions · past-paper level',
        'course': 'MDS221',
        'icon': '📄',
        'expected': 120,
        'key_start': 'Answer Key & Reasoning',
        'key_mode': 'num_letter_dash',
        'grid_start': 'Answer Grid',
        'section_re': r'^\d{2}\s+[A-Z][A-Z &,:\'’()–-]{3,}$',
        'drop_re': r'^MDS221 — Standard Mock Paper II$|' + PAGE_FURNITURE,
        'description': 'A fresh set at the same level as the real past paper — single-step recall, no clinical '
                       'vignettes.',
    },
    # The three BCH212 simulation papers print their answers under each question
    # rather than in a key at the back — hence inline_key — except the third,
    # which repeats them in a proper key section.
    {
        'file': 'BCH212_Simulation_Exam.pdf',
        'id': 'bch212-simulation-1',
        'internal': True,   # merged into bch212-simulation
        'name': 'Simulation Exam 1',
        'subtitle': 'Lectures 10–21 · past-paper starred',
        'course': 'BCH212',
        'icon': '🧪',
        'expected': 116,
        'inline_key': True,
        'key_mode': 'q_answer',
        'q_re': r'^Q(\d{1,3})\s*[.)]\s*(.*)$',
        'answer_re': r'^[✔✓]?\s*Answer\s*:',
        'stem_strip_re': r'^\s*(?:★\s*)?(?:\[(?:PP|PAST PAPER)\]|★)\s*',
        'section_re': r'^(?:LECTURE|Lec)\s+\d+\s*:\s*.+$',
        'drop_re': PAGE_FURNITURE,
        'description': 'Simulation paper for the SA2 half of first-year biochemistry, Lectures 10–21, with a full '
                       'explanation under every answer and past-paper questions marked in the explanation.',
    },
    {
        'file': 'BCH212_Simulation_Exam 2.pdf',
        'id': 'bch212-simulation-2',
        'internal': True,   # merged into bch212-simulation
        'name': 'Simulation Exam 2',
        'subtitle': 'Lectures 10–21 · second set',
        'course': 'BCH212',
        'icon': '🧬',
        'expected': 142,
        'inline_key': True,
        'key_mode': 'q_answer',
        'q_re': r'^Q(\d{1,3})\s*[.)]\s*(.*)$',
        'answer_re': r'^[✔✓]?\s*Answer\s*:',
        'stem_strip_re': r'^\s*(?:★\s*)?(?:\[(?:PP|PAST PAPER)\]|★)\s*',
        'section_re': r'^(?:LECTURE|Lec)\s+\d+\s*:\s*.+$',
        'drop_re': PAGE_FURNITURE,
        'description': 'A longer second run at Lectures 10–21, weighted towards the lectures the real paper leans '
                       'on hardest — liver function, nutrition and clinical correlation.',
    },
    {
        'file': 'BCH212_Simulation_Exam 3.pdf',
        'id': 'bch212-simulation-3',
        'internal': True,   # merged into bch212-simulation
        # Its own stem names the condition: "In beta-zero thalassemia/HbE …"
        'glyph_fixes': {'beta■-thalassemia': 'beta-zero thalassemia'},
        'name': 'Simulation Exam 3',
        'subtitle': 'Lectures 10–21 · most past-paper questions',
        'course': 'BCH212',
        'icon': '🔬',
        'expected': 142,
        'key_start': 'ANSWER KEY & EXPLANATIONS',
        'key_mode': 'q_answer',
        'q_re': r'^Q(\d{1,3})\s*[.)]\s*(.*)$',
        'answer_re': r'^[✔✓]?\s*Answer\s*:',
        'stem_strip_re': r'^\s*(?:★\s*)?(?:\[(?:PP|PAST PAPER)\]|★)\s*',
        'section_re': r'^(?:LECTURE|Lec)\s+\d+\s*:\s*.+$',
        'drop_re': PAGE_FURNITURE,
        'description': 'The set with the heaviest past-paper content — 108 of its questions are drawn from real '
                       'BCH212 papers — with the answer key and explanations collected at the back.',
    },
]

# --------------------------------------------------------------------------
# Merged papers
#
# Some papers are drafts of one another rather than separate exams — the three
# BCH212 simulation papers share most of their questions, reworded. Listing them
# here builds one paper from all of them with the repeats removed, and the
# sources are marked 'internal' so they get no card of their own.
#
#   sources        paper ids, best first: where two papers hold the same
#                  question, ties are settled in this order
#   sections_from  the paper whose section list the merged one uses; every
#                  question is re-filed against it by topic, which also fixes
#                  a source that numbers its lectures differently
# --------------------------------------------------------------------------

MERGES = [
    {
        'id': 'bch212-simulation',
        'name': 'Full Simulation Paper',
        'subtitle': 'Lectures 10–21 · all three simulations, repeats merged',
        'course': 'BCH212',
        'group': 'SA2',        # Lectures 10–21, the same scope as the SA2 mock
        'icon': '🧪',
        'sources': ['bch212-simulation-3', 'bch212-simulation-2', 'bch212-simulation-1'],
        'sections_from': 'bch212-simulation-3',
        'description': 'The three BCH212 simulation papers combined into one, with the questions they shared '
                       'kept only once — where a question appeared more than once, the version with the fullest '
                       'explanation was kept. Covers Lectures 10–21, from DNA and RNA synthesis through to '
                       'clinical correlation.',
    },
]

# Subset headings, per course: SA1 and SA2 cover different lectures in each, so
# one shared list would caption a BCH212 paper with MDS211's lecture range.
GROUPS = {
    'MDS211': {
        'SA1': 'SA1 · Lectures 1–16',
        'SA2': 'SA2 · Lectures 17–29',
    },
    'BCH212': {
        'SA1': 'SA1 · Lectures 1–9',
        'SA2': 'SA2 · Lectures 10–21',
    },
    'MDS210': {
        'SA1': 'SA1 · Lectures 1–5',
        'SA2': 'SA2 · Lectures 6–10',
    },
}

# The home page lists courses by year, in the order given here.
YEARS = ['Year 1', 'Year 2']

COURSES = {
    'MDS210': {'title': 'MDS210 — Cell Biology', 'accent': '#b3325a',
               'year': 'Year 1', 'icon': '🔬'},
    'BCH212': {'title': 'BCH212 — Biochemistry', 'accent': '#c2600f',
               'year': 'Year 1', 'icon': '⚗️'},
    'MDS211': {'title': 'MDS211 — Nervous System', 'accent': '#2f5bd6',
               'year': 'Year 2', 'icon': '🧠'},
    'MDS220': {'title': 'MDS220 — Musculoskeletal 1', 'accent': '#12855c',
               'year': 'Year 2', 'icon': '🦴'},
    'MDS221': {'title': 'MDS221 — Musculoskeletal 2', 'accent': '#8a4bd3',
               'year': 'Year 2', 'icon': '💪'},
}

# --------------------------------------------------------------------------
# Text extraction and clean-up
# --------------------------------------------------------------------------

def pdf_text(path):
    reader = PdfReader(path)
    return '\n'.join((page.extract_text() or '') for page in reader.pages)


# Some superscripts do not survive extraction, leaving '■' behind: 'Ca2■',
# 'haem + O■'. These shapes mean only one thing wherever they appear. Anything
# needing the surrounding sentence to read it goes in a paper's own
# 'glyph_fixes' instead, so the judgement is written down rather than guessed
# at here. (A bare '■' is left alone: the MDS papers use it to flag a question.)
GLYPH_REPAIRS = [
    (re.compile(r'\b([A-Z][a-z]?)(\d)■'), r'\1\2+'),                       # Ca2■  -> Ca2+
    (re.compile(r'\bO■(?![A-Za-z])'), 'O2'),                               # O■    -> O2
    (re.compile(r'\bNAD■'), 'NAD+'),                                       # NAD■  -> NAD+
    (re.compile(r'\b(alpha|beta|gamma|delta)■(alpha|beta|gamma|delta)■'),
     r'\g<1>2\g<2>2'),                                                     # alpha■gamma■ -> alpha2gamma2
]


def repair_glyphs(text, fixes=None):
    for pattern, replacement in GLYPH_REPAIRS:
        text = pattern.sub(replacement, text)
    for broken, fixed in (fixes or {}).items():
        text = text.replace(broken, fixed)
    return text


def clean_lines(text, drop_re):
    drop = re.compile(drop_re) if drop_re else None
    out = []
    for raw in text.split('\n'):
        line = raw.replace('\t', ' ').replace('\x7f', '·').replace('\xa0', ' ')
        line = unicodedata.normalize('NFKC', line).strip()
        if not line:
            out.append('')
            continue
        if drop and drop.match(line):
            continue
        out.append(line)
    return out


def join_wrapped(parts):
    """Join the lines of a stem or option back into one string."""
    text = ' '.join(p.strip() for p in parts if p.strip())
    return re.sub(r'\s+', ' ', text).strip()


# --------------------------------------------------------------------------
# Question parsing
# --------------------------------------------------------------------------

Q_RE = re.compile(r'^(\d{1,3})\s*[.)]\s*(.*)$')
OPT_RE = re.compile(r'^\(?([A-E])[.)]\s*(.*)$')

# Annotations printed under a question: footnote daggers, the papers' "Prof's
# Trick" boxes, and ambiguity flags. They are commentary, not part of an option,
# so they and their wrapped continuation lines are dropped from the questions.
# (The same notes are kept where they appear in the answer key.)
NOISE_RE = re.compile(r'^(†|■|PROF[’\']S\s+(TRICK|EMPHASIS)|Examiner patterns to expect)', re.I)


def tidy_section(line, acronyms=frozenset()):
    """Turn a heading like 'SECTION B -- Gross Anatomy' or 'Lecture 4 — Cells
    (19 questions)' into the short label shown on the question card."""
    s = re.sub(r'\s+', ' ', line).strip()
    s = re.sub(r'\s*\(\d+\s+questions?\)\s*$', '', s)          # trailing counts
    s = re.sub(r'\s*[—–-]\s*[\d.]+\s*hr\b.*$', '', s)            # "— 1.0 hr — 5 questions"
    s = re.sub(r'\s*[—–-]\s*\d+\s+questions?\s*$', '', s)
    s = re.sub(r'^(SECTION\s+[A-Z0-9]+|Section\s+\d+|\d{2})\s*(--|—|–|-|·|•)?\s*', '', s)
    s = s.replace(' -- ', ' — ')
    s = re.sub(r'(\w)\(', r'\1 (', s)                          # "Correlation(BIOCHEMICAL"
    # Headings are often set in capitals; title-case them so the chip is readable.
    parts = []
    for chunk in re.split(r'(\([^)]*\))', s):                  # keep any bracketed tail
        bare = chunk.strip('() ')
        if bare.isupper() and len(bare) >= 4:                  # keep short acronyms (CNS, TMJ)
            chunk = keep_acronyms(chunk.title(), chunk, acronyms)
        parts.append(chunk)
    s = ''.join(parts)
    return s.strip() or re.sub(r'\s+', ' ', line).strip()


ACRONYM_RE = re.compile(r'\b[A-Z]{2,5}\b')


def collect_acronyms(lines):
    """The real acronyms in a paper, read off its own prose.

    A heading in capitals gives no clue which of its words are acronyms — LIVER
    and DNA look alike. The explanations do: they are ordinary sentences, so a
    word still in capitals there ('confirmed by the Meselson-Stahl experiment',
    'DNA polymerase') is an acronym, while 'liver' is written in lower case."""
    found, spelt_out = set(), set()
    for line in lines:
        if any(c.islower() for c in line):          # a sentence, not a heading
            found.update(ACRONYM_RE.findall(line))
            spelt_out.update(w.upper() for w in re.findall(r'\b[A-Za-z]{2,5}\b', line)
                             if not w.isupper())
    # A word the paper also writes in ordinary letters somewhere — 'LIVER' set
    # in capitals for emphasis, but 'liver' in the next sentence — is a word
    # being shouted, not an acronym. DNA is never written 'dna'.
    return found - spelt_out


def keep_acronyms(titled, original, acronyms):
    """title() turns 'DNA & RNA SYNTHESIS' into 'Dna & Rna Synthesis'. Put back
    the words the paper uses as acronyms, so it reads 'DNA & RNA Synthesis'."""
    out = re.split(r'(\s+)', titled)          # keep the spacing exactly as it was
    for i, word in enumerate(re.split(r'(\s+)', original)):
        if i < len(out) and re.sub(r'[^A-Za-z]', '', word) in acronyms:
            out[i] = word
    return ''.join(out)


def parse_questions(lines, cfg, acronyms=frozenset()):
    """Walk the question half of the paper and pull out stems and options."""
    section_re = re.compile(cfg['section_re']) if cfg.get('section_re') else None
    q_re = re.compile(cfg['q_re']) if cfg.get('q_re') else Q_RE
    # Papers that print the answer under each question rather than in a key at
    # the back: the answer and its explanation end the question here, and are
    # read separately by parse_key.
    answer_re = re.compile(cfg['answer_re']) if cfg.get('answer_re') else None
    strip_re = re.compile(cfg['stem_strip_re']) if cfg.get('stem_strip_re') else None
    questions = []
    section = None
    section_parts = []
    cur = None            # question being built
    target = None         # 'stem' or an option dict

    for line in lines:
        if not line:
            continue

        if is_section(line, section_re):
            section_parts = [line]
            section = tidy_section(line, acronyms)
            target = 'section'      # keep eating until a question or option starts
            continue

        if NOISE_RE.match(line):
            target = None      # also swallows the note's wrapped lines
            continue

        m = q_re.match(line)
        # Only start a new question if the number follows on from the last one:
        # this stops stray numbers inside option text from splitting a question.
        if m and int(m.group(1)) == len(questions) + 1:
            cur = {'number': int(m.group(1)), 'section': section,
                   'stem_parts': [m.group(2)], 'options': []}
            questions.append(cur)
            target = 'stem'
            continue

        if cur is None:
            continue

        if answer_re and answer_re.match(line):
            target = None      # the answer and everything under it belong to the key
            continue

        m = OPT_RE.match(line)
        if m:
            opt = {'id': m.group(1), 'parts': [m.group(2)]}
            cur['options'].append(opt)
            target = opt
            continue

        if target == 'section':
            section_parts.append(line)
            section = tidy_section(' '.join(section_parts), acronyms)
        elif target == 'stem':
            cur['stem_parts'].append(line)
        elif isinstance(target, dict):
            target['parts'].append(line)

    for q in questions:
        q['stem'] = join_wrapped(q['stem_parts'])
        if strip_re:
            # "[PP]" / "★ [PAST PAPER]" tags say where a question came from; the
            # key repeats that in the explanation, so they go from the stem.
            q['stem'] = strip_re.sub('', q['stem'], count=1).strip()
        q['options'] = [{'id': o['id'], 'text': join_wrapped(o['parts'])} for o in q['options']]
        del q['stem_parts']
    return questions


# --------------------------------------------------------------------------
# Answer key parsing — one function per layout
# --------------------------------------------------------------------------

KEY_PATTERNS = {
    # "Q12. stem" then "Correct answer: D. text" / "✓ Correct: A. text" / "Archive answer: B. text"
    'q_correct': {
        'entry': re.compile(r'^Q(\d{1,3})\.\s*(.*)$'),
        'answer': re.compile(r'^(?:✓\s*)?(?:Correct answer|Archive answer|Correct)\s*:\s*'
                             r'\(?([A-E])[.)]?\s*(.*)$'),
    },
    # "12. stem" then "Answer: C) text"
    'num_answer': {
        'entry': re.compile(r'^(\d{1,3})\s*[.)]\s*(.*)$'),
        'answer': re.compile(r'^Answer\s*:\s*\(?([A-E])[.)]?\s*(.*)$'),
    },
    # "12. B — text"
    'num_dash': {
        'entry': re.compile(r'^(\d{1,3})\s*[.)]\s*\(?([A-E])\)?\s*[—–-]\s*(.*)$'),
    },
    # "Q12. stem" then "Answer: C" / "✔ Answer: C", explanation underneath.
    # Used by papers that print the answer under each question instead of
    # collecting them in a key at the back.
    'q_answer': {
        'entry': re.compile(r'^Q(\d{1,3})\s*[.)]\s*(.*)$'),
        'answer': re.compile(r'^[✔✓]?\s*Answer\s*:\s*\(?([A-E])[.)]?\s*(.*)$'),
    },
    # "12.  stem" then "D  —  text"
    'num_letter_dash': {
        'entry': re.compile(r'^(\d{1,3})\s*[.)]\s*(.*)$'),
        'answer': re.compile(r'^\(?([A-E])\)?\s*[—–]\s*(.*)$'),
    },
}


def parse_key(lines, cfg, raw_lines=None):
    """Return {question number: {'letter':…, 'text':…, 'explanation':…}}."""
    mode = cfg['key_mode']
    if mode == 'grid_seq':
        return parse_key_grid_seq(lines, raw_lines, cfg)

    pats = KEY_PATTERNS[mode]
    section_re = re.compile(cfg['section_re']) if cfg.get('section_re') else None
    entries = {}
    cur = None
    skipping = False      # inside a section heading, which may wrap over lines

    for line in lines:
        if not line:
            continue

        m = pats['entry'].match(line)
        if m:
            skipping = False
            if mode == 'num_dash':
                num = int(m.group(1))
                cur = {'letter': m.group(2), 'text': m.group(3), 'parts': []}
                entries[num] = cur
                continue
            num = int(m.group(1))
            # Numbered layouts echo the stem, so only accept sensible numbering.
            if mode != 'q_correct' and num in entries:
                continue
            cur = {'letter': None, 'text': '', 'parts': []}
            entries[num] = cur
            continue

        # The key repeats the paper's section headings between entries. Without
        # this they land on the end of the preceding explanation — and because a
        # heading can wrap onto a second line, skip until the next entry starts.
        if is_section(line, section_re):
            skipping = True
            continue
        if skipping:
            continue

        if cur is None:
            continue

        if 'answer' in pats and cur['letter'] is None:
            m = pats['answer'].match(line)
            if m:
                cur['letter'] = m.group(1)
                cur['text'] = m.group(2)
                continue
            # Before the answer line the text is just the echoed stem — skip it.
            continue

        cur['parts'].append(line)

    for e in entries.values():
        e['explanation'] = join_wrapped(e['parts'])
        e['text'] = join_wrapped([e['text']])
        del e['parts']
    return entries


def parse_key_grid_seq(lines, raw_lines, cfg):
    """Answers come from a numbered grid; explanations follow in question order.

    The grid is the authority on which letter is correct, because its entries are
    numbered. The prose block that precedes it gives a letter, the answer text and
    the reasoning for each question in order, so the two are matched up and any
    disagreement is reported.

    The grid is read from raw_lines: it is a table of bare numbers and letters, and
    the ordinary clean-up strips bare numbers as page furniture.
    """
    raw = '\n'.join(raw_lines)
    graw = raw.find(cfg['grid_start'])
    if graw == -1:
        raise SystemExit('grid not found for ' + cfg['id'])

    grid = {}
    pending = None
    for tok in raw[graw:].split('\n'):
        tok = tok.strip()
        if re.fullmatch(r'\d{1,3}', tok):
            pending = int(tok)
        elif re.fullmatch(r'[A-E]', tok) and pending is not None:
            grid[pending] = tok
            pending = None

    # Prose entries: a lone letter line, the answer text, then the reasoning.
    text = '\n'.join(lines)
    gstart = text.find(cfg['grid_start'])
    if gstart == -1:
        gstart = len(text)
    prose = []
    cur = None
    skipping = False
    section_re = re.compile(cfg['section_re']) if cfg.get('section_re') else None
    for line in text[:gstart].split('\n'):
        line = line.strip()
        if not line:
            continue
        if re.fullmatch(r'[A-E]', line):
            skipping = False
            cur = {'letter': line, 'text': None, 'parts': []}
            prose.append(cur)
            continue
        if section_re and section_re.match(line):
            skipping = True
            continue
        if skipping:
            continue
        if cur is None:
            continue
        if cur['text'] is None:
            cur['text'] = line
        else:
            cur['parts'].append(line)

    entries = {}
    for num in sorted(grid):
        e = {'letter': grid[num], 'text': '', 'explanation': ''}
        idx = num - 1
        if idx < len(prose):
            p = prose[idx]
            e['text'] = p['text'] or ''
            e['explanation'] = join_wrapped(p['parts'])
            e['prose_letter'] = p['letter']
        entries[num] = e
    return entries


# --------------------------------------------------------------------------
# Assembly
# --------------------------------------------------------------------------

# A heading that follows the last full stop of an explanation: the papers print
# these between key entries, in several shapes and sometimes wrapped over two
# lines, so they are trimmed from the assembled text as well as skipped while
# parsing.
TRAILING_HEADING = [
    re.compile(r'\s*[^.]{0,140}\(\d+\s+questions?\)\s*$'),
    re.compile(r'\s*SECTION\s+[A-Z0-9]+\s*(?:--|—|–)[^.]{0,140}$'),
    re.compile(r'\s*Section\s+\d+\s*[·•][^.]{0,140}$'),
    re.compile(r'\s*SECTION\s+\d+\s*(?:--|—|–)[^.]{0,140}$'),
]


def strip_trailing_heading(text):
    for _ in range(3):
        before = text
        for pat in TRAILING_HEADING:
            text = pat.sub('', text).strip()
        if text == before:
            break
    return text


# The archive papers mark their own doubtful items: an explanation opening
# "FLAGGED", or one saying the question depends on a figure the archive never
# captured. Those warnings are only visible after answering, so they are lifted
# onto the question itself and shown before the reader commits.
FIGURE_STEM = re.compile(
    r'\b(?:providing|provided|given|following|above|below)\s+(?:picture|figure|diagram|image)'
    r'|\bin the (?:picture|figure|diagram|image) (?:above|below|provided)'
    r'|\bshown in the (?:picture|figure|diagram|image)', re.I)
FIGURE_NOTE = re.compile(
    r"references an image|isn't included in the extracted text|is not included in the extracted"
    r"|image/table not captured|image not captured", re.I)
UNCERTAIN_NOTE = re.compile(r'^\s*(?:FLAGGED|■)\b|^\s*FLAGGED\s*[,—–-]', re.I)


def question_flag(stem, explanation):
    """'no-figure' when the question needs a picture the paper does not carry,
    'uncertain' when the source itself doubts the answer, otherwise None."""
    if FIGURE_STEM.search(stem) or FIGURE_NOTE.search(explanation or ''):
        return 'no-figure'
    if UNCERTAIN_NOTE.search(explanation or ''):
        return 'uncertain'
    return None


def norm(s):
    s = unicodedata.normalize('NFKD', s or '').lower()
    return re.sub(r'[^a-z0-9]+', '', s)


def unwrap_answer(explanation, key_text, option_text):
    """Drop the tail of a wrapped answer line from the front of an explanation.

    In several papers the key prints "Correct: A. <answer text>" and the answer
    text runs onto the next line, which would otherwise be read as the first
    words of the explanation. When the key's text is a truncated version of the
    option it names, the missing words are peeled off the explanation.
    """
    if not explanation or not key_text or not option_text:
        return explanation
    kt, ot = norm(key_text), norm(option_text)
    if not kt or kt == ot or not ot.startswith(kt):
        return explanation
    remainder = option_text.split()[len(key_text.split()):]
    words = explanation.split()
    i = 0
    while i < len(remainder) and i < len(words) and norm(remainder[i]) == norm(words[i]):
        i += 1
    if remainder and i == len(remainder):
        return ' '.join(words[i:])
    return explanation


def build(cfg, report):
    path = os.path.join(SRC, cfg['file'])
    # Repaired after clean_lines, not before: the superscript in 'Ca²■' is only
    # folded down to 'Ca2■' by the normalising there, and that is the shape the
    # repairs recognise.
    raw = pdf_text(path)
    fixes = cfg.get('glyph_fixes')
    lines = [repair_glyphs(l, fixes) for l in clean_lines(raw, cfg.get('drop_re'))]

    joined = '\n'.join(lines)
    if cfg.get('inline_key'):
        # No key section to split off: the answers sit under their questions, so
        # both halves read the same text and each takes the lines it recognises.
        split_at = len(joined)
    else:
        split_at = joined.find(cfg['key_start'])
        if split_at == -1:
            raise SystemExit('answer key marker not found in ' + cfg['file'])
    body_from = 0
    if cfg.get('body_start'):
        found = joined.find(cfg['body_start'])
        if found == -1:
            raise SystemExit('body_start not found in ' + cfg['file'])
        body_from = found
    body_lines = joined[body_from:split_at].split('\n')
    key_lines = (body_lines if cfg.get('inline_key')
                 else joined[split_at:].split('\n'))

    # Same text with bare numbers kept, for reading answer-grid tables.
    raw_joined = '\n'.join(repair_glyphs(l, fixes)
                           for l in clean_lines(raw, r'^\s*Page\s+\d+\s*$'))
    raw_split = raw_joined.find(cfg.get('key_start') or '\0')
    raw_key_lines = raw_joined[raw_split if raw_split != -1 else 0:].split('\n')

    questions = parse_questions(body_lines, cfg, collect_acronyms(lines))
    key = parse_key(key_lines, cfg, raw_key_lines)

    problems = []
    dropped = []
    if len(questions) != cfg['expected']:
        problems.append('parsed %d questions, expected %d' % (len(questions), cfg['expected']))

    out_questions = []
    text_mismatch = 0
    for q in questions:
        num = q['number']
        entry = key.get(num)
        if not entry or not entry.get('letter'):
            # Some archive questions are recorded as illegible, with no answer to
            # mark against. Those are left out of the paper rather than guessed at.
            dropped.append(num)
            continue
        letters = [o['id'] for o in q['options']]
        if len(q['options']) < 2:
            problems.append('Q%d: %d options' % (num, len(q['options'])))
            continue
        if entry['letter'] not in letters:
            problems.append('Q%d: key says %s but options are %s'
                            % (num, entry['letter'], ''.join(letters)))
            continue
        if entry.get('prose_letter') and entry['prose_letter'] != entry['letter']:
            problems.append('Q%d: grid says %s, reasoning says %s'
                            % (num, entry['letter'], entry['prose_letter']))
        # Cross-check: the answer text quoted in the key should be the option it names.
        chosen = [o for o in q['options'] if o['id'] == entry['letter']][0]
        explanation = unwrap_answer(entry['explanation'], entry.get('text'), chosen['text'])
        # A few keys write the reasoning as a sentence continuing from the answer
        # ("… release" / "is the mechanism in cardiac muscle"). Put the answer back
        # on the front so the review screen reads as a whole sentence.
        if explanation[:1].islower():
            explanation = chosen['text'] + ' ' + explanation
        explanation = strip_trailing_heading(explanation)
        if entry.get('text'):
            a, b = norm(entry['text']), norm(chosen['text'])
            if a and b and not (a.startswith(b[:40]) or b.startswith(a[:40])):
                text_mismatch += 1
                problems.append('Q%d: key text "%s" != option %s "%s"'
                                % (num, entry['text'][:50], entry['letter'], chosen['text'][:50]))

        out_questions.append({
            'id': 'q%d' % num,
            'section': q['section'],
            'stem': q['stem'],
            'options': [o['text'] for o in q['options']],
            'answer': entry['letter'],
            'explanation': explanation,
            'flag': question_flag(q['stem'], explanation),
        })

    flags = {}
    for q in out_questions:
        if q.get('flag'):
            flags[q['flag']] = flags.get(q['flag'], 0) + 1
    report.append({
        'flags': flags,
        'id': cfg['id'], 'file': cfg['file'],
        'parsed': len(questions), 'expected': cfg['expected'],
        'written': len(out_questions), 'text_mismatch': text_mismatch,
        'problems': problems, 'dropped': dropped,
    })
    return out_questions


def js_literal(value, indent=0):
    return json.dumps(value, ensure_ascii=False, indent=indent)


def write_data_file(cfg, questions):
    # A default only: the site's start screen lets the candidate pick the pace,
    # and the timer follows that. Set 'durationMinutes' on a paper's entry to
    # change the figure recorded here.
    minutes = cfg.get('durationMinutes') or max(5, round(len(questions) * SECONDS_PER_QUESTION / 60 / 5) * 5)
    sections, seen = [], {}
    for q in questions:
        s = q['section']
        if s and s not in seen:
            seen[s] = 's%d' % (len(sections) + 1)
            sections.append({'id': seen[s], 'title': s})

    lines = [
        '/* %s — %s' % (cfg['name'],
                        'generated from source-papers/' + cfg['file'] if cfg.get('file')
                        else 'merged from ' + ', '.join(cfg['sources'])),
        '   Do not edit by hand: run tools/convert_papers.py to rebuild. */',
        'registerExam({',
        '  id: %s,' % js_literal(cfg['id']),
        '  name: %s,' % js_literal(cfg['name']),
        '  course: %s,' % js_literal(cfg['course']),
        '  subtitle: %s,' % js_literal(cfg['subtitle']),
        '  icon: %s,' % js_literal(cfg['icon']),
        '  accent: %s,' % js_literal(COURSES[cfg['course']]['accent']),
        '  description: %s,' % js_literal(cfg['description']),
        '  durationMinutes: %d,' % minutes,
        '  passMark: %d,' % PASS_MARK,
        '  shuffleQuestions: true,',
        '  shuffleOptions: true,',
        '  sections: [',
    ]
    for s in sections:
        lines.append('    { id: %s, title: %s },' % (js_literal(s['id']), js_literal(s['title'])))
    lines.append('  ],')
    lines.append('  questions: [')
    for q in questions:
        lines.append('    {')
        lines.append('      id: %s,' % js_literal(q['id']))
        if q['section']:
            lines.append('      section: %s,' % js_literal(seen[q['section']]))
        lines.append('      stem: %s,' % js_literal(q['stem']))
        lines.append('      options: [')
        for o in q['options']:
            lines.append('        %s,' % js_literal(o))
        lines.append('      ],')
        lines.append('      answer: %s,' % js_literal(q['answer']))
        if q.get('flag'):
            lines.append('      flag: %s,' % js_literal(q['flag']))
        if q['explanation']:
            lines.append('      explanation: %s,' % js_literal(q['explanation']))
        lines.append('    },')
    lines.append('  ]')
    lines.append('});')

    dest = os.path.join(OUT, cfg['id'] + '.js')
    with open(dest, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines) + '\n')
    return dest, minutes, len(sections)


def write_manifest(summaries):
    """Metadata only, so the home page does not have to load every paper."""
    lines = [
        '/* Subject list for the home page — generated by tools/convert_papers.py.',
        '   Holds metadata only; the questions live in the per-paper files, which',
        '   exam.html loads one at a time. */',
        'window.COURSES = [',
    ]
    for code, meta in COURSES.items():
        lines.append('  { id: %s, title: %s, accent: %s, year: %s, icon: %s },'
                     % (js_literal(code), js_literal(meta['title']), js_literal(meta['accent']),
                        js_literal(meta.get('year', '')), js_literal(meta.get('icon', '📚'))))
    lines.append('];')
    lines.append('window.YEARS = [%s];'
                 % ', '.join(js_literal(y) for y in YEARS))
    lines.append('window.GROUPS = {')
    for course, subsets in GROUPS.items():
        lines.append('  %s: {' % js_literal(course))
        for code, title in subsets.items():
            lines.append('    %s: %s,' % (js_literal(code), js_literal(title)))
        lines.append('  },')
    lines.append('};')
    lines.append('window.SUBJECTS = [')
    for s in summaries:
        lines.append('  {')
        for k in ('id', 'name', 'subtitle', 'course', 'icon', 'accent', 'description'):
            lines.append('    %s: %s,' % (k, js_literal(s[k])))
        if s.get('group'):
            lines.append('    group: %s,' % js_literal(s['group']))
        if s.get('badge'):
            lines.append('    badge: %s,' % js_literal(s['badge']))
        lines.append('    questionCount: %d,' % s['questionCount'])
        lines.append('    durationMinutes: %d,' % s['durationMinutes'])
        lines.append('    passMark: %d,' % s['passMark'])
        lines.append('    file: %s,' % js_literal(s['file']))
        lines.append('  },')
    lines.append('];')
    with open(os.path.join(OUT, 'manifest.js'), 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines) + '\n')


# --------------------------------------------------------------------------
# JSON papers
#
# A paper supplied as JSON needs no entry in PAPERS and no parsing rules: the
# file already says what the questions are. Drop <name>.json in source-papers/
# and run the script. See "Adding a paper as JSON" in README.md for the shape.
# --------------------------------------------------------------------------

JSON_REQUIRED = ('id', 'name', 'course', 'questions')


def trim_course_prefix(name, course):
    """'MDS211 SA2 Mock Exam 3' filed under MDS211 -> 'SA2 Mock Exam 3'.

    Papers arrive named for a folder full of courses, but on the site each one
    already sits under its course heading, so the code in the name just says
    MDS211 twice. Dropped only when something is left over."""
    trimmed = re.sub(r'^\s*%s\b[\s:—–-]*' % re.escape(course), '', name, flags=re.I)
    return trimmed.strip() or name


def paper_name_in(path):
    """The name a JSON paper will show on its card, used to order the cards.

    Ordering by filename gets it wrong: 'mock exam 2.json' sorts before
    'mock exam.json', because a space comes before a dot, so Mock 2 would be
    listed ahead of Mock 1."""
    try:
        with open(path, encoding='utf-8') as fh:
            return str(json.load(fh).get('name') or os.path.basename(path))
    except (ValueError, OSError):
        return os.path.basename(path)      # left to load_json_paper to report


def load_json_paper(path, report):
    with open(path, encoding='utf-8') as fh:
        try:
            doc = json.load(fh)
        except ValueError as err:
            raise SystemExit('%s is not valid JSON: %s' % (os.path.basename(path), err))

    missing = [k for k in JSON_REQUIRED if not doc.get(k)]
    if missing:
        raise SystemExit('%s is missing %s' % (os.path.basename(path), ', '.join(missing)))

    cfg = {
        'file': os.path.basename(path),
        'id': doc['id'],
        'name': trim_course_prefix(doc['name'], doc['course']),
        'subtitle': doc.get('subtitle', ''),
        'course': doc['course'],
        'group': doc.get('group'),
        'badge': doc.get('badge'),
        'icon': doc.get('icon', '📝'),
        'description': doc.get('description', ''),
        'durationMinutes': doc.get('durationMinutes'),
    }

    problems = []
    questions = []
    for i, q in enumerate(doc['questions'], 1):
        where = 'Q%d' % i
        stem = (q.get('stem') or '').strip()
        options = [str(o).strip() for o in (q.get('options') or [])]
        answer = str(q.get('answer') or '').strip().upper()

        if not stem:
            problems.append(where + ': no stem')
            continue
        if len(options) < 2:
            problems.append(where + ': %d options' % len(options))
            continue
        if any(not o for o in options):
            problems.append(where + ': an option is empty')
            continue
        if len(set(o.lower() for o in options)) != len(options):
            problems.append(where + ': two options are identical')
        if answer not in 'ABCDE'[:len(options)]:
            problems.append(where + ': answer %r is not one of %s'
                            % (answer, 'ABCDE'[:len(options)]))
            continue
        if not (q.get('explanation') or '').strip():
            problems.append(where + ': no explanation (allowed, but the review will be bare)')

        questions.append({
            'id': q.get('id') or 'q%d' % i,
            'section': (q.get('section') or '').strip() or None,
            'stem': stem,
            'options': options,
            'answer': answer,
            'explanation': (q.get('explanation') or '').strip(),
            'flag': q.get('flag') or question_flag(stem, q.get('explanation') or ''),
        })

    stated = doc.get('questionCount')
    try:
        stated = int(stated) if stated else None    # some files quote it: "155"
    except (TypeError, ValueError):
        problems.append('questionCount is %r, which is not a number' % (stated,))
        stated = None
    if stated and stated != len(questions):
        problems.append('file says %s questions, %d usable' % (stated, len(questions)))

    flags = {}
    for q in questions:
        if q.get('flag'):
            flags[q['flag']] = flags.get(q['flag'], 0) + 1

    report.append({
        'id': cfg['id'], 'file': cfg['file'], 'flags': flags,
        'parsed': len(doc['questions']), 'expected': stated or len(doc['questions']),
        'written': len(questions), 'text_mismatch': 0,
        'problems': problems, 'dropped': [],
    })
    return cfg, questions


# --------------------------------------------------------------------------
# Merging papers that are drafts of each other
# --------------------------------------------------------------------------

# Two questions count as the same when their wording is close AND their option
# lists are largely shared. Wording alone is not enough: "the RATE-LIMITING
# enzyme of heme synthesis" and "of bile acid synthesis" read almost the same
# but are different questions, and their options say so. The options alone are
# not enough either, since papers reuse distractors.
SAME_STEM = 0.60
SAME_OPTIONS = 0.50


def ratio(a, b):
    import difflib
    return difflib.SequenceMatcher(None, a, b).ratio()


def option_overlap(a, b):
    """How much of one question's option list is answered by the other's."""
    x = [norm(o) for o in a['options']]
    y = [norm(o) for o in b['options']]
    if not x or not y:
        return 0.0
    return sum(max(ratio(o, p) for p in y) for o in x) / len(x)


def same_question(a, b):
    stem = ratio(norm(a['stem']), norm(b['stem']))
    if stem >= 0.98:
        # Word-for-word the same question. The papers sometimes phrase the same
        # option two ways ("alpha-thal1/alpha-thal2" and "3 of 4 alpha genes
        # deleted"), so the options are not asked to agree as well.
        return True
    return stem >= SAME_STEM and option_overlap(a, b) >= SAME_OPTIONS


def explanation_score(q):
    """Which of two versions of a question to keep.

    Longer explanations say more — they name the trap and the neighbouring
    conditions rather than only the answer. But one paper's subscripts did not
    survive the PDF ('haem + O■', 'Ca2■'), and a clean shorter explanation beats
    a longer broken one."""
    text = q['explanation'] + q['stem'] + ''.join(q['options'])
    return len(q['explanation']) - 400 * text.count('■')


def merge_papers(cfg, built, report):
    """One paper out of several, keeping each shared question only once."""
    missing = [s for s in cfg['sources'] if s not in built]
    if missing:
        raise SystemExit('%s merges %s, which did not build'
                         % (cfg['id'], ', '.join(missing)))

    # The section list of the paper that files its lectures correctly. Questions
    # are matched to it by topic, so a source that numbers the same topic under a
    # different lecture still lands in the right place.
    canon = []
    for q in built[cfg['sections_from']]:
        if q['section'] and q['section'] not in canon:
            canon.append(q['section'])

    def refile(title):
        if not title or title in canon:
            return title
        topic = norm(re.sub(r'^Lectures?\s+\d+\s*[:—–-]\s*', '', title))
        best, score = title, 0.0
        for c in canon:
            r = ratio(topic, norm(re.sub(r'^Lectures?\s+\d+\s*[:—–-]\s*', '', c)))
            if r > score:
                best, score = c, r
        return best if score >= 0.6 else title

    kept, dropped = [], 0
    for source in cfg['sources']:
        for q in built[source]:
            twin = next((k for k in kept if same_question(q, k)), None)
            if twin is None:
                kept.append(dict(q, section=refile(q['section']), origin=source))
                continue
            dropped += 1
            # Keep whichever version explains itself best; the source order in
            # the config settles it when they are the same length.
            if explanation_score(q) > explanation_score(twin):
                kept[kept.index(twin)] = dict(q, section=twin['section'], origin=source)

    order = {title: i for i, title in enumerate(canon)}
    kept.sort(key=lambda q: order.get(q['section'], len(order)))
    for i, q in enumerate(kept, 1):
        q['id'] = 'q%d' % i

    from_each = {s: sum(1 for q in kept if q['origin'] == s) for s in cfg['sources']}
    for q in kept:
        del q['origin']

    flags = {}
    for q in kept:
        if q.get('flag'):
            flags[q['flag']] = flags.get(q['flag'], 0) + 1
    total = sum(len(built[s]) for s in cfg['sources'])
    report.append({
        'id': cfg['id'], 'file': 'merge of ' + ', '.join(cfg['sources']),
        'flags': flags, 'parsed': total, 'expected': total - dropped,
        'written': len(kept), 'text_mismatch': 0, 'dropped': [],
        'problems': [], 'merge_note': '%d shared questions removed; kept %s'
                                      % (dropped, ', '.join('%d from %s' % (n, s.split('-')[-1])
                                                            for s, n in from_each.items())),
    })
    return kept


def add_paper(cfg, questions, summaries):
    """Write a paper's data file and its entry for the home page."""
    _, minutes, _ = write_data_file(cfg, questions)
    summaries.append({
        'id': cfg['id'], 'name': cfg['name'], 'subtitle': cfg['subtitle'],
        'course': cfg['course'], 'icon': cfg['icon'],
        'accent': COURSES[cfg['course']]['accent'],
        'description': cfg['description'], 'questionCount': len(questions),
        'group': cfg.get('group'), 'badge': cfg.get('badge'),
        'durationMinutes': minutes, 'passMark': PASS_MARK,
        'file': 'data/%s.js' % cfg['id'],
    })


def main():
    check_only = '--check' in sys.argv
    only = [a for a in sys.argv[1:] if not a.startswith('--')]
    report, summaries = [], []

    jobs = [(cfg, None) for cfg in PAPERS]
    json_files = [os.path.join(SRC, n) for n in os.listdir(SRC)
                  if n.lower().endswith('.json')]
    json_files.sort(key=paper_name_in)
    jobs.extend((None, path) for path in json_files)

    # A merge needs its sources whether or not they were asked for by name.
    wanted = set(only)
    for m in MERGES:
        if not only or m['id'] in only:
            wanted.update(m['sources'])

    def skip(paper_id):
        return bool(only) and paper_id not in wanted and paper_id not in only

    seen_ids = set()
    built = {}
    for cfg, json_path in jobs:
        if json_path:
            cfg, questions = load_json_paper(json_path, report)
            if skip(cfg['id']):
                report.pop()
                continue
        else:
            if skip(cfg['id']):
                continue
            questions = build(cfg, report)
        if cfg['id'] in seen_ids:
            raise SystemExit('two papers share the id ' + cfg['id'])
        seen_ids.add(cfg['id'])
        built[cfg['id']] = questions
        if check_only or cfg.get('internal'):
            continue      # a source of a merged paper gets no file and no card
        add_paper(cfg, questions, summaries)

    for cfg in MERGES:
        if only and cfg['id'] not in only:
            continue
        questions = merge_papers(cfg, built, report)
        if check_only:
            continue
        add_paper(cfg, questions, summaries)

    if summaries and not only:
        write_manifest(summaries)

    total = 0
    sources = {s: m['id'] for m in MERGES for s in m['sources']}
    print('%-28s %8s %8s %8s  %s' % ('paper', 'parsed', 'expect', 'written', 'problems'))
    for r in report:
        # A merge source is reported so its parsing can be checked, but its
        # questions are counted once, in the paper they were merged into.
        if r['id'] not in sources:
            total += r['written']
        print('%-28s %8d %8d %8d  %d%s'
              % (r['id'], r['parsed'], r['expected'], r['written'], len(r['problems']),
                 '   → merged into ' + sources[r['id']] if r['id'] in sources else ''))
        if r.get('merge_note'):
            print('        · ' + r['merge_note'])
        if r.get('flags'):
            print('        · flagged: ' + ', '.join('%d %s' % (v, k) for k, v in sorted(r['flags'].items())))
        if r['dropped']:
            print('        · dropped (no answer in source): %s'
                  % ', '.join('Q%d' % n for n in r['dropped']))
        for p in r['problems'][:12]:
            print('        - ' + p)
        if len(r['problems']) > 12:
            print('        … %d more' % (len(r['problems']) - 12))
    print('\ntotal questions written: %d' % total)


if __name__ == '__main__':
    main()
