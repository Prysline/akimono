import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {reviewStreetMenu,projectStreetMenu} from '../src/original-r4-street-menu.mjs';
const file=p=>fileURLToPath(new URL(p,import.meta.url));
const menu=file('../../custom/inc-menu.cgi'),config=file('../../_config.cgi'),time=file('./original-perl/pinned-time.cgi');
const probe=file('./original-perl/original-r4-street-menu-probe.pl');
const sources={menu:readFileSync(menu,'utf8'),config:readFileSync(config,'utf8'),time:readFileSync(time,'utf8')};
const reviewed=reviewStreetMenu(sources);
const now=1700000000;
const shops=Array.from({length:6},(_,i)=>({id:100+i,shopname:'店'+i,lastlogin:now-120}));
function compare(patch={}){
  const input={viewerKind:'player',actorId:100,nowSeconds:now,boardMtime:0,shops,mailboxPresent:false,mailboxContent:'',...patch};
  const before=JSON.stringify(input),got=projectStreetMenu({reviewed,...input});
  const want=JSON.parse(execFileSync('perl',[probe,menu,config,time,JSON.stringify(input)],{encoding:'utf8',timeout:10000}));
  assert.deepEqual(got.groups.map(g=>g.label),want.groups);
  assert.deepEqual(got.groups.flatMap(g=>g.links.map(l=>({...l,label:'['+l.label+']'}))),want.links);
  assert.equal(got.activity?.kind??null,want.kind);
  assert.equal(got.activity?.sourceText??null,want.active);
  assert.equal(want.mailDeleted,input.mailboxPresent);
  assert.equal(got.committable,false);assert.equal(JSON.stringify(input),before);
  return got;
}
test('R4 actual Standard Street menu routes, order, guest/admin and board time',()=>{
  for(const mtime of [0,now-43199,now-43200,now-86400,now+1])compare({boardMtime:mtime});
  compare({nowSeconds:1700031600,boardMtime:1700031600-45000});
  for(const viewerKind of ['guest','admin'])compare({viewerKind,actorId:null});
});
test('R4 actual LoginMember 120s, DT order, fourth-shop suffix, wis presence priority',()=>{
  for(let n=0;n<=6;n++){
    const ordered=shops.map((s,i)=>({...s,lastlogin:now-(i<n?120:121)})).reverse();
    const got=compare({shops:ordered});assert.equal(got.activity.more,n>=4);
    assert.equal(got.activity.names.length,Math.min(n,4));
  }
  compare({mailboxPresent:true,mailboxContent:''});
  compare({mailboxPresent:true,mailboxContent:'<SPAN>甲</SPAN> > <b>你好</b>'});
});
test('R4 menu source drift and untrusted context rejected',()=>{
  for(const k of Object.keys(sources))assert.throws(()=>reviewStreetMenu({...sources,[k]:sources[k]+' '}),/source drift/);
  const input={reviewed,viewerKind:'player',actorId:100,nowSeconds:now,boardMtime:0,shops};
  assert.throws(()=>projectStreetMenu({...input,reviewed:{}}),/reviewed/);
  assert.throws(()=>projectStreetMenu({...input,actorId:999}),/viewer/);
  assert.throws(()=>projectStreetMenu({...input,viewerKind:'guest',actorId:null,mailboxPresent:true}),/viewer/);
  assert.throws(()=>projectStreetMenu({...input,shops:[shops[0],shops[0]]}),/ordered/);
});
