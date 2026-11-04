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
ll m=*max_element(a.begin(),a.end());vector<ll>f(m+1),e(m+1);for(ll x:a)f[x]++;ll ans=0;for(ll d=m;d>=1;d--){ll c=0;for(ll j=d;j<=m;j+=d)c+=f[j];e[d]=c*(c-1)/2;for(ll j=2*d;j<=m;j+=d)e[d]-=e[j];ans+=d*e[d];}return ans;
}
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\n';}}
