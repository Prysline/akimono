import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {reviewTargetCommerceCallbacks,projectTargetCommerceCallback} from '../src/original-r4-target-commerce-callbacks.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sources={itemDsl:read('../../custom/inc-item-data.cgi'),rebelDsl:read('../../custom/inc-rebel-data.cgi'),
  compilerSource:read('./original-perl/inc-makeitem.cgi'),showcaseSource:read('./original-perl/sc-s.cgi'),
  turnSource:read('./original-perl/inc-turn.cgi'),readSource:read('./original-perl/inc-func.cgi'),configSource:read('../../_config.cgi')};
const review=reviewTargetCommerceCallbacks(sources);
const probe=fileURLToPath(new URL('./original-perl/original-r4-target-commerce-callback-probe.pl',import.meta.url));
const shop=(id,patch={})=>({id,status:1,shopname:'Shop '+id,guild:'',rank:5010,point:20000,money:100000,paytoday:0,saletoday:0,
  item:Array(79).fill(0),showcasecount:1,showcase:[0],price:[0],job:'',exp:{},...patch});
const stocked=(id,stock,shelves,patch={})=>{const s=shop(id,{...patch,showcasecount:shelves.length,showcase:shelves,
  price:shelves.map(x=>x?review.items.saleRules[x].unitPrice:0)});
  for(const [k,n] of Object.entries(stock))s.item[Number(k)-1]=n;return s;};
const base={itemId:65,useId:0,shops:[shop(1),shop(2)],actorIndex:0,targetIndex:1,town:{safety:5000},events:{},nowSeconds:1000000,guildNames:{},randomDraws:[0]};
function compare(patch){
  const input={...base,...patch};
  const before=JSON.stringify(input);
  const actual=projectTargetCommerceCallback({reviewed:review,...input});
  const expected=JSON.parse(execFileSync('perl',[probe],{input:before,encoding:'utf8',timeout:30000,maxBuffer:1024*1024}));
  const {itemId,useId,sourceLine,requiresTarget,...compiled}=review.rules[input.itemId+':'+input.useId];
  assert.deepEqual(compiled,expected.compiled);
  const {source,committable,...effects}=actual;
  assert.equal(committable,false);
  assert.deepEqual(effects,{shops:expected.shops,town:expected.town,events:expected.events,returned:expected.returned,logs:expected.logs,drawRanges:expected.drawRanges});
  assert.equal(JSON.stringify(input),before);
  return actual;
}
test('R4 target rumor exact 800 boundary, #62 defensive EXP loss and post-consumption source shape',()=>{
  assert.equal(compare({randomDraws:[799999]}).shops[1].rank,3340);
  assert.equal(compare({randomDraws:[800000]}).shops[0].rank,3758);
  assert.equal(compare({shops:[shop(1),shop(2,{exp:{62:250}})]}).shops[1].exp[62],150);
  assert.equal(compare({shops:[shop(1),shop(2,{exp:{62:100}})]}).shops[1].exp[62],0);
  assert.equal(compare({targetIndex:0}).shops[0].rank,3340);
});
test('R4 target theft exact robot and 900 threshold, compensation, repeated shelves and carrying cap',()=>{
  const target=stocked(2,{40:20},[40,40,0]);
  const success=compare({useId:1,shops:[shop(1),target],randomDraws:[900000]});
  assert.equal(success.shops[0].item[39],18);assert.equal(success.shops[1].item[39],2);
  assert.equal(success.town.safety,4736);
  const capped=compare({useId:1,shops:[stocked(1,{40:599},[0]),target],randomDraws:[0]});
  assert.equal(capped.shops[0].item[39],600);
  assert.equal(capped.shops[1].item[39],19);
  const failure=compare({useId:1,shops:[shop(1),target],randomDraws:[901000]});
  assert.equal(failure.shops[0].money,-400000);assert.equal(failure.shops[1].money,600000);
  const robot=compare({useId:1,shops:[shop(1),stocked(2,{40:20,64:1},[40])],randomDraws:[]});
  assert.equal(robot.shops[1].item[63],0);assert.equal(robot.shops[0].money,-400000);
  compare({useId:1,targetIndex:0,randomDraws:[]});
  compare({useId:1,shops:[shop(1),shop(2)],randomDraws:[0]});
});
test('R4 four manual anti-industry EVENTs use exact target shelf and original eight-hour expiry',()=>{
  const target=stocked(2,{40:1,51:1,45:1,57:1},[40,51,45,57,0]);
  for(const [i,key] of ['kill-ken','kill-yoroi','kill-tate','kill-tue'].entries()){
    const result=compare({useId:2,shops:[shop(1),target],randomDraws:[i*200000]});
    assert.deepEqual(result.events,{[key]:1028800});
    const repeated=compare({useId:2,shops:[shop(1),target],events:{[key]:1000001},randomDraws:[i*200000]});
    assert.equal(repeated.returned,'造謠失敗了');
  }
  assert.deepEqual(compare({useId:2,shops:[shop(1),target],randomDraws:[999999]}).events,{});
  assert.deepEqual(compare({useId:2,shops:[shop(1),stocked(2,{10:1},[10])],randomDraws:[0]}).events,{});
});
test('R4 guild advertising source callback follows membership order, no invented guild authority',()=>{
  const shops=[shop(1,{guild:'g'}),shop(2,{guild:'other'}),shop(3,{guild:'g',rank:9900})];
  const actual=compare({itemId:62,useId:2,shops,targetIndex:null,guildNames:{g:'Guild'},randomDraws:[]});
  assert.equal(actual.shops[1].rank,5010);assert.equal(actual.shops[2].rank,9910);
  compare({itemId:62,useId:2,targetIndex:null,randomDraws:[]});
  assert.throws(()=>projectTargetCommerceCallback({reviewed:review,...base,shops:[shop(1,{point:19999}),shop(2)]}),/point gate/);
  assert.throws(()=>projectTargetCommerceCallback({reviewed:review,...base,randomDraws:[]}),/missing exact source draw/);
  assert.throws(()=>reviewTargetCommerceCallbacks({...sources,itemDsl:sources.itemDsl+' '}),/source drift/);
});
