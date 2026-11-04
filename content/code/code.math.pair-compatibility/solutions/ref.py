import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    m=max(a); freq=[0]*(m+1)
    for x in a: freq[x]+=1
    exact=[0]*(m+1)
    for d in range(m,0,-1):
     c=sum(freq[d::d]); exact[d]=c*(c-1)//2-sum(exact[2*d::d])
    return sum(d*exact[d] for d in range(1,m+1))

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
