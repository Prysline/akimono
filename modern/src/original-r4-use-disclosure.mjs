/** Frozen CheckUseItem disclosure, not a transaction gate. */
import {createHash} from 'node:crypto';
import {parseDsl} from './parse-dsl.mjs';
const pins={
  "itemDsl": "7a18185e98b32aee82ca1ce30d6f3c395157dbcb",
  "listSource": "9b4db56d6702d6b3475af0331fdcf1a27ed8d3c8",
  "formSource": "7ec2c01829c20e78feec53a1ed410ad7254b21c7",
  "submitSource": "bf895cb9c4672fe984cc9be352d52a856d3ac4e3",
  "useSource": "1bf4537cc41e344c144d840d43175c4c232765bb",
  "compilerSource": "1da8cce1e76ad6159325a37faec68efaa82c7f69",
  "helperSource": "bb0244748088be0c5f1d24de7f9f7f05225278cb"
};
const reviews=new WeakMap();
const fail=m=>{throw new RangeError('R4 original USE disclosure: '+m)};
const field=(b,k)=>b.fields[k]?.at(-1)?.value;
const literal=v=>{
  if(typeof v!=='string'||!v||/[\s'",\\$\x00-\x1f]/.test(v))fail('unreviewed literal');
  return v;
};
export function reviewOriginalUseDisclosure(sources){
  for(const [key,sha] of Object.entries(pins)){
    const s=sources[key];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+key);
  }
  const p=parseDsl(sources.itemDsl,'custom/inc-item-data.cgi');
  if(p.issues.length||p.counts.items!==79||p.counts.uses!==116)fail('source inventory');
  const items=p.blocks.filter(b=>b.kind==='ITEM'),byToken=new Map(),ids=new Set();
  const jobs=new Map(p.blocks.find(b=>b.kind==='DEFINE').fields.job.map(x=>{
    const [code,name]=x.value.split(/\s+/);return [name,code];
  }));
  for(const b of items){
    const id=Number(field(b,'no'));
    if(!Number.isSafeInteger(id)||id<1||id>79||ids.has(id))fail('item number');
    ids.add(id);
    for(const token of [literal(field(b,'name')),literal(field(b,'code'))]){
      if(byToken.has(token)&&byToken.get(token)!==id)fail('ambiguous item token');
      byToken.set(token,id);
    }
  }
  const records=[];let materialCount=0,jobCallbacks=0,beforeCallbacks=0;
  for(const b of items){
    const itemId=Number(field(b,'no'));
    const uses=p.blocks.filter(u=>u.kind==='USE'&&u.ownerItemLine===b.startLine);
    for(const [useId,u] of uses.entries()){
      // Pinned compiler job callbacks change only time/exptime; neither
      // exact nor fallback selection changes this source material gate.
      for(const j of u.fields.job??[]){
        const [name,expr]=j.value.split(/\s+/),code=jobs.get(name);
        if(!code||expr!=='times/job_'+code+'_time_rate')fail('unreviewed job callback');
        jobCallbacks++;
      }
      // Sword market before callback always returns zero and changes only
      // request-local create counts/resultok. Neither is read by the list
      // or form, so this projection does not sample RNG. Submit unchanged.
      if(u.fields.funcb){
        if(itemId!==14||useId!==0||field(u,'funcb')!=='_local_')fail('unreviewed before callback');
        beforeCallbacks++;
      }
      const materials=[...(u.fields.use??[]),...(u.fields.need??[])].sort((a,b)=>a.line-b.line).map(x=>{
        const [amount,token]=x.value.split(/\s+/),count=Number(amount);
        const id=byToken.get(token)??(/^\d+$/.test(token)?Number(token):0);
        if(!ids.has(id)||!Number.isSafeInteger(count)||count<1)fail('unreviewed material');
        materialCount++;
        return {id,count};
      });
      records.push({itemId,useId,name:literal(field(u,'name')),materials});
    }
  }
  if(records.length!==116||materialCount!==242||jobCallbacks!==42||beforeCallbacks!==1)fail('source coverage');
  const reviewed=Object.freeze({source:'r4-frozen-use-disclosure.v1',count:records.length,materialCount,jobCallbacks,beforeCallbacks});
  reviews.set(reviewed,records);return reviewed;
}
export function listOriginalUseDisclosure({reviewed,shop}){
  const records=reviews.get(reviewed);
  if(!records)fail('source review required');
  if(shop&&(!Array.isArray(shop.item)||shop.item.length!==79||!shop.item.every(n=>Number.isSafeInteger(n)&&n>=0)))fail('source stock');
  return records.map(({itemId,useId,name,materials})=>{
    // NEED rows are also checked; no implicit owned-item, money, time,
    // experience or external-world restriction is added to CheckUseItem.
    const sourceUseOk=Boolean(shop&&materials.every(({id,count})=>shop.item[id-1]>=count));
    const sourceDispOk=false; // no real pinned callback returns 2
    const sourceNameVisible=sourceUseOk||sourceDispOk;
    return {itemId,useId,sourceUseOk,sourceDispOk,sourceNameVisible,sourceDisplayName:sourceNameVisible?name:'？？？？？？？？'};
  });
}
