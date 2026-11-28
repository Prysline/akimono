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
 const actual=(await walk('modern/tests')).filter(testPath).sort(),rows=[...m.tests,...m.addedTests],indexed=rows.map(x=>x.path).sort();
 ok(new Set(indexed).size===indexed.length,'duplicate test path');
 ok(JSON.stringify(actual)===JSON.stringify(indexed),'missing or stale test classification');
 const baseline=new Map(m.allBaselineBlobs.map(x=>[x.path,x.sha]));
 for(const x of m.frozen){ok(baseline.get(x.path)===x.sha,'frozen manifest baseline mismatch '+x.path);ok(sha(await read(x.path))===x.sha,'source blob drift '+x.path);}
 ok(m.tests.length===233&&m.addedTests.every(x=>x.sha===null),'baseline/addition separation');
 const counts=m.tests.reduce((a,x)=>(a[x.status]=(a[x.status]||0)+1,a),{});
 for(const key of ['有效','歷史','待補'])ok((counts[key]??0)===(m.testCounts.baseline[key]??0),'classification count mismatch '+key);
 ok(m.testCounts.added===m.addedTests.length,'added count mismatch');
 const candidateDocs=new Set(m.candidateEvidenceDocs??[]),docCache=new Map();
 ok(candidateDocs.size===(m.candidateEvidenceDocs??[]).length,'duplicate candidate evidence document');
 for(const p of candidateDocs){
   ok(/^modern\/docs\/[a-z0-9-]+\.md$/.test(p)&&!baseline.has(p),'invalid candidate evidence path '+p);
   docCache.set(p,String(await read(p)).split('\n'));
 }
 for(const x of rows){
   ok(['有效','歷史','待補','重複','阻塞'].includes(x.status)&&x.originalSource&&x.assertions&&x.executionPath&&x.risk&&x.disposition&&x.reason&&x.evidenceLevel,'incomplete row '+x.path);
   if(x.sha!==null){ok(baseline.get(x.path)===x.sha,'test baseline mismatch '+x.path);ok(sha(await read(x.path))===x.sha,'test blob drift; re-review '+x.path);}
   else ok(m.addedTests.includes(x)&&!baseline.has(x.path),'unpinned test '+x.path);
   if(x.status==='有效')ok(x.reviewed&&x.evidenceLevel!=='未完成語義審閱','unsupported effective classification '+x.path);
   if(x.realPlayer){
     ok(x.reviewed&&x.evidenceLevel==='HTTP/CAS'&&x.status==='有效','fixture mislabeled real player '+x.path);
     const text=String(await read(x.path));
     ok(/genuinePlayer\(/.test(text)&&/now:\s*null/.test(text)&&!/legacy-/.test(text),'real player evidence not explicit '+x.path);
   }
   for(const ref of x.documentReferences){
     ok(baseline.has(ref.path)||candidateDocs.has(ref.path),'unknown document '+ref.path);
     if(candidateDocs.has(ref.path)){
       const lines=docCache.get(ref.path);
       ok(Number.isSafeInteger(ref.line)&&ref.line>=1&&lines[ref.line-1]==='## '+x.path.split('/').at(-1),'candidate evidence anchor mismatch '+ref.path+':'+ref.line);
     }
   }
   for(const source of [...(x.originalSources??[]),...(x.executionSources??[])]){
     ok(baseline.get(source.path)===source.sha,'evidence source pin mismatch '+source.path);
   }
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
 const declarations=JSON.parse(await read('modern/docs/r1-source-declarations.json'));
 ok(declarations.length===m.features.length,'source declaration count');
 const sourceLines={'custom/inc-item-data.cgi':itemDsl.split('\n'),'custom/inc-rebel-data.cgi':rebelDsl.split('\n')};
 for(let i=0;i<declarations.length;i++){
  const d=declarations[i],f=m.features[i];
  ok(d.kind===f.kind&&d.id===f.id&&d.path===f.path&&d.sha===f.sha&&d.startLine===f.line&&d.endLine===f.declarationEndLine,'source declaration identity '+f.id);
  ok(JSON.stringify(d.rawLines)===JSON.stringify(sourceLines[d.path].slice(d.startLine-1,d.endLine)),'source declaration raw lines '+f.id);
 }
 const catalog=reviewOriginalCompiledEventCatalog({itemDsl,rebelDsl,compilerSource:String(await read('modern/tests/original-perl/inc-makeitem.cgi')),turnSource:String(await read('modern/tests/original-perl/inc-turn.cgi'))});
 const dimensions=['declaration','compiled','registry','perlOracle','nodeDifferential','lawfulAcquisition','prerequisites','formalCommand','http','ui','reviewedTime','rng','cas','v2Restart'];
 ok(JSON.stringify(m.evidenceLayerSchema?.dimensions)===JSON.stringify(dimensions),'14-layer schema mismatch');
 const featureTests=new Map(m.tests.map(t=>[t.path,t])),lineCache=new Map();
 async function pinRange(ref,label,requireTest=true,realPlayer=false){
   ok(ref&&baseline.get(ref.path)===ref.sha&&Number.isSafeInteger(ref.startLine)&&Number.isSafeInteger(ref.endLine)&&ref.startLine>=1&&ref.endLine>=ref.startLine,'invalid evidence range/pin '+label);
   if(requireTest){
     const t=featureTests.get(ref.path);
     ok(t?.status==='有效'&&t.reviewed&&t.sha===ref.sha,'unreviewed feature evidence '+label);
     if(realPlayer)ok(t.realPlayer,'HTTP/v2 layer requires real player '+label);
   }else ok(sha(await read(ref.path))===ref.sha,'evidence source drift '+label);
   if(!lineCache.has(ref.path))lineCache.set(ref.path,String(await read(ref.path)).split('\n').length);
   ok(ref.endLine<=lineCache.get(ref.path),'evidence range exceeds source '+label);
 }
 for(const x of m.features){
  ok(x.declared===true&&baseline.get(x.path)===x.sha,'feature source pin mismatch '+x.id);
  for(const e of x.evidence)ok(baseline.has(e)&&m.tests.some(t=>t.path===e),'missing feature evidence '+e);
  if(x.status.startsWith('受控正式驗收'))ok(x.evidence.length>0&&m.tests.some(t=>x.evidence.includes(t.path)&&t.realPlayer),'completed without player evidence '+x.id);
  if(x.http===true||x.v2Restart===true)ok(m.tests.some(t=>x.evidence.includes(t.path)&&t.realPlayer),'HTTP/v2 claim without actual player evidence '+x.id);
  if(x.kind==='EVENT')ok(catalog.declared.find(e=>e.code===x.id)?.compiled===x.compiled,'event compiled status mismatch '+x.id);
  const label=x.kind+' '+x.id,L=x.evidenceLayers;
  ok(L&&Object.keys(L).length===dimensions.length&&dimensions.every(k=>Object.hasOwn(L,k)),'incomplete 14-layer row '+label);
  const d=L.declaration;
  ok(d?.path===x.path&&d.sha===x.sha&&d.startLine===x.line&&d.endLine===x.declarationEndLine,'layer declaration identity '+label);
  for(const k of ['compiled','registry','perlOracle','nodeDifferential','lawfulAcquisition','http','reviewedTime','v2Restart']){
    const value=x[k==='registry'?'registered':k]??null;
    ok((L[k]?.value??null)===value,'layer flag mismatch '+label+' '+k);
  }
  for(const k of dimensions.slice(1)){
    const layer=L[k];if(layer===null)continue;
    ok(typeof layer.value==='boolean'&&typeof layer.scope==='string'&&layer.scope.length>0,'invalid layer value/scope '+label+' '+k);
    const requireReal=layer.value===true&&['http','v2Restart','formalCommand','cas'].includes(k);
    if(layer.refs!==undefined){
      ok(Array.isArray(layer.refs)&&layer.refs.length>0,'empty layer refs '+label+' '+k);
      for(const r of layer.refs){
        ok(x.evidence.includes(r.path),'unlinked layer ref '+label+' '+k);
        await pinRange(r,label+' '+k,true,requireReal);
      }
    }
    if(layer.tests!==undefined){
      ok(Array.isArray(layer.tests)&&layer.tests.length>0,'empty layer tests '+label+' '+k);
      for(const r of layer.tests)ok(x.evidence.includes(r.path)&&featureTests.get(r.path)?.sha===r.sha,'invalid layer test pin '+label+' '+k);
      if(requireReal)ok(layer.tests.some(r=>featureTests.get(r.path)?.realPlayer),'HTTP/v2 layer requires real player '+label+' '+k);
    }
    if(layer.source!==undefined)await pinRange(layer.source,label+' '+k,false);
    if(requireReal)ok((layer.refs??[]).some(r=>featureTests.get(r.path)?.realPlayer)||(layer.tests??[]).some(r=>featureTests.get(r.path)?.realPlayer),'HTTP/v2 layer requires real player '+label+' '+k);
    if(!['compiled','registry'].includes(k))ok(layer.refs||layer.tests||layer.source,'missing layer evidence '+label+' '+k);
  }
  for(const r of x.detailedEvidence??[]){
    ok(x.evidence.includes(r.path),'unlinked detailed ref '+label);
    await pinRange(r,label);
  }
 }
 return {tests:actual.length,features:expected.length,frozen:m.frozen.length};
}
