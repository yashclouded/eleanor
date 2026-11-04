import type { CodeProblem } from './types.ts'

export const problem: CodeProblem = {
  "id": "code.dp.subset-capacity",
  "slug": "code.dp.subset-capacity",
  "version": 1,
  "concept": "code.dp",
  "family": "dp-core",
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
      "text": "A crate has capacity k. Each object weight may be used at most once."
    },
    {
      "t": "p",
      "text": "Output the largest total object weight at most k. Selecting no objects is allowed."
    }
  ],
  "inputFormat": [
    {
      "t": "p",
      "text": "The first integer is t (1 to 100). Each case contains n and k, then exactly n integers a[0] through a[n-1]. 0 <= k <= 2000; 1 <= a[i] <= 100; n <= 200."
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
      "text": "1 <= n <= 200; sum of n over all cases <= 200. 0 <= k <= 2000; 1 <= a[i] <= 100; n <= 200. Use 64-bit arithmetic for totals and answers."
    }
  ],
  "samples": [
    {
      "input": "1\n3 18\n10 6 11\n",
      "output": "17\n",
      "explain": [
        {
          "t": "p",
          "text": "Applying the stated rule to this case gives 17. See the editorial for the method."
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
      "text": "Maintain reachable totals, initially just zero. Update in descending order (or shift a bitset from the previous state) so each object is used once. O(nk) elementary time and O(k) space; Python\u2019s integer bitset accelerates the same recurrence."
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
    "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <numeric>\n#include <map>\n#include <set>\n#include <queue>\n#include <array>\n#include <functional>\n#include <climits>\n#include <utility>\nusing namespace std;\nusing ll=long long;\nll solve(vector<ll> a,ll k){\nvector<char>d(k+1);d[0]=1;for(ll x:a)for(ll s=k;s>=x;s--)d[s]|=d[s-x];for(ll s=k;s>=0;s--)if(d[s])return s;return 0;\n}\nint main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\\n';}}\n",
    "python": "import sys, math, itertools, bisect, collections, functools\n\ndef solve(a,k):\n    bits=1; mask=(1<<(k+1))-1\n    for x in a: bits=(bits|(bits<<x))&mask\n    return bits.bit_length()-1\n\ndef main():\n    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]\n    for _ in range(data[0]):\n        n,k=data[at:at+2]; at+=2\n        a=data[at:at+n]; at+=n\n        out.append(str(solve(a,k)))\n    sys.stdout.write('\\n'.join(out)+'\\n')\nif __name__=='__main__': main()\n"
  }
}
