import type { CodeProblem } from './types.ts'

export const problem: CodeProblem = {
  "id": "code.graphs.forward-routes",
  "slug": "code.graphs.forward-routes",
  "version": 1,
  "concept": "code.graphs",
  "family": "graphs-core",
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
      "text": "A delivery network has k depots labelled 0 through k-1. Consecutive array pairs encode directed roads u to v with u<v. Parallel roads count as different choices."
    },
    {
      "t": "p",
      "text": "Output the number of road sequences from depot 0 to depot k-1, modulo 1000000007."
    }
  ],
  "inputFormat": [
    {
      "t": "p",
      "text": "The first integer is t (1 to 100). Each case contains n and k, then exactly n integers a[0] through a[n-1]. 2 <= k <= 10000; n even; each pair satisfies 0 <= u < v < k."
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
      "text": "1 <= n <= 30000; sum of n over all cases <= 30000. 2 <= k <= 10000; n even; each pair satisfies 0 <= u < v < k. Use 64-bit arithmetic for totals and answers."
    }
  ],
  "samples": [
    {
      "input": "1\n6 5\n3 4 3 4 0 3\n",
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
      "text": "Vertex labels already give a topological order. Start with one empty route at 0 and propagate counts along each road. Parallel roads contribute separately. O(k+n) time and space."
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
    "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <numeric>\n#include <map>\n#include <set>\n#include <queue>\n#include <array>\n#include <functional>\n#include <climits>\n#include <utility>\nusing namespace std;\nusing ll=long long;\nll solve(vector<ll> a,ll k){\nvector<vector<ll>>g(k);for(ll i=0;i<(ll)a.size();i+=2)g[a[i]].push_back(a[i+1]);vector<ll>d(k);d[0]=1;for(ll u=0;u<k;u++)for(ll v:g[u])d[v]=(d[v]+d[u])%1000000007;return d.back();\n}\nint main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\\n';}}\n",
    "python": "import sys, math, itertools, bisect, collections, functools\n\ndef solve(a,k):\n    g=[[] for _ in range(k)]\n    for u,v in zip(a[::2],a[1::2]): g[u].append(v)\n    dp=[0]*k; dp[0]=1\n    for u in range(k):\n     for v in g[u]: dp[v]=(dp[v]+dp[u])%1000000007\n    return dp[-1]\n\ndef main():\n    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]\n    for _ in range(data[0]):\n        n,k=data[at:at+2]; at+=2\n        a=data[at:at+n]; at+=n\n        out.append(str(solve(a,k)))\n    sys.stdout.write('\\n'.join(out)+'\\n')\nif __name__=='__main__': main()\n"
  }
}
