/** Read-only source inc-info.cgi: no ledger mutation, account or guild authority. */
import {createHash} from 'node:crypto';
import {parseDsl} from './parse-dsl.mjs';
import {loadStandardStreetModel} from './standard-street-model.mjs';
import {reviewOriginalPeriodShopLedger} from './original-period-shop-ledger.mjs';
import {validateSourceSparseMarket} from './original-admin-world-bootstrap.mjs';
const pins={readSource:'e7a8add7b0291901e71fe797783b664dff1568a0',balanceViewSource:'718143b91788fdc0551dcb974c2ae4a8a47f06e2',infoViewSource:'d365aa83da571ce3029589f4c547d0940310e6f3',detailSource:'9a83d26fb29edee4032958f1e6de837a250f3384',customSource:'93d7f77df648df0c46e5dca4763afd3d2c48654b',itemDsl:'7a18185e98b32aee82ca1ce30d6f3c395157dbcb',configSource:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0',compilerSource:'1da8cce1e76ad6159325a37faec68efaa82c7f69',periodSource:'6183e88e9dd69a16606a1064c8084e9a1411dbd5'};
const reviews=new WeakSet();
const fail=m=>{throw new RangeError('R4 balance view: '+m)};
const safe=n=>Number.isSafeInteger(n)&&n>=0;
export function reviewOriginalBalanceView(sources){
 for(const [k,sha] of Object.entries(pins)){
  const s=sources[k];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
 }
 // Reuse the source-reviewed ledger's 8 indexed fixed shelf charges.
 const ledger=reviewOriginalPeriodShopLedger({...sources,model:loadStandardStreetModel(sources.itemDsl,sources.rebelDsl),includeReviewedMultiShelf:true});
 const d=parseDsl(sources.itemDsl,'custom/inc-item-data.cgi').blocks.find(b=>b.kind==='DEFINE');
 const jobs=Object.fromEntries(d.fields.job.map(r=>r.value.trim().split(/\s+/)));
 if(Object.keys(jobs).length!==8)fail('frozen job definitions');
 const names=[...sources.configSource.match(/@DIGNITY=\([\s\S]*?\);/)?.[0].matchAll(/"([^"]+)"/g)??[]].map(x=>x[1]);
 const points=sources.configSource.match(/@DIG_POINT=\([^\n]*\n\s*([\d,]+)\s*\);/)?.[1].split(',').map(Number);
 if(names.length!==7||points?.length!==7||points.some((v,i)=>!safe(v)||i&&v<=points[i-1])||points[0]!==0)fail('frozen dignity arrays');
 const review=Object.freeze({shelfCosts:ledger.showcaseMaintenanceCosts,jobs:Object.freeze(jobs),names:Object.freeze(names),points:Object.freeze(points)});
 reviews.add(review);return review;
}
export function formatOriginalBalanceDuration(seconds){
 if(!safe(seconds))fail('source elapsed time');
 const s=seconds%60,m=Math.trunc((seconds%3600)/60),h=Math.trunc(seconds/3600);
 if(seconds<60)return String(s).padStart(2,'0')+'秒';
 if(seconds<3600)return m+'分';
 if(h<72)return h+'小時'+(m?String(m).padStart(2,'0')+'分':'');
 return Math.trunc(h/24)+'日';
}
export function describeOriginalBalance({reviewed,world}){
 if(!reviews.has(reviewed)||world?.shops?.length!==1||!validateSourceSparseMarket(world.market))fail('independent original balance input');
 const s=world.shops[0],dignity=s.dignity??0,rankingCount=s.rankingcount??0,taxMode=s.taxmode??0;
 const accruedMaintenance=Math.trunc(s.costtoday),shelfMaintenance=reviewed.shelfCosts[s.showcasecount-1];
 const previousMaintenance=s.costyesterday??0,previousTax=s.taxyesterday??0,exp=Object.values(s.exp??{});
 if(![world.nowSeconds,s.foundation,dignity,rankingCount,accruedMaintenance,shelfMaintenance,previousMaintenance,previousTax,...exp].every(safe)||world.nowSeconds<s.foundation||!Number.isFinite(s.costtoday)||s.costtoday<0||![0,1,2].includes(taxMode))fail('source balance fields');
 const job=s.job??'';
 if(job&&!Object.hasOwn(reviewed.jobs,job))fail('source job');
 // Independent play.cgi taxRate is sourced from the pinned bootstrap and
 // remains zero in this runtime; external city tax ownership is not inferred.
 const sourceTax=Number(world.market.originalBootstrapMeta.split(',')[3]);
 if(sourceTax!==0)fail('unreviewed independent base tax');
 const baseTaxRate=Object.hasOwn(world.period.eventState,'rebel')||taxMode===1?0:taxMode===2?sourceTax*2:sourceTax;
 let level=0;
 for(let i=1;i<reviewed.points.length;i++){if(dignity<reviewed.points[i])break;level=i;}
 return {source:'r4-frozen-inc-info-independent.v1',foundedSeconds:world.nowSeconds-s.foundation,foundedLabel:formatOriginalBalanceDuration(world.nowSeconds-s.foundation),
  accruedMaintenance,shelfMaintenance,previousMaintenance,previousTax,baseTaxRate,taxModeLabel:['','（免稅）','（倍稅）'][taxMode],
  totalExperiencePercent:Math.trunc(exp.reduce((a,b)=>a+b,0)/10),jobName:job?reviewed.jobs[job]:'自由業',dignityName:reviewed.names[level],dignity,rankingCount};
}
