/**
 * R2 source-limited #62/0: original Standard Street self-advertising.
 * #62/1 target shop and #62/2 guild advertisement stay explicitly
 * unregistered until cross-shop and guild transaction support exists.
 */
import {parseDsl} from './parse-dsl.mjs';

const fail=s=>{throw new RangeError('R2 self advertisement source: '+s);};
const first=(b,k)=>b?.fields?.[k]?.[0]?.value;
const body=[
  'my $up=int(500*(2-$DT->{rank}/5000));',
  'if ( rand(1000)<250 ) {',
  '$DT->{rank}-=$up;',
  '$DT->{rank}=1000 if $DT->{rank}<1000;',
  'my $ret="廣告適得其反：人氣降低了".int($up/100);',
  'WriteLog(0,$DT->{id},$ret);',
  'WriteLog(3,0,$DT->{shopname}."把廣告貼出來後得到了反效果");',
  'return $ret;',
  '$DT->{rank}+=$up;',
  '$DT->{rank}=10000 if $DT->{rank}>10000;',
  'my $ret="進行廣告宣傳後：人氣上升了".int($up/100)."%";',
  'WriteLog(0,$DT->{id},$ret);',
  'WriteLog(3,0,$DT->{shopname}."進行了廣告宣傳");',
  'return $ret;',
];
export function compileReviewedSelfAdvertiseUse({itemDsl,model,limits}){
  if(typeof itemDsl!=='string'||model?.items?.length!==79||
     !Array.isArray(limits)||limits.length!==79)fail('source inputs');
  const parsed=parseDsl(itemDsl,'custom/inc-item-data.cgi');
  if(parsed.issues.length)fail('original DSL parse issues');
  const item=parsed.blocks.find(b=>b.kind==='ITEM'&&first(b,'no')==='62');
  if(!item||first(item,'code')!=='cm'||
     first(item,'name')!=='廣告包'||
     first(item,'price')!=='100000'||
     first(item,'limit')!=='1/1'||
     first(item,'plus')!=='5d'||
     model.items.find(x=>x.id===62)?.code!=='cm'||
     limits[61]?.limit!==1)
    fail('original ITEM #62 drift');
  const uses=parsed.blocks.filter(b=>b.kind==='USE'&&
    b.ownerItemLine===item.startLine);
  if(uses.length!==3)fail('original #62 three USE boundaries');
  const block=uses[0];
  const expectedKeys=['time','exp','job','scale','action','name',
    'info','arg','use','func'];
  const keys=Object.keys(block.fields);
  if(keys.length!==expectedKeys.length||
     keys.some(k=>!expectedKeys.includes(k))||
     Object.values(block.fields).some(v=>v.length!==1)||
     first(block,'time')!=='10h'||
     first(block,'exp')!=='10%'||
     first(block,'job')?.replace(/\s+/g,' ')!==
       '行腳商人 times/job_peddle_time_rate'||
     first(block,'arg')!=='nocount'||
     first(block,'name')!=='推出自己商店的廣告'||
     first(block,'action')!=='進行廣告'||
     first(block,'func')!=='_local_'||
     first(block,'use')?.replace(/\s+/g,' ')!=='1 廣告包')
    fail('original #62/0 USE declaration drift');
  const define=parsed.blocks.find(b=>b.kind==='DEFINE');
  if(first(define,'itemusetimerate')!=='0.5'||
     !(define.fields.job??[]).some(x=>/^peddle\s+行腳商人$/.test(x.value))||
     !(define.fields.set??[]).some(x=>
       /^job_peddle_time_rate\s+1\.5$/.test(x.value)))
    fail('original peddler job/source time drift');
  let index=0;
  for(const token of body){
    const p=block.raw.indexOf(token,index);
    if(p<0)fail('original self-advertising inline Perl changed '+token);
    index=p+token.length;
  }
  if(!uses[1].raw.includes('target|nocount')||
     !uses[1].raw.includes('$DTS->{rank}')||
     !uses[2].raw.includes('foreach my $DTS (@DT)')||
     !uses[2].raw.includes('$DT->{guild}'))
    fail('unreviewed cross-shop/guild USE source boundaries changed');
  return Object.freeze({
    supported:true,itemId:62,useId:0,
    source:'original-reviewed-self-advertisement',
    sourceFile:'custom/inc-item-data.cgi',sourceLine:block.startLine,
    name:first(block,'name'),limits,marketCodec:'source-sparse',
    time:18000,exptime:18000,money:0,
    singleUseOnly:true,requiresOwnedItem:true,ownedMaximum:1,
    jobTimeModifier:Object.freeze({
      job:'peddle',numerator:2,denominator:3,
    }),
    uses:Object.freeze([Object.freeze({
      itemId:62,countPerUse:1,probabilityPermille:1000,
    })]),creates:Object.freeze([]),
    experienceCallback:Object.freeze({
      kind:'gain-fixed-exp',points:100,
    }),
    inlineCallback:Object.freeze({
      kind:'advertise-self',thresholdPermille:250,basePoints:500,
    }),
    scope:'original #62/0 advertisement rank RNG and logs only; #62/1 and /2 remain unregistered; persistence separately gated',
  });
}
