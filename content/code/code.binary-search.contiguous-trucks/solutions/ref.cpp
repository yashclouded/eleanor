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
ll l=*max_element(a.begin(),a.end()),r=accumulate(a.begin(),a.end(),0LL);while(l<r){ll m=(l+r)/2,g=1,s=0;for(ll x:a){if(s+x>m){g++;s=0;}s+=x;}if(g<=k)r=m;else l=m+1;}return l;
}
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\n';}}
