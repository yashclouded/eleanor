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
vector<pair<ll,ll>>v;for(ll i=0;i<(ll)a.size();i+=2)v.push_back({a[i],a[i+1]});sort(v.begin(),v.end());ll l=v[0].first,r=v[0].second,ans=0;for(auto [x,y]:v){if(x>r){ans+=r-l;l=x;r=y;}else r=max(r,y);}return ans+r-l;
}
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\n';}}
