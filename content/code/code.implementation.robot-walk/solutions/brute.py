import sys

def main():
    lines = sys.stdin.read().split()
    if not lines:
        return

    t = int(lines[0])
    dx = [0, 1, 0, -1]
    dy = [1, 0, -1, 0]

    out = []
    for i in range(1, t + 1):
        s = lines[i]
        x, y = 0, 0
        d = 0
        for ch in s:
            if ch == "F":
                x += dx[d]
                y += dy[d]
            elif ch == "R":
                d = (d + 1) % 4
            elif ch == "L":
                d = (d + 3) % 4
        out.append(f"{x} {y}")

    sys.stdout.write("\n".join(out) + "\n")

if __name__ == "__main__":
    main()
