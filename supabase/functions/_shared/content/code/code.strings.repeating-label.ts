import type { CodeProblem } from './types.ts'

export const problem: CodeProblem = {
  "id": "code.strings.repeating-label",
  "slug": "code.strings.repeating-label",
  "version": 1,
  "concept": "code.strings",
  "family": "strings-core",
  "status": "draft",
  "review": {
    "author": "GPT-6",
    "reviewer": null,
    "reviewedAt": null
  },
  "initialRating": 1000,
  "statement": [
    {
      "t": "p",
      "text": "A long printed label is an integer-symbol string. It may consist of identical copies of a shorter label."
    },
    {
      "t": "p",
      "text": "Output the shortest block length whose exact repetitions form the entire label. k is 0."
    }
  ],
  "inputFormat": [
    {
      "t": "p",
      "text": "The first integer is t (1 to 100). Each case contains n and k, then exactly n integers a[0] through a[n-1]. k=0; 0 <= a[i] <= 25."
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
      "text": "1 <= n <= 30000; sum of n over all cases <= 30000. k=0; 0 <= a[i] <= 25. Use 64-bit arithmetic for totals and answers."
    }
  ],
  "samples": [
    {
      "input": "1\n6 0\n1 0 1 3 3 3\n",
      "output": "6\n",
      "explain": [
        {
          "t": "p",
          "text": "Applying the stated rule to this case gives 6. See the editorial for the method."
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
      "text": "Compute the prefix function. The shortest candidate period is n minus the longest proper border, but it forms complete copies only when it divides n. O(n) time and space."
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
    "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <numeric>\n#include <map>\n#include <set>\n#include <queue>\n#include <array>\n#include <functional>\n#include <climits>\n#include <utility>\nusing namespace std;\nusing ll=long long;\nll solve(vector<ll> a,ll k){\nll n=a.size();vector<ll>p(n);for(ll i=1;i<n;i++){ll j=p[i-1];while(j&&a[i]!=a[j])j=p[j-1];if(a[i]==a[j])j++;p[i]=j;}ll q=n-p.back();return n%q==0?q:n;\n}\nint main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\\n';}}\n",
    "python": "import sys, math, itertools, bisect, collections, functools\n\ndef solve(a,k):\n    pi=[0]*len(a)\n    for i in range(1,len(a)):\n     j=pi[i-1]\n     while j and a[i]!=a[j]: j=pi[j-1]\n     if a[i]==a[j]: j+=1\n     pi[i]=j\n    p=len(a)-pi[-1]\n    return p if len(a)%p==0 else len(a)\n\ndef main():\n    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]\n    for _ in range(data[0]):\n        n,k=data[at:at+2]; at+=2\n        a=data[at:at+n]; at+=n\n        out.append(str(solve(a,k)))\n    sys.stdout.write('\\n'.join(out)+'\\n')\nif __name__=='__main__': main()\n"
  }
}
