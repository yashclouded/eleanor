import sys, math, itertools, bisect, collections, functools

def solve(a,k):
    text=a[:k]; pattern=a[k:]; s=pattern+[-1]+text; pi=[0]*len(s); ans=0
    for i in range(1,len(s)):
     j=pi[i-1]
     while j and s[i]!=s[j]: j=pi[j-1]
     if s[i]==s[j]: j+=1
     pi[i]=j
     if j==len(pattern) and i>len(pattern): ans+=1
    return ans

def main():
    data=list(map(int,sys.stdin.buffer.read().split())); at=1; out=[]
    for _ in range(data[0]):
        n,k=data[at:at+2]; at+=2
        a=data[at:at+n]; at+=n
        out.append(str(solve(a,k)))
    sys.stdout.write('\n'.join(out)+'\n')
if __name__=='__main__': main()
