import type { CodeProblem } from './types.ts'

export const problem: CodeProblem = {
  "id": "code.strings.mirror-windows",
  "slug": "code.strings.mirror-windows",
  "version": 1,
  "concept": "code.strings",
  "family": "strings-core",
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
      "text": "A signal inspector calls a nonempty contiguous symbol window a mirror when it reads the same forwards and backwards."
    },
    {
      "t": "p",
      "text": "Output the total number of mirror windows, counting different positions separately. k is 0."
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
      "input": "1\n7 0\n3 0 3 0 0 2 0\n",
      "output": "11\n",
      "explain": [
        {
          "t": "p",
          "text": "Applying the stated rule to this case gives 11. See the editorial for the method."
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
      "text": "Use Manacher\u2019s odd and even palindrome radii. Each radius equals the number of palindromes with that centre; sum both arrays. Reuse mirrored radii inside the rightmost known palindrome, extending only beyond its boundary. O(n) time and space."
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
    "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <numeric>\n#include <map>\n#include <set>\n#include <queue>\n#include <array>\n#include <functional>\n#include <climits>\n#include <utility>\nusing namespace std;\nusing ll=long long;\nll solve(vector<ll> a,ll k){\nll n=a.size();vector<ll>o(n),e(n);ll l=0,r=-1;for(ll i=0;i<n;i++){ll v=i>r?1:min(o[l+r-i],r-i+1);while(i-v>=0&&i+v<n&&a[i-v]==a[i+v])v++;o[i]=v;if(i+v-1>r){l=i-v+1;r=i+v-1;}}l=0;r=-1;for(ll i=0;i<n;i++){ll v=i>r?0:min(e[l+r-i+1],r-i+1);while(i-v-1>=0&&i+v<n&&a[i-v-1]==a[i+v])v++;e[i]=v;if(i+v-1>r){l=i-v;r=i+v-1;}}return accumulate(o.begin(),o.end(),0LL)+accumulate(e.begin(),e.end(),0LL);\n}\nint main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\\n';}}\n",
    "python": "import sys, math, itertools, bisect, collections, functools\n\ndef solve(a,k):\n    n=len(a); odd=[0]*n; even=[0]*n; l=0; r=-1\n    for i in range(n):\n     v=1 if i>r else min(odd[l+r-i],r-i+1)\n     while i-v>=0 and i+v<n and a[i-v]==a[i+v]: v+=1\n     odd[i]=v\n     if i+v-1>r: l=i-v+1; r=i+v-1\n    l=0; r=-1\n    for i in range(n):\n     v=0 if i>r else min(even[l+r-i+1],r-i+1)\n     while i-v-1>=0 and i+v<n and a[i-v-1]==a[i+v]: v+=1\n     even[i]=v\n     if i+v-1>r: l=i-v; r=i+v-1\n    return sum(odd)+sum(even)\n\ndef main():\n    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]\n    for _ in range(data[0]):\n        n,k=data[at:at+2]; at+=2\n        a=data[at:at+n]; at+=n\n        out.append(str(solve(a,k)))\n    sys.stdout.write('\\n'.join(out)+'\\n')\nif __name__=='__main__': main()\n"
  }
}
