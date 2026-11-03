import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    seen={0:1}; s=ans=0
    for x in a:
     s=(s+x)%k; ans+=seen.get(s,0); seen[s]=seen.get(s,0)+1
    return ans

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
