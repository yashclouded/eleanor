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
ll x=0,y=0,d=0;ll dx[]={0,1,0,-1},dy[]={1,0,-1,0};for(ll c:a){if(!c){x+=dx[d];y+=dy[d];}else d=(d+(c==1?3:1))%4;}if(!d)return (abs(x)+abs(y))*k;ll px=0,py=0;for(ll j=0;j<k%4;j++){ll u=x,v=y;for(ll z=0;z<(d*j)%4;z++){ll t=u;u=v;v=-t;}px+=u;py+=v;}return abs(px)+abs(py);
}
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int t;cin>>t;while(t--){ll n,k;cin>>n>>k;vector<ll>a(n);for(ll &x:a)cin>>x;cout<<solve(a,k)<<'\n';}}
