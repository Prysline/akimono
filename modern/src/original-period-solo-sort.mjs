/**
 * B-47 frozen Core GetDTPoint + SortDT SOLO source subset.
 * The shop-point number is part of the original ranking before and after
 * period settlement. This does NOT authorize an end-to-end period commit,
 * nor model multiple shops with tiebreaks or removed/closed shops.
 */
export const B47_SOLO_RANK_SOURCE='core-GetDTPoint-SortDT-one-active-shop';
const fail=m=>{throw new RangeError('B-47 frozen solo SortDT: '+m);};
const guard=(source,needle)=>{
  if(typeof source!=='string'||!source.includes(needle))
    fail('frozen Core sort/point source drift: '+needle);
};
function safe(n,key,min=0){
  if(!Number.isSafeInteger(n)||n<min)fail(key);
  return n;
}
export function reviewOriginalSoloSort({detailSource,readSource}){
  const markersDetail=[
    'sub SortDT',
    '@DT=grep($_->{status},@DT);',
    'foreach(@DT){$_->{point}=GetDTPoint($_);}',
    '@DT=sort{(!$a->{rankingyesterday})<=>(!$b->{rankingyesterday}) or $b->{point}<=>$a->{point}}@DT;',
    '%id2idx  =map{($DT[$_]->{id},$_)}(0..$#DT);',
    '%name2idx=map{($DT[$_]->{name},$_)}(0..$#DT);',
  ];
  for(const m of markersDetail)guard(detailSource,m);
  for(const m of [
    'sub GetDTPoint',
    'my $p=($DT->{profitstock}*3+$DT->{saletoday}-$DT->{taxtoday}-$DT->{paytoday})/500000+1;',
    'my $r=0.5 + ( 5 / ($DT->{rankingcount} + 10) );',
    '$p= 15 - (50 / $p) if ($p > 10);',
    '$p= 1 / (2 - $p) if ($p < 1);',
    'return int( $DT->{rank} * $r * $p );',
  ])guard(readSource,m);
  return Object.freeze({
    source:B47_SOLO_RANK_SOURCE,
    scope:'source-ranked single active store only; no other shops, closures, guilds, period write or side effects',
  });
}
export function projectOriginalSoloSort({shop,reviewed}){
  if(reviewed?.source!==B47_SOLO_RANK_SOURCE)
    fail('source review required');
  if(!shop||shop.id!==1||shop.status!==1||
     typeof shop.name!=='string'||shop.name.length===0)
    fail('only one original active named shop');
  const rank=safe(shop.rank,'rank');
  const count=safe(shop.rankingcount??0,'rankingcount');
  const profit=safe(shop.profitstock??0,'profitstock',
    -Number.MAX_SAFE_INTEGER);
  const sale=safe(shop.saletoday,'saletoday');
  const tax=safe(shop.taxtoday,'taxtoday');
  const purchase=safe(shop.paytoday,'paytoday');
  const numerator=profit*3+sale-tax-purchase;
  if(!Number.isSafeInteger(numerator))fail('source score overflow');
  let p=numerator/500000+1;
  const r=0.5+5/(count+10);
  if(p>10)p=15-50/p;
  if(p<1)p=1/(2-p);
  const point=Math.trunc(rank*r*p);
  if(!Number.isSafeInteger(point))fail('source score not a safe integer');
  return Object.freeze({
    shop:{...shop,point},
    idToIndex:Object.freeze({[shop.id]:0}),
    nameToIndex:Object.freeze({[shop.name]:0}),
    source:reviewed.source,scope:reviewed.scope,
  });
}
