/**
 * Original #79 USE #1..#4: declarative, callback-free exchange recipes.
 * Compile from the same frozen 79 ITEM DSL, then execute through the SAME
 * shared GameCore use-item transaction; no product-specific executable code.
 *
 * Explicit recipe signatures guard source drift until a full general
 * declarative USE compiler is source-reviewed.
 */
import {parseDsl} from './parse-dsl.mjs';

const fail=s=>{throw new RangeError('R2 source gift variants: '+s);};
const textField=(b,k)=>b.fields?.[k]?.[0]?.value;
const expected=Object.freeze([
  {useId:1,name:'交換入門書籍組合',gift:5,items:[15,16,17]},
  {useId:2,name:'交換高級書籍組合',gift:10,items:[20,21,22,23]},
  {useId:3,name:'交換修行套組',gift:2,items:[37]},
  {useId:4,name:'交換米諾陶洛斯',gift:1,items:[25]},
]);
const actionFields=['time','action','name','info','okmsg','use','get']
  .sort().join(',');
function resolveValue(raw,model){
  const match=/^([1-9]\d*)\s+(.+)$/.exec(raw??'');
  if(!match)fail('material or GET has unsupported syntax');
  const id=/^\d+$/.test(match[2])?Number(match[2]):
    model.items.find(x=>x.name===match[2])?.id;
  if(!Number.isSafeInteger(id)||id<1||id>79)
    fail('unresolved original ITEM '+String(match[2]));
  return Object.freeze({itemId:id,countPerUse:Number(match[1]),
    probabilityPermille:1000});
}
export function compileReviewedGiftUseVariants({itemDsl,model,giftMap}){
  if(typeof itemDsl!=='string'||!model?.items||giftMap?.itemId!==79||
     giftMap.useNo!==0||giftMap.time!==1800||giftMap.exptime!==1800||
     giftMap.limits?.length!==79)fail('source-reviewed first gift contract');
  const parsed=parseDsl(itemDsl,'custom/inc-item-data.cgi');
  const gift=parsed.blocks.find(b=>b.kind==='ITEM'&&
    textField(b,'no')==='79');
  if(!gift||textField(gift,'code')!=='gift')
    fail('original gift source missing');
  const uses=parsed.blocks.filter(b=>b.kind==='USE'&&
    b.ownerItemLine===gift.startLine);
  if(uses.length!==5)fail('original gift USE count changed');
  return Object.freeze(expected.map(entry=>{
    const block=uses[entry.useId];
    if(!block||Object.keys(block.fields).sort().join(',')!==actionFields||
       textField(block,'time')!=='1h'||
       textField(block,'action')!=='交換'||
       textField(block,'name')!==entry.name||
       textField(block,'okmsg')!=='感謝您的使用'||
       block.fields.use?.length!==1||
       block.fields.get?.length!==entry.items.length)
      fail('unsupported source exchange '+entry.useId+' drift or callback');
    const usesCompiled=block.fields.use.map(x=>resolveValue(x.value,model));
    const creates=block.fields.get.map(x=>resolveValue(x.value,model));
    if(usesCompiled[0].itemId!==79||
       usesCompiled[0].countPerUse!==entry.gift||
       creates.some((v,i)=>v.itemId!==entry.items[i]||v.countPerUse!==1))
      fail('original gift USE '+entry.useId+' recipe drift');
    return Object.freeze({
      supported:true,itemId:79,useId:entry.useId,source:'original-pure-gift-dsl',
      sourceFile:'custom/inc-item-data.cgi',sourceLine:block.startLine,
      name:entry.name,
      uses:Object.freeze(usesCompiled),
      creates:Object.freeze(creates),
      time:giftMap.time,exptime:giftMap.exptime,money:0,
      limits:giftMap.limits,resultOk:'感謝您的使用',
      marketCodec:'gift',
      scope:'original source callback-free exchange via shared USE; no profession/EVENT dependency',
    });
  }));
}
