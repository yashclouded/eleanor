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
vector<ll>r(a.size()-k+1);iota(r.begin(),r.end(),0);for(ll i=0;i<k;i++){vector<ll>v(r.size());v[0]=i+1;for(ll j=1;j<(ll)r.size();j++)v[j]=min({r[j]+1,v[j-1]+1,r[j-1]+(a[i]!=a[k+j-1])});r=move(v);}return r.back();
}
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\n';}}
