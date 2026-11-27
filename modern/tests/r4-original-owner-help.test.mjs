import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {reviewOriginalOwnerHelp,describeOriginalOwnerHelp} from '../src/original-r4-owner-help.mjs';
import {normalizeLocalSourceText} from '../src/local-source-text.mjs';

test('frozen HelpMessage and DevelopImage match all local threshold and stocked-shelf cases',async()=>{
  const source=normalizeLocalSourceText(await readFile(new URL('./original-perl/core-inc-main.cgi',import.meta.url),'utf8'));
  const reviewed=reviewOriginalOwnerHelp(source);
  const cases=[];
  for(const age of [0,10799,10800,10801])
    for(const trush of [0,4000000,4000001])
      for(const [showcase,owned] of [[[0],[]],[[79],[]],[[79],[79]],[[79,1],[1]],[[0,79],[]],[[0,79],[1]]]){
        const item=Array(79).fill(0);for(const id of owned)item[id-1]=1;
        cases.push({nowSeconds:50000+age,shops:[{id:1,status:1,foundation:50000,trush,money:100000,showcasecount:showcase.length,showcase,item}]});
      }
  const perl=[
    'use utf8;use JSON::PP;no strict;no warnings;local $/;my $in=decode_json(<STDIN>);',
    'sub GetTagImgKao{""} sub GetMenuTag{$_[1]} sub GetTagImgItemType{"ITEM"} sub l{push @msg,$_[0];return $_[0]}',
    'my $source=$in->{source};$source=substr($source,index($source,"sub HelpMessage"));eval $source;die $@ if $@;',
    'my @out;for my $world (@{$in->{cases}}){$DT=$world->{shops}[0];$NOW_TIME=$world->{nowSeconds};$NeverR=0;$gold="G";$trush="T";$disp="";@msg=();DevelopImage();HelpMessage();push @out,{show=>$show?1:0,msg=>[@msg]};}',
    'print encode_json(\@out);',
  ].join('\n');
  const expected=JSON.parse(execFileSync('perl',['-e',perl],{encoding:'utf8',input:JSON.stringify({source,cases})}));
  const locale={
    'はじめまして。私が店のお手伝いをさせてもらってます。':'很高興見到你，我是店裡的小幫手。',
    'さっそくですが店長さま，':'店長，那麼接下來，',
    '<A HREF="action.cgi?key=library&t=1" TARGET=_blank>[ゲームのやり方]</A>はご存知ですか？':'看過[遊戲遊玩]了嗎？',
    '店長さま，お帰りなさいませ。':'店長您回來了啊。',
    'お店の中が汚れてきています。そろそろ掃除したらいかがでしょう。':'店裡越來越髒。來打掃一下如何？',
    '店長さま，売る物がなくなってしまいました。':'店長，已經沒有商品可以賣囉。',
    'すぐに在庫を補充するか，代わりのものを売りに出しましょう。':'要馬上補充庫存還是更換商品販售嗎。',
    'お店はいまのところ順調ですよ。':'店裡的營運情況非常順利。',
  };
  const before=structuredClone(cases);
  for(let i=0;i<cases.length;i++){
    const actual=describeOriginalOwnerHelp({reviewed,world:cases[i]});
    const msg=expected[i].msg.filter(x=>x!=='お手伝い').map(x=>locale[x]);
    assert.ok(msg.every(Boolean));
    assert.equal(actual.hasDisplayedStock,Boolean(expected[i].show));
    assert.deepEqual(actual.lines,msg.length===3?[msg[0],msg[1]+msg[2]]:msg);
    assert.equal(actual.libraryChapter,msg.length===3?1:null);
    assert.equal(actual.mailSupported,false);
  }
  assert.deepEqual(cases,before);
  assert.equal(describeOriginalOwnerHelp({reviewed,world:null}),null);
  assert.throws(()=>reviewOriginalOwnerHelp(source+'\n'),/source drift/);
  assert.throws(()=>describeOriginalOwnerHelp({reviewed:{},world:cases[0]}),/review required/);
});
