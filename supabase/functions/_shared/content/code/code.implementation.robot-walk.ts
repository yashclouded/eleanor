import type { CodeProblem } from './types.ts'

export const robotWalkProblem: CodeProblem = {
  id: 'code.implementation.robot-walk',
  version: 1,
  slug: 'code.implementation.robot-walk',
  concept: 'code.implementation',
  family: 'robot-walk',
  status: 'draft',
  review: {
    author: 'yashclouded',
    reviewer: null,
    reviewedAt: null,
  },
  initialRating: 800,
  statement: [
    {
      t: 'p',
      text: 'A robot starts at coordinate $(0, 0)$ on a 2D Cartesian plane facing North (+Y direction). It executes a sequence of commands:',
    },
    {
      t: 'list',
      items: [
        "`'F'`: Move forward 1 unit in the current facing direction.",
        "`'L'`: Turn 90 degrees counter-clockwise (left).",
        "`'R'`: Turn 90 degrees clockwise (right).",
      ],
    },
    {
      t: 'p',
      text: 'Determine the final $(x, y)$ coordinates of the robot after executing all commands.',
    },
  ],
  inputFormat: [
    {
      t: 'p',
      text: 'The first line contains an integer $t$ ($1 \\le t \\le 100$), the number of test cases.',
    },
    {
      t: 'p',
      text: 'Each of the next $t$ lines contains a non-empty string $s$ consisting of characters `F`, `L`, and `R`.',
    },
    {
      t: 'p',
      text: 'The sum of $|s|$ over all test cases does not exceed $2 \\cdot 10^5$.',
    },
  ],
  outputFormat: [
    {
      t: 'p',
      text: 'For each test case, print two space-separated integers $x$ and $y$ on a single line.',
    },
  ],
  constraints: [
    {
      t: 'list',
      items: [
        '$1 \\le t \\le 100$',
        '$1 \\le |s| \\le 2 \\cdot 10^5$',
        '$\\sum |s| \\le 2 \\cdot 10^5$',
        '$s_i \\in \\{\\text{\\\'F\\\', \\\'L\\\', \\\'R\\\'}\\}$',
      ],
    },
  ],
  samples: [
    {
      input: '2\nFFRFF\nFF\n',
      output: '2 2\n0 2\n',
      explain: [
        {
          t: 'p',
          text: 'Case 1: Move forward 2 units North to (0, 2), turn East, move forward 2 units to (2, 2). Case 2: Move forward 2 units North to (0, 2).',
        },
      ],
    },
  ],
  groups: [
    { label: 'samples', fingerprint: 'fails sample test cases' },
    { label: 'small', fingerprint: 'straight-line movement' },
    { label: 'turns', fingerprint: 'counter-clockwise rotation (left turns)' },
    { label: 'mixed', fingerprint: 'mixed maneuvers' },
    { label: 'performance', fingerprint: 'time limit on large command sequences' },
  ],
  limits: {
    cpuSeconds: 2.0,
    memoryKb: 256000,
  },
  checker: {
    kind: 'tokens',
  },
  editorial: [
    {
      t: 'p',
      text: 'Track position $(x, y)$ starting at $(0, 0)$ and orientation $d \\in \\{0, 1, 2, 3\\}$ corresponding to North (+Y), East (+X), South (-Y), and West (-X).',
    },
    {
      t: 'p',
      text: 'Turning Right advances orientation: $d = (d + 1) \\pmod 4$. Turning Left decrements orientation: $d = (d + 3) \\pmod 4$.',
    },
    {
      t: 'p',
      text: 'Moving Forward adds step vectors $(dx[d], dy[d])$. This processes each character in $O(1)$ time and total $O(|s|)$ time.',
    },
  ],
  wrong: [
    { file: 'wrong_left_turn.py', failsGroup: 2 },
    { file: 'wrong_quadratic.py', failsGroup: 4 },
  ],
  referenceSolutions: {
    cpp: `#include <iostream>
#include <string>

using namespace std;

const int dx[4] = {0, 1, 0, -1};
const int dy[4] = {1, 0, -1, 0};

void solve() {
    string s;
    if (!(cin >> s)) return;
    int x = 0, y = 0;
    int dir = 0;
    for (char c : s) {
        if (c == 'F') {
            x += dx[dir];
            y += dy[dir];
        } else if (c == 'R') {
            dir = (dir + 1) % 4;
        } else if (c == 'L') {
            dir = (dir + 3) % 4;
        }
    }
    cout << x << " " << y << "\\n";
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int t;
    if (cin >> t) {
        while (t--) {
            solve();
        }
    }
    return 0;
}`,
    python: `import sys

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
    sys.stdout.write("\\n".join(out) + "\\n")

if __name__ == "__main__":
    main()`,
    javascript: `const fs = require('fs');

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!input || input.length === 0 || input[0] === '') return;
    const t = parseInt(input[0], 10);
    const dx = [0, 1, 0, -1];
    const dy = [1, 0, -1, 0];
    const out = [];
    for (let i = 1; i <= t; i++) {
        const s = input[i];
        let x = 0, y = 0, d = 0;
        for (let j = 0; j < s.length; j++) {
            const ch = s[j];
            if (ch === 'F') {
                x += dx[d];
                y += dy[d];
            } else if (ch === 'R') {
                d = (d + 1) % 4;
            } else if (ch === 'L') {
                d = (d + 3) % 4;
            }
        }
        out.push(\`\${x} \${y}\`);
    }
    process.stdout.write(out.join('\\n') + '\\n');
}

main();`,
  },
}
