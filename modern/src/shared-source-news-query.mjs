/** Browser-safe literal ReadLog filters and frozen GetPage arithmetic.
 * Receives only already authorized local rows; not an authentication API. */
export function queryOriginalNews(source,{mode=0,keyword='',target='',page=0}={}){
 if(!Array.isArray(source?.rows)||![0,1,2,3].includes(mode)||typeof keyword!=='string'||typeof target!=='string'||!Number.isSafeInteger(page)||!Number.isSafeInteger(source.pageRows)||source.pageRows<1)throw new RangeError('source news query');
 const needle=keyword.toLowerCase();
 const found=source.rows.filter(row=>(!mode||row.mode===mode)&&(!needle||row.wire.toLowerCase().includes(needle))&&(!target||row.wire.includes(target)));
 // ReadLog returns one synthetic no-information display row when empty;
 // the view uses a placeholder instead of storing a fabricated log.
 const count=Math.max(1,found.length),size=source.pageRows,pageMax=Math.trunc((count-1)/size);
 page=Math.max(0,Math.min(pageMax,page));
 return {page,pageMax,pagePrev:page>0?page-1:-1,pageNext:(page+1)*size<count?page+1:0,total:found.length,rows:found.slice(page*size,(page+1)*size)};
}
