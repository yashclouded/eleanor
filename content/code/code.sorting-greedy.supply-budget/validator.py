import sys
PROFILE='budget'
MAXIMUM=30000
def validate(text):
 data=list(map(int,text.split())); pos=0
 def take():
  nonlocal pos
  if pos==len(data): raise ValueError('Truncated input')
  value=data[pos]; pos+=1; return value
 t=take()
 if not 1<=t<=100: raise ValueError('Invalid case count')
 total=0
 for _ in range(t):
  n,k=take(),take(); total+=n
  if not 1<=n<=MAXIMUM: raise ValueError('Invalid length')
  a=[take() for _ in range(n)]; p=PROFILE
  if p in ('intervals','jobs','graph','dag','weighted'):
   unit=3 if p in ('jobs','weighted') else 2
   if n%unit: raise ValueError('Incomplete tuple')
   if p in ('graph','dag','weighted'):
    if not 1<=k<=10000 or p=='dag' and k<2: raise ValueError('Invalid vertex count')
    for i in range(0,n,unit):
     u,v=a[i:i+2]
     if not 0<=u<k or not 0<=v<k or p=='dag' and u>=v: raise ValueError('Invalid edge')
     if unit==3 and not 1<=a[i+2]<=1000000: raise ValueError('Invalid cost')
   else:
    if k!=0: raise ValueError('Reserved k must be zero')
    for i in range(0,n,unit):
     if not 0<=a[i]<a[i+1]<=1000000: raise ValueError('Invalid interval')
     if unit==3 and not 1<=a[i+2]<=1000000: raise ValueError('Invalid payment')
  else:
   low,high=1,1000000
   if p in ('signed','charge','target','divisible'): low,high=-100,100
   if p=='signed-wide': low,high=-1000000,1000000
   if p in ('commands','repeat'): low,high=0,2
   if p=='binary': low,high=0,1
   if p in ('symbols','pattern'): low,high=0,25
   if p in ('types','types-zero'): low,high=0,100
   if p=='periods': high=12
   if p=='bounded': high=2000
   if p in ('machines','knapsack'): high=100
   if p in ('nonnegative','cap','sorted-distance','spacing'): low=0
   if p=='sorted-target': high=100
   if any(not low<=x<=high for x in a): raise ValueError('Invalid symbol value')
   if p in ('sorted-distance','sorted-target','spacing') and a!=sorted(a): raise ValueError('Unsorted input')
   if p=='spacing' and len(set(a))!=n: raise ValueError('Duplicate station')
   if p in ('positive2','sorted-target','spacing') and n<2: raise ValueError('At least two entries required')
   if p=='charge':
    if not 0<=k<=100: raise ValueError('Invalid starting charge')
   elif p in ('budget','cap'):
    if not 0<=k<=1000000000: raise ValueError('Invalid budget')
   elif p=='repeat':
    if not 1<=k<=1000000000: raise ValueError('Invalid repetitions')
   elif p=='target':
    if not -100<=k<=100: raise ValueError('Invalid target')
   elif p in ('divisible','types'):
    if not 1<=k<=100: raise ValueError('Invalid parameter')
   elif p=='sorted-target':
    if not 1<=k<=200: raise ValueError('Invalid target')
   elif p=='sorted-distance':
    if not 0<=k<=1000000: raise ValueError('Invalid threshold')
   elif p=='spacing':
    if not 2<=k<=n: raise ValueError('Invalid station count')
   elif p=='split':
    if not 1<=k<=n: raise ValueError('Invalid load count')
   elif p=='machines':
    if not 1<=k<=1000000: raise ValueError('Invalid production target')
   elif p=='knapsack':
    if not 0<=k<=2000: raise ValueError('Invalid capacity')
   elif p=='pattern':
    if not 1<=k<n: raise ValueError('Invalid string split')
   elif k!=0: raise ValueError('Reserved k must be zero')
 if total>MAXIMUM: raise ValueError('Total length exceeds bound')
 if pos!=len(data): raise ValueError('Extra input tokens')
if __name__=='__main__':
 try: validate(sys.stdin.read())
 except (ValueError,IndexError) as error: sys.exit(str(error))
