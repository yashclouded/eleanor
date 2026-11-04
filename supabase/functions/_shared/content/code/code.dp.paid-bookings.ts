import type { CodeProblem } from './types.ts'

export const problem: CodeProblem = {
  "id": "code.dp.paid-bookings",
  "slug": "code.dp.paid-bookings",
  "version": 1,
  "concept": "code.dp",
  "family": "dp-core",
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
      "text": "A venue has bookings encoded as consecutive triples start,end,payment. Only one booking may run at once. A booking ending at x permits one starting at x."
    },
    {
      "t": "p",
      "text": "Output the maximum total payment of a compatible subset. Selecting no bookings is allowed. k is 0."
    }
  ],
  "inputFormat": [
    {
      "t": "p",
      "text": "The first integer is t (1 to 100). Each case contains n and k, then exactly n integers a[0] through a[n-1]. k=0; n divisible by 3; 0 <= start < end <= 1000000; 1 <= payment <= 1000000."
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
      "text": "1 <= n <= 30000; sum of n over all cases <= 30000. k=0; n divisible by 3; 0 <= start < end <= 1000000; 1 <= payment <= 1000000. Use 64-bit arithmetic for totals and answers."
    }
  ],
  "samples": [
    {
      "input": "1\n15 0\n5 11 17 2 4 15 1 3 18 5 7 4 0 4 13\n",
      "output": "35\n",
      "explain": [
        {
          "t": "p",
          "text": "Applying the stated rule to this case gives 35. See the editorial for the method."
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
      "text": "Sort by end time. For each booking, binary search the number of earlier bookings ending by its start. Choose between skipping it and taking its payment plus the best compatible prefix. O(n log n) time, O(n) space."
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
    "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <numeric>\n#include <map>\n#include <set>\n#include <queue>\n#include <array>\n#include <functional>\n#include <climits>\n#include <utility>\nusing namespace std;\nusing ll=long long;\nll solve(vector<ll> a,ll k){\nvector<array<ll,3>>v;for(ll i=0;i<(ll)a.size();i+=3)v.push_back({a[i+1],a[i],a[i+2]});sort(v.begin(),v.end());vector<ll>e,d(v.size()+1);for(auto z:v)e.push_back(z[0]);for(ll i=0;i<(ll)v.size();i++){auto [r,l,w]=v[i];ll p=upper_bound(e.begin(),e.begin()+i,l)-e.begin();d[i+1]=max(d[i],w+d[p]);}return d.back();\n}\nint main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\\n';}}\n",
    "python": "import sys, math, itertools, bisect, collections, functools\n\ndef solve(a,k):\n    jobs=sorted(zip(a[1::3],a[::3],a[2::3])); ends=[r for r,l,w in jobs]; dp=[0]\n    for i,(r,l,w) in enumerate(jobs):\n     prev=bisect.bisect_right(ends,l,0,i); dp.append(max(dp[-1],w+dp[prev]))\n    return dp[-1]\n\ndef main():\n    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]\n    for _ in range(data[0]):\n        n,k=data[at:at+2]; at+=2\n        a=data[at:at+n]; at+=n\n        out.append(str(solve(a,k)))\n    sys.stdout.write('\\n'.join(out)+'\\n')\nif __name__=='__main__': main()\n"
  }
}
