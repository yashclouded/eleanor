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
ll l=0,r=a.size()-1,ans=0;while(l<r){ll s=a[l]+a[r];if(s<k)l++;else if(s>k)r--;else if(a[l]==a[r]){ans+=(r-l+1)*(r-l)/2;break;}else{ll x=a[l],y=a[r],u=0,v=0;while(l<=r&&a[l]==x){l++;u++;}while(r>=l&&a[r]==y){r--;v++;}ans+=u*v;}}return ans;
}
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\n';}}
