/**
 * R2 #13 two source-guarded original inline work USEs. B-27 previously
 * checked the frozen Perl _local_1 money + WriteLog body in isolation.
 * This compiler only recognizes those exact two owner/source actions;
 * GameCore still owns all money/time gate/CAS accounting and calls the
 * reviewed callback AFTER original Core UseItem/CheckWholeStore.
 */
import {parseDsl} from './parse-dsl.mjs';
const fail=x=>{throw new RangeError('R2 book work source: '+x);};
const first=(block,key)=>block?.fields?.[key]?.[0]?.value;
export function compileReviewedBookWorkUses({itemDsl,model,limits}){
  if(typeof itemDsl!=='string'||model?.items?.length!==79||
     !Array.isArray(limits)||limits.length!==79)fail('source model');
  const parsed=parseDsl(itemDsl,'custom/inc-item-data.cgi');
  if(parsed.issues.length)fail('original parse issues');
  const item=parsed.blocks.find(b=>
    b.kind==='ITEM'&&first(b,'no')==='13');
  if(!item||first(item,'code')!=='book-work'||
     first(item,'name')!=='資金賺取方法'||
     first(item,'limit')!=='1/1'||first(item,'plus')!=='10h'||
     model.items.find(x=>x.id===13)?.code!=='book-work')
    fail('source work ITEM changed');
  const define=parsed.blocks.find(b=>b.kind==='DEFINE');
  if(first(define,'itemusetimerate')!=='0.5'||
     !(define.fields.set??[]).some(x=>
       /^job_peddle_time_rate\s+1\.5$/.test(x.value))||
     !(define.fields.job??[]).some(x=>
       /^peddle\s+行腳商人$/.test(x.value)))
    fail('source work clock changed');
  const uses=parsed.blocks.filter(b=>b.kind==='USE'&&
    b.ownerItemLine===item.startLine);
  if(uses.length!==2)fail('source work USE count changed');
  const body=uses[0].raw;
  for(const line of [
    '$DT->{money}+=$USE->{param1}*$count;',
    "my $ret=GetMoneyString($USE->{param1}*$count).'稼ぎました';",
    'WriteLog(0,$DT->{id},"バイトし、$ret");',
    'WriteLog(3,0,$DT->{shopname}."がバイトしたようです");',
    'return $ret;',
  ])if(!body.includes(line))fail('original inline money/log body changed');
  const expected=[
    {time:'4h',name:'發面紙賺錢',param:3000},
    {time:'8h',name:'去當日薪木工賺錢',param:10000},
  ];
  return Object.freeze(uses.map((block,useId)=>{
    const allowed=['time','job','scale','action','name','info',
      'param','func'];
    if(Object.keys(block.fields).length!==allowed.length||
       Object.keys(block.fields).some(x=>!allowed.includes(x))||
       Object.values(block.fields).some(x=>x.length!==1))
      fail('unreviewed work source fields '+useId);
    const exp=expected[useId];
    if(first(block,'time')!==exp.time||
       first(block,'name')!==exp.name||
       first(block,'param')!==String(exp.param)||
       first(block,'job')?.replace(/\s+/g,' ')!==
         '行腳商人 times/job_peddle_time_rate'||
       first(block,'func')!==(useId===0?'_local_':'_local_1')||
       first(block,'action')!=='工作')
      fail('source work USE drift '+useId);
    const seconds=useId===0?7200:14400;
    return Object.freeze({
      supported:true,itemId:13,useId,
      source:'original-reviewed-book-work-inline',
      sourceFile:'custom/inc-item-data.cgi',sourceLine:block.startLine,
      name:exp.name,limits,marketCodec:'source-sparse',
      time:seconds,exptime:seconds,money:0,
      uses:Object.freeze([]),creates:Object.freeze([]),
      requiresOwnedItem:true,ownedMaximum:1,
      jobTimeModifier:Object.freeze({
        job:'peddle',numerator:2,denominator:3,
      }),
      inlineCallback:Object.freeze({
        kind:'book-work',param:exp.param,
      }),
      scope:'original #13 fixed inline money and logs; separately gated durable source',
    });
  }));
}
