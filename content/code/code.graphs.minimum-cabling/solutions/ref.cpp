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
vector<array<ll,3>>e;for(ll i=0;i<(ll)a.size();i+=3)e.push_back({a[i+2],a[i],a[i+1]});sort(e.begin(),e.end());vector<ll>p(k),s(k,1);iota(p.begin(),p.end(),0);function<ll(ll)>f=[&](ll x){return p[x]==x?x:p[x]=f(p[x]);};ll ans=0,used=0;for(auto [w,u,v]:e){u=f(u);v=f(v);if(u!=v){if(s[u]<s[v])swap(u,v);p[v]=u;s[u]+=s[v];ans+=w;used++;}}return used==k-1?ans:-1;
}
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\n';}}
