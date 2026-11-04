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
vector<ll>p(k);iota(p.begin(),p.end(),0);function<ll(ll)>f=[&](ll x){return p[x]==x?x:p[x]=f(p[x]);};for(ll i=0;i<(ll)a.size();i+=2)p[f(a[i])]=f(a[i+1]);set<ll>s;for(ll i=0;i<k;i++)s.insert(f(i));return s.size();
}
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\n';}}
