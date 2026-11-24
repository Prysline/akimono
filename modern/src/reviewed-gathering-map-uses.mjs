/**
 * R2 source-guarded #12 mountain and #9 mine maps (seven gathering USEs).
 * Compiles only reviewed original DSL shapes; never executes Perl at runtime.
 * Durable save provenance for gathering outcomes remains separately gated.
 */
import {parseDsl} from './parse-dsl.mjs';
import {parseSourceNumber} from './standard-street-model.mjs';
const fail=s=>{throw new RangeError('R2 gathering map USE: '+s);};
const first=(b,k)=>b.fields[k]?.[0]?.value;
const accepted=new Set([
  'time','exptime','exp','job','scale','action','name','info','ngmsg',
  'func','param','get',
]);
function sourceOutput(entry,model){
  const parts=entry.value.trim().split(/\s+/);
  if(parts.length<3||parts.length>4)
    fail('unreviewed GET fields at '+entry.line);
  const count=parseSourceNumber(parts[0]);
  const chance=/^([0-9]+(?:\.[0-9]+)?)%$/.exec(parts[2]);
  const probability=chance?Number(chance[1])*10:NaN;
  const itemId=model.items.find(x=>x.name===parts[1])?.id;
  if(!Number.isSafeInteger(itemId)||!Number.isSafeInteger(count)||
     count<1||!Number.isSafeInteger(probability)||
     probability<0||probability>1000)
    fail('unreviewed source GET at '+entry.line);
  return {effect:Object.freeze({itemId,countPerUse:count,
    probabilityPermille:probability}),message:parts[3]??''};
}
export function compileReviewedGatheringMapUses({itemDsl,model,limits}){
  if(typeof itemDsl!=='string'||model?.items?.length!==79||
     !Array.isArray(limits)||limits.length!==79)
    fail('source DSL and 79 ITEM limits required');
  const parsed=parseDsl(itemDsl,'custom/inc-item-data.cgi');
  const define=parsed.blocks.find(b=>b.kind==='DEFINE');
  if(!define||first(define,'itemusetimerate')!=='0.5'||
     !(define.fields.set??[]).some(x=>/^job_material_time_rate\s+1\.5$/.test(x.value))||
     !(define.fields.job??[]).some(x=>/^material\s+山師$/.test(x.value)))
    fail('source time or mountain profession declaration drift');
  const result=[];
  for(const [itemId,count,code,outputs] of [
    [12,4,'book-mtsearch',[1,2,3,4]],
    [9,3,'book-metalsearch',[5,6,7]],
  ]){
    const item=parsed.blocks.find(b=>b.kind==='ITEM'&&first(b,'no')===String(itemId));
    const modelItem=model.items.find(x=>x.id===itemId);
    if(!item||first(item,'code')!==code||first(item,'limit')!=='3/3'||
       modelItem?.code!==code||modelItem?.limitRaw!=='3/3')
      fail('source map owner/limit drift '+itemId);
    const uses=parsed.blocks.filter(b=>b.kind==='USE'&&b.ownerItemLine===item.startLine);
    if(uses.length!==count)fail('source map USE count drift '+itemId);
    for(const [useId,block] of uses.entries()){
      for(const [field,entries] of Object.entries(block.fields)){
        if(!accepted.has(field)||(field!=='get'&&entries.length!==1))
          fail('unreviewed field '+itemId+'/'+useId+':'+field);
      }
      if(!first(block,'name')||first(block,'time')!=='2h'||
         first(block,'exptime')!=='30m'||first(block,'exp')!=='2%'||
         first(block,'func')!=='lostbook'||first(block,'param')!=='10'||
         block.fields.get?.length!==outputs.length||
         (useId===0?!/^山師\s+times\/job_material_time_rate$/.test(first(block,'job')??''):
           first(block,'job')!==undefined))
        fail('source gathering USE/callback drift '+itemId+'/'+useId);
      const rows=block.fields.get.map(x=>sourceOutput(x,model));
      if(rows.map(x=>x.effect.itemId).join(',')!==outputs.join(','))
        fail('gathering output ITEM set drift '+itemId+'/'+useId);
      const creates=Object.freeze(rows.map(x=>x.effect));
      const outputMessages=Object.freeze(Object.fromEntries(rows.map(x=>[
        x.effect.itemId,x.message,
      ])));
      result.push(Object.freeze({
        supported:true,itemId,useId,source:'original-gather-lostbook-use-dsl',
        sourceFile:'custom/inc-item-data.cgi',sourceLine:block.startLine,
        name:first(block,'name'),uses:Object.freeze([]),creates,
        time:Math.trunc(parseSourceNumber('2h')/2),
        exptime:Math.trunc(parseSourceNumber('30m')/2),
        money:0,needExperience:0,limits,marketCodec:'source-sparse',
        requiresOwnedItem:true,ownedMaximum:3,
        ...(useId===0?{jobTimeModifier:Object.freeze({
          job:'material',numerator:2,denominator:3,
        })}:{}),
        afterCallback:Object.freeze({
          kind:'lostbook',threshold:10,consumedCount:1,allowLoss:true,
          message:modelItem.name+'已經破爛到看不懂，就扔掉了。',
        }),
        experienceCallback:Object.freeze({kind:'gain-fixed-exp',points:20}),
        outputMessages,resultNg:first(block,'ngmsg')??null,
        scope:'source gathering with lostbook/EXP; durable save source proof pending',
      }));
    }
  }
  if(result.length!==7)fail('original gathering USE count drift');
  return Object.freeze(result);
}
