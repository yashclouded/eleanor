import type { CodeProblem } from './types.ts'

export const problem: CodeProblem = {
  "id": "code.dp.message-repair",
  "slug": "code.dp.message-repair",
  "version": 1,
  "concept": "code.dp",
  "family": "dp-core",
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
      "text": "An encoded message and its target are concatenated in the array. The first k symbols form the source and the remaining symbols form the target."
    },
    {
      "t": "p",
      "text": "Output the minimum number of single-symbol insertions, deletions, and substitutions to transform the source into the target. Each operation costs 1."
    }
  ],
  "inputFormat": [
    {
      "t": "p",
      "text": "The first integer is t (1 to 100). Each case contains n and k, then exactly n integers a[0] through a[n-1]. 1 <= k < n; n <= 800; 0 <= a[i] <= 25."
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
      "text": "1 <= n <= 800; sum of n over all cases <= 800. 1 <= k < n; n <= 800; 0 <= a[i] <= 25. Use 64-bit arithmetic for totals and answers."
    }
  ],
  "samples": [
    {
      "input": "1\n7 5\n3 1 1 2 1 2 2\n",
      "output": "4\n",
      "explain": [
        {
          "t": "p",
          "text": "Applying the stated rule to this case gives 4. See the editorial for the method."
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
      "text": "Let dp[i][j] be the edit distance of the first i source and j target symbols. Choose deletion, insertion, or matching/substituting the last symbol. Two rows suffice. O(k(n-k)) time, O(n-k) space."
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
    "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <numeric>\n#include <map>\n#include <set>\n#include <queue>\n#include <array>\n#include <functional>\n#include <climits>\n#include <utility>\nusing namespace std;\nusing ll=long long;\nll solve(vector<ll> a,ll k){\nvector<ll>r(a.size()-k+1);iota(r.begin(),r.end(),0);for(ll i=0;i<k;i++){vector<ll>v(r.size());v[0]=i+1;for(ll j=1;j<(ll)r.size();j++)v[j]=min({r[j]+1,v[j-1]+1,r[j-1]+(a[i]!=a[k+j-1])});r=move(v);}return r.back();\n}\nint main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\\n';}}\n",
    "python": "import sys, math, itertools, bisect, collections, functools\n\ndef solve(a,k):\n    s=a[:k]; t=a[k:]; row=list(range(len(t)+1))\n    for i,x in enumerate(s,1):\n     new=[i]\n     for j,y in enumerate(t,1): new.append(min(row[j]+1,new[-1]+1,row[j-1]+(x!=y)))\n     row=new\n    return row[-1]\n\ndef main():\n    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]\n    for _ in range(data[0]):\n        n,k=data[at:at+2]; at+=2\n        a=data[at:at+n]; at+=n\n        out.append(str(solve(a,k)))\n    sys.stdout.write('\\n'.join(out)+'\\n')\nif __name__=='__main__': main()\n"
  }
}
