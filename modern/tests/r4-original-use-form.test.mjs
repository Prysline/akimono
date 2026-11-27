/** Original source compiler metadata and item-m form fragments; no CGI IO
 * or player authority. The genuine HTTP test separately checks live offers.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {loadNormalCommerceAuditSources} from '../scripts/audit-normal-commerce.mjs';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {parseDsl} from '../src/parse-dsl.mjs';
import {reviewOriginalUseForm,describeOriginalUseForm} from '../src/original-r4-use-form.mjs';
const root=new URL('./original-perl/',import.meta.url);
const fragment=(source,start,end,from=0)=>{
  const i=source.indexOf(start,from),j=source.indexOf(end,i+start.length);
  assert.ok(i>=0&&j>i,start);return source.slice(i,j);
};
const read=async()=>{
  const input=await loadNormalCommerceAuditSources();
  const formSource=await readFile(new URL('core-item-m.cgi',root),'utf8');
  const sources={formSource,itemDsl:input.itemDsl,compilerSource:input.originalCompilerSource,
    calcSource:input.originalBuyCalcSource,configSource:input.originalConfigSource};
  const reviewed=reviewOriginalUseForm(sources);
  const street=createStandardStreetModule({...input,enableReviewedNormalTime:true,enableReviewedFullCommerce:true,enableReviewedCrossPeriod:true});
  return {input,sources,reviewed,street};
};
const oracle=(source,calc,items)=>{
  const header=fragment(source,'my $MAX_COUNT=',' $USE->{time}=GetItemUseTime'.trimStart());
  const limits=fragment(source,'my $count_min=','if( ($USE->{money})');
  const opts=fragment(source,'if($USE->{arg}!~ /nocount/)','if($USE->{arg}=~ /message',source.indexOf('my $select_target='));
  const clock=fragment(calc,'sub GetStockTime','sub UseTime');
  const perl=[
    'use utf8;use JSON::PP;no strict;no warnings;local $/;my $in=decode_json(<STDIN>);',
    'use OriginalGiftMapUseHarness;OriginalGiftMapUseHarness::bootstrap();',
    '$g_define={scale=>"個",itemusetimerate=>0.5};$MAX_STOCK_TIME=259200;',
    'sub l{my $s=$_[0];my %t=("回"=>"回","使う"=>"使用","資金最大"=>"資金最多","時間最大"=>"時間最多","材料最大"=>"材料最多");return $t{$s}//$s}',
    clock,
    'my @out;for my $item (@{$in->{items}}){ClearBuffer("item");for my $line (@{$item->{fields}}){GetBuffer("item",OriginalGiftMapUseHarness::line_for_compiler($line))}',
    'for my $u (@{$item->{uses}}){ClearBuffer("use");for my $line (@{$u->{fields}}){GetBuffer("use",OriginalGiftMapUseHarness::line_for_compiler($line))}',
    'for my $c (@{$u->{cases}}){$USE={%$g_use,%{$c->{runtime}}};$DT=$c->{shop};$NOW_TIME=$c->{nowSeconds};$disp="";my $select_count="";',
    header,limits,opts,
    'my @opts;while($select_count=~/<OPTION VALUE="(\\d+)">([^<]+)/g){push @opts,{count=>0+$1,label=>$2}}',
    'push @out,{itemId=>0+$USE->{itemno},useId=>0+$USE->{no},info=>$USE->{info}//"",scale=>$scale,action=>$action,noCount=>$USE->{arg}=~/nocount/?1:0,target=>$USE->{arg}=~/target/?1:0,sourceMaximum=>$count_max,options=>[@opts]};',
    '}}}print encode_json([@out]);'
  ].join('\n');
  return JSON.parse(execFileSync('perl',['-I.','-e',perl],{cwd:root,encoding:'utf8',input:JSON.stringify({items})}));
};
test('all 116 original USE form records and source quantity loop match executed compiler and item-m.cgi',async()=>{
  const {input,sources,reviewed,street}=await read();
  const blocks=parseDsl(input.itemDsl,'custom/inc-item-data.cgi').blocks;
  const items=[],actual=[];
  const nowSeconds=1000000;
  const fieldLines=(b,keys)=>Object.entries(b.fields).filter(([k])=>keys.includes(k)).flatMap(([k,values])=>values.map(v=>({line:v.line,text:k+' '+v.value}))).sort((a,b)=>a.line-b.line).map(x=>x.text);
  for(const item of blocks.filter(b=>b.kind==='ITEM')){
    const id=Number(item.fields.no[0].value),uses=blocks.filter(b=>b.kind==='USE'&&b.ownerItemLine===item.startLine);
    if(!uses.length)continue;
    items.push({fields:fieldLines(item,['no','code','scale']),uses:uses.map((u,useId)=>{
      const rule=street.useItem.getRule(id,useId);
      assert.ok(rule,id+':'+useId);
      const fixtures=[{stock:10000,money:999999999,remaining:300000,exp:999}];
      if(id===79&&useId===0)fixtures.push(
        {stock:2,money:100000,remaining:1800,exp:1},{stock:4,money:100000,remaining:18000,exp:0},
        {stock:6,money:100000,remaining:3600,exp:10},{stock:10,money:100000,remaining:36000,exp:500});
      if(id===14||id===13)fixtures.push({stock:10,money:12000,remaining:14400,exp:509});
      return {fields:fieldLines(u,['scale','action','info','arg']),cases:fixtures.map(f=>{
        const shop={money:f.money,time:nowSeconds-f.remaining,item:Array(79).fill(f.stock)};
        const offer={itemId:id,useId,moneyPerUse:rule.money,timePerUseSeconds:rule.time,proficiency:f.exp,requiredProficiency:rule.needExperience??0,canUse:true};
        const before=structuredClone(shop),view=describeOriginalUseForm({reviewed,rule,offer,shop,nowSeconds});
        assert.deepEqual(shop,before);
        assert.equal(view.proficiencyPercent,Math.trunc(f.exp/10));
        assert.deepEqual(view.materials,rule.uses.map(x=>({itemId:x.itemId,count:x.countPerUse,owned:f.stock,probabilityPermille:x.probabilityPermille,
          consumptionLabel:x.probabilityPermille===0?'不使用':x.probabilityPermille===1000?'消耗':'耗損率'+x.probabilityPermille/10+'%'})));
        actual.push({itemId:id,useId,info:view.info,scale:view.scale,action:view.action,noCount:Number(view.noCount),target:Number(view.target),sourceMaximum:view.sourceMaximum,options:view.options});
        return {shop,nowSeconds,runtime:{money:rule.money,time:rule.time,use:rule.uses.map(x=>({no:x.itemId,count:x.countPerUse,proba:x.probabilityPermille}))}};
      })};
    })});
  }
  const expected=oracle(sources.formSource,sources.calcSource,items);
  assert.equal(actual.length,123);
  assert.deepEqual(actual,expected);
  assert.equal(reviewed.count,116);
  for(const key of Object.keys(sources))assert.throws(()=>reviewOriginalUseForm({...sources,[key]:sources[key]+'\n'}),/source drift/);
});
test('original USE form is read-only and does not enable denied quote or add source materials',async()=>{
  const {reviewed,street}=await read(),rule=street.useItem.getRule(14,0);
  const offer={itemId:14,useId:0,moneyPerUse:rule.money,timePerUseSeconds:rule.time,proficiency:0,requiredProficiency:0,canUse:false};
  const args={reviewed,rule,offer,shop:{money:0,time:1000000,item:Array(79).fill(0)},nowSeconds:1000000};
  const before=structuredClone(args.shop),view=describeOriginalUseForm(args);
  assert.deepEqual(view.materials,[],'source sword map has no explicit USE material');
  assert.deepEqual(view.options,[]);assert.equal(view.sourceMaximum,0);
  assert.deepEqual(args.shop,before);
  assert.throws(()=>describeOriginalUseForm({...args,offer:{...offer,moneyPerUse:1}}),/quote identity/);
  assert.throws(()=>describeOriginalUseForm({...args,reviewed:{...reviewed}}),/source review/);
});

test('original item-m rejection checks report all source conditions in source order',async()=>{
  const {sources,reviewed,street}=await read();
  const blocks=parseDsl(sources.itemDsl,'custom/inc-item-data.cgi').blocks;
  const rows=[];
  for(const item of blocks.filter(b=>b.kind==='ITEM')){
    const itemId=Number(item.fields.no[0].value);
    const uses=blocks.filter(b=>b.kind==='USE'&&b.ownerItemLine===item.startLine);
    for(const [useId,u] of uses.entries()){
      const rule=street.useItem.getRule(itemId,useId);
      const shop={money:0,time:1000000,item:Array(79).fill(10000),point:0,exp:{}};
      const offer={itemId,useId,moneyPerUse:rule.money,timePerUseSeconds:rule.time,proficiency:0,requiredProficiency:rule.needExperience??0,canUse:false,sourceUseOk:true};
      const actual=describeOriginalUseForm({reviewed,offer,rule,shop,nowSeconds:1000000});
      const needexp=Number((u.fields.needexp?.[0]?.value??'0%').slice(0,-1))*10;
      const needpoint=Number(u.fields.needpoint?.[0]?.value??0);
      rows.push({money:rule.money,time:rule.time,needexp,needpoint,actual:actual.sourceFormRejections.map(x=>x.code),allowed:actual.sourceFormAllowed});
    }
  }
  const code=fragment(sources.formSource,"if( ($USE->{money})","$disp.=&");
  const perl=[
    'use utf8;use JSON::PP;no strict;no warnings;local $/;my $rows=decode_json(<STDIN>);',
    'sub l{my %labels=("資金が足りません"=>"money","時間が足りません"=>"time","熟練度が足りません"=>"experience","必要な職業に就いていません"=>"job","点数が足りません"=>"point","人気が足りません"=>"popularity","このコマンドには特定のイベントの発生が必要です"=>"event");return $labels{$_[0]}}',
    'my @out;for my $row (@$rows){$USE=$row;$DT={money=>0,time=>1000000,point=>0,rank=>0};$NOW_TIME=1000000;my $exp=0;$nonuse=0;$disp="";',
    code,
    'my @codes=($disp=~/<B>([^<]+)<\/B>/g);push @out,{codes=>\@codes,allowed=>$nonuse?JSON::PP::false:JSON::PP::true};}print encode_json(\@out);'
  ].join('\n');
  const result=JSON.parse(execFileSync('perl',['-e',perl],{encoding:'utf8',input:JSON.stringify(rows)}));
  assert.equal(rows.length,116);
  assert.deepEqual(result,rows.map(row=>({codes:row.actual,allowed:row.allowed})));
});
