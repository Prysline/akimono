/**
 * R4 frozen Core period.cgi per-shop dignity decline, source reviewed.
 * The callback occurs after shop income/history and exp decay but BEFORE
 * the period's second SortDT. Never an independent WorldState action.
 */
export const R4_DIGNITY_SOURCE='r4-frozen-period-source-dignity-one-shop-decay';
const fail=s=>{throw new RangeError('R4 original period dignity: '+s);};
const safe=n=>Number.isSafeInteger(n)&&n>=0;
export function reviewR4DignityDecay({periodSource}){
  if(typeof periodSource!=='string')
    fail('frozen period source required');
  const markers=[
    '$DT->{costtoday}=0;',
    '#熟練度自然減少',
    '#爵位ポイント自然減少',
    'if ($DT->{dignity} && rand(100) < 25)',
    'my $i=int( ($DT->{dignity}) / 12) + 1;',
    '$DT->{dignity}-=$i;',
    'SortDT();',
    '#領土データ調整',
  ];
  let index=-1;
  for(const marker of markers){
    const n=periodSource.indexOf(marker,index+1);
    if(n<=index)fail('original dignity phase source drift '+marker);
    index=n;
  }
  if(!periodSource.includes('if ($DT->{dignity} && rand(100) < 25)\n\t\t{'))
    fail('original dignity source branch changed');
  return Object.freeze({
    source:R4_DIGNITY_SOURCE,committable:false,
    probabilityThreshold:25,drawRange:100,
    sourceScope:'original one-shop period dignity rand(100) float comparison and int(dignity/12)+1 decline before second SortDT; no full period or game commit',
  });
}
export function projectR4DignityDecay({
  reviewed,dignity,randomDrawMillionths=null,
}){
  if(reviewed?.source!==R4_DIGNITY_SOURCE||
     reviewed.committable!==false||
     reviewed.probabilityThreshold!==25||
     reviewed.drawRange!==100||!safe(dignity))
    fail('source-reviewed dignity and original integer points required');
  if(dignity===0){
    if(randomDrawMillionths!==null)
      fail('no rand(100) when original dignity is zero');
    return Object.freeze({
      source:reviewed.source,committable:false,dignityBefore:0,
      dignityAfter:0,changed:false,decayAmount:0,
      randomDrawRanges:Object.freeze([]),drawsUsed:0,
    });
  }
  if(!safe(randomDrawMillionths)||randomDrawMillionths>=1000000)
    fail('exact one source rand(100) float sample required');
  const hit=randomDrawMillionths*100/1000000<25;
  const decrement=hit?Math.trunc(dignity/12)+1:0;
  const next=dignity-decrement;
  if(!safe(next))fail('original dignity decline not safely representable');
  return Object.freeze({
    source:reviewed.source,committable:false,
    dignityBefore:dignity,dignityAfter:next,
    changed:hit,decayAmount:decrement,
    randomDrawRanges:Object.freeze([100]),drawsUsed:1,
  });
}
