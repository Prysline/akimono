import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {reviewCommerceUseLogs,projectReviewedCommerceUseLogRows} from '../src/original-r4-period-log-disk.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sources={helperSource:read('./original-perl/core-inc-item.cgi'),logSource:read('./original-perl/pinned-log.cgi'),configSource:read('../../_config.cgi')};
const reviewed=reviewCommerceUseLogs(sources);
test('full commerce actual frozen item::WriteLog / main::PushLog order, mode 3, private and public rows',()=>{
  const command={kind:'use-item',shopId:1,itemId:62,useId:0};
  const rule={supported:true,itemId:62,useId:0,source:'source-reviewed-example',inlineCallback:{kind:'advertise-self'}};
  const calls=[[0,1,'店鋪人氣上升'],[3,0,'店鋪進行宣傳']];
  const receipt={action:'use-item',shopId:1,itemId:62,useId:0,source:rule.source,callbackOrder:['source-inline-callback'],originalInlineLogCalls:calls};
  const nowSeconds=1000000;
  const getSub=(s,name)=>{const start=s.indexOf('sub '+name+'\n{'),end=s.indexOf('\n}',start);assert.ok(start>=0&&end>start);return s.slice(start,end+2);};
  const program='use utf8;use JSON::PP;local $/;my $in=decode_json(<STDIN>);our ($NOW_TIME,@LOG);$NOW_TIME=$in->{now};'+
    getSub(sources.logSource,'PushLog')+'\n{package item;'+getSub(sources.helperSource,'WriteLog')+'}\n'+
    'for my $row (@{$in->{calls}}){item::WriteLog(@$row)} print encode_json([@LOG]);';
  const expected=JSON.parse(execFileSync('perl',['-e',program],{input:JSON.stringify({now:nowSeconds,calls}),encoding:'utf8'}));
  assert.deepEqual(projectReviewedCommerceUseLogRows({reviewed,rule,command,receipt,nowSeconds}),expected);
  assert.throws(()=>projectReviewedCommerceUseLogRows({reviewed,rule,command,receipt:{...receipt,originalInlineLogCalls:[[3,1,'bad']]},nowSeconds}),/log target/);
  assert.throws(()=>projectReviewedCommerceUseLogRows({reviewed,rule,command,receipt:{...receipt,originalInlineLogCalls:[[4,0,'bad']]},nowSeconds}),/log target/);
  assert.throws(()=>reviewCommerceUseLogs({...sources,helperSource:sources.helperSource+' '}),/drift/);
});
