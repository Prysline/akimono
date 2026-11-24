/**
 * B-53: SOURCE-REVIEWED compiled EVENT *catalog* for Standard Street.
 * This does NOT run event callbacks, change a running market, or commit a turn.
 * Frozen inc-makeitem.cgi GetNumber('10%') -> 100 and a later START -1
 * removes that event from the compiled runtime list.
 * The original EVENT hash loop order is NOT declaration order. Never feed
 * these ordered records directly into a purported faithful turn engine.
 */
import {parseDsl} from './parse-dsl.mjs';
import {parseSourceNumber} from './standard-street-model.mjs';
export const B53_EVENT_CATALOG_SOURCE='standard-street-source-compiled-event-declarations';
const fail=x=>{throw new RangeError('B-53 original compiled EVENT definitions: '+x);};
const first=(b,k)=>b.fields[k]?.[0]?.value;
const last=(b,k)=>b.fields[k]?.at(-1)?.value;
const freeze=x=>{
  if(x&&typeof x==='object'&&!Object.isFrozen(x)){
    Object.values(x).forEach(freeze);Object.freeze(x);
  }
  return x;
};
function number(raw,kind){
  if(typeof raw!=='string'||!/^[-]?(?:\d+)(?:\.\d+)?%?$/.test(raw))
    fail('unreviewed original '+kind+' expression '+raw);
  const rate=raw.endsWith('%')?10:1;
  const n=Number(raw.replace('%',''))*rate;
  if(!Number.isSafeInteger(n)||n< -1)
    fail('unreviewed original '+kind+' range '+raw);
  return n;
}
function time(raw,label){
  if(raw===undefined)return 0;
  if(!/^\d+(?:\.\d+)?[mhd]?$/i.test(raw))
    fail('unreviewed original '+label+' expression '+raw);
  return parseSourceNumber(raw);
}
export function reviewOriginalCompiledEventCatalog({
  itemDsl,rebelDsl,compilerSource,turnSource,
}){
  for(const [value,marker]of [
    [compilerSource,'$g_event->{startproba}=GetNumber($1);'],
    [compilerSource,"if($2 eq '%'){$num*=10;}"],
    [compilerSource,'$g_event_no++;'],
    [compilerSource,'$g_event->{group}=$g_event_no;'],
    [compilerSource,'print EOUT "\'$s\',\\n" if $event->{startproba}!=-1;'],
    [compilerSource,'$g_event->{basetime}=GetTime($1);'],
    [compilerSource,'$g_event->{plustime}=GetTime($1);'],
    [turnSource,'foreach my $key (keys(%EVENT))'],
    [turnSource,'if(rand(100000)<$timespan*$E->{startproba}/864 || $E->{startproba}==0)'],
  ])if(typeof value!=='string'||!value.includes(marker))
    fail('frozen original source drift '+marker);
  const parsed=[
    parseDsl(itemDsl,'custom/inc-item-data.cgi'),
    parseDsl(rebelDsl,'custom/inc-rebel-data.cgi'),
  ];
  if(parsed.some(p=>p.issues.length))fail('original DSL parse issue');
  const blocks=parsed.flatMap(p=>p.blocks.filter(x=>x.kind==='EVENT'));
  if(blocks.length!==25)fail('Standard Street source must declare exactly 25 EVENTs');
  const names=new Set();
  const declared=blocks.map((b,ordinal)=>{
    const code=first(b,'code');
    if(typeof code!=='string'||!/^[a-z][\w-]*$/.test(code)||names.has(code))
      fail('missing or repeated original EVENT code');
    names.add(code);
    const starts=b.fields.start??[];
    if(!starts.length)fail('missing EVENT START '+code);
    const startProba=number(last(b,'start'),'START '+code);
    if(startProba>1000)fail('unsupported source EVENT chance '+code);
    const group=first(b,'group')??String(ordinal+1);
    if(typeof group!=='string'||!group||group.length>100)
      fail('unknown source EVENT group '+code);
    const baseTimeSeconds=time(first(b,'basetime'),'BASETIME '+code);
    const plusTimeSeconds=time(first(b,'plustime'),'PLUSTIME '+code);
    const callbacks=Object.freeze({
      start:first(b,'startfunc')??null,
      end:first(b,'endfunc')??null,
      now:first(b,'func')??null,
    });
    return Object.freeze({
      code,ordinal:ordinal+1,group,startProba,
      startRaw:starts.map(row=>row.value),
      baseTimeSeconds,plusTimeSeconds,
      callbacks,
      parameterRows:(b.fields.param??[]).map(x=>x.value),
      compiled:startProba!==-1,
      sourceFile:b.file,sourceLine:b.startLine,
      runtimeSupported:false,
    });
  });
  const compiled=declared.filter(x=>x.compiled);
  if(compiled.length!==17||
     compiled.filter(x=>x.startProba===0).length!==2||
     compiled.filter(x=>x.startProba>0).length!==15||
     !compiled.some(x=>x.code==='rebel'&&x.startProba===0&&x.callbacks.now==='_local_')||
     !compiled.some(x=>x.code==='guildbattle'&&x.startProba===0&&x.callbacks.end==='_local_')||
     !declared.some(x=>x.code==='priceup-yakusou'&&
       x.startRaw.join(',')==='50%,-1'&&!x.compiled))
    fail('original compiled EVENT set changed; review all callbacks before runtime');
  return freeze({
    source:B53_EVENT_CATALOG_SOURCE,
    declared,compiled,
    declaredCount:declared.length,compiledCount:compiled.length,
    manuallyDisabledCount:declared.length-compiled.length,
    zeroStartCount:2,positiveStartCount:15,
    runtimeSupported:false,
    scope:'source-reviewed EVENT declarations and compiler percent/disable semantics only, not EVENT execution or hash traversal order',
  });
}
