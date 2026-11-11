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
vector<ll>s(a.begin()+k,a.end());ll m=s.size();s.push_back(-1);s.insert(s.end(),a.begin(),a.begin()+k);vector<ll>p(s.size());ll ans=0;for(ll i=1;i<(ll)s.size();i++){ll j=p[i-1];while(j&&s[i]!=s[j])j=p[j-1];if(s[i]==s[j])j++;p[i]=j;if(j==m&&i>m)ans++;}return ans;
}
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\n';}}
