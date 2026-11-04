import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    n=len(a); odd=[0]*n; even=[0]*n; l=0; r=-1
    for i in range(n):
     v=1 if i>r else min(odd[l+r-i],r-i+1)
     while i-v>=0 and i+v<n and a[i-v]==a[i+v]: v+=1
     odd[i]=v
     if i+v-1>r: l=i-v+1; r=i+v-1
    l=0; r=-1
    for i in range(n):
     v=0 if i>r else min(even[l+r-i+1],r-i+1)
     while i-v-1>=0 and i+v<n and a[i-v-1]==a[i+v]: v+=1
     even[i]=v
     if i+v-1>r: l=i-v; r=i+v-1
    return sum(odd)+sum(even)

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
