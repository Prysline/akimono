import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {loadNormalCommerceAuditSources} from '../scripts/audit-normal-commerce.mjs';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {parseDsl} from '../src/parse-dsl.mjs';
import {originalSourceUseClock} from '../src/shared-use-experience.mjs';
import {reviewOriginalUseJobFallback} from '../src/reviewed-use-job-fallback.mjs';

// Clock-only oracle: execute the frozen compiler's actual JOB emission
// block and frozen CheckUseItem on fresh USE rows. The base clocks are
// controlled inputs, not a test of the entire ITEM compiler or callbacks.
const perl=[
  'use utf8;use JSON::PP;no strict;no warnings;',
  'local $/;my $in=decode_json(<STDIN>);',
  '$g_define=$in->{define};',
  'eval $in->{helpers};die $@ if $@;',
  'eval $in->{check};die $@ if $@;',
  'eval ("sub emit_job {my(\\$use)=\\@_;my \\$s=\\x27\\x27;".$in->{emit}." return \\$s;}");die $@ if $@;',
  'my @out;',
  'for my $item (@{$in->{items}}){',
  '  my $generated=join("",map{emit_job($_)}@{$item->{uses}});',
  '  die "source JOB compiler errors" if @errormsg;',
  '  $generated=~s/[\\t\\n]//g;$generated=~s/\\0/\\n/g;',
  '  eval "package item;no strict;no warnings;\\n".$generated."\\n1;";die $@ if $@;',
  '  for my $job (@{$in->{jobs}}){for my $row (@{$item->{uses}}){',
  '    @item::USE=map{{no=>$_->{no},time=>$_->{time},exptime=>$_->{exptime},use=>[]}}@{$item->{uses}};',
  '    $DT={job=>$job,item=>[]};my $u=$item::USE[$row->{no}];',
  '    die "clock fixture denied" unless CheckUseItem($u)==1;',
  '    push @out,[$item->{id},$row->{no},$job,0+$u->{time},0+$u->{exptime}];',
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
      return {no,time:rule.time,exptime:rule.exptime,job:(block.fields.job??[]).map(x=>x.value.trim().split(/\s+/).join('\t'))};
    })});
  }
  assert.equal(fallbackCount,51);
  const compiler=input.originalCompilerSource;
  const start=compiler.indexOf('my @jobworklist=sort');
  const end=compiler.indexOf('\n\t\t\t}\n\t\t\t$s=~s/',start);
  assert.ok(start>=0&&end>start,'original job emission block');
  const oracle=JSON.parse(execFileSync('perl',['-e',perl],{encoding:'utf8',input:JSON.stringify({
    define,jobs,items,helpers:subSource(compiler,'GetNumber')+'\n'+subSource(compiler,'GetJobCode'),
    check:subSource(input.originalUseSource,'CheckUseItem'),emit:compiler.slice(start,end),
  })}));
  assert.equal(oracle.length,116*9);
  const offers=new Map(jobs.map(job=>[job,full.listUseOffers({shops:[{job,exp:{},item:Array(79).fill(0),time:0,money:0}],events:null,nowSeconds:100000})]));
  for(const [id,no,job,base,trained] of oracle){
    const rule=full.useItem.getRule(id,no);
    for(const experience of [0,1,500,999,1000]){
      const actual=originalSourceUseClock({rule,job,experience});
      assert.deepEqual(actual,{base,trained,seconds:base-Math.trunc((base-trained)*experience/1000)},id+':'+no+':'+job+':'+experience);
    }
    const offer=offers.get(job).find(x=>x.itemId===id&&x.useId===no);
    assert.equal(offer?.timePerUseSeconds,base,id+':'+no+':'+job+' quote');
  }
});
