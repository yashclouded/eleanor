import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    pi=[0]*len(a)
    for i in range(1,len(a)):
     j=pi[i-1]
     while j and a[i]!=a[j]: j=pi[j-1]
     if a[i]==a[j]: j+=1
     pi[i]=j
    p=len(a)-pi[-1]
    return p if len(a)%p==0 else len(a)

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
