import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {reviewDragonOwnerJockey,projectDragonOwnerJockey} from '../src/original-r4-dragon-public-view.mjs';
const file=p=>fileURLToPath(new URL(p,import.meta.url));
const paths={list:file('./original-perl/pinned-slime-l.cgi'),status:file('./original-perl/pinned-dragon-rd.cgi'),dragon:file('./original-perl/pinned-inc-dragon.cgi'),readA:file('./original-perl/pinned-drreada.cgi'),readB:file('./original-perl/pinned-drreadb.cgi'),readC:file('./original-perl/pinned-drreadc.cgi'),page:file('./original-perl/pinned-street-shop-page.cgi'),time:file('./original-perl/pinned-time.cgi'),config:file('../../_config.cgi'),jock:file('./original-perl/pinned-dragon-jock.cgi')};
const sources=Object.fromEntries(Object.entries(paths).map(([k,v])=>[k,readFileSync(v,'utf8')]));
const review=reviewDragonOwnerJockey(sources),probe=file('./original-perl/original-r4-dragon-owner-jockey-probe.pl');
const now=1700000000,base={now,street:'standard',actorId:1,activeShopIds:[1,2],jockeyFile:null};
const fields=sources.dragon.match(/@JKnamelist=qw\(([\s\S]*?)\);/)[1].trim().split(/\s+/);
const wire=rs=>rs.map(r=>fields.map(k=>r[k]??0).join(',')+'\n').join('');
const jockey=(i,patch={})=>({no:i+1,name:'騎手'+i,town:'standard',owner:99,birth:now-86400*i,ahead:100,back:49,sp:2,race:i%4,g1win:1,...patch});
function compare(patch={}){const input={...base,...patch},before=JSON.stringify(input),got=projectDragonOwnerJockey({review,...input});const want=JSON.parse(execFileSync('perl',[probe,paths.jock,paths.dragon,paths.readA,paths.time,JSON.stringify(input)],{encoding:'utf8',timeout:10000}));assert.deepEqual(got,want);assert.equal(JSON.stringify(input),before);return got;}
test('R4 original owner jockey page retains raw capacity and form contract',()=>{
 assert.equal(compare().state,'available');compare({jockeyFile:''});
 const records=Array.from({length:20},(_,i)=>jockey(i));
 for(const count of [19,20]){const got=compare({jockeyFile:wire(records.slice(0,count))});assert.equal(got.state,count===19?'available':'full');}
 compare({jockeyFile:wire(records.map((r,i)=>({...r,town:i%2?'foreign':'standard',owner:i%2?1:99})))});
});
test('R4 original owner jockey page selects last local own record even at capacity',()=>{
 const records=Array.from({length:20},(_,i)=>jockey(i));
 records[0]=jockey(0,{owner:1,name:'先'});records[19]=jockey(19,{owner:1,name:'後'});
 const got=compare({jockeyFile:wire(records)});assert.equal(got.row.cells[0],'後');assert.equal(got.form,null);
 for(const race of [0,1,2,3])compare({jockeyFile:wire([jockey(0,{owner:1,race,birth:now-3600})])});
 compare({actorId:2,jockeyFile:wire([jockey(0,{owner:1}),jockey(1,{owner:2})])});
});
test('R4 owner jockey projection refuses missing authority and unpinned source',()=>{
 assert.throws(()=>reviewDragonOwnerJockey({...sources,jock:sources.jock+' '}),/source drift/);
 for(const patch of [{review:{}},{actorId:99},{actorId:0},{activeShopIds:[]}])assert.throws(()=>projectDragonOwnerJockey({review,...base,...patch}),/authenticated/);
});
