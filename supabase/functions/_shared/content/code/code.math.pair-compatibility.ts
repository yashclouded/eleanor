import type { CodeProblem } from './types.ts'

export const problem: CodeProblem = {
  "id": "code.math.pair-compatibility",
  "slug": "code.math.pair-compatibility",
  "version": 1,
  "concept": "code.math",
  "family": "math-core",
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
      "text": "Every pair of devices earns a compatibility score equal to the GCD of its two calibration numbers."
    },
    {
      "t": "p",
      "text": "Output the sum of scores over unordered pairs of distinct positions. k is 0."
    }
  ],
  "inputFormat": [
    {
      "t": "p",
      "text": "The first integer is t (1 to 100). Each case contains n and k, then exactly n integers a[0] through a[n-1]. k=0; 1 <= a[i] <= 2000."
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
      "text": "1 <= n <= 30000; sum of n over all cases <= 30000. k=0; 1 <= a[i] <= 2000. Use 64-bit arithmetic for totals and answers."
    }
  ],
  "samples": [
    {
      "input": "1\n5 0\n10 12 2 6 5\n",
      "output": "24\n",
      "explain": [
        {
          "t": "p",
          "text": "Applying the stated rule to this case gives 24. See the editorial for the method."
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
      "text": "Count pairs divisible by d, then subtract those with exact GCD at larger multiples in descending order. Weight each exact count by d. O(n + M log M) time, O(M) space."
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
    "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <numeric>\n#include <map>\n#include <set>\n#include <queue>\n#include <array>\n#include <functional>\n#include <climits>\n#include <utility>\nusing namespace std;\nusing ll=long long;\nll solve(vector<ll> a,ll k){\nll m=*max_element(a.begin(),a.end());vector<ll>f(m+1),e(m+1);for(ll x:a)f[x]++;ll ans=0;for(ll d=m;d>=1;d--){ll c=0;for(ll j=d;j<=m;j+=d)c+=f[j];e[d]=c*(c-1)/2;for(ll j=2*d;j<=m;j+=d)e[d]-=e[j];ans+=d*e[d];}return ans;\n}\nint main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\\n';}}\n",
    "python": "import sys, math, itertools, bisect, collections, functools\n\ndef solve(a,k):\n    m=max(a); freq=[0]*(m+1)\n    for x in a: freq[x]+=1\n    exact=[0]*(m+1)\n    for d in range(m,0,-1):\n     c=sum(freq[d::d]); exact[d]=c*(c-1)//2-sum(exact[2*d::d])\n    return sum(d*exact[d] for d in range(1,m+1))\n\ndef main():\n    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]\n    for _ in range(data[0]):\n        n,k=data[at:at+2]; at+=2\n        a=data[at:at+n]; at+=n\n        out.append(str(solve(a,k)))\n    sys.stdout.write('\\n'.join(out)+'\\n')\nif __name__=='__main__': main()\n"
  }
}
