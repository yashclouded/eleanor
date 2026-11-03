import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    bits=1; mask=(1<<(k+1))-1
    for x in a: bits=(bits|(bits<<x))&mask
    return bits.bit_length()-1

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
