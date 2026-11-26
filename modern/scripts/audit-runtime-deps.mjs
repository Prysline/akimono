/** Read-only dependency inventory. No Perl invocation; independent of runtime
 * startup. Lexical evidence, not a proof of dynamic reachability.
 */
import {readdirSync,readFileSync} from 'node:fs';
import {join,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
function walk(dir){
  return readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    const p=join(dir,e.name);return e.isDirectory()?walk(p):e.isFile()?[p]:[];
  }).sort();
}
const rel=p=>relative(root,p).split(sep).join('/');
const direct=/\b(?:execFile|spawn|fork|exec)(?:Sync)?\s*\(\s*['"]perl(?:\.exe)?['"]/;
const perlMarker=/['"\x60]perl(?:\.exe)?['"\x60]|PERL_HASH_SEED|PERL_PERTURB_KEYS/;
const httpMarker=/dev-local\.mjs|genuinePlayer|genuine-v2-player/;
const nativeModules=new Set(['src/runtime-environment.mjs','src/reviewed-history-checkpoint-store.mjs','src/original-r4-perl-hash-replay.mjs','src/original-r4-use-exp-hash-replay.mjs']);
const pendingModules=new Set(['src/original-r4-close-archive-hash.mjs','src/original-r4-close-shop-effects.mjs']);
const pendingManualModules=new Set(['src/original-r4-manual-commerce-events.mjs']);
const paths=['src','scripts','tests'].flatMap(dir=>walk(join(root,dir)));
const js=paths.filter(p=>/\.(mjs|js|cjs)$/.test(p));
const hits=[];
for(const p of js){
  const name=rel(p);
  if(name==='scripts/audit-runtime-deps.mjs')continue; // this scanner's regexes
  const lines=readFileSync(p,'utf8').split(/\r?\n/);
  const callLines=[],markerLines=[],httpLines=[],processLines=[],environmentLines=[];
  lines.forEach((line,i)=>{
    if(direct.test(line))callLines.push(i+1);
    if(perlMarker.test(line))markerLines.push(i+1);
    if(httpMarker.test(line))httpLines.push(i+1);
    if(/node:child_process|(?:\bexecFile|\bspawn|\bfork)(?:Sync)?\s*\(/.test(line))processLines.push(i+1);
    if(/checkRuntimeEnvironment|readNativePerlInterpreter|fingerprintReviewedCheckpointRuntime|resolveR4(?:Command)?HashOrders|resolveR4CloseArchiveHashOrders|resolveR4UseExpOrder|orderManualCommerceActivation/.test(line))environmentLines.push(i+1);
  });
  if(!callLines.length&&!markerLines.length&&!httpLines.length&&!processLines.length&&!environmentLines.length)continue;
  const category=nativeModules.has(name)?'runtime-native-or-fingerprint':
    pendingModules.has(name)?'candidate-close-native-not-live':
    pendingManualModules.has(name)?'candidate-manual-activation-native-not-live':
    name==='scripts/dev-local.mjs'?'runtime-entry':
    name==='scripts/check-env.mjs'?'environment-diagnostic':
    name.startsWith('scripts/demo-')?'demo-review':
    name.startsWith('tests/')?'test-or-support-review':'review-needed';
  hits.push({path:name,category,callLines,markerLines,httpLines,processLines,environmentLines});
}
const perlFiles=paths.filter(p=>/\.(t|pl|pm)$/.test(p)).map(rel);
const moduleMentions=new Set();
for(const p of paths.filter(p=>/\.(t|pl|pm)$/.test(p))){
  const source=readFileSync(p,'utf8');
  for(const m of source.matchAll(/^\s*(?:use|require)\s+([A-Za-z_]\w*(?:::\w+)*)(?:\s|;)/gm))
    moduleMentions.add(m[1]);
}
console.log(JSON.stringify({
  scope:'modern/src, scripts, tests; lexical markers, review reachability separately; no Perl run',
  jsScanned:js.length,perlFiles,perlModuleMentions:[...moduleMentions].sort(),hits,
},null,2));
