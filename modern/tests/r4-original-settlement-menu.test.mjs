import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {normalizeLocalSourceText} from '../src/local-source-text.mjs';
import {reviewOriginalSettlementMenu,describeOriginalSettlementMenu} from '../src/original-r4-settlement-menu.mjs';
const read=async p=>normalizeLocalSourceText(await readFile(new URL(p,import.meta.url),'utf8'));
test('original desktop settlement menu matches Perl source at minute, hour and 36h boundaries',async()=>{
  const sources={menuSource:await read('../../custom/inc-menu.cgi'),configSource:await read('../../_config.cgi'),readSource:await read('./original-perl/inc-func.cgi'),timeSource:await read('./original-perl/core-time.cgi')};
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
