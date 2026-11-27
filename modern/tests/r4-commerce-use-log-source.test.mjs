import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {reviewCommerceUseLogs,projectReviewedCommerceUseLogRows} from '../src/original-r4-period-log-disk.mjs';
import {reviewOriginalSilentUseLogs,isOriginalSilentUse} from '../src/original-r4-silent-use-log.mjs';
import {loadNormalCommerceAuditSources} from '../scripts/audit-normal-commerce.mjs';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sources={helperSource:read('./original-perl/core-inc-item.cgi'),logSource:read('./original-perl/pinned-log.cgi'),configSource:read('../../_config.cgi')};
const reviewed=reviewCommerceUseLogs(sources);
test('full commerce actual frozen item::WriteLog / main::PushLog order, mode 3, private and public rows',()=>{
  const command={kind:'use-item',shopId:1,itemId:62,useId:0};
  const rule={supported:true,itemId:62,useId:0,source:'source-reviewed-example',inlineCallback:{kind:'advertise-self'}};
  const calls=[[0,1,'店鋪人氣上升'],[3,0,'店鋪進行宣傳']];
  const receipt={action:'use-item',shopId:1,itemId:62,useId:0,source:rule.source,callbackOrder:['source-inline-callback'],originalInlineLogCalls:calls};
  const nowSeconds=1000000;
  const getSub=(s,name)=>{const start=s.indexOf('sub '+name+'\n{'),end=s.indexOf('\n}',start);assert.ok(start>=0&&end>start);return s.slice(start,end+2);};
  const program='use utf8;use JSON::PP;local $/;my $in=decode_json(<STDIN>);our ($NOW_TIME,@LOG);$NOW_TIME=$in->{now};'+
    getSub(sources.logSource,'PushLog')+'\n{package item;'+getSub(sources.helperSource,'WriteLog')+'}\n'+
    'for my $row (@{$in->{calls}}){item::WriteLog(@$row)} print encode_json([@LOG]);';
  const expected=JSON.parse(execFileSync('perl',['-e',program],{input:JSON.stringify({now:nowSeconds,calls}),encoding:'utf8'}));
  assert.deepEqual(projectReviewedCommerceUseLogRows({reviewed,rule,command,receipt,nowSeconds}),expected);
  assert.throws(()=>projectReviewedCommerceUseLogRows({reviewed,rule,command,receipt:{...receipt,originalInlineLogCalls:[[3,1,'bad']]},nowSeconds}),/log target/);
  assert.throws(()=>projectReviewedCommerceUseLogRows({reviewed,rule,command,receipt:{...receipt,originalInlineLogCalls:[[4,0,'bad']]},nowSeconds}),/log target/);
  assert.throws(()=>reviewCommerceUseLogs({...sources,helperSource:sources.helperSource+' '}),/drift/);
});

test('R4 silent original USE log inventory matches all 116 compiled rules, and rejects mismatched receipts',async()=>{
  const input=await loadNormalCommerceAuditSources();
  const street=createStandardStreetModule({...input,enableReviewedNormalTime:true,enableReviewedCrossPeriod:true,enableReviewedFullCommerce:true});
  const reviewed=street.reviewedSilentUseLogs;
  assert.equal(Object.keys(reviewed.rules).length,82);
  const offers=street.listUseOffers({shops:[],events:null});
  assert.equal(offers.length,116);
  const silent=[],other=[];
  for(const {itemId,useId} of offers){
    const rule=street.useItem.getRule(itemId,useId);
    assert.equal(rule.supported,true);
    const command={kind:'use-item',shopId:1,itemId,useId};
    const receipt={action:'use-item',shopId:1,itemId,useId,source:rule.source,
      callbackOrder:[...(rule.beforeCallback?['before-use']:[]),'check-use','account','materials','make-amount','check-whole-store',...(rule.afterCallback?['after-use']:[]),...(rule.inlineCallback?['source-inline-callback']:[])]};
    const args={reviewed,rule,command,receipt};
    const expect=!rule.inlineCallback&&['reviewed-original-gift-use','original-pure-gift-dsl','original-declarative-use-dsl','original-gather-lostbook-use-dsl','b63-original-sword-map-all-five-original-first-use-outcomes'].includes(rule.source);
    assert.equal(isOriginalSilentUse(args),expect,itemId+'/'+useId);
    (expect?silent:other).push(itemId+':'+useId);
    if(expect){
      assert.throws(()=>isOriginalSilentUse({...args,receipt:{...receipt,originalInlineLogCalls:[[0,1,'unexpected']]}}),/silence identity/);
      assert.throws(()=>isOriginalSilentUse({...args,receipt:{...receipt,source:'wrong'}}),/silence identity/);
    }
  }
  assert.equal(silent.length,82);assert.equal(other.length,34);
  assert.equal(isOriginalSilentUse({reviewed:{...reviewed},command:{kind:'use-item',shopId:1,itemId:79,useId:0}}),false);
  assert.throws(()=>reviewOriginalSilentUseLogs({itemDsl:input.itemDsl,useSource:input.originalUseSource+'\n',helperSource:input.originalItemHelperSource,wholeSource:input.originalWholeSource,calcSource:input.originalBuyCalcSource}),/source drift useSource/);
});
