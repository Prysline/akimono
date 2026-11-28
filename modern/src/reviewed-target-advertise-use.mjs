/**
 * R2 #62/1 source-pinned target advertisement.
 * Memory WorldState only: local HTTP/B-43 are deliberately still single-shop.
 * Both shops are projected into ONE immutable WorldState CAS revision.
 */
import {parseDsl} from './parse-dsl.mjs';

const fail=x=>{throw new RangeError('R2 target advertisement source: '+x);};
const first=(block,key)=>block?.fields?.[key]?.[0]?.value;
const originalBody=[
  "return '沒辦法指定自己的商店' if ($DT==$DTS);",
  'my $up=int(500*(2-$DTS->{rank}/5000));',
  '$DTS->{rank}+=$up;',
  '$DTS->{rank}=10000 if $DTS->{rank}>10000;',
  'my $ret="進行廣告宣傳後，".$DTS->{shopname}."的人氣上升了".int($up/100)."%";',
  'WriteLog(0,$DT->{id},$ret);',
  'WriteLog(3,0,$DT->{shopname}."對".$DTS->{shopname}."進行了廣告宣傳。");',
  'return $ret;',
];

export function compileReviewedTargetAdvertiseUse({itemDsl,model,limits,jobFallback=null}){
  if(typeof itemDsl!=='string'||model?.items?.length!==79||
     !Array.isArray(limits)||limits.length!==79)
    fail('source inputs');
  const parsed=parseDsl(itemDsl,'custom/inc-item-data.cgi');
  if(parsed.issues.length)fail('original DSL parse issues');
  const item=parsed.blocks.find(b=>b.kind==='ITEM'&&first(b,'no')==='62');
  if(!item||first(item,'code')!=='cm'||
     first(item,'name')!=='廣告包'||
     first(item,'limit')!=='1/1'||
     model.items.find(x=>x.id===62)?.code!=='cm'||
     limits[61]?.limit!==1)
    fail('ITEM #62 source drift');
  const uses=parsed.blocks.filter(b=>b.kind==='USE'&&
    b.ownerItemLine===item.startLine);
  if(uses.length!==3)fail('ITEM #62 USE count drift');
  const block=uses[1];
  const fields=['time','exp','name','info','arg','use','func'];
  const keys=Object.keys(block.fields);
  if(keys.length!==fields.length||keys.some(k=>!fields.includes(k))||
     Object.values(block.fields).some(rows=>rows.length!==1)||
     first(block,'time')!=='10h'||
     first(block,'exp')!=='0%'||
     first(block,'name')!=='推出他人商店的廣告'||
     first(block,'info')!=='提高他人商店的人氣'||
     first(block,'arg')!=='target|nocount'||
     first(block,'use')?.replace(/\s+/g,' ')!=='1 廣告包'||
     first(block,'func')!=='_local_')
    fail('ITEM #62 USE #1 source declaration drift');
  const match=block.raw.match(/^\s*func\s+_local_\s*\n([\s\S]*?)^\s*_local_\s*$/m);
  const lines=match?.[1].split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(!lines||lines.length!==originalBody.length||
     lines.some((line,i)=>line!==originalBody[i]))
    fail('ITEM #62 USE #1 original Perl callback drift');
  const define=parsed.blocks.find(b=>b.kind==='DEFINE');
  if(first(define,'itemusetimerate')!=='0.5')
    fail('original USE time rate drift');
  return Object.freeze({
    supported:true,itemId:62,useId:1,
    source:'original-reviewed-target-advertisement-memory-only',
    sourceFile:'custom/inc-item-data.cgi',sourceLine:block.startLine,
    name:first(block,'name'),limits,marketCodec:'source-sparse',
    time:18000,exptime:18000,money:0,singleUseOnly:true,
    requiresOwnedItem:true,ownedMaximum:1,
    uses:Object.freeze([Object.freeze({
      itemId:62,countPerUse:1,probabilityPermille:1000,
    })]),creates:Object.freeze([]),
    ...(jobFallback?.get(62,1)?{fallbackJobTimeModifier:jobFallback.get(62,1)}:{}),
        inlineCallback:Object.freeze({kind:'advertise-other'}),
    scope:'source #62/1 two-shop memory CAS only; no RNG/EXP; no HTTP authentication or B-43 multi-shop persistence',
  });
}

export function projectOriginalTargetAdvertisement({rule,shop,target,count}){
  if(rule?.itemId!==62||rule.useId!==1||
     rule.inlineCallback?.kind!=='advertise-other'||count!==1||
     !shop||!target||!Number.isSafeInteger(shop.id)||shop.id<1||
     !Number.isSafeInteger(target.id)||target.id<1||
     shop.id===target.id||typeof shop.shopname!=='string'||
     typeof target.shopname!=='string'||
     !Number.isSafeInteger(target.rank)||
     target.rank<0||target.rank>10000)
    fail('target callback inputs');
  const up=Math.trunc(500*(2-target.rank/5000));
  const rank=Math.min(10000,target.rank+up);
  const returned='進行廣告宣傳後，'+target.shopname+
    '的人氣上升了'+Math.trunc(up/100)+'%';
  return Object.freeze({
    rank,returned,
    logCalls:Object.freeze([
      Object.freeze([0,shop.id,returned]),
      Object.freeze([3,0,shop.shopname+'對'+target.shopname+'進行了廣告宣傳。']),
    ]),
  });
}
