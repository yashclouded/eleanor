import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    g=[[] for _ in range(k)]
    for u,v in zip(a[::2],a[1::2]): g[u].append(v)
    def visit(u): return 1 if u==k-1 else sum(visit(v) for v in g[u])
    return visit(0)%1000000007

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
