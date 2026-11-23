/**
 * R2 item #78: source-reviewed fourteen Standard Street career-change USEs.
 * Frozen custom/inc-item-data.cgi is the only authority; source Perl is not
 * executed in GameCore. The first inline _local_ is source-guarded and the
 * other thirteen actions share its compiled _local_1 alias.
 */
import {parseDsl} from './parse-dsl.mjs';

const fail=x=>{throw new RangeError('R2 career source: '+x);};
const first=(b,k)=>b?.fields?.[k]?.[0]?.value;
const DONORS='9:10:12:14:15:16:17:66:20:21:22:23:25';
const expected=Object.freeze([
  [15,'drug','轉職成藥屋'],[16,'tool','轉職成製皮匠'],
  [17,'tool','轉職成木工'],[66,'tool','轉職成飾品加工屋'],
  [20,'weapon','轉職成劍屋'],[21,'armor','轉職成盾屋'],
  [22,'armor','轉職成鎧屋'],[23,'weapon','轉職成杖屋'],
  [9,'material','轉職成探礦者'],[12,'material','轉職成伐木工'],
  [10,'book','轉職成書屋'],[25,'cow','轉職成酪農家'],
  [14,'peddle','轉職成行腳商人'],[0,'','想放下牌子'],
]);
const sourceBody=Object.freeze([
  'my $exp1=$DT->{exp}{$USE->{param1}};',
  'my $exp2=0;',
  'foreach my $exps (split(/:/,$USE->{param2}))',
  'my $exp=$DT->{exp}{$exps};',
  'next if !$exp || $exps==$exp1;',
  '$exp2+=$exp;',
  'delete($DT->{exp}{$exps});',
  'int($exp/10)',
  'WriteLog(0,$DT->{id},$msg);',
  '$exp2=int($exp2*$USE->{param3});',
  '$exp1+=$exp2;',
  '$exp1=1000 if $exp1>1000;',
  'int($DT->{exp}{$USE->{param1}}/10)',
  '$DT->{exp}{$USE->{param1}}=$exp1;',
  "$DT->{job}=$USE->{param4}",
  "$DT->{job}=''",
  'return $ret;',
]);
function requireOriginalBody(raw){
  let pos=0;
  for(const token of sourceBody){
    const i=raw.indexOf(token,pos);
    if(i<0)fail('frozen #78 inline career transfer body drift: '+token);
    pos=i+token.length;
  }
}
export function compileReviewedCareerChangeUses({itemDsl,model,limits}){
  if(typeof itemDsl!=='string'||model?.items?.length!==79||
     !Array.isArray(limits)||limits.length!==79)
    fail('source input/model/limits');
  const parsed=parseDsl(itemDsl,'custom/inc-item-data.cgi');
  if(parsed.issues.length)fail('source DSL parse issues');
  const item=parsed.blocks.find(b=>
    b.kind==='ITEM'&&first(b,'no')==='78');
  if(!item||first(item,'code')!=='port-exp'||
     first(item,'name')!=='轉職指南'||
     first(item,'limit')!=='1'||first(item,'price')!=='10000'||
     first(item,'plus')!=='1h'||
     model.items.find(x=>x.id===78)?.code!=='port-exp'||
     limits[77]?.limit!==1)
    fail('owner career guide source changed');
  const define=parsed.blocks.find(b=>b.kind==='DEFINE');
  if(first(define,'itemusetimerate')!=='0.5')
    fail('original use time rate drift');
  const jobNames={};
  for(const row of define.fields.job??[]){
    const match=/^([a-z]+)\s+(\S+)$/.exec(row.value);
    if(match)jobNames[match[1]]=match[2];
  }
  const jobCodes=['drug','tool','weapon','armor','material','book',
    'cow','peddle'];
  if(Object.keys(jobNames).sort().join(',')!==
       [...jobCodes].sort().join(',')||
     Object.values(jobNames).some(name=>!name))
    fail('original career name dictionary drift');
  const uses=parsed.blocks.filter(b=>b.kind==='USE'&&
    b.ownerItemLine===item.startLine);
  if(uses.length!==14)fail('original career USE count');
  requireOriginalBody(uses[0].raw);
  return Object.freeze(uses.map((block,useId)=>{
    const allowed=new Set(['time','action','arg','name','info',
      'okmsg','param','use','func']);
    if(Object.keys(block.fields).some(k=>!allowed.has(k))||
       Object.values(block.fields).some(v=>v.length!==1))
      fail('unreviewed career USE fields '+useId);
    const [target,job,name]=expected[useId];
    const expectedParam=target?[
      String(target),DONORS,'0.5',job,
    ].join(','):'0,,0,_default_';
    if(first(block,'time')!=='6h'||
       first(block,'action')!=='開始轉職修行'||
       first(block,'arg')!=='nocount'||
       first(block,'name')!==name||
       first(block,'param')!==expectedParam||
       first(block,'func')!==(useId===0?'_local_':'_local_1')||
       first(block,'use')?.replace(/\s+/g,' ')!=='1 轉職指南'||
       (block.fields.use?.length??0)!==1||
       first(block,'price')!==undefined||
       first(block,'job')!==undefined||
       first(block,'exp')!==undefined||
       (block.fields.get?.length??0)!==0||
       (block.fields.need?.length??0)!==0)
      fail('career USE source signature drift '+useId);
    return Object.freeze({
      supported:true,itemId:78,useId,
      source:'original-reviewed-career-change-inline',
      sourceFile:'custom/inc-item-data.cgi',sourceLine:block.startLine,
      name,marketCodec:'source-sparse',limits,
      time:10800,exptime:10800,money:0,
      uses:Object.freeze([Object.freeze({
        itemId:78,countPerUse:1,probabilityPermille:1000,
      })]),creates:Object.freeze([]),
      requiresOwnedItem:true,ownedMaximum:1,singleUseOnly:true,
      resultOk:first(block,'okmsg')??null,
      inlineCallback:Object.freeze({
        kind:'career-change',targetItemId:target,job,
        jobName:job?jobNames[job]:'不定',
        donorItemIds:Object.freeze(target?
          DONORS.split(':').map(Number):[]),
        numerator:target?1:0,denominator:target?2:1,
      }),
      scope:'original #78 EXP transfer with Perl value-comparison boundary and job alias; durable provenance separately gated',
    });
  }));
}
