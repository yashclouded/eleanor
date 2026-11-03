import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    return max([0]+[j-i for i in range(len(a)) for j in range(i+1,len(a)+1) if sum(a[i:j])<=k])

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
