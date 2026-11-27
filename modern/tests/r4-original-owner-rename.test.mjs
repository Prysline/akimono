import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {reviewOriginalOwnerRename,planOriginalOwnerRename} from '../src/original-r4-owner-rename.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const f=n=>read('./original-perl/'+n);
const sources={formSource:f('core-other.cgi'),submitSource:f('core-user-settings.cgi'),nameSource:f('core-name.cgi'),configSource:read('../../_config.cgi'),readSource:f('inc-func.cgi'),writeSource:f('write.cgi'),logSource:f('pinned-log.cgi'),loginSource:f('core-rename-login.cgi')};
const reviewed=reviewOriginalOwnerRename(sources);
test('A33 source candidate matches real frozen Perl name handlers and file lookup (not account integration)',t=>{
 const dir=mkdtempSync(join(tmpdir(),'akimono-rename-oracle-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 mkdirSync(join(dir,'street','data'),{recursive:true});mkdirSync(join(dir,'work'));
 // Synthetic user.cgi rows intentionally differ from current DT name.
 writeFileSync(join(dir,'street','data','user.cgi'),'OtherOwner\t既有店名\t2\nOldOwner\t舊的店名\t1\n','utf8');
 const ng=sources.configSource.match(/@NG_SHOP_NAME\s*=\s*qw\([^)]+\);/)[0];
 const bodies=['shopname','owname'].map(n=>sources.submitSource.match(new RegExp('sub '+n+'\\n\\{[\\s\\S]*?\\n\\}'))[0]);
 const names=sources.nameSource.replace(/^use utf8;\n/,'');
 const values=['','甲','甲乙','甲乙丙','甲乙丙丁','字'.repeat(12),'字'.repeat(13),'字'.repeat(20),'字'.repeat(21),'😀'.repeat(4),'😀'.repeat(20),'😀'.repeat(21),'管理店','支援商店','aa商店','AA商店','http店名','?店名','甲,乙丙','甲:乙丙','甲;乙丙','甲\t乙丙','甲\r乙丙','甲\n乙丙','甲<乙丙','甲>乙丙','甲&乙丙','甲"乙丙','甲/乙丙','既有店名','舊的店名','現有店名','現有店長','空密碼','零密碼'];
 const cases=['shopname','owname'].flatMap(kind=>[49999,50000,100000].flatMap(money=>values.map(name=>({kind,money,name}))));
 const oracle='use utf8; use JSON::PP; '+ng+'\n'+names+'\n'+bodies.join('\n')+'\n'+
 'sub l { my $s=shift; my $n=0; for(@_){$n++;$s=~s/%$n/$_/g;}return $s; } sub OutError { die $_[0]; } sub PushLog { push @events, [@_]; } $MYDIR="street"; $NEW_OTHERTOWN_BLOCK=0; %name2pass=("現有店長"=>"pw","空密碼"=>"","零密碼"=>"0"); my $a; { local $/; $a=decode_json(<STDIN>); } my @r; for my $c (@$a) { $DT={name=>"現有店長",shopname=>"現有店名",money=>$c->{money}}; %Q=(rename=>$c->{name},owname=>$c->{name}); @events=(); $disp=""; my $ok=eval { if($c->{kind} eq "shopname"){shopname();}else{owname();} 1 }; my $err=$@; $err=~s/ at -e line \\d+.*//s; push @r,[$ok?1:0,$DT->{name},$DT->{shopname},$DT->{money},\\@{[ @events ]},$err]; } print encode_json(\\@r);';
 const expected=JSON.parse(execFileSync('perl',['-e',oracle],{cwd:join(dir,'work'),input:JSON.stringify(cases),encoding:'utf8'}));
 const actual=cases.map(c=>{
   const shop={id:1,status:1,name:'現有店長',shopname:'現有店名',money:c.money,time:80,lastlogin:90,paytoday:11};
   const r=planOriginalOwnerRename({reviewed,shop,kind:c.kind,name:c.name,nowSeconds:100,duplicateName:({kind,name})=>kind==='shopname'?['既有店名','舊的店名'].includes(name):name==='現有店長'});
   if(!r.ok)return [0,shop.name,shop.shopname,shop.money,[],r.sourceMessage];
   assert.equal(r.shop.lastlogin,100);assert.equal(r.shop.time,80);assert.equal(r.shop.paytoday,11);assert.equal(r.reentry.required,true);assert.equal(shop.money,c.money);
   return [1,r.shop.name,r.shop.shopname,r.shop.money,[[r.news.mode,r.news.id,r.news.sourceMessage]],''];
 });
 assert.deepEqual(actual,expected);
 assert.throws(()=>reviewOriginalOwnerRename({...sources,loginSource:sources.loginSource+' '}),/source drift/);
});
test('A33 no synthetic name authority or duplicate lookup before source guards',()=>{
 const shop={id:1,status:1,name:'店長',shopname:'原來商店',money:49999};
 const base={reviewed,shop,kind:'shopname',name:'新商店名',nowSeconds:100};
 let calls=0;const r=planOriginalOwnerRename({...base,duplicateName:()=>{calls++;return false;}});
 assert.equal(r.reason,'funds');assert.equal(calls,0);
 assert.throws(()=>planOriginalOwnerRename({...base,shop:{...shop,money:50000},duplicateName:()=>undefined}),/authoritative duplicate/);
 assert.throws(()=>planOriginalOwnerRename({...base,duplicateName:undefined}),/trusted transaction/);
});
