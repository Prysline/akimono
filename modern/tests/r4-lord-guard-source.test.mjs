import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {reviewLordGuard,describeLordGuard,projectLordGuard} from './support/r4-lord-guard-candidate.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sources={view:read('./original-perl/pinned-lord-f.cgi'),command:read('./original-perl/pinned-lord-s.cgi'),
 calc:read('./original-perl/calc.cgi'),config:read('../../_config.cgi')};
const reviewed=reviewLordGuard(sources);
const probe=fileURLToPath(new URL('./original-perl/original-r4-lord-guard-probe.pl',import.meta.url));
const oracle=(fixture,command)=>JSON.parse(execFileSync('perl',[probe],{input:JSON.stringify({fixture,command}),encoding:'utf8'}));
const fixture=(town={},extra={})=>({revision:7,lasttime:1000000,taxRate:20,actorId:1,eventState:{},
 town:{leader:1,money:24000000,army:2000,robina:400,safety:9550,devem:123,safem:456,in:90,out:80,...town},
 shops:[{id:1,name:'Owner',shopname:'Shop A',rank:9000,taxtoday:9876,money:123,time:999999},
        {id:2,name:'Other',shopname:'Shop B',rank:2999,taxtoday:4321,money:321,time:999998}],...extra});
const viewCases=[
 ['zero funds',fixture({money:0})],['negative funds',fixture({money:-1200})],
 ['positive funds below unit',fixture({money:1199,army:0})],['one unit',fixture({money:1200,army:1})],
 ['first preset duplicate',fixture({money:1200000,army:1000})],
 ['second preset duplicate',fixture({money:6000000,army:5000})],
 ['maximum above presets',fixture({money:24001200,army:20001})],
 ['rebel hides all military forms',fixture({}, {eventState:{rebel:1259200}})],
 ['volunteers do not count for expose',fixture({army:1999,robina:9999})],
 ['exact expose thresholds',fixture({army:2000,money:1000000})],
 ['one coin short',fixture({army:2000,money:999999})],
 ['zero elapsed period clamped to one',fixture({safety:0},{lasttime:129600-10800})],
 ['last second before boundary',fixture({safety:10000},{lasttime:129600-10801})],
 ['other event leaves view unchanged',fixture({}, {eventState:{'ken-sale':1100000}})],
 ['source period safety above 10000',fixture({safety:15000})],
 ['source signed guard upkeep above safety 20000',fixture({safety:25000})],
];
for(const [name,f] of viewCases)test('R4 lord original view: '+name,()=>{
 const before=structuredClone(f),original=oracle(f),got=describeLordGuard({reviewed,fixture:f});
 assert.equal(original.ok,1);
 const {ok,...expected}=original;
 assert.deepEqual(Object.fromEntries(Object.keys(expected).map(k=>[k,got[k]])),expected);
 assert.equal(got.committable,false);assert.deepEqual(f,before);
});
const military=(kind,cnt1,cnt2)=>({kind,cnt1,cnt2,expectedRevision:7,actorId:1});
const expose=(targetId)=>({kind:'expose',targetId,expectedRevision:7,actorId:1});
const withRank=(rank,town={})=>{const f=fixture(town);f.shops[1].rank=rank;return f};
const commandCases=[
 ['hire dropdown',fixture(),military('outside',10,0),1],
 ['hire text overrides dropdown',fixture(),military('outside',10,4),1],
 ['hire max money clip',fixture({money:2500}),military('outside',1000,0),1],
 ['hire no units affordable',fixture({money:1199}),military('outside',1,0),0],
 ['hire zero',fixture(),military('outside',0,0),0],
 ['negative text overrides dropdown then clamps',fixture(),military('outside',10,-1),0],
 ['raw negative city money anomaly (not public)',fixture({money:-1200}),military('outside',1,0),1],
 ['hire rebel',fixture({}, {eventState:{rebel:1259200}}),military('outside',10,0),0],
 ['fire dropdown',fixture(),military('outdel',10,0),1],
 ['fire text overrides dropdown',fixture(),military('outdel',10,4),1],
 ['fire clips to actual regular guard',fixture({army:4,robina:100}),military('outdel',10,0),1],
 ['raw fire with zero town money (UI hidden)',fixture({money:0}),military('outdel',10,0),1],
 ['fire no troops',fixture({army:0}),military('outdel',10,0),0],
 ['fire zero',fixture(),military('outdel',0,0),0],
 ['fire rebel',fixture({}, {eventState:{rebel:1259200}}),military('outdel',10,0),0],
 ['expose exact rank and funds',withRank(2000,{money:1000000,army:2000,safety:9500}),expose(2),1],
 ['expose rank floor and safety cap',withRank(2999,{safety:9900}),expose(2),1],
 ['expose rank one below',withRank(1999),expose(2),0],
 ['expose funds one below',fixture({money:999999}),expose(2),0],
 ['expose target missing',fixture(),expose(99),0],
 ['expose own shop',fixture(),expose(1),1],
 ['raw expose below UI army threshold',fixture({army:1999,robina:9999}),expose(2),1],
 ['expose rebel',fixture({}, {eventState:{rebel:1259200}}),expose(2),0],
];
for(const [name,f,command,want] of commandCases)test('R4 lord original handler: '+name,()=>{
 const before=structuredClone(f),original=oracle(f,command),got=projectLordGuard({reviewed,fixture:f,command});
 assert.equal(original.ok,want);assert.equal(got.ok,want);
 const {trace,...expected}=original;
 assert.deepEqual({...got,committable:undefined},{...expected,committable:undefined});
 assert.equal(got.committable,false);assert.deepEqual(f,before);
 assert.deepEqual(trace,want?['lock','read-adapter','auth-adapter',...(original.logs.length?['log']:[]),'renew','stage-adapter','commit-adapter','unlock','render']:['lock','read-adapter','auth-adapter']);
 if(!want)assert.deepEqual(got.fixture,before);
});
test('R4 lord source candidates fail closed on authority, drift, revision and unreviewed input',()=>{
 for(const k of Object.keys(sources))assert.throws(()=>reviewLordGuard({...sources,[k]:sources[k]+' '}),/source drift/);
 const f=fixture(),command=military('outside',1,0);
 const nonlord=fixture({leader:2});assert.equal(oracle(nonlord).ok,0);
 assert.throws(()=>describeLordGuard({reviewed,fixture:nonlord}),/current lord/);
 assert.throws(()=>projectLordGuard({reviewed,fixture:nonlord,command}),/current lord/);
 for(const c of [{...command,expectedRevision:6},{...command,actorId:2},{...command,cnt2:Infinity},{...command,randomDraws:[0]}])
  assert.throws(()=>projectLordGuard({reviewed,fixture:f,command:c}),/R4 lord guard source/);
 assert.throws(()=>describeLordGuard({reviewed:{...reviewed},fixture:f}),/source review/);
 const below=fixture({army:1999,robina:9999});
 assert.equal(describeLordGuard({reviewed,fixture:below}).canExpose,false);
 assert.equal(projectLordGuard({reviewed,fixture:below,command:expose(2)}).ok,1);
 const zero=fixture({money:0});
 assert.equal(describeLordGuard({reviewed,fixture:zero}).canFire,false);
 assert.equal(projectLordGuard({reviewed,fixture:zero,command:military('outdel',1,0)}).ok,1);
});
