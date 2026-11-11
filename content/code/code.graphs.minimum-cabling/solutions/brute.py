import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    edges=list(zip(a[::3],a[1::3],a[2::3])); best=None
    for selected in itertools.combinations(edges,k-1):
     seen={0}
     for z in range(k):
      for u,v,w in selected:
       if u in seen or v in seen: seen.update([u,v])
     if len(seen)==k:
      cost=sum(w for u,v,w in selected); best=cost if best is None else min(best,cost)
    return -1 if best is None else best

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
