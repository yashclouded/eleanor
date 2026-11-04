import sys
import random

def main():
    if len(sys.argv) < 3:
        print("Usage: gen.py <group> <seed> [output_file]", file=sys.stderr)
        sys.exit(1)

    group = sys.argv[1]
    seed = int(sys.argv[2])
    rng = random.Random(seed)

    out = []

    if group == "samples":
        out.append("1")
        out.append("5 3")
        out.append("1 2 3 4 5")
        out.append("1 3")
        out.append("2 4")
        out.append("1 5")

    elif group == "small":
        out.append("2")
        # Test 1: minimal n=1, q=1
        out.append("1 1")
        out.append("42")
        out.append("1 1")
        # Test 2: n=5, q=5
        out.append("5 5")
        out.append("10 20 30 40 50")
        for _ in range(5):
            l = rng.randint(1, 5)
            r = rng.randint(l, 5)
            out.append(f"{l} {r}")

    elif group == "negative":
        out.append("1")
        n, q = 20, 10
        out.append(f"{n} {q}")
        vals = [rng.randint(-1000, 1000) for _ in range(n)]
        out.append(" ".join(map(str, vals)))
        for _ in range(q):
            l = rng.randint(1, n)
            r = rng.randint(l, n)
            out.append(f"{l} {r}")

    elif group == "overflow":
        # Sums deliberately exceed 2^31 - 1 (2,147,483,647)
        out.append("1")
        n, q = 100, 10
        out.append(f"{n} {q}")
        # Each element ~ 10^9, so prefix sums reach 10^11
        vals = [rng.randint(900_000_000, 1_000_000_000) for _ in range(n)]
        out.append(" ".join(map(str, vals)))
        for _ in range(q):
            l = rng.randint(1, 10)
            r = rng.randint(90, n)
            out.append(f"{l} {r}")

    elif group == "performance":
        out.append("1")
        n = 100_000
        q = 100_000
        out.append(f"{n} {q}")
        vals = [rng.randint(-1_000_000_000, 1_000_000_000) for _ in range(n)]
        out.append(" ".join(map(str, vals)))
        for _ in range(q):
            l = rng.randint(1, n)
            r = rng.randint(l, n)
            out.append(f"{l} {r}")

    else:
        print(f"Unknown group: {group}", file=sys.stderr)
        sys.exit(1)

    result = "\n".join(out) + "\n"
    if len(sys.argv) > 3:
        with open(sys.argv[3], "w", encoding="utf-8") as f:
            f.write(result)
    else:
        sys.stdout.write(result)

if __name__ == "__main__":
    main()
