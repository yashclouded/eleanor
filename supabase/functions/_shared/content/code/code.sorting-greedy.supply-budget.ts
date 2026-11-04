import type { CodeProblem } from './types.ts'

export const problem: CodeProblem = {
  "id": "code.sorting-greedy.supply-budget",
  "slug": "code.sorting-greedy.supply-budget",
  "version": 1,
  "concept": "code.sorting-greedy",
  "family": "sorting-greedy-core",
  "status": "draft",
  "review": {
    "author": "GPT-6",
    "reviewer": null,
    "reviewedAt": null
  },
  "initialRating": 1300,
  "statement": [
    {
      "t": "p",
      "text": "A repair team has k credits and can buy each listed supply at most once. All supplies are equally useful."
    },
    {
      "t": "p",
      "text": "Output the maximum number of supplies it can buy without exceeding k credits."
    }
  ],
  "inputFormat": [
    {
      "t": "p",
      "text": "The first integer is t (1 to 100). Each case contains n and k, then exactly n integers a[0] through a[n-1]. 0 <= k <= 1000000000; 1 <= a[i] <= 1000000."
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
      "text": "1 <= n <= 30000; sum of n over all cases <= 30000. 0 <= k <= 1000000000; 1 <= a[i] <= 1000000. Use 64-bit arithmetic for totals and answers."
    }
  ],
  "samples": [
    {
      "input": "1\n6 18\n10 8 8 11 6 3\n",
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
      "text": "For any count, the cheapest items minimise total cost. Sort and buy until the next item would exceed the budget. O(n log n) time."
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
    "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <numeric>\n#include <map>\n#include <set>\n#include <queue>\n#include <array>\n#include <functional>\n#include <climits>\n#include <utility>\nusing namespace std;\nusing ll=long long;\nll solve(vector<ll> a,ll k){\nsort(a.begin(),a.end());ll s=0,ans=0;for(ll x:a){if(s+x>k)break;s+=x;ans++;}return ans;\n}\nint main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\\n';}}\n",
    "python": "import sys, math, itertools, bisect, collections, functools\n\ndef solve(a,k):\n    spent=ans=0\n    for x in sorted(a):\n     if spent+x>k: break\n     spent+=x; ans+=1\n    return ans\n\ndef main():\n    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]\n    for _ in range(data[0]):\n        n,k=data[at:at+2]; at+=2\n        a=data[at:at+n]; at+=n\n        out.append(str(solve(a,k)))\n    sys.stdout.write('\\n'.join(out)+'\\n')\nif __name__=='__main__': main()\n"
  }
}
