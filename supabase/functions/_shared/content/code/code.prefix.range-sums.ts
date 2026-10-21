import type { CodeProblem } from './types.ts'

export const rangeSumsProblem: CodeProblem = {
  id: 'code.prefix.range-sums',
  version: 1,
  slug: 'code.prefix.range-sums',
  concept: 'code.prefix',
  family: 'range-sums',
  status: 'draft',
  review: {
    author: 'yashclouded',
    reviewer: null,
    reviewedAt: null,
  },
  initialRating: 1200,
  statement: [
    {
      t: 'p',
      text: 'Given an array of $n$ integers and $q$ range sum queries, calculate the sum of elements from index $l$ to index $r$ (1-based, inclusive) for each query.',
    },
  ],
  inputFormat: [
    {
      t: 'p',
      text: 'The first line contains an integer $t$ ($1 \\le t \\le 100$), the number of test cases.',
    },
    {
      t: 'p',
      text: 'For each test case, the first line contains two integers $n$ and $q$ ($1 \\le n, q \\le 2 \\cdot 10^5$).',
    },
    {
      t: 'p',
      text: 'The second line contains $n$ integers $a_1, a_2, \\dots, a_n$ ($-10^9 \\le a_i \\le 10^9$).',
    },
    {
      t: 'p',
      text: 'The next $q$ lines each contain two integers $l$ and $r$ ($1 \\le l \\le r \\le n$).',
    },
    {
      t: 'p',
      text: 'The sum of $n$ and the sum of $q$ over all test cases do not exceed $2 \\cdot 10^5$.',
    },
  ],
  outputFormat: [
    {
      t: 'p',
      text: 'For each test case, output $q$ lines. The $j$-th line should contain the sum of the subarray from index $l_j$ to $r_j$.',
    },
  ],
  constraints: [
    {
      t: 'list',
      items: [
        '$1 \\le t \\le 100$',
        '$1 \\le n, q \\le 2 \\cdot 10^5$',
        '$-10^9 \\le a_i \\le 10^9$',
        '$1 \\le l \\le r \\le n$',
        '$\\sum n \\le 2 \\cdot 10^5, \\sum q \\le 2 \\cdot 10^5$',
      ],
    },
  ],
  samples: [
    {
      input: '1\n5 3\n1 2 3 4 5\n1 3\n2 4\n1 5\n',
      output: '6\n9\n15\n',
      explain: [
        {
          t: 'p',
          text: 'Query 1: 1 + 2 + 3 = 6. Query 2: 2 + 3 + 4 = 9. Query 3: 1 + 2 + 3 + 4 + 5 = 15.',
        },
      ],
    },
  ],
  groups: [
    { label: 'samples', fingerprint: 'fails sample test cases' },
    { label: 'small', fingerprint: 'edge case: minimal n = 1' },
    { label: 'negative', fingerprint: 'negative values' },
    { label: 'overflow', fingerprint: '32-bit integer overflow beyond 2^31' },
    { label: 'performance', fingerprint: 'time limit: queries need O(1) prefix sums instead of O(n) scan' },
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
      text: 'Computing each query with a linear loop takes $O(n)$ time per query, resulting in $O(n \\cdot q)$ total time, which exceeds the time limit.',
    },
    {
      t: 'p',
      text: 'Precompute prefix sums $P[i] = \\sum_{k=1}^i a_k$ with $P[0] = 0$. Each query sum from $l$ to $r$ is $P[r] - P[l-1]$ in $O(1)$ time.',
    },
    {
      t: 'p',
      text: 'Prefix sums can exceed $2^{31} - 1$, so use 64-bit integers (`long long` in C++, `int` in Python).',
    },
  ],
  wrong: [
    { file: 'wrong_overflow.cpp', failsGroup: 3 },
    { file: 'wrong_slow.py', failsGroup: 4 },
  ],
}
