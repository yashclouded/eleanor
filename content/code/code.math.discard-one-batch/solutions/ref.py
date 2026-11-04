import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    n=len(a); pre=[0]*(n+1); suf=[0]*(n+1)
    for i in range(n): pre[i+1]=math.gcd(pre[i],a[i])
    for i in range(n-1,-1,-1): suf[i]=math.gcd(suf[i+1],a[i])
    return max(math.gcd(pre[i],suf[i+1]) for i in range(n))

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
