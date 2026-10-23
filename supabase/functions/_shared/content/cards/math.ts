import type { ConceptCard } from '../types.ts'

export const MATH_CARDS: ConceptCard[] = [
  {
    conceptId: 'math.ratios',
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
        text: 'Ratios express relative quantitative magnitude between two or more values, establishing a scale factor that remains invariant under proportional expansion. A proportion equates two ratios: a / b = c / d. When scaling mixtures, unit conversions, or geometrical models, solving for unknown values requires cross-multiplication or identifying the constant of proportionality k = y / x. Distinguishing between part-to-part ratios (e.g. 3 parts sand to 2 parts gravel) and part-to-whole ratios (e.g. 3 parts sand out of 5 parts total mixture) is foundational for setting correct algebraic proportions.',
      },
      {
        t: 'p',
        text: 'Worked Example: A concrete foundation requires a dry mortar blend mixed in the ratio of 2 parts cement, 3 parts sand, and 5 parts aggregate by weight. A contractor needs to prepare 1,500 kilograms of total dry blend. What weight of sand is required? First determine total parts: 2 + 3 + 5 = 10 parts. Each single part corresponds to 1,500 / 10 = 150 kilograms. Because sand represents 3 parts of the blend, the required weight of sand is 3 × 150 = 450 kilograms.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Confusing a part-to-part ratio (e.g. 2:3) with a part-to-whole fraction (2/3 instead of 2/5).',
          'Common Traps: Adding equal constant amounts to both sides of a ratio, which changes the underlying proportionality.',
          'Common Traps: Inverting conversion factors during multi-step unit dimensional scaling.',
        ],
      },
    ],
  },
  {
    conceptId: 'math.percent-change',
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
        text: 'Percentage change measures the relative difference between an initial baseline value and a final value, computed as ((Final - Initial) / Initial) × 100%. Calculating percentage changes demands rigorous identification of the initial reference value in the denominator. Multi-step compounding percentage changes must be modeled by multiplying decimal multipliers (e.g. a 20% increase corresponds to multiplying by 1.20) rather than naively summing the percentage figures. Reversing a percentage change requires dividing by the multiplier rather than subtracting the same percentage figure.',
      },
      {
        t: 'p',
        text: 'Worked Example: An asset price rises by 25% during its first quarter and subsequently drops by 20% during its second quarter. If the starting price was $80, what is the final price and net percentage change? The first quarter price multiplier is (1 + 0.25) = 1.25, bringing the price to $80 × 1.25 = $100. The second quarter price multiplier is (1 - 0.20) = 0.80, bringing the price to $100 × 0.80 = $80. The final price is $80, representing an exact 0% net change, demonstrating that a 25% gain is offset by a 20% loss because the base shifted.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Adding percentages across compounding periods instead of multiplying their decimal scaling factors.',
          'Common Traps: Dividing the difference by the new final value rather than the original baseline value.',
          'Common Traps: Assuming an X% price increase followed by an X% price decrease restores the original starting value.',
        ],
      },
    ],
  },
  {
    conceptId: 'math.linear',
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
        text: 'Linear relationships describe processes characterized by a constant rate of change between two variables. In standard slope-intercept form, y = mx + b, where m represents the slope (rise over run: Δy / Δx) and b represents the initial condition or y-intercept when x = 0. Modeling real-world linear phenomena requires translating rate descriptions into slopes and boundary constraints into linear equations. When two linear relationships intersect, solving the simultaneous system of equations yields the unique breakeven point where both functions share identical coordinates.',
      },
      {
        t: 'p',
        text: 'Worked Example: A mobile carrier offers two data plans. Plan Alpha charges a $30 monthly base fee plus $4 per gigabyte of data consumed: C_A = 30 + 4g. Plan Beta charges a $10 monthly base fee plus $8 per gigabyte: C_B = 10 + 8g. At what data volume do both plans cost the exact same amount? Set the two cost functions equal to each other: 30 + 4g = 10 + 8g. Subtract 4g and subtract 10 from both sides: 20 = 4g, giving g = 5 gigabytes. At 5 GB, both plans cost exactly $50.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Calculating slope as Δx / Δy (run over rise) instead of Δy / Δx (rise over run).',
          'Common Traps: Omitting the constant baseline offset (y-intercept) when converting rate problems into algebraic equations.',
          'Common Traps: Misinterpreting negative rates of change as positive additions when modeling depletion or decay.',
        ],
      },
    ],
  },
  {
    conceptId: 'math.geometry',
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
        text: 'Geometric reasoning involves deducing spatial properties, angle relationships, perimeters, areas, and volumes through Euclidean theorems and coordinate constraints. Core spatial principles include the Pythagorean theorem for right triangles (a² + b² = c²), angle summation properties (angles in any triangle sum to 180°), and dimensional scaling rules: when linear dimensions scale by a factor of k, surface area scales by k² and enclosed volume scales by k³. Decomposing irregular polygons into standard right triangles and rectangles enables exact area calculations.',
      },
      {
        t: 'p',
        text: 'Worked Example: A right trapezoid garden plot has parallel bases of length 14 meters and 20 meters, with a perpendicular height of 8 meters along one side. A diagonal walking path connects the top-left vertex to the bottom-right vertex. To find the area of the trapezoid: Area = ((base1 + base2) / 2) × height = ((14 + 20) / 2) × 8 = 17 × 8 = 136 square meters. To find the length of the diagonal path spanning the 20-meter base and 8-meter height: Path = √(20² + 8²) = √(400 + 64) = √464 ≈ 21.54 meters.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Confusing perimeter (one-dimensional boundary length) with area (two-dimensional enclosed surface).',
          'Common Traps: Forgetting that scaling linear dimensions by k multiplies area by k² and volume by k³.',
          'Common Traps: Applying the Pythagorean theorem to triangles that do not contain a verified 90-degree right angle.',
        ],
      },
    ],
  },
  {
    conceptId: 'math.sequences',
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
        text: 'Sequences are ordered lists of numbers governed by deterministic mathematical rules. In an arithmetic sequence, successive terms differ by a constant common difference d: a_n = a_1 + (n - 1)d, and the sum of the first n terms equals S_n = (n / 2) · (a_1 + a_n). In a geometric sequence, successive terms change by a constant common ratio r: g_n = g_1 · r^(n - 1), with sum S_n = g_1 · (1 - r^n) / (1 - r). Analyzing patterns requires distinguishing linear additive growth from exponential multiplicative growth and deriving explicit closed-form formulas.',
      },
      {
        t: 'p',
        text: 'Worked Example: An auditorium has 18 seats in the front row. Each subsequent row contains 3 additional seats compared to the row in front of it. The auditorium contains 15 rows in total. How many total seats are in the auditorium? This is an arithmetic sequence with a_1 = 18, d = 3, and n = 15. The capacity of the 15th row is a_15 = 18 + (15 - 1) × 3 = 18 + 42 = 60 seats. The total capacity is S_15 = (15 / 2) × (a_1 + a_15) = 7.5 × (18 + 60) = 7.5 × 78 = 585 seats.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Committing an off-by-one error by using n instead of (n - 1) in the general term formula.',
          'Common Traps: Applying arithmetic summation formulas to geometric sequences with compounding multiplicative growth.',
          'Common Traps: Assuming that a pattern established over the first three terms continues without checking the underlying generating rule.',
        ],
      },
    ],
  },
  {
    conceptId: 'math.divisibility',
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
        text: 'Divisibility and number theory explore the algebraic structure of integers through prime factorization, greatest common divisors (GCD), least common multiples (LCM), and modular arithmetic congruences. The Fundamental Theorem of Arithmetic guarantees that every integer greater than 1 factors uniquely into a product of prime powers. The GCD is computed by taking the minimum power of all shared primes, while the LCM takes the maximum power across all primes, linked by the identity GCD(a, b) × LCM(a, b) = a × b. Modular arithmetic analyzes remainders under clock-arithmetic wraparounds.',
      },
      {
        t: 'p',
        text: 'Worked Example: Find the GCD and LCM of 72 and 120. First, find their prime factorizations: 72 = 2³ × 3² and 120 = 2³ × 3¹ × 5¹. The GCD takes the lowest power of common prime factors: 2³ × 3¹ = 8 × 3 = 24. The LCM takes the highest power of all occurring prime factors: 2³ × 3² × 5¹ = 8 × 9 × 5 = 360. Verify using the product identity: GCD × LCM = 24 × 360 = 8,640, and 72 × 120 = 8,640.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Confusing the greatest common divisor (which cannot exceed the inputs) with the least common multiple (which cannot be smaller).',
          'Common Traps: Performing division in modular arithmetic without verifying that the divisor and modulus are coprime.',
          'Common Traps: Overlooking prime factors when checking divisibility rules for composite numbers.',
        ],
      },
    ],
  },
  {
    conceptId: 'math.functions',
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
        text: 'A mathematical function is a deterministic relation that assigns exactly one output value in a codomain to each valid input value in its domain. Analyzing function behavior encompasses examining domain constraints (avoiding division by zero and negative inputs under even roots), function transformations (shifts f(x - c) and scalings k·f(x)), function composition (f(g(x))), and inverse functions (f⁻¹(x)), which exist if and only if the function is bijective. Tracking rate of change and asymptotic behavior illuminates how functions evolve as inputs grow arbitrarily large.',
      },
      {
        t: 'p',
        text: 'Worked Example: Consider the revenue function R(p) = p · (120 - 2p), where p is the unit price of an item in dollars. To determine the price that maximizes revenue, expand the quadratic equation: R(p) = -2p² + 120p. The graph is a downward-opening parabola with a = -2 and b = 120. The vertex of the parabola occurs at p = -b / (2a) = -120 / (2 × -2) = 30 dollars. Evaluating revenue at this optimal price yields R(30) = 30 × (120 - 60) = 30 × 60 = 1,800 dollars.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Violating domain constraints by evaluating inputs that produce division by zero or negative square roots.',
          'Common Traps: Confusing the composition order: f(g(x)) applies g first, then f, which is rarely equal to g(f(x)).',
          'Common Traps: Forgetting that horizontal transformations act inversely: f(x - 3) shifts the graph right by 3, not left.',
        ],
      },
    ],
  },
  {
    conceptId: 'math.optimization',
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
        text: 'Discrete optimization is the search for an optimal configuration that maximizes or minimizes a numerical objective function subject to a system of discrete constraints. Unlike continuous optimization where derivatives can be set to zero, discrete variables require examining feasible boundary points, integer vertices, or applying greedy bounds and dynamic decomposition. Systematic optimization requires formulating explicit decision variables, bounding the feasible region, and comparing objective evaluations at candidate boundary points to guarantee global optimality.',
      },
      {
        t: 'p',
        text: 'Worked Example: A shipping container has a maximum weight capacity of 24 kilograms. Two types of medical packages are available: Package X weighs 5 kg and delivers 14 utility points; Package Y weighs 7 kg and delivers 20 utility points. What combination of integer packages maximizes total utility points without exceeding 24 kg? Testing feasible integer combinations of (X, Y): (0, 3) weighs 21 kg, utility = 60; (2, 2) weighs 24 kg, utility = 28 + 40 = 68; (3, 1) weighs 22 kg, utility = 42 + 20 = 62; (4, 0) weighs 20 kg, utility = 56. The optimal discrete loading is 2 units of Package X and 2 units of Package Y, achieving a maximum utility score of 68.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Rounding continuous optimization solutions to the nearest integer, which often violates constraints or misses the true optimum.',
          'Common Traps: Evaluating only greedy choices (highest value-to-weight ratio) without verifying whether leftover capacity is wasted.',
          'Common Traps: Overlooking the zero-quantity boundary case when checking integer combinations.',
        ],
      },
    ],
  },
]
