import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    g=[[] for _ in range(k)]
    for u,v in zip(a[::2],a[1::2]): g[u].append(v)
    dp=[0]*k; dp[0]=1
    for u in range(k):
     for v in g[u]: dp[v]=(dp[v]+dp[u])%1000000007
    return dp[-1]

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
