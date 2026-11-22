/**
 * Original ITEM #63 source-guarded showcase resize USE declarations.
 * Eight explicit nocount options. The source callback only adjusts shelf arrays;
 * shared GameCore still owns the money, clock, material and CAS mutation.
 */
import {parseDsl} from './parse-dsl.mjs';
const bad=msg=>{throw new RangeError('showcase resize source: '+msg);};
const get=(block,key)=>block?.fields?.[key]?.length===1?
  block.fields[key][0].value:null;
export function compileReviewedShowcaseResizeUses({itemDsl,model,limits}){
  if(typeof itemDsl!=='string'||model?.items?.length!==79||
    !Array.isArray(limits)||limits.length!==79)bad('inputs');
  const parsed=parseDsl(itemDsl,'custom/inc-item-data.cgi');
  if(parsed.issues.length)bad('DSL issues');
  const item=parsed.blocks.find(block=>
    block.kind==='ITEM'&&get(block,'no')==='63');
  const itemModel=model.items.find(row=>row.id===63);
  if(!item||itemModel?.name!=='展示架擴建拆卸工具'||
    itemModel?.limitRaw!=='1/1'||get(item,'code')!=='edit-showcase'||
    get(item,'flag')!=='noshowcase|norequest')bad('ITEM #63 changed');
  const uses=parsed.blocks.filter(block=>
    block.kind==='USE'&&block.ownerItemLine===item.startLine);
  if(uses.length!==8)bad('original 1..8 USE count changed');
  const callback=uses[0].raw;
  for(const literal of [
    'my $oldcnt=$DT->{showcasecount};',
    'my $newcnt=$USE->{param1};',
    '$DT->{showcasecount}=$newcnt;',
    '$DT->{showcase}[$_]=0;',
    '$DT->{price}[$_]=0;',
    'splice(@{$DT->{showcase}},$newcnt);',
    'splice(@{$DT->{price}},$newcnt);',
  ])if(!callback.includes(literal))bad('source _local_ callback changed');
  return Object.freeze(uses.map((block,index)=>{
    const count=index+1;
    const allowed=new Set(['time','scale','action','price','name','info',
      'arg','param','use','func']);
    if(Object.keys(block.fields).some(key=>!allowed.has(key))||
      Object.values(block.fields).some(rows=>rows.length!==1))
      bad('unexpected source USE declaration '+count);
    if(get(block,'time')!==count+'h'||
      get(block,'price')!==String(count*10000)||
      get(block,'name')!=='將展示架改為'+count+'個'||
      get(block,'info')!=='將展示架改為'+count+'個'||
      get(block,'arg')!=='nocount'||get(block,'param')!==String(count)||
      get(block,'use')?.replace(/\s+/g,' ')!=='1 展示架擴建拆卸工具'||
      get(block,'func')!==(index===0?'_local_':'_local_1'))
      bad('original USE values changed '+count);
    return Object.freeze({
      supported:true,itemId:63,useId:index,
      source:'original-reviewed-showcase-resize-use',
      sourceFile:'custom/inc-item-data.cgi',sourceLine:block.startLine,
      name:'將展示架改為'+count+'個',
      uses:Object.freeze([Object.freeze({
        itemId:63,countPerUse:1,probabilityPermille:1000,
      })]),
      creates:Object.freeze([]),limits,
      // Frozen Standard Street ItemUseTimeRate=0.5 in inc-makeitem.cgi.
      time:count*1800,exptime:count*1800,money:count*10000,
      marketCodec:'source-sparse',singleUseOnly:true,
      inlineCallback:Object.freeze({kind:'showcase-resize',newCount:count}),
      scope:'exact original #63 USE and inline resize callback; single source tool is consumed',
    });
  }));
}
