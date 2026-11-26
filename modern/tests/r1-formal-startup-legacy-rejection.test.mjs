import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

// Negative-only regression: the historical test helpers may keep their
// fixtures, but the sole player entry point must not enable them.
const cwd=fileURLToPath(new URL('../',import.meta.url));
for(const [name,value] of [
  ['AKIMONO_E2E_DETERMINISTIC_RNG','1'],
  ['AKIMONO_R2_TARGET_AD_MEMORY_ONLY','1'],
  ['AKIMONO_REVIEWED_NORMAL_TIME','0'],
]){
  test('R1 formal startup rejects historical opt-in '+name+' before saving',async t=>{
    const directory=await mkdtemp(join(tmpdir(),'akimono-r1-reject-'));
    t.after(()=>rm(directory,{recursive:true,force:true}));
    const env={...process.env,AKIMONO_PORT:'0',AKIMONO_SAVE_DIR:directory};
    for(const key of ['AKIMONO_E2E_FIXED_NOW','AKIMONO_E2E_DETERMINISTIC_RNG',
      'AKIMONO_R2_TARGET_AD_MEMORY_ONLY','AKIMONO_REVIEWED_NORMAL_TIME',
      'AKIMONO_REVIEWED_CROSS_PERIOD'])delete env[key];
    env[name]=value;
    const result=spawnSync(process.execPath,['scripts/dev-local.mjs'],{
      cwd,env,encoding:'utf8',timeout:15000,
    });
    assert.ifError(result.error);
    assert.equal(result.signal,null);
    assert.equal(result.status,1);
    assert.match(result.stderr,/唯一新版玩家存檔不支援舊模式、fixture RNG 或多店稽核/);
    assert.doesNotMatch(result.stdout,/http:\/\/127\.0\.0\.1:\d+/);
    assert.deepEqual(await readdir(directory),[]);
  });
}
