import type { CodeProblem } from './types.ts'

export const problem: CodeProblem = {
  "id": "code.two-pointers.paired-parcels",
  "slug": "code.two-pointers.paired-parcels",
  "version": 1,
  "concept": "code.two-pointers",
  "family": "two-pointers-core",
  "status": "draft",
  "review": {
    "author": "GPT-6",
    "reviewer": null,
    "reviewedAt": null
  },
  "initialRating": 800,
  "statement": [
    {
      "t": "p",
      "text": "Parcels have weights in a nondecreasing list. A two-parcel load is valid when its total weight equals k."
    },
    {
      "t": "p",
      "text": "Output the number of unordered pairs of distinct positions with sum k. Equal weights at different positions are distinct parcels."
    }
  ],
  "inputFormat": [
    {
      "t": "p",
      "text": "The first integer is t (1 to 100). Each case contains n and k, then exactly n integers a[0] through a[n-1]. 1 <= k <= 200; 1 <= a[i] <= 100; a is nondecreasing."
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
      "text": "1 <= n <= 30000; sum of n over all cases <= 30000. 1 <= k <= 200; 1 <= a[i] <= 100; a is nondecreasing. Use 64-bit arithmetic for totals and answers."
    }
  ],
  "samples": [
    {
      "input": "1\n6 20\n1 1 5 8 9 10\n",
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
      "text": "Move inward according to the sum. When a match is found, multiply duplicate run lengths; if both endpoints have the same value, count all pairs in that run. O(n) time."
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
    "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <numeric>\n#include <map>\n#include <set>\n#include <queue>\n#include <array>\n#include <functional>\n#include <climits>\n#include <utility>\nusing namespace std;\nusing ll=long long;\nll solve(vector<ll> a,ll k){\nll l=0,r=a.size()-1,ans=0;while(l<r){ll s=a[l]+a[r];if(s<k)l++;else if(s>k)r--;else if(a[l]==a[r]){ans+=(r-l+1)*(r-l)/2;break;}else{ll x=a[l],y=a[r],u=0,v=0;while(l<=r&&a[l]==x){l++;u++;}while(r>=l&&a[r]==y){r--;v++;}ans+=u*v;}}return ans;\n}\nint main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\\n';}}\n",
    "python": "import sys, math, itertools, bisect, collections, functools\n\ndef solve(a,k):\n    l=0; r=len(a)-1; ans=0\n    while l<r:\n     s=a[l]+a[r]\n     if s<k: l+=1\n     elif s>k: r-=1\n     elif a[l]==a[r]: ans+=(r-l+1)*(r-l)//2; break\n     else:\n      x,y=a[l],a[r]; u=v=0\n      while l<=r and a[l]==x: l+=1; u+=1\n      while r>=l and a[r]==y: r-=1; v+=1\n      ans+=u*v\n    return ans\n\ndef main():\n    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]\n    for _ in range(data[0]):\n        n,k=data[at:at+2]; at+=2\n        a=data[at:at+n]; at+=n\n        out.append(str(solve(a,k)))\n    sys.stdout.write('\\n'.join(out)+'\\n')\nif __name__=='__main__': main()\n"
  }
}
