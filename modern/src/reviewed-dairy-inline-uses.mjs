/**
 * R2 source-guarded inline USEs: #25 cow milking (two variants) and
 * #26/0 drinking milk. These callbacks are deliberately separate from
 * callback-free #26/1-2 fermentation and #35/#36 consumption.
 *
 * All numbers are checked against frozen custom/inc-item-data.cgi;
 * no source Perl or arbitrary inline source is evaluated in GameCore.
 */
import {parseDsl} from './parse-dsl.mjs';

const fail=x=>{throw new RangeError('R2 dairy inline source: '+x);};
const first=(block,key)=>block?.fields?.[key]?.[0]?.value;
function verifyBody(raw,tokens){
  let at=0;
  for(const token of tokens){
    const position=raw.indexOf(token,at);
    if(position<0)fail('original inline Perl source body changed: '+token);
    at=position+token.length;
  }
}
const cowBody=Object.freeze([
  'my $val=$USE->{param1}*$count;',
  '$val*=$DT->{item}[25-1];',
  '$val=int(rand($val))+1;',
  "AddItem(26,$val,'精製了米諾牛奶');",
  'my $useproba=$USE->{param1}*$USE->{param1};',
  'my $usecount=0;',
  'foreach(1..$count)',
  '$usecount++ if rand(1000)<$useproba;',
  "UseItem(25,$usecount,$ITEM[25]->{name}.'因為'.",
  "my $ret='精製了'.$val.'瓶米諾牛乳';",
  'WriteLog(0,$DT->{id},$ret);',
  'return $ret;',
]);
const drinkingBody=Object.freeze([
  'my $val=$count;',
  'if($count>=30)',
  '$DT->{rank}-=$count*2;',
  '$DT->{rank}=0 if $DT->{rank}<0;',
  'WriteLog(2,0,$DT->{shopname}.',
  'elsif($count>=10)',
  "WriteLog(0,$DT->{id},$ret);",
  '$DT->{rank}+=int(rand($count+1))+$count;',
  '$DT->{rank}=10000 if $DT->{rank}>10000;',
  "return $ret;",
]);
function sourceItem(parsed,id){
  const item=parsed.blocks.find(block=>
    block.kind==='ITEM'&&first(block,'no')===String(id));
  if(!item)fail('original ITEM absent '+id);
  return item;
}
function permitFields(block,keys){
  for(const [key,lines] of Object.entries(block.fields)){
    if(!keys.includes(key))fail('unreviewed USE field '+key);
    if(lines.length!==1)fail('duplicate original field '+key);
  }
}
export function compileReviewedDairyInlineUses({itemDsl,model,limits}){
  if(typeof itemDsl!=='string'||model?.items?.length!==79||
     !Array.isArray(limits)||limits.length!==79)
    fail('original input/model/limits');
  const parsed=parseDsl(itemDsl,'custom/inc-item-data.cgi');
  if(parsed.issues.length)fail('DSL parser issues');
  const define=parsed.blocks.find(block=>block.kind==='DEFINE');
  if(first(define,'itemusetimerate')!=='0.5'||
     !(define?.fields?.job??[]).some(x=>/cow\s+酪農家/.test(x.value))||
     !(define?.fields?.set??[]).some(x=>
       /^job_cow_time_rate\s+1\.5$/.test(x.value)))
    fail('original cow job rate changed');
  const cow=sourceItem(parsed,25),milk=sourceItem(parsed,26);
  if(first(cow,'code')!=='mino'||first(cow,'limit')!=='20/1.5'||
     first(milk,'code')!=='mino_milk'||first(milk,'limit')!=='2500/0'||
     model.items[24]?.name!=='米諾陶洛斯♀'||
     model.items[25]?.name!=='米諾牛乳')
    fail('original cow/milk ITEM changed');
  const cowUses=parsed.blocks.filter(b=>b.kind==='USE'&&
    b.ownerItemLine===cow.startLine);
  const milkUses=parsed.blocks.filter(b=>b.kind==='USE'&&
    b.ownerItemLine===milk.startLine);
  if(cowUses.length!==2||milkUses.length!==3)
    fail('original dairy USE inventory changed');
  verifyBody(cowUses[0].raw,cowBody);
  verifyBody(milkUses[0].raw,drinkingBody);
  const jobTimeModifier=Object.freeze({
    job:'cow',numerator:2,denominator:3,
  });
  const sourceBook=(block,itemId,useId,expected)=>{
    permitFields(block,expected.fields);
    if(first(block,'time')!==expected.time||
       first(block,'name')!==expected.name||
       first(block,'price')!=='0'||
       first(block,'job')!=='酪農家 times/job_cow_time_rate'||
       first(block,'func')!==expected.func||
       first(block,'param')!==expected.param||
       first(block,'exp')!==expected.exp||
       (block.fields.get?.length??0)!==0||
       (block.fields.use?.length??0)!==expected.useCount||
       (block.fields.need?.length??0)!==expected.needCount)
      fail('original dairy USE declaration drift '+itemId+'/'+useId);
    if(expected.needCount&&
       first(block,'need')!=='1 米諾陶洛斯♀')
      fail('source milking cow NEED changed');
    if(expected.useCount&&
       first(block,'use')!=='1 米諾牛乳')
      fail('source drinking milk USE changed');
    return Object.freeze({
      supported:true,itemId,useId,
      source:'original-reviewed-dairy-inline-use',
      sourceFile:'custom/inc-item-data.cgi',sourceLine:block.startLine,
      name:first(block,'name'),limits,marketCodec:'source-sparse',
      time:expected.time==='3m'?90:3600,
      exptime:expected.time==='3m'?90:3600,
      money:0,jobTimeModifier,
      uses:Object.freeze(expected.needCount?
        [Object.freeze({itemId:25,countPerUse:1,probabilityPermille:0})]:
        [Object.freeze({itemId:26,countPerUse:1,probabilityPermille:1000})]),
      creates:Object.freeze([]),
      ...(itemId===25?{
        requiresOwnedItem:true,ownedMaximum:20,
        experienceCallback:Object.freeze({kind:'gain-fixed-exp',points:10}),
      }:{}),
      inlineCallback:Object.freeze({kind:itemId===25?'milk-cow':'drink-milk',
        ...(itemId===25?{level:useId+1}:{})}),
      scope:'exact original dairy inline callback and source needs; durability provenance is separately gated',
    });
  };
  const cowRules=cowUses.map((block,useId)=>sourceBook(block,25,useId,{
    fields:['time','exp','job','scale','action','price','name','info',
      'param','need','func'],
    time:'2h',name:useId===0?'擠奶':'用力榨取乳汁',
    param:String(useId+1),func:useId===0?'_local_':'_local_1',
    exp:'1%',needCount:1,useCount:0,
  }));
  const drink=sourceBook(milkUses[0],26,0,{
    fields:['time','job','scale','action','price','name','info','use','func'],
    time:'3m',name:'飲用',param:undefined,func:'_local_',
    exp:undefined,needCount:0,useCount:1,
  });
  return Object.freeze([...cowRules,drink]);
}
