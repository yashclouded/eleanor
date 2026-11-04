import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    edges=sorted(zip(a[2::3],a[::3],a[1::3])); parent=list(range(k)); size=[1]*k
    def find(x):
     while parent[x]!=x: parent[x]=parent[parent[x]]; x=parent[x]
     return x
    cost=used=0
    for w,u,v in edges:
     u,v=find(u),find(v)
     if u!=v:
      if size[u]<size[v]: u,v=v,u
      parent[v]=u; size[u]+=size[v]; cost+=w; used+=1
    return cost if used==k-1 else -1

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
