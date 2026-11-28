import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {reviewStreetShopLists,projectStreetShopList} from '../src/original-r4-street-shop-list.mjs';
const file=p=>fileURLToPath(new URL(p,import.meta.url));
const paths={product:file('./original-perl/pinned-shop-a.cgi'),shop:file('./original-perl/pinned-shop-b.cgi'),page:file('./original-perl/pinned-street-shop-page.cgi'),config:file('../../_config.cgi')};
const sources=Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,readFileSync(p,'utf8')]));
const reviewed=reviewStreetShopLists(sources);
const probe=file('./original-perl/original-r4-street-shop-list-probe.pl');
const catalog=[{no:0,name:'ALL',type:0,sort:0,scale:''},{no:1,name:'A',type:1,sort:3,scale:'個'},{no:2,name:'B',type:2,sort:1,scale:'本'},{no:3,name:'C',type:1,sort:2,scale:'個'}];
const shop=(id,showcase,price,item,status=1)=>({id,shopname:'Shop'+id,guild:id===2?'g':'',status,showcasecount:showcase.length,showcase,price,item,itemtoday:{1:2,2:3}});
const shops=[shop(9,[1,2],[100,99],[1,0,0]),shop(2,[1,1,3],[100,100,100],[3,0,2]),shop(4,[2],[200],[0,4,0]),shop(6,[3],[200],[0,0,0]),shop(8,[],[],[]),shop(7,[1],[300],[2,0,0]),shop(5,[],[],[],0)];
const rows=html=>[...html.matchAll(/<ROW>(.*?)<\/ROW>/gs)].map(m=>m[1]);
function compare(patch={}){
  const input={mode:'product',shops,catalog,viewerId:9,guest:false,mobile:false,page:0,tp:0,itn:0,ds:0,sendItem:0,...patch};
  const before=JSON.stringify(input),got=projectStreetShopList({reviewed,...input});
  const {html,pageInfo}=JSON.parse(execFileSync('perl',[probe,paths[input.mode],paths.page,paths.config,JSON.stringify(input)],{encoding:'utf8',timeout:10000}));
  assert.deepEqual(got.pageInfo,pageInfo);
  const select=html.match(/<select name=itn>(.*?)<\/select>/s);
  assert.deepEqual(got.itemOptions,select?[...select[1].matchAll(/<option value="(\d+)"/g)].map(m=>Number(m[1])):null);
  const shopselect=html.match(/<select name=ds>(.*?)<\/select>/s);
  assert.deepEqual(got.shopOptions,[...shopselect[1].matchAll(/<OPTION VALUE="(\d+)"( SELECTED)?>/g)].map(m=>({id:Number(m[1]),selected:!!m[2]})));
  const head=r=>r.buy?'<A HREF="action.cgi?key=buy&buy='+r.buy.buy+'&bk='+r.buy.bk+'&">':'';
  const item=r=>head(r)+'I'+r.itemId+r.name+(r.buy?'</A>':'');
  const stock=r=>r.stock?'残'+r.stock+r.scale:'売り切れ';
  const common=r=>'|'+item(r)+'|@'+r.price+'|'+stock(r);
  if(input.mode==='product'){
    assert.deepEqual(rows(html),got.rows.map(r=>common(r)+'|RANK '+r.rank+'|G'+r.guild+(r.itemType?'C'+r.itemType+' ':'')+r.shopname));
  }else{
    const groups=[...html.matchAll(/<SPAN>RANK (\d+)<\/SPAN> (?:<BR>)?([^<]*)<br><TABLE>(.*?)<\/TABLE>/gs)];
    assert.deepEqual(groups.map(m=>({rank:Number(m[1]),header:m[2],rows:rows(m[3])})),got.groups.map(g=>({rank:g.rank,header:'G'+g.guild+' '+g.shopname,rows:g.rows.map(r=>common(r)+'|'+r.sold+r.scale+'売上')})));
  }
  assert.equal(JSON.stringify(input),before);
  assert.equal(got.committable,false);
  return got;
}
test('R4 original shop-a product list filters, tie order, sold-out and guest links',()=>{
  const result=compare();
  assert.deepEqual(result.rows.filter(r=>r.price===100).map(r=>r.shopId),[2,2,2,9]);
  for(const patch of [{tp:1},{tp:2,itn:2},{itn:3},{guest:true},{mobile:true},{mobile:true,page:1},{mobile:true,tp:1},{page:100},{itn:79},{sendItem:2}])compare(patch);
});
test('R4 original shop-b selected store, multi-shelf and pagination',()=>{
  for(const patch of [{},{ds:2},{ds:9},{ds:8},{page:1},{page:-1},{guest:true},{mobile:true},{sendItem:2}])compare({mode:'shop',...patch});
});
test('R4 street shop lists require exact source and trusted known shop selection',()=>{
  assert.throws(()=>reviewStreetShopLists({...sources,product:sources.product+' '}),/source drift/);
  assert.throws(()=>projectStreetShopList({reviewed:{committable:false}}),/source review required/);
  assert.throws(()=>projectStreetShopList({reviewed,mode:'shop',shops,catalog,viewerId:9,guest:false,mobile:false,ds:999}),/unresolved/);
});
