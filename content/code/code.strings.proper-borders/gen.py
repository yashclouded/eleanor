import sys, random
PROFILE='symbols'
MAXIMUM=30000
SAMPLE=([1, 3, 1, 3], 0)
def case(rng,large=False):
 n=MAXIMUM if large else rng.randint(9,18) if PROFILE=='jobs' else rng.randint(3,8)
 p=PROFILE
 k=0
 if p in ('intervals','jobs'):
  unit=2 if p=='intervals' else 3
  n=max(unit,n//unit*unit); a=[]
  for i in range(n//unit):
   l=rng.randint(0,100000 if large else 8); r=l+rng.randint(1,1000 if large else 6)
   a.extend([l,r])
   if unit==3: a.append(rng.randint(1,1000000 if large else 20))
 elif p in ('graph','dag','weighted'):
  unit=3 if p=='weighted' else 2
  n=max(unit,n//unit*unit); k=10000 if large else rng.randint(2,5); a=[]
  for i in range(n//unit):
   if p=='dag': u=rng.randrange(k-1); v=rng.randrange(u+1,k)
   else: u=rng.randrange(k); v=rng.randrange(k)
   a.extend([u,v])
   if unit==3: a.append(rng.randint(1,1000000 if large else 20))
 else:
  bound=1000000 if large else 12
  if p in ('signed','charge','target','divisible'): a=[rng.randint(-100,100) if large else rng.randint(-5,5) for _ in range(n)]
  elif p=='signed-wide': a=[rng.randint(-1000000,1000000) if large else rng.randint(-8,8) for _ in range(n)]
  elif p in ('commands','repeat'): a=[rng.randrange(3) for _ in range(n)]
  elif p=='binary': a=[rng.randrange(2) for _ in range(n)]
  elif p in ('symbols','pattern'): a=[rng.randrange(4) for _ in range(n)]
  elif p=='periods': a=[rng.randint(1,12) for _ in range(n)]
  elif p=='bounded': a=[rng.randint(1,2000 if large else 12) for _ in range(n)]
  elif p in ('types','types-zero'): a=[rng.randrange(101 if large else 4) for _ in range(n)]
  elif p=='machines': a=[rng.randint(1,100 if large else 8) for _ in range(n)]
  elif p=='knapsack': a=[rng.randint(1,100 if large else 12) for _ in range(n)]
  elif p in ('nonnegative','cap'): a=[rng.randint(0,bound) for _ in range(n)]
  else: a=[rng.randint(1,bound) for _ in range(n)]
  if p=='charge': k=rng.randint(0,100)
  elif p=='budget': k=rng.randint(0,1000000000 if large else 25)
  elif p=='repeat': k=1000000000 if large else rng.randint(1,5)
  elif p=='target': k=rng.randint(-100,100) if large else sum(a[rng.randrange(n):])
  elif p=='divisible': k=rng.randint(1,100 if large else 5)
  elif p=='types': k=rng.randint(1,100 if large else 4)
  elif p=='sorted-target':
   a=sorted(rng.randint(1,100 if large else 12) for _ in range(n)); k=a[rng.randrange(n)]+a[rng.randrange(n)]
  elif p=='sorted-distance': a.sort(); k=rng.randint(0,100)
  elif p=='spacing': a=sorted(rng.sample(range(1000001),n)) if large else sorted(rng.sample(range(20),n)); k=rng.randint(2,n)
  elif p=='machines': k=1000000 if large else rng.randint(1,25)
  elif p=='split': k=rng.randint(1,n)
  elif p=='cap': k=rng.randint(0,min(1000000000,sum(a)+5))
  elif p=='knapsack': k=2000 if large else rng.randint(1,25)
  elif p=='pattern': k=n//2 if large else rng.randint(1,n-1)
 return a,k
if __name__=='__main__':
 group=sys.argv[1]; rng=random.Random(int(sys.argv[2]))
 if group=='small': cases=[SAMPLE]+[case(rng) for _ in range(20)]
 elif group=='minimal':
  p=PROFILE
  if p=='dag': cases=[([0,1],2)]
  elif p=='graph': cases=[([0,0],1),([0,1],2)]
  elif p=='weighted': cases=[([0,0,1],1),([0,1,1],2)]
  elif p=='intervals': cases=[([0,1],0)]
  elif p=='jobs': cases=[([0,1,1],0)]
  elif p=='spacing': cases=[([0,1],2)]
  elif p=='positive2': cases=[([1,1],0)]
  elif p=='sorted-target': cases=[([1,1],2)]
  elif p=='pattern': cases=[([0,0],1)]
  elif p in ('repeat','machines','split'): cases=[([1],1)]
  elif p in ('divisible','types'): cases=[([0],1)]
  elif p in ('knapsack','budget'): cases=[([1],0)]
  elif p in ('positive','periods','bounded'): cases=[([1],0)]
  else: cases=[([0],0)]
 elif group=='performance': cases=[case(rng,True)]
 else: raise ValueError('Unknown group: '+group)
 out=[str(len(cases))]
 for a,k in cases: out.extend([f'{len(a)} {k}',' '.join(map(str,a))])
 result='\n'.join(out)+'\n'
 if len(sys.argv)>3: open(sys.argv[3],'w').write(result)
 else: sys.stdout.write(result)
