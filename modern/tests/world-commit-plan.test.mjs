import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { planWorldCommit } from '../src/world-commit-plan.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [source,config]=await Promise.all([
  'modern/tests/original-perl/write.cgi','_config.cgi',
].map(p=>readFile(path.join(root,p),'utf8')));
const plan=(abort,markerExists,stagedFilenames)=>
  planWorldCommit({abort,markerExists,stagedFilenames});

test('B-13 frozen Core commit source and Standard Street names are pinned',()=>{
  assert.match(source,/sub DataCommitOrAbort/);
  assert.ok(source.includes('my @tempfile=grep(/.$FILE_EXT$/,readdir(DIR));'));
  assert.ok(source.includes('OpenAndCheck($markfile),close(OUT) if !$abort;'));
  assert.ok(source.includes('if(!$abort || -e $markfile)'));
  assert.ok(source.includes('RenameAndCheck($TEMP_DIR."/".$_,$DATA_DIR."/".$_);'));
  assert.ok(source.includes('unlink($TEMP_DIR."/".$_);'));
  assert.ok(source.includes('unlink($markfile) if -e $markfile;'));
  assert.match(config,/\$FILE_EXT\s*=\s*'\.cgi'\s*;/);
  assert.match(config,/\$COMMIT_FILE\s*=\s*'commit'\s*;/);
});

test('B-13 normal commit makes marker and renames all .cgi files',()=>{
  const p=plan(false,false,['world.cgi','bags.cgi','notes.txt']);
  assert.equal(p.mode,'commit');
  assert.deepEqual(p.matchedFilenames,['bags.cgi','world.cgi']);
  assert.deepEqual(p.renameFilenames,['bags.cgi','world.cgi']);
  assert.deepEqual(p.deleteFilenames,[]);
  assert.equal(p.createMarker,true);
  assert.equal(p.removeMarkerOnSuccess,true);
});

test('B-13 normal commit with existing marker still runs commit',()=>{
  const p=plan(false,true,['world.cgi']);
  assert.equal(p.mode,'commit');
  assert.deepEqual(p.renameFilenames,['world.cgi']);
  assert.equal(p.createMarker,true); // original reopens marker
  assert.equal(p.removeMarkerOnSuccess,true);
});

test('B-13 abort without marker discards pending files and does not create marker',()=>{
  const p=plan(true,false,['world.cgi','bags.cgi']);
  assert.equal(p.mode,'discard');
  assert.deepEqual(p.deleteFilenames,['bags.cgi','world.cgi']);
  assert.deepEqual(p.renameFilenames,[]);
  assert.equal(p.createMarker,false);
  assert.equal(p.removeMarkerOnSuccess,false);
});

test('B-13 abort WITH marker is recovery commit, not discard',()=>{
  const p=plan(true,true,['world.cgi','bags.cgi']);
  assert.equal(p.mode,'recover');
  assert.deepEqual(p.renameFilenames,['bags.cgi','world.cgi']);
  assert.deepEqual(p.deleteFilenames,[]);
  assert.equal(p.createMarker,false);
  assert.equal(p.removeMarkerOnSuccess,true);
});

test('B-13 no staged source files clears stale marker',()=>{
  const p=plan(true,true,[]);
  assert.equal(p.mode,'no-staged-files');
  assert.equal(p.createMarker,false);
  assert.equal(p.removeMarkerOnSuccess,true);
  assert.deepEqual(p.renameFilenames,[]);
});

test('B-13 no matching staged files also clears stale marker',()=>{
  const p=plan(true,true,['notes.txt','unused.cgi.bak']);
  assert.equal(p.mode,'no-staged-files');
  assert.equal(p.removeMarkerOnSuccess,true);
  assert.deepEqual(p.matchedFilenames,[]);
});

test('B-13 no files and no marker has no operation',()=>{
  const p=plan(false,false,[]);
  assert.equal(p.mode,'no-staged-files');
  assert.equal(p.createMarker,false);
  assert.equal(p.removeMarkerOnSuccess,false);
});

test('B-13 original extension selector matches unexpected xcgi file; safe subset rejects',()=>{
  // Core source /.$FILE_EXT$/ with FILE_EXT='.cgi' is effectively /..cgi$/.
  const originalSelector=/..cgi$/;
  assert.equal(originalSelector.test('strangexcgi'),true);
  assert.equal('strangexcgi'.endsWith('.cgi'),false);
  assert.throws(()=>plan(false,false,['strangexcgi']),
    /Ambiguous original Core filename selector/);
  assert.deepEqual(plan(false,false,['strange.txt']).matchedFilenames,[]);
});

test('B-13 fail-closed file selection rejects traversal, control and invalid basenames',()=>{
  const names=['../world.cgi','a/b.cgi','a\\b.cgi','.cgi','..cgi',
    'foo..cgi','a\n.cgi',' a.cgi','a.cgi ','a\0.cgi'];
  for(const name of names) {
    assert.throws(()=>plan(false,false,[name]),/Unsafe staged filename|Ambiguous original/);
  }
});

test('B-13 planner refuses inferred abort and marker state',()=>{
  for(const value of [undefined,null,0,1,'true']) {
    assert.throws(()=>plan(value,false,['world.cgi']),/explicit booleans/);
    assert.throws(()=>plan(false,value,['world.cgi']),/explicit booleans/);
  }
});

test('B-13 planner refuses duplicate and nonarray staged basenames',()=>{
  assert.throws(()=>plan(false,false,['world.cgi','world.cgi']),/Duplicate/);
  for(const bad of [undefined,null,'world.cgi',{0:'world.cgi'},[null],[1]]) {
    assert.throws(()=>plan(false,false,bad),/stagedFilenames|Unsafe staged/);
  }
});

test('B-13 original readdir order is unspecified; canonical output is unordered SET',()=>{
  const p=plan(false,false,['world.cgi','other.cgi','bags.cgi']);
  const q=plan(false,false,['bags.cgi','world.cgi','other.cgi']);
  assert.deepEqual(p,q);
  assert.deepEqual(p.matchedFilenames,['bags.cgi','other.cgi','world.cgi']);
  assert.equal(p.partialCommitPossibleOnRenameFailure,true);
});

test('B-13 partial commit risk only reported for multi-file commit or recovery',()=>{
  assert.equal(plan(false,false,['a.cgi']).partialCommitPossibleOnRenameFailure,false);
  assert.equal(plan(false,false,['a.cgi','b.cgi']).partialCommitPossibleOnRenameFailure,true);
  assert.equal(plan(true,true,['a.cgi','b.cgi']).partialCommitPossibleOnRenameFailure,true);
  assert.equal(plan(true,false,['a.cgi','b.cgi']).partialCommitPossibleOnRenameFailure,false);
});

test('B-13 return plan arrays and metadata are immutable',()=>{
  const names=['world.cgi'];
  const result=plan(false,false,names);
  names[0]='tampered.cgi';
  assert.deepEqual(result.matchedFilenames,['world.cgi']);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.matchedFilenames));
  assert.ok(Object.isFrozen(result.renameFilenames));
  assert.throws(()=>{result.matchedFilenames[0]='changed.cgi'},TypeError);
});
