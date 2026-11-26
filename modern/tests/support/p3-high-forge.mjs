/** Real source player progression, same production v2 path for every tier.
 * Mine/transfer only earned EXP; use real quotes, skills, ore, and sale revenue.
 * Four original forging routes retain the non-crossing budget. #66 has
 * real settlements and P5 earned funding because two skills and its fixed
 * 50000 G book can exceed the arbitrary first-period liquidity budget. */
import assert from 'node:assert/strict';
import {genuinePlayer} from './p3-genuine-v2-player.mjs';
import {prepareGenuineMissionRecipe} from './r4-genuine-mission-recipe.mjs';
export async function highForge(t,book,{missionRingCount=null}={}){
  assert.ok(missionRingCount===null||(book===66&&missionRingCount===50));
  const recipes={20:{skill:18,products:[41,42,43,44],career:4,gates:[200,400,600]},
    21:{skill:18,products:[47,48,49,50],career:5,gates:[200,400,600]},
    22:{skill:18,products:[53,54,55,56],career:6,gates:[200,400,600]},
    23:{skill:19,products:[58,59,60,61],career:7,gates:[250,500,700]},
    66:{skill:18,products:[67,68,69],career:3,gates:[250,500]}};
  const r=recipes[book],crossPeriod=book===66,p=await genuinePlayer(t,{crossPeriod,fundMarketWithWork:crossPeriod,...(missionRingCount===null?{}:{now:null,fullCommerce:true,rebelTime:true,fundingSaleItems:[67]})});
  await p.use(79,0);await p.use(79,3);
  if(crossPeriod){
    // Acquire the fixed-price book and career guide before tying up cash
    // and incurring maintenance on hundreds of units of ore.
    await p.market(13);
    const work=await p.use(13,1);
    assert.equal(work.details.moneyEarned,10000);
    await p.market(book);await p.market(78);
  }
  // Mining before the legitimate career change supplies raw stock and donor EXP.
  // Use the deeper mines for each scarce ore, not forged EXP or wholesale.
  await p.ore(6,book===66?25:book===23?20:25);
  await p.ore(7,book===23?20:23);
  await p.ore(5,book===66?310:book===23?440:400);
  if(r.skill===18)await p.use(37,0);
  if(r.skill===19||book===66){
    if(book===66)await p.market(37);
    await p.stones(30);await p.use(37,1);
  }
  if(!p.stock(book))await p.market(book);
  if(!p.stock(78))await p.market(78);
  if(crossPeriod){
    for(let n=0;;n++){
      assert.ok(n<24,'source mining EXP after real settlement decay');
      await p.enoughTime(p.quote(78,r.career).timePerUseSeconds);
      if(p.exp(9)>=200&&p.remaining()>=p.quote(78,r.career).timePerUseSeconds)break;
      if(p.exp(9)<200)await p.ore(5,p.stock(5)+1);
    }
  }
  const earned=p.exp(9);
  assert.ok(earned>=200);
  await p.use(78,r.career);
  assert.equal(p.exp(book),Math.floor(earned/2));
  assert.equal(p.exp(9),0);
  const materials=useId=>book===66?
    (useId===0?[[5,20]]:useId===1?[[6,20],[8,2]]:[[7,20],[8,2]]):
    [[useId<2?5:useId===2?6:7,useId===1?40:20],
      ...(book===23?[[8,[2,4,6,10][useId]]]:[])];
  if(missionRingCount!==null){
    // Independent acquisition proof for a fixed product, NOT a selected
    // palace mission, modified player save, or rerolled identity.
    assert.equal(p.state.reviewedFullCommerce,true);
    assert.equal(p.state.reviewedRebelTime,true);
    assert.equal(p.stock(68),0);
    const initial=p.state.world;
    assert.equal(initial.shops[0].dignity,0);
    let manufactured=0,retries=0;
    async function legalCraft(useId){
      const inputs=materials(useId);
      const q=await prepareGenuineMissionRecipe({p,book,useId,materials:inputs,
        acquireBook:async id=>{if(!p.stock(id))await p.market(id,1,{sell:[67]});},
        acquireMaterial:async(id,n)=>{if(id===8)await p.stones(n,[67]);else await p.ore(id,n);},
        train:useId===0?null:async()=>{await legalCraft(0);if(p.stock(67))await p.list(67);},
        onRetry:info=>{retries++;t.diagnostic('R4 ring recipe retry '+JSON.stringify(info));}});
      assert.ok(q.proficiency>=q.requiredProficiency);
      if(useId===1)assert.equal(q.requiredProficiency,250);
      const prior=p.state.world,product=r.products[useId],old=p.stock(product),oldBook=p.stock(book);
      const result=await p.use(book,useId);
      assert.equal(p.state.world.revision,prior.revision+1);
      for(const [id,n] of inputs)assert.equal(p.stock(id),prior.shops[0].item[id-1]-n);
      assert.equal(p.stock(18),1);assert.equal(p.stock(19),1);
      assert.equal(p.stock(book),oldBook-(result.details.mapDestroyed?1:0));
      const output=p.stock(product)-old;
      assert.ok(output>0);
      assert.ok(result.details.originalAddItem.some(([id,n])=>id===product&&n===output));
      if(useId===1){
        assert.ok(result.details.callbackOrder.includes('after-use'));
        manufactured+=output;
      }
    }
    await legalCraft(0);
    if(p.stock(67))await p.list(67);
    if(p.exp(book)<250){assert.equal(p.quote(book,1).canUse,false);await p.deny(book,1);}
    // Save the legitimately earned skills, book and donor EXP first.
    const first=await p.saveAndRestart(0);
    assert.equal(first.shops[0].item[67],0);
    for(let n=0;p.stock(68)<missionRingCount;n++){
      assert.ok(n<12,'bounded original ring batches');
      await legalCraft(1);
    }
    assert.equal(p.stock(68),manufactured,'all rings from actual manufacture, never sold or granted');
    const second=await p.saveAndRestart(1);
    assert.ok(second.shops[0].item[67]>=missionRingCount);
    assert.equal(second.shops[0].dignity,0,'production proof does not grant a palace mission');
    assert.ok(second.revision>first.revision);
    t.diagnostic('R4 genuine ring inventory ACCEPTED '+JSON.stringify({manufactured,retries,
      exp:p.exp(book),period:second.period.settledCount,revision:second.revision,generation:2}));
    return;
  }
  let first=null;
  async function craft(useId,{checkpoint=false}={}){
    for(let n=0;;n++){
      assert.ok(n<64,'source recipe readiness after settlement decay #'+book+'/'+useId);
      if(!p.stock(book))await p.market(book,1,{sell:r.products});
      for(const [id,count] of materials(useId)){
        if(id===8)await p.stones(count,r.products);else await p.ore(id,count);
      }
      await p.enoughTime(p.quote(book,useId).timePerUseSeconds);
      const readyExp=useId===0||p.exp(book)>=r.gates[useId-1];
      const readyTime=p.remaining()>=p.quote(book,useId).timePerUseSeconds;
      if(readyExp&&readyTime)break;
      assert.ok(crossPeriod,'unexpected EXP or quote change in non-crossing route');
      if(!readyExp)await craft(0);
    }
    if(checkpoint){
      // Save after all legitimate gates and materials are ready, not at the
      // beginning of another long grinding segment. Replay remains exact;
      // this avoids repeatedly rereading the same long prefix during grinding.
      first=await p.saveAndRestart(0);
      if(p.boundary()>60)await p.tick(1);
    }
    const prior=p.state.shop,product=r.products[useId],before=p.exp(book);
    const done=await p.use(book,useId);
    assert.equal(done.details.experienceGain,20);
    assert.equal(p.exp(book),before+20);
    assert.equal(p.stock(r.skill),1,'NEED not consumed');
    if(book===66)assert.equal(p.stock(19),1);
    for(const [id,n] of materials(useId))assert.equal(p.stock(id),prior.item[id-1]-n);
    assert.ok(p.stock(product)>prior.item[product-1],'source MakeAmount creates real output');
    assert.equal(p.stock(book),prior.item[book-1]-(done.details.mapDestroyed?1:0));
    if(useId>=2||(book===66&&useId===1))assert.ok(done.details.callbackOrder.includes('after-use'));
    // Keep a real product on sale: proceeds can fund a replacement lost book.
    if(!checkpoint&&p.stock(r.products[0])>0)await p.list(r.products[0]);
    if(useId>0)t.diagnostic('P3 '+book+'/'+useId+' actual source EXP '+before+'→'+p.exp(book)+', output #'+product+' +'+(p.stock(product)-prior.item[product-1])+', lostbook='+done.details.mapDestroyed+', world clock='+p.state.world.nowSeconds);
    return done;
  }
  for(let i=0;i<r.gates.length;i++){
    const useId=i+1,gate=r.gates[i];
    if(p.exp(book)<gate){
      assert.equal(p.quote(book,useId).canUse,false);
      assert.equal(p.quote(book,useId).maxUseCount,0);
      await p.deny(book,useId);
    }
    for(let n=0;p.exp(book)<gate;n++){
      assert.ok(n<64,'source craft EXP progression #'+book+'/'+useId);
      await craft(0);
    }
    assert.ok(p.exp(book)>=gate);
    await craft(useId,{checkpoint:i===r.gates.length-1});
  }
  assert.ok(first);
  const second=await p.saveAndRestart(1);
  assert.equal(second.shops[0].exp[String(book)],p.exp(book));
  for(const id of r.products.slice(1))assert.ok(second.shops[0].item[id-1]>0||(second.shops[0].itemtoday[id]??0)>0,'advanced output or genuine sale persists #'+id);
  assert.ok(second.revision>first.revision&&second.nowSeconds>=first.nowSeconds);
  if(book===66){
    assert.ok(p.exp(66)>=500);assert.equal(p.stock(24),0);
    assert.equal(p.quote(66,3).canUse,false);await p.deny(66,3);
  }
  if(book===20){
    // Genuine v2 checksum-correct forgery is rejected by history, not just hash.
    await p.rejectForgedLatest(first,record=>{
      const w=JSON.parse(record.world);w.shops[0].exp['20']=999;
      record.world=JSON.stringify(w);
    });
  }
}
