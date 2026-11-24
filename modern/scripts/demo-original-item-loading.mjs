import {projectOriginalVirtualItemLoadSequence}
  from '../src/original-item-dynamic-loading-model.mjs';

const isolatedWork=projectOriginalVirtualItemLoadSequence({
  sequence:['book-work'],
});
const isolatedShowcase=projectOriginalVirtualItemLoadSequence({
  sequence:['edit-showcase'],
});
const mixed=projectOriginalVirtualItemLoadSequence({
  sequence:['edit-showcase','book-work','edit-showcase'],
});
const result={
  source:'original Core item.cgi / item-m.cgi / item-s.cgi + inc-item.cgi / inc-makeitem.cgi',
  requestScopedExamples:{
    work:isolatedWork.steps[0],
    showcase:isolatedShowcase.steps[0],
  },
  deliberatelyMixedSameInterpreter:{
    sequence:mixed.steps.map(x=>x.requestedCode),
    requireCacheHits:mixed.steps.map(x=>x.requireCacheHit),
    activeCallbackOwners:mixed.steps.map(x=>x.activeFunctionOwner),
    lastSyntheticUseOwners:mixed.steps.at(-1).useOwners,
    distinctInMemoryFileLoads:mixed.loadedPaths,
  },
  warning:'The multi-item scenario is a deliberately synthetic same-interpreter demonstration. Original entrypoints each select one per-item file per CGI request; this is NOT proof of live cross-request collisions. No real CGI, compiler, disk writes, or world mutations.',
};
console.log(JSON.stringify(result,null,2));
