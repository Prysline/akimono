import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {loadNormalCommerceAuditSources} from '../scripts/audit-normal-commerce.mjs';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {createPeriodMemoryWorld,createSourceReviewedMemoryWorldAdapter,executeMemoryCommand} from '../src/game-core-contract.mjs';
import {reviewOriginalPeriodBootstrap,createOriginalPeriodSeed} from '../src/original-period-world-seed.mjs';
import {formatOriginalBalanceDuration} from '../src/original-r4-balance-view.mjs';
const sub=(s,n)=>{const i=s.indexOf('sub '+n+'\n{'),j=s.indexOf('\n}',i);assert.ok(i>=0&&j>i,n);return s.slice(i,j+2);};
const perl=[
 'use utf8;use JSON::PP;no strict;no warnings;',
 'local $/;my $in=decode_json(<STDIN>);',
 'sub l {my %lang=("時間"=>"小時");return $lang{$_[0]}//$_[0]}',
 'eval $in->{helpers};die $@ if $@;eval $in->{config};die $@ if $@;',
 'my @out;for my $s (@{$in->{cases}}){',
 'my $level=DignityDefine($s->{dignity},0);$level=$DIGNITY[0] if !$level;',
 'my $exp=0;$exp+=$_ for values %{$s->{exp}};',
 'push @out,{level=>$level,tax=>GetUserTaxRate($s,0),experience=>int($exp/10),duration=>GetTime2HMS($s->{elapsed}),accrued=>int($s->{costtoday})};}',
 'print encode_json(\\@out);',
].join('\n');
test('R4 original inc-info balance read view shares frozen ledger shelf cost and Perl dignity/time/tax',async()=>{
 const input=await loadNormalCommerceAuditSources();
 const opts={...input,enableReviewedNormalTime:true,enableReviewedFullCommerce:true};
 const street=createStandardStreetModule(opts);
 assert.equal(typeof street.describeBalance,'function');
 assert.equal(createStandardStreetModule(input).describeBalance,undefined);
 assert.throws(()=>createStandardStreetModule({...opts,originalInfoViewSource:input.originalInfoViewSource+'\n'}),/source drift/);
 const source=input.originalInfoViewSource;
 for(const marker of ['GetMoneyString(int($DT->{costtoday}))','GetMoneyString($SHOWCASE_COST[$DT->{showcasecount}-1])','GetUserTaxRate($DT,$DTTaxrate)','GetTime2HMS($NOW_TIME-$DT->{foundation})','int($expsum/10)','DignityDefine($DT->{dignity},2)'])assert.ok(source.includes(marker),marker);
 const period=createOriginalPeriodSeed(reviewOriginalPeriodBootstrap({periodSource:input.originalPeriodSource,adminSource:input.originalAdminInitSource,readSource:input.originalDataReadSource,writeSource:input.originalDataWriteSource,reviewedB41:street.reviewedB41}));
 const repo=createSourceReviewedMemoryWorldAdapter({initialWorld:createPeriodMemoryWorld({worldId:'controlled-balance-view',streetId:street.id,nowSeconds:1000000,period}),streetModule:street});
 for(const [kind,fields] of [['initialize-source-market',{}],['open-shop',{shopId:1,ownerName:'來源測試',shopName:'受控收支'}]]){
   const r=executeMemoryCommand({repository:repo,streetModule:street,command:{kind,expectedRevision:repo.read().revision,...fields}});
   assert.equal(r.ok,true,JSON.stringify(r.details));
 }
 const times=[0,59,60,3599,3600,259199,259200,345601];
 const dignity=[0,1,2,4,8,16,31,32];
 const shelfCosts=[...input.itemDsl.matchAll(/^\s*CostShowcase(\d+)\s+(\d+)\s*(?:#.*)?$/gmi)].map(x=>Number(x[2]));
 const cases=times.map((elapsed,i)=>({elapsed,dignity:dignity[i],taxmode:i%3,exp:{'9':i*10+9,'40':i*10+9},costtoday:i*100+.875}));
 const helpers=sub(input.originalCustomSource,'DignityDefine')+'\n'+sub(input.originalDetailSource,'GetUserTaxRate')+'\n'+sub(input.originalDataReadSource,'Get02D')+'\n'+sub(input.originalDataReadSource,'GetTime2HMS');
 const config=input.originalConfigSource.match(/@DIGNITY=\([\s\S]*?\);/)[0]+'\n'+input.originalConfigSource.match(/@DIG_POINT=\([\s\S]*?\);/)[0];
 const oracle=JSON.parse(execFileSync('perl',['-e',perl],{encoding:'utf8',input:JSON.stringify({helpers,config,cases})}));
 for(const [i,c] of cases.entries()){
   const world=structuredClone(repo.read()),s=world.shops[0];
   Object.assign(s,{foundation:world.nowSeconds-c.elapsed,dignity:c.dignity,taxmode:c.taxmode,exp:c.exp,costtoday:c.costtoday,showcasecount:i+1,showcase:Array(i+1).fill(0),price:Array(i+1).fill(0),costyesterday:1234,taxyesterday:56,rankingcount:i,job:i?'material':''});
   const before=structuredClone(world),view=street.describeBalance(world),p=oracle[i];assert.deepEqual(world,before);
   assert.equal(view.dignityName,p.level);assert.equal(view.baseTaxRate,p.tax);assert.equal(view.totalExperiencePercent,p.experience);assert.equal(view.foundedLabel,p.duration);assert.equal(view.accruedMaintenance,p.accrued);
   assert.equal(view.shelfMaintenance,shelfCosts[i]);assert.equal(view.previousMaintenance,1234);assert.equal(view.previousTax,56);assert.equal(view.jobName,i?'山師':'自由業');assert.equal(view.rankingCount,i);
   assert.equal(formatOriginalBalanceDuration(c.elapsed),p.duration);
 }
});
