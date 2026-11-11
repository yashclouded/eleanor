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
vector<vector<ll>>g(k);for(ll i=0;i<(ll)a.size();i+=2)g[a[i]].push_back(a[i+1]);vector<ll>d(k);d[0]=1;for(ll u=0;u<k;u++)for(ll v:g[u])d[v]=(d[v]+d[u])%1000000007;return d.back();
}
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\n';}}
