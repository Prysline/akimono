/**
 * B-63: all five SOURCE ITEM #14 sword-map first-USE output probabilities,
 * original GetLocalFunction before-USE doubled amount branch and original
 * item::lostbook after-USE map destruction, not synthetic inventory.
 *
 * One never-before-used map expedition per shop only; second expedition
 * changes original GetItemUseTime through EXP and is deliberately unreviewed.
 * The existing B-62 bounded single-outcome action remains separate.
 */
import {B62_MAP_SOURCE}
  from './original-b62-sword-map-acquisition.mjs';
import {validateSourceSparseMarket}
  from './original-admin-world-bootstrap.mjs';

export const B63_MAP_SOURCE='b63-original-sword-map-all-five-original-first-use-outcomes';
const reject=s=>{throw new RangeError('B-63 original sword-map outcomes: '+s);};
const int=(v,k,min=0)=>{
  if(!Number.isSafeInteger(v)||v<min)reject('unsafe '+k);return v;
};
const codes=[40,41,42,43,44];
const chance=[400,350,150,60,30];
const maximum=[600,500,300,100,75];
const originalCost=[120,150,320,800,1200];
function frozen(o){
  if(o&&typeof o==='object'&&!Object.isFrozen(o)){
    for(const value of Object.values(o))frozen(value);
    Object.freeze(o);
  }
  return o;
}
export function reviewOriginalB63SwordMapOutcomes({
  reviewedB62Map,itemDsl,originalUseSource,
  originalHelperSource,originalCalcSource,originalWholeSource,
}){
  if(reviewedB62Map?.source!==B62_MAP_SOURCE||
     reviewedB62Map.mapItemId!==14||
     reviewedB62Map.mapUsePrice!==12000||
     reviewedB62Map.mapUseTimeSeconds!==7200||
     reviewedB62Map.mapUseExp!==20||
     reviewedB62Map.outputs?.length!==5||
     reviewedB62Map.outputs.some((row,i)=>
       row.itemId!==codes[i]||
       row.probabilityPermille!==chance[i]||
       row.count!==10))
    reject('B-62 pinned original source contract missing');
  const start=itemDsl?.indexOf('@@FUNCITEM');
  const end=itemDsl?.indexOf('@@FUNCUPDATE',start);
  const frag=start>=0&&end>start?itemDsl.slice(start,end):'';
  // Strip only blank/source-comment lines; compare COMPLETE executable
  // function bodies. Checking a few substrings would miss newly injected
  // original Perl side-effects even if the known markers remained intact.
  const executable=body=>body.split(/\r?\n/)
    .map(line=>line.trim()).filter(line=>line&&!line.startsWith('#'))
    .join('\n');
  const lostbook=/sub lostbook\s*\n\{([\s\S]*?)^\}/m.exec(frag);
  const expectedLost=[
    'my $itemno=$USE->{itemno};',
    'if(rand(1000)<$USE->{param1})','{',
    "UseItem($itemno,1,$ITEM[$itemno]->{name}.'已經破爛到看不懂，就扔掉了。');",
    '}','return "";',
  ].join('\n');
  if(!lostbook||executable(lostbook[1])!==expectedLost)
    reject('actual complete original lostbook callback source drift');
  const mapSection=/^@@ITEM[^\n]*\n[ \t]*no[ \t]+14\b([\s\S]*?)(?=^@@ITEM\b|^@@EVENT\b|^@@END\b|\z)/mi
    .exec(itemDsl)?.[1]??'';
  const pre=/^[ \t]*funcb[ \t]+_local_[ \t]*\r?\n([\s\S]*?)^[ \t]*_local_[ \t]*$/m
    .exec(mapSection);
  const expectedPre=[
    'return 0 if rand(1000)>100;',
    'my $USE=$_[0];',
    'foreach(@{$USE->{result}->{create}})','{',
    '$_->{count}*=2;','}',
    "$USE->{result}->{message}->{resultok}='這次我們收穫的比平時多。';",
    'return 0;',
  ].join('\n');
  if(!pre||executable(pre[1])!==expectedPre)
    reject('actual complete original first-USE double callback source drift');
  for(const [source,part] of [
    [originalHelperSource,'sub UseItem\n'],
    [originalHelperSource,'$count=UseItemSub($itemno,$count,$DT);'],
    [originalHelperSource,'push(@{$USE->{result}->{useitem}},[$itemno,$count]);'],
    [originalHelperSource,'$DT->{item}[$itemno-1]-=$count;'],
    [originalUseSource,'sub MakeAmount\n'],
    [originalUseSource,'if ($cnt < 20) {'],
    [originalUseSource,'my $t = (-2*$sigma*rand())*(sin(2*3.1415926535*rand()));'],
    [originalUseSource,'$itemcount=MakeAmount($item->{count}*$count,$item->{proba});'],
    [originalUseSource,'$USE->{result}->{function_return}=&$itemfunc();'],
    [originalCalcSource,'sub GetItemUseTime\n'],
    [originalCalcSource,'sub UseTime\n'],
    [originalWholeSource,'sub CheckWholeStore\n'],
  ])if(typeof source!=='string'||!source.includes(part))
    reject('original Core behavior changed '+part);
  // Original 5 sword ITEMs' source stock/whole caps and auto COST:
  for(let i=0;i<5;i++){
    const id=codes[i];
    const segment=new RegExp('^@@ITEM[^\\n]*\\n\\s*no\\s+'+id+
      '\\b([\\s\\S]*?)(?=^@@ITEM|^@@EVENT|^@@END|\\z)','mi');
    const raw=segment.exec(itemDsl)?.[1];
    if(!raw||!new RegExp('^\\s*limit\\s+'+maximum[i]+'\\s*$','m').test(raw)||
       !new RegExp('^\\s*price\\s+'+(originalCost[i]*10)+'\\s*$','m').test(raw)||
       !/^\s*plus\s+-1h\s*$/m.test(raw)||
       /^\s*cost\s+/m.test(raw))
      reject('source #'+id+' default cost, limit or PLUS changed');
  }
  return frozen({
    source:B63_MAP_SOURCE,underlying:B62_MAP_SOURCE,
    itemId:14,originalUseNo:0,
    probabilities:chance,items:codes,
    limits:maximum,cost:originalCost,
    doubledInputCount:20,normalInputCount:10,
    originalLostbookThreshold:100,originalDoubleThreshold:100,
    scope:'source-verified first USE all five sword GET, Gaussian doubled MakeAmount and real original map destruction; not repeated USE, overflow, other showcase or public HTTP',
  });
}
