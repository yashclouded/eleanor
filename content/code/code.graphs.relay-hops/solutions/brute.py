import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    inf=10**9; d=[[0 if i==j else inf for j in range(k)] for i in range(k)]
    for u,v in zip(a[::2],a[1::2]):
     if u!=v: d[u][v]=d[v][u]=1
    for z in range(k):
     for i in range(k):
      for j in range(k): d[i][j]=min(d[i][j],d[i][z]+d[z][j])
    return d[0][-1] if d[0][-1]<inf else -1

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
