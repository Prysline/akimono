// Formal v2 negative-only mutations; the two control saves are genuine HTTP worlds.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {auditPlayer} from './support/r1-http-audit-player.mjs';

const digest=r=>createHash('sha256')
 .update(JSON.stringify([r.format,r.generation,r.world,r.careerProof??null])).digest('hex');
function proofEdit(r,edit){
 const proof=JSON.parse(r.careerProof);
 edit(proof);
 r.careerProof=JSON.stringify(proof);
}
function timeEntry(proof){
 const entry=proof.commands.find(c=>c.kind==='advance-reviewed-world-time');
 assert.ok(entry?.trace,'genuine time entry');
 return entry;
}

test('R1 formal fresh v2 rejects malformed, unknown command/EVENT and invalid generation; both invalid slots never initialize',async t=>{
 const p=await auditPlayer(t);
 let s=await p.open();
 const first=await p.command('/api/save',{expectedRevision:s.world.revision,expectedGeneration:0},'SAVED');
 s=await p.command('/api/discard',{expectedRevision:s.world.revision,itemId:79,count:1});
 s=await p.command('/api/advance-reviewed-time',{expectedRevision:s.world.revision,minutes:1});
 const second=await p.command('/api/save',{expectedRevision:s.world.revision,expectedGeneration:1},'SAVED');
 const saved=await p.snapshot();
 assert.equal(saved.generation,2);
 const a=join(p.directory,'world-a.json'),b=join(p.directory,'world-b.json');
 const goodA=await readFile(a,'utf8'),goodB=await readFile(b,'utf8');
 const record=JSON.parse(goodA),proof=JSON.parse(record.careerProof);
 assert.equal(record.format,'akimono.local-world-save.v2');
 assert.equal(proof.anchorKind,'fresh');
 assert.equal(Object.hasOwn(record,'checkpointAuth'),false);
 assert.equal(record.sha256,digest(record));
 timeEntry(proof);
 const variants=[
  ['wrong slot parity',r=>{r.generation=3;}],
  ['extra envelope field',r=>{r.unreviewed=true;}],
  ['noncanonical proof',r=>{r.careerProof+=' ';}],
  ['missing proof',r=>{delete r.careerProof;}],
  ['history over capacity',r=>proofEdit(r,q=>{while(q.commands.length<=128)q.commands.push(q.commands.at(-1));})],
  ['unknown command',r=>proofEdit(r,q=>{const c=q.commands.find(x=>x.kind==='discard-item');assert.ok(c);c.kind='r1-unknown-command';})],
  ['unknown EVENT state',r=>{const w=JSON.parse(r.world);assert.ok(w.period.eventState);w.period.eventState['r1-unknown-event']=1;r.world=JSON.stringify(w);}],
  ['unknown EVENT trace',r=>proofEdit(r,q=>{const trace=timeEntry(q).trace;const order=trace.slices?trace.slices[0].eventOrder:trace.eventOrder;assert.equal(order.length,17);order[0]='r1-unknown-event';})],
  ['false time successor digest',r=>proofEdit(r,q=>{timeEntry(q).trace.afterSha256='0'.repeat(64);})],
 ];
 for(const [name,mutate] of variants){
  await p.stop();
  const forged=JSON.parse(goodA);mutate(forged);forged.sha256=digest(forged);
  const wire=JSON.stringify(forged)+'\n';await writeFile(a,wire);
  await p.boot();
  const status=await p.state(),before=await p.snapshot();
  assert.equal(status.save.generation,1,name);
  assert.equal(status.save.recoveryWarning,true,name);
  const restored=await p.command('/api/load',{},'LOADED');
  assert.deepEqual(restored.world,first.world,name);
  assert.deepEqual((await p.snapshot()).disk,before.disk,name+' recovery must not overwrite forged bytes');
  assert.equal(await readFile(a,'utf8'),wire,name);
  assert.equal(await readFile(b,'utf8'),goodB,name);
 }
 await p.stop();
 await writeFile(a,'invalid latest\n');await writeFile(b,'invalid previous\n');
 await p.boot();
 const bad=await p.snapshot(),status=await p.state();
 assert.equal(status.save.unreadable,true);assert.equal(status.save.available,false);
 assert.equal(bad.world,null);assert.equal(bad.generation,0);
 for(const [route,body] of [['/api/load',{}],['/api/initialize',{}],['/api/save',{expectedRevision:0,expectedGeneration:0}]]){
  const denied=await p.post(route,body);
  assert.ok(denied.status>=400&&denied.status<500,route);
  assert.equal(denied.body.ok,false,route);
  assert.deepEqual(await p.snapshot(),bad,route+' must preserve invalid disk and empty live world');
 }
 await p.stop();await writeFile(a,goodA);await writeFile(b,goodB);await p.boot();
 const restored=await p.command('/api/load',{},'LOADED');
 assert.deepEqual(restored.world,second.world);
 assert.deepEqual(await p.snapshot(),saved);
});
