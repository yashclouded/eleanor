import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    def visit(i):
     if i==len(a)-1: return a[i]
     if i>=len(a): return 10**30
     return a[i]+min(visit(i+1),visit(i+2))
    return min(visit(0),visit(1)) if len(a)>1 else a[0]

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
