/**
 * Source-only #77 celebration-party USE and frozen @@FUNCITEM::popup.
 * No game Perl is evaluated in Node; all effect fields are fail-closed.
 */
import {parseDsl} from './parse-dsl.mjs';
const fail=x=>{throw new RangeError('R2 celebration source: '+x);};
const first=(b,k)=>b?.fields?.[k]?.[0]?.value;
const funcTokens=Object.freeze([
  'sub popup',
  'my $up=int($USE->{param1}*(2-$DT->{rank}/5000));',
  '$DT->{rank}+=$up;',
  '$DT->{rank}=10000 if $DT->{rank}>10000;',
  'my $ret=$USE->{param2}."：人氣提升了".int($up/100)."%";',
  'WriteLog(0,$DT->{id},$ret);',
  'WriteLog(3,0,$DT->{shopname}." ".$USE->{param2});',
  'return $ret;',
]);
export function compileReviewedPartyUse({itemDsl,model,limits}){
  if(typeof itemDsl!=='string'||model?.items?.length!==79||
     !Array.isArray(limits)||limits.length!==79)
    fail('source input/model/limits');
  const parsed=parseDsl(itemDsl,'custom/inc-item-data.cgi');
  if(parsed.issues.length)fail('DSL parse issues');
  const item=parsed.blocks.find(b=>b.kind==='ITEM'&&
    first(b,'no')==='77');
  if(!item||first(item,'code')!=='party'||
     first(item,'name')!=='慶祝用套組'||
     first(item,'price')!=='200000'||
     first(item,'limit')!=='1/0'||
     model.items.find(x=>x.id===77)?.code!=='party'||
     limits[76]?.limit!==1)
    fail('source celebration item drift');
  const define=parsed.blocks.find(b=>b.kind==='DEFINE');
  if(first(define,'itemusetimerate')!=='0.5')
    fail('source time rate drift');
  const func=parsed.blocks.find(b=>b.kind==='FUNCITEM');
  const sub=func?.raw.slice(func.raw.indexOf('sub popup'));
  if(!sub)fail('source popup callback absent');
  let pos=0;
  for(const token of funcTokens){
    const p=sub.indexOf(token,pos);
    if(p<0)fail('source popup Perl body drift '+token);
    pos=p+token.length;
  }
  const uses=parsed.blocks.filter(b=>b.kind==='USE'&&
    b.ownerItemLine===item.startLine);
  if(uses.length!==1)fail('original celebration USE count');
  const block=uses[0];
  const allowed=new Set(['time','action','price','name','info',
    'func','param','arg','use']);
  if(Object.keys(block.fields).some(k=>!allowed.has(k))||
     Object.values(block.fields).some(v=>v.length!==1)||
     first(block,'time')!=='4h'||
     first(block,'action')!=='派對開始'||
     first(block,'price')!=='0'||
     first(block,'name')!=='慶祝派對'||
     first(block,'func')!=='popup'||
     first(block,'param')!=='1000,開了派對'||
     first(block,'arg')!=='nocount'||
     first(block,'use')?.replace(/\s+/g,' ')!==
       '1 慶祝用套組 100% 明天的活力正在沸騰')
    fail('original celebration USE declaration drift');
  return Object.freeze({
    supported:true,itemId:77,useId:0,
    source:'original-reviewed-celebration-popup',
    sourceFile:'custom/inc-item-data.cgi',sourceLine:block.startLine,
    name:'慶祝派對',limits,marketCodec:'source-sparse',
    time:7200,exptime:7200,money:0,
    singleUseOnly:true,requiresOwnedItem:true,ownedMaximum:1,
    uses:Object.freeze([Object.freeze({
      itemId:77,countPerUse:1,probabilityPermille:1000,
    })]),creates:Object.freeze([]),
    sourceUseMessages:Object.freeze(['明天的活力正在沸騰']),
    inlineCallback:Object.freeze({
      kind:'party-popularity',points:1000,comment:'開了派對',
    }),
    scope:'exact original popup rank/log source; event and durable provenance remain separate',
  });
}
