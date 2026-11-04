import type { CodeProblem } from './types.ts'

export const problem: CodeProblem = {
  "id": "code.dp.rising-readings",
  "slug": "code.dp.rising-readings",
  "version": 1,
  "concept": "code.dp",
  "family": "dp-core",
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
      "text": "A sensor record may be simplified by deleting readings while preserving the order of those kept."
    },
    {
      "t": "p",
      "text": "Output the longest strictly increasing subsequence length. Equal readings cannot both extend the subsequence. k is 0."
    }
  ],
  "inputFormat": [
    {
      "t": "p",
      "text": "The first integer is t (1 to 100). Each case contains n and k, then exactly n integers a[0] through a[n-1]. k=0; -1000000 <= a[i] <= 1000000."
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
      "text": "1 <= n <= 30000; sum of n over all cases <= 30000. k=0; -1000000 <= a[i] <= 1000000. Use 64-bit arithmetic for totals and answers."
    }
  ],
  "samples": [
    {
      "input": "1\n7 0\n5 -2 2 3 0 0 3\n",
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
      "text": "Maintain the smallest possible final value for every subsequence length. Replace the first tail >= x using lower_bound so equal values do not increase the length. O(n log n) time, O(n) space."
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
    "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <numeric>\n#include <map>\n#include <set>\n#include <queue>\n#include <array>\n#include <functional>\n#include <climits>\n#include <utility>\nusing namespace std;\nusing ll=long long;\nll solve(vector<ll> a,ll k){\nvector<ll>t;for(ll x:a){auto it=lower_bound(t.begin(),t.end(),x);if(it==t.end())t.push_back(x);else *it=x;}return t.size();\n}\nint main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\\n';}}\n",
    "python": "import sys, math, itertools, bisect, collections, functools\n\ndef solve(a,k):\n    tails=[]\n    for x in a:\n     i=bisect.bisect_left(tails,x)\n     if i==len(tails): tails.append(x)\n     else: tails[i]=x\n    return len(tails)\n\ndef main():\n    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]\n    for _ in range(data[0]):\n        n,k=data[at:at+2]; at+=2\n        a=data[at:at+n]; at+=n\n        out.append(str(solve(a,k)))\n    sys.stdout.write('\\n'.join(out)+'\\n')\nif __name__=='__main__': main()\n"
  }
}
