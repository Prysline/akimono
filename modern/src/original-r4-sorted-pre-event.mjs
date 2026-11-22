/**
 * R4-B: source-reviewed SortDT before all 59 PLUS. No period/EVENT commit.
 */
import {projectR3PreEventTurn} from './original-b41-playable-sale.mjs';
import {PERIOD_WORLD_SCHEMA} from './game-core-contract.mjs';
import {reviewOriginalSoloSort,B47_SOLO_RANK_SOURCE}
  from './original-period-solo-sort.mjs';

export const R4_SORTED_PRE_EVENT_SOURCE='r4-original-single-shop-SortDT-before-PLUS';
const fail=x=>{throw new RangeError('R4 SortDT pre-EVENT: '+x);};
export function reviewR4SortedPreEvent({turnSource,detailSource,readSource}){
  const order=[
    'foreach(@DT){delete $_->{_sale_count_}}',
    'SortDT();',
    "RequireFile('inc-period.cgi') if $dateupdate && scalar(@DT);",
    'foreach my $cnt (1..$MAX_ITEM)',
    'CheckWholeStore();',
    'foreach my $key (keys(%DTevent))',
    'foreach my $key (keys(%EVENT))',
  ];
  let pos=-1;
  for(const needle of order){
    pos=typeof turnSource==='string'?turnSource.indexOf(needle,pos+1):-1;
    if(pos<0)fail('source phase order drift '+needle);
  }
  return Object.freeze({source:R4_SORTED_PRE_EVENT_SOURCE,
    sort:reviewOriginalSoloSort({detailSource,readSource}),
    scope:'single active shop SortDT after ITEM callbacks, before PLUS; no settlement/EVENT',
    committable:false});
}
export function projectR4SortedPreEventTurn({reviewedR4,...args}){
  if(reviewedR4?.source!==R4_SORTED_PRE_EVENT_SOURCE||
     reviewedR4.committable!==false||reviewedR4.sort?.source!==B47_SOLO_RANK_SOURCE)
    fail('source-reviewed original SortDT required');
  if(args.world?.schema!==PERIOD_WORLD_SCHEMA||
     args.world?.period?.eventState===null)
    fail('known original EVENT state and source period world required');
  const result=projectR3PreEventTurn({...args,r4ReviewedSort:reviewedR4.sort});
  if(result.shops?.length!==1||!Number.isSafeInteger(result.shops[0].point)||
     result.receipt?.originalSortApplied!==true||Object.hasOwn(result,'period'))
    fail('incomplete sort projection cannot claim EVENT or period');
  return {...result,receipt:{
    ...result.receipt,action:'r4-sorted-pre-event',
    r4SortSource:reviewedR4.source,r4Committable:false,
    sourceScope:reviewedR4.scope}};
}
