import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    tails=[]
    for x in a:
     i=bisect.bisect_left(tails,x)
     if i==len(tails): tails.append(x)
     else: tails[i]=x
    return len(tails)

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
