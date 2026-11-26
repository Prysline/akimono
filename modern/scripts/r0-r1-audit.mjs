import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseDsl,validateStandardStreet} from '../src/parse-dsl.mjs';
import {reviewOriginalCompiledEventCatalog} from '../src/original-event-compiled-catalog.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const read=p=>readFile(resolve(root,p));
const sha=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const ok=(v,m)=>{if(!v)throw Error(m);};
async function walk(p){const result=[];for(const e of await readdir(resolve(root,p),{withFileTypes:true})){const k=p+'/'+e.name;if(e.isDirectory())result.push(...await walk(k));else if(e.isFile())result.push(k);}return result;}
const testPath=p=>/^modern\/tests\/.*\.test\.mjs$|^modern\/tests\/original-perl\/.*\.t$/.test(p);
export async function loadAudit(){return JSON.parse(await read('modern/docs/r0-r1-baseline-manifest.json'));}
export async function checkAudit(m){
 const actual=(await walk('modern/tests')).filter(testPath).sort(),indexed=m.tests.map(x=>x.path).sort();
 ok(new Set(indexed).size===indexed.length,'duplicate test path');
 ok(JSON.stringify(actual)===JSON.stringify(indexed),'missing or stale test classification');
 const baseline=new Map(m.allBaselineBlobs.map(x=>[x.path,x.sha]));
 for(const x of m.frozen){ok(baseline.get(x.path)===x.sha,'frozen manifest baseline mismatch '+x.path);ok(sha(await read(x.path))===x.sha,'source blob drift '+x.path);}
 for(const x of m.tests){
   ok(['有效','歷史','待補','重複','阻塞'].includes(x.status)&&x.originalSource&&x.assertions&&x.executionPath&&x.risk&&x.disposition&&x.reason&&x.evidenceLevel,'incomplete row '+x.path);
   if(x.sha!==null){ok(baseline.get(x.path)===x.sha,'test baseline mismatch '+x.path);ok(sha(await read(x.path))===x.sha,'test blob drift; re-review '+x.path);}
   else ok(x.path==='modern/tests/r0-r1-baseline-audit.test.mjs','unpinned test '+x.path);
   if(x.status==='有效')ok(x.reviewed&&x.evidenceLevel!=='未完成語義審閱','unsupported effective classification '+x.path);
   if(x.realPlayer){
     ok(x.reviewed&&x.evidenceLevel==='HTTP/CAS'&&x.status==='有效','fixture mislabeled real player '+x.path);
     const text=String(await read(x.path));
     ok(/genuinePlayer\(/.test(text)&&/now:\s*null/.test(text)&&!/legacy-/.test(text),'real player evidence not explicit '+x.path);
   }
   for(const ref of x.documentReferences)ok(baseline.has(ref.path),'unknown document '+ref.path);
 }
 const itemDsl=String(await read('custom/inc-item-data.cgi')),rebelDsl=String(await read('custom/inc-rebel-data.cgi'));
 const parsed=[parseDsl(itemDsl,'custom/inc-item-data.cgi'),parseDsl(rebelDsl,'custom/inc-rebel-data.cgi')];
 ok(validateStandardStreet(parsed).ok,'DSL structural audit failed');
 const expected=[];
 for(const p of parsed){let id=null,use=0;for(const b of p.blocks){
  if(b.kind==='ITEM'){id=b.fields.no[0].value;use=0;expected.push(['ITEM',id,b.file,b.startLine]);}
  if(b.kind==='USE')expected.push(['USE',id+'/'+use++,b.file,b.startLine]);
  if(b.kind==='EVENT')expected.push(['EVENT',b.fields.code[0].value,b.file,b.startLine]);
 }}
 ok(JSON.stringify(expected)===JSON.stringify(m.features.map(x=>[x.kind,x.id,x.path,x.line])),'feature declaration mismatch');
 const catalog=reviewOriginalCompiledEventCatalog({itemDsl,rebelDsl,compilerSource:String(await read('modern/tests/original-perl/inc-makeitem.cgi')),turnSource:String(await read('modern/tests/original-perl/inc-turn.cgi'))});
 for(const x of m.features){
  ok(x.declared===true&&baseline.get(x.path)===x.sha,'feature source pin mismatch '+x.id);
  for(const e of x.evidence)ok(baseline.has(e)&&m.tests.some(t=>t.path===e),'missing feature evidence '+e);
  if(x.status.startsWith('受控正式驗收'))ok(x.evidence.length>0&&m.tests.some(t=>x.evidence.includes(t.path)&&t.realPlayer),'completed without player evidence '+x.id);
  if(x.http===true||x.v2Restart===true)ok(m.tests.some(t=>x.evidence.includes(t.path)&&t.realPlayer),'HTTP/v2 claim without actual player evidence '+x.id);
  if(x.kind==='EVENT')ok(catalog.declared.find(e=>e.code===x.id)?.compiled===x.compiled,'event compiled status mismatch '+x.id);
 }
 return {tests:actual.length,features:expected.length,frozen:m.frozen.length};
}
