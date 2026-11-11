import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    points=sorted(set(a)); pairs=list(zip(a[::2],a[1::2]))
    return sum(y-x for x,y in zip(points,points[1:]) if any(l<=x and y<=r for l,r in pairs))

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
