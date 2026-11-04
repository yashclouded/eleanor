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
sort(a.begin(),a.end());ll m=a[a.size()/2],ans=0;for(ll x:a)ans+=abs(x-m);return ans;
}
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\n';}}
