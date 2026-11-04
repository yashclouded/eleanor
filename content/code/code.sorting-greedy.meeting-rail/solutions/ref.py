import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    pairs=sorted(zip(a[::2],a[1::2]),key=lambda p:p[1]); end=-1; ans=0
    for l,r in pairs:
     if l>=end: ans+=1; end=r
    return ans

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
