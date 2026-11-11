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
ll x=0,y=0,d=0,b=0;ll dx[]={0,1,0,-1},dy[]={1,0,-1,0};for(ll c:a){if(!c){x+=dx[d];y+=dy[d];}else d=(d+(c==1?3:1))%4;b=max(b,abs(x)+abs(y));}return b;
}
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\n';}}
