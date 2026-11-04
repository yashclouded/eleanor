import sys

def main():
    lines = sys.stdin.read().split()
    if not lines:
        print("Empty input", file=sys.stderr)
        sys.exit(1)

    t = int(lines[0])
    if not (1 <= t <= 100):
        print(f"t out of range: {t}", file=sys.stderr)
        sys.exit(1)

    if len(lines) - 1 != t:
        print(f"Expected {t} lines, got {len(lines) - 1}", file=sys.stderr)
        sys.exit(1)

    sum_len = 0
    valid_chars = {"F", "L", "R"}

    for i in range(1, t + 1):
        s = lines[i]
        if len(s) == 0:
            print(f"Empty test string at line {i}", file=sys.stderr)
            sys.exit(1)

        sum_len += len(s)
        for ch in s:
            if ch not in valid_chars:
                print(f"Invalid character '{ch}' at line {i}", file=sys.stderr)
                sys.exit(1)

    if sum_len > 200_000:
        print(f"Sum of string lengths ({sum_len}) exceeds 200,000", file=sys.stderr)
        sys.exit(1)

    sys.exit(0)

if __name__ == "__main__":
    main()
