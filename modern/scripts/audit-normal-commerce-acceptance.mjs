/**
 * Per-declaration acceptance ledger, separate from static registry audit.
 * A scenario contract is NOT a pass. An optional GitHub job log must be
 * paired with its externally verified PR25 run/head/job metadata and
 * checked against actual local Git objects. No acceptance on a stale tree.
 * Run: node modern/scripts/audit-normal-commerce-acceptance.mjs
 * Optional: ... --ci-log job.log --run-meta verified-run.json
 */
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {auditNormalCommerce} from './audit-normal-commerce.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const base='ddd2f441ed5b36b8dcb94deaa193764eab7f2d21';
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const sha=s=>typeof s==='string'&&/^[a-f0-9]{40}$/.test(s);
const title={
  extra:'R4 genuine #65 zero-POP listing and #62 self advertisement survive source time, EXP and v2 reload',
  leather:'R4 genuine leather equipment package #71 manufacture, natural sale, two generations',
  wood:'R4 genuine #72 wooden equipment package uses all four crafted components, sells and survives two v2 generations',
  iron:'R4 genuine #73 iron equipment package from two source skills and four books, actual sale and dual v2 restart',
  steel:'R4 genuine #74 steel equipment package from four trained production books, natural sale and dual v2 restart',
  advanced:'R4 genuine #75 and #76 advanced package progression, lostbook, natural sales and four v2 generations',
  point:'R4 genuine 20000 points from four-type natural commerce, #65 self-theft and rumor, two v2 generations',
  self:'R4 genuine local #62/1 self-target consumes advertisement, rejects other target, persists result',
  guild:'R4 real player obtains #62 and executes original no-guild advertisement result, persists consumption and denies stale reuse',
  party:'R4 genuine rank prizes produce #77 party goods, actual popup and natural sale with two v2 generations',
  resize:'R4 full commerce player expands, lists mixed/repeated items, sells, settles and obtains the resize tool again via real HTTP',
  expiry:'R4 genuine absent owner closes at source settlement, archives once, reloads and crosses an empty street boundary',
  funcbuy:'R4 genuine wholesale #64 FUNCBUY grants #79 from actual payment, logs once and survives two v2 generations',
  funcinit:'R4 genuine #24 appraiser and peddle FUNCINIT transport, actual market payment and dual v2 reload',
  compiler:'R4 full commerce ITEM compiler matches frozen Perl PRICE/POP/POINT/COST/TYPE/FLAG for all 79',
  compilerAudit:'normal commerce audit enumerates original compiler, 79 ITEM, 116 USE, 25 EVENT without granting player authority',
};
const kill=code=>'R4 genuine #65/2 '+code+', negative natural sales, exact expiry and two v2 generations';
const shelf=n=>'R4 genuine '+n+'-shelf construction, sale/tax, maintenance, shrink, tool reacquisition and regrowth across four v2 generations';
const groups=[
  {tests:[title.funcbuy],acquire:[64,79]},
  {tests:[title.funcinit],acquire:[24,78],uses:['37:1','37:2','78:12']},
  {tests:[title.leather],acquire:[45,51,71],showcase:[71],sale:[71],uses:['16:0','16:1','39:12']},
  {tests:[title.wood],acquire:[40,46,52,57,72],showcase:[72],sale:[72],uses:['17:0','17:1','17:2','17:3','39:13','79:1']},
  {tests:[title.iron],acquire:[18,19,41,47,53,58,73],showcase:[73],sale:[73],uses:['37:0','37:1','20:0','21:0','22:0','23:0','39:14','79:0','79:3']},
  {tests:[title.steel],acquire:[42,48,54,59,74],showcase:[74],sale:[74],uses:['20:0','21:0','22:0','23:0','20:1','21:1','22:1','23:1','39:15','78:4','78:5','78:6','78:7']},
  {tests:[title.advanced],acquire:[43,44,49,50,55,56,60,61,75,76],showcase:[75,76],sale:[75,76],uses:['20:2','20:3','21:2','21:3','22:2','22:3','23:2','23:3','39:16','39:17']},
  {tests:[title.extra],acquire:[62,65],showcase:[65],uses:['62:0']},
  {tests:[title.self],acquire:[62],uses:['62:1']},
  {tests:[title.guild],acquire:[62],uses:['62:2']},
  {tests:[title.party],acquire:[27,28,29,77],showcase:[77],sale:[77],uses:['39:18','77:0','13:0']},
  {tests:[title.point],acquire:[40,45,51,57,65],showcase:[40,45,51,57],uses:['65:0','65:1','16:0','16:1','17:0','17:1','63:3']},
  {tests:[title.resize],acquire:[10,30,63],showcase:[10,30],sale:[10,30],uses:['63:2','63:0']},
  ...Array.from({length:8},(_,i)=>({tests:[shelf(i+1)],uses:['63:'+i,'63:0']})),
  ...[['kill-ken',41,20],['kill-yoroi',53,22],['kill-tate',47,21],['kill-tue',58,23]].map(([code,id,book])=>({
    tests:[kill(code)],acquire:[id,65],showcase:[id],sale:[id],uses:[book+':0','65:2'],events:[code],
  })),
];
function matching(key,value){return [...new Set(groups.filter(g=>g[key]?.includes(value)).flatMap(g=>g.tests))]}
export function parseAcceptanceTap(log){
  if(typeof log!=='string')throw new Error('CI text log required');
  const lines=log.split(/\r?\n/).map(l=>l.replace(/^\d{4}-\d\d-\d\dT\S+Z /,''));
  const rows=new Map(),totals={},observed={pass:0,fail:0,skipped:0,todo:0};
  let count=0,plan=null,ended=-1,valid=true;
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    const total=line.match(/^# (tests|pass|fail|skipped|cancelled|todo) (\d+)$/);
    if(total){
      if(Object.hasOwn(totals,total[1]))valid=false;
      totals[total[1]]=Number(total[2]);
      if(total[1]==='todo'){ended=i;break;}
      continue;
    }
    const p=line.match(/^1\.\.(\d+)$/);
    if(p){if(plan!==null)valid=false;plan=Number(p[1]);continue;}
    const m=line.match(/^(not ok|ok) (\d+) - (.+)$/);
    if(!m)continue;
    count++;
    if(Number(m[2])!==count||plan!==null||Object.keys(totals).length)valid=false;
    const name=m[3].replace(/\\#/g,'#').replace(/\s+# (?:SKIP|TODO).*$/i,'');
    const directive=m[3].match(/\s+# (SKIP|TODO)\b/i)?.[1].toLowerCase();
    const state=directive==='skip'?'skipped':directive==='todo'?'todo':m[1]==='ok'?'pass':'fail';
    observed[state]++;
    if(rows.has(name))rows.set(name,'ambiguous');else rows.set(name,state);
  }
  const complete=valid&&ended>=0&&count>0&&plan===count&&totals.tests===count&&
    totals.tests===totals.pass+totals.fail+totals.skipped+totals.cancelled+totals.todo&&
    totals.pass===observed.pass&&totals.skipped===observed.skipped&&totals.todo===observed.todo&&
    totals.fail+totals.cancelled===observed.fail;
  const checkout=lines.flatMap((l,i)=>l.includes('git log -1 --format=%H')&&sha(lines[i+1])?[lines[i+1]]:[]);
  // Parse Perl only after its actual prove invocation. Never count Node TAP
  // rows, demo text or isolated "Result: PASS" as the complete Perl suite.
  const tail=ended<0?[]:lines.slice(ended+1);
  const prove=tail.findIndex(l=>/^##\[group\]Run prove -v \*\.t$/.test(l));
  const perl=prove<0?[]:tail.slice(prove+1);
  const summaries=perl.filter(l=>/^Files=\d+, Tests=\d+,/.test(l));
  const summary=summaries.length===1?summaries[0].match(/^Files=(\d+), Tests=(\d+),/):null;
  const plans=perl.filter(l=>/^1\.\.\d+$/.test(l));
  const perlRows=perl.filter(l=>/^(?:not )?ok \d+\b/.test(l));
  const perlComplete=!!summary&&Number(summary[1])>0&&Number(summary[2])>0&&
    plans.length===Number(summary[1])&&plans.reduce((n,l)=>n+Number(l.slice(3)),0)===Number(summary[2])&&
    perlRows.length===Number(summary[2])&&perlRows.every(l=>/^ok /.test(l)&&!/\s+# (?:SKIP|TODO)\b/i.test(l))&&
    perl.filter(l=>l==='All tests successful.').length===1&&perl.filter(l=>l==='Result: PASS').length===1;
  const auditAt=tail.indexOf('> node scripts/audit.mjs');
  const demoAt=tail.indexOf('> node scripts/demo-state.mjs');
  let sourceAudit=false;
  if(auditAt>=0&&demoAt>auditAt){
    const block=tail.slice(auditAt+1,demoAt).join('\n');
    const start=block.indexOf('{'),end=block.lastIndexOf('}');
    try{
      const report=JSON.parse(block.slice(start,end+1));
      sourceAudit=report.ok===true&&report.hashes?.length===2&&report.hashes.every(h=>h.expected===h.actual&&h.verified===true)&&
        report.hashes.some(h=>h.name==='custom/inc-item-data.cgi'&&h.actual==='7a18185e98b32aee82ca1ce30d6f3c395157dbcb')&&
        report.hashes.some(h=>h.name==='custom/inc-rebel-data.cgi'&&h.actual==='923634e58a05beca9ab004515fc7669d53a1ba3a')&&
        report.actual?.items===79&&report.actual?.uses===116&&report.actual?.events===25&&report.actual?.functions===7&&report.issues?.length===0;
    }catch{}
  }
  const demo=demoAt>=0&&tail.includes('> node scripts/demo-original-nayuta-functurn.mjs');
  return {rows,totals,complete,checkout,perlComplete,sourceAudit,demo};
}
export function verifyAcceptanceRun({log,meta,head,gitRead=git}){
  // Metadata is retrieved outside this script from GitHub's actual run/job
  // API, not authored by the test harness. Reject stale or wrong checkout.
  if(!sha(head)||!meta||meta.head!==head||meta.base!==base||!sha(meta.checkout)||
     meta.pr!==25||!Number.isSafeInteger(meta.runId)||!Number.isSafeInteger(meta.jobId))
    throw new Error('exact current PR25 GitHub run metadata required');
  if(gitRead('rev-parse',head+'^{tree}')!==gitRead('rev-parse',meta.checkout+'^{tree}')||
     gitRead('show','-s','--format=%P',meta.checkout)!==base+' '+head)
    throw new Error('CI checkout is not the pinned base + exact current head tree');
  const tap=parseAcceptanceTap(log);
  if(tap.checkout.length!==1||tap.checkout[0]!==meta.checkout)throw new Error('job log checkout mismatch');
  const requiredSteps=['Checkout source','Set up Node','Verify existing Standard Street DSL source audit','Verify pinned original Core source blobs','Verify four additional SHA-pinned original Core item-loader source blobs','Verify pinned untouched original Core admin initializer','Verify B-38 untouched original Core detail tax source blob','Run isolated original Perl Core tests'];
  const allSteps=Array.isArray(meta.steps)&&meta.steps.every(s=>s.conclusion==='success')&&
    requiredSteps.every(name=>meta.steps.filter(s=>s.name===name).length===1);
  return {head,runId:meta.runId,jobId:meta.jobId,checkout:meta.checkout,tap,
    // Actual job metadata AND its log must agree. A failed/unfinished
    // job may expose per-test results but cannot pass the phase gate.
    independentRunGreen:meta.conclusion==='success'&&allSteps&&tap.complete&&
      tap.totals.fail===0&&tap.totals.skipped===0&&tap.totals.cancelled===0&&tap.totals.todo===0&&
      tap.perlComplete&&tap.sourceAudit&&tap.demo&&[...tap.rows.values()].every(state=>state!=='ambiguous')};
}
export function buildNormalCommerceAcceptance(audit,evidence=null){
  if(JSON.stringify(audit.counts)!==JSON.stringify({items:79,uses:116,events:25,functions:7}))
    throw new Error('exact frozen declaration counts required');
  const check=(tests,scope='genuine-http')=>({scope,tests,status:tests.length===0?'uncovered':
    evidence===null?'current-ci-unverified':!evidence.tap.complete?'not-proven':tests.every(t=>evidence.tap.rows.get(t)==='pass')?'passed':
      tests.some(t=>evidence.tap.rows.get(t)==='fail')?'failed':'not-proven',
    ...(evidence?{outcomes:tests.map(t=>({test:t,result:evidence.tap.rows.get(t)??'missing'}))}:{})});
  const items=audit.items.map(i=>({
    id:i.id,code:i.code,source:i.source,
    compiler:check([title.compiler],'source-only'),
    acquisition:check(matching('acquire',i.id)),
    ...(i.id===64?{wholesaleAcquisition:check([title.funcbuy]),note:'Rank-prize route is separate from the paid wholesale scenario.'}:{}),
    showcase:i.sourceNoShowcase?{scope:'source-forbidden',status:'not-applicable'}:check(matching('showcase',i.id)),
    naturalSale:i.sourceNoShowcase||!i.positivePop?{scope:'source-no-natural-sale',status:'not-applicable'}:check(matching('sale',i.id)),
    // Source routes and shape support are not player history or proof.
    sourceRoutes:i.fullCommerce.sourceRoutes,
    uses:i.uses.map(u=>({useId:u.useId,source:u.source,registered:u.fullCommerceRegistryRule,
      evidence:check(matching('uses',i.id+':'+u.useId)),
      ...(i.id===62&&u.useId===1||i.id===65&&u.useId<=2?{blockedScope:'other-shop target not independently accepted'}:{}),
      ...(i.id===62&&u.useId===2?{blockedScope:'positive guild member effect not accepted'}:{})})),
  }));
  const events=audit.events.map(e=>({code:e.code,source:e.source,activation:e.activation.kind,
    ...(e.activation.kind==='external-zero-start'?{evidence:{scope:'external guild/army',status:'blocked'}}:
      e.activation.kind==='disabled-no-reviewed-trigger'?{evidence:{scope:'disabled source declaration',status:'not-applicable'}}:
      {evidence:check(matching('events',e.code)),...(e.activation.kind==='natural-start'?{note:'Natural EVENT lifecycle/restart evidence must be mapped separately; compiler is not lifecycle.'}:{})})}));
  const functions=audit.globalCallbacks.map(f=>({kind:f.kind,source:f.source,
    evidence:f.kind==='FUNCSHOPIN'||f.kind==='FUNCSHOPOUT'?{scope:'cross-street migration',status:'blocked'}:
      f.kind==='FUNCUPDATE'?check([title.party,title.expiry]):
      f.kind==='FUNCITEM'?check([title.advanced,title.party]):
      f.kind==='FUNCNEW'?check([title.resize]):
      f.kind==='FUNCINIT'?{...check([title.funcinit]),sourceDifferential:check(['R4 #63 source repeated zero-price purchase and positive FUNCINIT transport match actual frozen buy-s handler'],'source-only')}:
      f.kind==='FUNCBUY'?{...check([title.funcbuy]),sourceDifferential:check(['R4 source-only FUNCBUY differential executes pinned Perl threshold, clipped payment, capacity and zero-log behavior'],'source-only'),
        negativeEvidence:check(['R2-B original global FUNCBUY: real ITEM #64 reaches 500000 voucher condition, missing effect rejects atomically'],'source-only')}:
      check([],'source-only')}));
  const gates={independentRunGreen:evidence?.independentRunGreen??false,
    ownerExpiry:check([title.expiry]),funcbuy:check([title.funcbuy]),funcinit:check([title.funcinit]),shelves:check(Array.from({length:8},(_,i)=>shelf(i+1))),
    manualEvents:check(['kill-ken','kill-yoroi','kill-tate','kill-tue'].map(kill))};
  // Do not equate a green run or registration count with phase completion.
  // This ledger intentionally has uncovered rows until separately tested.
  const gaps={
    acquisitions:items.filter(i=>i.acquisition.status!=='passed').map(i=>i.id),
    showcases:items.filter(i=>!['passed','not-applicable'].includes(i.showcase.status)).map(i=>i.id),
    naturalSales:items.filter(i=>!['passed','not-applicable'].includes(i.naturalSale.status)).map(i=>i.id),
    uses:items.flatMap(i=>i.uses.filter(u=>u.evidence.status!=='passed'||u.blockedScope).map(u=>[i.id,u.useId])),
    events:events.filter(e=>!['passed','not-applicable'].includes(e.evidence.status)).map(e=>e.code),
    functions:functions.filter(f=>f.evidence.status!=='passed'||f.evidence.scope!=='genuine-http').map(f=>f.kind),
  };
  return {scope:'Per-declaration evidence ledger; scenario contracts not execution. No inferred acquisition, sales or acceptance from static rules.',
    counts:audit.counts,run:evidence?{head:evidence.head,runId:evidence.runId,jobId:evidence.jobId,checkout:evidence.checkout,totals:evidence.tap.totals}:null,
    gates,phaseComplete:false,gaps,items,events,functions,
    limitations:['Independent live HTTP closure has no original CGI account/session store; cross-street migration, multi-shop and external guild/army effects are not credited.',
      'Genuine test contract mapping is conservative and incomplete for legacy routes. A listed scenario proves only the named operation, not every callback branch or item-specific restart.',
      'All four manual events have independent mandatory careers; no claim of sequential four-event career.']};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const args=process.argv.slice(2);
  let evidence=null;
  if(args.length){
    if(args.length!==4||args[0]!=='--ci-log'||args[2]!=='--run-meta')throw new Error('expected --ci-log job.log --run-meta verified-run.json');
    evidence=verifyAcceptanceRun({head:git('rev-parse','HEAD'),log:await readFile(args[1],'utf8'),meta:JSON.parse(await readFile(args[3],'utf8'))});
  }
  console.log(JSON.stringify(buildNormalCommerceAcceptance(await auditNormalCommerce(),evidence),null,2));
}
