import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {reviewDragonNews,projectDragonNews} from '../src/original-r4-dragon-news.mjs';
const file=p=>fileURLToPath(new URL(p,import.meta.url));
const path={info:file('./original-perl/pinned-dragon-info.cgi'),page:file('./original-perl/pinned-street-shop-page.cgi'),time:file('./original-perl/pinned-time.cgi'),config:file('../../_config.cgi')};
const probe=file('./original-perl/original-r4-dragon-news-probe.pl');
const sources=Object.fromEntries(Object.entries(path).map(([k,v])=>[k,readFileSync(v,'utf8')]));
const reviewed=reviewDragonNews(sources);
const row=(n,m=n%3)=>`${1700000000+n}\t${m}\t記事${n}\n`;
function compare(patch={}){
  const input={log0:null,log1:null,log2:row(999),mobile:false,page:0,...patch};
  const before=JSON.stringify(input),got=projectDragonNews({reviewed,...input});
  const want=JSON.parse(execFileSync('perl',[probe,path.info,path.page,path.time,path.config,JSON.stringify(input)],{encoding:'utf8',timeout:10000}));
  assert.deepEqual(got.popups,want.popups);assert.deepEqual(got.pageInfo,want.pageInfo);
  assert.deepEqual(got.entries.map(({timestamp,type,...row})=>row),want.entries);
  assert.equal(got.committable,false);assert.equal(JSON.stringify(input),before);
  return got;
}
test('R4 original dragon info reads current and previous log only, exact source order and labels',()=>{
  assert.equal(compare().empty,true);assert.equal(compare({log0:'',log1:''}).empty,true);
  const p=compare({log0:row(9,2)+row(1,0),log1:row(2,1)+row(8,3)});
  assert.deepEqual(p.entries.map(x=>x.timestamp),[9,1,2,8].map(n=>1700000000+n));
  compare({log0:null,log1:row(4)});compare({log0:row(3),log1:null});
  const q=compare({log0:'1\t0\t甲🐉\n2\t1\t終端無換行🐉'});assert.equal(q.entries[1].sourceMessage,'終端無換行');
  compare({log0:'0\t2\t<b>原文</b>\n'});
});
test('R4 original dragon info desktop25/mobile5 lpg page clamps and crosses log generation',()=>{
  const log0=Array.from({length:18},(_,i)=>row(i)).join(''),log1=Array.from({length:20},(_,i)=>row(i+18)).join('');
  for(const mobile of [false,true])for(const page of [-1,0,1,3,99])compare({log0,log1,mobile,page});
});
test('R4 dragon news rejects unknown source and untrusted context',()=>{
  for(const k of Object.keys(sources))assert.throws(()=>reviewDragonNews({...sources,[k]:sources[k]+' '}),/source drift/);
  const input={reviewed,log0:null,log1:null,mobile:false};
  assert.throws(()=>projectDragonNews({...input,reviewed:{}}),/trusted/);
  assert.throws(()=>projectDragonNews({...input,log0:'garbage\n'}),/log row/);
  assert.throws(()=>projectDragonNews({...input,page:1.5}),/trusted/);
});
