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
        out.append("2")
        out.append("FFRFF")
        out.append("FF")

    elif group == "small":
        # Straight-line moves only (no turns)
        out.append("3")
        out.append("F")
        out.append("FFFFF")
        out.append("F" * 20)

    elif group == "turns":
        # Contains 'L' turns
        out.append("3")
        out.append("FLF")
        out.append("FLFLFLF")
        out.append("FLFRFFL")

    elif group == "mixed":
        # Mixed commands up to length 500
        out.append("3")
        for _ in range(3):
            n = rng.randint(200, 500)
            s = "".join(rng.choice(["F", "F", "L", "R"]) for _ in range(n))
            out.append(s)

    elif group == "performance":
        out.append("1")
        n = 200_000
        s = "".join(rng.choice(["F", "F", "L", "R"]) for _ in range(n))
        out.append(s)

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
