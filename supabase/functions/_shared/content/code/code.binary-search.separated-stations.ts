import type { CodeProblem } from './types.ts'

export const problem: CodeProblem = {
  "id": "code.binary-search.separated-stations",
  "slug": "code.binary-search.separated-stations",
  "version": 1,
  "concept": "code.binary-search",
  "family": "binary-search-core",
  "status": "draft",
  "review": {
    "author": "GPT-6",
    "reviewer": null,
    "reviewedAt": null
  },
  "initialRating": 1600,
  "statement": [
    {
      "t": "p",
      "text": "Candidate station coordinates are distinct and sorted. Install exactly k stations."
    },
    {
      "t": "p",
      "text": "Output the largest possible minimum distance between any two installed stations."
    }
  ],
  "inputFormat": [
    {
      "t": "p",
      "text": "The first integer is t (1 to 100). Each case contains n and k, then exactly n integers a[0] through a[n-1]. 2 <= k <= n; 0 <= a[i] <= 1000000; a is strictly increasing."
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
      "text": "1 <= n <= 30000; sum of n over all cases <= 30000. 2 <= k <= n; 0 <= a[i] <= 1000000; a is strictly increasing. Use 64-bit arithmetic for totals and answers."
    }
  ],
  "samples": [
    {
      "input": "1\n7 6\n1 3 7 8 11 14 16\n",
      "output": "2\n",
      "explain": [
        {
          "t": "p",
          "text": "Applying the stated rule to this case gives 2. See the editorial for the method."
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
      "text": "For a proposed spacing, greedily place each station at the earliest permitted coordinate. Feasibility is monotone. Binary search the greatest feasible spacing. O(n log coordinate span) time."
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
    "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <numeric>\n#include <map>\n#include <set>\n#include <queue>\n#include <array>\n#include <functional>\n#include <climits>\n#include <utility>\nusing namespace std;\nusing ll=long long;\nll solve(vector<ll> a,ll k){\nll l=0,r=a.back()-a.front()+1;while(l+1<r){ll m=(l+r)/2,c=1,last=a[0];for(ll x:a)if(x-last>=m){c++;last=x;}if(c>=k)l=m;else r=m;}return l;\n}\nint main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\\n';}}\n",
    "python": "import sys, math, itertools, bisect, collections, functools\n\ndef solve(a,k):\n    lo=0; hi=a[-1]-a[0]+1\n    while lo+1<hi:\n     m=(lo+hi)//2; count=1; last=a[0]\n     for x in a[1:]:\n      if x-last>=m: count+=1; last=x\n     if count>=k: lo=m\n     else: hi=m\n    return lo\n\ndef main():\n    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]\n    for _ in range(data[0]):\n        n,k=data[at:at+2]; at+=2\n        a=data[at:at+n]; at+=n\n        out.append(str(solve(a,k)))\n    sys.stdout.write('\\n'.join(out)+'\\n')\nif __name__=='__main__': main()\n"
  }
}
