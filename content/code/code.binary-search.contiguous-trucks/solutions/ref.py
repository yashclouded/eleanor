import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    lo=max(a); hi=sum(a)
    while lo<hi:
     m=(lo+hi)//2; groups=1; s=0
     for x in a:
      if s+x>m: groups+=1; s=0
      s+=x
     if groups<=k: hi=m
     else: lo=m+1
    return lo

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
