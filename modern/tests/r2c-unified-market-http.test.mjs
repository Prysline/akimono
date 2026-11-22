/**
 * R2-C authoritative local/browser HTTP -> market-buy -> WorldState CAS ->
 * two-slot on-disk save -> restart -> load integration. Source ITEM #39 has
 * never had a handwritten legacy transaction engine.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
async function boot(directory){
  const child=spawn(process.execPath,['scripts/dev-local.mjs'],{
    cwd:join(root,'modern'),env:{...process.env,
      AKIMONO_PORT:'0',AKIMONO_SAVE_DIR:directory,
      AKIMONO_E2E_FIXED_NOW:'1000000',AKIMONO_E2E_DETERMINISTIC_RNG:'1',
    },stdio:['ignore','pipe','pipe'],
  });
  let stderr='';
  child.stderr.on('data',data=>stderr+=data);
  const url=await Promise.race([
    new Promise((resolve,reject)=>{
      let output='';
      child.stdout.on('data',data=>{
        output+=data;
        const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);
        if(match)resolve(match[0]);
      });
      child.once('error',reject);
      child.once('exit',code=>reject(Error('R2-C local server exited '+code+': '+stderr)));
    }),
    new Promise((_,reject)=>setTimeout(()=>reject(Error('R2-C server boot timeout: '+stderr)),10000)),
  ]);
  const post=async(endpoint,payload={})=>{
    const res=await fetch(url+endpoint,{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify(payload),
    });
    return {status:res.status,...await res.json()};
  };
  const state=async()=>await (await fetch(url+'/api/state')).json();
  let stopping=null;
  const stop=()=>stopping??=(
    child.exitCode!==null||child.signalCode!==null?Promise.resolve():
      new Promise(resolve=>{child.once('exit',resolve);child.kill();})
  );
  return {url,child,post,state,stop};
}
const offer=(state,id)=>state.marketOffers.find(o=>o.itemId===id);
// Execute the frozen, unmodified original GetWholeStore with the real HTTP
// world's wholesale counts and the source ITEM declaration sort order.
// This oracle checks WHICH goods the original displays, not fabricated JS
// expectations or an unrelated per-product hardcoded whitelist.
function originalShelfIds(state){
  const perl=String.raw`
use JSON::PP qw(decode_json encode_json);
sub l { return $_[0]; }
our ($MAX_ITEM,@ITEM,@DTwholestore);
my $input=decode_json(do { local $/; <STDIN> });
$MAX_ITEM=scalar @{$input->{catalog}};
for my $sort (0..$#{$input->{catalog}}) {
  my $id=$input->{catalog}[$sort]{itemId};
  $ITEM[$id]={sort=>$sort,price=>1,pricebase=>0,pricehalf=>0};
}
@DTwholestore=@{$input->{wholesale}};
do $ARGV[0] or die($@ || $!);
my $whole=GetWholeStore();
print encode_json($whole->{showcase}//[]);
`;
  const r=spawnSync('perl',['-e',perl,
    join(root,'modern/tests/original-perl/whole.cgi')],{
    input:JSON.stringify({
      catalog:state.itemCatalog,wholesale:state.world.market.wholesale,
    }),encoding:'utf8',
  });
  assert.equal(r.status,0,r.stderr||'frozen whole.cgi exited unsuccessfully');
  return JSON.parse(r.stdout);
}
test('R2-C real zh-Hant browser HTTP: four original products share source quote, one CAS buy, B-43 save, restart and re-buy',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'akimono-r2c-'));
  const servers=[];
  t.after(async()=>{
    for(const server of servers)await server.stop();
    await rm(directory,{recursive:true,force:true});
  });
  let srv=await boot(directory);servers.push(srv);
  const html=await (await fetch(srv.url)).text();
  const script=await (await fetch(srv.url+'/app.js')).text();
  assert.match(html,/lang="zh-Hant"/);
  assert.match(html,/id="market-offers"/);
  assert.match(html,/id="market-boundary"/);
  assert.match(script,/marketOffers/);
  assert.match(script,/itemCatalog/);
  assert.match(script,/catalog.filter\(item=>shop.item/);
  assert.match(script,/data-market-buy/);
  assert.match(script,/itemId,\s*requestedCount/);
  assert.doesNotMatch(script,/buy-market-item-\d+/);
  assert.doesNotMatch(html,/id="buy" class="primary"/);
  const initial=await srv.state();
  assert.equal(initial.world,null);
  assert.deepEqual(initial.marketOffers,[]);
  const initialized=await srv.post('/api/initialize');
  assert.equal(initialized.status,200,JSON.stringify(initialized));
  assert.ok((await srv.post('/api/open-shop',{expectedRevision:1,
    ownerName:'R2-C 來源買家',shopName:'來源編譯通用進貨'})).ok);
  const source=await srv.state();
  assert.deepEqual(source.shopSummary,{point:5010,rankPosition:null},
    'original GetDTPoint gives 5010 initially, but league RANK is unavailable');
  assert.equal(source.itemCatalog.length,79,'full ITEM registry is still available for warehouse');
  const book=source.itemCatalog.find(item=>item.itemId===10);
  assert.equal(book.name,'書本寫作工具');
  assert.equal(book.basePrice,5000);
  assert.equal(book.stockLimit,20);
  assert.equal(book.type,'道具');
  assert.equal(book.info,'寫書的基本工具包');
  assert.equal(book.costRaw,'100');
  assert.equal(new Set(source.itemCatalog.map(x=>x.itemId)).size,79);
  assert.deepEqual(source.marketOffers,[],'original market starts with no stock');
  assert.deepEqual(source.marketOffers.map(x=>x.itemId),originalShelfIds(source));
  const supplied=await srv.post('/api/supply',{
    expectedRevision:2,timespanSeconds:3600,
  });
  assert.equal(supplied.ok,true,JSON.stringify(supplied));
  const enough=await srv.state();
  assert.ok(enough.marketOffers.length>0&&enough.marketOffers.length<79);
  assert.ok(enough.marketOffers.every(o=>o.marketStock>0));
  assert.equal(offer(enough,79),undefined,'zero wholesale cap never becomes a shelf');
  assert.deepEqual(enough.marketOffers.map(x=>x.itemId),originalShelfIds(enough),
    'visible market shelf and ordering must match frozen original whole.cgi');
  assert.equal(offer(enough,39).name,'拆解/打包工具');
  assert.equal(offer(enough,39).basePrice,500);
  assert.equal(offer(enough,39).classification,'common-static');
  assert.equal(offer(enough,14).classification,'common-dynamic');
  for(const id of [10,11,14,39]){
    const o=offer(enough,id);
    assert.ok(o.marketStock>0,'real original PLUS must stock ITEM '+id);
    assert.equal(o.canBuy,true,'reviewed source item '+id+' should be buyable');
    assert.ok(o.price>0);
    assert.ok(Number.isSafeInteger(o.shelf));
  }
  assert.notEqual(offer(enough,14).price,offer(enough,14).basePrice,
    'source BASE market quote must not be hardcoded legacy #14 price');
  const missing=await srv.post('/api/buy',{
    expectedRevision:3,requestedCount:1,marketShelf:0,expectedPrice:500,
  });
  assert.equal(missing.status,400);
  assert.equal(missing.state.world.revision,3);
  const legacy=await srv.post('/api/buy',{
    expectedRevision:3,itemId:39,requestedCount:1,
    marketShelf:offer(enough,39).shelf,expectedPrice:500,
    kind:'buy-market-item-39',
  });
  assert.equal(legacy.status,400);
  assert.equal(legacy.state.world.revision,3);
  const wrongPrice=await srv.post('/api/buy',{
    expectedRevision:3,itemId:14,requestedCount:1,
    marketShelf:offer(enough,14).shelf,
    expectedPrice:offer(enough,14).price+1,
  });
  assert.equal(wrongPrice.status,409);
  assert.equal(wrongPrice.state.world.revision,3);
  const buy=async id=>{
    const before=await srv.state(),o=offer(before,id);
    assert.equal(o.canBuy,true,'same-world real offer '+id);
    const result=await srv.post('/api/buy',{
      expectedRevision:before.world.revision,itemId:id,requestedCount:1,
      marketShelf:o.shelf,expectedPrice:o.price,
    });
    assert.equal(result.ok,true,JSON.stringify(result));
    assert.equal(result.code,'COMMITTED');
    assert.equal(result.details.action,'market-buy');
    assert.equal(result.details.itemId,id);
    assert.equal(result.details.unitPrice,o.price);
    assert.equal(result.details.purchasedCount,1);
    assert.equal(result.state.world.revision,before.world.revision+1);
    assert.equal(result.state.shop.item[id-1],before.shop.item[id-1]+1);
    assert.equal(result.state.shop.money,before.shop.money-o.price);
    assert.equal(result.state.shop.paytoday,before.shop.paytoday+o.price);
    // Original inc-func.cgi::GetDTPoint: with source baseline fields,
    // purchases decrease the score through the paytoday term.
    const rawProfit=1-result.state.shop.paytoday/500000;
    const adjusted=rawProfit<1?1/(2-rawProfit):rawProfit;
    assert.equal(result.state.shopSummary.point,Math.trunc(5010*adjusted));
    assert.equal(result.state.shopSummary.rankPosition,null);
    assert.equal(result.state.world.market.wholesale[id-1],o.marketStock-1);
    assert.equal(result.state.world.market.originalWholesaleCsv.split(',').length,79);
    return result;
  };
  for(const id of [39,10,11,14])await buy(id);
  const beforeSave=await srv.state();
  assert.deepEqual(beforeSave.marketOffers.map(x=>x.itemId),originalShelfIds(beforeSave),
    'buying changes actual source stock, not the full product catalog');
  assert.equal(beforeSave.world.revision,7);
  assert.ok(beforeSave.shop.item[38]===1);
  const stale=await srv.post('/api/buy',{
    expectedRevision:6,itemId:39,requestedCount:1,
    marketShelf:offer(enough,39).shelf,expectedPrice:500,
  });
  assert.equal(stale.status,409);
  assert.equal(stale.state.world.revision,7);
  const committed=await srv.post('/api/save',{
    expectedRevision:7,expectedGeneration:0,
  });
  assert.equal(committed.ok,true,JSON.stringify(committed));
  assert.equal(committed.state.save.generation,1);
  const savedWorld=committed.state.world;
  await srv.stop();
  srv=await boot(directory);servers.push(srv);
  const disk=await srv.state();
  assert.equal(disk.world,null);
  assert.equal(disk.save.generation,1);
  const loaded=await srv.post('/api/load');
  assert.equal(loaded.ok,true,JSON.stringify(loaded));
  assert.deepEqual(loaded.state.world,savedWorld);
  for(const id of [39,10,11,14])
    assert.equal(loaded.state.shop.item[id-1],1);
  assert.equal(loaded.state.itemCatalog.length,79);
  assert.deepEqual(loaded.state.marketOffers.map(x=>x.itemId),originalShelfIds(loaded.state));
  assert.equal(loaded.state.world.market.originalWholesaleCsv.split(',').length,79);
  const next=await buy(10);
  assert.equal(next.state.world.revision,8);
  const saved2=await srv.post('/api/save',{
    expectedRevision:8,expectedGeneration:1,
  });
  assert.equal(saved2.ok,true,JSON.stringify(saved2));
  assert.equal(saved2.state.save.generation,2);
  assert.equal(saved2.state.shop.item[9],2);
});
