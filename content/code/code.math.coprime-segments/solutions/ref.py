import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    last={}; ans=0
    for x in a:
     cur={x:1}
     for g,c in last.items():
      h=math.gcd(g,x); cur[h]=cur.get(h,0)+c
     ans+=cur.get(1,0); last=cur
    return ans

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
