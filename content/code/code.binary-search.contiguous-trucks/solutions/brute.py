import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    best=sum(a)
    for mask in range(1<<(len(a)-1)):
     if mask.bit_count()+1>k: continue
     loads=[]; s=a[0]
     for i,x in enumerate(a[1:]):
      if mask>>i&1: loads.append(s); s=0
      s+=x
     best=min(best,max(loads+[s]))
    return best

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
