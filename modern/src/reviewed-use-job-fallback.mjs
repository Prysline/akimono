/** R4 source clock dispatch. CheckUseItem first resolves the current USE
 * and current job; only if absent, it calls USE #0's job function with
 * the CURRENT USE index. This is not inheritance of recipes or EXP.
 */
import {createHash} from 'node:crypto';
import {parseDsl} from './parse-dsl.mjs';
const fail=s=>{throw new RangeError('R4 USE job fallback: '+s)};
const pin=(text,sha)=>typeof text==='string'&&createHash('sha1').update('blob '+Buffer.byteLength(text)+'\0').update(text).digest('hex')===sha;
export function reviewOriginalUseJobFallback({itemDsl,useSource,compilerSource}){
  if(!pin(itemDsl,'7a18185e98b32aee82ca1ce30d6f3c395157dbcb')||
     !pin(useSource,'1bf4537cc41e344c144d840d43175c4c232765bb')||
     !pin(compilerSource,'1da8cce1e76ad6159325a37faec68efaa82c7f69'))fail('frozen source drift');
  const p=parseDsl(itemDsl,'custom/inc-item-data.cgi');
  const def=p.blocks.find(b=>b.kind==='DEFINE');
  if(p.issues.length||!def)fail('source DSL');
  const jobs=new Map((def.fields.job??[]).map(row=>{
    const [code,name]=row.value.split(/\s+/);return [name,code];
  }));
  const rates=new Map((def.fields.set??[]).map(row=>row.value.split(/\s+/)));
  function explicit(b){
    const rows=b.fields.job??[];
    if(rows.length>1)fail('multiple source job functions');
    if(!rows.length)return null;
    const match=/^(\S+)\s+times\/(job_[a-z]+_time_rate)$/.exec(rows[0].value);
    const job=match&&jobs.get(match[1]);
    if(!job||match[2]!==('job_'+job+'_time_rate')||rates.get(match[2])!=='1.5')fail('unreviewed source job function');
    return Object.freeze({job,numerator:2,denominator:3});
  }
  const fallback=new Map();
  for(const item of p.blocks.filter(b=>b.kind==='ITEM')){
    const id=Number(item.fields.no?.[0]?.value);
    const uses=p.blocks.filter(b=>b.kind==='USE'&&b.ownerItemLine===item.startLine);
    if(!uses.length)continue;
    const first=explicit(uses[0]);
    for(const [useId,b] of uses.entries()){
      const current=explicit(b);
      if(useId>0&&first&&first.job!==current?.job)fallback.set(id+':'+useId,first);
    }
  }
  return Object.freeze({count:fallback.size,get:(itemId,useId)=>fallback.get(itemId+':'+useId)});
}
