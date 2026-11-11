import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    jobs=list(zip(a[::3],a[1::3],a[2::3])); best=0
    for mask in range(1<<len(jobs)):
     b=sorted(jobs[i] for i in range(len(jobs)) if mask>>i&1)
     if all(b[i-1][1]<=b[i][0] for i in range(1,len(b))): best=max(best,sum(w for l,r,w in b))
    return best

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
