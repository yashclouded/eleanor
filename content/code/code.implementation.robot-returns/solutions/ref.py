import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    x=y=d=ans=0
    for c in a:
     if c==0: x+=(0,1,0,-1)[d]; y+=(1,0,-1,0)[d]
     else: d=(d+(3 if c==1 else 1))%4
     ans+=x==0 and y==0
    return ans

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
