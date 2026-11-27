import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {reviewDragonOwnerFacilityView,projectDragonOwnerFacilityView} from '../src/original-r4-dragon-owner-facility-view.mjs';
const file=p=>fileURLToPath(new URL(p,import.meta.url));
const paths={stable:file('./original-perl/pinned-dragon-stable.cgi'),ranch:file('./original-perl/pinned-dragon-ranch.cgi'),dragon:file('./original-perl/pinned-inc-dragon.cgi'),readA:file('./original-perl/pinned-drreada.cgi'),readB:file('./original-perl/pinned-drreadb.cgi'),time:file('./original-perl/pinned-time.cgi')};
const sources=Object.fromEntries(Object.entries(paths).map(([k,v])=>[k,readFileSync(v,'utf8')]));
const review=reviewDragonOwnerFacilityView(sources),probe=file('./original-perl/original-r4-dragon-owner-facility-probe.pl');
const now=1700000000,context={now,street:'standard',activeShopIds:[1,2],actorId:1,files:{}};
const schema={st:'ST',rc:'RC',dra:'DR',pr:'PR'};
const wire=(kind,records)=>{const fields=sources.dragon.match(new RegExp('@'+schema[kind]+'namelist=qw\\(([\\s\\S]*?)\\);'))[1].trim().split(/\s+/);return records.map(r=>fields.map(k=>r[k]??0).join(',')+'\n').join('');};
const base={no:1,birth:now-172800,name:'龍房',town:'standard',owner:1,fm:0,color:0,emp:2,tr:55,con:50,wt:50,sp:1,sr:1,ag:0,pw:0,hl:0,fl:0,apt:1800,hr:50,prize:100,g1win:1,g2win:2,g3win:3,sdwin:4};
const localize=({key,args})=>key.replace(/%(\d+)/g,(_,i)=>String(args[Number(i)-1]));
function compare(mode,patch={}){
  const input={...context,mode,...patch},before=JSON.stringify(input);
  const got=projectDragonOwnerFacilityView({review,...input});
  const want=JSON.parse(execFileSync('perl',[probe,...Object.values(paths),JSON.stringify(input)],{encoding:'utf8',timeout:10000}));
  assert.deepEqual(got.tables.map(t=>({columns:t.columns,rows:t.rows.map(({cells,imageKey,link})=>({cells,imageKey,link}))})),want.tables);
  assert.deepEqual(got.forms.map(({mode,code,titleKey,submitKey,fields})=>({mode,code,titleKey,submitKey,fields})),want.forms);
  assert.equal(got.intro?.imageKey??null,want.introImage);
  for(const message of got.intro?.messages??[])assert.ok(want.rendered.includes(localize(message)),message.key);
  for(const form of got.forms)for(const message of form.advice)assert.ok(want.rendered.includes(localize(message)),message.key);
  for(const notice of got.notices)assert.ok(want.rendered.includes(localize(notice.message)),notice.message.key);
  assert.equal(JSON.stringify(input),before);
  assert.equal(got.committable,false);
  return got;
}
test('R4 stable form follows original raw slot capacity, including local stale owners and foreign same numeric owner',()=>{
  assert.equal(compare('stable').forms[0].code,'new');
  compare('stable',{files:{st:''}});
  for(const count of [9,10,11]){
    const records=Array.from({length:count},(_,i)=>({...base,no:i+1,owner:i===0?1:99,town:i===0?'foreign':'standard'}));
    const got=compare('stable',{files:{st:wire('st',records)}});
    assert.equal(got.forms.length,count<10?1:0);
  }
});
test('R4 stable original summary, all matching boarders in file order and exact expansion/expiry boundaries',()=>{
  for(const elapsed of [172799,172800,172801,50*86400-1,50*86400,50*86400+1]){
    const st=wire('st',[{...base,no:2,name:'先前'},{...base,no:3,name:'有效',birth:now-elapsed},{...base,no:4,owner:99,name:'舊店'}]);
    const dra=wire('dra',[{...base,no:9,name:'外街龍',town:'foreign',owner:99,stable:3,color:4},{...base,no:8,name:'別房',stable:2},{...base,no:7,name:'原店龍',stable:3,con:100,fm:1,owner:99}]);
    const got=compare('stable',{files:{st,dra}});
    assert.equal(got.tables[0].rows[0].cells[0],'有效');
    assert.equal(got.tables[0].rows[0].moneyCells[0].amount,200000);
    assert.deepEqual(got.tables[1].rows.map(r=>r.cells[0]),['外街龍','原店龍']);
    assert.equal(got.forms.length,elapsed>=172800?1:0);
  }
  const own={...base,sp:3,sr:0,birth:now-4*86400};
  const got=compare('stable',{files:{st:wire('st',[own]).slice(0,-1)}});
  assert.equal(got.forms[0].fields[0].options.length,6);
});
test('R4 ranch original last local owner, average prize, own dragons and female parent links, cap and list order',()=>{
  compare('ranch');compare('ranch',{files:{rc:''}});
  assert.equal(compare('ranch',{files:{rc:wire('rc',[{...base,town:'foreign'}])}}).forms[0].mode,'rcedit');
  const rc=wire('rc',[{...base,name:'前牧場'},{...base,no:2,name:'現牧場',birth:now-86400},{...base,no:3,owner:99,name:'孤立'}]);
  const parents=[{...base,no:8,name:'公',fm:0},{...base,no:9,name:'母',fm:1,color:4},{...base,no:10,name:'異街母',fm:1,town:'foreign'},{...base,no:11,name:'他人母',fm:1,owner:2}];
  for(const count of [0,1,2,3,4]){
    const own=Array.from({length:count},(_,i)=>({...base,no:i+1,name:'本龍'+i,fm:i%2,color:i%5,sp:i===1?100:0,con:i===2?100:0,apt:i===0?1200:3200,fl:100}));
    const dra=wire('dra',[{...base,no:50,name:'外龍',town:'foreign'},...own,{...base,no:60,name:'他店龍',owner:2}]);
    const got=compare('ranch',{files:{rc,dra,pr:wire('pr',parents)}});
    assert.equal(got.tables[0].rows[0].cells[0],'現牧場');
    const dr=got.tables.find(t=>t.key==='所有競争竜');
    assert.deepEqual(dr?.rows.map(r=>r.link.dr)??[],own.map(d=>d.no));
    const pr=got.tables.find(t=>t.key==='所有繁殖%1竜');
    assert.deepEqual(pr.rows.map(r=>r.link.dr),[9]);assert.equal(pr.rows[0].imageKey,'dragon45');
    assert.equal(got.forms.length,count<3?1:0);
  }
  compare('ranch',{files:{rc,pr:wire('pr',[parents[0]])}});
  compare('ranch',{actorId:2,files:{rc:wire('rc',[{...base,owner:2}]),dra:wire('dra',[{...base,owner:2}])}});
});
test('R4 private facility projection rejects source drift, guest/inactive actor, duplicate active IDs and arbitrary modes',()=>{
  for(const k of Object.keys(sources))assert.throws(()=>reviewDragonOwnerFacilityView({...sources,[k]:sources[k]+' '}),/source drift/);
  const input={review,...context,mode:'stable'};
  for(const patch of [{review:{}},{actorId:0},{actorId:99},{activeShopIds:[1,1]},{mode:'jock'},{mode:'pr'},{mode:'ReadStable'}])assert.throws(()=>projectDragonOwnerFacilityView({...input,...patch}),/trusted reviewed owner/);
  assert.throws(()=>projectDragonOwnerFacilityView({...input,files:{st:{}}}),/trusted source file/);
});
