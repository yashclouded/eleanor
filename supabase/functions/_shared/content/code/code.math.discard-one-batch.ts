import type { CodeProblem } from './types.ts'

export const problem: CodeProblem = {
  "id": "code.math.discard-one-batch",
  "slug": "code.math.discard-one-batch",
  "version": 1,
  "concept": "code.math",
  "family": "math-core",
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
      "text": "A supply manager may discard exactly one of n containers before forming identical batches from the remaining supplies."
    },
    {
      "t": "p",
      "text": "Output the largest GCD obtainable after deleting one supply. k is 0."
    }
  ],
  "inputFormat": [
    {
      "t": "p",
      "text": "The first integer is t (1 to 100). Each case contains n and k, then exactly n integers a[0] through a[n-1]. k=0; n >= 2; 1 <= a[i] <= 1000000."
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
      "text": "1 <= n <= 30000; sum of n over all cases <= 30000. k=0; n >= 2; 1 <= a[i] <= 1000000. Use 64-bit arithmetic for totals and answers."
    }
  ],
  "samples": [
    {
      "input": "1\n6 0\n8 9 12 12 2 8\n",
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
      "text": "Precompute prefix and suffix GCDs. Deleting i leaves gcd(prefix before i, suffix after i). Maximise over all deletions in O(n log M) time and O(n) space."
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
    "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <numeric>\n#include <map>\n#include <set>\n#include <queue>\n#include <array>\n#include <functional>\n#include <climits>\n#include <utility>\nusing namespace std;\nusing ll=long long;\nll solve(vector<ll> a,ll k){\nll n=a.size();vector<ll>p(n+1),s(n+1);for(ll i=0;i<n;i++)p[i+1]=gcd(p[i],a[i]);for(ll i=n-1;i>=0;i--)s[i]=gcd(s[i+1],a[i]);ll ans=0;for(ll i=0;i<n;i++)ans=max(ans,gcd(p[i],s[i+1]));return ans;\n}\nint main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\\n';}}\n",
    "python": "import sys, math, itertools, bisect, collections, functools\n\ndef solve(a,k):\n    n=len(a); pre=[0]*(n+1); suf=[0]*(n+1)\n    for i in range(n): pre[i+1]=math.gcd(pre[i],a[i])\n    for i in range(n-1,-1,-1): suf[i]=math.gcd(suf[i+1],a[i])\n    return max(math.gcd(pre[i],suf[i+1]) for i in range(n))\n\ndef main():\n    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]\n    for _ in range(data[0]):\n        n,k=data[at:at+2]; at+=2\n        a=data[at:at+n]; at+=n\n        out.append(str(solve(a,k)))\n    sys.stdout.write('\\n'.join(out)+'\\n')\nif __name__=='__main__': main()\n"
  }
}
