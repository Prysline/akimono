import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {normalizeLocalSourceText} from '../src/local-source-text.mjs';
import {reviewR4RestartState,projectR4RestartState} from '../src/original-r4-restart-shop-state.mjs';
const read=p=>normalizeLocalSourceText(readFileSync(new URL(p,import.meta.url),'utf8'));
const sourceTexts={membership:read('./original-perl/pinned-membership-user.cgi'),form:read('./original-perl/pinned-other.cgi'),compiler:read('./original-perl/inc-makeitem.cgi'),dsl:read('../../custom/inc-item-data.cgi'),core:read('./original-perl/inc-func.cgi'),writer:read('./original-perl/write.cgi'),subdata:read('./original-perl/pinned-user.cgi')};
const detailSource=read('./original-perl/core-detail.cgi'),reviewed=reviewR4RestartState({sourceTexts,detailSource});
const fields=sourceTexts.core.match(/@DTindexnamelist=\s*qw\(([\s\S]*?)\)\s*;/)[1].trim().split(/\s+/);
const textFields=new Set(['name','shopname','pass','comment','remoteaddr','guild','blocklogin','nocheckip','job','rankingyesterday']);
function normalized(wire){
  const rows=wire.trimEnd().split('\n'),cols=rows[6].split(',');
  assert.equal(cols.length,32);
  const [showcase,price,item,...maps]=rows[7].split(':');
  assert.equal(maps.length,4);
  const out=Object.fromEntries(fields.map((k,i)=>[k,textFields.has(k)?cols[i]:Number(cols[i])]));
  if(out.rankingyesterday!=='')out.rankingyesterday=Number(out.rankingyesterday);
  out.status=1;out.showcase=Array.from({length:out.showcasecount},(_,i)=>Number(showcase.split(',')[i]??0));
  out.price=Array.from({length:out.showcasecount},(_,i)=>Number(price.split(',')[i]??0));
  out.item=Array.from({length:79},(_,i)=>Number(item.split(',')[i]??0));
  for(const [i,k] of ['itemyesterday','itemtoday','exp','user'].entries()){
    const pairs=maps[i]?maps[i].split(','):[];out[k]={};
    for(let j=0;j<pairs.length;j+=2)out[k][pairs[j]]=k==='user'?pairs[j+1]:Number(pairs[j+1]);
  }
  return out;
}
test('LC-D2 restart normalized 32 scalars and seven source sections match actual Perl wrapper roundtrip',()=>{
  const runner=fileURLToPath(new URL('./original-perl/original-r4-shop-lifecycle-wrapper.t',import.meta.url));
  const out=execFileSync('perl',[runner],{encoding:'utf8',env:{...process.env,AKIMONO_D_RESTART_WIRE_ORACLE:'1'},maxBuffer:4*1024*1024});
  const notes=out.split('\n').filter(l=>l.startsWith('# D_RESTART_WIRE '));assert.equal(notes.length,1);
  const evidence=JSON.parse(notes[0].slice('# D_RESTART_WIRE '.length)),shop=normalized(evidence.before),expected=normalized(evidence.after);
  expected.point=evidence.point;
  const world={worldId:'restart-unit',streetId:'standard-street',revision:3,nowSeconds:evidence.now,shops:[shop]};
  const input={reviewed,world,actorRef:{worldId:world.worldId,street:world.streetId,shopId:1,ownerName:shop.name},expectedRevision:3,confirmation:'restart',subdataNames:['1-alpha.cgi','2-other.cgi']};
  const before=structuredClone(world),result=projectR4RestartState(input);
  assert.deepEqual(result.shop,expected);
  assert.deepEqual(result.subdataDeletionSelection,['1-alpha.cgi']);
  assert.equal(result.sessionIntent.deleteSessionFile,false);
  assert.equal(result.committable,false);assert.ok(Object.isFrozen(result.shop.item));
  assert.deepEqual(world,before);
  assert.throws(()=>projectR4RestartState({...input,expectedRevision:2}),/R4 lifecycle/);
  assert.throws(()=>projectR4RestartState({...input,reviewed:{}}),/reviewed D/);
  assert.throws(()=>reviewR4RestartState({sourceTexts,detailSource:detailSource+'\n'}),/source drift/);
});
