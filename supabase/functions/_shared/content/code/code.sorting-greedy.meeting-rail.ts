import type { CodeProblem } from './types.ts'

export const problem: CodeProblem = {
  "id": "code.sorting-greedy.meeting-rail",
  "slug": "code.sorting-greedy.meeting-rail",
  "version": 1,
  "concept": "code.sorting-greedy",
  "family": "sorting-greedy-core",
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
      "text": "A rail station has one meeting room. The array encodes start,end pairs of requested bookings."
    },
    {
      "t": "p",
      "text": "Output the maximum number of bookings that fit without overlap. A booking ending at time x permits another starting at x. k is 0."
    }
  ],
  "inputFormat": [
    {
      "t": "p",
      "text": "The first integer is t (1 to 100). Each case contains n and k, then exactly n integers a[0] through a[n-1]. k=0; n is even; each pair satisfies 0 <= start < end <= 1000000."
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
      "text": "1 <= n <= 30000; sum of n over all cases <= 30000. k=0; n is even; each pair satisfies 0 <= start < end <= 1000000. Use 64-bit arithmetic for totals and answers."
    }
  ],
  "samples": [
    {
      "input": "1\n6 0\n6 12 2 6 6 7\n",
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
      "text": "Choose the available booking with earliest finish. Replacing the first booking of any optimal schedule by it cannot hurt later choices. Repeat greedily. O(n log n) time."
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
    "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <numeric>\n#include <map>\n#include <set>\n#include <queue>\n#include <array>\n#include <functional>\n#include <climits>\n#include <utility>\nusing namespace std;\nusing ll=long long;\nll solve(vector<ll> a,ll k){\nvector<pair<ll,ll>>v;for(ll i=0;i<(ll)a.size();i+=2)v.push_back({a[i+1],a[i]});sort(v.begin(),v.end());ll end=-1,ans=0;for(auto [r,l]:v)if(l>=end){ans++;end=r;}return ans;\n}\nint main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\\n';}}\n",
    "python": "import sys, math, itertools, bisect, collections, functools\n\ndef solve(a,k):\n    pairs=sorted(zip(a[::2],a[1::2]),key=lambda p:p[1]); end=-1; ans=0\n    for l,r in pairs:\n     if l>=end: ans+=1; end=r\n    return ans\n\ndef main():\n    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]\n    for _ in range(data[0]):\n        n,k=data[at:at+2]; at+=2\n        a=data[at:at+n]; at+=n\n        out.append(str(solve(a,k)))\n    sys.stdout.write('\\n'.join(out)+'\\n')\nif __name__=='__main__': main()\n"
  }
}
