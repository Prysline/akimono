/** Real, unselected source career; no clock fixture, assets, RNG tape,
 * EVENT injection or retry of a failed career. Observe ten actual durable
 * lifecycles, not merely a source registration or candidate projection.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseDsl} from '../src/parse-dsl.mjs';
import {reviewNormalCommerceItems} from '../src/reviewed-normal-commerce-items.mjs';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

const meta={
  happy:[5,5,'街上開始舉辦感謝祭了。','感謝祭已經結束了。'],
  'boom-posyon':[12,24,'街上開始了搶購治療劑的熱潮','治療劑的熱潮結束了'],
  'ken-sale':[6,24,'對劍的需求似乎在增加','劍的需求已恢復正常水平'],
  'tate-sale':[6,24,'對盾的需求似乎在增加','盾的需求已恢復正常水平'],
  'yoroi-sale':[6,24,'對鎧的需求似乎在增加','鎧的需求已恢復正常水平'],
  'tue-sale':[6,24,'對杖的需求似乎在增加','杖的需求已恢復正常水平'],
  'plusdown-yakusou':[48,24,'藥草培育業者好像不肯批發藥草了。','藥草培育業者恢復了藥草批發'],
  'plusup-tetu':[12,12,'發現新的鐵礦脈','新的鐵礦脈已經關閉了'],
  'plusup-misuriru':[9,16,'發現新的秘銀礦脈','新的秘銀礦脈已經關閉了'],
  'plusup-oriharukon':[6,18,'發現新的奧利哈鋼礦脈','新的奧利哈鋼礦脈已經關閉了'],
};
const codes=Object.keys(meta);
const ids=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
const demand={'ken-sale':ids(40,44),'tate-sale':ids(45,50),'yoroi-sale':ids(51,56),'tue-sale':ids(57,61)};
const boom=[[1,2],[30,2],[31,3],[32,2],[33,3],[34,4]];
const plusEffects=[[1,'plusdown-yakusou',-180],[5,'plusup-tetu',720],[6,'plusup-misuriru',960],[7,'plusup-oriharukon',1200]];
const own=(o,k)=>Object.hasOwn(o,k);
const sorted=x=>[...x].sort();

test('R4 durable EVENT HTTP oracle matches frozen DSL messages and durations',async ()=>{
  const source=await readFile(new URL('../../custom/inc-item-data.cgi',import.meta.url),'utf8');
  const parsed=parseDsl(source,'custom/inc-item-data.cgi');
  assert.deepEqual(parsed.issues,[]);
  for(const [code,[duration,extra,beginMsg,endMsg]] of Object.entries(meta)){
    const blocks=parsed.blocks.filter(b=>b.kind==='EVENT'&&b.fields.code?.[0]?.value===code);
    assert.equal(blocks.length,1,code);
    const fields=blocks[0].fields;
    assert.deepEqual(fields.startmsg.map(row=>row.value),[beginMsg],code+' START');
    assert.deepEqual(fields.endmsg.map(row=>row.value),[endMsg],code+' END');
    assert.equal(fields.basetime[0].value,duration+'h',code+' BASETIME');
    assert.equal(fields.plustime[0].value,extra+'h',code+' PLUSTIME');
  }
});

test('R4 genuine ten natural durable EVENT lifecycles, DataRead effects, logs and active/expired v2 restarts',async t=>{
  const files={itemDsl:'../../custom/inc-item-data.cgi',compilerSource:'./original-perl/inc-makeitem.cgi',
    showcaseSource:'./original-perl/sc-s.cgi',turnSource:'./original-perl/inc-turn.cgi'};
  const src=Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key,path])=>
    [key,await readFile(new URL(path,import.meta.url),'utf8')])));
  const base=reviewNormalCommerceItems(src);
  const observed=Object.fromEntries(codes.map(code=>[code,{starts:0,ends:0,activeSaved:null,expired:false,baseRead:false,complete:false}]));
  let generation=0,ticks=0,happyPositive=0;
  function inspect(r,before){
    const after=r.state.world,d=r.details,trace=d.sourceTrace;
    const slices=trace.slices??[{...trace,spanSeconds:d.elapsedSeconds,dateupdate:0}];
    const initial=before.period.eventState,active={...initial};
    const changed=[];
    if(own(initial,'boom-posyon'))for(const [id,mult] of boom){
      const item=base.items[id-1];changed.push([id,Math.trunc(item.popular/1.5),item.point*mult]);
    }
    for(const [code,items] of Object.entries(demand))if(own(initial,code))
      for(const id of items){const item=base.items[id-1];changed.push([id,Math.trunc(item.popular/2),item.point]);}
    changed.sort((a,b)=>a[0]-b[0]);
    let start=before.nowSeconds;
    for(const [index,slice] of slices.entries()){
      const end=start+slice.spanSeconds;
      assert.deepEqual(sorted(slice.activeOrder),sorted(Object.keys(active)),'actual prior EVENT hash keys');
      assert.ok(slice.eventCommerce,'committed pre-EVENT commerce receipt');
      assert.deepEqual(slice.eventCommerce.saleParameters,changed,'DataRead POP/POINT for the entire command');
      for(const [id,code,override] of plusEffects){
        const row=slice.eventCommerce.plusChanges.find(x=>x.itemId===id);
        assert.equal(row?.plusSeconds,own(initial,code)?override:-1200);
        assert.equal(row.signedDelta,row.units*Math.sign(row.plusSeconds));
        assert.ok(row.drawsUsed===1||row.drawsUsed===2);
      }
      for(const row of d.shelfSales.filter(row=>row.sliceIndex===index)){
        const expected=changed.find(x=>x[0]===row.itemId)?.[2]??base.items[row.itemId-1].point;
        assert.equal(row.effectivePoint,expected);
      }
      for(const code of codes){
        const [duration,extra,beginMsg,endMsg]=meta[code],stats=observed[code];
        const starts=slice.logs.filter(row=>row[2]===beginMsg),ends=slice.logs.filter(row=>row[2]===endMsg);
        const was=active[code];
        assert.equal(ends.length,was!==undefined&&was<end?1:0,'strict source expiry '+code);
        if(ends.length){
          stats.ends++;delete active[code];
          if(stats.activeSaved===was&&!starts.length)stats.expired=true;
        }
        assert.ok(starts.length<=1);
        if(starts.length){
          assert.equal(active[code],undefined,'active group cannot start twice');
          const expiry=after.period.eventState[code];
          assert.ok(Number.isSafeInteger(expiry)&&expiry>=start+duration*3600&&expiry<end+(duration+extra)*3600,'source duration '+code);
          active[code]=expiry;stats.starts++;
          // If it restarted before the prior expired generation was
          // saved, observe a new genuine cycle instead of crediting absence.
          if(!stats.complete&&stats.expired){stats.activeSaved=null;stats.expired=false;stats.baseRead=false;}
        }
        for(const call of [...starts,...ends]){
          assert.deepEqual(call.slice(0,2),[2,0]);
          assert.ok(after.period.disk.live['log0.cgi'].bytes.includes([after.nowSeconds,...call].join('\t')+'\n'),'durable exact EVENT log '+code);
        }
      }
      assert.deepEqual(sorted(slice.nowOrder),sorted(Object.keys(active)),'actual post-START EVENT hash keys');
      const effects=slice.happyEffects;
      assert.equal(effects.length,own(active,'happy')?1:0,'actual NOWFUNC dispatch');
      for(const e of effects){
        const range=Math.trunc(slice.spanSeconds/36);
        assert.equal(e.randMax,range);
        assert.equal(e.rankRoll,Math.trunc(e.sample*range/1000000));
        assert.equal(e.rankAfter,Math.min(10000,e.rankBefore+e.rankRoll));
        if(e.rankAfter>e.rankBefore)happyPositive++;
      }
      start=end;
    }
    assert.equal(start,after.nowSeconds);
    assert.deepEqual(active,after.period.eventState);
    for(const code of codes)if(observed[code].expired&&!own(initial,code)&&!own(active,code))observed[code].baseRead=true;
    ticks++;
  }
  const p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,onTick:inspect});
  await p.market(13);
  const start=p.state.world.nowSeconds;
  // A finite 120-day observation horizon on ONE source career; a missed
  // rare event is a real failure. Work refreshes actual owner lastlogin.
  for(let n=0;!codes.every(code=>observed[code].complete);n++){
    assert.ok(n<2880&&p.state.world.nowSeconds-start<=120*86400,
      'natural EVENT observation budget '+JSON.stringify({ticks,observed,happyPositive,generation}));
    const active=p.state.world.period.eventState;
    const needActive=codes.filter(code=>!observed[code].complete&&!observed[code].expired&&own(active,code)&&observed[code].activeSaved!==active[code]);
    const needEnd=codes.filter(code=>!observed[code].complete&&observed[code].expired&&observed[code].baseRead&&!own(active,code));
    if(needActive.length||needEnd.length){
      const saved=await p.saveAndRestart(generation++);
      for(const code of needActive){assert.equal(saved.period.eventState[code],active[code]);observed[code].activeSaved=active[code];}
      for(const code of needEnd){assert.equal(saved.period.eventState[code],undefined);observed[code].complete=true;}
      if(codes.every(code=>observed[code].complete))break;
    }
    if(n%24===23)await p.use(13,0);
    await p.tick(60);
  }
  assert.ok(happyPositive>0,'actual positive happy NOWFUNC rank');
  assert.ok(codes.every(code=>observed[code].starts>0&&observed[code].ends>0&&observed[code].complete));
  t.diagnostic(JSON.stringify({ticks,generation,happyPositive,observed,period:p.state.world.period.settledCount}));
});
