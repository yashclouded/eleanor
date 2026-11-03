import type { CodeProblem } from './types.ts'

export const problem: CodeProblem = {
  "id": "code.binary-search.contiguous-trucks",
  "slug": "code.binary-search.contiguous-trucks",
  "version": 1,
  "concept": "code.binary-search",
  "family": "binary-search-core",
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
      "text": "Positive parcel weights must stay in their given order. Split them into at most k nonempty contiguous truck loads."
    },
    {
      "t": "p",
      "text": "Output the smallest truck capacity that can carry every load."
    }
  ],
  "inputFormat": [
    {
      "t": "p",
      "text": "The first integer is t (1 to 100). Each case contains n and k, then exactly n integers a[0] through a[n-1]. 1 <= k <= n; 1 <= a[i] <= 1000000."
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
      "text": "1 <= n <= 30000; sum of n over all cases <= 30000. 1 <= k <= n; 1 <= a[i] <= 1000000. Use 64-bit arithmetic for totals and answers."
    }
  ],
  "samples": [
    {
      "input": "1\n8 5\n6 4 2 8 12 4 10 8\n",
      "output": "14\n",
      "explain": [
        {
          "t": "p",
          "text": "Applying the stated rule to this case gives 14. See the editorial for the method."
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
      "text": "For a capacity, greedily fill each load until the next parcel would exceed it; this minimises the number of loads. Binary search capacity between max(a) and sum(a). O(n log sum(a)) time."
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
    "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <numeric>\n#include <map>\n#include <set>\n#include <queue>\n#include <array>\n#include <functional>\n#include <climits>\n#include <utility>\nusing namespace std;\nusing ll=long long;\nll solve(vector<ll> a,ll k){\nll l=*max_element(a.begin(),a.end()),r=accumulate(a.begin(),a.end(),0LL);while(l<r){ll m=(l+r)/2,g=1,s=0;for(ll x:a){if(s+x>m){g++;s=0;}s+=x;}if(g<=k)r=m;else l=m+1;}return l;\n}\nint main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\\n';}}\n",
    "python": "import sys, math, itertools, bisect, collections, functools\n\ndef solve(a,k):\n    lo=max(a); hi=sum(a)\n    while lo<hi:\n     m=(lo+hi)//2; groups=1; s=0\n     for x in a:\n      if s+x>m: groups+=1; s=0\n      s+=x\n     if groups<=k: hi=m\n     else: lo=m+1\n    return lo\n\ndef main():\n    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]\n    for _ in range(data[0]):\n        n,k=data[at:at+2]; at+=2\n        a=data[at:at+n]; at+=n\n        out.append(str(solve(a,k)))\n    sys.stdout.write('\\n'.join(out)+'\\n')\nif __name__=='__main__': main()\n"
  }
}
