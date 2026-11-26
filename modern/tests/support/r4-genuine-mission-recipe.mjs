/** Test-client preparation only: never changes a game rule, injects EXP,
 * edits a save, chooses random samples or bypasses the actual USE endpoint.
 * Source period.cgi may decay EXP during material procurement or time waits.
 * Lostbook may consume the book; a subsequent purchase must be genuine. */
import assert from 'node:assert/strict';

export async function prepareGenuineMissionRecipe({p,book,useId,materials,acquireBook,
  acquireMaterial,train=null,diagnostic=()=>'',onRetry=()=>{},maxAttempts=64}){
  const context=()=>JSON.stringify({book,useId,quote:p.quote(book,useId),
    exp:p.exp(book),remaining:p.remaining(),period:p.state.world.period.settledCount,
    stock:materials.map(([id,n])=>[id,p.stock(id),n]),state:diagnostic()});
  for(let attempt=0;attempt<maxAttempts;attempt++){
    await acquireBook(book);
    for(const [id,n] of materials)await acquireMaterial(id,n);
    const before=p.quote(book,useId);
    assert.ok(before&&Number.isSafeInteger(before.timePerUseSeconds),'registered source recipe '+context());
    await p.enoughTime(before.timePerUseSeconds);
    // The clock, book ownership, inventory and EXP can all have changed.
    // Read the authoritative live quote immediately before the command.
    const q=p.quote(book,useId);
    assert.ok(q&&Number.isSafeInteger(q.requiredProficiency)&&Number.isSafeInteger(q.proficiency),
      'reviewed source proficiency quote '+context());
    if(q.canUse&&q.maxUseCount>=1&&p.remaining()>=q.timePerUseSeconds){
      assert.ok(p.stock(book)>0&&materials.every(([id,n])=>p.stock(id)>=n),'actual source materials '+context());
      return q;
    }
    onRetry({book,useId,attempt,period:p.state.world.period.settledCount,
      reason:q.reason,exp:q.proficiency,required:q.requiredProficiency,
      beforeExp:before.proficiency,time:q.timePerUseSeconds,remaining:p.remaining()});
    if(q.proficiency<q.requiredProficiency&&train!==null){
      await train(); // original lower-tier recipe, never an EXP grant
      continue;
    }
    if(!p.stock(book)||materials.some(([id,n])=>p.stock(id)<n)||p.remaining()<q.timePerUseSeconds)
      continue;
    assert.fail('source recipe gate cannot be repaired by preparation '+context());
  }
  assert.fail('bounded genuine mission recipe preparation exhausted '+context());
}
