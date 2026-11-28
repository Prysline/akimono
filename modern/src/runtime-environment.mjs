/** Native execution environment diagnostics only. No game rule, draw,
 * replay, checkpoint bypass or player-controlled executable selection.
 */
import {execFileSync} from 'node:child_process';

const TIMEOUT=3000;
function cleanPerlEnv(){
  const env={...process.env};
  for(const k of Object.keys(env))if(/^PERL/i.test(k))delete env[k];
  return env;
}
function problem(code,detail,cause){
  const error=new Error(code+': '+detail+
    '\nWindows: 安裝 Strawberry Perl，重新開啟 PowerShell，執行 Get-Command perl -All、perl -v。'+
    '\nLinux: 安裝發行版的完整 perl 套件，執行 command -v perl、perl -v。'+
    '\n在 modern/ 執行 npm run check:env。請保留原存檔、checkpoint key 與歷史；不要跳過驗證。'+
    '\n詳見 modern/docs/runtime-environment-audit.md。',{cause});
  error.code=code;return error;
}
function runPerl(args,{env=cleanPerlEnv(),input,phase}){
  try{
    return execFileSync('perl',args,{env,input,encoding:'utf8',timeout:TIMEOUT,
      maxBuffer:16384,stdio:[input===undefined?'ignore':'pipe','pipe','pipe']});
  }catch(cause){
    const reason=cause.code==='ENOENT'?'PATH 找不到可執行的 perl':
      cause.code==='EACCES'||cause.code==='EPERM'?'perl 無執行權限或被系統攔截':
      cause.code==='ETIMEDOUT'?'原生 Perl 超過 3 秒未回應':
      cause.code==='ENOBUFS'?'原生 Perl 輸出超出安全上限':
      '原生 Perl 子程序執行失敗（'+String(cause.code??cause.status??cause.signal??'unknown')+'）';
    throw problem('AKIMONO_PERL_UNAVAILABLE',
      'native Perl interpreter unavailable: '+phase+'；'+reason,cause);
  }
}
// Preserve the existing checkpoint interpreter wire exactly: $^V/archname.
export function readNativePerlInterpreter(){
  const interpreter=runPerl(['-MConfig','-e','print "$^V/$Config{archname}"'],{phase:'Config 指紋'});
  if(interpreter.length>120||!/^v\d+\.\d+\.\d+\/[^\r\n/]+$/.test(interpreter))
    throw problem('AKIMONO_PERL_FINGERPRINT','invalid interpreter fingerprint: Perl Config 回傳格式不符');
  return interpreter;
}
const hashProgram=[
  'use strict;use warnings;use JSON::PP;use Config;',
  'local $/;my $in=decode_json(<STDIN>);my %h;',
  'for my $k (@{$in->{keys}}){$h{$k}=1;}',
  'my @before=keys(%h);delete $h{$in->{remove}};$h{$in->{add}}=2;',
  'print encode_json({interpreter=>"$^V/$Config{archname}",before=>[@before],after=>[keys(%h)]});',
].join('\n');
function checkHash(interpreter){
  const keys=Array.from({length:17},(_,i)=>'event'+i);
  const remove=keys[5],add='new-event';
  const input=JSON.stringify({keys,remove,add});
  const env={...cleanPerlEnv(),PERL_HASH_SEED:'0x0123456789abcdef0123456789abcdef',PERL_PERTURB_KEYS:'0'};
  const probe=()=>{
    const wire=runPerl(['-e',hashProgram],{env,input,phase:'JSON::PP / native hash'});
    try{return JSON.parse(wire)}catch(cause){
      throw problem('AKIMONO_PERL_HASH','JSON::PP 或原生 hash 回傳非有效 JSON',cause);
    }
  };
  const a=probe(),b=probe();
  const permutation=(actual,expected)=>Array.isArray(actual)&&actual.length===expected.length&&
    new Set(actual).size===expected.length&&actual.every(k=>expected.includes(k));
  if(a?.interpreter!==interpreter||b?.interpreter!==interpreter||
     !permutation(a.before,keys)||!permutation(a.after,[...keys.filter(k=>k!==remove),add])||
     JSON.stringify(a.before)!==JSON.stringify(b.before)||JSON.stringify(a.after)!==JSON.stringify(b.after))
    throw problem('AKIMONO_PERL_HASH','固定 seed／PERL_PERTURB_KEYS=0 的 native hash 不可重現，或直譯器身分不一致');
}
// This is a smoke test, not a proof of cross-build hash equivalence.
export function checkRuntimeEnvironment({oracle=false}={}){
  if(Number(process.versions.node.split('.')[0])<22)
    throw new Error('AKIMONO_NODE_VERSION: 需要 Node.js 22 以上；目前 '+process.version);
  const interpreter=readNativePerlInterpreter();
  checkHash(interpreter);
  if(oracle){
    runPerl(['-MTest::More','-MTest::Harness','-MDigest::SHA','-MFile::Temp','-MStorable','-e','print "ok"'],
      {phase:'Oracle 常用核心模組'});
  }
  return Object.freeze({node:process.version,platform:process.platform,arch:process.arch,
    interpreter,nativeHashSmoke:'passed',oracleModules:oracle?'common-core-checked':'not-requested'});
}
