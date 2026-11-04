import sys

def main():
    input_data = sys.stdin.read().split()
    if not input_data:
        return

    ptr = 0
    t = int(input_data[ptr])
    ptr += 1

    out = []
    for _ in range(t):
        n = int(input_data[ptr])
        q = int(input_data[ptr + 1])
        ptr += 2

        arr = [int(x) for x in input_data[ptr : ptr + n]]
        ptr += n

        for _ in range(q):
            l = int(input_data[ptr]) - 1
            r = int(input_data[ptr + 1])
            ptr += 2
            # Direct slice sum
            out.append(str(sum(arr[l:r])))

    sys.stdout.write("\n".join(out) + "\n")

if __name__ == "__main__":
    main()
