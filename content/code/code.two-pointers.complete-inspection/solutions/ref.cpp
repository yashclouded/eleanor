#include <iostream>
#include <vector>
#include <algorithm>
#include <numeric>
#include <map>
#include <set>
#include <queue>
#include <array>
#include <functional>
#include <climits>
#include <utility>
using namespace std;
using ll=long long;
ll solve(vector<ll> a,ll k){
set<ll>types(a.begin(),a.end());map<ll,ll>f;ll l=0,b=a.size();for(ll r=0;r<(ll)a.size();r++){f[a[r]]++;while(f.size()==types.size()){b=min(b,r-l+1);ll y=a[l++];if(--f[y]==0)f.erase(y);}}return b;
}
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\n';}}
