/** Read-only inspection of genuine P4 save/checkpoint bytes. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash,createHmac} from 'node:crypto';

export async function inspectDairyCheckpoint(p,generation){
  const record=JSON.parse(await readFile(join(p.directory,generation%2?'world-b.json':'world-a.json'),'utf8'));
  assert.equal(record.format,'akimono.local-world-save.v2');
  assert.equal(record.generation,generation);
  assert.deepEqual(JSON.parse(record.world),p.state.world);
  const directory=join(p.directory,'reviewed-history-v1'),key=await readFile(join(directory,'key'));
  assert.equal(key.length,32);
  const sha=x=>createHash('sha256').update(x).digest('hex');
  const mac=(domain,value)=>createHmac('sha256',key).update(JSON.stringify([domain,value])).digest('hex');
  const format='akimono.reviewed-history-checkpoint.v1';
  assert.equal(record.sha256,sha(JSON.stringify([record.format,generation,record.world,record.careerProof])));
  assert.equal(record.checkpointAuth,mac(format+'/save',[generation,record.world,record.careerProof]));
  let proof=JSON.parse(record.careerProof),revision=p.state.world.revision,segments=0;
  assert.equal(proof.anchorKind,'checkpoint');
  const fingerprint=proof.checkpoint.sourceFingerprint,origin=proof.checkpoint.originSha256;
  while(proof.anchorKind==='checkpoint'){
    const {mac:signature,...body}=proof.checkpoint;
    assert.equal(signature,mac(format,body));
    assert.equal(body.sourceFingerprint,fingerprint);
    assert.equal(body.originSha256,origin);
    assert.equal(body.worldSha256,sha(proof.anchor));
    const anchor=JSON.parse(proof.anchor);
    assert.equal(anchor.worldId,p.state.world.worldId);
    assert.equal(anchor.revision+proof.commands.length,revision);
    revision=anchor.revision;
    const wire=await readFile(join(directory,'prefix-'+body.prefixSha256+'.json'),'utf8');
    assert.equal(sha(wire),body.prefixSha256);
    proof=JSON.parse(wire);segments++;
  }
  assert.equal(proof.anchorKind,'fresh');
  assert.equal(JSON.parse(proof.anchor).revision+proof.commands.length,revision);
  assert.equal(origin,sha(JSON.stringify([proof.anchorKind,proof.anchor])));
  return {segments};
}
