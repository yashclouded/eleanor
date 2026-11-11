import type { CodeProblem } from './types.ts'

export const problem: CodeProblem = {
  "id": "code.two-pointers.complete-inspection",
  "slug": "code.two-pointers.complete-inspection",
  "version": 1,
  "concept": "code.two-pointers",
  "family": "two-pointers-core",
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
      "text": "A shelf has object labels, and an inspection must include every distinct label that appears anywhere on that shelf."
    },
    {
      "t": "p",
      "text": "Output the length of the shortest contiguous inspection window containing every label. k is 0."
    }
  ],
  "inputFormat": [
    {
      "t": "p",
      "text": "The first integer is t (1 to 100). Each case contains n and k, then exactly n integers a[0] through a[n-1]. k=0; 0 <= a[i] <= 100."
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
      "text": "1 <= n <= 30000; sum of n over all cases <= 30000. k=0; 0 <= a[i] <= 100. Use 64-bit arithmetic for totals and answers."
    }
  ],
  "samples": [
    {
      "input": "1\n8 0\n3 0 3 2 2 1 3 1\n",
      "output": "5\n",
      "explain": [
        {
          "t": "p",
          "text": "Applying the stated rule to this case gives 5. See the editorial for the method."
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
      "text": "Extend until every type is present, then shrink while complete. Each endpoint moves monotonically, so all minimal candidate windows are considered in O(n) expected time."
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
    "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <numeric>\n#include <map>\n#include <set>\n#include <queue>\n#include <array>\n#include <functional>\n#include <climits>\n#include <utility>\nusing namespace std;\nusing ll=long long;\nll solve(vector<ll> a,ll k){\nset<ll>types(a.begin(),a.end());map<ll,ll>f;ll l=0,b=a.size();for(ll r=0;r<(ll)a.size();r++){f[a[r]]++;while(f.size()==types.size()){b=min(b,r-l+1);ll y=a[l++];if(--f[y]==0)f.erase(y);}}return b;\n}\nint main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\\n';}}\n",
    "python": "import sys, math, itertools, bisect, collections, functools\n\ndef solve(a,k):\n    need=len(set(a)); freq={}; l=0; best=len(a)\n    for r,x in enumerate(a):\n     freq[x]=freq.get(x,0)+1\n     while len(freq)==need:\n      best=min(best,r-l+1); y=a[l]; freq[y]-=1; l+=1\n      if freq[y]==0: del freq[y]\n    return best\n\ndef main():\n    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]\n    for _ in range(data[0]):\n        n,k=data[at:at+2]; at+=2\n        a=data[at:at+n]; at+=n\n        out.append(str(solve(a,k)))\n    sys.stdout.write('\\n'.join(out)+'\\n')\nif __name__=='__main__': main()\n"
  }
}
