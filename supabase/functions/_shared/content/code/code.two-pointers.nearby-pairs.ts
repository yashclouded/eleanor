import type { CodeProblem } from './types.ts'

export const problem: CodeProblem = {
  "id": "code.two-pointers.nearby-pairs",
  "slug": "code.two-pointers.nearby-pairs",
  "version": 1,
  "concept": "code.two-pointers",
  "family": "two-pointers-core",
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
      "text": "A nondecreasing coordinate list describes inspection points. Two distinct positions form a nearby pair when their distance is at most k."
    },
    {
      "t": "p",
      "text": "Output the number of unordered nearby pairs."
    }
  ],
  "inputFormat": [
    {
      "t": "p",
      "text": "The first integer is t (1 to 100). Each case contains n and k, then exactly n integers a[0] through a[n-1]. 0 <= k <= 100; 0 <= a[i] <= 1000000; a is nondecreasing."
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
      "text": "1 <= n <= 30000; sum of n over all cases <= 30000. 0 <= k <= 100; 0 <= a[i] <= 1000000; a is nondecreasing. Use 64-bit arithmetic for totals and answers."
    }
  ],
  "samples": [
    {
      "input": "1\n7 7\n2 4 5 6 7 10 11\n",
      "output": "19\n",
      "explain": [
        {
          "t": "p",
          "text": "Applying the stated rule to this case gives 19. See the editorial for the method."
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
      "text": "For each right endpoint, advance left until all points in the window are within k. Exactly right-left pairs end here. O(n) time, with a 64-bit count."
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
    "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <numeric>\n#include <map>\n#include <set>\n#include <queue>\n#include <array>\n#include <functional>\n#include <climits>\n#include <utility>\nusing namespace std;\nusing ll=long long;\nll solve(vector<ll> a,ll k){\nll l=0,ans=0;for(ll r=0;r<(ll)a.size();r++){while(a[r]-a[l]>k)l++;ans+=r-l;}return ans;\n}\nint main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\\n';}}\n",
    "python": "import sys, math, itertools, bisect, collections, functools\n\ndef solve(a,k):\n    l=ans=0\n    for r,x in enumerate(a):\n     while x-a[l]>k: l+=1\n     ans+=r-l\n    return ans\n\ndef main():\n    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]\n    for _ in range(data[0]):\n        n,k=data[at:at+2]; at+=2\n        a=data[at:at+n]; at+=n\n        out.append(str(solve(a,k)))\n    sys.stdout.write('\\n'.join(out)+'\\n')\nif __name__=='__main__': main()\n"
  }
}
