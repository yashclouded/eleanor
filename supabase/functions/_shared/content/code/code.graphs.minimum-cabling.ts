import type { CodeProblem } from './types.ts'

export const problem: CodeProblem = {
  "id": "code.graphs.minimum-cabling",
  "slug": "code.graphs.minimum-cabling",
  "version": 1,
  "concept": "code.graphs",
  "family": "graphs-core",
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
      "text": "A network of k stations can purchase undirected cables. Consecutive triples in the array are u,v,cost. Parallel cables and self-links are permitted."
    },
    {
      "t": "p",
      "text": "Output the minimum cost of connecting all stations, or -1 if impossible."
    }
  ],
  "inputFormat": [
    {
      "t": "p",
      "text": "The first integer is t (1 to 100). Each case contains n and k, then exactly n integers a[0] through a[n-1]. 1 <= k <= 10000; n divisible by 3; 0 <= u,v < k; 1 <= cost <= 1000000."
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
      "text": "1 <= n <= 30000; sum of n over all cases <= 30000. 1 <= k <= 10000; n divisible by 3; 0 <= u,v < k; 1 <= cost <= 1000000. Use 64-bit arithmetic for totals and answers."
    }
  ],
  "samples": [
    {
      "input": "1\n6 5\n4 4 7 0 2 9\n",
      "output": "-1\n",
      "explain": [
        {
          "t": "p",
          "text": "Applying the stated rule to this case gives -1. See the editorial for the method."
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
      "text": "Kruskal\u2019s algorithm sorts cables by cost and accepts an edge only if it joins different components. A minimum crossing edge is safe by the cut property. Require k-1 accepted edges. O(n log n) time."
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
    "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <numeric>\n#include <map>\n#include <set>\n#include <queue>\n#include <array>\n#include <functional>\n#include <climits>\n#include <utility>\nusing namespace std;\nusing ll=long long;\nll solve(vector<ll> a,ll k){\nvector<array<ll,3>>e;for(ll i=0;i<(ll)a.size();i+=3)e.push_back({a[i+2],a[i],a[i+1]});sort(e.begin(),e.end());vector<ll>p(k),s(k,1);iota(p.begin(),p.end(),0);function<ll(ll)>f=[&](ll x){return p[x]==x?x:p[x]=f(p[x]);};ll ans=0,used=0;for(auto [w,u,v]:e){u=f(u);v=f(v);if(u!=v){if(s[u]<s[v])swap(u,v);p[v]=u;s[u]+=s[v];ans+=w;used++;}}return used==k-1?ans:-1;\n}\nint main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\\n';}}\n",
    "python": "import sys, math, itertools, bisect, collections, functools\n\ndef solve(a,k):\n    edges=sorted(zip(a[2::3],a[::3],a[1::3])); parent=list(range(k)); size=[1]*k\n    def find(x):\n     while parent[x]!=x: parent[x]=parent[parent[x]]; x=parent[x]\n     return x\n    cost=used=0\n    for w,u,v in edges:\n     u,v=find(u),find(v)\n     if u!=v:\n      if size[u]<size[v]: u,v=v,u\n      parent[v]=u; size[u]+=size[v]; cost+=w; used+=1\n    return cost if used==k-1 else -1\n\ndef main():\n    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]\n    for _ in range(data[0]):\n        n,k=data[at:at+2]; at+=2\n        a=data[at:at+n]; at+=n\n        out.append(str(solve(a,k)))\n    sys.stdout.write('\\n'.join(out)+'\\n')\nif __name__=='__main__': main()\n"
  }
}
