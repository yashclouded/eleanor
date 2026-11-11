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
ll n=a.size();vector<ll>p(n);for(ll i=1;i<n;i++){ll j=p[i-1];while(j&&a[i]!=a[j])j=p[j-1];if(a[i]==a[j])j++;p[i]=j;}ll ans=0,j=p.back();while(j){ans++;j=p[j-1];}return ans;
}
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\n';}}
