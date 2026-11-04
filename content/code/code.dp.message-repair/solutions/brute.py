import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    s=a[:k]; t=a[k:]
    @functools.lru_cache(None)
    def f(i,j):
     if i==len(s): return len(t)-j
     if j==len(t): return len(s)-i
     return min(1+f(i+1,j),1+f(i,j+1),(s[i]!=t[j])+f(i+1,j+1))
    return f(0,0)

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
