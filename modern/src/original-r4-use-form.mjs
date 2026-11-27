/** Frozen item-m.cgi form and inc-makeitem.cgi literal metadata.
 * This is a read-only description of an existing reviewed USE quote.
 * Never changes registry eligibility, command counts, RNG or shop state.
 */
import {createHash} from 'node:crypto';
import {parseDsl} from './parse-dsl.mjs';
import {formatOriginalBalanceDuration} from './original-r4-balance-view.mjs';
const pins={formSource:'7ec2c01829c20e78feec53a1ed410ad7254b21c7',itemDsl:'7a18185e98b32aee82ca1ce30d6f3c395157dbcb',compilerSource:'1da8cce1e76ad6159325a37faec68efaa82c7f69',calcSource:'586354a9a300e26d0e12a4efa512fa25760e3197',configSource:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0'};
const reviews=new WeakMap();
const fail=m=>{throw new RangeError('R4 original USE form: '+m)};
const integer=n=>Number.isSafeInteger(n);
const source='r4-frozen-use-form.v1';
const MAX_COUNT=9999999999;
const field=(b,k)=>b.fields[k]?.at(-1)?.value;
export function reviewOriginalUseForm(sources){
  for(const [key,sha] of Object.entries(pins)){
    const s=sources[key];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+key);
  }
  const p=parseDsl(sources.itemDsl,'custom/inc-item-data.cgi');
  if(p.issues.length||p.counts.items!==79||p.counts.uses!==116)fail('source inventory');
  const def=p.blocks.find(b=>b.kind==='DEFINE'),defaultScale=field(def,'scale');
  const jobs=new Map(def.fields.job.map(x=>x.value.split(/\s+/)));
  const records=new Map();
  const literal=v=>{
    if(typeof v!=='string'||/[\s'",\\$\x00-\x1f]/.test(v))fail('unreviewed display literal');
    return v;
  };
  for(const b of p.blocks.filter(b=>b.kind==='ITEM')){
    const id=Number(field(b,'no'));
    // ClearBuffer(item) resets the USE; ClearBuffer(use) carries scale
    // and action, but does not carry info or arg from the previous USE.
    let scale=literal(field(b,'scale')??defaultScale),action='';
    const uses=p.blocks.filter(u=>u.kind==='USE'&&u.ownerItemLine===b.startLine);
    for(const [useId,u] of uses.entries()){
      if(field(u,'scale')!==undefined)scale=literal(field(u,'scale'));
      if(field(u,'action')!==undefined)action=literal(field(u,'action'));
      const arg=literal(field(u,'arg')??''),info=literal(field(u,'info')??'');
      if(!['','nocount','target|nocount'].includes(arg)||field(u,'argmessage')||field(u,'argselect')||field(u,'funci'))fail('unreviewed form extension');
      const needexp=field(u,'needexp')??'0%',needpoint=field(u,'needpoint')??'0';
      if(!/^\d+%$/.test(needexp)||!/^\d+$/.test(needpoint)||field(u,'needjob')||field(u,'needpop')||field(u,'needevent'))fail('unreviewed form requirement');
      records.set(id+':'+useId,Object.freeze({itemId:id,useId,scale:scale||'回',action:action||'使用',info,noCount:arg.includes('nocount'),target:arg.includes('target'),sourceNeedExperience:Number(needexp.slice(0,-1))*10,sourceNeedPoint:Number(needpoint)}));
    }
  }
  if(records.size!==116||[...records.values()].filter(r=>r.noCount).length!==32)fail('source form count');
  const reviewed=Object.freeze({source,count:records.size});reviews.set(reviewed,{records,jobs});return reviewed;
}
export function describeOriginalUseForm({reviewed,offer,rule,shop,nowSeconds}){
  const r=reviews.get(reviewed);
  if(!r)fail('source review required');
  const row=r.records.get(offer?.itemId+':'+offer?.useId);
  if(!row||rule?.itemId!==row.itemId||rule.useId!==row.useId||
     offer.moneyPerUse!==rule.money||!integer(offer.timePerUseSeconds)||offer.timePerUseSeconds<0||
     !integer(offer.proficiency)||offer.proficiency<0||offer.proficiency>1000||
     !integer(offer.requiredProficiency)||offer.requiredProficiency<0||
     !Array.isArray(rule.uses))fail('existing source quote identity');
  const time=offer.timePerUseSeconds;
  const materials=rule.uses.map(x=>{
    const {itemId,countPerUse,probabilityPermille}=x;
    const owned=shop?.item?.[itemId-1]??0;
    if(!integer(itemId)||itemId<1||itemId>79||!integer(countPerUse)||countPerUse<1||
       !integer(probabilityPermille)||probabilityPermille<0||probabilityPermille>1000||
       !integer(owned)||owned<0)fail('source material');
    return {itemId,count:countPerUse,owned,probabilityPermille,
      consumptionLabel:probabilityPermille===0?'不使用':probabilityPermille===1000?'消耗':'耗損率'+probabilityPermille/10+'%'};
  });
  let sourceMaximum=null,options=[];
  if(shop&&!row.noCount){
    if(![shop.money,shop.time,nowSeconds,rule.money].every(integer))fail('source form clock/cash');
    const money=rule.money?Math.trunc(shop.money/rule.money):MAX_COUNT;
    const stockTime=Math.min(nowSeconds-shop.time,259200);
    const timeLimit=time?Math.trunc(stockTime/time):MAX_COUNT;
    const materialLimit=materials.reduce((n,x)=>x.probabilityPermille?Math.min(n,Math.trunc(x.owned/x.count)):n,MAX_COUNT);
    sourceMaximum=Math.min(money,timeLimit,materialLimit);
    const presets=[1,2,3,5,10,20,50,100,1000,10000];
    const labels=new Map(presets.map(n=>[n,String(n)]));
    // Original assignment order matters when two maxima coincide.
    labels.set(money,money+'(資金最多)');labels.set(timeLimit,timeLimit+'(時間最多)');labels.set(materialLimit,materialLimit+'(材料最多)');
    let old=0;
    if(offer.canUse)for(const count of [...presets,timeLimit,money,materialLimit].sort((a,b)=>a-b)){
      // Frozen item-m.cgi stops on the first duplicate (not continue).
      if(count>sourceMaximum||count===old)break;
      options.push({count,label:labels.get(count)});old=count;
    }
  }
  // item-m.cgi reports every failed condition in this order. Modern
  // execution restrictions (owned map, external policy, CAS, etc.) are
  // separate. Pinned DSL has no needjob/needpop/needevent declarations.
  const sourceFormRejections=[];
  if(shop&&offer.sourceUseOk!==false){
    if(rule.money&&shop.money<rule.money)sourceFormRejections.push({code:'money',label:'資金不足'});
    if(shop.time+time>nowSeconds)sourceFormRejections.push({code:'time',label:'時間不足'});
    if(offer.proficiency<row.sourceNeedExperience)sourceFormRejections.push({code:'experience',label:'熟練度不足'});
    if(row.sourceNeedPoint&&(shop.point??0)<row.sourceNeedPoint)sourceFormRejections.push({code:'point',label:'點數不足'});
  }
  const sourceFormAllowed=Boolean(shop&&offer.sourceUseOk!==false&&sourceFormRejections.length===0);
  const requiredJob=rule.needJob?r.jobs.get(rule.needJob):null;
  if(rule.needJob&&!requiredJob)fail('source job label');
  return {source,...row,materials,sourceMaximum,options,sourceFormAllowed,sourceFormRejections,
    timeLabel:formatOriginalBalanceDuration(time),
    proficiencyPercent:Math.trunc(offer.proficiency/10),
    requiredProficiencyPercent:Math.trunc(offer.requiredProficiency/10),
    requiredJob,requiredPoint:rule.needPoint??0,requiredPopularityPercent:Math.trunc((rule.needPopularity??0)/100)};
}
