import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveR4ExactPreEventPrefix} from '../src/r4-exact-pre-event-prefix.mjs';
const missing='B-37 all original PLUS: missing original random draw';
const unused='B-37 all original PLUS: unused source random samples';
const tooLong='B-37 all original PLUS: explicit random millionths, maximum 118 samples';
const value=i=>(i*137+12345)%1000000;

test('exact prefix finds every bounded consumption length without selecting or shifting indexed samples',()=>{
  for(const maxDraws of [0,121,125,144,148]){
    for(let target=0;target<=maxDraws;target++){
      let attempts=0;const generated=[];
      const result=resolveR4ExactPreEventPrefix({maxDraws,unit(i){generated.push(i);return value(i);},project(samples){
        attempts++;
        assert.deepEqual(samples,Array.from({length:samples.length},(_,i)=>value(i)));
        if(samples.length<target)throw new RangeError(missing);
        if(samples.length>target)throw new RangeError(unused);
        return {receipt:{totalDraws:target},nextEventIndex:target};
      }});
      assert.deepEqual(result.samples,Array.from({length:target},(_,i)=>value(i)));
      assert.equal(result.pre.nextEventIndex,target);
      assert.deepEqual(generated,Array.from({length:generated.length},(_,i)=>i));
      assert.ok(attempts<=8);
    }
  }
});

test('PLUS maximum tail is an upper bound and never a missing draw',()=>{
  const result=resolveR4ExactPreEventPrefix({maxDraws:148,unit:value,project(samples){
    if(samples.length>120)throw new RangeError(tooLong);
    if(samples.length>118)throw new RangeError(unused);
    if(samples.length<118)throw new RangeError(missing);
    return {receipt:{totalDraws:118}};
  }});
  assert.equal(result.samples.length,118);
});

test('only exact source draw errors can adjust the prefix; no wrong receipt or exhausted tape is accepted',()=>{
  for(const message of ['R3 shared natural-sale: missing natural/PLUS source draw','R3 item callbacks: missing original #70 rand(1)','B-41 original sale boundary: missing original period random samples',missing]){
    const result=resolveR4ExactPreEventPrefix({maxDraws:148,unit:value,project(samples){
      if(samples.length<140)throw new RangeError(message);
      if(samples.length>140)throw new RangeError(unused);
      return {receipt:{totalDraws:140}};
    }});
    assert.equal(result.samples.length,140);
  }
  const bad=new RangeError('source closure requires external archive/session transaction');
  assert.throws(()=>resolveR4ExactPreEventPrefix({maxDraws:148,unit:value,project(){throw bad;}}),e=>e===bad);
  assert.throws(()=>resolveR4ExactPreEventPrefix({maxDraws:148,unit:value,project(){return {receipt:{totalDraws:-1}};}}),/exact draw accounting/);
  assert.throws(()=>resolveR4ExactPreEventPrefix({maxDraws:148,unit:value,project(){throw new RangeError(missing);}}),/budget exhausted/);
  assert.throws(()=>resolveR4ExactPreEventPrefix({maxDraws:148,unit:()=>1000000,project(){throw Error('must not project invalid samples');}}),/invalid indexed source sample/);
});
