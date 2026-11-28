import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {reviewDragonPublicView,projectDragonPublicView} from '../src/original-r4-dragon-public-view.mjs';
const file=p=>fileURLToPath(new URL(p,import.meta.url));
const paths={list:file('./original-perl/pinned-slime-l.cgi'),status:file('./original-perl/pinned-dragon-rd.cgi'),dragon:file('./original-perl/pinned-inc-dragon.cgi'),readA:file('./original-perl/pinned-drreada.cgi'),readB:file('./original-perl/pinned-drreadb.cgi'),readC:file('./original-perl/pinned-drreadc.cgi'),page:file('./original-perl/pinned-street-shop-page.cgi'),time:file('./original-perl/pinned-time.cgi'),config:file('../../_config.cgi')};
const sources=Object.fromEntries(Object.entries(paths).map(([k,v])=>[k,readFileSync(v,'utf8')]));
const review=reviewDragonPublicView(sources),probe=file('./original-perl/original-r4-dragon-public-view-probe.pl');
const now=1700000000,defaultInput={now,street:'standard',activeShopIds:[1,2],townNames:{standard:'標準街',foreign:'外街'},files:{},mobile:false,page:0,code:0,drTime:null};
const schemas={dra:'DR',pr:'PR',rc:'RC',st:'ST',jk:'JK',race:'RD'};
const wire=(mode,rows)=>{const m=sources.dragon.match(new RegExp('@'+schemas[mode]+'namelist=qw\\(([\\s\\S]*?)\\);'));const fields=m[1].trim().split(/\s+/);return rows.map(r=>fields.map(k=>r[k]??0).join(',')+'\n').join('');};
const base={birth:now-86400,fm:0,color:0,town:'standard',owner:1,apt:1400,sp:20,sr:50,ag:100,pw:0,con:75,wt:70,hl:33,fl:100,prize:0,g1win:0,g2win:0,g3win:0,sdwin:0};
const entities=Array.from({length:31},(_,i)=>({...base,no:i+1,name:'龍'+String(30-i).padStart(2,'0'),town:i%7===0?'foreign':'standard',owner:i%3===0?99:1,birth:now-i*3600,fm:i%2,color:i%5,prize:i%4===0?100:0,g1win:i%4===0?2:0,sp:i%5,fl:i%7,emp:i%6,tr:i%2?100:0,con:100,wt:100,ahead:100,back:49,race:i%4}));
function compare(mode,patch={}){
 const input={...defaultInput,mode,...patch},before=JSON.stringify(input),got=projectDragonPublicView({review,...input});
 const want=JSON.parse(execFileSync('perl',[probe,...Object.values(paths),JSON.stringify(input)],{encoding:'utf8',timeout:10000}));
 assert.deepEqual(got,want);assert.equal(JSON.stringify(input),before);assert.equal(got.committable,false);return got;
}
test('R4 original arena schedule uses actual 24 races and optional dr-last, without initialization',()=>{
 const empty=compare('sche');assert.equal(empty.clockRows.length,0);assert.deepEqual(empty.raceGroups.map(g=>g.rows.length),[12,12]);
 compare('sche',{drTime:[0,now,now+86400]});compare('sche',{drTime:[now-1,now+1,now+2]});
});
test('R4 actual public list readers retain per-handler orphan rules and raw slots before stable sort/page',()=>{
 for(const mode of ['dra','pr','rc','st','jk']){
  compare(mode);compare(mode,{files:{[mode]:''}});
  const files={[mode]:wire(mode,entities)};
  for(const mobile of [false,true])for(const page of [-1,0,1,5,99])compare(mode,{mobile,page,files});
  const fixture=[{...entities[0],town:'standard',owner:99,name:'孤立',prize:100,g1win:2},{...entities[1],name:'有效',prize:0,g1win:0},{...entities[2],town:'foreign',owner:99,name:'外街',prize:0,g1win:0}];
  const got=compare(mode,{files:{[mode]:wire(mode,fixture)}});
  assert.equal(got.rows.length,mode==='dra'?3:2);
  // Source chop on the final record is unconditional, even without LF.
  compare(mode,{files:{[mode]:wire(mode,fixture).slice(0,-1)}});
 }
});
test('R4 race detail joins original race order to current dragon data, including stale owner but not missing dragon',()=>{
 const dragons=[{...base,no:1,name:'最新甲',owner:99,sp:99,fl:20},{...base,no:2,name:'最新乙',fm:1,color:4,apt:3200,fl:99}];
 const rd=[{...base,no:4,dr:2,name:'舊乙'},{...base,no:1,dr:99,name:'缺資料'},{...base,no:3,dr:1,name:'舊甲'},{...base,no:2,dr:2,name:''}];
 compare('rd');compare('rd',{files:{race:''}});
 const got=compare('rd',{code:1,files:{race:'2,3,1\n'+wire('race',rd),dra:wire('dra',dragons)}});
 assert.deepEqual(got.rows.map(r=>r.cells[0]),['最新乙','最新甲']);
 assert.equal(got.rows[0].cells.length,10);assert.equal(got.rows[0].imageKey,'dragon25');
});
test('R4 actual race status preserves phase, schedule, public snapshot rows, popup and commentary',()=>{
 const rd=[{...base,no:2,dr:1,name:'登錄名',rcname:'牧場',stname:'龍房',jkname:'騎手',prize:223,strate:4,pop:2,time:125,sp1:9999,lose:'PRIVATE'},{...base,no:3,dr:2,name:'',time:0},{...base,no:1,dr:3,name:'另龍',rcname:'',stname:'',jkname:'',prize:0,pop:0,time:0}];
 compare('status');compare('status',{files:{race:'',commentary:''}});
 for(const code of [0,1])for(const phase of [0,1,2,3,4]){
  const got=compare('status',{code,drTime:[now,now+3600,now+7200],files:{race:phase+',1,1\n'+wire('race',rd),commentary:phase>1?'実況 <b>龍🐉</b><br>\n':null}});
  assert.equal(got.rows.length,2);assert.equal(JSON.stringify(got).includes('PRIVATE'),false);assert.equal(JSON.stringify(got).includes('9999'),false);
 }
});
test('R4 arena public view rejects unreviewed source/dispatch/context and never exposes raw private fields',()=>{
 for(const k of Object.keys(sources))assert.throws(()=>reviewDragonPublicView({...sources,[k]:sources[k]+' '}),/source drift/);
 const input={review,...defaultInput,mode:'dra'};
 assert.throws(()=>projectDragonPublicView({...input,review:{}}),/trusted/);
 assert.throws(()=>projectDragonPublicView({...input,mode:'ReadDragon'}),/trusted/);
 assert.throws(()=>projectDragonPublicView({...input,code:3}),/trusted/);
 assert.throws(()=>projectDragonPublicView({...input,files:{dra:{}}}),/trusted source/);
 const got=compare('dra',{files:{dra:wire('dra',[{...base,no:1,name:'公開',spp:99999,srp:99999,agp:99999,pwp:99999,hlp:99999,flp:99999,gr:99999,owner:88888}])}});
 assert.equal(/99999|88888/.test(JSON.stringify(got)),false);
});
