/** Frozen plug/page.cgi GetPage and GetPageControl range. */
export function sourcePage(count,pageRows,page=0){
 if(![count,pageRows,page].every(Number.isSafeInteger)||count<0)throw new RangeError('source page inputs');
 const size=Math.max(1,pageRows),pageMax=Math.max(0,Math.trunc((count-1)/size));
 page=Math.max(0,Math.min(pageMax,page));
 const start=page*size,end=Math.min(count-1,start+size-1);
 return {page,pageMax,start,end,pagePrev:page>0?page-1:-1,pageNext:(page+1)*size<count?page+1:0};
}
export function sourcePageNumbers(page,pageMax){
 if(!Number.isSafeInteger(page)||!Number.isSafeInteger(pageMax)||page<0||page>pageMax)throw new RangeError('source page range');
 const range=3;let start=Math.max(0,page-range),end=Math.min(pageMax,page+range);
 if(end-start<range*2){
  if(end===pageMax)start=end-range*2;
  start=Math.max(0,start);
  if(start===0)end=start+range*2;
  end=Math.min(pageMax,end);
 }
 return Array.from({length:end-start+1},(_,i)=>start+i);
}
/** Browser-safe literal ReadLog filters and frozen GetPage arithmetic.
 * Receives only already authorized local rows; not an authentication API. */
export function queryOriginalNews(source,{mode=0,keyword='',target='',page=0}={}){
 if(!Array.isArray(source?.rows)||![0,1,2,3].includes(mode)||typeof keyword!=='string'||typeof target!=='string'||!Number.isSafeInteger(page)||!Number.isSafeInteger(source.pageRows)||source.pageRows<1)throw new RangeError('source news query');
 // Perl false strings are empty and exactly '0'.
 const needle=keyword==='0'?'':keyword.toLowerCase();
 if(target==='0')target='';
 const found=source.rows.filter(row=>(!mode||row.mode===mode)&&(!needle||row.wire.toLowerCase().includes(needle))&&(!target||row.wire.includes(target)));
 // ReadLog returns one synthetic no-information display row when empty;
 // the view uses a placeholder instead of storing a fabricated log.
 const p=sourcePage(Math.max(1,found.length),source.pageRows,page);
 return {page:p.page,pageMax:p.pageMax,pagePrev:p.pagePrev,pageNext:p.pageNext,total:found.length,rows:found.slice(p.start,p.end+1)};
}
