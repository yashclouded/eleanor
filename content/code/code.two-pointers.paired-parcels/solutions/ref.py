import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    l=0; r=len(a)-1; ans=0
    while l<r:
     s=a[l]+a[r]
     if s<k: l+=1
     elif s>k: r-=1
     elif a[l]==a[r]: ans+=(r-l+1)*(r-l)//2; break
     else:
      x,y=a[l],a[r]; u=v=0
      while l<=r and a[l]==x: l+=1; u+=1
      while r>=l and a[r]==y: r-=1; v+=1
      ans+=u*v
    return ans

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
