import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    pos=0j; direction=1j; visits=0
    for c in a:
     if c==0: pos+=direction
     elif c==1: direction*=1j
     else: direction*=-1j
     visits+=pos==0
    return visits

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
