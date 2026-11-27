import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {loadStandardStreetModel} from '../src/standard-street-model.mjs';
import {compileLiteralItemLimit} from '../src/item-limit-model.mjs';
import {compileReviewedGuildAdvertiseUse,projectOriginalGuildAdvertisement} from '../src/reviewed-guild-advertise-no-guild-use.mjs';
const itemDsl=readFileSync(new URL('../../custom/inc-item-data.cgi',import.meta.url),'utf8');
const rebelDsl=readFileSync(new URL('../../custom/inc-rebel-data.cgi',import.meta.url),'utf8');
const model=loadStandardStreetModel(itemDsl,rebelDsl);
const limits=Array.from({length:79},(_,i)=>compileLiteralItemLimit(model.items.find(x=>x.id===i+1).limitRaw));
const rule=compileReviewedGuildAdvertiseUse({itemDsl,model,limits});
const perl=String.raw`use utf8;use JSON::PP;
my $in=JSON::PP->new->utf8->decode(do{local $/;<STDIN>});
our %GUILD;
my $dsl=$in->{dsl};
my @parts=grep{/^\@\@ITEM\b/m&&/^\s*no\s+62(?:\s|$)/m}split(/(?=^\@\@ITEM\b)/m,$dsl);
die 'missing source item' unless @parts==1;
my @uses=split(/^\s*\@\@USE[^\n]*(?:\n|$)/mi,$parts[0]);
die 'source use count' unless @uses==4;
my($body)=$uses[3]=~/^\s*func\s+_local_\s*\n([\s\S]*?)^\s*_local_\s*$/m;
die 'missing source callback' unless defined $body;
@item::DT=@{$in->{shops}};$item::GUILDIDX_name=0;
($item::DT)=grep{$_->{id}==$in->{actorId}}@item::DT;
for my $k(keys %{$in->{definitions}}){$GUILD{$k}=[$in->{definitions}{$k}{name}]}
our @logs;
sub item::WriteLog {push @main::logs,[@_]}
my $fn=eval "package item;no strict;no warnings;use utf8;sub {\n$body\n}";
die $@ unless $fn;
my $ret=$fn->();
print JSON::PP->new->utf8->encode({shops=>\@item::DT,returned=>$ret,logCalls=>\@logs,committable=>JSON::PP::false});
`;
const oracle=input=>JSON.parse(execFileSync('perl',['-e',perl],{input:JSON.stringify({...input,dsl:itemDsl}),encoding:'utf8'}));
const shop=(id,guild,rank)=>({id,status:1,guild,rank,shopname:'店'+id,item:Array(79).fill(0)});
const f={shops:[shop(4,'alpha',10000),shop(2,'beta',4000),shop(1,'alpha',5010),shop(3,'alpha',0)],actorId:1,definitions:{alpha:{name:'同商會'},beta:{name:'其他商會'}},count:1};
test('R4 normal guild advertisement updates actor and same-street guild peers in source order',()=>{
  const before=structuredClone(f);const a=projectOriginalGuildAdvertisement({rule,...f});
  assert.deepEqual(a,oracle(f));assert.deepEqual(f,before);
  assert.deepEqual(a.shops.map(s=>s.rank),[10000,4000,5509,1000]);
  assert.equal(rule.time,28800);assert.equal(rule.uses[0].countPerUse,1);
});
test('R4 no-membership guild advertisement has no rank or log effects',()=>{
  const x={...f,shops:f.shops.map(s=>s.id===1?{...s,guild:''}:s)};
  assert.deepEqual(projectOriginalGuildAdvertisement({rule,...x}),oracle(x));
});
