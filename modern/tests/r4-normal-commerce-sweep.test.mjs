import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const locations=[["itemDsl","../../custom/inc-item-data.cgi"],["rebelDsl","../../custom/inc-rebel-data.cgi"],["originalAdminInitSource","./original-perl/core-inc-admin-func.cgi"],["originalDataReadSource","./original-perl/inc-func.cgi"],["originalDataWriteSource","./original-perl/write.cgi"],["originalTurnSource","./original-perl/inc-turn.cgi"],["originalWholeSource","./original-perl/whole.cgi"],["originalCompilerSource","./original-perl/inc-makeitem.cgi"],["originalBuySource","./original-perl/buy-s.cgi"],["originalBuyItemSource","./original-perl/item.cgi"],["originalBuyCalcSource","./original-perl/calc.cgi"],["originalMarketSource","./original-perl/market.cgi"],["originalItemSource","./original-perl/item.cgi"],["originalDetailSource","./original-perl/core-detail.cgi"],["originalPeriodSource","./original-perl/period.cgi"],["originalUseSource","./original-perl/use.cgi"],["originalItemHelperSource","./original-perl/core-inc-item.cgi"],["originalShowcaseSource","./original-perl/sc-s.cgi"],["originalNewSource","./original-perl/new.cgi"],["originalCustomSource","./original-perl/pinned-custom.cgi"],["originalLogSource","./original-perl/pinned-log.cgi"],["originalSweepFormSource","./original-perl/core-sweep.cgi"],["originalSweepSubmitSource","./original-perl/core-sweep-s.cgi"],["originalStockViewSource","./original-perl/core-stock.cgi"],["originalConfigSource","../../_config.cgi"]];
const loadNormalCommerceAuditSources=async()=>Object.fromEntries(await Promise.all(locations.map(async ([k,p])=>[k,(await readFile(new URL(p,import.meta.url),'utf8')).replace(/\r\n/g,'\n')])));
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {createPeriodMemoryWorld,createSourceReviewedMemoryWorldAdapter,executeMemoryCommand} from '../src/game-core-contract.mjs';
import {reviewOriginalPeriodBootstrap,createOriginalPeriodSeed} from '../src/original-period-world-seed.mjs';
const sub=(s,n)=>{const i=s.indexOf('sub '+n+'\n{'),j=s.indexOf('\n}',i);assert.ok(i>=0&&j>i,n);return s.slice(i,j+2);};
const oracle=[
 'use utf8;use JSON::PP;no strict;no warnings;',
 'local $/;my $in=decode_json(<STDIN>);my @calls;',
 'sub Lock {push @calls,"Lock"} sub DataRead {push @calls,"DataRead"}',
 'sub CheckUserPass {push @calls,"CheckUserPass";$DT->{lastlogin}=$NOW_TIME}',
 'sub OutError {die "DENIED $_[0]"} sub l {my($m,@p)=@_;$m=~s/%([1-3])/$p[$1-1]/ge;return $m}',
 'sub RequireFile {} sub GetTagImgKao {""} sub GetTime2found {$_[0]} sub GetTime2HMS {$_[0]}',
 'sub DataWrite {push @calls,"DataWrite"} sub DataCommitOrAbort {push @calls,"DataCommitOrAbort"}',
 'sub UnLock {push @calls,"UnLock"} sub OutSkin {push @calls,"OutSkin"}',
 'eval $in->{helpers};die $@ if $@;',
 '$NOW_TIME=$in->{now};$MAX_STOCK_TIME=72*3600;$TIME_SEND_MONEY=1200;$TIME_SEND_MONEY_PLUS=100000;',
 '$DT=$in->{shop};%Q=(cnt1=>$in->{hours},cnt2=>0);',
 'my $old=$DT->{time};my $view=eval $in->{form};die $@ if $@;',
 'my @options=map {0+$_} ($disp=~/<OPTION VALUE="(\\d+)"/g);shift @options if @options && $options[0]==0;',
 'my $visible=($disp=~/<FORM ACTION=/)?1:0;my $clean=GetCleanMessage($DT->{trush},1);',
 '$DT->{lastlogin}=$in->{shop}{lastlogin};@calls=();$disp="";',
 'my $ok=eval $in->{submit};my $error=$@;',
 'print encode_json({ok=>$ok?1:0,error=>$error,calls=>\\@calls,garbage=>0+$DT->{trush},time=>0+$DT->{time},lastlogin=>0+$DT->{lastlogin},visible=>$visible,options=>\\@options,clean=>$clean});',
].join('\n');
test('R4 source sweep form, submit and CAS differential; stubbed CGI boundaries only',async()=>{
 const input=await loadNormalCommerceAuditSources();
 const stockBytes=await readFile(new URL('./original-perl/core-stock.cgi',import.meta.url));
 assert.equal(createHash('sha1').update('blob '+stockBytes.length+'\0').update(stockBytes).digest('hex'),'8465b8dd3c0d2ef8c81078b617806fcc9ed469ae');
 const options={...input,enableReviewedNormalTime:true,enableReviewedSweep:true};
 const street=createStandardStreetModule(options);assert.equal(street.reviewedSweep,true);
 assert.ok(street.capabilities.includes('sweep-shop'));
 assert.equal(createStandardStreetModule(input).capabilities.includes('sweep-shop'),false);
 assert.throws(()=>createStandardStreetModule({...options,originalSweepSubmitSource:input.originalSweepSubmitSource+'\n'}),/frozen source drift/);
 const period=createOriginalPeriodSeed(reviewOriginalPeriodBootstrap({periodSource:input.originalPeriodSource,adminSource:input.originalAdminInitSource,readSource:input.originalDataReadSource,writeSource:input.originalDataWriteSource,reviewedB41:street.reviewedB41}));
 const repo=createSourceReviewedMemoryWorldAdapter({initialWorld:createPeriodMemoryWorld({worldId:'controlled-sweep',streetId:street.id,nowSeconds:1000000,period}),streetModule:street});
 const run=(repository,kind,fields={})=>executeMemoryCommand({repository,streetModule:street,command:{kind,expectedRevision:repository.read().revision,...fields}});
 for(const [kind,fields] of [['initialize-source-market',{}],['open-shop',{shopId:1,ownerName:'來源測試',shopName:'受控清掃'}]])assert.equal(run(repo,kind,fields).ok,true);
 const helpers=['CheckCount','GetStockTime','UseTime'].map(n=>sub(input.originalBuyCalcSource,n)).concat(sub(input.originalBuyItemSource,'GetTimeDeal'),sub(input.originalCustomSource,'GetCleanMessage')).join('\n');
 const cleanLabels={'綺麗':'漂亮','清潔':'乾淨','普通':'普通','不潔':'髒亂','汚屋敷':'垃圾屋'};
 for(const [garbage,remaining,hours] of [[0,3600,1],[9999,3600,1],[10000,3599,1],[10000,3600,1],[300000,3600,1],[300001,7200,99],[1000000,3600,1],[2000000,7200,1],[3000000,3600,1],[4000000,3600,1],[5000000,3600,1],[5000001,360000,99],[10000,360000,99]]){
   const seed=structuredClone(repo.read()),shop=seed.shops[0];shop.trush=garbage;shop.time=seed.nowSeconds-remaining;shop.lastlogin=seed.nowSeconds-60;
   const original=JSON.parse(execFileSync('perl',['-e',oracle],{encoding:'utf8',input:JSON.stringify({now:seed.nowSeconds,shop,hours,helpers,form:input.originalSweepFormSource,submit:input.originalSweepSubmitSource})}));
   const quote=street.describeSweep(seed);assert.equal(quote.canSweep,Boolean(original.visible));assert.deepEqual(quote.options.map(o=>o.hours),original.options);
   assert.equal(quote.stockBlocked,garbage>5000000);assert.equal(quote.cleanLabel,cleanLabels[original.clean]);
   const trial=createSourceReviewedMemoryWorldAdapter({initialWorld:seed,streetModule:street}),before=trial.read();
   const result=run(trial,'sweep-shop',{shopId:1,requestedHours:hours});
   if(!original.ok){assert.equal(result.ok,false);assert.deepEqual(trial.read(),before);continue;}
   assert.equal(result.ok,true,JSON.stringify(result.details));
   const after=trial.read(),next=after.shops[0];
   assert.deepEqual(original.calls,['Lock','DataRead','CheckUserPass','DataWrite','DataCommitOrAbort','UnLock','OutSkin']);
   assert.deepEqual([next.trush,next.time,next.lastlogin],[original.garbage,original.time,original.lastlogin]);
   assert.equal(result.details.garbageRemoved,garbage-next.trush);
   assert.equal(result.details.timeSpentSeconds,next.time-Math.max(shop.time,seed.nowSeconds-259200));
   assert.equal(next.money,shop.money);assert.deepEqual(next.item,shop.item);assert.deepEqual(after.market,before.market);
   assert.equal(after.nowSeconds,before.nowSeconds);assert.equal(after.revision,before.revision+1);
   const stale=executeMemoryCommand({repository:trial,streetModule:street,command:{kind:'sweep-shop',shopId:1,requestedHours:1,expectedRevision:before.revision}});
   assert.equal(stale.code,'REVISION_CONFLICT');assert.deepEqual(trial.read(),after);
 }
});
