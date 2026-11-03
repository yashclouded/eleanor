import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    lo=0; hi=a[-1]-a[0]+1
    while lo+1<hi:
     m=(lo+hi)//2; count=1; last=a[0]
     for x in a[1:]:
      if x-last>=m: count+=1; last=x
     if count>=k: lo=m
     else: hi=m
    return lo

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
