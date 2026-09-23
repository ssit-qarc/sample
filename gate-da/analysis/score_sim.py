"""How often does a given per-question accuracy reach 90 marks?

Simulates the GATE DA 2026 paper's mix of question types and marks: every
question is attempted, each is answered correctly with probability p, and a
wrong MCQ loses a third of its marks (MSQ and NAT have no negative marking).

    python gate-da/analysis/score_sim.py
"""
import os
import random

KEY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "DA", "2026", "DA_2026_KEY.txt")


def load_questions():
    questions = []
    with open(KEY, encoding="utf-8") as f:
        for line in f:
            t = line.split()
            if len(t) >= 6 and t[0].isdigit() and t[2] in ("MCQ", "MSQ", "NAT"):
                questions.append((t[2], int(t[-1])))
    assert len(questions) == 65 and sum(m for _, m in questions) == 100
    return questions


def main(trials=200_000, seed=1):
    questions = load_questions()
    rng = random.Random(seed)
    print("accuracy  mean   sd   P(>=90)  P(>=85)")
    for p in (0.88, 0.90, 0.92, 0.94, 0.95, 0.96):
        scores = []
        for _ in range(trials):
            s = 0.0
            for kind, marks in questions:
                if rng.random() < p:
                    s += marks
                elif kind == "MCQ":
                    s -= marks / 3
            scores.append(s)
        mean = sum(scores) / trials
        sd = (sum((x - mean) ** 2 for x in scores) / trials) ** 0.5
        at90 = sum(x >= 90 for x in scores) / trials
        at85 = sum(x >= 85 for x in scores) / trials
        print(f"  {p:.2f}    {mean:5.1f}  {sd:4.1f}   {at90:5.2f}    {at85:5.2f}")


if __name__ == "__main__":
    main()
