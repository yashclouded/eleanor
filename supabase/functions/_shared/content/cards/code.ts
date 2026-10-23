import type { ConceptCard } from '../types.ts'

export const CODE_CARDS: ConceptCard[] = [
  {
    conceptId: 'code.implementation',
    version: 1,
    status: 'draft',
    review: {
      author: 'Eleanor Team',
      reviewer: null,
      reviewedAt: null,
    },
    body: [
      {
        t: 'p',
        text: 'Basic implementation focuses on translating complex problem specifications faithfully into robust algorithmic control flow without logic bugs or unexpected side effects. Writing clean programmatic logic requires carefully managing loop invariants, zero-indexed boundary conditions, conditional branching states, and data type ranges. Rather than introducing premature optimization or speculative design patterns, effective implementations emphasize state machine clarity, modular decomposition, and strict defensive handling of edge cases such as empty collections and boundary bounds.',
      },
      {
        t: 'p',
        text: 'Worked Example: Consider a simulation where an automated rover starts at coordinate position (0, 0) facing North. It receives a string of commands: "L" (turn left 90 degrees), "R" (turn right 90 degrees), or "M" (move forward 1 unit in the current facing direction). Directions cycle through North (0, +1), East (+1, 0), South (0, -1), West (-1, 0). If the command stream is "MRMMMLM", the rover moves North to (0, 1), turns East, moves 3 units to (3, 1), turns North, and moves 1 unit to (3, 2). The final Manhattan distance from origin is |3 - 0| + |2 - 0| = 5 units.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Committing off-by-one boundary indexing errors when iterating through zero-indexed arrays.',
          'Common Traps: Mutating input data structures unexpectedly during traversal, corrupting subsequent condition checks.',
          'Common Traps: Failing to handle minimal boundary inputs, such as arrays with zero or one element.',
        ],
      },
    ],
  },
  {
    conceptId: 'code.math',
    version: 1,
    status: 'draft',
    review: {
      author: 'Eleanor Team',
      reviewer: null,
      reviewedAt: null,
    },
    body: [
      {
        t: 'p',
        text: 'Algorithmic math bridges theoretical number theory and computational efficiency, transforming mathematical properties into fast algorithms running within strict CPU and memory limits. Key techniques include computing greatest common divisors using the Euclidean algorithm in O(log(min(a, b))) time, modular exponentiation using repeated squaring in logarithmic steps, and generating prime numbers using the Sieve of Eratosthenes in O(n log log n) time. Writing reliable numerical software also demands preventing 32-bit integer arithmetic overflow when accumulating products.',
      },
      {
        t: 'p',
        text: 'Worked Example: Compute (3^13) mod 1,000 using binary modular exponentiation. Express the exponent 13 as a sum of powers of two: 13 = 8 + 4 + 1. Sequentially square the base modulo 1,000: 3^1 = 3; 3^2 = 9; 3^4 = 81; 3^8 = (81)^2 = 6,561 ≡ 561 mod 1,000. Now multiply the powers corresponding to set binary bits: (3^1 × 3^4 × 3^8) mod 1,000 = (3 × 81 × 561) mod 1,000 = (243 × 561) mod 1,000 = 136,323 mod 1,000 = 323. The entire computation finishes in just 4 multiplication steps instead of 13.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Triggering integer overflow by multiplying large 32-bit integers before taking the modular reduction.',
          'Common Traps: Implementing modular division by naively using integer division instead of computing the modular multiplicative inverse.',
          'Common Traps: Using floating-point representation for large integer calculations, which loses precision in the lower digits.',
        ],
      },
    ],
  },
  {
    conceptId: 'code.sorting-greedy',
    version: 1,
    status: 'draft',
    review: {
      author: 'Eleanor Team',
      reviewer: null,
      reviewedAt: null,
    },
    body: [
      {
        t: 'p',
        text: 'Sorting and greedy heuristics construct globally optimal solutions by making a sequence of locally optimal choices without backtracking. Sorting the input array in O(n log n) time is often the key prerequisite that reveals the optimal greedy sequence. A greedy strategy is provably correct if and only if the problem exhibits two properties: optimal substructure (an optimal solution contains optimal sub-solutions) and the greedy-choice property (a local greedy choice can be extended to an optimal global solution, demonstrated through an exchange argument).',
      },
      {
        t: 'p',
        text: 'Worked Example: Given 5 meeting requests with [start, end] intervals: [1, 4], [3, 5], [0, 6], [5, 7], [3, 8], schedule the maximum number of mutually non-overlapping meetings in a single conference room. The provably optimal greedy choice is to sort all intervals by their finish times: [1, 4], [3, 5], [0, 6], [5, 7], [3, 8]. Pick the first meeting finishing at time 4. The next compatible meeting that starts at or after 4 is [5, 7]. The meeting [3, 8] finishes later. The maximum number of non-overlapping meetings scheduled is exactly 2 ([1, 4] and [5, 7]).',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Assuming a greedy heuristic is optimal without validating an exchange argument, leading to suboptimal solutions.',
          'Common Traps: Sorting by the wrong attribute (e.g. interval start time or shortest duration instead of earliest finish time).',
          'Common Traps: Overlooking tie-breaking rules during sorting that affect edge-case interval selection.',
        ],
      },
    ],
  },
  {
    conceptId: 'code.prefix',
    version: 1,
    status: 'draft',
    review: {
      author: 'Eleanor Team',
      reviewer: null,
      reviewedAt: null,
    },
    body: [
      {
        t: 'p',
        text: 'Prefix aggregation precalculates cumulative statistics across a sequence in O(n) time, allowing subsequent contiguous range queries to be answered in O(1) constant time. In a prefix sum array, each entry pref[i] stores the sum of all elements from index 0 through i - 1, with pref[0] = 0. The sum of any contiguous subarray from index L to R inclusive is obtained via the subtraction: pref[R + 1] - pref[L]. The concept extends beyond addition to bitwise XOR prefixes, two-dimensional matrix rectangles, and prefix frequencies stored in hash maps.',
      },
      {
        t: 'p',
        text: 'Worked Example: Given an array of integers [4, -2, 7, 3, -1], build the 1-indexed prefix sum array: pref[0] = 0, pref[1] = 4, pref[2] = 2, pref[3] = 9, pref[4] = 12, pref[5] = 11. To find the sum of the subarray spanning index 1 to index 3 inclusive (elements [-2, 7, 3]): calculate pref[4] - pref[1] = 12 - 4 = 8. Verifying directly: (-2) + 7 + 3 = 8. Instead of iterating through elements for every query, the lookup takes a single subtraction.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Off-by-one errors when querying range [L, R] by using pref[R] - pref[L] instead of pref[R + 1] - pref[L].',
          'Common Traps: Omitting the base prefix value pref[0] = 0, requiring clumsy branching when L = 0.',
          'Common Traps: Using prefix sums with non-invertible operations (such as range minimum or maximum queries) where subtraction does not apply.',
        ],
      },
    ],
  },
  {
    conceptId: 'code.two-pointers',
    version: 1,
    status: 'draft',
    review: {
      author: 'Eleanor Team',
      reviewer: null,
      reviewedAt: null,
    },
    body: [
      {
        t: 'p',
        text: 'The two-pointers and sliding window techniques optimize interval searches across linear collections from O(n²) brute-force inspections down to linear O(n) time. Opposing pointers begin at the outer boundaries and converge inward based on monotonicity conditions, commonly applied to sorted pair sums. In sliding windows, a left pointer and right pointer both advance monotonically to maintain a valid window invariant: the right pointer expands the window until a condition is violated, then the left pointer contracts it until validity is restored.',
      },
      {
        t: 'p',
        text: 'Worked Example: Find the length of the shortest contiguous subarray in positive array [2, 3, 1, 2, 4, 3] whose sum is at least 7. Maintain a sliding window [L, R] and current sum. Expand R = 0 (sum 2), R = 1 (sum 5), R = 2 (sum 6), R = 3 (sum 8 >= 7). Current length is 4. Contract L = 0 to 1 (sum 6 < 7). Expand R = 4 (sum 10 >= 7). Contract L = 1 to 2 (sum 7 >= 7, length 3). Contract L = 2 to 3 (sum 6 < 7). Expand R = 5 (sum 9 >= 7). Contract L = 3 to 4 (sum 7 >= 7, length 2: elements [4, 3]). The minimum length found is 2.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Applying sliding window techniques to arrays containing negative values where prefix sums are non-monotonic.',
          'Common Traps: Incorrectly updating window state metrics when contracting the left boundary pointer.',
          'Common Traps: Accidental infinite loops caused by failing to advance pointers under boundary equality conditions.',
        ],
      },
    ],
  },
  {
    conceptId: 'code.binary-search',
    version: 1,
    status: 'draft',
    review: {
      author: 'Eleanor Team',
      reviewer: null,
      reviewedAt: null,
    },
    body: [
      {
        t: 'p',
        text: 'Binary search finds the boundary of a target condition over a sorted collection or monotonic answer space in O(log n) time by repeatedly halving the search interval. Beyond finding discrete values in sorted arrays, binary search on the answer determines optimal values for optimization problems: if a predicate check(x) is monotonic (evaluating to true for all values up to a threshold and false thereafter), binary search pinpoints the exact transition boundary. Maintaining consistent loop invariants over inclusive or exclusive intervals prevents edge-case infinite loops.',
      },
      {
        t: 'p',
        text: 'Worked Example: A bakery has 3 packaging machines that can package a batch of cookies in 3, 5, and 8 minutes respectively. What is the minimum time needed to package at least 30 batches? The answer space is monotonic: if time T is sufficient, any time > T is also sufficient. Binary search over time interval [1, 240]: at T = 60 minutes, machine 1 produces 60/3 = 20, machine 2 produces 60/5 = 12, machine 3 produces 60/8 = 7, total = 39 batches (>= 30, search lower half). At T = 45, output is 15 + 9 + 5 = 29 (< 30, search upper half). At T = 46, output is 15 + 9 + 5 = 29. At T = 48, output is 16 + 9 + 6 = 31 >= 30. Checking bounds yields minimum time T = 47 (15 + 9 + 5 = 29 batches, so minimum is 48 minutes).',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Integer overflow when computing midpoint as (low + high) / 2 instead of low + (high - low) / 2.',
          'Common Traps: Infinite loops caused by improper interval contraction (e.g. low = mid instead of low = mid + 1).',
          'Common Traps: Applying binary search to a search space that is not strictly monotonic with respect to the predicate.',
        ],
      },
    ],
  },
  {
    conceptId: 'code.graphs',
    version: 1,
    status: 'draft',
    review: {
      author: 'Eleanor Team',
      reviewer: null,
      reviewedAt: null,
    },
    body: [
      {
        t: 'p',
        text: 'Graph traversal explores discrete networks of vertices interconnected by edges. Breadth-First Search (BFS) uses a First-In-First-Out (FIFO) queue to visit vertices layer by layer in order of increasing distance, guaranteeing the shortest path in unweighted graphs in O(V + E) time. Depth-First Search (DFS) uses recursion or an explicit stack to explore paths deeply before backtracking, making it ideal for topological sorting, cycle detection, and identifying connected components. Tracking a visited set is essential to prevent infinite cycles.',
      },
      {
        t: 'p',
        text: 'Worked Example: In a computer network with connections A-B, A-C, B-D, C-D, D-E, find the shortest path from vertex A to vertex E using BFS. Initialize queue with [A] and distance d(A) = 0. Dequeue A: visit unvisited neighbors B and C, queue becomes [B, C] with d(B) = 1, d(C) = 1. Dequeue B: neighbor D is unvisited, queue becomes [C, D] with d(D) = 2. Dequeue C: neighbor D is already visited. Dequeue D: neighbor E is unvisited, so d(E) = 3 and queue becomes [E]. Dequeue E: destination reached with minimum distance of 3 hops.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Forgetting to mark a vertex as visited immediately upon enqueuing it in BFS, resulting in exponential duplicate visits.',
          'Common Traps: Using DFS instead of BFS when attempting to find the shortest path in an unweighted graph.',
          'Common Traps: Exceeding recursion stack depth limits during deep DFS traversals on large graphs.',
        ],
      },
    ],
  },
  {
    conceptId: 'code.strings',
    version: 1,
    status: 'draft',
    review: {
      author: 'Eleanor Team',
      reviewer: null,
      reviewedAt: null,
    },
    body: [
      {
        t: 'p',
        text: 'String algorithms process linear sequences of characters, handling pattern matching, frequency distribution, palindromes, and text transformation. Fundamental techniques include frequency counting with character arrays, rolling polynomial hashing for substring comparison, and building prefix function tables (KMP algorithm) to find pattern matches in O(n + m) time without backtracking. In languages with immutable strings, string concatenation inside loops creates quadratic O(n²) overhead; using array buffers or string builders maintains linear performance.',
      },
      {
        t: 'p',
        text: 'Worked Example: Determine if string s = "racecar" is a valid palindrome by ignoring non-alphanumeric characters and case. Use two converging pointers: left = 0 and right = 6. At left 0 and right 6: s[0] == s[6] (\'r\' == \'r\'), advance left to 1 and right to 5. At left 1 and right 5: s[1] == s[5] (\'a\' == \'a\'), advance to 2 and 4. At left 2 and right 4: s[2] == s[4] (\'c\' == \'c\'), advance to 3 and 3. The pointers meet at the center character \'e\'. Because every character comparison matched, "racecar" is confirmed as a palindrome in O(n) time and O(1) auxiliary memory.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Creating quadratic O(n²) time complexity by repeatedly concatenating strings inside a loop.',
          'Common Traps: Mishandling non-ASCII Unicode characters or multi-byte glyphs by assuming each character occupies one byte.',
          'Common Traps: Forgetting to convert characters to a uniform case (lowercase) before checking anagrams or palindromes.',
        ],
      },
    ],
  },
  {
    conceptId: 'code.dp',
    version: 1,
    status: 'draft',
    review: {
      author: 'Eleanor Team',
      reviewer: null,
      reviewedAt: null,
    },
    body: [
      {
        t: 'p',
        text: 'Dynamic programming solves complex optimization problems by decomposing them into overlapping subproblems and memoizing their intermediate solutions to avoid exponential recalculation. A problem is amenable to dynamic programming if it exhibits optimal substructure (the optimal solution to the problem contains optimal solutions to its subproblems) and overlapping subproblems (the same subproblems are solved repeatedly). Solutions can be implemented top-down with recursion and memoization or bottom-up by iteratively filling a tabular state array in topological dependency order.',
      },
      {
        t: 'p',
        text: 'Worked Example: Find the maximum loot from robbing houses along a street with values [6, 2, 7, 9, 3, 1], where adjacent houses cannot be robbed on the same night. Define dp[i] as the maximum loot possible from the first i houses. Base cases: dp[0] = 0, dp[1] = 6. For each subsequent house i: either skip house i (taking dp[i - 1]) or rob house i (taking house[i - 1] + dp[i - 2]): dp[2] = max(6, 2 + 0) = 6; dp[3] = max(6, 7 + 6) = 13; dp[4] = max(13, 9 + 6) = 15; dp[5] = max(15, 3 + 13) = 16; dp[6] = max(16, 1 + 15) = 16. The maximum loot is 16.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Defining state transitions that contain circular dependencies or violating the subproblem dependency order.',
          'Common Traps: Failing to establish correct base cases, causing incorrect values to propagate throughout the entire DP table.',
          'Common Traps: Allocating an excessive multi-dimensional DP table when only the preceding one or two state rows are needed.',
        ],
      },
    ],
  },
]
