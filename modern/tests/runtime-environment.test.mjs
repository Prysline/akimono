import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,rm,lstat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkRuntimeEnvironment,readNativePerlInterpreter} from '../src/runtime-environment.mjs';
import {fingerprintReviewedCheckpointRuntime} from '../src/reviewed-history-checkpoint-store.mjs';

const modern=fileURLToPath(new URL('../',import.meta.url));
test('runtime environment checks real Perl Config and fixed-seed hash, preserves checkpoint interpreter wire',()=>{
  const env={...process.env};
  for(const k of Object.keys(env))if(/^PERL/i.test(k))delete env[k];
  const native=execFileSync('perl',['-MConfig','-e','print "$^V/$Config{archname}"'],{env,encoding:'utf8',timeout:3000});
  const report=checkRuntimeEnvironment({oracle:true});
  assert.equal(report.interpreter,native);
  assert.equal(readNativePerlInterpreter(),native);
  assert.equal(report.nativeHashSmoke,'passed');
  assert.equal(report.oracleModules,'common-core-checked');
  const fingerprint=fingerprintReviewedCheckpointRuntime({sources:['controlled source'],sourceDirectory:join(modern,'src'),entrypoint:join(modern,'scripts','dev-local.mjs')});
  assert.equal(fingerprint.interpreter,native);
  assert.match(fingerprint.sourceFingerprint,/^[0-9a-f]{64}$/);
});
test('missing native Perl gives actionable error before server creates save directory',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'akimono-env-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const missing=join(directory,'missing-path'),save=join(directory,'new-save');
  const env={...process.env};
  for(const k of Object.keys(env))if(/^path$/i.test(k)||/^AKIMONO_/i.test(k))delete env[k];
  Object.assign(env,{PATH:missing,AKIMONO_SAVE_DIR:save,AKIMONO_PORT:'0'});
  for(const script of ['check-env.mjs','dev-local.mjs']){
    assert.throws(()=>execFileSync(process.execPath,[join(modern,'scripts',script)],{
      env,cwd:directory,encoding:'utf8',timeout:10000,stdio:['ignore','pipe','pipe'],
    }),error=>{
      assert.notEqual(error.status,0);
      const message=String(error.stderr);
      assert.match(message,/AKIMONO_PERL_UNAVAILABLE/);
      assert.match(message,/Strawberry Perl/);
      assert.match(message,/npm run check:env/);
      return true;
    });
    await assert.rejects(lstat(save),{code:'ENOENT'});
  }
});
