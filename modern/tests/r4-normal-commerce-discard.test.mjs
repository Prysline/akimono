import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {loadNormalCommerceAuditSources} from '../scripts/audit-normal-commerce.mjs';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {createPeriodMemoryWorld,createSourceReviewedMemoryWorldAdapter,executeMemoryCommand} from '../src/game-core-contract.mjs';
import {reviewOriginalPeriodBootstrap,createOriginalPeriodSeed} from '../src/original-period-world-seed.mjs';
import {parseDsl} from '../src/parse-dsl.mjs';
const sourceSub=(s,n)=>{const i=s.indexOf('sub '+n+'\n{'),j=s.indexOf('\n}',i);assert.ok(i>=0&&j>i,n);return s.slice(i,j+2);};
const root=new URL('./original-perl/',import.meta.url);
// Run actual item-t.cgi, actual CheckCount and CheckItemNo. Lock, auth,
// log, output and disk are explicit boundary stubs; this is not CGI E2E.
const oracle=[
 'use utf8;use JSON::PP;no strict;no warnings;',
 'local $/;my $in=decode_json(<STDIN>);my @calls;',
 'sub Lock {push @calls,"Lock"} sub DataRead {push @calls,"DataRead"}',
 'sub CheckUserPass {push @calls,"CheckUserPass";$DT->{lastlogin}=$NOW_TIME}',
 'sub OutError {die "DENIED $_[0]"} sub l {my($m,@p)=@_;$m=~s/%([1-3])/$p[$1-1]/ge;return $m}',
 'sub PushLog {push @calls,"PushLog";$log=[@_]} sub RenewLog {push @calls,"RenewLog"}',
 'sub DataWrite {push @calls,"DataWrite"} sub DataCommitOrAbort {push @calls,"DataCommitOrAbort"}',
 'sub UnLock {push @calls,"UnLock"} sub OutSkin {push @calls,"OutSkin"}',
 'eval $in->{check};die $@ if $@;eval $in->{item};die $@ if $@;',
 '$MAX_ITEM=79;$NOW_TIME=$in->{now};$DT=$in->{shop};@DT=($DT);',
 '@DTwholestore=split(/,/,$in->{wire},$MAX_ITEM);$ITEM[$in->{id}]=$in->{meta};',
 '%Q=(item=>$in->{id},cnt1=>$in->{count},cnt2=>0);',
 'my $ok=eval $in->{submit};my $error=$@;',
 'print encode_json({ok=>$ok?1:0,error=>$error,calls=>\\@calls,stock=>0+$DT->{item}[$in->{id}-1],trush=>0+$DT->{trush},lastlogin=>0+$DT->{lastlogin},wire=>join(",",@DTwholestore),log=>$log});',
].join('\n');
test('R4 discard/cleaning source blobs and actual no-guild item-t.cgi versus GameCore CAS',async()=>{
 const input=await loadNormalCommerceAuditSources();
 for(const [name,sha] of Object.entries({'core-inc-item-throw.cgi':'714e623b9fd1f40ce7c51b89503d2a801330f1bb','core-item-t.cgi':'ded6d1efc44003b000e4f76562c6eb4ddcda4b29','core-sweep.cgi':'720d950c288c44b2ac664193a7c9e96c5a2b18d0','core-sweep-s.cgi':'cecf6b31bfb231ca4b98b37082076171b1e9577c'})){
   const bytes=await readFile(new URL(name,root));assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),sha);
 }
 const options={...input,enableReviewedNormalTime:true,enableReviewedFullCommerce:true};
 const street=createStandardStreetModule(options);assert.equal(street.reviewedDiscard,true);
 assert.throws(()=>createStandardStreetModule({...options,originalDiscardSubmitSource:input.originalDiscardSubmitSource+'\n'}),/frozen source drift/);
 const period=createOriginalPeriodSeed(reviewOriginalPeriodBootstrap({periodSource:input.originalPeriodSource,adminSource:input.originalAdminInitSource,readSource:input.originalDataReadSource,writeSource:input.originalDataWriteSource,reviewedB41:street.reviewedB41}));
 const repo=createSourceReviewedMemoryWorldAdapter({initialWorld:createPeriodMemoryWorld({worldId:'controlled-discard',streetId:street.id,nowSeconds:1000000,period}),streetModule:street});
 const run=(repository,kind,fields={})=>executeMemoryCommand({repository,streetModule:street,command:{kind,expectedRevision:repository.read().revision,...fields}});
 for(const [kind,fields] of [['initialize-source-market',{}],['open-shop',{shopId:1,ownerName:'來源測試',shopName:'受控丟棄'}]])assert.equal(run(repo,kind,fields).ok,true);
 const numeric=JSON.parse(execFileSync('perl',['original-normal-commerce-item-compiler.pl'],{cwd:root,encoding:'utf8'}));
 const blocks=parseDsl(input.itemDsl,'custom/inc-item-data.cgi').blocks.filter(b=>b.kind==='ITEM');
 for(const [id,owned,requested,initialWholesale,explicit] of [[9,3,1,0,false],[9,1,9,2,true],[66,2,1,1,true],[20,1,1,0,false],[63,1,1,0,false],[79,5,5,0,false],[9,0,1,0,false]]){
   const seed=structuredClone(repo.read()),shop=seed.shops[0],i=id-1;
   shop.item[i]=owned;shop.trush=123;shop.lastlogin=seed.nowSeconds-60;
   const market=seed.market;market.wholesale[i]=initialWholesale;
   const positions=new Set(market.sparseWrittenSlots);if(explicit)positions.add(i);else positions.delete(i);
   market.sparseWrittenSlots=[...positions].sort((a,b)=>a-b);
   const last=market.sourceWriteShape==='whole-store-79'?78:(market.sparseWrittenSlots.at(-1)??-1);
   market.originalWholesaleCsv=Array.from({length:last+1},(_,j)=>positions.has(j)?String(market.wholesale[j]):'').join(',');
   const b=blocks.find(x=>Number(x.fields.no[0].value)===id),raw=b.fields.limit[0].value.split('/');
   const meta={...numeric[i],name:b.fields.name[0].value,scale:b.fields.scale[0].value,wslimit:Number(raw[1]??raw[0])};
   const original=JSON.parse(execFileSync('perl',['-e',oracle],{encoding:'utf8',input:JSON.stringify({now:seed.nowSeconds,shop,id,count:requested,wire:market.originalWholesaleCsv,meta,check:sourceSub(input.originalBuyCalcSource,'CheckCount'),item:sourceSub(input.originalBuyItemSource,'CheckItemNo'),submit:input.originalDiscardSubmitSource})}));
   const trial=createSourceReviewedMemoryWorldAdapter({initialWorld:seed,streetModule:street}),before=trial.read();
   const result=run(trial,'discard-item',{shopId:1,itemId:id,count:requested});
   if(!owned){assert.equal(original.ok,0);assert.equal(result.ok,false);assert.deepEqual(trial.read(),before);continue;}
   assert.equal(original.ok,1,original.error);assert.equal(result.ok,true,JSON.stringify(result.details));
   const after=trial.read();
   assert.deepEqual(original.calls,['Lock','DataRead','CheckUserPass','PushLog','RenewLog','DataWrite','DataCommitOrAbort','UnLock','OutSkin']);
   assert.deepEqual([after.shops[0].item[i],after.shops[0].trush,after.shops[0].lastlogin,after.market.originalWholesaleCsv],[original.stock,original.trush,original.lastlogin,original.wire]);
   assert.deepEqual(original.log.slice(0,2),[0,1]);
   assert.equal(result.details.discardedCount,Math.min(owned,requested));assert.equal(result.details.timeSpentSeconds,0);
   assert.equal(after.shops[0].time,before.shops[0].time);assert.equal(after.shops[0].money,before.shops[0].money);assert.deepEqual(after.shops[0].showcase,before.shops[0].showcase);
   assert.equal(after.revision,before.revision+1);assert.equal(after.nowSeconds,before.nowSeconds);
   const stale=executeMemoryCommand({repository:trial,streetModule:street,command:{kind:'discard-item',shopId:1,itemId:id,count:1,expectedRevision:before.revision}});
   assert.equal(stale.code,'REVISION_CONFLICT');assert.deepEqual(trial.read(),after);
 }
});
