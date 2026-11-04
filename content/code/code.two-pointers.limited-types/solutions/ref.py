import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    freq={}; l=best=0
    for r,x in enumerate(a):
     freq[x]=freq.get(x,0)+1
     while len(freq)>k:
      y=a[l]; freq[y]-=1; l+=1
      if freq[y]==0: del freq[y]
     best=max(best,r-l+1)
    return best

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
