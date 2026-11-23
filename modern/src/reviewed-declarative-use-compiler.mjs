/**
 * Source-guarded declarative USE compiler: #10 writing, #37 training,
 * #39 dismantling/packing and source-gated #15/#16/#17 plus #20-#23 initial iron/steel manufacturing.
 * Reviewed source #15/1,3,4 lostbook callbacks use exact 25/50 permille.
 * No Perl is executed in the live GameCore. A changed/unknown DSL field,
 * callback, job formula or item reference fails closed instead of running.
 */
import {parseDsl} from './parse-dsl.mjs';
import {parseSourceNumber} from './standard-street-model.mjs';

const fail=s=>{throw new RangeError('R2 declarative USE: '+s);};
const groups=Object.freeze(new Map([
  [10,8],[37,4],[39,19],[15,5],[16,2],[17,4],
  [20,4],[21,4],[22,4],[23,4],
]));
const selectedSubset=Object.freeze(new Map([
  [20,new Set([0,1])],[21,new Set([0,1])],
  [22,new Set([0,1])],[23,new Set([0,1])],
]));
const accepted=new Set(['time','exptime','exp','price','name','info',
  'scale','action','okmsg','ngmsg','needexp','job','use','need','get']);
const profession=Object.freeze({
  '書屋':'book','武器屋':'weapon','防具屋':'armor','道具屋':'tool',
  '藥屋':'drug',
});
const first=(b,k)=>b.fields[k]?.[0]?.value;
const safe=(v,label,min=0)=>{
  if(!Number.isSafeInteger(v)||v<min)fail(label);
  return v;
};
function sourceAmount(raw,label){
  if(typeof raw!=='string')fail(label);
  const p=/^([0-9]+(?:\.[0-9]+)?)%$/.exec(raw);
  return safe(p?Number(p[1])*10:parseSourceNumber(raw),label);
}
function sourceAction(entry,model,kind){
  const tokens=entry.value.trim().split(/\s+/);
  if(tokens.length<2||tokens.length>4)fail('unsupported '+kind+' at '+entry.line);
  const count=safe(sourceAmount(tokens[0],kind+' count'),kind+' count',1);
  const named=tokens[1];
  const id=/^[1-9]\d*$/.test(named)?Number(named):
    model.items.find(item=>item.name===named||item.code===named)?.id;
  if(!Number.isSafeInteger(id)||id<1||id>79)
    fail('unresolved source ITEM '+named);
  const probability=kind==='need'?0:
    tokens[2]===undefined?1000:sourceAmount(tokens[2],kind+' probability');
  if(probability>1000)fail('unreviewed probability '+entry.line);
  return Object.freeze({itemId:id,countPerUse:count,
    probabilityPermille:probability});
}
function jobsFor(block,define){
  const jobs=block.fields.job??[];
  if(jobs.length>1)fail('multiple job rules '+block.startLine);
  if(!jobs.length)return undefined;
  const match=/^(\S+)\s+times\/(job_[a-z]+_time_rate)$/.exec(jobs[0].value);
  if(!match)fail('unsupported job function '+jobs[0].value);
  const code=profession[match[1]];
  if(!code||match[2]!==`job_${code}_time_rate`)
    fail('unreviewed job formula');
  const d=(define.fields.set??[]).filter(x=>
    x.value===match[2]+' 1.5'||new RegExp('^'+match[2]+'\\s+1\\.5$').test(x.value));
  const jobRecord=(define.fields.job??[]).filter(x=>
    x.value===code+' '+match[1]||new RegExp('^'+code+'\\s+'+match[1]+'$').test(x.value));
  if(d.length!==1||jobRecord.length!==1)fail('source job rate drift');
  return Object.freeze({job:code,numerator:2,denominator:3});
}
export function compileReviewedDeclarativeUses({itemDsl,model,limits}){
  if(typeof itemDsl!=='string'||model?.items?.length!==79||
     !Array.isArray(limits)||limits.length!==79)
    fail('source DSL/model/79-slot limits');
  const parsed=parseDsl(itemDsl,'custom/inc-item-data.cgi');
  const define=parsed.blocks.find(b=>b.kind==='DEFINE');
  if(!define||first(define,'itemusetimerate')!=='0.5')
    fail('source ItemUseTimeRate changed');
  const output=[];
  for(const [itemId,expectedCount] of groups){
    const item=parsed.blocks.find(b=>b.kind==='ITEM'&&first(b,'no')===String(itemId));
    const ownedLimit=itemId>=20&&itemId<=23?20:40;
    const exactLimit=itemId>=20&&itemId<=23?'20/0.5':'40/1';
    if(!item||model.items.find(x=>x.id===itemId)?.code!==first(item,'code')||
       ([15,16,17,20,21,22,23].includes(itemId)&&
         first(item,'limit')!==exactLimit))
      fail('source owner ITEM/limit '+itemId);
    const uses=parsed.blocks.filter(b=>b.kind==='USE'&&b.ownerItemLine===item.startLine);
    if(uses.length!==expectedCount)fail('source USE count '+itemId);
    // Frozen inc-makeitem.cgi::ClearBuffer(use) carries EXP across USEs
    // of the SAME ITEM; time, exptime, job, use and get reset each USE.
    let inheritedExperience=0;
    for(const [useId,block] of uses.entries()){
      // Unlike standalone USEs, the original compiler carries ITEM EXP
      // through intervening callback-bearing USEs of the SAME ITEM.
      if(selectedSubset.has(itemId)&&
         !selectedSubset.get(itemId).has(useId)){
        if(first(block,'exp')!==undefined)
          inheritedExperience=sourceAmount(first(block,'exp'),'inherited EXP');
        continue;
      }
      for(const [field,rows] of Object.entries(block.fields)){
        const isReviewedPotionCallback=itemId===15&&[1,3,4].includes(useId)&&
          (field==='func'||field==='param');
        if((!accepted.has(field)&&!isReviewedPotionCallback)||
           !['use','need','get'].includes(field)&&rows.length!==1)
          fail('unsupported source USE field '+itemId+'/'+useId+':'+field);
      }
      if(!first(block,'name')||!first(block,'time')||
         !(block.fields.use?.length)&&!(block.fields.need?.length)||
         !(block.fields.get?.length))
        fail('incomplete source recipe '+itemId+'/'+useId);
      const time=Math.trunc(sourceAmount(first(block,'time'),'time')/2);
      const exptime=first(block,'exptime')?
        Math.trunc(sourceAmount(first(block,'exptime'),'exptime')/2):time;
      safe(time,'source time',1);
      safe(exptime,'source exptime',1);
      if(exptime>time)fail('training time exceeds base');
      if(first(block,'exp')!==undefined)
        inheritedExperience=sourceAmount(first(block,'exp'),'exp');
      const ingredients=[
        ...(block.fields.use??[]).map(x=>({...x,kind:'use'})),
        ...(block.fields.need??[]).map(x=>({...x,kind:'need'})),
      ].sort((a,b)=>a.line-b.line)
        .map(x=>sourceAction(x,model,x.kind));
      const created=block.fields.get.map(x=>sourceAction(x,model,'get'));
      const cost=first(block,'price')?
        sourceAmount(first(block,'price'),'price'):0;
      const requiredExperience=first(block,'needexp')?
        sourceAmount(first(block,'needexp'),'needexp'):0;
      const jobTimeModifier=jobsFor(block,define);
      const sourceCallback=itemId===15&&[1,3,4].includes(useId);
      const expectedParam=useId===4?50:25;
      if(sourceCallback&&
         (first(block,'func')!=='lostbook'||
          first(block,'param')!==String(expectedParam)))
        fail('source potion lostbook callback/param drift '+itemId+'/'+useId);
      if(!sourceCallback&&
         (first(block,'func')!==undefined||first(block,'param')!==undefined))
        fail('unreviewed callback appeared '+itemId+'/'+useId);
      const afterCallback=sourceCallback?Object.freeze({
        kind:'lostbook',threshold:expectedParam,consumedCount:1,
        allowLoss:true,
        message:model.items.find(x=>x.id===itemId).name+
          '已經破爛到看不懂，就扔掉了。',
      }):undefined;
      const experienceCallback=inheritedExperience>0?
        Object.freeze({kind:'gain-fixed-exp',points:inheritedExperience}):undefined;
      // The phases match the shared original UseItem implementation. In
      // particular NEED is a zero-probability material gate, not a removal.
      const effectPlan=Object.freeze([
        Object.freeze({type:'source-materials',phase:'materials',
          actions:Object.freeze(ingredients)}),
        Object.freeze({type:'source-production',phase:'make-amount',
          actions:Object.freeze(created)}),
        ...(experienceCallback?[Object.freeze({
          type:'source-proficiency',phase:'experience',
          points:inheritedExperience})]:[]),
      ]);
      output.push(Object.freeze({
        supported:true,itemId,useId,source:'original-declarative-use-dsl',
        sourceFile:'custom/inc-item-data.cgi',sourceLine:block.startLine,
        name:first(block,'name'),uses:Object.freeze(ingredients),
        creates:Object.freeze(created),time,exptime,money:cost,
        needExperience:requiredExperience,
        limits,resultOk:first(block,'okmsg')??null,
        resultNg:first(block,'ngmsg')??null,
        marketCodec:'source-sparse',jobTimeModifier,experienceCallback,
        ...(afterCallback?{afterCallback}:{}),
        ...([15,16,17,20,21,22,23].includes(itemId)?{
          requiresOwnedItem:true,ownedMaximum:ownedLimit,
        }:{}),
        effectPlan,scope:'original callback-free recipe; source MARKET, EXP and job clocks; save provenance separately gated',
      }));
    }
  }
  if(output.length!==50)fail('original reviewed declarative USE total drift');
  return Object.freeze(output);
}
