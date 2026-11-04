import type { CodeProblem } from './types.ts'

export const problem: CodeProblem = {
  "id": "code.prefix.cyclic-window-count",
  "slug": "code.prefix.cyclic-window-count",
  "version": 1,
  "concept": "code.prefix",
  "family": "prefix-counts",
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
      "text": "A cyclic counter has k states. A contiguous signed-reading window returns the counter to its starting state if its sum is divisible by k."
    },
    {
      "t": "p",
      "text": "Output the number of nonempty windows whose sum is divisible by k."
    }
  ],
  "inputFormat": [
    {
      "t": "p",
      "text": "The first integer is t (1 to 100). Each case contains n and k, then exactly n integers a[0] through a[n-1]. 1 <= k <= 100; -100 <= a[i] <= 100."
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
      "text": "1 <= n <= 30000; sum of n over all cases <= 30000. 1 <= k <= 100; -100 <= a[i] <= 100. Use 64-bit arithmetic for totals and answers."
    }
  ],
  "samples": [
    {
      "input": "1\n7 2\n5 -1 -2 0 -3 2 3\n",
      "output": "13\n",
      "explain": [
        {
          "t": "p",
          "text": "Applying the stated rule to this case gives 13. See the editorial for the method."
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
      "text": "Equal normalised prefix remainders identify divisible windows. Include the empty prefix and normalise negative remainders in C++. O(n) expected time and O(k) states."
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
    "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <numeric>\n#include <map>\n#include <set>\n#include <queue>\n#include <array>\n#include <functional>\n#include <climits>\n#include <utility>\nusing namespace std;\nusing ll=long long;\nll solve(vector<ll> a,ll k){\nmap<ll,ll>seen;seen[0]=1;ll s=0,ans=0;for(ll x:a){s=((s+x)%k+k)%k;ans+=seen[s];seen[s]++;}return ans;\n}\nint main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\\n';}}\n",
    "python": "import sys, math, itertools, bisect, collections, functools\n\ndef solve(a,k):\n    seen={0:1}; s=ans=0\n    for x in a:\n     s=(s+x)%k; ans+=seen.get(s,0); seen[s]=seen.get(s,0)+1\n    return ans\n\ndef main():\n    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]\n    for _ in range(data[0]):\n        n,k=data[at:at+2]; at+=2\n        a=data[at:at+n]; at+=n\n        out.append(str(solve(a,k)))\n    sys.stdout.write('\\n'.join(out)+'\\n')\nif __name__=='__main__': main()\n"
  }
}
