import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {normalizeLocalSourceText} from '../src/local-source-text.mjs';
import {reviewOriginalSettlementMenu,describeOriginalSettlementMenu,reviewOriginalOwnerClock,describeOriginalOwnerClock} from '../src/original-r4-settlement-menu.mjs';
const read=async p=>normalizeLocalSourceText(await readFile(new URL(p,import.meta.url),'utf8'));
test('original desktop settlement menu matches Perl source at minute, hour and 36h boundaries',async()=>{
  const sources={menuSource:await read('../../custom/inc-menu.cgi'),configSource:await read('../../_config.cgi'),readSource:await read('./original-perl/inc-func.cgi'),timeSource:await read('./original-perl/pinned-time.cgi')};
  const reviewed=reviewOriginalSettlementMenu(sources);
  const menu=sources.menuSource.split('\n');
  const clock=menu.filter(line=>/^my \$(now|nextday)=/.test(line)).join('\n');
  const notices=menu.filter(line=>line.includes('次回決算 %1 まであと%2')).map(line=>line.trim());
  assert.equal(notices.length,2);assert.equal(notices[0],notices[1]);
  const getSub=name=>{
    const begin=sources.readSource.indexOf('sub '+name+'\n{'),end=sources.readSource.indexOf('\n}',begin);
    assert.ok(begin>=0&&end>begin);return sources.readSource.slice(begin,end+2);
  };
  const times=[];
  for(const boundary of [118800,896400,1700002800]){
    // The third base exercises date formatting even when not a settlement boundary.
    for(const offset of [-3601,-3600,-61,-60,-59,-1,0,1,59,60,3600])times.push(boundary+offset);
  }
  const perl=[
    'use utf8;use JSON::PP;no strict;no warnings;local $/;my $in=decode_json(<STDIN>);',
    '$TZ_JST=9*3600;$DATE_REVISE_TIME=6*3600;$ONE_DAY_TIME=36*3600;',
    'sub l {my($s,@a)=@_;$s="小時" if $s eq "時間";$s="下次決算 %1 還有%2" if $s eq "次回決算 %1 まであと%2";$s=~s/%([1-9])/$a[$1-1]/ge;return $s}',
    getSub('Get02D'),getSub('GetTime2HMS'),sources.timeSource,
    'my @out;for $DTlasttime (@{$in->{times}}){$i="";'+clock+notices[0]+'push @out,{next=>$nextday-$TZ_JST+$DATE_REVISE_TIME,left=>$nextday-$now,label=>$i};}print encode_json([@out]);'
  ].join('\n');
  const expected=JSON.parse(execFileSync('perl',['-e',perl],{input:JSON.stringify({times}),encoding:'utf8'}));
  for(let i=0;i<times.length;i++){
    const row=expected[i],result=describeOriginalSettlementMenu({reviewed,lasttime:times[i],nextSettlementAtSeconds:row.next});
    assert.equal(result.secondsUntilSettlement,row.left);
    assert.equal(result.label,row.label);
  }
  assert.throws(()=>reviewOriginalSettlementMenu({...sources,menuSource:sources.menuSource+'\n'}),/source drift/);
  assert.throws(()=>describeOriginalSettlementMenu({reviewed,lasttime:118800,nextSettlementAtSeconds:118800}),/boundary mismatch/);
});

test('original owner clock matches both frozen inc-main and inc-info branches',async()=>{
  const sources={menuSource:await read('../../custom/inc-menu.cgi'),configSource:await read('../../_config.cgi'),readSource:await read('./original-perl/inc-func.cgi'),timeSource:await read('./original-perl/pinned-time.cgi')};
  const incMainSource=await read('./original-perl/core-inc-main.cgi'),infoSource=await read('./original-perl/core-inc-info.cgi');
  const reviewed=reviewOriginalOwnerClock({reviewed:reviewOriginalSettlementMenu(sources),incMainSource,infoSource});
  const blocks=[incMainSource,infoSource].map(s=>{
    const start=s.indexOf('my $tm=$NOW_TIME-$DT->{time};'),end=s.indexOf('my $',start+4);
    assert.ok(start>=0&&end>start);return s.slice(start,end);
  });
  const getSub=name=>{
    const begin=sources.readSource.indexOf('sub '+name+'\n{'),end=sources.readSource.indexOf('\n}',begin);
    assert.ok(begin>=0&&end>begin);return sources.readSource.slice(begin,end+2);
  };
  const remaining=[-259201,-3601,-3600,-60,-59,-1,0,1,59,60,61,3599,3600,3660,259199,259200,259201,999999];
  const perl=[
    'use utf8;use JSON::PP;no strict;no warnings;local $/;my $in=decode_json(<STDIN>);$MAX_STOCK_TIME=72*3600;',
    'sub l {my($s,@a)=@_;$s="小時" if $s eq "時間";$s="距離可以行動還有 %1" if $s eq "行動可能まであと %1";$s=~s/%([1-9])/$a[$1-1]/ge;return $s}',
    getSub('Get02D'),getSub('GetTime2HMS'),
    'my @out;for my $left (@{$in->{remaining}}){$NOW_TIME=1000000;$DT={time=>$NOW_TIME-$left};my @row;for my $code (@{$in->{blocks}}){my $label=eval($code.q{return $tm;});die $@ if $@;push @row,$label;}push @out,[@row];}print encode_json([@out]);'
  ].join('\n');
  const expected=JSON.parse(execFileSync('perl',['-e',perl],{input:JSON.stringify({remaining,blocks}),encoding:'utf8'}));
  for(let i=0;i<remaining.length;i++){
    const left=remaining[i],world={nowSeconds:1000000,shops:[{id:1,status:1,time:1000000-left}]},before=structuredClone(world);
    const result=describeOriginalOwnerClock({reviewed,world});
    assert.deepEqual(expected[i],[result.label,result.label]);
    assert.equal(result.remainingSeconds,left);
    assert.deepEqual(world,before);
  }
  assert.equal(describeOriginalOwnerClock({reviewed,world:{shops:[]}}),null);
  assert.throws(()=>reviewOriginalOwnerClock({reviewed:reviewOriginalSettlementMenu(sources),incMainSource:incMainSource+'\n',infoSource}),/source drift/);
});

import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';
test('D original read-only settlement and owner clock follow genuine HTTP world across save reload',async t=>{
  const p=await genuinePlayer(t,{crossPeriod:true,marketCommerce:true});
  const verify=s=>{
    assert.equal(s.settlementMenu.nextSettlementAtSeconds,s.nextSettlementAtSeconds);
    assert.equal(s.settlementMenu.secondsUntilSettlement,s.secondsUntilSettlement);
    assert.equal(s.settlementMenu.timezoneSeconds,32400);
    assert.equal(s.ownerClock.remainingSeconds,s.world.nowSeconds-s.shop.time);
    assert.equal(s.ownerClock.source,'r4-frozen-owner-clock.v1');
  };
  verify(p.state);
  await p.tick(1);verify(p.state);
  const before=structuredClone(p.state.world),history=p.state.historyCommands;
  const read=await p.request('/api/state');verify(read);
  assert.deepEqual(read.world,before);assert.equal(read.historyCommands,history);
  await p.saveAndRestart(0);verify(p.state);assert.deepEqual(p.state.world,before);
});
