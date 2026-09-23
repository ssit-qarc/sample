# GATE DA past-paper dataset

Official GATE question papers and answer keys, collected to analyse the GATE DA
(Data Science and Artificial Intelligence) paper and to practise the topics it
shares with other papers.

| Paper | Years | Why it's here |
|---|---|---|
| DA | 2024, 2025, 2026, plus the 2024 sample paper | The paper being analysed. All three years use the same syllabus as GATE 2027. |
| ST (Statistics) | 2021 to 2026 | Extra questions for DA's probability and statistics section. |
| CS (Computer Science and IT) | 2007 to 2026, every set | Extra questions for data structures, algorithms, DBMS, maths and logic. CS programming questions are in C; DA uses Python. |

`data/MANIFEST.md` lists every file with its page count, text size, question
numbers found (papers only), key status and source link. `data/manifest.csv` has the same data plus
SHA-256 hashes.

## Layout

```
data/<PAPER>/<YEAR>/<PAPER>_<YEAR>[_S<n>]_QP.pdf    question paper
data/<PAPER>/<YEAR>/<PAPER>_<YEAR>[_S<n>]_KEY.pdf   answer key
```

`S<n>` is the set or session for years with more than one CS paper
(2014 and 2015 had three; 2016, 2017, 2021, 2024, 2025 and 2026 had two).
Every PDF has a `.txt` next to it with the text pypdf extracted.
`data/<PAPER>/sources*.csv` records where each file came from and why its key
status is what it is.

## Where the files came from

Everything is an official copy. Most files come from the organizing institutes'
own sites or from the previous-year archives on the GATE 2024, 2026 and 2027
sites, including the bulk `CS.zip` linked from gate2027.iitm.ac.in/download.
The 2011 and 2013 CS keys and the three 2015 CS papers come from Wayback Machine
captures of official GATE sites; the sources CSV marks these as mirrors.
Where an official file combined a paper with its key, or bundled several sets,
the file here is an unaltered page range of it. The sources CSV names the pages.

## Answer keys

- Keys are the final, post-challenge versions. Some PDFs don't say so. For
  those, the evidence is in the notes column: a creation date after the
  challenge window, or a match with the organizer's original. This applies to
  CS 2018, 2022, 2023 and 2026, and ST 2021, 2022, 2023 and 2026.
- GATE published no keys before 2011, so CS 2007 to 2010 have none.
- The DA 2024 sample paper has no official key.
- Marks-to-all questions (MTA) appear as such in the key, for example DA 2024 Q59.

## Before using the text

- These papers are scanned images, or their questions are, so the `.txt` holds
  little or nothing and they need OCR: CS 2007 to 2011, CS 2017 (both sets),
  CS 2019, CS 2020, CS 2021 (both sets; only the aptitude questions have text),
  ST 2021, and the CS 2015 keys. The manifest flags them.
- CS 2013 has all four booklet orderings (A to D) of the same paper. Use one.
- The CS 2015 papers hold the 55 CS questions only. The 10 aptitude questions
  are in the matching key file, which is an answer-marked copy of the paper.
- CS 2022 and ST 2022 have the key appended to the paper, and ST 2021's key is
  also in the paper file.
- ST 2022 prints Q.48 as a second "Q.38".
- DA 2025 text contains ligature characters such as "ﬁ". NFKC-normalize before
  matching strings.
- Key layouts differ by year. The DA 2026 key text has one row per question;
  the DA 2025 key text puts each field on its own line.
- The 2021 CS PDFs are encrypted with an empty password. pypdf needs the
  `cryptography` package to open them.

## Rebuilding the manifest

```
pip install pypdf cryptography
python gate-da/scripts/build_manifest.py
```
