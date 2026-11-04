import type { CodeProblem } from './types.ts'

export const problem: CodeProblem = {
  "id": "code.math.coprime-segments",
  "slug": "code.math.coprime-segments",
  "version": 1,
  "concept": "code.math",
  "family": "math-core",
  "status": "draft",
  "review": {
    "author": "GPT-6",
    "reviewer": null,
    "reviewedAt": null
  },
  "initialRating": 2000,
  "statement": [
    {
      "t": "p",
      "text": "A calibration tape is valid on a contiguous segment when the GCD of all readings on that segment is 1."
    },
    {
      "t": "p",
      "text": "Output the number of nonempty valid segments. k is 0."
    }
  ],
  "inputFormat": [
    {
      "t": "p",
      "text": "The first integer is t (1 to 100). Each case contains n and k, then exactly n integers a[0] through a[n-1]. k=0; 1 <= a[i] <= 1000000."
    }
  ],
  "outputFormat": [
    {
      "t": "p",
      "text": "Print one integer per test case, on its own line."
    }
  ],
  "constraints": [
    {
      "t": "p",
      "text": "1 <= n <= 30000; sum of n over all cases <= 30000. k=0; 1 <= a[i] <= 1000000. Use 64-bit arithmetic for totals and answers."
    }
  ],
  "samples": [
    {
      "input": "1\n4 0\n5 12 6 8\n",
      "output": "3\n",
      "explain": [
        {
          "t": "p",
          "text": "Applying the stated rule to this case gives 3. See the editorial for the method."
        }
      ]
    }
  ],
  "groups": [
    {
      "label": "small",
      "fingerprint": "small exhaustive cases: boundary assumptions and incorrect shortcut methods"
    },
    {
      "label": "minimal",
      "fingerprint": "short random cases, repeated values and disconnected or empty-result cases"
    },
    {
      "label": "performance",
      "fingerprint": "maximum total input length and large accumulated answers"
    }
  ],
  "limits": {
    "cpuSeconds": 4,
    "memoryKb": 256000
  },
  "checker": {
    "kind": "tokens"
  },
  "editorial": [
    {
      "t": "p",
      "text": "Maintain counts of distinct GCDs for segments ending at the current index. Appending x maps each old GCD to gcd(g,x). Coalesce equal values and add the count at 1. O(n log\u00b2 M) conservative time bound, O(log M) states."
    }
  ],
  "wrong": [
    {
      "file": "wrong_boundary.py",
      "failsGroup": 0
    },
    {
      "file": "wrong_method.py",
      "failsGroup": 0
    }
  ],
  "referenceSolutions": {
    "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <numeric>\n#include <map>\n#include <set>\n#include <queue>\n#include <array>\n#include <functional>\n#include <climits>\n#include <utility>\nusing namespace std;\nusing ll=long long;\nll solve(vector<ll> a,ll k){\nmap<ll,ll>last;ll ans=0;for(ll x:a){map<ll,ll>cur;cur[x]++;for(auto [g,c]:last)cur[gcd(g,x)]+=c;ans+=cur[1];last=move(cur);}return ans;\n}\nint main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\\n';}}\n",
    "python": "import sys, math, itertools, bisect, collections, functools\n\ndef solve(a,k):\n    last={}; ans=0\n    for x in a:\n     cur={x:1}\n     for g,c in last.items():\n      h=math.gcd(g,x); cur[h]=cur.get(h,0)+c\n     ans+=cur.get(1,0); last=cur\n    return ans\n\ndef main():\n    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]\n    for _ in range(data[0]):\n        n,k=data[at:at+2]; at+=2\n        a=data[at:at+n]; at+=n\n        out.append(str(solve(a,k)))\n    sys.stdout.write('\\n'.join(out)+'\\n')\nif __name__=='__main__': main()\n"
  }
}
