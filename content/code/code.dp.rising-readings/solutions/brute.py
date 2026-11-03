import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    best=0
    for mask in range(1<<len(a)):
     b=[a[i] for i in range(len(a)) if mask>>i&1]
     if all(x<y for x,y in zip(b,b[1:])): best=max(best,len(b))
    return best

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
