/**
 * B-25: exact CheckUseItem / GetUseItem / GetUseItemListSub CONTROL FLOW
 * from unmodified pinned Core plug/use.cgi, with explicitly bounded
 * synthetic callbacks. Do NOT run the real compiled DSL, a dynamic require,
 * or an arbitrary JS function. The callback effects below are only fixture
 * representations of side effects verified against ORIGINAL Perl test stubs.
 *
 * Job-specific function (if defined) runs first; fallback only when absent.
 * The job function may mutate the USE record before functionbefore lookup.
 * functionbefore return 2 means display-only; 1 means rejected; other
 * numeric values fall through to each material's original per-row check.
 * The Get* wrappers only SET flags; they do not clear stale flags.
 */
const MAX_SLOTS=79,MAX_USES=116,MAX_EFFECTS=12;
function fail(message){throw new RangeError('Unrepresentable B-25 fixture: '+message);}
function integer(value,name,{min=-Number.MAX_SAFE_INTEGER,max=Number.MAX_SAFE_INTEGER}={}){
  if(typeof value!=='number'||!Number.isSafeInteger(value)||value<min||value>max)
    fail(name);
  return value;
}
function identifier(value,name,{optional=false}={}){
  if(typeof value!=='string'||value.length>128||
     (!optional&&!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value))||
     (optional&&value!==''&&!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)))
    fail(name);
  return value;
}
function flag(value,name){
  if(value!==undefined&&value!==0&&value!==1)fail(name);
  return value;
}
function setupUse(use,stockLen){
  if(!use||typeof use!=='object')fail('use record');
  const no=integer(use.no,'use no',{min:0,max:MAX_USES});
  const functionbefore=identifier(use.functionbefore??'','functionbefore',{optional:true});
  if(!Array.isArray(use.materials)||use.materials.length>79)fail('material records');
  const materials=use.materials.map((m)=>{
    if(!m||typeof m!=='object')fail('material');
    const itemId=integer(m.itemId,'material id',{min:1,max:stockLen});
    const count=integer(m.count,'material count');
    return {itemId,count};
  });
  const record={no,functionbefore,materials};
  if(use.dispok!==undefined)record.dispok=flag(use.dispok,'dispok');
  if(use.useok!==undefined)record.useok=flag(use.useok,'useok');
  return record;
}
function setupFunctionMap(raw,name){
  if(raw===undefined)return Object.create(null);
  if(!raw||typeof raw!=='object'||Array.isArray(raw))fail(name);
  const funcs=Object.create(null);
  for(const [key,spec] of Object.entries(raw)){
    if(!/^item::[A-Za-z_][A-Za-z0-9_]*$/.test(key))fail('function symbol');
    if(!spec||typeof spec!=='object'||Array.isArray(spec))fail('function fixture');
    const effects=spec.effects??[];
    if(!Array.isArray(effects)||effects.length>MAX_EFFECTS)fail('function effects');
    funcs[key]={returnValue:spec.returnValue,effects:effects.map(effect=>{
      if(!effect||typeof effect!=='object')fail('effect record');
      if(effect.op==='set-material-count'){
        return {op:effect.op,index:integer(effect.index,'material index',{min:0,max:78}),
          value:integer(effect.value,'material count effect')};
      }
      if(effect.op==='set-stock'){
        return {op:effect.op,itemId:integer(effect.itemId,'effect stock item',{min:1,max:MAX_SLOTS}),
          value:integer(effect.value,'effect stock value')};
      }
      if(effect.op==='set-functionbefore'){
        return {op:effect.op,name:identifier(effect.name,'new functionbefore',{optional:true})};
      }
      if(effect.op==='set-flag'){
        if(effect.name!=='dispok'&&effect.name!=='useok')fail('effect flag');
        return {op:effect.op,name:effect.name,value:flag(effect.value,'effect flag value')};
      }
      fail('unreviewed effect operation');
    })};
    if(spec.returnValue!==undefined)
      integer(spec.returnValue,'function returnValue');
  }
  return funcs;
}
function applyEffects(spec,record,stock){
  for(const fx of spec.effects){
    if(fx.op==='set-material-count'){
      if(fx.index>=record.materials.length)fail('material effect index out of range');
      record.materials[fx.index].count=fx.value;
    }else if(fx.op==='set-stock'){
      if(fx.itemId>stock.length)fail('stock effect id out of range');
      stock[fx.itemId-1]=fx.value;
    }else if(fx.op==='set-functionbefore'){
      record.functionbefore=fx.name;
    }else if(fx.op==='set-flag'){
      record[fx.name]=fx.value;
    }
  }
}
function freezeRecords(records){
  return Object.freeze(records.map(r=>Object.freeze({
    ...r,materials:Object.freeze(r.materials.map(m=>Object.freeze({...m}))),
  })));
}
/**
 * Modes:
 *  - list: source GetUseItemListSub, runs CheckUseItem on every record
 *  - get: source GetUseItem, checks only first matching use.no
 *
 * jobFunctions and beforeFunctions are named, fixed synthetic *declarations*,
 * not executable functions; direct Perl tests verify their limited effects.
 * No result of this projected UI eligibility authorizes a transaction.
 */
export function projectOriginalUseEligibility({
  stock,job,uses,mode='list',requestedNo,
  jobFunctions,beforeFunctions,
}){
  if(!Array.isArray(stock)||stock.length<1||stock.length>MAX_SLOTS)fail('stock slots');
  const inventory=stock.map((v,i)=>integer(v,'stock slot '+i));
  identifier(job,'job');
  if(!Array.isArray(uses)||uses.length>MAX_USES)fail('use actions');
  const records=uses.map(v=>setupUse(v,inventory.length));
  if(mode!=='list'&&mode!=='get')fail('mode');
  if(mode==='get')integer(requestedNo,'requestedNo',{min:0,max:MAX_USES});
  const jobs=setupFunctionMap(jobFunctions,'jobFunctions');
  const befores=setupFunctionMap(beforeFunctions,'beforeFunctions');
  const trace=[];
  const statuses=[];
  let selected=null;
  for(let i=0;i<records.length;i++){
    const record=records[i];
    if(mode==='get'&&record.no!==requestedNo)continue;
    const exact='item::_job_use_'+record.no+'_'+job+'_';
    const fallback='item::_job_use_0_'+job+'_';
    let invoked=null;
    if(Object.hasOwn(jobs,exact))invoked=exact;
    else if(Object.hasOwn(jobs,fallback))invoked=fallback;
    if(invoked!==null){
      applyEffects(jobs[invoked],record,inventory);
      trace.push(Object.freeze({useNo:record.no,phase:'job',symbol:invoked}));
    }
    const before=record.functionbefore; // source looks up AFTER job effect
    let status=null;
    if(before!==''){
      const key='item::'+before;
      // In original Perl a missing named symbol throws "Undefined subroutine".
      // Fail closed for fixtures: never silently treat it as a no-op.
      if(!Object.hasOwn(befores,key))fail('unresolved original functionbefore '+key);
      const fn=befores[key];
      applyEffects(fn,record,inventory);
      trace.push(Object.freeze({useNo:record.no,phase:'functionbefore',
        symbol:key,returnValue:fn.returnValue??0}));
      if(fn.returnValue===2)status=2;
      else if(fn.returnValue===1)status=0;
    }
    if(status===null){
      status=1;
      for(const material of record.materials){
        const available=inventory[material.itemId-1];
        trace.push(Object.freeze({useNo:record.no,phase:'material',
          itemId:material.itemId,required:material.count,available}));
        if(available<material.count){status=0;break;}
      }
    }
    // Source GetUseItem / GetUseItemListSub only set the successful flag.
    if(status===2)record.dispok=1;
    if(status===1)record.useok=1;
    statuses.push(Object.freeze({no:record.no,status}));
    if(mode==='get'){
      selected=i;
      break;
    }
  }
  const out=freezeRecords(records);
  return Object.freeze({
    mode,requestedNo:mode==='get'?requestedNo:null,
    records:out,selectedIndex:selected,
    selected:mode==='get'?(selected===null?0:out[selected]):null,
    stock:Object.freeze([...inventory]),statuses:Object.freeze(statuses),
    trace:Object.freeze(trace),
    scope:'pinned Core CheckUseItem/GetUseItem control flow and synthetic named callback effects only; no DSL, item execution, CGI or persistence',
  });
}
