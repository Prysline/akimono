import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {reviewOriginalOwnerHelp,describeOriginalOwnerHelp,describeOriginalOwnerScene} from '../src/original-r4-owner-help.mjs';
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
    'print encode_json([@out]);',
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
  const fresh=structuredClone(cases[0]);delete fresh.shops[0].trush;
  assert.deepEqual(describeOriginalOwnerHelp({reviewed,world:fresh}),describeOriginalOwnerHelp({reviewed,world:cases[0]}));
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

test('frozen DevelopImage and CharaDefine scene matches actual source across time, stock, rank and image thresholds',async()=>{
  const source=normalizeLocalSourceText(await readFile(new URL('./original-perl/core-inc-main.cgi',import.meta.url),'utf8'));
  const reviewed=reviewOriginalOwnerHelp(source),cases=[];
  for(const phase of [0,1,2])for(const rank of [5499,5500])for(const stocked of [false,true])
    for(const [money,trush] of [[-1,0],[4999999,99999],[5000000,100000],[29999999,3100000],[30000000,4100000],[35000000,10000000]]){
      const item=Array(79).fill(0);item[78]=stocked?1:0;item[0]=1;
      cases.push({nowSeconds:43200+phase*3600,shops:[{id:1,status:1,foundation:0,rank,money,trush,showcasecount:2,showcase:[79,0],item}]});
    }
  const begin=source.indexOf('sub CharaDefine'),end=source.indexOf('sub TagChara',begin),develop=source.indexOf('sub DevelopImage');
  assert.ok(begin>=0&&end>begin&&develop>end);
  const code=source.slice(begin,end)+source.slice(develop);
  const perl=[
    'use utf8;use JSON::PP;no strict;no warnings;local $/;my $in=decode_json(<STDIN>);',
    'sub l{$_[0]} sub GetMenuTag{$_[1]} sub GetTagImgItemType{push @items,$_[0];"I"}',
    'sub TagChara{my($s,$id)=@_;$speech{$id}=$s;return "[$id]"}',
    'eval $in->{code};die $@ if $@;my @out;',
    'for my $world (@{$in->{cases}}){$DT=$world->{shops}[0];$NOW_TIME=$world->{nowSeconds};$gold="G";$trush="T";$vspace="[space]";@items=();%speech=();DevelopImage();CharaDefine();my @customers=($chara=~/\\[(\\w+)\\]/g);my @garbage=map{length($_)}($trush=~/(T+)/g);push @out,{gold=>length($gold),garbage=>[@garbage],items=>[@items],customers=>[@customers],speech=>{%speech}}}',
    'print encode_json([@out]);'
  ].join('\n');
  const original=JSON.parse(execFileSync('perl',['-e',perl],{encoding:'utf8',input:JSON.stringify({cases,code})}));
  const locale={
    '在庫を切らしちゃってるんです。スミマセン…':'庫存都賣光了。真是抱歉…',
    'ありゃりゃ，何にも売ってないぞ。困った。':'唔哇，什麼都沒有賣呢，真困擾。',
    'せっかく買いに来たのに何にもない…。どうしよう？':'好不容易來買東西竟然什麼都沒有…。該怎麼辦呢？',
    'しょうがないね。もうちょっと待ってみる？':'沒辦法呢。你可以再等一下嗎？',
    'ねぇねぇお姉ちゃん，なんでここには何にもないの？':'大姊姊~ 為什麼這邊東西什麼都沒有啊？',
    'いらっしゃいませっ':'歡迎光臨',
    'どれどれ。今日の買いどころは…':'我看看，今天要買啥好呢…',
    'ん～，これくださいな。':'嗯~ 請給我這個。',
    'うーん，そこそこ良い店ではあるんだけどね…':'嗯，這是一家不錯的店，不過...',
    'もう一声っていう感じなのよねぇ…':'感覺像是另一種聲音…',
    'ここはなかなか良いところだな。':'這裡真是個好地方。',
    'そうじゃな。わしもよく寄る店じゃ。':'是啊。這是我也常來的商店。',
  };
  const before=structuredClone(cases);
  for(let i=0;i<cases.length;i++){
    const got=describeOriginalOwnerScene({reviewed,world:cases[i]}),want=original[i];
    assert.equal(got.goldCount,want.gold);
    assert.deepEqual(got.garbageRows,want.garbage);
    assert.deepEqual(got.displayedItems,want.items);
    assert.deepEqual(got.helper,{sprite:0,text:locale[want.speech[0]]});
    assert.deepEqual(got.customers,want.customers.map(id=>id==='space'?null:{sprite:Number(id),text:locale[want.speech[id]]}));
    assert.deepEqual(got.assets.customerSlots,want.customers.map(id=>id==='space'?{path:'map/dummy.png',width:64,height:16}:{path:'map/c-s'+id+'.png',sourceClass:'c'}));
    assert.deepEqual(got.assets.gold,{path:'map/c-sg.png',width:24,height:24});
    assert.deepEqual(got.assets.garbage,{path:'map/c-st.png',sourceClass:'c'});
    assert.deepEqual(got.assets.news,{path:'map/c-sn.png',width:24,height:26});
    assert.deepEqual(got.assets.warehouse,{path:'map/shops.png',width:90,height:42});
    assert.deepEqual(got.assets.helper,{path:'map/c-s0.png',sourceClass:'c'});
  }
  assert.deepEqual(cases,before);
  assert.equal(describeOriginalOwnerScene({reviewed,world:null}),null);
});
