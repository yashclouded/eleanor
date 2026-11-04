import type { CodeProblem } from './types.ts'

export const problem: CodeProblem = {
  "id": "code.graphs.two-shift-network",
  "slug": "code.graphs.two-shift-network",
  "version": 1,
  "concept": "code.graphs",
  "family": "graphs-core",
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
      "text": "A workshop must give every station one of two shifts. Every undirected link requires its endpoints on opposite shifts. Consecutive array pairs encode links among k stations."
    },
    {
      "t": "p",
      "text": "Output 1 if a valid assignment exists, otherwise 0. Duplicate links and self-links are allowed."
    }
  ],
  "inputFormat": [
    {
      "t": "p",
      "text": "The first integer is t (1 to 100). Each case contains n and k, then exactly n integers a[0] through a[n-1]. 1 <= k <= 10000; n even; 0 <= a[i] < k."
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
      "text": "1 <= n <= 30000; sum of n over all cases <= 30000. 1 <= k <= 10000; n even; 0 <= a[i] < k. Use 64-bit arithmetic for totals and answers."
    }
  ],
  "samples": [
    {
      "input": "1\n8 5\n4 2 4 1 4 0 2 0\n",
      "output": "0\n",
      "explain": [
        {
          "t": "p",
          "text": "Applying the stated rule to this case gives 0. See the editorial for the method."
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
      "text": "Colour each connected component with BFS. A link joining equal colours is a contradiction, including a self-loop. O(k+n) time and space."
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
    "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <numeric>\n#include <map>\n#include <set>\n#include <queue>\n#include <array>\n#include <functional>\n#include <climits>\n#include <utility>\nusing namespace std;\nusing ll=long long;\nll solve(vector<ll> a,ll k){\nvector<vector<ll>>g(k);for(ll i=0;i<(ll)a.size();i+=2){g[a[i]].push_back(a[i+1]);g[a[i+1]].push_back(a[i]);}vector<ll>c(k,-1);for(ll r=0;r<k;r++){if(c[r]>=0)continue;queue<ll>q;q.push(r);c[r]=0;while(!q.empty()){ll u=q.front();q.pop();for(ll v:g[u]){if(c[v]==c[u])return 0;if(c[v]<0){c[v]=1-c[u];q.push(v);}}}}return 1;\n}\nint main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\\n';}}\n",
    "python": "import sys, math, itertools, bisect, collections, functools\n\ndef solve(a,k):\n    g=[[] for _ in range(k)]\n    for u,v in zip(a[::2],a[1::2]): g[u].append(v); g[v].append(u)\n    color=[-1]*k\n    for root in range(k):\n     if color[root]>=0: continue\n     color[root]=0; q=collections.deque([root])\n     while q:\n      u=q.popleft()\n      for v in g[u]:\n       if color[v]==color[u]: return 0\n       if color[v]<0: color[v]=1-color[u]; q.append(v)\n    return 1\n\ndef main():\n    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]\n    for _ in range(data[0]):\n        n,k=data[at:at+2]; at+=2\n        a=data[at:at+n]; at+=n\n        out.append(str(solve(a,k)))\n    sys.stdout.write('\\n'.join(out)+'\\n')\nif __name__=='__main__': main()\n"
  }
}
