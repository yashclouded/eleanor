import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    g=[[] for _ in range(k)]
    for u,v in zip(a[::2],a[1::2]): g[u].append(v); g[v].append(u)
    color=[-1]*k
    for root in range(k):
     if color[root]>=0: continue
     color[root]=0; q=collections.deque([root])
     while q:
      u=q.popleft()
      for v in g[u]:
       if color[v]==color[u]: return 0
       if color[v]<0: color[v]=1-color[u]; q.append(v)
    return 1

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
