import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {loadNormalCommerceAuditSources} from '../scripts/audit-normal-commerce.mjs';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {parseDsl} from '../src/parse-dsl.mjs';
import {originalSourceUseClock} from '../src/shared-use-experience.mjs';
import {reviewOriginalUseJobFallback} from '../src/reviewed-use-job-fallback.mjs';

// Clock-only oracle: execute the frozen compiler's actual JOB emission
// block and frozen CheckUseItem on fresh USE rows. Base clocks now come
// independently from frozen DSL TIME/EXPTIME and GetNumber, not the JS registry.
// This still is not the entire ITEM compiler or callback oracle.
const perl=[
  'use utf8;use JSON::PP;no strict;no warnings;',
  'local $/;my $in=decode_json(<STDIN>);',
  '$g_define=$in->{define};',
  'eval $in->{helpers};die $@ if $@;',
  'eval $in->{check};die $@ if $@;',
  'eval $in->{calc};die $@ if $@;',
  'eval ("sub emit_job {my(\\$use)=\\@_;my \\$s=\\x27\\x27;".$in->{emit}." return \\$s;}");die $@ if $@;',
  'my @out;',
  'for my $item (@{$in->{items}}){',
  '  for my $row (@{$item->{uses}}){',
  '    $row->{time}=int(GetNumber($row->{rawTime})*$g_define->{itemusetimerate});',
  '    $row->{exptime}=defined($row->{rawExpTime})?int(GetNumber($row->{rawExpTime})*$g_define->{itemusetimerate}):$row->{time};',
  '  }',
  '  my $generated=join("",map{emit_job($_)}@{$item->{uses}});',
  '  die "source JOB compiler errors" if @errormsg;',
  '  $generated=~s/[\\t\\n]//g;$generated=~s/\\0/\\n/g;',
  '  eval "package item;no strict;no warnings;\\n".$generated."\\n1;";die $@ if $@;',
  '  for my $job (@{$in->{jobs}}){for my $row (@{$item->{uses}}){',
  '    @item::USE=map{{no=>$_->{no},time=>$_->{time},exptime=>$_->{exptime},use=>[]}}@{$item->{uses}};',
  '    $DT={job=>$job,item=>[]};my $u=$item::USE[$row->{no}];',
  '    die "clock fixture denied" unless CheckUseItem($u)==1;',
  '    $u->{itemno}=$item->{id};my @seconds;for my $exp (0,1,500,999,1000){$DT->{exp}{$item->{id}}=$exp;push @seconds,0+GetItemUseTime($u);}',
  '    push @out,[$item->{id},$row->{no},$job,0+$u->{time},0+$u->{exptime},\\@seconds];',
  '  }}',
  '  for my $job (@{$in->{jobs}}){for my $row (@{$item->{uses}}){',
  '    my $name="item::_job_use_".$row->{no}."_".$job."_";undef &$name if defined &$name;',
  '  }}',
  '}',
  'print encode_json(\\@out);',
].join('\n');
const subSource=(source,name)=>{
  const start=source.indexOf('sub '+name+'\n{');
  const end=source.indexOf('\n}',start);
  assert.ok(start>=0&&end>start,name);
  return source.slice(start,end+2);
};
test('R4 full commerce USE job fallback matches frozen compiler emission and CheckUseItem for every USE and job (clock-only)',async()=>{
  const input=await loadNormalCommerceAuditSources();
  const full=createStandardStreetModule({...input,enableReviewedNormalTime:true,enableReviewedCrossPeriod:true,enableReviewedFullCommerce:true});
  const legacy=createStandardStreetModule(input);
  const sources={itemDsl:input.itemDsl,useSource:input.originalUseSource,compilerSource:input.originalCompilerSource};
  const reviewed=reviewOriginalUseJobFallback(sources);
  assert.equal(reviewed.count,51);
  for(const k of Object.keys(sources))assert.throws(()=>reviewOriginalUseJobFallback({...sources,[k]:sources[k]+'\n'}),/frozen source drift/);
  const blocks=parseDsl(input.itemDsl,'custom/inc-item-data.cgi').blocks;
  const def=blocks.find(b=>b.kind==='DEFINE');
  const define=Object.fromEntries([
    ...def.fields.job.map(row=>{const [code,name]=row.value.split(/\s+/);return ['job-'+code,name]}),
    ...def.fields.set.map(row=>row.value.split(/\s+/)),
    ['itemusetimerate',def.fields.itemusetimerate[0].value],
  ]);
  const jobs=['',...def.fields.job.map(row=>row.value.split(/\s+/)[0])];
  const items=[];
  let fallbackCount=0;
  for(const item of blocks.filter(b=>b.kind==='ITEM')){
    const id=Number(item.fields.no[0].value);
    const uses=blocks.filter(b=>b.kind==='USE'&&b.ownerItemLine===item.startLine);
    if(!uses.length)continue;
    items.push({id,uses:uses.map((block,no)=>{
      const rule=full.useItem.getRule(id,no);
      assert.ok(rule,id+':'+no);
      assert.deepEqual(rule.fallbackJobTimeModifier,reviewed.get(id,no));
      if(rule.fallbackJobTimeModifier)fallbackCount++;
      assert.equal(legacy.useItem.getRule(id,no)?.fallbackJobTimeModifier,undefined);
      assert.equal(block.fields.time.length,1);
      assert.ok(!block.fields.exptime||block.fields.exptime.length===1&&block.fields.exptime[0].line>block.fields.time[0].line);
      return {no,rawTime:block.fields.time[0].value,rawExpTime:block.fields.exptime?.[0]?.value??null,job:(block.fields.job??[]).map(x=>x.value.trim().split(/\s+/).join('\t'))};
    })});
  }
  assert.equal(fallbackCount,51);
  const compiler=input.originalCompilerSource;
  const start=compiler.indexOf('my @jobworklist=sort');
  const end=compiler.indexOf('\n\t\t\t}\n\t\t\t$s=~s/',start);
  assert.ok(start>=0&&end>start,'original job emission block');
  const oracle=JSON.parse(execFileSync('perl',['-e',perl],{encoding:'utf8',input:JSON.stringify({
    define,jobs,items,helpers:subSource(compiler,'GetNumber')+'\n'+subSource(compiler,'GetJobCode'),
    check:subSource(input.originalUseSource,'CheckUseItem'),calc:subSource(input.originalBuyCalcSource,'GetItemUseTime'),emit:compiler.slice(start,end),
  })}));
  assert.equal(oracle.length,116*9);
  const offers=new Map(jobs.map(job=>[job,full.listUseOffers({shops:[{job,exp:{},item:Array(79).fill(0),time:0,money:0}],events:null,nowSeconds:100000})]));
  for(const [id,no,job,base,trained,seconds] of oracle){
    const rule=full.useItem.getRule(id,no);
    for(const [i,experience] of [0,1,500,999,1000].entries()){
      const actual=originalSourceUseClock({rule,job,experience});
      assert.deepEqual(actual,{base,trained,seconds:base-Math.trunc((base-trained)*experience/1000)},id+':'+no+':'+job+':'+experience);
      assert.equal(actual.seconds,seconds[i],id+':'+no+':'+job+':'+experience+' original GetItemUseTime');
    }
    const offer=offers.get(job).find(x=>x.itemId===id&&x.useId===no);
    assert.equal(offer?.timePerUseSeconds,base,id+':'+no+':'+job+' quote');
  }
});

import {createPeriodMemoryWorld,createSourceReviewedMemoryWorldAdapter,executeMemoryCommand} from '../src/game-core-contract.mjs';
import {reviewOriginalPeriodBootstrap,createOriginalPeriodSeed} from '../src/original-period-world-seed.mjs';

// Explicit controlled inventory/job/EXP fixture. Real StreetModule and
// GameCore USE + source-reviewed memory CAS; not player/HTTP/disk evidence.
test('R4 controlled gathering fallback shares quote, exact time gate, USE effects and CAS',async()=>{
  const input=await loadNormalCommerceAuditSources();
  const street=createStandardStreetModule({...input,enableReviewedNormalTime:true,enableReviewedFullCommerce:true});
  const period=createOriginalPeriodSeed(reviewOriginalPeriodBootstrap({
    periodSource:input.originalPeriodSource,adminSource:input.originalAdminInitSource,
    readSource:input.originalDataReadSource,writeSource:input.originalDataWriteSource,
    reviewedB41:street.reviewedB41,
  }));
  const repo=createSourceReviewedMemoryWorldAdapter({initialWorld:createPeriodMemoryWorld({
    worldId:'controlled-job-fallback',streetId:'standard-street',nowSeconds:1000000,period,
  }),streetModule:street});
  const run=(repository,kind,fields={})=>executeMemoryCommand({repository,streetModule:street,
    command:{kind,expectedRevision:repository.read().revision,...fields}});
  for(const [kind,fields] of [['initialize-source-market',{}],['open-shop',{shopId:1,ownerName:'來源測試',shopName:'受控礦山'}]]){
    const result=run(repo,kind,fields);assert.equal(result.ok,true,JSON.stringify(result.details));
  }
  const seeded=structuredClone(repo.read());
  seeded.shops[0].item[8]=1;seeded.shops[0].job='material';seeded.shops[0].exp={'9':500};
  seeded.shops[0].time=seeded.nowSeconds-1500;
  const cmd={shopId:1,itemId:9,useId:1,requestedCount:1,randomDraws:[0,0,0,0,0,0,999999]};
  // Original MakeAmount uses one Bernoulli draw per unit below 20,
  // and exactly two draws for the Gaussian-like branch at 20 or more.
  const sourceProbe=JSON.parse(execFileSync('perl',['-e',[
    'use JSON::PP;no warnings;our($i,@t);',
    'BEGIN{*CORE::GLOBAL::rand=sub{die "draw exhausted" if $i>=@t;return $t[$i++]*($_[0]//1);};}',
    'local $/;my $in=decode_json(<STDIN>);@t=map{$_/1000000}@{$in->{draws}};$i=0;',
    'eval $in->{make};die $@ if $@;',
    'my @out=map { [$_->[0],MakeAmount($_->[1],$_->[2])] } @{$in->{creates}};',
    'my $lost=rand(1000)<10;print encode_json({outputs=>\\@out,draws=>$i,lost=>$lost?1:0});',
  ].join('\n')],{encoding:'utf8',input:JSON.stringify({
    make:subSource(input.originalUseSource,'MakeAmount'),draws:cmd.randomDraws,
    creates:[[5,3,800],[6,20,600],[7,1,800]],
  })}));
  assert.deepEqual(sourceProbe,{outputs:[[5,3],[6,12],[7,1]],draws:7,lost:0});
  const denied=structuredClone(seeded);denied.shops[0].time++;
  const short=createSourceReviewedMemoryWorldAdapter({initialWorld:denied,streetModule:street});
  assert.equal(street.listUseOffers(short.read()).find(x=>x.itemId===9&&x.useId===1).canUse,false);
  const beforeShort=short.read();
  assert.equal(run(short,'use-item',cmd).ok,false);
  assert.deepEqual(short.read(),beforeShort);
  const enough=createSourceReviewedMemoryWorldAdapter({initialWorld:seeded,streetModule:street});
  const before=enough.read(),quote=street.listUseOffers(before).find(x=>x.itemId===9&&x.useId===1);
  assert.equal(quote.timePerUseSeconds,1500);assert.equal(quote.canUse,true);
  const result=run(enough,'use-item',cmd);
  assert.equal(result.ok,true,JSON.stringify(result.details));
  assert.equal(result.code,'COMMITTED');assert.equal(result.details.timeSpentSeconds,1500);
  assert.equal(result.details.effectiveCount,1);assert.equal(result.details.randomDrawsUsed,7);
  const after=enough.read();
  assert.equal(after.revision,before.revision+1);assert.equal(after.nowSeconds,before.nowSeconds);
  assert.equal(after.shops[0].time,after.nowSeconds);assert.equal(after.shops[0].exp['9'],520);
  assert.equal(after.shops[0].item[8],1);
  for(const [id,n] of sourceProbe.outputs)assert.equal(after.shops[0].item[id-1],before.shops[0].item[id-1]+n);
  assert.equal(after.shops[0].money,before.shops[0].money);
  const stale=executeMemoryCommand({repository:enough,streetModule:street,command:{kind:'use-item',expectedRevision:before.revision,...cmd}});
  assert.equal(stale.code,'REVISION_CONFLICT');assert.deepEqual(enough.read(),after);
});


// Read-only offer contract, not a transaction or player provenance test.
// The original form caps GetStockTime; original UseItem's submission
// uses raw time. Preserve the distinction rather than change gameplay.
test('R4 full commerce quote uses original 72h stock-time ceiling and leaves legacy quote unchanged',async()=>{
  const input=await loadNormalCommerceAuditSources();
  const full=createStandardStreetModule({...input,enableReviewedNormalTime:true,enableReviewedFullCommerce:true});
  const legacy=createStandardStreetModule(input);
  assert.match(input.originalConfigSource,/\$MAX_STOCK_TIME\s*=\s*72\*60\*60\s*;/);
  const samples=[1499,1500,257999,258000,259199,259200,360000];
  const sourceMax=JSON.parse(execFileSync('perl',['-e',[
    'use JSON::PP;no strict;no warnings;',
    'local $/;my $in=decode_json(<STDIN>);',
    'eval $in->{stock};die $@ if $@;',
    '$MAX_STOCK_TIME=72*60*60;$NOW_TIME=1000000;',
    'my @max=map { int(GetStockTime($NOW_TIME-$_)/1500) } @{$in->{samples}};',
    'print encode_json(\\@max);',
  ].join('\n')],{encoding:'utf8',input:JSON.stringify({
    stock:subSource(input.originalBuyCalcSource,'GetStockTime'),samples,
  })}));
  assert.deepEqual(sourceMax,[0,1,171,172,172,172,172]);
  for(const [i,remaining] of samples.entries()){
    const item=Array(79).fill(0);item[8]=1;
    const world={shops:[{status:1,job:'material',exp:{'9':500},item,money:0,time:1000000-remaining}],events:null,nowSeconds:1000000};
    const before=structuredClone(world);
    const q=full.listUseOffers(world).find(x=>x.itemId===9&&x.useId===1);
    assert.equal(q.timePerUseSeconds,1500);
    assert.equal(q.maxUseCount,sourceMax[i],String(remaining));
    assert.equal(q.maxUseCountReason,'時間最大');
    // No source market/provenance is fabricated just to test a quote.
    assert.equal(q.canUse,false);
    const old=legacy.listUseOffers(world).find(x=>x.itemId===9&&x.useId===1);
    assert.equal(old.maxUseCount,Math.floor(remaining/old.timePerUseSeconds));
    assert.deepEqual(world,before);
  }
});
