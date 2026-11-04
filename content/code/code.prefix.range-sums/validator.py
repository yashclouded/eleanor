import sys

def main():
    data = sys.stdin.read().split()
    if not data:
        print("Empty input", file=sys.stderr)
        sys.exit(1)

    ptr = 0
    t = int(data[ptr])
    ptr += 1

    if not (1 <= t <= 100):
        print(f"t out of range: {t}", file=sys.stderr)
        sys.exit(1)

    sum_n = 0
    sum_q = 0

    for _ in range(t):
        n = int(data[ptr])
        q = int(data[ptr + 1])
        ptr += 2

        if not (1 <= n <= 200_000) or not (1 <= q <= 200_000):
            print(f"n or q out of range: n={n}, q={q}", file=sys.stderr)
            sys.exit(1)

        sum_n += n
        sum_q += q

        # Read array elements
        for _ in range(n):
            val = int(data[ptr])
            ptr += 1
            if not (-1_000_000_000 <= val <= 1_000_000_000):
                print(f"val out of range: {val}", file=sys.stderr)
                sys.exit(1)

        # Read queries
        for _ in range(q):
            l = int(data[ptr])
            r = int(data[ptr + 1])
            ptr += 2
            if not (1 <= l <= r <= n):
                print(f"Invalid query: l={l}, r={r}, n={n}", file=sys.stderr)
                sys.exit(1)

    if sum_n > 200_000 or sum_q > 200_000:
        print(f"Sum n ({sum_n}) or sum q ({sum_q}) exceeds 200,000", file=sys.stderr)
        sys.exit(1)

    if ptr != len(data):
        print("Extra input tokens found", file=sys.stderr)
        sys.exit(1)

    sys.exit(0)

if __name__ == "__main__":
    main()
