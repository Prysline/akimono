import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const script=await readFile(new URL('../local-ui/app.js',import.meta.url),'utf8');
const fn=script.slice(script.indexOf('function sourceDiscardPresentation('),script.indexOf('function renderDiscardPresentation('));
const view=new Function(fn+';return sourceDiscardPresentation;')();
test('F3 original discard and dismissal preset options match actual Perl source',async()=>{
 const source=await readFile(new URL('./original-perl/core-inc-item-throw.cgi',import.meta.url),'utf8');
 assert.equal(createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex'),'714e623b9fd1f40ce7c51b89503d2a801330f1bb');
 const perl=[
 'use utf8;use JSON::PP;no strict;no warnings;local $/;my $in=decode_json(<STDIN>);',
 'sub l {$_[0]} $itemno=1;$DT={item=>[$in->{stock}]};$ITEM[1]={flag=>$in->{human}?"h":"",scale=>"x"};',
 'eval $in->{source};die $@ if $@;my @counts=map {0+$_} $disp =~ /<OPTION VALUE="(\\d+)"/g;',
 'print encode_json({counts=>\\@counts,all=>($disp =~ /\\d+\\((?:全部|全員)\\)/?1:0),human=>($disp =~ /解雇/?1:0)});'
 ].join('\n');
 for(const stock of [0,1,2,10,11,100,125,10000,10001])for(const human of [false,true]){
  const original=JSON.parse(execFileSync('perl',['-e',perl],{encoding:'utf8',input:JSON.stringify({source,stock,human})}));
  const actual=view({flagRaw:human?'human':''},stock);
  assert.deepEqual(actual.options.map(x=>x.count),original.counts);
  assert.equal(actual.options.some(x=>x.label.endsWith(human?'（全員）':'（全部）')),Boolean(original.all));
  assert.equal(actual.verb==='解雇',Boolean(original.human));
 }
});
test('F3 t/notrash form suppression and human wording, no guessed eligibility',()=>{
 for(const flagRaw of ['notrash','human|notrash']){
  const v=view({flagRaw},10);assert.equal(v.prohibited,true);
  assert.deepEqual(v.options,[{count:0,label:'請選擇'}]);
 }
 assert.equal(view({flagRaw:'human|notrash'},10).verb,'解雇');
 assert.equal(view({flagRaw:''},0).options.length,1);
 const htmlTest=script.slice(script.indexOf('function renderDiscardPresentation('),script.indexOf('function renderItemInfo('));
 assert.match(htmlTest,/form.hidden=!shop\|\|!item\|\|prohibited/);
 assert.match(script,/expectedRevision:snapshot.world.revision,itemId,count/);
 assert.match(script,/count>shop.item\[itemId-1\]\|\|prohibited/);
});
