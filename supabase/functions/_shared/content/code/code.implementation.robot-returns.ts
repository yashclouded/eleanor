import type { CodeProblem } from './types.ts'

export const problem: CodeProblem = {
  "id": "code.implementation.robot-returns",
  "slug": "code.implementation.robot-returns",
  "version": 1,
  "concept": "code.implementation",
  "family": "robot-walk",
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
      "text": "A delivery robot follows encoded commands: 0 forward, 1 left, 2 right, initially facing north at the origin."
    },
    {
      "t": "p",
      "text": "Output how many commands leave it at the origin, counting turns while there but not the initial state. k is 0."
    }
  ],
  "inputFormat": [
    {
      "t": "p",
      "text": "The first integer is t (1 to 100). Each case contains n and k, then exactly n integers a[0] through a[n-1]. k=0; a[i] is 0, 1 or 2."
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
      "text": "1 <= n <= 30000; sum of n over all cases <= 30000. k=0; a[i] is 0, 1 or 2. Use 64-bit arithmetic for totals and answers."
    }
  ],
  "samples": [
    {
      "input": "1\n8 0\n2 0 0 2 1 1 1 2\n",
      "output": "1\n",
      "explain": [
        {
          "t": "p",
          "text": "Applying the stated rule to this case gives 1. See the editorial for the method."
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
      "text": "Maintain position and orientation; count origin states after every command, including turns. O(n) time and O(1) space."
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
    "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <numeric>\n#include <map>\n#include <set>\n#include <queue>\n#include <array>\n#include <functional>\n#include <climits>\n#include <utility>\nusing namespace std;\nusing ll=long long;\nll solve(vector<ll> a,ll k){\nll x=0,y=0,d=0,ans=0;ll dx[]={0,1,0,-1},dy[]={1,0,-1,0};for(ll c:a){if(c==0){x+=dx[d];y+=dy[d];}else d=(d+(c==1?3:1))%4;ans+=(x==0&&y==0);}return ans;\n}\nint main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\\n';}}\n",
    "python": "import sys, math, itertools, bisect, collections, functools\n\ndef solve(a,k):\n    x=y=d=ans=0\n    for c in a:\n     if c==0: x+=(0,1,0,-1)[d]; y+=(1,0,-1,0)[d]\n     else: d=(d+(3 if c==1 else 1))%4\n     ans+=x==0 and y==0\n    return ans\n\ndef main():\n    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]\n    for _ in range(data[0]):\n        n,k=data[at:at+2]; at+=2\n        a=data[at:at+n]; at+=n\n        out.append(str(solve(a,k)))\n    sys.stdout.write('\\n'.join(out)+'\\n')\nif __name__=='__main__': main()\n"
  }
}
