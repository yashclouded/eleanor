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
vector<vector<ll>>g(k);for(ll i=0;i<(ll)a.size();i+=2){g[a[i]].push_back(a[i+1]);g[a[i+1]].push_back(a[i]);}vector<ll>c(k,-1);for(ll r=0;r<k;r++){if(c[r]>=0)continue;queue<ll>q;q.push(r);c[r]=0;while(!q.empty()){ll u=q.front();q.pop();for(ll v:g[u]){if(c[v]==c[u])return 0;if(c[v]<0){c[v]=1-c[u];q.push(v);}}}}return 1;
}
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\n';}}
