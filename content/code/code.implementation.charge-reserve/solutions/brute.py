import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    for extra in range(sum(abs(x) for x in a)+1):
     if all(k+extra+sum(a[:i])>=0 for i in range(len(a)+1)): return extra

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
