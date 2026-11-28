import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {reviewDragonOwnerDetailView,projectDragonOwnerDetailView} from '../src/original-r4-dragon-owner-detail-view.mjs';
const file=p=>fileURLToPath(new URL(p,import.meta.url));
const paths={detail:file('./original-perl/pinned-dragon-detail.cgi'),pr:file('./original-perl/pinned-dragon-pr.cgi'),dragon:file('./original-perl/pinned-inc-dragon.cgi'),readA:file('./original-perl/pinned-drreada.cgi'),readB:file('./original-perl/pinned-drreadb.cgi'),time:file('./original-perl/pinned-time.cgi'),config:file('../../_config.cgi')};
const sources=Object.fromEntries(Object.entries(paths).map(([k,v])=>[k,readFileSync(v,'utf8')]));
const review=reviewDragonOwnerDetailView(sources),probe=file('./original-perl/original-r4-dragon-owner-detail-probe.pl');
const now=1700000000,base={now,street:'standard',actorId:1,activeShopIds:[1,2],dr:1,files:{}};
const schemas={dra:'DR',pr:'PR',st:'ST',jk:'JK'};
const wire=(mode,records)=>{const fields=sources.dragon.match(new RegExp('@'+schemas[mode]+'namelist=qw\\(([\\s\\S]*?)\\);'))[1].trim().split(/\s+/);return records.map(r=>fields.map(k=>r[k]??0).join(',')+'\n').join('');};
const dragon=(patch={})=>({no:1,name:'龍甲',town:'standard',owner:1,birth:now-86400*11,fm:1,color:4,stable:4,race:0,apt:1400,sp:100,spp:5,sr:81,srp:8,ag:20,agp:3,pw:0,pwp:0,hl:50,hlp:50,fl:33,flp:10,con:115,wt:50,gr:122,prize:300,g1win:2,g2win:1,g3win:3,sdwin:4,hr:88,preg:0,...patch});
const facility=(patch={})=>({no:4,name:'房甲',town:'standard',owner:2,birth:now-86400,race:0,...patch});
function perl(input){return JSON.parse(execFileSync('perl',[probe,paths[input.mode],paths.dragon,paths.readA,paths.readB,paths.time,paths.config,JSON.stringify(input)],{encoding:'utf8',timeout:10000}));}
function compare(mode,patch={}){const input={...base,mode,...patch},before=JSON.stringify(input),got=projectDragonOwnerDetailView({review,...input});const rendered=structuredClone(got);for(const f of rendered.forms)f.advice=f.advice.map(m=>m.key.replace(/%(\d+)/g,(_,i)=>String(m.args[Number(i)-1])));assert.deepEqual(rendered,perl(input));assert.equal(JSON.stringify(input),before);return got;}
const codes=v=>v.forms.map(f=>f.code);
test('R4 original private competition dragon summary, exact ability bars and strategy boundaries',()=>{
 for(const [sr,ag] of [[81,20],[80,20],[20,81],[20,80],[60,50],[61,50],[50,61],[50,50]]){
  const got=compare('detail',{files:{dra:wire('dra',[dragon({sr,ag})])}});assert.equal(got.bars.length,9);assert.equal(got.summary.imageKey,'dragon25');
 }
 for(const wt of [40,49,50,56,60,65])compare('detail',{files:{dra:wire('dra',[dragon({wt,con:0,gr:0})])}});
 compare('detail',{files:{dra:wire('dra',[dragon({apt:3200,fl:100,sp:0,spp:5,con:55,gr:75})])}});
});
test('R4 competition dragon preserves raw stable/jockey slots, race and strict retirement gates',()=>{
 const st=wire('st',[facility({owner:99,no:3,name:'孤立'}),facility(),facility({town:'foreign',owner:99,no:7,name:'外房'})]);
 const jk=wire('jk',[facility({no:6,owner:99}),facility({no:5,race:1}),facility({no:8,race:2}),facility({no:9,race:3}),facility({no:10,town:'foreign',owner:99,race:0})]);
 for(const race of [0,1,2,3])for(const elapsed of [10*86400-1,10*86400,10*86400+1]){
  const got=compare('detail',{files:{dra:wire('dra',[dragon({race,birth:now-elapsed})]),st,jk}});assert.deepEqual(codes(got),race>1?[]:elapsed>10*86400?['ent','torace','retire']:['ent','torace']);
  if(race<2){assert.deepEqual(got.forms[0].fields[0].options.map(x=>x.value),[null,4,7]);assert.deepEqual(got.forms[1].fields[1].options.map(x=>x.value),[0,null,5,10]);}
 }
 assert.deepEqual(codes(compare('detail',{files:{dra:wire('dra',[dragon()])}})),['torace','retire']);
 compare('detail',{files:{dra:wire('dra',[dragon({stable:3})]),st:wire('st',[facility({owner:99,no:3})])}});
});
test('R4 parent dragon preserves last birth, male slots, capacity advice and strict cooldown',()=>{
 const male=dragon({no:2,fm:0,owner:99,town:'foreign',name:'種甲'}),orphan=dragon({no:3,fm:0,owner:99,name:'孤立'});
 for(const elapsed of [3*86400-1,3*86400,3*86400+1]){
  const got=compare('pr',{files:{pr:wire('pr',[dragon({preg:now-elapsed}),male,orphan]),dra:wire('dra',[dragon(),dragon({no:2}),dragon({no:3})])}});assert.equal(got.bars.length,7);assert.deepEqual(codes(got),elapsed>3*86400?['preg']:[]);
  if(got.forms.length)assert.deepEqual(got.forms[0].fields[1].options.map(x=>x.value),[2,null]);
 }
 const only=compare('pr',{files:{pr:wire('pr',[dragon()])}});assert.equal(only.summary.cells.at(-1),'--/--');assert.deepEqual(codes(only),[]);
 compare('pr',{files:{pr:wire('pr',[dragon(),orphan])}});
});
test('R4 owner detail rejects actual wrong owner/town/sex and never aliases missing target',()=>{
 for(const k of Object.keys(sources))assert.throws(()=>reviewDragonOwnerDetailView({...sources,[k]:sources[k]+' '}),/source drift/);
 for(const mode of ['detail','pr']){
  const key=mode==='detail'?'dra':'pr';
  for(const patch of [{owner:2},{town:'foreign'},...(mode==='pr'?[{fm:0},{owner:99}]:[])]){const input={...base,mode,files:{[key]:wire(key,[dragon(patch)])}};assert.deepEqual(perl(input),{error:'bad request'});assert.throws(()=>projectDragonOwnerDetailView({review,...input}),/bad request/);}
  const input={...base,mode,files:{[key]:wire(key,[dragon()])}};
  assert.throws(()=>projectDragonOwnerDetailView({review,...input,dr:99}),/bad request/);
  for(const patch of [{review:{}},{actorId:99},{activeShopIds:[1,1]},{dr:0},{mode:'ReadParent'}])assert.throws(()=>projectDragonOwnerDetailView({review,...input,...patch}),/trusted reviewed/);
 }
});
