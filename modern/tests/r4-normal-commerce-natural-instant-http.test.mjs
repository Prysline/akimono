/** Actual natural STARTFUNC effects on one genuine full-commerce career.
 * No chosen identity/clock/draw, injected ticket/robot, or failed-world retry.
 * The original rare lottery tiers remain source-only differentials, not
 * claimed as observed player outcomes when the actual draw misses them.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

const codes=['manbiki','goutou','getmoney','getpop','loto'];
const prizes=[0,1000000000,150000000,5000000,100000,10000];
const cap=999999999;
const snapshot=s=>({money:s.money,rank:s.rank,item:[...s.item],showcase:[...s.showcase],price:[...s.price],shopname:s.shopname});
test('R4 genuine five instant natural EVENT effects, repeated shelves, lottery payment and v2 replay',async t=>{
  const observed=Object.fromEntries(codes.map(code=>[code,{calls:0,effects:0,paid:0,stockLost:0}]));
  const persisted=new Set();
  let generation=0,ticketsPurchased=0,ticketsDrawn=0,robotProtected=0,robotDestroyed=0,ticks=0;
  const p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,fundMarketWithWork:true,
    onPurchase(r,before,offer){
      if(offer.itemId===11){
        assert.equal(r.details.totalPaid,r.details.purchasedCount*offer.price);
        assert.equal(r.state.shop.item[10],before.shops[0].item[10]+r.details.purchasedCount);
        ticketsPurchased+=r.details.purchasedCount;
      }
    },
    onTick(r,before){
      const d=r.details,after=r.state.world,trace=d.sourceTrace,slices=trace.slices??[trace];
      assert.equal(d.shelfSales.reduce((sum,row)=>sum+row.count,0),d.naturalSaleCount);
      for(const [index,slice] of slices.entries()){
        let prior=null;
        for(const effect of slice.instantEffects){
          const {code,before:b,after:a,samples,logs}=effect,stats=observed[code];
          assert.ok(stats,'actual reviewed instant callback');stats.calls++;
          if(prior)assert.deepEqual(b,prior,'callback order retains preceding actual result');
          const expected=structuredClone(b),calls=[];
          if(code==='manbiki'||code==='goutou'){
            const theft=code==='manbiki',hit=samples[0]/1000<=(theft?400:700);
            assert.equal(samples.length,hit&&theft&&b.item[63]>0?2:1);
            if(hit){
              if(b.item[63]>0){
                if(theft&&samples[1]/1000>200){
                  calls.push([2,0,b.shopname+'有人企圖入室行竊，但被制止了。']);robotProtected++;
                }else{
                  expected.item[63]--;robotDestroyed++;
                  calls.push([2,0,b.shopname+(theft?'有人企圖入室行竊，看門機器人被破壊了。':'有強盜闖入，看門機器人被破壞了。')]);
                }
              }else{
                if(!theft)expected.rank-=Math.trunc(b.rank/5);
                let lost=0,value=0;
                // Preserve original successive remaining inventory for repeated shelves.
                for(const [shelf,id] of b.showcase.entries())if(id){
                  const n=Math.trunc(expected.item[id-1]/(theft?10:4));
                  expected.item[id-1]-=n;lost+=n;value+=n*b.price[shelf];
                }
                calls.push([2,0,value>0?b.shopname+(theft?'被偷了相當於總額':'被搶了相當於總額')+value+'的商品。':
                  '闖入'+b.shopname+(theft?'的小偷什麼都沒拿就逃走了。':'的強盜什麼都沒拿就逃走了。')]);
                if(lost>0&&b.showcase[0]===1&&b.showcase[1]===1&&b.showcase[2]===2){
                  stats.effects++;stats.stockLost+=lost;
                }
              }
            }
          }else if(code==='getmoney'||code==='getpop'){
            assert.equal(samples.length,1);
            if(samples[0]/1000<=300){
              if(code==='getmoney'){
                expected.money=Math.min(cap,b.money+100000);
                calls.push([2,0,b.shopname+'收到了共100000的補助金']);
                if(expected.money>b.money){stats.effects++;stats.paid+=expected.money-b.money;}
              }else{
                expected.rank=Math.min(10000,b.rank+1000);
                calls.push([2,0,'雜誌上介紹了'+b.shopname+'，人氣提升了。']);
                if(expected.rank>b.rank)stats.effects++;
              }
            }
          }else{
            assert.equal(code,'loto');assert.equal(samples.length,b.item[10]);
            expected.item[10]=0;ticketsDrawn+=b.item[10];
            calls.push([2,0,'抽獎卷的開獎開始了']);
            let paid=0;
            for(const value of samples){
              assert.ok(Number.isSafeInteger(value)&&value>=0&&value<6096454);
              const rank=value<1?1:value<6?2:value<216?3:value<10000?4:value<152411?5:0;
              if(rank){
                expected.money=Math.min(cap,expected.money+prizes[rank]);paid+=prizes[rank];
                calls.push([rank<=3?1:2,0,b.shopname+'抽中了，'+prizes[rank]+'！']);
              }
            }
            if(paid>0&&b.item[10]>0&&expected.money>b.money){stats.effects++;stats.paid+=expected.money-b.money;}
          }
          assert.deepEqual(a,expected,'actual source callback state '+code);
          assert.deepEqual(logs,calls,'exact source callback logs '+code);
          for(const call of logs){
            assert.ok(slice.logs.some(row=>JSON.stringify(row)===JSON.stringify(call)),'source stage log '+code);
            assert.ok(after.period.disk.live['log0.cgi'].bytes.includes([after.nowSeconds,...call].join('\t')+'\n'),'durable source log '+code);
          }
          assert.equal(after.period.eventState[code],undefined,'instant STARTFUNC must not persist an EVENT');
          prior=a;
        }
        if(prior&&index===slices.length-1){
          const expected={...prior,money:Math.min(cap,prior.money)};
          if(slice.happyEffects.length){assert.equal(slice.happyEffects[0].rankBefore,prior.rank);expected.rank=slice.happyEffects[0].rankAfter;}
          assert.deepEqual(snapshot(after.shops[0]),expected,'actual last callback effects enter committed WorldState');
        }
      }
      ticks++;
    }});
  await p.market(13);await p.use(79,0);
  await p.gather(1,160);await p.gather(2,100);
  for(let n=0;p.state.shop.money<20000;n++){
    assert.ok(n<16,'lawful showcase setup funds');await p.use(13,1);
  }
  await p.use(63,2);assert.equal(p.state.shop.showcasecount,3);
  await p.enoughTime(1800);
  for(const [shelf,id] of [1,1,2].entries()){
    const result=await p.post('/api/showcase',{expectedRevision:p.state.world.revision,shelf,itemId:id,per:120});
    assert.equal(result.code,'COMMITTED',JSON.stringify(result.details??result.error));
  }
  const start=p.state.world.nowSeconds;
  // Each effect must occur naturally in one bounded career, including a
  // positive lottery payment. No reroll or artificial time jump on a miss.
  for(let n=0;persisted.size<codes.length;n++){
    assert.ok(n<2880&&p.state.world.nowSeconds-start<=120*86400,
      'bounded genuine instant events '+JSON.stringify({observed,ticks,generation,ticketsPurchased,ticketsDrawn}));
    const ready=codes.filter(code=>observed[code].effects>0&&!persisted.has(code));
    if(ready.length){
      const saved=await p.saveAndRestart(generation++);
      for(const code of ready){assert.equal(saved.period.eventState[code],undefined);persisted.add(code);}
      if(persisted.size===codes.length)break;
    }
    if(!persisted.has('manbiki')||!persisted.has('goutou')){
      if(p.stock(1)<100)await p.gather(1,160);
      if(p.stock(2)<60)await p.gather(2,100);
    }
    if(!persisted.has('loto')&&p.stock(11)<5)await p.market(11,5-p.stock(11),{partial:true});
    if(n%24===23)await p.use(13,1);
    await p.tick(60);
  }
  assert.ok(ticketsPurchased>0&&ticketsDrawn>0&&ticketsDrawn<=ticketsPurchased);
  assert.ok(codes.every(code=>observed[code].effects>0&&persisted.has(code)));
  t.diagnostic(JSON.stringify({observed,generation,ticketsPurchased,ticketsDrawn,robotProtected,robotDestroyed,ticks}));
});
