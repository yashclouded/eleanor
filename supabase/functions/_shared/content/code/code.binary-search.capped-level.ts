import type { CodeProblem } from './types.ts'

export const problem: CodeProblem = {
  "id": "code.binary-search.capped-level",
  "slug": "code.binary-search.capped-level",
  "version": 1,
  "concept": "code.binary-search",
  "family": "binary-search-core",
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
      "text": "A reservoir audit caps each nonnegative reading at a shared integer level h, giving a capped total sum(min(a[i],h))."
    },
    {
      "t": "p",
      "text": "Output the smallest nonnegative integer h whose capped total is at least k; output -1 if even the uncapped total is below k."
    }
  ],
  "inputFormat": [
    {
      "t": "p",
      "text": "The first integer is t (1 to 100). Each case contains n and k, then exactly n integers a[0] through a[n-1]. 0 <= k <= 1000000000; 0 <= a[i] <= 1000000."
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
      "text": "1 <= n <= 30000; sum of n over all cases <= 30000. 0 <= k <= 1000000000; 0 <= a[i] <= 1000000. Use 64-bit arithmetic for totals and answers."
    }
  ],
  "samples": [
    {
      "input": "1\n7 57\n10 5 12 12 2 10 11\n",
      "output": "10\n",
      "explain": [
        {
          "t": "p",
          "text": "Applying the stated rule to this case gives 10. See the editorial for the method."
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
      "text": "Handle impossible totals first, then binary search the first level whose capped sum reaches k. Saturated readings contribute less than h, so dividing k by n is not sufficient. O(n log max(a)) time."
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
    "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <numeric>\n#include <map>\n#include <set>\n#include <queue>\n#include <array>\n#include <functional>\n#include <climits>\n#include <utility>\nusing namespace std;\nusing ll=long long;\nll solve(vector<ll> a,ll k){\nif(accumulate(a.begin(),a.end(),0LL)<k)return -1;ll l=0,r=*max_element(a.begin(),a.end());while(l<r){ll m=(l+r)/2,s=0;for(ll x:a)s+=min(x,m);if(s>=k)r=m;else l=m+1;}return l;\n}\nint main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\\n';}}\n",
    "python": "import sys, math, itertools, bisect, collections, functools\n\ndef solve(a,k):\n    if sum(a)<k: return -1\n    lo=0; hi=max(a)\n    while lo<hi:\n     m=(lo+hi)//2\n     if sum(min(x,m) for x in a)>=k: hi=m\n     else: lo=m+1\n    return lo\n\ndef main():\n    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]\n    for _ in range(data[0]):\n        n,k=data[at:at+2]; at+=2\n        a=data[at:at+n]; at+=n\n        out.append(str(solve(a,k)))\n    sys.stdout.write('\\n'.join(out)+'\\n')\nif __name__=='__main__': main()\n"
  }
}
