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
ll n=a.size();vector<ll>o(n),e(n);ll l=0,r=-1;for(ll i=0;i<n;i++){ll v=i>r?1:min(o[l+r-i],r-i+1);while(i-v>=0&&i+v<n&&a[i-v]==a[i+v])v++;o[i]=v;if(i+v-1>r){l=i-v+1;r=i+v-1;}}l=0;r=-1;for(ll i=0;i<n;i++){ll v=i>r?0:min(e[l+r-i+1],r-i+1);while(i-v-1>=0&&i+v<n&&a[i-v-1]==a[i+v])v++;e[i]=v;if(i+v-1>r){l=i-v;r=i+v-1;}}return accumulate(o.begin(),o.end(),0LL)+accumulate(e.begin(),e.end(),0LL);
}
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\n';}}
