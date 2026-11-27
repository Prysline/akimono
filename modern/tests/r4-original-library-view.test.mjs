import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {reviewOriginalLibrary,describeOriginalLibrary} from '../src/original-library-view.mjs';
import {normalizeLocalSourceText} from '../src/local-source-text.mjs';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

const load=async()=>normalizeLocalSourceText(await readFile(new URL('../../custom/library.cgi',import.meta.url),'utf8'));
test('all original library titles, order and full bodies match executed frozen CGI',async()=>{
  const source=await load(),reviewed=reviewOriginalLibrary(source);
  const perl=[
    'use utf8;use JSON::PP;no strict;no warnings;',
    'local $/;my $source=decode_json(<STDIN>);',
    'sub l {$_[0]} sub GetTagImgKao {""} sub GetMenuTag {push @menu,[@_];return ""} sub OutSkin {}',
    'eval $source;die $@ if $@;',
    'print encode_json({titles=>[@TITLE],contents=>[@CONTENT],menu=>[@menu]});',
  ].join('\n');
  const expected=JSON.parse(execFileSync('perl',['-e',perl],{input:JSON.stringify(source),encoding:'utf8'}));
  const list=describeOriginalLibrary(reviewed);
  assert.deepEqual(list.chapters,expected.titles.map((title,id)=>({id,title})));
  assert.equal(list.chapters.length,8);
  assert.deepEqual(expected.menu,expected.titles.map((title,id)=>['library','●'+title,'t='+id]));
  for(const {id,title} of list.chapters){
    const {chapter}=describeOriginalLibrary(reviewed,id);
    assert.equal(chapter.title,title);
    assert.equal(chapter.parts.map(p=>p.heading?'<SPAN>'+p.text+'</SPAN>':p.text).join(''),expected.contents[id]);
  }
  assert.throws(()=>reviewOriginalLibrary(source+'\n'),/source drift/);
  assert.throws(()=>describeOriginalLibrary({},0),/review required/);
  for(const bad of [-1,8,1.5,'1'])assert.throws(()=>describeOriginalLibrary(reviewed,bad),/unavailable/);
});

test('original library HTTP is read-only across all chapters and save reload',async t=>{
  const p=await genuinePlayer(t,{crossPeriod:true,marketCommerce:true});
  const before=structuredClone(p.state),reviewed=reviewOriginalLibrary(await load());
  assert.deepEqual(await p.request('/api/library'),describeOriginalLibrary(reviewed));
  for(let id=0;id<8;id++)assert.deepEqual(await p.request('/api/library?t='+id),describeOriginalLibrary(reviewed,id));
  for(const path of ['/api/library?t=8','/api/library?t=-1','/api/library?t=0&t=1','/api/library?other=1'])
    assert.equal((await p.request(path)).ok,false);
  const denied=await p.post('/api/library',{t:1});assert.equal(denied.status,405);
  const after=await p.request('/api/state');
  assert.deepEqual(after.world,before.world);
  assert.equal(after.historyCommands,before.historyCommands);
  await p.saveAndRestart(0);
  assert.deepEqual(await p.request('/api/library?t=1'),describeOriginalLibrary(reviewed,1));
  assert.deepEqual(p.state.world,before.world);
});
