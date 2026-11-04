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
ll n=a.size();vector<ll>p(n+1),s(n+1);for(ll i=0;i<n;i++)p[i+1]=gcd(p[i],a[i]);for(ll i=n-1;i>=0;i--)s[i]=gcd(s[i+1],a[i]);ll ans=0;for(ll i=0;i<n;i++)ans=max(ans,gcd(p[i],s[i+1]));return ans;
}
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\n';}}
