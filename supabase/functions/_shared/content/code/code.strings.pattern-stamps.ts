import type { CodeProblem } from './types.ts'

export const problem: CodeProblem = {
  "id": "code.strings.pattern-stamps",
  "slug": "code.strings.pattern-stamps",
  "version": 1,
  "concept": "code.strings",
  "family": "strings-core",
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
      "text": "An encoded message is followed by an encoded stamp pattern. The first k symbols of the array are the message; all remaining symbols are the nonempty pattern."
    },
    {
      "t": "p",
      "text": "Output the number of pattern occurrences in the message, allowing overlaps."
    }
  ],
  "inputFormat": [
    {
      "t": "p",
      "text": "The first integer is t (1 to 100). Each case contains n and k, then exactly n integers a[0] through a[n-1]. 1 <= k < n; 0 <= a[i] <= 25."
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
      "text": "1 <= n <= 30000; sum of n over all cases <= 30000. 1 <= k < n; 0 <= a[i] <= 25. Use 64-bit arithmetic for totals and answers."
    }
  ],
  "samples": [
    {
      "input": "1\n4 3\n0 0 2 0\n",
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
      "text": "Run the prefix function on pattern, a separator absent from the alphabet, and the text. A full pattern-length border at a text position marks a match, including overlaps. O(n) time and space."
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
    "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <numeric>\n#include <map>\n#include <set>\n#include <queue>\n#include <array>\n#include <functional>\n#include <climits>\n#include <utility>\nusing namespace std;\nusing ll=long long;\nll solve(vector<ll> a,ll k){\nvector<ll>s(a.begin()+k,a.end());ll m=s.size();s.push_back(-1);s.insert(s.end(),a.begin(),a.begin()+k);vector<ll>p(s.size());ll ans=0;for(ll i=1;i<(ll)s.size();i++){ll j=p[i-1];while(j&&s[i]!=s[j])j=p[j-1];if(s[i]==s[j])j++;p[i]=j;if(j==m&&i>m)ans++;}return ans;\n}\nint main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\\n';}}\n",
    "python": "import sys, math, itertools, bisect, collections, functools\n\ndef solve(a,k):\n    text=a[:k]; pattern=a[k:]; s=pattern+[-1]+text; pi=[0]*len(s); ans=0\n    for i in range(1,len(s)):\n     j=pi[i-1]\n     while j and s[i]!=s[j]: j=pi[j-1]\n     if s[i]==s[j]: j+=1\n     pi[i]=j\n     if j==len(pattern) and i>len(pattern): ans+=1\n    return ans\n\ndef main():\n    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]\n    for _ in range(data[0]):\n        n,k=data[at:at+2]; at+=2\n        a=data[at:at+n]; at+=n\n        out.append(str(solve(a,k)))\n    sys.stdout.write('\\n'.join(out)+'\\n')\nif __name__=='__main__': main()\n"
  }
}
