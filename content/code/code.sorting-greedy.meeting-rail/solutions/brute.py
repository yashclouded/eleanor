import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    pairs=list(zip(a[::2],a[1::2])); best=0
    for mask in range(1<<len(pairs)):
     chosen=sorted(pairs[i] for i in range(len(pairs)) if mask>>i&1)
     if all(chosen[i-1][1]<=chosen[i][0] for i in range(1,len(chosen))): best=max(best,len(chosen))
    return best

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
