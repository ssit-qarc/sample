#!/usr/bin/env python3
"""Tag every GATE DA 2024-2026 question by syllabus subject/subtopic and total marks.

Inputs (read only): gate-da/data/DA/<YEAR>/DA_<YEAR>_KEY.txt
Outputs:            gate-da/analysis/da_questions.csv       (one row per question, 195 rows)
                    gate-da/analysis/da_subject_marks.csv   (questions and marks per subject per year)

type, marks and answer come from the answer keys. subject, subtopic, skill, confidence,
alt_subject and note are hand tags from reading each question (text checked against the
PDF page wherever the extracted text lost a figure, table or formula).

Subjects are the official GATE DA syllabus sections (identical for 2024-2027); subtopics use
the syllabus's own terms. A question that tests more than one subtopic lists them separated
by "; ", primary first. Q.1-Q.10 are General Aptitude, subtopic = the GA syllabus section.

skill:      calculation | concept | code  (code = reading or tracing code, pseudocode or a
            query in SQL / relational algebra / tuple calculus)
confidence: high | medium | low, for the subject tag only
"""
import csv
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data" / "DA"
YEARS = (2024, 2025, 2026)

GA, PS, LA, CO, PD, DB, ML, AI = "GA", "PS", "LA", "CO", "PD", "DB", "ML", "AI"
SUBJECT = {
    GA: "General Aptitude",
    PS: "Probability and Statistics",
    LA: "Linear Algebra",
    CO: "Calculus and Optimization",
    PD: "Programming, Data Structures and Algorithms",
    DB: "Database Management and Warehousing",
    ML: "Machine Learning",
    AI: "AI",
}
ORDER = [GA, PS, LA, CO, PD, DB, ML, AI]

# Allowed subtopic terms per subject, taken from the GATE 2027 DA and GA syllabi.
# "gradient descent" (ML) is the one term the syllabus does not name; see 2026 Q29.
VOCAB = {
    GA: {"verbal", "quantitative", "analytical", "spatial"},
    PS: {"counting (permutations and combinations)", "sample space and events",
         "independent events", "conditional probability", "Bayes theorem",
         "conditional expectation and variance", "mean/median/mode/standard deviation",
         "correlation and covariance", "random variables", "Bernoulli/binomial distribution",
         "uniform distribution", "exponential distribution", "Poisson distribution",
         "normal distribution", "t-distribution", "chi-squared distribution",
         "cumulative distribution function", "conditional PDF", "central limit theorem",
         "confidence interval", "z-test", "t-test", "chi-squared test"},
    LA: {"vector space and subspaces", "linear dependence and independence", "matrices",
         "projection matrix", "orthogonal matrix", "idempotent matrix", "partition matrix",
         "quadratic forms", "systems of linear equations", "Gaussian elimination",
         "eigenvalues and eigenvectors", "determinant", "rank and nullity",
         "LU decomposition", "singular value decomposition"},
    CO: {"functions of a single variable", "limit", "continuity and differentiability",
         "Taylor series", "maxima and minima", "optimization involving a single variable"},
    PD: {"programming in Python", "programming (pseudocode)", "stacks", "queues",
         "linked lists", "trees", "hash tables", "linear search", "binary search",
         "basic sorting algorithms", "mergesort", "quicksort", "graph theory",
         "graph traversals", "shortest path"},
    DB: {"ER-model", "relational algebra", "tuple calculus", "SQL", "integrity constraints",
         "normal form", "file organization", "indexing", "data types", "data transformation",
         "multidimensional data models", "concept hierarchies", "measures"},
    ML: {"classification problems", "simple linear regression", "multiple linear regression",
         "ridge regression", "logistic regression", "k-nearest neighbour",
         "naive Bayes classifier", "linear discriminant analysis", "support vector machine",
         "decision trees", "bias-variance trade-off", "cross-validation",
         "feed-forward neural network", "k-means/k-medoid", "hierarchical clustering", "PCA",
         "gradient descent"},
    AI: {"uninformed search", "informed search", "minimax/adversarial search",
         "propositional logic", "predicate logic", "conditional independence representation",
         "variable elimination", "approximate inference (sampling)"},
}

# (q_no, subject, subtopic, skill, confidence, alt_subject, note)
TAGS = {
    2024: [
        (1, GA, "verbal", "concept", "high", "", "word analogy"),
        (2, GA, "spatial", "concept", "high", "", "colouring a 15-part figure"),
        (3, GA, "quantitative", "calculation", "high", "", "permutations; divisibility by 3"),
        (4, GA, "quantitative", "calculation", "high", "", "infinite series"),
        (5, GA, "quantitative", "calculation", "high", "", "pie chart"),
        (6, GA, "verbal", "concept", "high", "", "passage inference"),
        (7, GA, "quantitative", "calculation", "high", "", "elementary probability"),
        (8, GA, "quantitative", "calculation", "high", "", "table; percentages"),
        (9, GA, "spatial", "concept", "high", "", "dice net folding"),
        (10, GA, "spatial", "concept", "high", "", "3-D cross-section of cones"),
        (11, PS, "Poisson distribution; normal distribution", "concept", "high", "", ""),
        (12, PS, "sample space and events", "calculation", "high", "", ""),
        (13, LA, "eigenvalues and eigenvectors", "calculation", "high", "", ""),
        (14, PD, "graph traversals", "concept", "high", "", "DFS edge classification"),
        (15, CO, "maxima and minima", "concept", "high", "", "second-derivative test"),
        (16, PD, "stacks; queues; hash tables", "concept", "high", "", ""),
        (17, ML, "support vector machine", "calculation", "high", "", ""),
        (18, ML, "PCA; naive Bayes classifier; logistic regression", "concept", "high", "",
         "generative vs discriminative"),
        (19, ML, "k-means/k-medoid", "concept", "high", "", ""),
        (20, ML, "naive Bayes classifier", "concept", "high", "", "parameter count"),
        (21, PD, "hash tables", "concept", "high", "", "open addressing probes"),
        (22, ML, "linear discriminant analysis", "concept", "high", LA,
         "Fisher LDA as eigenproblem; uses LA"),
        (23, AI, "informed search", "concept", "high", "", "admissible heuristics"),
        (24, AI, "conditional independence representation", "concept", "medium", PS,
         "factorised joint (Bayes net)"),
        (25, AI, "minimax/adversarial search", "concept", "high", "", "alpha-beta pruning"),
        (26, DB, "relational algebra", "code", "high", "", ""),
        (27, DB, "data transformation", "calculation", "medium", PS, "z-score normalization"),
        (28, PD, "trees", "concept", "high", "", "traversals that rebuild a tree"),
        (29, AI, "propositional logic", "calculation", "high", "", "tautologies"),
        (30, PD, "quicksort", "calculation", "high", "", "swap count depends on partition scheme"),
        (31, DB, "SQL", "code", "high", "", ""),
        (32, PD, "queues", "code", "high", "", "deque trace"),
        (33, CO, "continuity and differentiability", "calculation", "medium", ML,
         "sigmoid derivative"),
        (34, PS, "mean/median/mode/standard deviation", "calculation", "high", "", ""),
        (35, LA, "determinant", "calculation", "high", "", ""),
        (36, PS, "conditional expectation and variance", "calculation", "high", "",
         "expected waiting time"),
        (37, CO, "continuity and differentiability", "calculation", "high", "",
         "piecewise function"),
        (38, PD, "programming in Python", "code", "high", "", "recursion over a tree"),
        (39, PD, "programming (pseudocode)", "code", "high", "", ""),
        (40, PD, "binary search", "concept", "high", "", "comparison recurrence"),
        (41, PD, "programming in Python", "code", "high", "", "recursion"),
        (42, ML, "hierarchical clustering", "calculation", "high", "", "single linkage"),
        (43, ML, "feed-forward neural network", "calculation", "high", "", "ReLU network equivalence"),
        (44, AI, "uninformed search", "calculation", "medium", PD, "BFS vs DFS in a state space"),
        (45, PD, "basic sorting algorithms", "calculation", "high", "", ""),
        (46, DB, "normal form", "calculation", "high", "", "FD closure"),
        (47, LA, "vector space and subspaces", "concept", "high", "", ""),
        (48, LA, "systems of linear equations", "concept", "high", "", ""),
        (49, LA, "projection matrix", "concept", "high", "", ""),
        (50, CO, "maxima and minima", "calculation", "high", "", ""),
        (51, PD, "graph theory", "concept", "high", "", "topological sort"),
        (52, PD, "trees", "concept", "high", "", "binary tree bounds"),
        (53, ML, "classification problems", "concept", "high", "", "linear separability"),
        (54, AI, "predicate logic", "concept", "high", "", ""),
        (55, DB, "indexing", "concept", "high", "", "hash vs B+ tree"),
        (56, PS, "uniform distribution", "calculation", "high", "", ""),
        (57, PS, "exponential distribution", "calculation", "high", "", ""),
        (58, PS, "Bayes theorem", "calculation", "high", "", ""),
        (59, PS, "conditional PDF", "calculation", "high", "",
         "MTA; given joint pdf integrates to 4"),
        (60, CO, "limit", "calculation", "high", "", ""),
        (61, LA, "singular value decomposition", "calculation", "high", "", ""),
        (62, ML, "decision trees", "calculation", "high", "", "information gain"),
        (63, ML, "k-nearest neighbour", "calculation", "high", "", ""),
        (64, AI, "conditional independence representation", "calculation", "high", PS,
         "joint from Bayes-net CPTs"),
        (65, PS, "correlation and covariance", "calculation", "high", "", ""),
    ],
    2025: [
        (1, GA, "verbal", "concept", "high", "", "word analogy"),
        (2, GA, "verbal", "concept", "high", "", "tense"),
        (3, GA, "quantitative", "calculation", "high", "", "reading a pixel table"),
        (4, GA, "analytical", "concept", "high", "", "number pattern in overlapping shapes"),
        (5, GA, "quantitative", "calculation", "high", "", "mensuration"),
        (6, GA, "verbal", "concept", "high", "", "phrasal verbs"),
        (7, GA, "analytical", "concept", "high", "", "reasoning about a unimodal function"),
        (8, GA, "spatial", "calculation", "high", "", "assembling triangles; solved by area"),
        (9, GA, "quantitative", "calculation", "high", "", "exponents"),
        (10, GA, "quantitative", "calculation", "high", "", "bar chart; weighted mean"),
        (11, PS, "conditional expectation and variance", "concept", "high", "",
         "law of total expectation"),
        (12, LA, "Gaussian elimination", "concept", "high", "", "operation count"),
        (13, LA, "systems of linear equations; eigenvalues and eigenvectors", "concept", "high",
         "", ""),
        (14, CO, "Taylor series", "concept", "high", "", "10th derivative of sinh at 0"),
        (15, AI, "propositional logic", "concept", "high", "", "logical equivalence"),
        (16, DB, "normal form", "concept", "high", "", "dependency preservation"),
        (17, DB, "relational algebra", "code", "high", "", ""),
        (18, PD, "hash tables", "calculation", "high", "", "linear probing"),
        (19, PS, "cumulative distribution function", "calculation", "high", "", "median from CDF"),
        (20, PS, "normal distribution", "calculation", "high", "", ""),
        (21, PS, "exponential distribution", "calculation", "high", "", ""),
        (22, ML, "classification problems", "concept", "high", "", "perceptron update"),
        (23, PD, "programming in Python", "code", "high", "", "list methods"),
        (24, CO, "continuity and differentiability", "concept", "high", "", ""),
        (25, LA, "linear dependence and independence", "concept", "high", "", "orthonormal bases"),
        (26, AI, "variable elimination; approximate inference (sampling)", "concept", "high", "", ""),
        (27, PD, "binary search", "concept", "high", "", "array vs linked list"),
        (28, LA, "eigenvalues and eigenvectors", "concept", "high", "", "I + xx^T"),
        (29, PD, "basic sorting algorithms", "calculation", "high", "", "insertion sort swaps"),
        (30, ML, "hierarchical clustering", "concept", "high", "", "single vs complete linkage"),
        (31, PS, "Bayes theorem", "calculation", "high", "", ""),
        (32, CO, "limit", "calculation", "high", "", ""),
        (33, DB, "SQL", "code", "high", "", ""),
        (34, ML, "simple linear regression", "calculation", "high", "", "least squares"),
        (35, ML, "naive Bayes classifier", "calculation", "high", PS,
         "misclassification probability"),
        (36, PS, "normal distribution", "calculation", "high", "", "Var(Z^2)"),
        (37, LA, "rank and nullity", "concept", "high", "", "A^3 = A"),
        (38, LA, "linear dependence and independence", "concept", "high", "", "Gram matrix"),
        (39, PS, "cumulative distribution function", "calculation", "high", "", ""),
        (40, PS, "central limit theorem", "calculation", "high", "", ""),
        (41, PS, "exponential distribution", "calculation", "high", "", "floor gives geometric"),
        (42, ML, "feed-forward neural network", "calculation", "high", CO, "backprop through ReLU"),
        (43, AI, "minimax/adversarial search", "calculation", "high", "", "alpha-beta pruning"),
        (44, AI, "informed search", "calculation", "high", "", "A*"),
        (45, PS, "independent events", "calculation", "high", "", ""),
        (46, DB, "multidimensional data models", "code", "high", "", "GROUP BY CUBE"),
        (47, PD, "programming in Python", "code", "high", "", "set operations"),
        (48, CO, "continuity and differentiability", "concept", "medium", ML, "ReLU properties"),
        (49, CO, "maxima and minima", "calculation", "high", "", ""),
        (50, LA, "projection matrix", "concept", "high", "", "singular values vs eigenvalues"),
        (51, CO, "maxima and minima", "concept", "high", "", "f'' > 0"),
        (52, LA, "orthogonal matrix", "concept", "high", "", ""),
        (53, ML, "support vector machine", "calculation", "high", "", ""),
        (54, PS, "Bernoulli/binomial distribution", "concept", "high", "", "sample proportion"),
        (55, ML, "classification problems", "concept", "high", "", "nearest-mean classifier"),
        (56, DB, "integrity constraints", "concept", "high", "", "keys and NULLs"),
        (57, DB, "normal form", "calculation", "high", "", "candidate keys; BCNF"),
        (58, PD, "shortest path", "concept", "high", "", ""),
        (59, CO, "continuity and differentiability", "concept", "high", "", ""),
        (60, ML, "PCA", "calculation", "high", LA, "variance = top eigenvalue"),
        (61, PS, "Bernoulli/binomial distribution", "calculation", "high", "", ""),
        (62, DB, "relational algebra", "code", "high", "", "division"),
        (63, PD, "programming in Python", "code", "high", "", "recursion"),
        (64, PD, "stacks", "code", "high", "", "pseudocode"),
        (65, PD, "graph traversals", "calculation", "high", "", "DFS order"),
    ],
    2026: [
        (1, GA, "verbal", "concept", "high", "", "word analogy"),
        (2, GA, "quantitative", "calculation", "high", "", "digit product"),
        (3, GA, "spatial", "concept", "high", "", "assembling puzzle pieces"),
        (4, GA, "quantitative", "calculation", "high", "", "logarithms"),
        (5, GA, "verbal", "concept", "high", "", "counterfactual conditional"),
        (6, GA, "verbal", "concept", "high", "", "prepositions"),
        (7, GA, "quantitative", "calculation", "high", "", "mean/median/mode"),
        (8, GA, "analytical", "concept", "high", "", "logic puzzle"),
        (9, GA, "analytical", "calculation", "high", "", "digit puzzle"),
        (10, GA, "quantitative", "calculation", "high", "", "circle geometry"),
        (11, ML, "PCA", "concept", "high", LA, "PCs are orthogonal"),
        (12, ML, "cross-validation", "concept", "high", "", "LOOCV"),
        (13, AI, "uninformed search; informed search", "concept", "high", "", ""),
        (14, AI, "predicate logic", "concept", "high", "", ""),
        (15, PD, "quicksort", "concept", "high", "", "average-case recurrence"),
        (16, PD, "programming in Python", "code", "high", "", "mutable default argument"),
        (17, DB, "normal form", "calculation", "high", "", "candidate keys"),
        (18, DB, "multidimensional data models", "concept", "high", "", "OLAP drill-down"),
        (19, PS, "counting (permutations and combinations)", "calculation", "high", "", ""),
        (20, PS, "counting (permutations and combinations)", "calculation", "high", "",
         "stars and bars"),
        (21, LA, "orthogonal matrix", "calculation", "high", "", "rotation matrix power"),
        (22, LA, "vector space and subspaces", "concept", "high", "", ""),
        (23, ML, "k-means/k-medoid; naive Bayes classifier; linear discriminant analysis",
         "concept", "high", "", "task-algorithm matching (incl. MCMC)"),
        (24, AI, "propositional logic", "concept", "high", "", "entailment"),
        (25, PD, "trees", "calculation", "high", "", "rebuild from traversals"),
        (26, DB, "integrity constraints", "concept", "high", "", "foreign key"),
        (27, CO, "maxima and minima", "calculation", "high", "", ""),
        (28, PS, "t-distribution; normal distribution", "concept", "high", "", ""),
        (29, ML, "gradient descent", "calculation", "medium", CO,
         "SGD step; not named in syllabus"),
        (30, AI, "minimax/adversarial search", "calculation", "high", "", ""),
        (31, PD, "binary search", "calculation", "high", "", ""),
        (32, DB, "indexing", "calculation", "high", "", "B+ tree fan-out"),
        (33, PS, "counting (permutations and combinations)", "calculation", "medium", "",
         "involutions; discrete maths"),
        (34, PS, "exponential distribution", "calculation", "high", "", "memoryless"),
        (35, CO, "limit", "calculation", "medium", "", "double geometric series"),
        (36, ML, "hierarchical clustering", "calculation", "high", "", "Manhattan distance"),
        (37, ML, "ridge regression; bias-variance trade-off", "concept", "high", "", ""),
        (38, AI, "propositional logic", "concept", "high", "", ""),
        (39, PD, "programming in Python", "code", "high", "", "recursion call count"),
        (40, PD, "graph traversals", "concept", "high", "", "reversed-graph reachability"),
        (41, DB, "indexing", "calculation", "high", "", "B+ tree insertion"),
        (42, DB, "relational algebra", "code", "high", "", ""),
        (43, DB, "concept hierarchies", "calculation", "high", "", "cuboid count"),
        (44, PS, "random variables", "calculation", "high", "", "variance of a product"),
        (45, PS, "central limit theorem", "calculation", "medium", CO, "posed as a limit"),
        (46, LA, "eigenvalues and eigenvectors", "calculation", "high", "", ""),
        (47, ML, "classification problems", "calculation", "high", "", "accuracy/precision/recall"),
        (48, AI, "predicate logic", "concept", "high", "", "validity"),
        (49, PD, "basic sorting algorithms", "calculation", "high", "", ""),
        (50, PD, "programming in Python", "code", "high", "", "closures"),
        (51, DB, "SQL", "code", "high", "", ""),
        (52, LA, "projection matrix", "concept", "high", "", "centering matrix"),
        (53, PS, "chi-squared distribution", "concept", "high", "", ""),
        (54, PS, "cumulative distribution function", "concept", "high", "", ""),
        (55, ML, "ridge regression", "calculation", "high", "", "regularised loss"),
        (56, ML, "feed-forward neural network", "calculation", "high", "", "parameter count"),
        (57, PS, "Bayes theorem", "calculation", "medium", AI, "placed in the AI slot of the paper"),
        (58, PD, "programming in Python; basic sorting algorithms", "code", "high", "",
         "bubble-sort passes"),
        (59, DB, "tuple calculus", "code", "high", "", "key range 2 to 3"),
        (60, DB, "SQL", "code", "high", "", "correlated subqueries"),
        (61, DB, "ER-model", "concept", "high", "", "ER to 3NF relations"),
        (62, PS, "mean/median/mode/standard deviation", "calculation", "high", "",
         "sample variance"),
        (63, PS, "correlation and covariance", "calculation", "high", "", ""),
        (64, PS, "Bernoulli/binomial distribution", "calculation", "high", "", ""),
        (65, LA, "quadratic forms; eigenvalues and eigenvectors", "calculation", "high", "", ""),
    ],
}


# ---------------------------------------------------------------- answer keys
def _clean(s):
    return re.sub(r"\s+", " ", s.strip())


def parse_key_rows(text):
    """2024 and 2026 keys: one row per question: Q.No Session Type Section Key Marks."""
    pat = re.compile(r"^\s*(\d{1,2})\s+\d+\s+(MCQ|MSQ|NAT)\s+(GA|DA)\s+(.+?)\s+([12])\s*$")
    out = {}
    for line in text.splitlines():
        m = pat.match(line)
        if m:
            out[int(m.group(1))] = (m.group(2), m.group(3), _clean(m.group(4)), int(m.group(5)))
    return out


def parse_key_fields(text):
    """2025 key: each of the six fields on its own line."""
    toks = [t.strip() for t in text.splitlines() if t.strip()]
    out, i = {}, 0
    while i + 5 < len(toks):
        q, _sess, typ, sec, ans, mk = toks[i:i + 6]
        if (re.fullmatch(r"\d{1,2}", q) and re.fullmatch(r"\d+", _sess)
                and typ in ("MCQ", "MSQ", "NAT") and sec in ("GA", "DA")
                and re.fullmatch(r"[12]", mk)):
            out[int(q)] = (typ, sec, _clean(ans), int(mk))
            i += 6
        else:
            i += 1
    return out


def load_key(year):
    text = (DATA / str(year) / f"DA_{year}_KEY.txt").read_text(encoding="utf-8")
    text = unicodedata.normalize("NFKC", text)
    key = parse_key_fields(text) if year == 2025 else parse_key_rows(text)
    if sorted(key) != list(range(1, 66)):
        sys.exit(f"{year}: key parsed {len(key)} rows, missing {sorted(set(range(1, 66)) - set(key))}")
    for q, (_t, sec, _a, _m) in key.items():
        if (sec == "GA") != (q <= 10):
            sys.exit(f"{year} Q{q}: key section {sec} does not match question number")
    return key


# ---------------------------------------------------------------- checks
def validate(year, rows):
    qs = [r[0] for r in rows]
    if sorted(qs) != list(range(1, 66)):
        sys.exit(f"{year}: tags cover {len(set(qs))} distinct questions, expected 1-65")
    for q, subj, sub, skill, conf, alt, note in rows:
        where = f"{year} Q{q}"
        if (subj == GA) != (q <= 10):
            sys.exit(f"{where}: subject {subj} but GA is exactly Q1-Q10")
        for term in sub.split("; "):
            if term not in VOCAB[subj]:
                sys.exit(f"{where}: subtopic '{term}' not in the {SUBJECT[subj]} vocabulary")
        if subj == GA and ";" in sub:
            sys.exit(f"{where}: GA takes a single subtopic")
        if skill not in ("calculation", "concept", "code"):
            sys.exit(f"{where}: bad skill {skill}")
        if conf not in ("high", "medium", "low"):
            sys.exit(f"{where}: bad confidence {conf}")
        if alt and (alt not in SUBJECT or alt in (subj, GA)):
            sys.exit(f"{where}: bad alt_subject {alt}")
        if "," in note:
            sys.exit(f"{where}: keep notes comma-free")


def main():
    out_q = HERE / "da_questions.csv"
    out_s = HERE / "da_subject_marks.csv"
    qrows, sums = [], {}
    for year in YEARS:
        key = load_key(year)
        rows = sorted(TAGS[year])
        validate(year, rows)
        agg = {s: [0, 0] for s in ORDER}
        for q, subj, sub, skill, conf, alt, note in rows:
            typ, _sec, ans, marks = key[q]
            if ans == "MTA" and "MTA" not in note:
                sys.exit(f"{year} Q{q}: key says MTA but the note does not")
            qrows.append([year, q, SUBJECT[subj], sub, typ, marks, ans, skill, conf,
                          SUBJECT[alt] if alt else "", note])
            agg[subj][0] += 1
            agg[subj][1] += marks
        ga = agg[GA][1]
        da = sum(agg[s][1] for s in ORDER if s != GA)
        if (agg[GA][0], ga, da, ga + da) != (10, 15, 85, 100):
            sys.exit(f"{year}: marks check failed: GA {agg[GA][0]}q/{ga} + DA {da} = {ga + da}")
        sums[year] = agg

    with out_q.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["year", "q_no", "subject", "subtopic", "type", "marks", "answer", "skill",
                    "confidence", "alt_subject", "note"])
        w.writerows(qrows)

    with out_s.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["year", "subject", "questions", "marks"])
        for year in YEARS:
            agg = sums[year]
            for s in ORDER:
                w.writerow([year, SUBJECT[s], agg[s][0], agg[s][1]])
            da_q = sum(agg[s][0] for s in ORDER if s != GA)
            da_m = sum(agg[s][1] for s in ORDER if s != GA)
            # check rows: GA (15) + DA subtotal (85) = TOTAL (100); asserted above
            w.writerow([year, "DA subtotal", da_q, da_m])
            w.writerow([year, "TOTAL", agg[GA][0] + da_q, agg[GA][1] + da_m])

    # ------------------------------------------------------------ console summary
    print(f"wrote {out_q} ({len(qrows)} rows) and {out_s}")
    print(f"\n{'subject':45s}" + "".join(f"{y:>10d}" for y in YEARS))
    for s in ORDER:
        print(f"{SUBJECT[s]:45s}" + "".join(f"{sums[y][s][1]:>6d} ({sums[y][s][0]:>2d})"
                                             for y in YEARS))
    for y in YEARS:
        ga = sums[y][GA][1]
        da = sum(sums[y][s][1] for s in ORDER if s != GA)
        print(f"check {y}: GA {ga} + DA {da} = {ga + da}  OK")

    years_of = defaultdict(set)
    for year, q, subj, sub, *_ in qrows:
        for term in sub.split("; "):
            years_of[(subj, term)].add(year)
    print("\nsubtopics present in all three years:")
    for (subj, term), ys in sorted(years_of.items()):
        if len(ys) == len(YEARS):
            print(f"  {subj}: {term}")
    print("\nnon-high confidence tags:")
    for r in qrows:
        if r[8] != "high":
            print(f"  {r[0]} Q{r[1]} {r[8]}: {r[2]} (alt {r[9] or '-'}) {r[10]}")


if __name__ == "__main__":
    main()
