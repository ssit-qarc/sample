#!/usr/bin/env python3
"""How predictable are GATE CS subject weights from one year to the next?

GATE DA has only three past papers (2024-2026), so this uses GATE CS
(2010-2026, every set) as a testbed for the question "how accurately can
past papers predict next year's topic weights?".

Usage
-----
    python cs_weight_stability.py            # validate the CSV and print the analysis
    python cs_weight_stability.py --rebuild  # re-download the source sheet, rebuild the CSV, then analyse

Data: cs_subject_marks.csv (columns year,set,subject,marks,source_url)
---------------------------------------------------------------------
One row per paper and source subject. ``set`` is the set/session number;
single-paper years use set = 1. Every paper sums to exactly 100 marks and
every question is counted once.

2010-2025 come from GATE Overflow's "Mark Distribution in GATE CSE" sheet
(Arjun Suresh, linked from https://gatecse.in/mark-distribution-in-gate-cse/),
tab "Alt. View". The sheet lists, per paper and subject, the marks and the
question numbers. Its subject breakdown is kept as-is. Its two
subtotal columns (Discrete Mathematics, Engineering Mathematics) are left out
because they are sums of other columns; note that the sheet's Engineering
Mathematics formula omits Numerical Methods.

The sheet's typed totals are not always consistent with its own question
lists (the "Total" column is typed as 100, but eight papers do not add up).
CORRECTIONS below fixes each case, using the sheet's own question lists, the
older hidden "Sheet1" tab of the same spreadsheet, and the official papers.
Rule for questions the sheet counts under two subjects: a General Aptitude
question stays in GA; a technical question stays in the core CS subject,
not the maths subject (this matches the sheet's own "(D)" duplicate markers).

2026 is not in the sheet yet. GATE Overflow's per-subject pages carry a
"Mark Distribution in Previous GATE" table that includes 2026-1 and 2026-2,
and it matches the sheet exactly for 2021-2025. gateoverflow.in is behind a
Cloudflare challenge, so the values were read from Wayback Machine captures
of 2026-05-26/27 (GO_2026). No capture exists for Computer Networks,
Programming, Mathematical Logic, Combinatory, Graph Theory, Probability,
Linear Algebra, or the Analytical/Spatial aptitude pages. Those rows
(CLASSIFIED_2026) were classified question by question from the official
2026 papers. They are constrained so that GATE Overflow's published 1-mark
and 2-mark question counts for the other subjects account for exactly the
remaining questions; the script checks this.

Analysis
--------
Source subjects are grouped into the usual syllabus subjects (ANALYSIS_MAP).
General Aptitude is fixed at 15 marks by design, so it is excluded from the
error metrics. IS & Software Engg. and Web Technologies (dropped from the
syllabus in 2016) are kept as their own group but not forecast. Numerical
Methods (also dropped in 2016) is folded into Engineering Mathematics.

Year-level values are the mean over a year's sets. Forecasts for year t use
only years before t: (a) last year's value, (b) the mean of all earlier years,
(c) the mean of the last 3 earlier years. Each forecast is scored against
every paper (set) of year t.
"""
from __future__ import annotations

import argparse
import csv
import io
import itertools
import sys
import urllib.request
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
CSV_PATH = HERE / "cs_subject_marks.csv"

SHEET_URL = ("https://docs.google.com/spreadsheets/d/"
             "1ELvXc5h1iMOv31KZ4m6UQQZq3J8g-nVhZNlTP9Vpiuc/edit?gid=935355893")
SHEET_CSV = ("https://docs.google.com/spreadsheets/d/e/2PACX-1vTi_y69aRZOMyRA0Hn-"
             "Gbl6EFdvg2VlMmEfmPRkP5bZrnMEg7VDiNku7wJrbxVtS1pPqqX0fpGAeWPA/pub"
             "?gid=935355893&single=true&output=csv")
SUBTOTAL_COLS = {"Discrete Mathematics", "Engineering Mathematics", "Total"}

# (year, set, subject): (value typed in the sheet, value used, reason)
CORRECTIONS = {
    (2010, 1, "Mathematical Logic"): (4, 2,
        "ML question list '26, 27' is a copy of Probability's; Q30 (listed under "
        "the Discrete Mathematics heading) is the ML question; hidden Sheet1 tab: 2"),
    (2010, 1, "Combinatory"): (2, 0,
        "only question listed is GA Q65 marked '(D)', already in Quantitative Aptitude"),
    (2011, 1, "Quantitative Aptitude"): (6, 9,
        "question list 57 + 62-65 with Q56-60 = 1 mark, Q61-65 = 2 marks; typed totals swapped"),
    (2011, 1, "Verbal Aptitude"): (9, 6,
        "question list 56, 58-60 + 61; typed totals swapped"),
    (2012, 1, "Probability"): (5, 3,
        "includes GA Q63 marked '(D)' (Bayes question in the GA section)"),
    (2012, 1, "Quantitative Aptitude"): (6, 9,
        "list 56, 62, 64, 65 plus GA Q63; official paper: Q56-60 = 1 mark, Q61-65 = 2 marks"),
    (2012, 1, "Verbal Aptitude"): (9, 6, "list 57-60 + 61; typed totals swapped"),
    (2014, 1, "Algorithms"): (4, 13,
        "own list 37, 38, 39, 41, 42 (2 marks) + 3, 11, 14 (1 mark) = 13; hidden Sheet1 tab: 13"),
    (2014, 1, "Databases"): (None, 8,
        "cell blank; own list 29, 30, 54 + 21, 22 = 8; hidden Sheet1 tab: 8"),
    (2014, 3, "Probability"): (4, 2,
        "Q40 marked '(D)', also counted in Data Structures"),
    (2015, 2, "Set Theory & Algebra"): (12, 9,
        "list includes GA_3 and GA_9 (3 marks), also counted in Quantitative Aptitude"),
    (2016, 2, "Graph Theory"): (0, 1,
        "own list has Q3 (1 mark); hidden Sheet1 tab: 1"),
    (2019, 1, "Probability"): (4, 2,
        "Q20 and Q22 (1 mark each) are also counted in Algorithms and Digital Logic"),
    (2020, 1, "Algorithms"): (8, 10,
        "sheet's question lists partition Q1-55 exactly and give 2x1 + 4x2 = 10; "
        "GO's category page of Jan 2022 showed 11"),
}

WAYBACK = "https://web.archive.org/web/{ts}/https://gateoverflow.in/questions/{path}"
# subject: (capture timestamp, page, (1-mark n, 2-mark n, marks) for 2026-1, same for 2026-2)
GO_2026 = {
    "Theory of Computation": ("20260526171042", "theory-of-computation?start=120", (2, 2, 6), (1, 2, 5)),
    "Algorithms": ("20260527000032", "algorithms?page=2", (4, 6, 16), (4, 4, 12)),
    "Digital Logic": ("20260526170906", "digital-logic?start=140", (2, 3, 8), (3, 2, 7)),
    "Operating System": ("20260526213414", "operating-system?start=140", (2, 2, 6), (1, 3, 7)),
    "Databases": ("20260526213513", "databases?start=120", (2, 2, 6), (2, 2, 6)),
    "Compiler Design": ("20260526171919", "compiler-design?start=120", (2, 2, 6), (2, 2, 6)),
    "CO & Architecture": ("20260526213313", "co-and-architecture?start=200", (3, 4, 11), (1, 5, 11)),
    "Data Structures": ("20260526212642", "programming-in-c/data-structures?start=120", (0, 1, 2), (1, 1, 3)),
    "Set Theory & Algebra": ("20260526212941",
                             "mathematics/discrete-mathematics/set-theory&algebra?start=120",
                             (0, 0, 0), (1, 0, 1)),
    "Calculus": ("20260526212823", "mathematics/calculus?start=140", (1, 1, 3), (1, 1, 3)),
    "Quantitative Aptitude": ("20260526214026", "general-aptitude/quantitative-aptitude?start=120",
                              (2, 2, 6), (2, 2, 6)),
    "Verbal Aptitude": ("20260526214220", "general-aptitude/verbal-aptitude?start=120",
                        (1, 0, 1), (1, 0, 1)),
}
# Counting against GO's published 1-mark/2-mark counts implies GO filed the heap, hashing
# and tree-height questions of 2026-1 (Q23, Q24, Q33) under Algorithms, not Data Structures.

QP_2026 = {1: "https://gate2026.iitg.ac.in/doc/download/2026/QPs/CS1.pdf",
           2: "https://gate2026.iitg.ac.in/doc/download/2026/QPs/CS2.pdf"}
# set: subject: (1-mark question numbers, 2-mark question numbers). CS questions are
# Q11-35 (1 mark) and Q36-65 (2 marks). Set 1 has one ambiguous 4-mark block: Q39/40/
# 47/55/61/62 must supply 3 Algorithms + 1 Data Structures question (GO counts). Q61 is
# taken as Programming and Q47 as Graph Theory; the alternatives move up to 2 marks
# between Programming & DS and Discrete Mathematics.
CLASSIFIED_2026 = {
    1: {"Computer Networks": ([18, 19], [44, 45, 56]),
        "Programming": ([34], [61]),
        "Probability": ([11], [58]),
        "Linear Algebra": ([13, 20], []),
        "Combinatory": ([12], []),
        "Graph Theory": ([], [47, 57]),
        "Mathematical Logic": ([], [])},
    2: {"Computer Networks": ([21, 22, 33], [43, 58, 65]),
        "Programming": ([17, 19], [60, 61]),
        "Probability": ([14], [63]),
        "Linear Algebra": ([31], [62]),
        "Mathematical Logic": ([11], []),
        "Graph Theory": ([], [36]),
        "Combinatory": ([], [])},
}
GA_REST_2026 = "Analytical Aptitude + Spatial Aptitude"  # 15 - GO's Quantitative - GO's Verbal

REMOVED_2016 = "Removed in 2016 (IS&SE, Web Tech)"
GA = "General Aptitude"
ANALYSIS_MAP = {
    "Probability": "Engineering Mathematics", "Linear Algebra": "Engineering Mathematics",
    "Calculus": "Engineering Mathematics", "Numerical Methods": "Engineering Mathematics",
    "Mathematical Logic": "Discrete Mathematics", "Set Theory & Algebra": "Discrete Mathematics",
    "Combinatory": "Discrete Mathematics", "Graph Theory": "Discrete Mathematics",
    "Digital Logic": "Digital Logic",
    "CO & Architecture": "Computer Organization & Architecture",
    "Programming": "Programming & Data Structures",
    "Data Structures": "Programming & Data Structures",
    "Algorithms": "Algorithms",
    "Theory of Computation": "Theory of Computation",
    "Compiler Design": "Compiler Design",
    "Operating System": "Operating Systems",
    "Databases": "Databases",
    "Computer Networks": "Computer Networks",
    "Quantitative Aptitude": GA, "Verbal Aptitude": GA, "Analytical Aptitude": GA,
    "Spatial Aptitude": GA, GA_REST_2026: GA,
    "IS & Software Engg.": REMOVED_2016, "Web Technologies": REMOVED_2016,
}
TECH = ["Engineering Mathematics", "Discrete Mathematics", "Digital Logic",
        "Computer Organization & Architecture", "Programming & Data Structures",
        "Algorithms", "Theory of Computation", "Compiler Design", "Operating Systems",
        "Databases", "Computer Networks"]
SHORT = {"Engineering Mathematics": "EngMath", "Discrete Mathematics": "DiscMath",
         "Digital Logic": "DigLogic", "Computer Organization & Architecture": "COA",
         "Programming & Data Structures": "P&DS", "Algorithms": "Algo",
         "Theory of Computation": "TOC", "Compiler Design": "CD", "Operating Systems": "OS",
         "Databases": "DBMS", "Computer Networks": "CN", "P&DS + Algorithms": "P&DS+Algo"}
# Leaf subjects not in the syllabus / category scheme for some years: blank cells are skipped.
OPTIONAL_LEAVES = {"IS & Software Engg.", "Web Technologies", "Numerical Methods",
                   "Analytical Aptitude", "Spatial Aptitude"}


# ----------------------------------------------------------------------------- build
def parse_label(label: str) -> tuple[int, int]:
    parts = [p.strip() for p in label.split("-")]
    return int(parts[0]), int(parts[1]) if len(parts) > 1 else 1


def fetch_sheet() -> list[list[str]]:
    req = urllib.request.Request(SHEET_CSV, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return list(csv.reader(io.StringIO(r.read().decode("utf-8"))))


def build_rows() -> list[dict]:
    rows = fetch_sheet()
    header = rows[0]
    leaves = [h for h in header[1:] if h not in SUBTOTAL_COLS]
    out, seen = [], set()
    for r in rows[1:]:
        label = r[0].strip()
        if not label or label in ("2 Marks", "1 Mark", "Min.", "Avg.", "Max."):
            continue
        year, st = parse_label(label)
        if year >= 2026:
            sys.exit(f"Sheet now has {label}; review it against GO_2026 before rebuilding.")
        cells = dict(zip(header, r))
        for subj in leaves:
            raw = cells[subj].strip()
            val = float(raw) if raw else None
            key = (year, st, subj)
            if key in CORRECTIONS:
                typed, fixed, _ = CORRECTIONS[key]
                if val != (float(typed) if typed is not None else None):
                    sys.exit(f"Sheet changed: {key} is {raw!r}, expected {typed!r}")
                val = float(fixed)
                seen.add(key)
            if val is None:
                if subj in OPTIONAL_LEAVES:
                    continue
                val = 0.0  # blank = no questions from this in-syllabus subject
            out.append(dict(year=year, set=st, subject=subj, marks=int(val), source_url=SHEET_URL))
    missing = set(CORRECTIONS) - seen
    if missing:
        sys.exit(f"Corrections not applied: {sorted(missing)}")

    for st in (1, 2):
        idx = st + 1
        for subj, (ts, path, *vals) in GO_2026.items():
            out.append(dict(year=2026, set=st, subject=subj, marks=vals[st - 1][2],
                            source_url=WAYBACK.format(ts=ts, path=path)))
        for subj, (q1, q2) in CLASSIFIED_2026[st].items():
            out.append(dict(year=2026, set=st, subject=subj, marks=len(q1) + 2 * len(q2),
                            source_url=QP_2026[st]))
        ga = sum(GO_2026[s][idx][2] for s in ("Quantitative Aptitude", "Verbal Aptitude"))
        out.append(dict(year=2026, set=st, subject=GA_REST_2026, marks=15 - ga,
                        source_url=QP_2026[st]))
    return out


def check_2026_question_counts() -> None:
    for st in (1, 2):
        idx = st + 1
        one = sum(v[idx][0] for s, v in GO_2026.items() if "Aptitude" not in s)
        two = sum(v[idx][1] for s, v in GO_2026.items() if "Aptitude" not in s)
        q1 = [q for a, _ in CLASSIFIED_2026[st].values() for q in a]
        q2 = [q for _, b in CLASSIFIED_2026[st].values() for q in b]
        assert len(set(q1)) == len(q1) and len(set(q2)) == len(q2), "question listed twice"
        assert all(11 <= q <= 35 for q in q1) and all(36 <= q <= 65 for q in q2)
        assert one + len(q1) == 25, f"2026-{st}: 1-mark questions {one}+{len(q1)} != 25"
        assert two + len(q2) == 30, f"2026-{st}: 2-mark questions {two}+{len(q2)} != 30"
        for s, v in GO_2026.items():
            assert v[idx][0] + 2 * v[idx][1] == v[idx][2], f"GO counts inconsistent for {s}"


def write_csv(rows: list[dict]) -> None:
    order = {s: i for i, s in enumerate(ANALYSIS_MAP)}
    rows.sort(key=lambda d: (d["year"], d["set"], order.get(d["subject"], 999)))
    with CSV_PATH.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["year", "set", "subject", "marks", "source_url"])
        w.writeheader()
        w.writerows(rows)


# ----------------------------------------------------------------------------- load
def load() -> pd.DataFrame:
    df = pd.read_csv(CSV_PATH)
    unknown = set(df.subject) - set(ANALYSIS_MAP)
    assert not unknown, f"unmapped subjects: {unknown}"
    tot = df.groupby(["year", "set"]).marks.sum()
    assert (tot == 100).all(), f"papers not summing to 100:\n{tot[tot != 100]}"
    df["group"] = df.subject.map(ANALYSIS_MAP)
    ga = df[df.group == GA].groupby(["year", "set"]).marks.sum()
    assert (ga == 15).all(), "GA must be 15 in every paper"
    return df


def paper_table(df: pd.DataFrame) -> pd.DataFrame:
    p = df.pivot_table(index=["year", "set"], columns="group", values="marks",
                       aggfunc="sum", fill_value=0)
    return p.reindex(columns=TECH + [GA, REMOVED_2016], fill_value=0)


# ----------------------------------------------------------------------------- analysis
def backtest(P: pd.DataFrame, subjects: list[str], first_year: int, min_hist: int = 3):
    """Rolling-origin forecasts. Returns long frame of absolute errors per paper and subject."""
    P = P[P.index.get_level_values("year") >= first_year]
    Y = P.groupby(level="year").mean()
    years = list(Y.index)
    recs = []
    for i, t in enumerate(years):
        hist = years[:i]
        if len(hist) < min_hist:
            continue
        preds = {"last year": Y.loc[hist[-1], subjects],
                 "mean of all earlier": Y.loc[hist, subjects].mean(),
                 "mean of last 3": Y.loc[hist[-3:], subjects].mean(),
                 "flat 85/11 (reference)": pd.Series(85 / 11, index=subjects)}
        for (yr, st), actual in P.loc[[t]].iterrows():
            for m, pr in preds.items():
                for s in subjects:
                    recs.append(dict(year=yr, set=st, method=m, subject=s,
                                     pred=pr[s], actual=actual[s], err=abs(pr[s] - actual[s])))
    return pd.DataFrame(recs)


def summarize(bt: pd.DataFrame, label: str) -> None:
    methods = list(dict.fromkeys(bt.method))
    papers = bt.groupby(["year", "set"]).ngroups
    yrs = sorted(bt.year.unique())
    print(f"\n{label}: {papers} papers, target years {yrs[0]}-{yrs[-1]}")
    per_subj = bt.pivot_table(index="subject", columns="method", values="err", aggfunc="mean")
    per_subj = per_subj.reindex(index=list(dict.fromkeys(bt.subject)), columns=methods)
    per_subj.index = [SHORT.get(s, s) for s in per_subj.index]
    per_subj.loc["ALL (mean)"] = bt.groupby("method").err.mean().reindex(methods)
    print("  MAE in marks per subject:")
    print(per_subj.round(2).to_string().replace("\n", "\n    ").join(["    ", ""]))
    tot = bt.groupby(["method", "year", "set"]).err.sum().groupby("method")
    print("  Total absolute error per paper, summed over subjects "
          "(about half of it is the net marks the forecast puts in the wrong subject):")
    for m in methods:
        s = tot.get_group(m)
        print(f"    {m:24s} mean {s.mean():5.1f}  median {s.median():5.1f}  "
              f"min {s.min():5.1f}  max {s.max():5.1f}")


def top3(row: pd.Series, tiebreak: pd.Series) -> frozenset:
    order = sorted(row.index, key=lambda s: (-row[s], -tiebreak[s]))
    return frozenset(order[:3])


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--rebuild", action="store_true",
                    help="re-download the GATE Overflow sheet and rewrite the CSV")
    args = ap.parse_args()
    check_2026_question_counts()
    if args.rebuild:
        write_csv(build_rows())
        print(f"wrote {CSV_PATH}")

    df = load()
    P = paper_table(df)
    Y = P.groupby(level="year").mean()
    years = list(Y.index)
    pd.set_option("display.width", 200)
    nsets = P.groupby(level="year").size()

    def lab(y, st):
        return f"{y}-{st}" if nsets[y] > 1 else f"{y}"

    tech_total = P[TECH].sum(axis=1)
    assert (tech_total[tech_total.index.get_level_values("year") >= 2016] == 85).all()

    print(f"Coverage: {len(P)} papers, {years[0]}-{years[-1]} "
          f"({len(years)} years); sets per year: "
          + ", ".join(f"{y}:{n}" for y, n in P.groupby(level='year').size().items() if n > 1))
    print("GA is 15 marks in every paper and is excluded from the error metrics.")

    # 1. per-subject variability
    print("\n1) Per-subject marks (min/max over papers; mean |change| between consecutive "
          "year means; mean |difference| between sets of the same year)")
    stats = pd.DataFrame(index=TECH)
    stats["mean"] = P[TECH].mean()
    stats["sd"] = P[TECH].std()
    stats["min"] = P[TECH].min()
    stats["max"] = P[TECH].max()
    p16 = P[P.index.get_level_values("year") >= 2016]
    stats["min ≥2016"] = p16[TECH].min()
    stats["max ≥2016"] = p16[TECH].max()
    stats["|Δ| yr→yr"] = Y[TECH].diff().abs().mean()
    post = Y[Y.index >= 2016]
    stats["|Δ| yr→yr ≥2016"] = post[TECH].diff().abs().mean()
    within = []
    for y, grp in P.groupby(level="year"):
        for a, b in itertools.combinations(range(len(grp)), 2):
            within.append((grp.iloc[a][TECH] - grp.iloc[b][TECH]).abs())
    stats["|Δ| set↔set"] = pd.concat(within, axis=1).mean(axis=1)
    stats["mean ≤2015"] = P.loc[P.index.get_level_values("year") <= 2015, TECH].mean()
    stats["mean ≥2016"] = P.loc[P.index.get_level_values("year") >= 2016, TECH].mean()
    stats.index = [SHORT[s] for s in stats.index]
    print(stats.round(2).to_string())
    print(f"  Average over subjects: |Δ| yr→yr {stats['|Δ| yr→yr'].mean():.2f}, "
          f"≥2016 {stats['|Δ| yr→yr ≥2016'].mean():.2f}, set↔set {stats['|Δ| set↔set'].mean():.2f}")
    removed = P.loc[P.index.get_level_values("year") <= 2015, REMOVED_2016]
    print(f"  IS&SE + Web Tech (dropped 2016): {removed.min():.0f}-{removed.max():.0f} marks "
          f"per paper in 2010-2015 (mean {removed.mean():.1f}).")

    # 2. zeros
    print("\n2) Zero-mark papers")
    zero = (P[TECH] == 0)
    print("  Core subject (grouped) with 0 marks in a paper:",
          ", ".join(f"{SHORT[s]} {lab(y, st)}" for (y, st), r in zero.iterrows()
                    for s in TECH if r[s]) or "never")
    leaf = df[~df.group.isin([GA, REMOVED_2016]) & (df.subject != "Numerical Methods")]
    for s, g in leaf[leaf.marks == 0].groupby("subject"):
        print(f"  source sub-topic {s}: 0 in {len(g)} papers "
              f"({', '.join(lab(y, st) for y, st in zip(g.year, g.set))})")

    # 3. backtests
    print("\n3) Backtests (forecast for year t uses only years < t, needs >= 3 earlier years)")
    full = backtest(P, TECH, 2010)
    summarize(full, "A. Full history 2010-")
    summarize(full[full.year >= 2019], "B. Same forecasts as A, scored on 2019-2026 only")
    postbt = backtest(P, TECH, 2016)
    summarize(postbt, "C. Post-2016 syllabus only (history starts 2016)")
    P2 = P.copy()
    P2["P&DS + Algorithms"] = P2["Programming & Data Structures"] + P2["Algorithms"]
    merged = [s for s in TECH if s not in ("Programming & Data Structures", "Algorithms")]
    merged.append("P&DS + Algorithms")
    mb = backtest(P2, merged, 2016)
    mb = mb[mb.method != "flat 85/11 (reference)"]
    summarize(mb, "D. As C, with P&DS and Algorithms merged (DA-style grouping)")

    # noise floor: predict a paper by the other set(s) of the same year
    floor = []
    for y, grp in P.groupby(level="year"):
        if len(grp) < 2:
            continue
        for i in range(len(grp)):
            others = grp.drop(grp.index[i])[TECH].mean()
            floor.append((grp.iloc[i][TECH] - others).abs().sum())
    floor_post = []
    for y, grp in P[P.index.get_level_values("year") >= 2016].groupby(level="year"):
        if len(grp) < 2:
            continue
        for i in range(len(grp)):
            others = grp.drop(grp.index[i])[TECH].mean()
            floor_post.append((grp.iloc[i][TECH] - others).abs().sum())
    print(f"\n  Reference: predicting a paper by the other set(s) of the same year gives "
          f"total abs error {np.mean(floor):.1f} per paper (all multi-set years, n={len(floor)}), "
          f"{np.mean(floor_post):.1f} for 2016+ (n={len(floor_post)}).")

    # 4. top-3 stability
    print("\n4) Top-3 heaviest technical subjects (year means; ties broken by long-run mean)")
    lr = Y[TECH].mean()
    tops = {y: top3(Y.loc[y, TECH], lr) for y in years}
    same = over = first = 0
    lines = []
    for a, b in zip(years, years[1:]):
        o = len(tops[a] & tops[b])
        top_a = max(TECH, key=lambda s: (Y.loc[a, s], lr[s]))
        top_b = max(TECH, key=lambda s: (Y.loc[b, s], lr[s]))
        same += o == 3
        over += o
        first += top_a == top_b
        lines.append(f"    {a}->{b}: overlap {o}/3  {sorted(SHORT[s] for s in tops[b])}")
    n = len(years) - 1
    print("\n".join(lines))
    print(f"  identical top-3 set in {same}/{n} consecutive-year pairs; mean overlap "
          f"{over / n:.2f}/3; heaviest subject unchanged in {first}/{n}")
    tie_years = [y for y in years
                 if (Y.loc[y, TECH] >= sorted(Y.loc[y, TECH], reverse=True)[2]).sum() > 3]
    print(f"  years with a tie at 3rd place (top-3 ambiguous): {tie_years}")
    ys = [y for y in years if y >= 2016]
    s2 = sum(len(tops[a] & tops[b]) == 3 for a, b in zip(ys, ys[1:]))
    o2 = np.mean([len(tops[a] & tops[b]) for a, b in zip(ys, ys[1:])])
    print(f"  2016+: identical top-3 in {s2}/{len(ys) - 1} pairs, mean overlap {o2:.2f}/3")

    def valid_top3(row):  # every top-3 set consistent with ties at 3rd place
        third = sorted(row, reverse=True)[2]
        above = [s for s in row.index if row[s] > third]
        tied = [s for s in row.index if row[s] == third]
        return [frozenset(above) | frozenset(c) for c in itertools.combinations(tied, 3 - len(above))]

    best = [max(len(a & b) for a in valid_top3(Y.loc[x, TECH]) for b in valid_top3(Y.loc[z, TECH]))
            for x, z in zip(years, years[1:])]
    print(f"  most favourable tie-breaking: identical top-3 in {sum(o == 3 for o in best)}/{n} "
          f"pairs, mean overlap {np.mean(best):.2f}/3")
    pair_overlap = []
    for (y1, s1), (y2, s2_) in zip(P.index, P.index[1:]):
        pair_overlap.append(len(top3(P.loc[(y1, s1), TECH], lr) & top3(P.loc[(y2, s2_), TECH], lr)))
    print(f"  consecutive papers (incl. sets of the same year): identical top-3 in "
          f"{sum(o == 3 for o in pair_overlap)}/{len(pair_overlap)}, mean overlap "
          f"{np.mean(pair_overlap):.2f}/3")


if __name__ == "__main__":
    main()
