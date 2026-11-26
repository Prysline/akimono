import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {reviewOriginalCompiledEventCatalog} from '../src/original-event-compiled-catalog.mjs';
import {reviewR4RebelNow} from '../src/original-r4-rebel-now.mjs';
import {reviewOriginalTerritoryConflict,projectOriginalTerritoryConflict} from '../src/original-period-territory.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const itemDsl=read('../../custom/inc-item-data.cgi'),rebelDsl=read('../../custom/inc-rebel-data.cgi'),
 turnSource=read('./original-perl/inc-turn.cgi'),periodSource=read('./original-perl/period.cgi'),
 compilerSource=read('./original-perl/inc-makeitem.cgi');
const compiledCatalog=reviewOriginalCompiledEventCatalog({itemDsl,rebelDsl,turnSource,compilerSource});
const reviewedRebelNow=reviewR4RebelNow({compiledCatalog,rebelDsl,turnSource,periodSource});
const sources={periodSource,adminSource:read('./original-perl/core-inc-admin-func.cgi'),
 readSource:read('./original-perl/inc-func.cgi'),bootstrapMeta:'500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0',reviewedRebelNow};
const reviewed=reviewOriginalTerritoryConflict(sources);
const {cases}=JSON.parse(execFileSync('perl',[fileURLToPath(new URL('./original-perl/original-r4-territory-conflict-probe.pl',import.meta.url))],{encoding:'utf8'}));
assert.equal(cases.length,10);
for(const row of cases)test('complete original territory and RebelRobin: '+row.name,()=>{
 const before=structuredClone(row.input);
 const got=projectOriginalTerritoryConflict({reviewed,...row.input});
 for(const [k,v] of Object.entries(row.output))assert.deepEqual(got[k],v,k);
 assert.equal(got.committable,false);
 assert.deepEqual(row.input,before);
});
test('territory source trigger ordering and population contract',()=>{
 const get=name=>projectOriginalTerritoryConflict({reviewed,...cases.find(c=>c.name===name).input});
 assert.equal(get('led-calm').town.army,12000);
 assert.equal(get('led-calm').town.robina,0);
 assert.equal(get('led-start').activeUntilSeconds,1259200);
 assert.equal(get('led-deferred').activeUntilSeconds,null);
 assert.equal(get('already-active-past-expiry').drawsUsed,2);
 assert.equal(get('led-insolvent-before-trigger').town.army,1666);
 assert.equal(get('unled-insolvent-after-transfer').town.robina,4000);
 assert.equal(get('dataread-count-not-active-count').dtPeople,446050);
 const x=cases[4].input;
 assert.throws(()=>projectOriginalTerritoryConflict({reviewed,...x,drawMillionths:[0,0,0,0]}),/RNG exhausted/);
 assert.throws(()=>projectOriginalTerritoryConflict({reviewed,...x,activeShopIds:[1,2]}),/membership/);
 assert.throws(()=>reviewOriginalTerritoryConflict({...sources,periodSource:periodSource+' '}),/frozen conflict territory source/);
});
